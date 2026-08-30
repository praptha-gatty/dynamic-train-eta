/**
 * Real-time Communication Manager.
 * Supports Socket.IO WebSocket subscriptions and HTTP Server-Sent Events (SSE).
 */

import { Server } from 'socket.io';
import config from '../config/env.js';
import logger from '../utils/logger.js';

let io = null;
const socketSubscriptions = new Map(); // room -> Set(socketId)
const sseClients = new Map(); // room -> Set(res)

/**
 * Initializes Socket.IO WebSocket Server.
 * @param {import('http').Server} httpServer 
 * @returns {Server}
 */
export function initializeWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: config.WS_PING_INTERVAL,
    pingTimeout: config.WS_PING_TIMEOUT
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe_train', ({ trainNumber, journeyDate }) => {
      if (!trainNumber) {
        socket.emit('error', { message: 'trainNumber is required' });
        return;
      }
      
      const date = journeyDate || new Date().toISOString().split('T')[0];
      const room = `${trainNumber}:${date}`;
      socket.join(room);
      
      if (!socketSubscriptions.has(room)) {
        socketSubscriptions.set(room, new Set());
      }
      socketSubscriptions.get(room).add(socket.id);
      
      logger.info(`Client ${socket.id} subscribed to ${room}`);
      socket.emit('subscribed', { trainNumber, journeyDate: date });
    });

    socket.on('unsubscribe_train', ({ trainNumber, journeyDate }) => {
      const date = journeyDate || new Date().toISOString().split('T')[0];
      const room = `${trainNumber}:${date}`;
      socket.leave(room);
      
      if (socketSubscriptions.has(room)) {
        socketSubscriptions.get(room).delete(socket.id);
        if (socketSubscriptions.get(room).size === 0) {
          socketSubscriptions.delete(room);
        }
      }
      
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (${reason})`);
      
      for (const [room, clients] of socketSubscriptions.entries()) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            socketSubscriptions.delete(room);
          }
        }
      }
    });

    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${socket.id}:`, error);
    });
  });

  logger.info('WebSocket (Socket.IO) server initialized');
  return io;
}

/**
 * Registers an HTTP Server-Sent Events (SSE) client response stream.
 * @param {string} trainNumber 
 * @param {string} journeyDate 
 * @param {import('express').Response} res 
 */
export function registerSSEClient(trainNumber, journeyDate, res) {
  const room = `${trainNumber}:${journeyDate}`;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', trainNumber, journeyDate, timestamp: new Date().toISOString() })}\n\n`);

  if (!sseClients.has(room)) {
    sseClients.set(room, new Set());
  }
  sseClients.get(room).add(res);

  // Heartbeat keep-alive every 20 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 20000);

  res.on('close', () => {
    clearInterval(heartbeatTimer);
    if (sseClients.has(room)) {
      sseClients.get(room).delete(res);
      if (sseClients.get(room).size === 0) {
        sseClients.delete(room);
      }
    }
    logger.info(`SSE client disconnected from ${room}`);
  });

  logger.info(`SSE client subscribed to ${room}`);
}

/**
 * Broadcasts a telemetry or ETA update to both WebSocket rooms and SSE subscribers.
 * @param {string} trainNumber 
 * @param {string} journeyDate 
 * @param {object} data 
 */
export function broadcastTrainUpdate(trainNumber, journeyDate, data) {
  const date = journeyDate || new Date().toISOString().split('T')[0];
  const room = `${trainNumber}:${date}`;
  const payload = {
    type: 'train_update',
    trainNumber,
    journeyDate: date,
    ...data,
    timestamp: new Date().toISOString()
  };

  // 1. Emit to Socket.IO
  if (io) {
    io.to(room).emit('train_update', payload);
  }

  // 2. Emit to SSE clients
  if (sseClients.has(room)) {
    const ssePayload = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of sseClients.get(room)) {
      try {
        res.write(ssePayload);
      } catch (err) {
        logger.warn(`Failed to write to SSE client: ${err.message}`);
      }
    }
  }
}

/**
 * Broadcasts status change events.
 */
export function broadcastStatusChange(trainNumber, journeyDate, status) {
  const date = journeyDate || new Date().toISOString().split('T')[0];
  const room = `${trainNumber}:${date}`;
  const payload = {
    type: 'status_change',
    trainNumber,
    journeyDate: date,
    status,
    timestamp: new Date().toISOString()
  };

  if (io) {
    io.to(room).emit('status_change', payload);
  }

  if (sseClients.has(room)) {
    const ssePayload = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of sseClients.get(room)) {
      try {
        res.write(ssePayload);
      } catch {
        // Handled on close
      }
    }
  }
}

/**
 * Returns active connection metrics.
 */
export function getConnectedClients() {
  const wsCount = io ? io.engine.clientsCount : 0;
  let sseCount = 0;
  for (const set of sseClients.values()) {
    sseCount += set.size;
  }
  return {
    websocket: wsCount,
    sse: sseCount,
    total: wsCount + sseCount
  };
}

/**
 * Returns active subscription map.
 */
export function getSubscriptions() {
  const subs = {};
  for (const [room, clients] of socketSubscriptions.entries()) {
    subs[room] = (subs[room] || 0) + clients.size;
  }
  for (const [room, clients] of sseClients.entries()) {
    subs[room] = (subs[room] || 0) + clients.size;
  }
  return subs;
}