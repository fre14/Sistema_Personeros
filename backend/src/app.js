import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';

import db from './config/database.js';
import { initRedis, closeRedis, isRedisReady } from './config/redis.js';
import { setupWebSocket, getWsStats } from './services/websocket.service.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import distritosRoutes from './routes/distritos.routes.js';
import localesRoutes from './routes/locales.routes.js';
import mesasRoutes from './routes/mesas.routes.js';
import candidatosRoutes from './routes/candidatos.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import asignacionesRoutes from './routes/asignaciones.routes.js';
import resultadosRoutes from './routes/resultados.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import coordinadorRoutes from './routes/coordinador.routes.js';
import descargaRoutes from './routes/descarga.routes.js';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const INSTANCE_ID = process.env.INSTANCE_ID || 'backend-local';

app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(compression({ threshold: 1024 }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { skip: (req, res) => res.statusCode < 400 }));
} else {
  app.use(morgan('dev'));
}

const limiterOpts = { standardHeaders: true, legacyHeaders: false };

const isRequestFromAdmin = (req) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.split(' ')[1];
    if (!token) return false;
    const decoded = jwt.decode(token);
    return decoded && decoded.rol === 'admin';
  } catch {
    return false;
  }
};

const authLimiter = rateLimit({
  ...limiterOpts,
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH || 30),
  message: { success: false, message: 'Demasiados intentos de acceso. Espere un minuto.' },
});

const escrituraLimiter = rateLimit({
  ...limiterOpts,
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WRITE || 100),
  message: { success: false, message: 'Demasiados envios seguidos. Espere unos segundos.' },
  skip: (req) => req.method === 'GET' || isRequestFromAdmin(req),
});

const apiLimiter = rateLimit({
  ...limiterOpts,
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API || 1000),
  message: { success: false, message: 'Demasiadas peticiones. Espere un momento.' },
  skip: (req) => isRequestFromAdmin(req),
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/resultados', escrituraLimiter);

const uploadsPathCandidates = [
  process.env.STORAGE_LOCAL_PATH,
  process.platform === 'win32' ? 'C:/app/uploads' : '/app/uploads',
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), '../uploads'),
].filter(Boolean);

uploadsPathCandidates.forEach((dir) => {
  try {
    if (fs.existsSync(dir)) {
      app.use('/actas', express.static(path.join(dir, 'actas')));
      app.use('/actas', express.static(dir));
      app.use('/actas/actas', express.static(path.join(dir, 'actas')));
      app.use('/actas/actas', express.static(dir));
      app.use('/uploads', express.static(dir));
    }
  } catch (e) {}
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', instancia: INSTANCE_ID, ts: Date.now() });
});

app.get('/api/health/full', async (req, res) => {
  const salud = { instancia: INSTANCE_ID, ts: Date.now(), db: false, redis: isRedisReady() };
  try {
    await db.raw('select 1');
    salud.db = true;
  } catch (err) {
    salud.dbError = err.message;
  }
  try {
    salud.websocket = await getWsStats();
  } catch {
    salud.websocket = null;
  }
  const pool = db.client?.pool;
  if (pool) {
    salud.pool = {
      usadas: pool.numUsed?.() ?? null,
      libres: pool.numFree?.() ?? null,
      enEspera: pool.numPendingAcquires?.() ?? null,
    };
  }
  res.status(salud.db ? 200 : 503).json(salud);
});

app.use('/api/auth', authRoutes);
app.use('/api/distritos', distritosRoutes);
app.use('/api/locales', localesRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/resultados', resultadosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coordinador', coordinadorRoutes);
app.use('/api/descargas', descargaRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT || 3000);

const SECRETOS_POR_DEFECTO = new Set(['', 'secret', 'refresh', 'refresh_secret', 'CAMBIAR_POR_CADENA_ALEATORIA_LARGA']);

const arrancar = async () => {
  if (process.env.NODE_ENV === 'production') {
    const inseguros = ['JWT_SECRET', 'JWT_REFRESH_SECRET']
      .filter((k) => SECRETOS_POR_DEFECTO.has(String(process.env[k] || '')));
    if (inseguros.length) {
      console.error(`FATAL: ${inseguros.join(', ')} sin definir o con valor de ejemplo. No se arranca en produccion.`);
      process.exit(1);
    }
  }

  const redis = await initRedis();
  // En AWS (varias instancias) Redis es obligatorio: sin el, Socket.io no
  // sincroniza entre servidores. Se sale para que systemd reintente.
  if (!redis && String(process.env.REDIS_REQUIRED || '').toLowerCase() === 'true') {
    console.error('FATAL: REDIS_REQUIRED=true y Redis no responde. Se reintentara el arranque.');
    process.exit(1);
  }
  await setupWebSocket(httpServer, allowedOrigins);

  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 70000;

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log('  Sistema Electoral - Personeros');
    console.log(`  Instancia: ${INSTANCE_ID}`);
    console.log(`  Entorno:   ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Puerto:    ${PORT}`);
    console.log(`  CORS:      ${allowedOrigins.join(', ')}`);
    console.log('==================================================');
  });
};

let apagando = false;
const apagar = async (senal) => {
  if (apagando) return;
  apagando = true;
  console.log(`\n${senal} recibido. Cerrando de forma ordenada...`);

  const forzar = setTimeout(() => {
    console.error('Cierre forzado tras 15s de espera.');
    process.exit(1);
  }, 15000);

  httpServer.close(async () => {
    try {
      await closeRedis();
      await db.destroy();
    } catch (err) {
      console.error('Error al cerrar recursos:', err.message);
    }
    clearTimeout(forzar);
    console.log('Cierre completado.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada sin manejar:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Excepcion no capturada:', err);
  apagar('uncaughtException');
});

if (process.env.NODE_ENV !== 'test') {
  arrancar();
}

export default app;
export { app, httpServer, arrancar };
