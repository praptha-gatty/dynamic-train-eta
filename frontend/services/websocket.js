/**
 * WebSocket service for real-time train tracking using Socket.IO.
 * Subscribes to backend train rooms and broadcasts updates.
 */

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.currentRoom = null;
    this.listeners = new Map();
  }

  connect(url = window.location.origin) {
    if (this.socket) return this.socket;

    try {
      this.socket = io(url, {
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.notify('connection_change', { connected: true, socketId: this.socket.id });
        
        // Re-subscribe if we were in a room
        if (this.currentRoom) {
          const [trainNumber, journeyDate] = this.currentRoom.split(':');
          this.subscribe(trainNumber, journeyDate);
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        this.notify('connection_change', { connected: false, reason });
      });

      this.socket.on('train_update', (data) => {
        this.notify('train_update', data);
      });

      this.socket.on('status_change', (data) => {
        this.notify('status_change', data);
      });

      this.socket.on('connect_error', (error) => {
        this.notify('connection_error', error);
      });
    } catch (err) {
      console.warn('Socket.IO connection failed:', err);
    }

    return this.socket;
  }

  subscribe(trainNumber, journeyDate) {
    if (!trainNumber || !journeyDate) return;
    
    const newRoom = `${trainNumber}:${journeyDate}`;
    
    // Unsubscribe from previous room if changed
    if (this.currentRoom && this.currentRoom !== newRoom && this.socket?.connected) {
      const [oldTrain, oldDate] = this.currentRoom.split(':');
      this.socket.emit('unsubscribe_train', { trainNumber: oldTrain, journeyDate: oldDate });
    }

    this.currentRoom = newRoom;

    if (this.socket?.connected) {
      this.socket.emit('subscribe_train', { trainNumber, journeyDate });
    }
  }

  unsubscribe() {
    if (this.currentRoom && this.socket?.connected) {
      const [trainNumber, journeyDate] = this.currentRoom.split(':');
      this.socket.emit('unsubscribe_train', { trainNumber, journeyDate });
      this.currentRoom = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  notify(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in WebSocket listener for ${event}:`, e);
        }
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentRoom = null;
    }
  }
}

export const wsService = new WebSocketService();
