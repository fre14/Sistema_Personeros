import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';
import { getRedis } from '../config/redis.js';
import db from '../config/database.js';

let io = null;
let adapterActivo = false;

const MAX_SOCKETS_POR_USUARIO = Number(process.env.WS_MAX_SOCKETS_PER_USER || 3);

export const setupWebSocket = async (server, allowedOrigins = []) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return cb(null, true);
        }
        return cb(new Error('Origen no permitido por CORS'));
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  const redis = getRedis();
  if (redis) {
    try {
      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      adapterActivo = true;
      console.log('OK  Socket.io usando adapter Redis (multi-instancia)');
    } catch (err) {
      console.error('AVISO No se pudo activar el adapter Redis:', err.message);
      console.error('      Socket.io funcionara solo dentro de esta instancia.');
    }
  } else {
    console.warn('AVISO Sin Redis: Socket.io funcionara solo dentro de esta instancia.');
  }

  io.use((socket, next) => {
    const raw = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!raw) return next(new Error('Falta token de autenticacion'));
    try {
      const decoded = jwt.verify(String(raw).replace('Bearer ', ''), authConfig.secret);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Token invalido o expirado'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, rol } = socket.user;

    try {
      const sockets = await io.in(`user:${id}`).fetchSockets();
      if (sockets.length >= MAX_SOCKETS_POR_USUARIO) {
        const sobrante = sockets.slice(0, sockets.length - MAX_SOCKETS_POR_USUARIO + 1);
        sobrante.forEach((s) => s.disconnect(true));
      }
    } catch {}

    socket.join(`user:${id}`);

    if (rol === 'admin') {
      socket.join('admin:dashboard');
    } else if (rol === 'personero') {
      socket.join(`personero:${id}`);
    } else if (rol === 'coordinador') {
      socket.join('coordinador:todos');
      try {
        const locales = await db('asignacion_coordinadores')
          .where({ usuario_id: id, activo: true })
          .pluck('local_id');
        locales.forEach((localId) => socket.join(`local:${localId}`));
      } catch (err) {
        console.error('Error al suscribir coordinador a sus locales:', err.message);
      }
    }

    socket.on('join_local', async (localId) => {
      if (rol === 'admin') return socket.join(`local:${localId}`);
      if (rol !== 'coordinador') return;
      try {
        const asignado = await db('asignacion_coordinadores')
          .where({ usuario_id: id, local_id: localId, activo: true })
          .first();
        if (asignado) socket.join(`local:${localId}`);
      } catch {}
    });

    socket.on('leave_local', (localId) => socket.leave(`local:${localId}`));

    socket.on('ping_estado', (cb) => {
      if (typeof cb === 'function') cb({ ok: true, ts: Date.now() });
    });
  });

  return io;
};

export const notifyCoordinator = (localId, event, data) => {
  if (io && localId != null) io.to(`local:${localId}`).emit(event, data);
};

export const notifyAdmin = (event, data) => {
  if (io) io.to('admin:dashboard').emit(event, data);
};

export const notifyPersonero = (userId, event, data) => {
  if (io && userId != null) io.to(`personero:${userId}`).emit(event, data);
};

export const getIo = () => io;

export const getWsStats = async () => {
  if (!io) return { conectados: 0, adapterRedis: false };
  let conectados = 0;
  try {
    const sockets = await io.fetchSockets();
    conectados = sockets.length;
  } catch {
    conectados = io.engine?.clientsCount || 0;
  }
  return { conectados, adapterRedis: adapterActivo };
};
