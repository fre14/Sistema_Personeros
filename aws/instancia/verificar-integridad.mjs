// Revisa que las actas guardadas sean coherentes. Sirve despues de una prueba
// de carga y tambien la noche de la eleccion, antes de publicar resultados.
// Uso (desde comun.sh): correr_node verificar-integridad.mjs
// Termina con codigo 1 si encuentra algun problema.
import db from '../../backend/src/config/database.js';

const CHEQUEOS = [
  {
    nombre: 'Mesas con dos actas del mismo tipo (votos contados dos veces)',
    sql: `SELECT COUNT(*)::int AS n FROM (
            SELECT mesa_id, tipo_eleccion FROM resultados_mesa
            GROUP BY mesa_id, tipo_eleccion HAVING COUNT(*) > 1) x`,
  },
  {
    nombre: 'Actas sin el detalle de votos por candidato',
    sql: `SELECT COUNT(*)::int AS n FROM resultados_mesa rm
          WHERE NOT EXISTS (SELECT 1 FROM detalle_resultados d WHERE d.resultado_id = rm.id)`,
  },
  {
    nombre: 'Actas cuya suma no cuadra (candidatos + blancos + nulos + impugnados)',
    sql: `SELECT COUNT(*)::int AS n FROM resultados_mesa rm
          WHERE rm.total_votos_emitidos <> rm.votos_blanco + rm.votos_nulo + COALESCE(rm.votos_impugnados, 0)
            + (SELECT COALESCE(SUM(d.votos), 0) FROM detalle_resultados d WHERE d.resultado_id = rm.id)`,
  },
  {
    nombre: 'Actas con mas votos que electores habiles',
    sql: `SELECT COUNT(*)::int AS n FROM resultados_mesa rm JOIN mesas_sufragio m ON m.id = rm.mesa_id
          WHERE m.total_electores_habiles > 0 AND rm.total_votos_emitidos > m.total_electores_habiles`,
  },
  {
    nombre: 'Actas sin foto',
    sql: `SELECT COUNT(*)::int AS n FROM resultados_mesa WHERE foto_acta_url IS NULL OR foto_acta_url = ''`,
  },
  {
    nombre: 'Mesas cuyo estado no coincide con el de su acta',
    sql: `SELECT COUNT(*)::int AS n FROM resultados_mesa rm JOIN mesas_sufragio m ON m.id = rm.mesa_id
          WHERE (CASE rm.estado WHEN 'verificado' THEN 'verificada' WHEN 'observado' THEN 'observada'
                                ELSE 'reportada' END)
             <> (CASE WHEN rm.tipo_eleccion = 'distrital' THEN m.estado_distrital ELSE m.estado END)`,
  },
];

let problemas = 0;
try {
  console.log('Revision de integridad de las actas');
  for (const c of CHEQUEOS) {
    const { rows } = await db.raw(c.sql);
    const n = rows[0]?.n ?? 0;
    if (n > 0) problemas += 1;
    console.log(`  ${n === 0 ? 'OK      ' : 'PROBLEMA'}  ${c.nombre}: ${n}`);
  }

  const { rows: resumen } = await db.raw(`
    SELECT COALESCE(tipo_eleccion, 'provincial') AS tipo, estado,
           COUNT(*)::int AS actas, COALESCE(SUM(total_votos_emitidos), 0)::int AS votos
    FROM resultados_mesa GROUP BY 1, 2 ORDER BY 1, 2`);
  console.log('\n  Actas guardadas por tipo y estado:');
  if (!resumen.length) console.log('    (ninguna)');
  resumen.forEach((r) => {
    console.log(`    ${r.tipo.padEnd(10)} ${r.estado.padEnd(11)} ${String(r.actas).padStart(5)} actas  ${String(r.votos).padStart(8)} votos emitidos`);
  });

  console.log(problemas === 0
    ? '\nINTEGRIDAD_OK: ninguna inconsistencia en la base de datos.'
    : `\nINTEGRIDAD_CON_PROBLEMAS: ${problemas} tipo(s) de inconsistencia. Revisar antes de publicar.`);
  process.exitCode = problemas === 0 ? 0 : 1;
} catch (err) {
  console.error('Error revisando la integridad:', err.message);
  process.exitCode = 2;
} finally {
  await db.destroy();
}
