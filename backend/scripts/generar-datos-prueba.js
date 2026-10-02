/**
 * Datos para ensayar la jornada electoral (prueba de carga).
 *
 * Sobre las mesas que todavia NO tienen personero crea:
 *   - un personero por mesa (hasta la cantidad pedida),
 *   - coordinadores para cada local con alguna de esas mesas (uno cada 12
 *     mesas, variable MESAS_POR_COORDINADOR),
 *   - varios administradores de prueba, que haran de "tablero en vivo".
 *
 * Todos comparten la clave de PRUEBA_PASSWORD (obligatoria, 12+ caracteres) y
 * llevan el apellido "PRUEBA CARGA" para poder borrarlos. Si se indica
 * PRUEBA_SALIDA, escribe ahi un JSON con los DNI que usa el escenario de k6.
 *
 * Uso:
 *   PRUEBA_PASSWORD=... node scripts/generar-datos-prueba.js [cantidad] [admins]
 *   node scripts/generar-datos-prueba.js --limpiar
 *
 * Se niega a correr si ya hay actas de personeros reales: es para ensayar
 * ANTES de la jornada, nunca durante.
 */
import 'dotenv/config';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import db from '../src/config/database.js';

const MARCA = 'PRUEBA CARGA';
// Rangos altos para no chocar con DNI reales; si alguno ya existe se salta.
const BASE_DNI = { personero: 99000000, coordinador: 99100000, admin: 99200000 };

const log = (...a) => console.log(...a);

const limpiar = async ({ silencioso = false } = {}) => {
  const resumen = await db.transaction(async (trx) => {
    const ids = await trx('usuarios').where({ apellidos: MARCA }).pluck('id');
    if (!ids.length) return { usuarios: 0, actas: 0 };

    const actas = await trx('resultados_mesa')
      .whereIn('personero_id', ids)
      .select('id', 'mesa_id', 'tipo_eleccion');

    if (actas.length) {
      const idsActas = actas.map((a) => a.id);
      await trx('detalle_resultados').whereIn('resultado_id', idsActas).del();
      await trx('resultados_mesa').whereIn('id', idsActas).del();
      const mesasProv = [...new Set(actas.filter((a) => a.tipo_eleccion !== 'distrital').map((a) => a.mesa_id))];
      const mesasDist = [...new Set(actas.filter((a) => a.tipo_eleccion === 'distrital').map((a) => a.mesa_id))];
      if (mesasProv.length) {
        await trx('mesas_sufragio').whereIn('id', mesasProv).update({ estado: 'pendiente', updated_at: trx.fn.now() });
      }
      if (mesasDist.length) {
        await trx('mesas_sufragio').whereIn('id', mesasDist).update({ estado_distrital: 'pendiente', updated_at: trx.fn.now() });
      }
    }
    // Actas de otros que un coordinador de prueba haya verificado (no deberia
    // haberlas: la generacion se niega si hay actas reales).
    await trx('resultados_mesa').whereIn('verificado_por', ids).update({ verificado_por: null });
    await trx('auditoria').whereIn('usuario_id', ids).del();
    await trx('asignacion_personeros').whereIn('usuario_id', ids).del();
    await trx('asignacion_coordinadores').whereIn('usuario_id', ids).del();
    await trx('usuarios').whereIn('id', ids).del();
    return { usuarios: ids.length, actas: actas.length };
  });
  if (!silencioso) {
    log(resumen.usuarios
      ? `Eliminados ${resumen.usuarios} usuarios de prueba y ${resumen.actas} actas de prueba.`
      : 'No hay usuarios de prueba que borrar.');
  }
  return resumen;
};

const generadorDni = (base, ocupados) => {
  let n = base;
  return () => {
    do { n += 1; } while (ocupados.has(String(n)));
    ocupados.add(String(n));
    return String(n);
  };
};

const insertarUsuarios = async (trx, filas) => {
  if (!filas.length) return new Map();
  const creados = await trx('usuarios').insert(filas).returning(['id', 'dni']);
  return new Map(creados.map((u) => [u.dni, u.id]));
};

const generar = async (cantidad, cantidadAdmins) => {
  if (process.env.NODE_ENV === 'production' && !process.env.PERMITIR_DATOS_PRUEBA) {
    throw new Error('Bloqueado: NODE_ENV=production. En un ensayo, ejecute con PERMITIR_DATOS_PRUEBA=1');
  }
  const clave = process.env.PRUEBA_PASSWORD || '';
  if (clave.length < 12) {
    throw new Error('Falta PRUEBA_PASSWORD (12 caracteres o mas): es la clave de los usuarios de prueba.');
  }

  const reales = await db('resultados_mesa as rm')
    .join('usuarios as u', 'u.id', 'rm.personero_id')
    .whereNot('u.apellidos', MARCA)
    .count('rm.id as c')
    .first();
  if (Number(reales?.c || 0) > 0) {
    throw new Error(`Ya hay ${reales.c} actas de personeros reales. La prueba de carga es para antes de la jornada.`);
  }

  // Idempotente: si quedo una preparacion anterior, se reemplaza.
  const previo = await limpiar({ silencioso: true });
  if (previo.usuarios) log(`Se borraron ${previo.usuarios} usuarios de una preparacion anterior.`);

  // Mesas sin NINGUNA fila de asignacion (mesa_id es UNIQUE aunque este inactiva),
  // ordenadas por local para que un subconjunto cubra locales completos.
  const mesas = await db('mesas_sufragio as m')
    .join('locales_votacion as l', 'l.id', 'm.local_id')
    .join('distritos as d', 'd.id', 'l.distrito_id')
    .leftJoin('asignacion_personeros as ap', 'ap.mesa_id', 'm.id')
    .whereNull('ap.id')
    .select('m.id', 'm.local_id', 'd.tiene_eleccion_distrital')
    .orderBy([{ column: 'm.local_id' }, { column: 'm.numero_mesa' }])
    .limit(cantidad);

  if (!mesas.length) {
    throw new Error('No hay mesas sin personero. Haga la prueba antes de cargar el Excel de personeros.');
  }

  log(`Preparando ${mesas.length} personeros, sus coordinadores y ${cantidadAdmins} administradores de prueba...`);
  const hash = await bcrypt.hash(clave, 10);
  const ocupados = new Set(await db('usuarios').pluck('dni'));
  const dniPersonero = generadorDni(BASE_DNI.personero, ocupados);
  const dniCoordinador = generadorDni(BASE_DNI.coordinador, ocupados);
  const dniAdmin = generadorDni(BASE_DNI.admin, ocupados);
  const usuario = (dni, nombres, rol) => ({
    dni, nombres, apellidos: MARCA, password_hash: hash, rol, activo: true,
  });

  // Un coordinador cada MESAS_POR_COORDINADOR mesas del local (minimo uno):
  // un local de 48 mesas no lo revisa una sola persona.
  const mesasPorCoordinador = Math.max(Number(process.env.MESAS_POR_COORDINADOR) || 12, 1);
  const mesasPorLocal = new Map();
  mesas.forEach((m) => mesasPorLocal.set(m.local_id, (mesasPorLocal.get(m.local_id) || 0) + 1));
  const personeros = mesas.map((m, i) => ({ ...usuario(dniPersonero(), `Personero ${i + 1}`, 'personero'), mesa: m }));
  const coordinadores = [];
  for (const [localId, total] of mesasPorLocal) {
    for (let k = 0; k < Math.ceil(total / mesasPorCoordinador); k += 1) {
      coordinadores.push({
        ...usuario(dniCoordinador(), `Coordinador ${coordinadores.length + 1}`, 'coordinador'), localId,
      });
    }
  }
  const admins = Array.from({ length: cantidadAdmins }, (_, k) => usuario(dniAdmin(), `Tablero ${k + 1}`, 'admin'));

  const sinExtras = ({ mesa, localId, ...fila }) => fila;

  await db.transaction(async (trx) => {
    const idsP = await insertarUsuarios(trx, personeros.map(sinExtras));
    await trx.batchInsert('asignacion_personeros', personeros.map((p) => ({
      usuario_id: idsP.get(p.dni), mesa_id: p.mesa.id, activo: true,
    })), 500);

    const idsC = await insertarUsuarios(trx, coordinadores.map(sinExtras));
    await trx.batchInsert('asignacion_coordinadores', coordinadores.map((c) => ({
      usuario_id: idsC.get(c.dni), local_id: c.localId, activo: true,
    })), 500);

    await insertarUsuarios(trx, admins);
  });

  const conDistrital = personeros.filter((p) => p.mesa.tiene_eleccion_distrital).length;
  const datos = {
    version: 1,
    generado: new Date().toISOString(),
    personeros: personeros.map((p) => ({ dni: p.dni, local: p.mesa.local_id, distrital: Boolean(p.mesa.tiene_eleccion_distrital) })),
    coordinadores: coordinadores.map((c) => ({ dni: c.dni, local: c.localId })),
    admins: admins.map((a) => a.dni),
  };
  if (process.env.PRUEBA_SALIDA) {
    fs.writeFileSync(process.env.PRUEBA_SALIDA, JSON.stringify(datos));
    log(`Datos para k6 escritos en ${process.env.PRUEBA_SALIDA}`);
  }

  log(`Listo: ${personeros.length} personeros (${conDistrital} tambien con acta distrital), `
    + `${coordinadores.length} coordinadores y ${admins.length} administradores de prueba.`);
  // Linea para los scripts de AWS (no cambiar el formato).
  log(`RESUMEN_PRUEBA personeros=${personeros.length} coordinadores=${coordinadores.length} `
    + `admins=${admins.length} actas_distritales=${conDistrital}`);
};

const main = async () => {
  const arg = process.argv[2];
  if (arg === '--limpiar') {
    await limpiar();
  } else {
    const cantidad = Number(arg) || 10000;
    const admins = Math.min(Math.max(Number(process.argv[3]) || 5, 1), 20);
    await generar(cantidad, admins);
  }
  await db.destroy();
};

main().catch(async (err) => {
  console.error('Error:', err.message);
  await db.destroy().catch(() => {});
  process.exit(1);
});
