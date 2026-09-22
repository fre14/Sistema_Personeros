import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const usaSSL = (valor) => {
  if (String(process.env.DB_SSL || '').toLowerCase() === 'false') return false;
  if (String(process.env.DB_SSL || '').toLowerCase() === 'true') return { rejectUnauthorized: false };
  if (!valor) return false;
  const local = valor.includes('localhost') || valor.includes('127.0.0.1') ||
                valor.includes('postgres') || valor.includes('pgbouncer');
  return local ? false : { rejectUnauthorized: false };
};

const connection = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: usaSSL(process.env.DATABASE_URL),
      application_name: process.env.INSTANCE_ID || 'sistema-electoral',
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'sistema_electoral',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: usaSSL(process.env.DB_HOST),
      application_name: process.env.INSTANCE_ID || 'sistema-electoral',
    };

const db = knex({
  client: 'pg',
  connection,
  pool: {
    min: Number(process.env.DB_POOL_MIN || 5),
    max: Number(process.env.DB_POOL_MAX || 40),
    acquireTimeoutMillis: Number(process.env.DB_ACQUIRE_TIMEOUT || 10000),
    createTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    propagateCreateError: false,
  },
  acquireConnectionTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT || 10000),
});

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const pool = db.client?.pool;
    if (!pool) return;
    const enEspera = pool.numPendingAcquires?.() ?? 0;
    if (enEspera > 5) {
      console.warn(`AVISO pool saturado: ${enEspera} peticiones esperando conexion ` +
        `(usadas ${pool.numUsed?.()}, libres ${pool.numFree?.()})`);
    }
  }, 15000).unref();
}

export default db;
