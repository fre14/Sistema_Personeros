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
  } catch {}
};
