/**
 * Dynamic Train ETA Backend Server.
 * Production-ready Express & Socket.IO server with structured logging,
 * rate limiting, graceful shutdown, and in-memory caching.
 */

// 1. Centralized Environment Configuration (MUST be first import)
import config from './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

import logger from './utils/logger.js';
import { testConnection } from './services/supabase.js';
import { initializeWebSocket, getConnectedClients, getSubscriptions } from './websocket/handlers.js';
import { startBackgroundWorker, stopBackgroundWorker } from './services/backgroundWorker.js';
import { etaCache } from './utils/cache.js';

import trainsRouter from './routes/trains.js';
import etaRouter from './routes/eta.js';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const httpServer = createServer(app);

const PORT = config.PORT || 3000;
const API_PREFIX = config.API_PREFIX || '/api/v1';

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Dynamic CORS Configuration (supports all localhost & 127.0.0.1 ports + configured origins)
const allowedOrigins = config.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow server-to-server or non-browser requests
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/local mode
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Compression & Body Parsers
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) }
  }));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS || 900000,
  max: config.RATE_LIMIT_MAX_REQUESTS || 500,
  message: { status: 'error', error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Health Check Endpoints
app.get(['/api/health', '/health'], async (req, res) => {
  const supabaseConnected = await testConnection();
  const dbStatus = supabaseConnected ? 'connected' : 'disconnected';
  const clients = getConnectedClients();

  res.json({
    status: 'ok',
    service: 'Railwise Express API Gateway',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    realtime: {
      websocket_enabled: config.WS_ENABLED,
      connected_clients: clients,
      active_subscriptions: getSubscriptions()
    },
    cache: etaCache.getStats(),
    supabase: dbStatus
  });
});

app.get('/health/db', async (req, res) => {
  const connected = await testConnection();
  res.status(connected ? 200 : 503).json({
    status: connected ? 'healthy' : 'unhealthy',
    supabase: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Mount Standard Prefixed Routes (/api/v1/...)
app.use(`${API_PREFIX}/trains`, trainsRouter);
app.use(`${API_PREFIX}/eta`, etaRouter);

// Mount Alias Routes (/api/...) for backward compatibility
if (API_PREFIX !== '/api') {
  app.use('/api/trains', trainsRouter);
  app.use('/api/eta', etaRouter);
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Centralized Error Handler (Always returns structured JSON, never raw HTML or uncaught 500)
app.use((err, req, res, next) => {
  logger.error('Unhandled application error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const status = err.status || err.statusCode || 500;
  const message = config.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'An unexpected error occurred';

  res.status(status).json({
    status: 'error',
    error: message,
    statusCode: status,
    timestamp: new Date().toISOString(),
    ...(config.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Server Initialization
async function start() {
  try {
    logger.info('Initializing Dynamic Train ETA Backend...');

    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Supabase initial connection test failed - continuing with offline/demo fallback mode');
    } else {
      logger.info('Supabase connection verified successfully');
    }

    if (config.WS_ENABLED) {
      initializeWebSocket(httpServer);
    }

    if (config.BACKGROUND_SYNC_ENABLED) {
      startBackgroundWorker();
    }

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API Base: http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`🩺 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  stopBackgroundWorker();

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Only start listening automatically if invoked directly (not imported in tests)
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain && config.NODE_ENV !== 'test') {
  start();
}

export { app, httpServer, start };