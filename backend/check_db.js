import db from './src/config/database.js';

async function main() {
  try {
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('=== TABLAS EN SUPABASE ===');
    for (const row of tables.rows) {
      try {
        const countRes = await db(row.table_name).count('* as c').first();
        console.log(`- ${row.table_name}: ${countRes.c} filas`);
      } catch (e) {
        console.log(`- ${row.table_name}: error (${e.message})`);
      }
    }
  } catch (err) {
    console.error('Error conectando a BD:', err.message);
  } finally {
    await db.destroy();
  }
}

main();
