// The Café Companion - Client Application
document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentRecommendation = null;
  let activePingTarget = null;
  let selectedVibe = 'Deep Focus Coding (Smooth oat flat white, sustained focus)';

  // DOM Elements - Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Tab Switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      // Refresh specific tab data
      if (tab.dataset.tab === 'radar') loadBuilders();
      if (tab.dataset.tab === 'waits') loadPulse();
      if (tab.dataset.tab === 'barista') loadBaristaTickets();
      if (tab.dataset.tab === 'ordering') loadOrders();
    });
  });

  // 1. VIBE BARISTA & ORDERING
  const vibePills = document.querySelectorAll('.vibe-pill');
  const orderPromptInput = document.getElementById('orderPrompt');
  const btnGenerateVibe = document.getElementById('btnGenerateVibe');
  const btnPlaceOrder = document.getElementById('btnPlaceOrder');

  vibePills.forEach(pill => {
    pill.addEventListener('click', () => {
      vibePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedVibe = pill.dataset.vibe;
    });
  });
  // select first pill by default
  if (vibePills[0]) vibePills[0].classList.add('active');

  async function generateVibeOrder() {
    const prompt = orderPromptInput.value.trim();
    const btnText = btnGenerateVibe.querySelector('.btn-text');
    const spinner = btnGenerateVibe.querySelector('.spinner');

    btnText.textContent = 'Brewing Ideas...';
    spinner.classList.remove('hidden');
    btnGenerateVibe.disabled = true;

    try {
      const res = await fetch('/api/vibe-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, vibe: selectedVibe })
      });
      const data = await res.json();
      if (data.success && data.recommendation) {
        currentRecommendation = data.recommendation;
        renderRecommendation(data.recommendation, data.poweredBy);
      }
    } catch (err) {
      console.error('Error generating vibe:', err);
    } finally {
      btnText.textContent = 'Craft My Order';
      spinner.classList.add('hidden');
      btnGenerateVibe.disabled = false;
    }
  }

  function renderRecommendation(rec, poweredBy) {
    document.getElementById('recVibeTag').textContent = `Match: ${rec.vibe_tag || 'Custom Vibe'}`;
    document.getElementById('recDrinkTitle').textContent = rec.drink;
    document.getElementById('recPairTitle').textContent = rec.pairing;
    document.getElementById('recCaffeine').textContent = `⚡ Caffeine: ${rec.caffeine_level || 'Medium'}`;
    document.getElementById('recPrepTime').textContent = `⏱️ Prep Time: ~${rec.prep_time_min || 3} min`;
    document.getElementById('recRationale').textContent = `"${rec.rationale}"`;
    
    if (poweredBy) {
      document.getElementById('aiStatusChip').textContent = poweredBy;
    }
  }

  btnGenerateVibe.addEventListener('click', generateVibeOrder);
  orderPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generateVibeOrder();
  });

  // Place Order
  btnPlaceOrder.addEventListener('click', async () => {
    const custName = document.getElementById('custName').value.trim() || 'Anonymous';
    const custTable = document.getElementById('custTable').value.trim() || 'Takeaway';

    const drink = currentRecommendation ? currentRecommendation.drink : 'Nitro Cold Brew with Blood Orange Zest';
    const pair = currentRecommendation ? currentRecommendation.pairing : 'Lemon Rosemary Shortbread';
    const vibe = currentRecommendation ? currentRecommendation.vibe_tag : 'High Energy Sprint';
    const caffeine = currentRecommendation ? currentRecommendation.caffeine_level : 'High (180mg)';
    const prep = currentRecommendation ? currentRecommendation.prep_time_min : 3;

    btnPlaceOrder.disabled = true;
    btnPlaceOrder.textContent = 'Submitting order to kitchen...';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: custName,
          table_num: custTable,
          item_name: drink,
          item_pair: pair,
          vibe: vibe,
          caffeine_level: caffeine,
          prep_time_min: prep
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 Order confirmed! Ticket #${data.order.id}\nQueue position: #${data.queue_position}\nEstimated wait: ~${data.estimated_wait_min} min`);
        loadOrders();
        loadPulse();
      }
    } catch (err) {
      alert('Could not place order: ' + err.message);
    } finally {
      btnPlaceOrder.disabled = false;
      btnPlaceOrder.textContent = '🚀 Confirm & Send to Barista';
    }
  });

  // Load customer orders list
  async function loadOrders() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      const container = document.getElementById('customerOrdersList');
      if (!container || !data.orders) return;

      container.innerHTML = data.orders.map(o => `
        <div class="order-item">
          <div class="order-left">
            <span style="font-size:1.4rem;">☕</span>
            <div>
              <div class="order-title">${escapeHtml(o.item_name)} + ${escapeHtml(o.item_pair)}</div>
              <div class="order-details">${escapeHtml(o.customer_name)} • ${escapeHtml(o.table_num)} • ${timeAgo(o.created_at)}</div>
            </div>
          </div>
          <div>
            <span class="order-status-badge status-${o.status}">${o.status}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  }

  // 2. BUILDER RADAR (CONNECT PEOPLE)
  const checkInForm = document.getElementById('checkInForm');
  const buildersList = document.getElementById('buildersList');
  const pingModal = document.getElementById('pingModal');
  const btnClosePingModal = document.getElementById('btnClosePingModal');
  const btnCancelPing = document.getElementById('btnCancelPing');
  const btnSendPingConfirm = document.getElementById('btnSendPingConfirm');

  async function loadBuilders() {
    try {
      const res = await fetch('/api/builders');
      const data = await res.json();
      if (!buildersList || !data.builders) return;

      document.getElementById('radarTotalCount').textContent = `${data.builders.length} Active`;
      document.getElementById('buildersCountBadge').textContent = data.builders.length;

      buildersList.innerHTML = data.builders.map(b => `
        <div class="builder-card">
          <div class="builder-top">
            <span class="builder-name">${escapeHtml(b.name)}</span>
            <span class="builder-table-pill">${escapeHtml(b.table_num)}</span>
          </div>
          <div class="builder-project">
            <strong>Building:</strong> ${escapeHtml(b.project)}
          </div>
          <div class="builder-tags">
            ${b.skills ? b.skills.split(',').map(s => `<span class="skill-tag">${escapeHtml(s.trim())}</span>`).join('') : ''}
            <span class="skill-tag" style="background:#e8f0fe; color:#1a73e8;">Open to: ${escapeHtml(b.open_to || 'Chat')}</span>
          </div>
          <div class="icebreaker-box">
            💡 <strong>AI Conversation Spark:</strong> "${escapeHtml(b.icebreaker)}"
          </div>
          <div class="builder-actions">
            <button class="btn btn-outline btn-sm btn-ping" data-id="${b.id}" data-name="${escapeHtml(b.name)}" data-table="${escapeHtml(b.table_num)}" data-icebreaker="${escapeHtml(b.icebreaker)}">
              <span>☕ Send Coffee Ping</span>
            </button>
          </div>
        </div>
      `).join('');

      // Attach ping listeners
      document.querySelectorAll('.btn-ping').forEach(btn => {
        btn.addEventListener('click', () => {
          activePingTarget = {
            id: btn.dataset.id,
            name: btn.dataset.name,
            table: btn.dataset.table,
            icebreaker: btn.dataset.icebreaker
          };
          openPingModal();
        });
      });
    } catch (err) {
      console.error('Error loading builders:', err);
    }
  }

  function openPingModal() {
    if (!activePingTarget) return;
    document.getElementById('pingModalTitle').textContent = `Send Coffee Ping to ${activePingTarget.name} (${activePingTarget.table})`;
    document.getElementById('pingIcebreakerSuggestion').textContent = `Suggested Icebreaker: "${activePingTarget.icebreaker}"`;
    document.getElementById('pingCustomMessage').value = `Hi ${activePingTarget.name}! Saw you're working on that at ${activePingTarget.table}. Want to grab coffee and trade architecture notes?`;
    pingModal.classList.remove('hidden');
  }

  function closePingModal() {
    pingModal.classList.add('hidden');
    activePingTarget = null;
  }

  if (btnClosePingModal) btnClosePingModal.addEventListener('click', closePingModal);
  if (btnCancelPing) btnCancelPing.addEventListener('click', closePingModal);

  if (btnSendPingConfirm) {
    btnSendPingConfirm.addEventListener('click', async () => {
      if (!activePingTarget) return;
      const myName = document.getElementById('custName')?.value || 'Fellow Builder';
      const myTable = document.getElementById('custTable')?.value || 'Table 1';
      const msg = document.getElementById('pingCustomMessage').value;

      try {
        const res = await fetch('/api/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_name: myName,
            from_table: myTable,
            to_name: activePingTarget.name,
            to_table: activePingTarget.table,
            message: msg
          })
        });
        const data = await res.json();
        if (data.success) {
          alert(`☕ Coffee ping sent to ${activePingTarget.name} at ${activePingTarget.table}!`);
          closePingModal();
          loadPings();
        }
      } catch (e) {
        alert('Could not send ping: ' + e.message);
      }
    });
  }

  // Check-in submit
  if (checkInForm) {
    checkInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitCheckIn');
      btn.disabled = true;
      btn.textContent = 'Registering on Radar...';

      const payload = {
        name: document.getElementById('builderName').value.trim(),
        table_num: document.getElementById('builderTable').value.trim(),
        project: document.getElementById('builderProject').value.trim(),
        skills: document.getElementById('builderSkills').value.trim(),
        open_to: document.getElementById('builderOpenTo').value
      };

      try {
        const res = await fetch('/api/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert(`✨ Checked in! You're now on the café radar at ${payload.table_num}.`);
          // Sync customer name & table to ordering tab
          document.getElementById('custName').value = payload.name;
          document.getElementById('custTable').value = payload.table_num;
          checkInForm.reset();
          loadBuilders();
        }
      } catch (err) {
        alert('Error checking in: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Broadside to Café Radar 📡';
      }
    });
  }

  // 3. BETTER WAITS & ROOM PULSE
  async function loadPulse() {
    try {
      const res = await fetch('/api/cafe-pulse');
      const data = await res.json();
      
      const waitStr = `~${data.estimatedWaitMinutes} min`;
      document.getElementById('pulseWaitTime').textContent = waitStr;
      document.getElementById('headerWaitTime').textContent = `Wait: ${waitStr}`;
      document.getElementById('pulseBrewingCount').textContent = data.activeBrewing;
      document.getElementById('pulseConnectedCount').textContent = data.connectedBuilders;
      document.getElementById('pulseCrowdStatus').textContent = data.crowdStatus;

      loadPings();
    } catch (err) {
      console.error('Error loading pulse:', err);
    }
  }

  async function loadPings() {
    try {
      const res = await fetch('/api/pings');
      const data = await res.json();
      const container = document.getElementById('pingsFeed');
      if (!container || !data.pings) return;

      if (data.pings.length === 0) {
        container.innerHTML = `<div class="subtext">No pings sent yet. Be the first to break the ice from Builder Radar!</div>`;
        return;
      }

      container.innerHTML = data.pings.map(p => `
        <div class="ping-item">
          <span class="ping-icon">☕</span>
          <div>
            <strong>${escapeHtml(p.from_name)} (${escapeHtml(p.from_table)})</strong> sent a ping to 
            <strong>${escapeHtml(p.to_name)} (${escapeHtml(p.to_table)})</strong>: 
            <em>"${escapeHtml(p.message)}"</em>
            <div style="font-size:0.75rem; color:#80868b; margin-top:2px;">${timeAgo(p.created_at)}</div>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  // Feedback Submission
  let selectedRating = 5;
  let selectedTag = 'Great Coffee';
  const starElements = document.querySelectorAll('#starRating span');
  const tagButtons = document.querySelectorAll('.feedback-tag');

  starElements.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.star, 10);
      starElements.forEach((s, idx) => {
        if (idx < selectedRating) s.classList.add('selected');
        else s.classList.remove('selected');
      });
    });
  });

  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tagButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTag = btn.dataset.tag;
    });
  });

  const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
  if (btnSubmitFeedback) {
    btnSubmitFeedback.addEventListener('click', async () => {
      const comment = document.getElementById('feedbackComment').value.trim();
      btnSubmitFeedback.disabled = true;
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: selectedRating, tag: selectedTag, comment })
        });
        const data = await res.json();
        if (data.success) {
          alert('❤️ Thank you! Your feedback reached the café baristas.');
          document.getElementById('feedbackComment').value = '';
        }
      } catch (err) {
        alert('Feedback error: ' + err.message);
      } finally {
        btnSubmitFeedback.disabled = false;
      }
    });
  }

  // 4. BARISTA STATION (KITCHEN TICKETS)
  async function loadBaristaTickets() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      const container = document.getElementById('baristaTicketsGrid');
      if (!container || !data.orders) return;

      const activeOrders = data.orders.filter(o => o.status !== 'delivered');
      document.getElementById('activeTicketsBadge').textContent = `${activeOrders.length} Active`;

      container.innerHTML = data.orders.map(o => `
        <div class="ticket-card ${o.status}">
          <div>
            <div class="ticket-header">
              <span class="ticket-id">#${o.id}</span>
              <span class="order-status-badge status-${o.status}">${o.status}</span>
            </div>
            <div class="ticket-item">${escapeHtml(o.item_name)}</div>
            <div class="ticket-pair">Pair: ${escapeHtml(o.item_pair)}</div>
            <div class="ticket-vibe">Vibe: ${escapeHtml(o.vibe)} • Table: <strong>${escapeHtml(o.table_num)}</strong> (${escapeHtml(o.customer_name)})</div>
          </div>
          <div class="ticket-actions">
            ${o.status === 'brewing' ? `
              <button class="btn btn-success btn-sm btn-action" data-id="${o.id}" data-status="ready">Mark Ready 🔔</button>
            ` : ''}
            ${o.status === 'ready' ? `
              <button class="btn btn-outline btn-sm btn-action" data-id="${o.id}" data-status="delivered">Delivered ✅</button>
            ` : ''}
            ${o.status === 'delivered' ? `
              <span class="subtext" style="margin:0;">Completed</span>
            ` : ''}
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const status = btn.dataset.status;
          await fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          loadBaristaTickets();
          loadOrders();
          loadPulse();
        });
      });
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  }

  // 5. GCP ARCHITECTURE MODAL & API KEY
  const gcpModal = document.getElementById('gcpModal');
  const btnOpenGcpModal = document.getElementById('btnOpenGcpModal');
  const btnCloseGcpModal = document.getElementById('btnCloseGcpModal');
  const btnDismissGcpModal = document.getElementById('btnDismissGcpModal');
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const apiKeySaveStatus = document.getElementById('apiKeySaveStatus');

  if (btnOpenGcpModal) btnOpenGcpModal.addEventListener('click', () => gcpModal.classList.remove('hidden'));
  if (btnCloseGcpModal) btnCloseGcpModal.addEventListener('click', () => gcpModal.classList.add('hidden'));
  if (btnDismissGcpModal) btnDismissGcpModal.addEventListener('click', () => gcpModal.classList.add('hidden'));

  if (btnSaveApiKey) {
    btnSaveApiKey.addEventListener('click', async () => {
      const key = geminiApiKeyInput.value.trim();
      if (!key) return;
      apiKeySaveStatus.textContent = 'Saving & validating...';
      try {
        const res = await fetch('/api/set-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: key })
        });
        const data = await res.json();
        if (data.success) {
          apiKeySaveStatus.textContent = '✅ Connected to Gemini API live!';
          apiKeySaveStatus.style.color = '#137333';
          document.getElementById('aiStatusChip').textContent = 'Gemini 1.5 Flash (Live)';
        } else {
          apiKeySaveStatus.textContent = '❌ ' + (data.error || 'Failed to save');
          apiKeySaveStatus.style.color = '#ea4335';
        }
      } catch (err) {
        apiKeySaveStatus.textContent = '❌ ' + err.message;
      }
    });
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m]);
  }

  function timeAgo(timestamp) {
    if (!timestamp) return '';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
  }

  // 6. TABLE AUTO-DETECTION VIA QR CODE (?table=X)
  const urlParams = new URLSearchParams(window.location.search);
  const tableParam = urlParams.get('table');
  const tableBanner = document.getElementById('tableDetectionBanner');
  const detectedTableNumSpan = document.getElementById('detectedTableNum');
  const btnChangeTable = document.getElementById('btnChangeTable');

  if (tableParam) {
    const formattedTable = isNaN(tableParam) ? tableParam : `Table ${tableParam}`;
    if (tableBanner && detectedTableNumSpan) {
      detectedTableNumSpan.textContent = tableParam;
      tableBanner.classList.remove('hidden');
    }
    const custTableInput = document.getElementById('custTable');
    const builderTableInput = document.getElementById('builderTable');
    if (custTableInput) custTableInput.value = formattedTable;
    if (builderTableInput) builderTableInput.value = formattedTable;

    if (btnChangeTable) {
      btnChangeTable.addEventListener('click', () => {
        const newTable = prompt('Enter your table number (e.g. Table 4):', formattedTable);
        if (newTable) {
          detectedTableNumSpan.textContent = newTable;
          if (custTableInput) custTableInput.value = newTable;
          if (builderTableInput) builderTableInput.value = newTable;
        }
      });
    }
  }

  // Initial Load
  loadOrders();
  loadBuilders();
  loadPulse();

  // Background Poll every 4 seconds for live café experience
  setInterval(() => {
    loadPulse();
  }, 4000);
});
