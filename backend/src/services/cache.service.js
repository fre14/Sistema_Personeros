import { getRedis } from '../config/redis.js';

/**
 * Cache de lectura para consultas pesadas (dashboard, resultados agregados).
 *
 * Por qué importa: en el pico de la jornada ~100 pantallas de admin y
 * coordinadores refrescan el dashboard cada pocos segundos. Sin cache eso
 * son cientos de agregaciones por minuto sobre las mismas tablas.
 * Con 5 segundos de TTL el resultado sigue siendo "tiempo real" para el
 * usuario y la base de datos recibe una sola consulta.
 */

const PREFIX = 'cache:';
const DEFAULT_TTL = Number(process.env.CACHE_TTL_SECONDS || 5);

export const cacheGet = async (key) => {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.setEx(PREFIX + key, ttl, JSON.stringify(value));
  } catch {
    /* si el cache falla, no es un error de negocio */
  }
};

/**
 * Envuelve una consulta: devuelve el valor cacheado o ejecuta la función
 * y guarda el resultado.
 */
export const cacheWrap = async (key, ttl, fn) => {
  const hit = await cacheGet(key);
  if (hit !== null) return hit;
  const value = await fn();
  await cacheSet(key, value, ttl);
  return value;
};

/**
 * Invalida todas las claves del dashboard. Se llama cuando un resultado
 * cambia de estado, para que el siguiente refresco muestre datos nuevos.
 */
export const invalidateDashboard = async () => {
  const redis = getRedis();
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const res = await redis.scan(cursor, { MATCH: `${PREFIX}dashboard:*`, COUNT: 200 });
      cursor = res.cursor;
      if (res.keys.length) await redis.del(res.keys);
    } while (cursor !== '0');
  } catch {
    /* no bloquear la petición por un fallo de invalidación */
  }
};
