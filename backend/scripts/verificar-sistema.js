/**
 * Comprobacion del backend contra la base de datos real.
 * Uso:  npm run verificar
 *
 * Revisa que el esquema, los indices y los datos minimos esten en su sitio
 * ANTES del dia de la eleccion, en vez de descubrirlo en plena jornada.
 */
import 'dotenv/config';
import db from '../src/config/database.js';
import { initRedis, isRedisReady, closeRedis } from '../src/config/redis.js';

const verde = (t) => console.log(`\x1b[32m  OK  \x1b[0m ${t}`);
const rojo = (t) => console.log(`\x1b[31m FALLA\x1b[0m ${t}`);
const aviso = (t) => console.log(`\x1b[33m AVISO\x1b[0m ${t}`);

let fallas = 0;

const TABLAS = [
  'distritos', 'usuarios', 'locales_votacion', 'mesas_sufragio', 'candidatos',
  'asignacion_coordinadores', 'asignacion_personeros', 'historial_asignaciones',
  'resultados_mesa', 'detalle_resultados', 'auditoria',
];

const main = async () => {
  console.log('==========================================================');
  console.log(' Verificacion del backend');
  console.log('==========================================================\n');

  // ── Conexion ──
  try {
    await db.raw('select 1');
    verde('Conexion a PostgreSQL');
  } catch (err) {
    rojo(`No se pudo conectar a PostgreSQL: ${err.message}`);
    process.exit(1);
  }

  // ── Tablas ──
  console.log('\n-- Esquema --');
  for (const tabla of TABLAS) {
    const existe = await db.schema.hasTable(tabla);
    if (existe) verde(`tabla ${tabla}`);
    else { rojo(`falta la tabla ${tabla} (ejecute: npm run migrate)`); fallas++; }
  }

  // ── Indices ──
  console.log('\n-- Indices de rendimiento --');
  const { rows } = await db.raw(
    "select indexname from pg_indexes where schemaname='public' and indexname like 'idx_%'"
  );
  if (rows.length >= 15) verde(`${rows.length} indices presentes`);
  else { rojo(`solo ${rows.length} indices (esperados 20+). Ejecute: npm run migrate`); fallas++; }

  // ── Datos minimos ──
  console.log('\n-- Datos --');
  const conteos = {};
  for (const t of ['distritos', 'locales_votacion', 'mesas_sufragio', 'candidatos', 'usuarios']) {
    const r = await db(t).count('* as c').first();
    conteos[t] = Number(r.c);
  }
  Object.entries(conteos).forEach(([t, c]) => {
    if (c > 0) verde(`${t}: ${c} registros`);
    else aviso(`${t}: vacio`);
  });

  const admin = await db('usuarios').where({ rol: 'admin', activo: true }).first();
  if (admin) verde(`administrador activo (DNI ${admin.dni})`);
  else { rojo('no hay ningun administrador activo (ejecute: npm run seed)'); fallas++; }

  const mesasSinPersonero = await db('mesas_sufragio as m')
    .leftJoin('asignacion_personeros as ap', function () {
      this.on('ap.mesa_id', '=', 'm.id').andOn('ap.activo', '=', db.raw('true'));
    })
    .whereNull('ap.id')
    .count('m.id as c')
    .first();
  const sinAsignar = Number(mesasSinPersonero.c);
  if (sinAsignar === 0) verde('todas las mesas tienen personero asignado');
  else aviso(`${sinAsignar} mesas sin personero asignado`);

  // ── Consultas del dashboard (las que antes fallaban) ──
  console.log('\n-- Consultas criticas --');
  const pruebas = [
    ['resumen del dashboard', () => db('mesas_sufragio').select('estado').count('id as c').groupBy('estado')],
    ['resultados por candidato', () => db('detalle_resultados as dr')
      .join('resultados_mesa as rm', 'dr.resultado_id', 'rm.id')
      .join('candidatos as c', 'dr.candidato_id', 'c.id')
      .select('c.id').sum('dr.votos as v').groupBy('c.id').limit(5)],
    ['resultados por distrito', () => db('distritos as d')
      .leftJoin('locales_votacion as l', 'l.distrito_id', 'd.id')
      .leftJoin('mesas_sufragio as m', 'm.local_id', 'l.id')
      .select('d.id').count('m.id as c').groupBy('d.id').limit(5)],
    ['auditoria paginada', () => db('auditoria').orderBy('fecha', 'desc').limit(5)],
  ];
  for (const [nombre, fn] of pruebas) {
    try {
      await fn();
      verde(nombre);
    } catch (err) {
      rojo(`${nombre}: ${err.message}`);
      fallas++;
    }
  }

  // ── Redis ──
  console.log('\n-- Redis --');
  await initRedis();
  if (isRedisReady()) verde('Redis conectado (cache y WebSocket multi-instancia activos)');
  else aviso('Redis no disponible: el sistema funcionara en modo degradado');

  // ── Configuracion ──
  console.log('\n-- Configuracion --');
  const secretos = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const s of secretos) {
    const v = process.env[s] || '';
    if (!v || v.includes('CAMBIAR') || v.length < 32) {
      rojo(`${s} inseguro o sin definir (use: openssl rand -base64 48)`);
      fallas++;
    } else verde(`${s} definido`);
  }
  if ((process.env.CORS_ORIGIN || '').includes('localhost') && process.env.NODE_ENV === 'production') {
    aviso('CORS_ORIGIN apunta a localhost en produccion');
  }

  console.log('\n==========================================================');
  if (fallas === 0) console.log('\x1b[32m Sistema listo para la jornada.\x1b[0m');
  else console.log(`\x1b[31m ${fallas} problema(s) encontrados. Revise arriba.\x1b[0m`);
  console.log('==========================================================');

  await closeRedis();
  await db.destroy();
  process.exit(fallas === 0 ? 0 : 1);
};

main().catch(async (err) => {
  console.error('Error inesperado:', err);
  await closeRedis();
  await db.destroy();
  process.exit(1);
});
