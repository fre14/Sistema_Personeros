import dotenv from 'dotenv';
dotenv.config();

const pool = {
  min: Number(process.env.DB_POOL_MIN || 5),
  max: Number(process.env.DB_POOL_MAX || 40),
  acquireTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
};

const connection = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'sistema_electoral',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
    };

const base = {
  client: 'pg',
  connection,
  pool,
  migrations: { directory: './migrations' },
  seeds: { directory: './seeds' },
};

export default {
  development: { ...base, pool: { min: 2, max: 10 } },
  production: base,
  test: base,
};
