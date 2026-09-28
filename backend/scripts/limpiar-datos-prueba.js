/**
 * Limpieza completa de datos de prueba.
 *
 * Deja la BD con SOLO: distritos, locales, mesas, candidatos y los 3 admins
 * oficiales (Gabriela, Fredy, Administrador Sistema).
 *
 * Uso:   node scripts/limpiar-datos-prueba.js
 *
 * SEGURO: pide confirmacion interactiva antes de borrar.
 */
import 'dotenv/config';
import db from '../src/config/database.js';
import readline from 'readline';

const DNI_ADMINS_OFICIALES = ['73884790', '74725178', '00000000'];

const preguntar = (texto) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(texto, (resp) => { rl.close(); resolve(resp.trim().toLowerCase()); });
});

const main = async () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  LIMPIEZA COMPLETA DE DATOS DE PRUEBA               ║');
  console.log('║  Esto eliminara TODOS los datos excepto:             ║');
  console.log('║  - Distritos, Locales, Mesas, Candidatos            ║');
  console.log('║  - Los 3 administradores oficiales                   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Mostrar estado actual
  const conteos = {};
  for (const tbl of ['usuarios', 'resultados_mesa', 'detalle_resultados',
    'asignacion_personeros', 'asignacion_coordinadores',
    'historial_asignaciones', 'auditoria']) {
    try {
      const { cnt } = await db(tbl).count('* as cnt').first();
      conteos[tbl] = Number(cnt);
      console.log(`  ${tbl}: ${cnt} registros`);
    } catch (e) {
      conteos[tbl] = 0;
      console.log(`  ${tbl}: ERROR - ${e.message}`);
    }
  }

  const admins = await db('usuarios').whereIn('dni', DNI_ADMINS_OFICIALES).select('id', 'dni', 'nombres');
  console.log(`\n  Admins oficiales encontrados: ${admins.length}/3`);
  admins.forEach((a) => console.log(`    - ${a.dni} ${a.nombres}`));

  const noAdmins = conteos.usuarios - admins.length;
  console.log(`\n  Usuarios a ELIMINAR: ${noAdmins}`);
  console.log(`  Resultados a ELIMINAR: ${conteos.resultados_mesa}`);
  console.log(`  Detalles de votos a ELIMINAR: ${conteos.detalle_resultados}`);
  console.log(`  Asignaciones personero a ELIMINAR: ${conteos.asignacion_personeros}`);
  console.log(`  Asignaciones coordinador a ELIMINAR: ${conteos.asignacion_coordinadores}`);
  console.log(`  Historial a ELIMINAR: ${conteos.historial_asignaciones}`);
  console.log(`  Auditoria a ELIMINAR: ${conteos.auditoria}`);

  const resp = await preguntar('\n¿Desea continuar con la limpieza? (si/no): ');
  if (resp !== 'si' && resp !== 'yes' && resp !== 's') {
    console.log('Operacion cancelada.');
    await db.destroy();
    return;
  }

  console.log('\nLimpiando...');

  // Orden correcto por dependencias de foreign keys
  await db('detalle_resultados').del();
  console.log('  ✓ detalle_resultados vaciada');

  await db('resultados_mesa').del();
  console.log('  ✓ resultados_mesa vaciada');

  await db('historial_asignaciones').del();
  console.log('  ✓ historial_asignaciones vaciada');

  await db('asignacion_personeros').del();
  console.log('  ✓ asignacion_personeros vaciada');

  await db('asignacion_coordinadores').del();
  console.log('  ✓ asignacion_coordinadores vaciada');

  await db('auditoria').del();
  console.log('  ✓ auditoria vaciada');

  // Eliminar usuarios que NO son los 3 admins oficiales
  const idsAdmins = admins.map((a) => a.id);
  if (idsAdmins.length > 0) {
    const eliminados = await db('usuarios').whereNotIn('id', idsAdmins).del();
    console.log(`  ✓ ${eliminados} usuarios de prueba eliminados`);
  }

  // Resetear estado de todas las mesas a pendiente
  await db('mesas_sufragio').update({ estado: 'pendiente', estado_distrital: null });
  console.log('  ✓ Todas las mesas reseteadas a pendiente');

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  LIMPIEZA COMPLETADA');
  console.log('  La BD esta lista para produccion con datos limpios.');
  console.log('══════════════════════════════════════════════════════');

  await db.destroy();
};

main().catch(async (err) => {
  console.error('Error:', err.message);
  await db.destroy();
  process.exit(1);
});
