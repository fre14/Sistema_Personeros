import db from './src/config/database.js';

async function main() {
  try {
    console.log('Creando vistas o verificando...');
    await db.raw(`CREATE OR REPLACE VIEW locales AS SELECT * FROM locales_votacion;`);
    await db.raw(`CREATE OR REPLACE VIEW mesas AS SELECT * FROM mesas_sufragio;`);
    console.log('✅ Vistas "locales" y "mesas" creadas exitosamente.');

    const rLocales = await db('locales').count('* as c').first();
    const rMesas = await db('mesas').count('* as c').first();
    console.log(`- Vistas operativas: locales=${rLocales.c}, mesas=${rMesas.c}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.destroy();
  }
}

main();
