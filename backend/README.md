# Dynamic Train ETA - Backend API

Backend service for real-time train tracking, historical data, and ETA predictions using Supabase and RailRadar API.

## Tech Stack

- **Runtime:** Node.js 20+ (ES Modules)
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Socket.IO WebSockets
- **External API:** RailRadar (railradar.in)
- **Validation:** Zod
- **Logging:** Winston
- **Container:** Docker

## Project Structure

```
dynamic-train-eta-main/
├── backend/                    # Backend API (this folder)
│   ├── src/
│   │   ├── server.js           # Entry point - Express + WebSocket
│   │   ├── routes/
│   │   │   ├── trains.js       # /trains, /realtime, /history, /route
│   │   │   └── eta.js          # /eta/predict, /eta/live
│   │   ├── services/
│   │   │   ├── supabase.js     # Supabase client (anon + admin)
│   │   │   ├── trainService.js # DB queries for trains/status/history
│   │   │   └── etaService.js   # RailRadar live API + ETA calculation
│   │   ├── validators/
│   │   │   └── index.js        # Zod schemas for input validation
│   │   ├── utils/
│   │   │   └── logger.js       # Winston logging
│   │   └── websocket/
│   │       └── handlers.js     # Real-time WebSocket events
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── .env.example
│   └── setup.sh                # Auto-setup script
│
├── data-collector/             # Data collector (collects every 5 min)
│   ├── collector.js            # Main loop - RailRadar → Supabase + CSV
│   ├── package.json
│   └── (other collector scripts)
│
├── data/                       # Data files
│   ├── active-trains.json      # Train numbers to track
│   └── processed/              # ML-ready CSV files
│
└── schema_update.sql           # Run ONCE in Supabase SQL Editor
```

---

## Quick Start - Choose Your Method

### 🐳 Method 1: Docker (Easiest - No Node.js Install Needed)

**Prerequisites:** Docker Desktop installed

```bash
# 1. Create .env files in BOTH folders
cp backend/.env.example backend/.env
# Edit backend/.env with your keys

# Create data-collector/.env with same keys
# (copy backend/.env to data-collector/.env)

# 2. Run Supabase schema (one time)
# Go to Supabase Dashboard → SQL Editor → Paste schema_update.sql → Run

# 3. Start everything with Docker
cd backend
docker-compose up -d --build

# 4. Start data collector (separate terminal)
cd ../data-collector
docker run --rm -it \
  --env-file .env \
  -v ${PWD}:/app \
  -v ${PWD}/../data:/app/data \
  node:20-alpine sh -c "npm install && npm start"
```

**That's it!** Backend at `http://localhost:3000`, collector runs in background.

---

### 💻 Method 2: Manual Setup (With Auto-Install Script)

**Prerequisites:** Windows/Mac/Linux with internet

```bash
# 1. Run the auto-setup script (installs Node.js 20, deps, creates .env template)
cd backend
chmod +x setup.sh
./setup.sh

# 2. Edit .env files with your ACTUAL keys
# backend/.env and data-collector/.env

# 3. Run Supabase schema (one time in Supabase Dashboard → SQL Editor)

# 4. Start BOTH services (needs 2 terminals)

# Terminal 1 - Data Collector (collects every 5 min)
cd data-collector
npm start

# Terminal 2 - Backend API
cd backend
npm run dev
```

**Auto-setup script does:**
- Checks/installs Node.js 20+ (via nvm/fnm/chocolatey/brew)
- Runs `npm install` in both folders
- Creates `.env` from template if missing
- Verifies Supabase connection

---

### 📋 Method 3: Manual Step-by-Step

#### Step 1: Install Node.js 20+
- **Windows:** `winget install OpenJS.NodeJS.LTS` or download from nodejs.org
- **Mac:** `brew install node@20`
- **Linux:** `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`
- **Verify:** `node --version` → should show `v20.x.x`

#### Step 2: Create Environment Files

**backend/.env:**
```env
PORT=3000
NODE_ENV=development
API_PREFIX=/api/v1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAILRADAR_API_KEY=your-railradar-key
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

**data-collector/.env:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAILRADAR_API_KEY=your-railradar-key
```

#### Step 3: Run Database Schema (ONE TIME)
1. Open Supabase Dashboard → SQL Editor
2. Copy entire `schema_update.sql` content
3. Paste and click **Run**

#### Step 4: Install Dependencies
```bash
# Backend
cd backend && npm install

# Data Collector
cd ../data-collector && npm install
```

#### Step 5: Start Both Services (2 Terminals)

**Terminal 1 - Data Collector:**
```bash
cd data-collector
npm start
# Logs: "COLLECTION CYCLE COMPLETED" every 5 minutes
```

**Terminal 2 - Backend API:**
```bash
cd backend
npm run dev
# Server at http://localhost:3000
# Health: http://localhost:3000/health
```

---

## Verify Everything Works

```bash
# Health check
curl http://localhost:3000/health

# List trains
curl http://localhost:3000/api/v1/trains

# Real-time status
curl "http://localhost:3000/api/v1/realtime?trainNumber=12919&journeyDate=2026-08-28"

# ETA prediction
curl "http://localhost:3000/api/v1/eta/predict?trainNumber=12919&journeyDate=2026-08-28&targetStationCode=NDLS"
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Health** | `GET /health` | Server + DB status |
| **Trains** | `GET /trains` | All trains |
| | `GET /trains/:trainNumber` | Single train |
| | `GET /trains/:trainNumber/route?journeyDate=YYYY-MM-DD` | Route stations |
| **Real-time** | `GET /realtime?trainNumber=12919&journeyDate=2026-08-28` | Current status |
| | `GET /realtime/:trainNumber?journeyDate=2026-08-28` | Single train status |
| **History** | `GET /history?trainNumber=12919&journeyDate=2026-08-28` | Historical snapshots |
| | `GET /history/:trainNumber?journeyDate=2026-08-28` | Full journey history |
| **ETA** | `GET /eta/predict?trainNumber=12919&journeyDate=2026-08-28&targetStationCode=NDLS` | Predicted arrival |
| | `GET /eta/live/:trainNumber` | Live RailRadar data |

---

## WebSocket (Real-time Updates)

```javascript
const socket = io('ws://localhost:3000');

// Subscribe to a train
socket.emit('subscribe_train', { trainNumber: '12919', journeyDate: '2026-08-28' });

// Listen for updates
socket.on('train_update', (data) => {
  console.log('Train moved:', data.current_station, 'Delay:', data.delay_minutes);
});

socket.on('status_change', (data) => {
  console.log('Status:', data.status); // IN_TRANSIT, COMPLETED, CONFLICT_FLAGGED
});
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `API_PREFIX` | No | /api/v1 | API base path |
| `SUPABASE_URL` | **Yes** | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | **Yes** | - | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | - | Admin key (writes) |
| `RAILRADAR_API_KEY` | **Yes** | - | RailRadar API key |
| `CORS_ORIGIN` | No | localhost:5173,localhost:3000 | Frontend URLs |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Max requests per window |
| `WS_ENABLED` | No | true | Enable WebSocket |
| `LOG_LEVEL` | No | info | Log level |

### Data Collector (`data-collector/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | **Yes** | Supabase project URL |
| `SUPABASE_ANON_KEY` | **Yes** | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Admin key (writes) |
| `RAILRADAR_API_KEY` | **Yes** | RailRadar API key |

---

## Data Flow

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│  RailRadar   │────▶│  Data Collector │────▶│  Supabase   │
│   (Live)     │     │  (Every 5 min)  │     │  (Postgres) │
└──────────────┘     └─────────────────┘     └──────┬──────┘
                                                    │
                              ┌─────────────────────┘
                              ▼
                     ┌─────────────────┐
                     │    Backend      │◀─── Frontend / Mobile App
                     │  (Express API)  │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │   WebSocket     │─── Live updates to UI
                     └─────────────────┘
```

**Tables in Supabase:**
- `trains` - Master train info (number, name, type, source, destination)
- `train_current_status` - **One row per train/journey** = current location
- `train_history` - **All snapshots** = every 5 min (used for ML training)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm not found` | Install Node.js 20+ from nodejs.org |
| `Supabase connection failed` | Check `.env` keys, run `schema_update.sql` |
| `RailRadar 401/403` | Regenerate API key at railradar.in |
| `Port 3000 in use` | Change `PORT` in `.env` or kill process |
| `WebSocket not connecting` | Check `WS_ENABLED=true`, CORS origins |
| `GitHub secret scanning alert` | Regenerate keys in Supabase/RailRadar immediately |

---

## Deployment

### Docker (Production)
```bash
cd backend
docker-compose -f docker-compose.yml up -d --build
```

### Manual Production
```bash
cd backend
npm install --production
NODE_ENV=production node src/server.js
```

### Nginx Reverse Proxy
```nginx
location /api/v1/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## License

ISC