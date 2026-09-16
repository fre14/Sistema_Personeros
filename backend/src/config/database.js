import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const environment = process.env.NODE_ENV || 'development';

const isRemote = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost');

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') ? { rejectUnauthorized: false } : false,
    };

const db = knex({
  client: 'pg',
  connection: connectionConfig,
  pool: { min: 2, max: 20 },
});

export default db;
