import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';

let io;

export const setupWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), authConfig.secret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected via socket: ${socket.user.id}`);
    const { rol, id } = socket.user;

    // Join specific rooms based on role
    if (rol === 'admin') {
      socket.join('admin:dashboard');
    } else if (rol === 'coordinador') {
      // Typically the client would emit an event to join specific local rooms
      // or we can join them from DB if we fetch it here.
      // For now, allow a generic custom event to join rooms.
    } else if (rol === 'personero') {
      socket.join(`personero:${id}`);
    }

    socket.on('join_local', (localId) => {
      if (rol === 'coordinador') {
        socket.join(`coordinador:${localId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${id}`);
    });
  });

  return io;
};

export const notifyCoordinator = (localId, event, data) => {
  if (io) {
    io.to(`coordinador:${localId}`).emit(event, data);
  }
};

export const notifyAdmin = (event, data) => {
  if (io) {
    io.to('admin:dashboard').emit(event, data);
  }
};

export const notifyPersonero = (userId, event, data) => {
  if (io) {
    io.to(`personero:${userId}`).emit(event, data);
  }
};

export const getIo = () => io;
