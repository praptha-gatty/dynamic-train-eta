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
backend/
├── src/
│   ├── server.js              # Entry point
│   ├── routes/
│   │   ├── trains.js          # Train & real-time status endpoints
│   │   └── eta.js             # ETA prediction endpoints
│   ├── services/
│   │   ├── supabase.js        # Supabase client & connection
│   │   ├── trainService.js    # Train data operations
│   │   └── etaService.js      # ETA prediction & RailRadar integration
│   ├── validators/
│   │   └── index.js           # Zod validation schemas
│   ├── middleware/            # (extensible)
│   ├── utils/
│   │   └── logger.js          # Winston logger
│   └── websocket/
│       └── handlers.js        # Socket.IO event handlers
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your keys
```

Required variables:
- `SUPABASE_URL` - From Supabase Dashboard > Settings > API
- `SUPABASE_ANON_KEY` - From Supabase Dashboard > Settings > API
- `RAILRADAR_API_KEY` - From railradar.in developer portal

### 3. Run Development Server
```bash
npm run dev
# Server at http://localhost:3000
```

### 4. Run with Docker
```bash
docker-compose up -d --build
```

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Health Check
```
GET /health
GET /health/db
```

### Trains
```
GET /trains                           # List all trains
GET /trains/:trainNumber              # Get train details
GET /trains/:trainNumber/route?journeyDate=YYYY-MM-DD  # Get route stations
```

### Real-time Status
```
GET /realtime?trainNumber=12919&journeyDate=2026-08-28&page=1&limit=50
GET /realtime/:trainNumber?journeyDate=2026-08-28
```

### Historical Data
```
GET /history?trainNumber=12919&journeyDate=2026-08-28&page=1&limit=50
GET /history/:trainNumber?journeyDate=2026-08-28
```

### ETA Prediction
```
GET /eta/predict?trainNumber=12919&journeyDate=2026-08-28&targetStationCode=NDLS&targetStationSequence=15
GET /eta/live/:trainNumber
```

## WebSocket Events

Connect: `ws://localhost:3000`

### Client → Server
```javascript
// Subscribe to train updates
socket.emit('subscribe_train', { trainNumber: '12919', journeyDate: '2026-08-28' });

// Unsubscribe
socket.emit('unsubscribe_train', { trainNumber: '12919', journeyDate: '2026-08-28' });
```

### Server → Client
```javascript
// Train position/update
socket.on('train_update', (data) => { /* { trainNumber, journeyDate, current_station, delay_minutes, ... } */ });

// Status change (IN_TRANSIT, COMPLETED, CONFLICT_FLAGGED)
socket.on('status_change', (data) => { /* { trainNumber, journeyDate, status } */ });

// Subscription confirmed
socket.on('subscribed', (data) => { /* { trainNumber, journeyDate } */ });

// Errors
socket.on('error', (data) => { /* { message } */ });
```

## Response Format

### Success
```json
{
  "data": { ... },
  "pagination": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 }
}
```

### Error
```json
{
  "error": "Validation failed",
  "details": { "trainNumber": ["Train number must be 5 digits"] }
}
```

## Database Schema

The backend expects these Supabase tables (created via `schema_update.sql`):

- `trains` - Master train details
- `train_current_status` - Single current location per train/journey
- `train_history` - Historical observations with unique constraint on `(train_number, journey_date, station_sequence, captured_at)`

## Data Collector Integration

The existing `data-collector/collector.js` already writes to:
- `train_history` (historical snapshots)
- `train_current_status` (real-time current location)
- `trains` (master data)

This backend reads from those tables and provides APIs for frontend consumption.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `API_PREFIX` | No | /api/v1 | API base path |
| `SUPABASE_URL` | **Yes** | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | **Yes** | - | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | - | Admin key (for writes) |
| `RAILRADAR_API_KEY` | **Yes** | - | RailRadar API key |
| `CORS_ORIGIN` | No | localhost:5173,localhost:3000 | Allowed origins |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Max requests per window |
| `WS_ENABLED` | No | true | Enable WebSocket |
| `LOG_LEVEL` | No | info | Log level |

## Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual
```bash
npm install --production
NODE_ENV=production node src/server.js
```

### Reverse Proxy (Nginx)
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

## License

ISC