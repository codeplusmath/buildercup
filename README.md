# ☕ The Café Companion (Google Builder Pop-Up)

> **"Meet. Connect. Exchange ideas. Before your coffee gets cold."**  
> An AI-powered ambient café application and builder network built with **Google Cloud Run**, **Cloud SQL**, and **Gemini APIs**.

---

## 🎯 Problem Statement Coverage

From the Google Builder Pop-Up challenge slide (*"Design a smarter café experience powered by AI"*):

| Challenge Topic | How The Café Companion Solves It |
| :--- | :--- |
| **1. Smarter Ordering** | **Conversational Vibe Barista**: Instead of static menus, patrons describe their energy state, dietary preferences, or work sprint. Gemini generates tailor-made pairings (Drink + Complementary Bite) and sends tickets directly to the baristas. |
| **2. Better Waits** | **Real-Time Wait Forecast & Queue Tracker**: Dynamic wait time calculations based on active espresso machine queue, orders ahead, and crowd rush indicators. |
| **3. Discovery** | **Hyper-Personalized Pairings**: Discovery engine suggesting items based on cognitive needs (e.g. high caffeine vs. decaf unwind, sustained stamina vs. quick sugar boost). |
| **4. Connect People** | **Builder Radar**: Attendees check in at their café table with what they are architecting on GCP. Gemini generates AI conversation icebreakers, allowing builders to send "Coffee Pings" to collaborate. |
| *(Bonus: Understand Room)* | **Café Team Sentiment & Pulse**: Baristas and organizers see live crowd vibes, noise/AC feedback, and orders brewing in real time. |

---

## ☁️ Google Cloud Architecture

```
                       +-----------------------------+
                       |    Patron & Barista Web UI   |
                       |  (Mobile-First Responsive)  |
                       +--------------+--------------+
                                      |
                                      v
                       +-----------------------------+
                       |       Google Cloud Run       |
                       |   (Serverless Microservice) |
                       |  - Serves PWA & REST API    |
                       |  - Scales 0 to N instantly   |
                       +-------+--------------+------+
                               |              |
                               v              v
           +-----------------------+     +-----------------------+
           |       Gemini API      |     |  Cloud SQL / Storage  |
           |   (Gemini 1.5/2.0)    |     |  - Relational Orders  |
           | - Conversational Menu |     |  - Builder Check-ins  |
           | - Icebreaker Synthesis|     |  - pgvector Embeddings|
           +-----------------------+     +-----------------------+
```

---

## 🚀 Quick Start (Local Demo)

The server runs on modern Node.js with **zero external dependencies**:

```bash
# 1. Start the server (already running if launched by agent)
npm start

# 2. Open in your browser:
http://localhost:8080
```

---

## ☁️ Deploying to Google Cloud Run (1 Command)

With your Google Cloud credits from the Builder Pop-Up:

```bash
# Authenticate and set project
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>

# Deploy using the automated script:
./deploy.sh

# Or directly with gcloud:
gcloud run deploy cafe-companion \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🎤 3-Minute Demo Pitch for Judges

1. **The Hook (30s)**:  
   *"At Google Builder Pop-Up, the motto is 'Meet, Connect, Exchange ideas, before your coffee gets cold.' But today, cafés have two big problems: ordering is transactional, and 50 builders sit at tables next to each other in total silence."*
2. **The Demo (90s)**:
   - **Vibe Barista**: Click *"🔥 1-Hour Hackathon Sprint"*, watch Gemini generate a high-caffeine single origin + dark chocolate pairing with exact prep time, and submit the order.
   - **Builder Radar**: Show Table 4 (Sneha working on pgvector) and click *"Send Coffee Ping"* using Gemini’s suggested icebreaker.
   - **Barista Station**: Switch to kitchen tab to see the live ticket ready for brewing.
3. **The Architecture (60s)**:
   - Point to the **GCP Tech Stack modal**: Cloud Run container, Cloud SQL persistence, Gemini API structured outputs.
