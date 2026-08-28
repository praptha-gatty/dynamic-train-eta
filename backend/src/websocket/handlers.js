import { Server } from 'socket.io';
import logger from '../utils/logger.js';

let io = null;
const trainSubscriptions = new Map();

export function initializeWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000,
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 20000
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe_train', ({ trainNumber, journeyDate }) => {
      if (!trainNumber || !journeyDate) {
        socket.emit('error', { message: 'trainNumber and journeyDate required' });
        return;
      }
      
      const room = `${trainNumber}:${journeyDate}`;
      socket.join(room);
      
      if (!trainSubscriptions.has(room)) {
        trainSubscriptions.set(room, new Set());
      }
      trainSubscriptions.get(room).add(socket.id);
      
      logger.info(`Client ${socket.id} subscribed to ${room}`);
      socket.emit('subscribed', { trainNumber, journeyDate });
    });

    socket.on('unsubscribe_train', ({ trainNumber, journeyDate }) => {
      const room = `${trainNumber}:${journeyDate}`;
      socket.leave(room);
      
      if (trainSubscriptions.has(room)) {
        trainSubscriptions.get(room).delete(socket.id);
        if (trainSubscriptions.get(room).size === 0) {
          trainSubscriptions.delete(room);
        }
      }
      
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (${reason})`);
      
      for (const [room, clients] of trainSubscriptions.entries()) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            trainSubscriptions.delete(room);
          }
        }
      }
    });

    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${socket.id}:`, error);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function broadcastTrainUpdate(trainNumber, journeyDate, data) {
  if (!io) return;
  
  const room = `${trainNumber}:${journeyDate}`;
  io.to(room).emit('train_update', {
    trainNumber,
    journeyDate,
    ...data,
    timestamp: new Date().toISOString()
  });
}

export function broadcastStatusChange(trainNumber, journeyDate, status) {
  if (!io) return;
  
  const room = `${trainNumber}:${journeyDate}`;
  io.to(room).emit('status_change', {
    trainNumber,
    journeyDate,
    status,
    timestamp: new Date().toISOString()
  });
}

export function getConnectedClients() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

export function getSubscriptions() {
  const subs = {};
  for (const [room, clients] of trainSubscriptions.entries()) {
    subs[room] = clients.size;
  }
  return subs;
}