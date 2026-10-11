import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables (supports .env if present)
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const PORT = process.env.PORT || 8080;

if (fs.existsSync(path.join(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (k.trim() === 'GEMINI_API_KEY' || k.trim() === 'GOOGLE_API_KEY') {
        if (!GEMINI_API_KEY) GEMINI_API_KEY = val;
      }
    }
  }
}

// Initialize SQLite database
const dbFile = path.join(__dirname, 'cafe.db');
const db = new DatabaseSync(dbFile);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    table_num TEXT,
    item_name TEXT,
    item_pair TEXT,
    vibe TEXT,
    caffeine_level TEXT,
    prep_time_min INTEGER,
    status TEXT,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS builders (
    id TEXT PRIMARY KEY,
    name TEXT,
    table_num TEXT,
    project TEXT,
    skills TEXT,
    open_to TEXT,
    icebreaker TEXT,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS pings (
    id TEXT PRIMARY KEY,
    from_name TEXT,
    from_table TEXT,
    to_name TEXT,
    to_table TEXT,
    message TEXT,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    rating INTEGER,
    tag TEXT,
    comment TEXT,
    sentiment TEXT,
    created_at INTEGER
  );
`);

// Seed initial realistic data for instant demo
const existingOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
if (existingOrders.count === 0) {
  const seedOrders = [
    { id: 'ord-101', customer_name: 'Aditi', table_num: 'Table 3', item_name: 'Espresso Tonic + Pistachio Biscotti', item_pair: 'Pistachio Biscotti', vibe: 'High energy sprint', caffeine_level: 'High (140mg)', prep_time_min: 3, status: 'brewing', created_at: Date.now() - 4 * 60 * 1000 },
    { id: 'ord-102', customer_name: 'Vikram', table_num: 'Table 6', item_name: 'Oat Flat White + Almond Croissant', item_pair: 'Almond Croissant', vibe: 'Deep focus coding', caffeine_level: 'Medium (95mg)', prep_time_min: 4, status: 'ready', created_at: Date.now() - 8 * 60 * 1000 },
    { id: 'ord-103', customer_name: 'Pooja', table_num: 'Table 1', item_name: 'Iced Cascara Cold Brew', item_pair: 'Dark Chocolate Chunk', vibe: 'Creative brainstorm', caffeine_level: 'High (160mg)', prep_time_min: 2, status: 'delivered', created_at: Date.now() - 15 * 60 * 1000 }
  ];
  const insertOrder = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const o of seedOrders) {
    insertOrder.run(o.id, o.customer_name, o.table_num, o.item_name, o.item_pair, o.vibe, o.caffeine_level, o.prep_time_min, o.status, o.created_at);
  }
}

const existingBuilders = db.prepare('SELECT COUNT(*) as count FROM builders').get();
if (existingBuilders.count === 0) {
  const seedBuilders = [
    {
      id: 'b-1',
      name: 'Rohan Sharma',
      table_num: 'Table 2',
      project: 'Deploying multi-agent microservices with Cloud Run & Pub/Sub',
      skills: 'Python, Cloud Run, Eventarc',
      open_to: 'Architecture feedback & coffee chat',
      icebreaker: 'Ask about how they handle agent timeouts in Cloud Run containers!',
      created_at: Date.now() - 30 * 60 * 1000
    },
    {
      id: 'b-2',
      name: 'Sneha Patel',
      table_num: 'Table 4',
      project: 'Semantic search on Cloud SQL using pgvector + Gemini embeddings',
      skills: 'PostgreSQL, pgvector, Gemini API',
      open_to: 'Brainstorming RAG indexing',
      icebreaker: 'Ask about their experience tuning vector distance metrics with pgvector!',
      created_at: Date.now() - 20 * 60 * 1000
    },
    {
      id: 'b-3',
      name: 'Karthik Rao',
      table_num: 'Table 8',
      project: 'Real-time video multimodal parsing with Gemini 1.5 Flash',
      skills: 'TypeScript, Gemini Multimodal, Next.js',
      open_to: 'Looking for a frontend teammate',
      icebreaker: 'Ask to see their live video stream token consumption demo!',
      created_at: Date.now() - 10 * 60 * 1000
    }
  ];
  const insertBuilder = db.prepare('INSERT INTO builders VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const b of seedBuilders) {
    insertBuilder.run(b.id, b.name, b.table_num, b.project, b.skills, b.open_to, b.icebreaker, b.created_at);
  }
}

// Fallback intelligent generator for when Gemini API key is missing or offline
function fallbackVibeRecommendation(prompt = '', vibe = '') {
  const p = (prompt + ' ' + vibe).toLowerCase();
  if (p.includes('sweet') || p.includes('relax') || p.includes('chill') || p.includes('unwind')) {
    return {
      drink: 'Madagascar Vanilla Bean Latte',
      pairing: 'Warm Cinnamon Pecan Roll',
      caffeine_level: 'Low-Medium (65mg)',
      prep_time_min: 4,
      rationale: 'Soothing velvety milk with subtle aromatic vanilla sweetness to help you decompress and unwind.',
      vibe_tag: 'Relaxed & Sweet'
    };
  } else if (p.includes('cold') || p.includes('iced') || p.includes('refresh') || p.includes('hot day')) {
    return {
      drink: 'Nitro Cold Brew with Blood Orange Zest',
      pairing: 'Lemon Rosemary Shortbread',
      caffeine_level: 'High (180mg)',
      prep_time_min: 2,
      rationale: 'Ultra-crisp, naturally sweet micro-bubbles paired with citrus oils to spark immediate clarity and refreshment.',
      vibe_tag: 'Ultra Refreshing'
    };
  } else if (p.includes('sprint') || p.includes('debug') || p.includes('bug') || p.includes('crash') || p.includes('tired')) {
    return {
      drink: 'Red Eye Americano (Single Origin + Double Shot)',
      pairing: '70% Dark Chocolate Energy Bite',
      caffeine_level: 'Very High (220mg)',
      prep_time_min: 3,
      rationale: 'High-octane clean caffeine without dairy sluggishness to power through that last elusive edge case.',
      vibe_tag: 'Debug Sprint'
    };
  } else {
    return {
      drink: 'Cortado with Oat Velvet & Cardamom Twist',
      pairing: 'Almond Biscotti with Salted Flakes',
      caffeine_level: 'Balanced (110mg)',
      prep_time_min: 3,
      rationale: 'A 1:1 balance of rich espresso and micro-textured oat milk, elevated by floral cardamom for sustained focus.',
      vibe_tag: 'Deep Focus'
    };
  }
}

// Call Gemini API
async function callGemini(systemPrompt, userPrompt) {
  if (!GEMINI_API_KEY) {
    return null;
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.warn('Gemini API call returned status:', response.status);
      return null;
    }
    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || null;
  } catch (err) {
    console.warn('Gemini API fetch error:', err.message);
    return null;
  }
}

// Helper: parse JSON from request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper: serve static file
function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // API Endpoints
  // 1. Health check & status
  if (pathname === '/api/status' && method === 'GET') {
    sendJson(res, 200, {
      status: 'online',
      app: 'The Café Companion',
      cloud: 'Google Cloud Run Ready',
      db: 'Cloud SQL / Native SQLite Engine',
      hasGeminiKey: Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 5),
      timestamp: Date.now()
    });
    return;
  }

  // 2. Set/Update Gemini API Key dynamically from UI
  if (pathname === '/api/set-key' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (body.apiKey) {
        GEMINI_API_KEY = body.apiKey.trim();
        // save to .env
        try {
          fs.writeFileSync(path.join(__dirname, '.env'), `GEMINI_API_KEY=${GEMINI_API_KEY}\n`, 'utf-8');
        } catch (e) {}
        sendJson(res, 200, { success: true, message: 'Gemini API key updated successfully!' });
      } else {
        sendJson(res, 400, { error: 'No apiKey provided' });
      }
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // 3. Conversational Vibe Order & Recommendation (Topic 1 & Topic 3)
  if (pathname === '/api/vibe-order' && method === 'POST') {
    try {
      const { prompt = '', vibe = '' } = await parseJsonBody(req);
      let recommendation = null;

      if (GEMINI_API_KEY) {
        const sysPrompt = `You are "The Café Companion Barista" at Google Builder Pop-Up. A builder is ordering coffee.
Recommend ONE perfect drink and ONE complementary bite pairing based on their context.
Respond with strictly valid JSON matching this schema:
{
  "drink": "Drink Name",
  "pairing": "Snack / Bite Name",
  "caffeine_level": "e.g. High (150mg)",
  "prep_time_min": 3,
  "rationale": "1-2 sentences on why this fits their vibe and helps them build",
  "vibe_tag": "Catchy 2-3 word vibe label"
}
Do not include markdown ticks or extra words outside the JSON object.`;
        const rawRes = await callGemini(sysPrompt, `Builder Vibe: ${vibe}. Notes / Context: ${prompt}`);
        if (rawRes) {
          try {
            const cleanJson = rawRes.replace(/```json|```/g, '').trim();
            recommendation = JSON.parse(cleanJson);
          } catch (e) {
            console.warn('Could not parse Gemini JSON response, using fallback.');
          }
        }
      }

      if (!recommendation) {
        recommendation = fallbackVibeRecommendation(prompt, vibe);
      }

      sendJson(res, 200, { success: true, recommendation, poweredBy: GEMINI_API_KEY ? 'Gemini 1.5 Flash (Live API)' : 'Café Companion AI Engine (Demo Mode)' });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 4. Place Order
  if (pathname === '/api/orders' && method === 'POST') {
    try {
      const { customer_name, table_num, item_name, item_pair, vibe, caffeine_level, prep_time_min } = await parseJsonBody(req);
      const id = 'ord-' + Math.floor(100 + Math.random() * 900);
      const created_at = Date.now();
      const status = 'brewing';

      const stmt = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, customer_name || 'Anonymous Builder', table_num || 'Takeaway', item_name || 'Pour Over', item_pair || 'Cookie', vibe || 'Focus', caffeine_level || 'Medium', prep_time_min || 3, status, created_at);

      // Compute queue position
      const queueCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'brewing'").get().count;

      sendJson(res, 201, {
        success: true,
        order: { id, customer_name, table_num, item_name, item_pair, status, prep_time_min, created_at },
        queue_position: queueCount,
        estimated_wait_min: queueCount * 2 + 1
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 5. Get All Orders
  if (pathname === '/api/orders' && method === 'GET') {
    try {
      const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 30').all();
      sendJson(res, 200, { orders });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 6. Update Order Status (Barista flow)
  if (pathname.startsWith('/api/orders/') && method === 'PATCH') {
    try {
      const orderId = pathname.replace('/api/orders/', '');
      const { status } = await parseJsonBody(req);
      const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
      stmt.run(status, orderId);
      sendJson(res, 200, { success: true, orderId, status });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 7. Builder Check-in (Topic 4: Connect People)
  if (pathname === '/api/check-in' && method === 'POST') {
    try {
      const { name, table_num, project, skills, open_to } = await parseJsonBody(req);
      const id = 'b-' + Math.floor(1000 + Math.random() * 9000);
      const created_at = Date.now();

      let icebreaker = `Ask ${name} about ${project}!`;
      if (GEMINI_API_KEY) {
        const sysPrompt = `Generate a witty, inspiring 1-sentence icebreaker that another builder at a Google Cloud Builder event can use to spark a conversation with this person. Keep it friendly and concise.`;
        const resText = await callGemini(sysPrompt, `Name: ${name}, Table: ${table_num}, Project: ${project}, Skills: ${skills}, Open to: ${open_to}`);
        if (resText) icebreaker = resText.trim().replace(/^["']|["']$/g, '');
      } else {
        icebreaker = `Ask about their approach to ${skills.split(',')[0] || 'GCP'} and compare architecture notes!`;
      }

      const stmt = db.prepare('INSERT INTO builders VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, name, table_num, project, skills, open_to, icebreaker, created_at);

      sendJson(res, 201, { success: true, builder: { id, name, table_num, project, skills, open_to, icebreaker } });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 8. Get Checked-in Builders (Topic 4)
  if (pathname === '/api/builders' && method === 'GET') {
    try {
      const builders = db.prepare('SELECT * FROM builders ORDER BY created_at DESC LIMIT 20').all();
      sendJson(res, 200, { builders });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 9. Send Builder Ping / Coffee invite
  if (pathname === '/api/ping' && method === 'POST') {
    try {
      const { from_name, from_table, to_name, to_table, message } = await parseJsonBody(req);
      const id = 'p-' + Date.now();
      const stmt = db.prepare('INSERT INTO pings VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, from_name, from_table, to_name, to_table, message || 'Hi! Let’s share coffee and discuss tech.', Date.now());
      sendJson(res, 201, { success: true, ping: { id, from_name, from_table, to_name, to_table, message } });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 10. Get Pings
  if (pathname === '/api/pings' && method === 'GET') {
    try {
      const pings = db.prepare('SELECT * FROM pings ORDER BY created_at DESC LIMIT 15').all();
      sendJson(res, 200, { pings });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 11. Café Pulse & Better Waits (Topic 2 & Understand the Room)
  if (pathname === '/api/cafe-pulse' && method === 'GET') {
    try {
      const brewingCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'brewing'").get().count;
      const readyCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'ready'").get().count;
      const builderCount = db.prepare("SELECT COUNT(*) as count FROM builders").get().count;
      
      const waitMinutes = brewingCount === 0 ? 2 : brewingCount * 2 + 1;
      let crowdStatus = 'Chill & Spacious';
      if (brewingCount > 4) crowdStatus = 'Bustling Energy';
      if (brewingCount > 8) crowdStatus = 'Peak Hackathon Rush';

      sendJson(res, 200, {
        activeBrewing: brewingCount,
        ordersReady: readyCount,
        estimatedWaitMinutes: waitMinutes,
        connectedBuilders: builderCount,
        crowdStatus,
        bestTimeToVisit: brewingCount > 5 ? 'Next 20 minutes (queue clearing soon)' : 'Now (Minimal Wait!)',
        vibeIndex: {
          innovationLevel: '94%',
          caffeineVelocity: brewingCount > 3 ? 'High Flow' : 'Steady Flow'
        }
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 12. Feedback & Sentiment (Understand the Room)
  if (pathname === '/api/feedback' && method === 'POST') {
    try {
      const { rating, tag, comment } = await parseJsonBody(req);
      const id = 'fb-' + Date.now();
      let sentiment = rating >= 4 ? 'Positive' : (rating === 3 ? 'Neutral' : 'Needs Attention');

      const stmt = db.prepare('INSERT INTO feedback VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(id, rating || 5, tag || 'Vibe', comment || '', sentiment, Date.now());

      sendJson(res, 201, { success: true, id, sentiment });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (pathname === '/api/feedback' && method === 'GET') {
    try {
      const items = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 15').all();
      sendJson(res, 200, { feedback: items });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // Static file serving from ./public
  let cleanPath = pathname;
  if (pathname === '/') cleanPath = '/index.html';
  else if (pathname === '/barista') cleanPath = '/barista.html';
  else if (pathname === '/qr') cleanPath = '/qr.html';
  
  const filePath = path.join(__dirname, 'public', cleanPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveStatic(res, filePath, contentType);
  } else {
    // SPA fallback
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      serveStatic(res, indexPath, 'text/html; charset=utf-8');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`☕ The Café Companion server running on http://0.0.0.0:${PORT}`);
  console.log(`🚀 Ready for Google Cloud Run deployment!`);
  console.log(`🔑 Gemini API status: ${GEMINI_API_KEY ? 'Active (Live)' : 'Demo Mode (Interactive AI Fallback)'}`);
});
