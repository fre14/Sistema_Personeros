import { createClient } from 'redis';

/**
 * Cliente Redis central del sistema.
 *
 * Se usa para dos cosas distintas:
 *   1. Adapter de Socket.io (pub/sub entre instancias del backend).
 *   2. Cache de consultas pesadas del dashboard.
 *
 * Si Redis no está disponible el sistema NO se cae: sigue funcionando
 * en modo degradado (sin cache y con WebSocket local a cada instancia).
 * Esto evita que un fallo de cache tumbe la jornada electoral.
 */

const REDIS_ENABLED = String(process.env.REDIS_ENABLED ?? 'true').toLowerCase() !== 'false';

let client = null;
let ready = false;

const buildUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = process.env.REDIS_PORT || 6379;
  const pass = process.env.REDIS_PASSWORD;
  return pass
    ? `redis://:${encodeURIComponent(pass)}@${host}:${port}`
    : `redis://${host}:${port}`;
};

export const initRedis = async () => {
  if (!REDIS_ENABLED) {
    console.log('ℹ️  Redis deshabilitado por configuración (REDIS_ENABLED=false)');
    return null;
  }

  client = createClient({
    url: buildUrl(),
    socket: {
      connectTimeout: 5000,
      // Reintento con backoff: 100ms, 200ms... tope 3s. Nunca se rinde.
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on('error', (err) => {
    if (ready) console.error('Redis error:', err.message);
  });
  client.on('ready', () => {
    ready = true;
    console.log('✓ Redis conectado');
  });
  client.on('end', () => {
    ready = false;
  });

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado (2s)')), 2000)
    );
    await Promise.race([client.connect(), timeoutPromise]);
  } catch (err) {
    console.warn('⚠️  No se pudo conectar a Redis:', err.message);
    console.warn('   El sistema continuará SIN cache y con WebSocket local.');
    try { await client.disconnect(); } catch {}
    client = null;
    ready = false;
    return null;
  }

  return client;
};

export const getRedis = () => (ready ? client : null);

export const isRedisReady = () => ready;

export const closeRedis = async () => {
  if (client) {
    try {
      await client.quit();
    } catch {
      /* el cliente ya estaba cerrado */
    }
    client = null;
    ready = false;
  }
};
