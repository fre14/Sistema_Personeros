import { getRedis } from '../config/redis.js';

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
  } catch {}
};

export const cacheWrap = async (key, ttl, fn) => {
  const hit = await cacheGet(key);
  if (hit !== null) return hit;
  const value = await fn();
  await cacheSet(key, value, ttl);
  return value;
};

// Tope de seguridad: con COUNT 200 alcanza para 200 000 claves, muy por encima
// de lo que guarda el tablero. Si algo raro pasa, el recorrido termina igual.
const MAX_VUELTAS_SCAN = 1000;

export const invalidateDashboard = async () => {
  const redis = getRedis();
  if (!redis) return;
  try {
    // node-redis 4 devuelve el cursor de SCAN como NUMERO (0) y la version 5
    // como texto ('0'). Comparar contra '0' dejaba este bucle girando para
    // siempre con la version 4: cada acta subida o verificada quedaba colgada
    // y Redis recibia miles de SCAN por segundo. Se normaliza a numero.
    let cursor = 0;
    let vueltas = 0;
    do {
      const res = await redis.scan(String(cursor), { MATCH: `${PREFIX}dashboard:*`, COUNT: 200 });
      cursor = Number(res?.cursor);
      const claves = res?.keys || [];
      if (claves.length) await redis.del(claves);
      vueltas += 1;
    } while (Number.isFinite(cursor) && cursor !== 0 && vueltas < MAX_VUELTAS_SCAN);
  } catch {}
};
