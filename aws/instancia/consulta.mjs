// Ejecuta una consulta SQL y muestra el resultado en texto legible.
// Uso (desde comun.sh): correr_node consulta.mjs "SELECT ..."
import db from '../../backend/src/config/database.js';

const sqlTexto = process.argv[2];
if (!sqlTexto) {
  console.error('Uso: node consulta.mjs "SELECT ..."');
  process.exit(2);
}

try {
  const { rows } = await db.raw(sqlTexto);
  if (rows.length === 1) {
    for (const [clave, valor] of Object.entries(rows[0])) console.log(`  ${clave}: ${valor}`);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
} catch (err) {
  console.error('Error en la consulta:', err.message);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
