import db from './src/config/database.js';

async function main() {
  try {
    const count = await db('candidatos').count('* as c').first();
    if (parseInt(count.c) === 0) {
      console.log('Sembrando candidatos para Huamanga 2026...');
      await db('candidatos').insert([
        {
          nombre_completo: 'Wilfredo Oscorima Núñez',
          organizacion_politica: 'Movimiento Regional Wari Llaqta',
          siglas: 'WARI',
          numero_lista: 1,
          activo: true
        },
        {
          nombre_completo: 'Yuri Alberto Gutiérrez Gutiérrez',
          organizacion_politica: 'Gana Ayacucho',
          siglas: 'GANA',
          numero_lista: 2,
          activo: true
        },
        {
          nombre_completo: 'Richard Prado Ramos',
          organizacion_politica: 'Movimiento Regional Agua',
          siglas: 'AGUA',
          numero_lista: 3,
          activo: true
        },
        {
          nombre_completo: 'Esperanza Rojas Gutiérrez',
          organizacion_politica: 'Movimiento Independiente Innovación Regional',
          siglas: 'MIRE',
          numero_lista: 4,
          activo: true
        },
        {
          nombre_completo: 'Carlos Rúa Carbajal',
          organizacion_politica: 'Alianza Para el Progreso',
          siglas: 'APP',
          numero_lista: 5,
          activo: true
        }
      ]);
      console.log('✅ 5 candidatos registrados exitosamente.');
    } else {
      console.log(`Ya existen ${count.c} candidatos en la BD.`);
    }
  } catch (err) {
    console.error('Error insertando candidatos:', err.message);
  } finally {
    await db.destroy();
  }
}

main();
