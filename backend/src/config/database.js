import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();

const environment = process.env.NODE_ENV || 'development';

const connectionConfig = environment === 'production'
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'sistema_electoral',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

const db = knex({
  client: 'pg',
  connection: connectionConfig,
  pool: { min: 2, max: 20 },
});

export default db;
