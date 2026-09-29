// Ejecuta `knex migrate:latest` dentro de un candado consultivo de PostgreSQL
// (pg_advisory_lock). Asi, si varios servidores arrancan a la vez sobre una
// base vacia, migran de a uno: se evitan los choques al crear las tablas de
// control de knex (incluida la fila duplicada en knex_migrations_lock).
// Si este proceso muere, PostgreSQL libera el candado al cerrarse la conexion.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import db from '../../backend/src/config/database.js';

const CANDADO = 7404202610; // numero arbitrario y fijo para este sistema
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend');

let conexion;
try {
  conexion = await db.client.acquireConnection();
  await conexion.query('SELECT pg_advisory_lock($1)', [CANDADO]);
  const r = spawnSync(
    process.execPath,
    ['node_modules/knex/bin/cli.js', 'migrate:latest', '--knexfile', 'knexfile.js'],
    { cwd: backend, stdio: 'inherit', env: process.env },
  );
  process.exitCode = r.status ?? 1;
} catch (err) {
  console.error('Error al migrar con candado:', err.message);
  process.exitCode = 1;
} finally {
  if (conexion) {
    try { await conexion.query('SELECT pg_advisory_unlock($1)', [CANDADO]); } catch { /* se libera al cerrar */ }
    await db.client.releaseConnection(conexion);
  }
  await db.destroy();
}
