# Kavach - Women Safety SaaS Platform

A production-level women safety SaaS platform built with Next.js 14, MongoDB, and NextAuth.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js with JWT session strategy
- **Styling**: Tailwind CSS
- **AI Backend**: FastAPI (Python) with multi-signal risk scoring

## Project Structure

```
kavach/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication routes
│   │   ├── (user)/          # User dashboard routes
│   │   ├── (company)/       # Company/organization routes
│   │   ├── (admin)/         # Admin panel routes
│   │   ├── api/             # API routes
│   │   │   └── auth/        # NextAuth API routes
│   │   ├── layout.js        # Root layout
│   │   └── page.js          # Home page
│   ├── components/          # Reusable React components
│   │   ├── ui/              # Reusable UI primitives (Badge, StatCard, etc.)
│   ├── hooks/
│   │   └── useSafetyScore.js # Safety score context & GPS-based scoring
│   ├── lib/                 # Utility functions and configurations
│   │   ├── mongodb.js       # MongoDB connection
│   │   ├── auth.js          # NextAuth configuration
│   │   ├── api-helpers.js   # Shared API controller helpers (JSON/session/errors)
│   │   ├── errors.js        # Shared error types
│   │   ├── services/        # Feature services (DB/model operations)
│   │   ├── mocks/           # UI mock data for dashboards
│   │   └── data/            # Static curated data (e.g. store products)
│   │   └── utils.js         # Utility functions
│   ├── models/              # Mongoose models
│   └── middleware.js        # Next.js middleware
├── ai-backend/
│   └── women_safety_api/    # FastAPI safety scoring engine
│       ├── app.py           # Main API with multi-signal risk scoring
│       └── requirements.txt
├── .env.example             # Environment variables template
└── package.json
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`
   - Fill in your MongoDB URI, NextAuth secret, and other required values

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Run the AI backend** (optional, for local development):
   ```bash
   cd ai-backend/women_safety_api
   pip install -r requirements.txt
   uvicorn app:app --reload --port 8000
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Environment Variables

See `.env.example` for all required environment variables.

### Required Variables:
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_URL` - Base URL of your application
- `NEXTAUTH_SECRET` - Secret key for NextAuth (generate a random string)
- `JWT_SECRET` - Secret key for JWT tokens

### AI Backend Variables (in `ai-backend/women_safety_api/.env`):
- `NEWS_API_KEY` - NewsAPI.org key for realtime news ingestion
- `OPENCAGE_API_KEY` - OpenCage geocoding API key
- `OPENAI_API_KEY` - OpenAI key for GPT summary generation

---

## Safety Score — How It Works

The safety score is a composite risk assessment computed from **5 independent data signals**:

### Architecture

```
User's GPS (lat, lng)
        │
        ▼
┌─────────────────────────────────────────────────┐
│          /risk_by_coords (FastAPI)               │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ NCRB     │  │ Realtime │  │ OSM Infra    │  │
│  │ Baseline │  │ Incidents│  │ Score        │  │
│  │ (35%)    │  │ (30%)    │  │ (15%)        │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌──────────┐                    │
│  │ Density  │  │ Mid-term │                    │
│  │ Proxy    │  │ Signal   │                    │
│  │ (10%)    │  │ (10%)    │                    │
│  └──────────┘  └──────────┘                    │
│                                                  │
│  × Time-of-Day Multiplier (1.0 / 1.2 / 1.5)   │
│                                                  │
│  → risk_score (0.0 to 1.0)                      │
└─────────────────────────────────────────────────┘
        │
        ▼
Frontend: safetyScore = (1 - risk_score) × 100
```

### Signal Breakdown

| # | Signal | Weight | Source | Granularity |
|---|--------|--------|--------|-------------|
| 1 | **Historical Baseline** | 35% | NCRB 2022 crime data (100+ districts, 30+ states) | District → City → State fallback |
| 2 | **Realtime Incidents** | 30% | News articles (4 RSS feeds + NewsAPI) + community reports within 15km, last 6h. Exponential time decay (half-life 12h news, 6h reports) | 15km radius |
| 3 | **Infrastructure** | 15% | OpenStreetMap Overpass API: streetlights, police stations, hospitals, bus stops, CCTV, metro stations within 500m | 500m radius |
| 4 | **Population Density** | 10% | OSM building count within 300m as proxy for how populated/isolated an area is | 300m radius |
| 5 | **Mid-term Signal** | 10% | Weighted incident count from 6–24h ago within 15km | 15km radius |

### Time-of-Day Multiplier
- **Daytime** (5 AM – 7 PM): ×1.0
- **Evening** (7 PM – 10 PM): ×1.2
- **Night** (10 PM – 5 AM): ×1.5

### Frontend Conversion
```
Safety Score = round((1 - risk_score) * 100)
```
- **≥ 70**: SAFE (green)
- **40–69**: MODERATE (amber)
- **< 40**: RISKY (red)

---

## Scope & Limitations

### What This System CAN Do (Current Capabilities)

✅ **District-level differentiation** — Different scores for Delhi vs Jaipur vs Chennai (100+ districts)  
✅ **Real-time news integration** — Ingests crime news every 5 minutes from 4+ RSS feeds + NewsAPI  
✅ **Environmental assessment** — Queries actual OSM data for streetlights, police, hospitals nearby  
✅ **Population density proxy** — Estimates how isolated/crowded an area is from building data  
✅ **Time-aware scoring** — Night travel is appropriately flagged as higher risk  
✅ **Community reports** — User-submitted reports with category weighting improve accuracy over time  
✅ **Exponential decay** — Old events lose influence; fresh reports matter most  
✅ **Context-aware advice** — Safety recommendations adapt to lighting, density, and time conditions  
✅ **Direct GPS precision** — Dashboard uses exact coordinates (no text→city→coordinate round-trip)  

### What This System CANNOT Do (Requires Paid/Government Data)

❌ **Street-level crime mapping** — Police FIR (First Information Report) data is not publicly available via API in India  
❌ **Real-time crowd sensing** — Would require telecom tower data or aggregated mobile location data  
❌ **Live CCTV coverage assessment** — No public registry of working vs non-working cameras  
❌ **Predictive crime modeling at street level** — Requires years of granular labeled incident data  
❌ **Individual threat assessment** — Cannot assess personal risk factors (e.g., being followed)  
❌ **Real-time police patrol locations** — Not publicly available  
❌ **Indoor vs outdoor differentiation** — GPS accuracy limits indoor detection  

### Known Limitations & Honest Assessment

| Limitation | Impact | Mitigation |
|---|---|---|
| OSM data completeness varies by city | Infrastructure scoring is less reliable in smaller towns | Falls back to neutral (0.5) when data unavailable |
| News geocoding is city-level, not street-level | Realtime signal applies broadly across a city radius | 15km radius + decay keeps it reasonable |
| District-level NCRB ≠ neighbourhood-level | Two places in same district get same baseline | Infrastructure + density signals differentiate |
| Overpass API has rate limits & timeouts | OSM scoring may fail under heavy load | Graceful fallback to neutral scores |
| Community reports require critical mass | New deployment has empty report database | News ingestion provides baseline realtime signal |
| Time multiplier is universal | Doesn't distinguish metro station vs dark alley at night | Infrastructure score partially compensates |

### Data Sources (All Free / Open)

| Source | What It Provides | Update Frequency |
|---|---|---|
| [NCRB 2022](https://ncrb.gov.in) | State & district crime statistics | Static (annual) |
| [OpenStreetMap Overpass](https://overpass-api.de) | Infrastructure, buildings, amenities | Live query |
| [NewsAPI](https://newsapi.org) | Crime news articles (India) | Every 5 minutes |
| [Google News RSS](https://news.google.com/rss) | Crime headlines | Every 5 minutes |
| [Times of India RSS](https://timesofindia.indiatimes.com) | Indian news feed | Every 5 minutes |
| [NDTV RSS](https://ndtv.com) | Indian news feed | Every 5 minutes |
| [OpenCage Geocoding](https://opencagedata.com) | Coordinates ↔ Address resolution | Per request |
| [Nominatim (OSM)](https://nominatim.openstreetmap.org) | Free reverse geocoding | Per request |
| Community Reports | User-submitted incident data | Real-time |

---

## API Endpoints (AI Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/risk_by_coords?lat=...&lon=...` | **Primary**: Get risk from exact GPS coordinates |
| POST | `/smart_risk?user_input=...` | Get risk from free-text location description |
| POST | `/report?user_input=...&category=...` | Report an incident via free text |
| POST | `/report_location?location=...&category=...` | Report with explicit location name |
| POST | `/sos` | Triggered by SOS hand gesture |
| GET | `/` | Service health + endpoint listing |

---

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Notes

- **Route Groups**: Using Next.js route groups `(auth)`, `(user)`, `(company)`, `(admin)` for organized routing without affecting URL structure
- **Separation of concerns**: API routes are thin controllers; domain logic lives in `src/lib/services/*`; persistence in `src/models/*`.
- **Safety Score Provider**: Global React context (`SafetyScoreProvider`) fetches score once on login, persists across navigation, refreshes every 10 minutes.
- **Direct GPS Pipeline**: The dashboard sends raw GPS coordinates directly to `/risk_by_coords` — no text parsing, no re-geocoding, maximum precision.
- **Production readiness**: Use strong secrets (`NEXTAUTH_SECRET`, `JWT_SECRET`), validate inputs, and add rate limiting before production.

---

## Real-World Dashcam Monitoring — How Live Footage Reaches the Company

> **Note:** Kavach is a prototype. In the current implementation, AI gesture detection runs in the user's browser and only sends alert metadata (gesture type, GPS, timestamp) to the company. No live video is streamed. Below is the production architecture for how real footage would reach the company for monitoring.

### Prototype vs. Production

| Aspect | Prototype (Current) | Production (Real Deployment) |
|--------|-------------------|------------------------------|
| Camera | Browser webcam via MediaStream API | In-vehicle IP camera / dashcam hardware |
| AI Processing | Client-side (TensorFlow.js/MediaPipe in browser) | Edge device (Jetson Nano / Raspberry Pi) in the vehicle |
| Data sent to company | Alert metadata only (gesture + GPS + timestamp) | Live video stream + alert metadata |
| Video storage | None (browser-only) | Cloud storage (S3, GCS) with encryption |
| Latency | N/A | ~100–500ms via WebRTC / ~2–5s via HLS |

### Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    IN-VEHICLE SYSTEM                      │
│                                                          │
│  ┌──────────┐    ┌───────────────┐    ┌──────────────┐  │
│  │ Dashcam  │───▶│ Edge AI Device│───▶│ 4G/5G Modem  │  │
│  │ (Camera) │    │ (Jetson/RPi)  │    │              │  │
│  └──────────┘    └───────────────┘    └──────┬───────┘  │
│                   • Runs gesture detection           │   │
│                   • Only streams when SOS detected   │   │
└──────────────────────────────────────────────────────┼───┘
                                                       │
                              Internet (4G/5G/WiFi)    │
                                                       ▼
┌─────────────────────────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                   │
│                                                          │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │ Media Server     │    │ Application Server         │  │
│  │ (WebRTC SFU)     │    │ (Next.js + MongoDB)        │  │
│  │                  │    │                            │  │
│  │ • LiveKit        │    │ • Receives incident alert  │  │
│  │ • Janus Gateway  │    │ • Stores metadata in DB    │  │
│  │ • Mediasoup      │    │ • Notifies company via WS  │  │
│  └────────┬─────────┘    └────────────────────────────┘  │
│           │                                              │
│  ┌────────▼─────────┐    ┌────────────────────────────┐  │
│  │ Video Storage     │    │ AI Pipeline (Optional)     │  │
│  │ (AWS S3 / GCS)   │    │ • Cloud re-verification    │  │
│  │ • Encrypted       │    │ • False positive filtering │  │
│  │ • 30-day retention│    │ • Multi-model ensemble     │  │
│  └──────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────┐
│                COMPANY/OFFICIAL DASHBOARD                 │
│                                                          │
│  • Receives real-time WebRTC video stream               │
│  • Sees incident alert with GPS + gesture type          │
│  • Can acknowledge / resolve incidents                  │
│  • Playback stored footage for evidence                 │
│  • Admin dashboard mirrors the same view                │
└─────────────────────────────────────────────────────────┘
```

### Key Technologies for Production

| Layer | Technology Options | Purpose |
|-------|-------------------|---------|
| **Video Streaming** | WebRTC (LiveKit, Janus, Mediasoup) | Real-time low-latency P2P/SFU video |
| **Adaptive Streaming** | HLS / DASH via Nginx-RTMP, AWS MediaLive | Buffered playback, multi-quality |
| **Cloud Video** | AWS Kinesis Video Streams, Azure Media Services | Managed video ingestion at scale |
| **Edge AI** | NVIDIA Jetson Nano, Google Coral, Raspberry Pi 4 | On-device ML inference |
| **Storage** | AWS S3, Google Cloud Storage | Encrypted video clip storage |
| **Notifications** | WebSocket, Firebase Cloud Messaging, SNS | Real-time alerts to company |

### How It Works (Production Flow)

1. **Normal operation**: Dashcam records locally on the edge device. No video leaves the vehicle.
2. **Gesture detected**: Edge AI identifies a distress gesture (e.g., open palm SOS).
3. **Incident triggered**: Device sends alert metadata to the Kavach API server AND starts streaming live video to the media server.
4. **Company notified**: Company dashboard receives a WebSocket push notification + connects to the live video stream.
5. **Official responds**: Company operator acknowledges the incident, contacts authorities, monitors the live feed.
6. **Resolution**: Once resolved, streaming stops. Video clip is stored in cloud for 30 days as evidence.
7. **Admin view**: Admin dashboard shows the same incident + status updates in real-time (read from the same DB).

### Bandwidth Optimization

In production, constant video streaming from thousands of vehicles is impractical. Kavach uses an **event-triggered streaming** model:

- **Idle**: No video transmitted. Only periodic heartbeat/GPS pings (~1 KB/min)
- **Gesture detected**: Live stream begins (720p @ 1–2 Mbps)
- **30-second buffer**: Edge device maintains a rolling 30-second buffer, so the company receives footage from *before* the gesture was detected
- **Auto-stop**: Stream ends 5 minutes after incident is resolved (configurable)

### Security & Privacy

- **End-to-end encryption**: DTLS/SRTP for WebRTC streams
- **Access control**: Only authorized company operators can view footage
- **Data minimization**: Video only streamed during incidents, not continuously
- **Auto-deletion**: Stored clips are purged after the retention period (default: 30 days)
- **Audit logging**: All access to footage is logged for compliance
- **GDPR/DPDPA compliance**: Users are informed about dashcam monitoring in the terms of service
