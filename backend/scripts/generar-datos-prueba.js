/**
 * Genera personeros de prueba y los asigna a mesas, para poder correr la
 * prueba de carga de 800 usuarios contra un entorno de ensayo.
 *
 * Uso:   node scripts/generar-datos-prueba.js [cantidad]
 * Ej:    node scripts/generar-datos-prueba.js 800
 *
 * Los usuarios creados tienen DNI 10000001, 10000002, ... y su contrasena
 * es igual a su DNI. Se marcan con el apellido "PRUEBA CARGA" para poder
 * borrarlos despues con:  node scripts/generar-datos-prueba.js --limpiar
 *
 * NO EJECUTAR EN EL ENTORNO REAL DE LA ELECCION.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from '../src/config/database.js';

const MARCA = 'PRUEBA CARGA';

const limpiar = async () => {
  const ids = await db('usuarios').where({ apellidos: MARCA }).pluck('id');
  if (!ids.length) {
    console.log('No hay usuarios de prueba que borrar.');
    return;
  }
  await db('asignacion_personeros').whereIn('usuario_id', ids).del();
  await db('usuarios').whereIn('id', ids).del();
  console.log(`Eliminados ${ids.length} usuarios de prueba.`);
};

const generar = async (cantidad) => {
  if (process.env.NODE_ENV === 'production' && !process.env.PERMITIR_DATOS_PRUEBA) {
    console.error('Bloqueado: NODE_ENV=production.');
    console.error('Si esto es un entorno de ensayo, ejecute con PERMITIR_DATOS_PRUEBA=1');
    process.exit(1);
  }

  const mesas = await db('mesas_sufragio as m')
    .leftJoin('asignacion_personeros as ap', function () {
      this.on('ap.mesa_id', '=', 'm.id').andOn('ap.activo', '=', db.raw('true'));
    })
    .whereNull('ap.id')
    .select('m.id')
    .limit(cantidad);

  if (!mesas.length) {
    console.log('No hay mesas libres. Primero ejecute: npm run seed');
    return;
  }

  console.log(`Creando ${mesas.length} personeros de prueba...`);
  let creados = 0;

  for (let i = 0; i < mesas.length; i++) {
    const dni = String(10000001 + i);
    const hash = await bcrypt.hash(dni, 10);

    await db.transaction(async (trx) => {
      const existente = await trx('usuarios').where({ dni }).first();
      let usuarioId = existente?.id;

      if (!usuarioId) {
        const [fila] = await trx('usuarios').insert({
          dni,
          nombres: `Personero ${i + 1}`,
          apellidos: MARCA,
          password_hash: hash,
          rol: 'personero',
          activo: true,
        }).returning('id');
        usuarioId = fila?.id ?? fila;
      }

      const yaAsignado = await trx('asignacion_personeros')
        .where({ usuario_id: usuarioId, activo: true }).first();
      if (!yaAsignado) {
        await trx('asignacion_personeros').insert({
          usuario_id: usuarioId,
          mesa_id: mesas[i].id,
          activo: true,
        });
      }
    });

    creados++;
    if (creados % 100 === 0) console.log(`  ${creados}/${mesas.length}`);
  }

  console.log(`\nListo: ${creados} personeros de prueba creados.`);
  console.log('DNI: 10000001 en adelante. Contrasena: el mismo DNI.');
  console.log('\nAhora puede ejecutar la prueba de carga:');
  console.log('  k6 run -e BASE_URL=http://su-servidor tests/load/escenario-800-usuarios.js');
  console.log('\nPara borrarlos despues:');
  console.log('  node scripts/generar-datos-prueba.js --limpiar');
};

const main = async () => {
  const arg = process.argv[2];
  if (arg === '--limpiar') await limpiar();
  else await generar(Number(arg) || 800);
  await db.destroy();
};

main().catch(async (err) => {
  console.error('Error:', err.message);
  await db.destroy();
  process.exit(1);
});
