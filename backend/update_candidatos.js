import db from './src/config/database.js';

const candidatesList = [
  {
    numero_lista: 1,
    nombre_completo: 'Hernan Garagondo',
    organizacion_politica: 'Ahora Nación',
    siglas: 'AN',
    activo: true
  },
  {
    numero_lista: 2,
    nombre_completo: 'Alfredo Caceres',
    organizacion_politica: 'Frente de la Esperanza',
    siglas: 'FE',
    activo: true
  },
  {
    numero_lista: 3,
    nombre_completo: 'Carlos Herencia',
    organizacion_politica: 'Libertad Popular',
    siglas: 'LP',
    activo: true
  },
  {
    numero_lista: 4,
    nombre_completo: 'Edwin Flores',
    organizacion_politica: 'Perú Primero',
    siglas: 'PP1',
    activo: true
  },
  {
    numero_lista: 5,
    nombre_completo: 'Javier Martinez',
    organizacion_politica: 'Frepap',
    siglas: 'Frepap',
    activo: true
  },
  {
    numero_lista: 6,
    nombre_completo: 'Richard Prado',
    organizacion_politica: 'Podemos Perú',
    siglas: 'PP',
    activo: true
  },
  {
    numero_lista: 7,
    nombre_completo: 'Ruben Loayza',
    organizacion_politica: 'Batalla Perú',
    siglas: 'BP',
    activo: true
  },
  {
    numero_lista: 8,
    nombre_completo: 'Yuri Oscorima',
    organizacion_politica: 'Alianza para el Progreso',
    siglas: 'A',
    activo: true
  },
  {
    numero_lista: 9,
    nombre_completo: 'Silver Palomino',
    organizacion_politica: 'Somos Perú',
    siglas: 'SP',
    activo: true
  }
];

async function updateCandidatos() {
  try {
    console.log('Actualizando candidatos oficiales...');
    // Eliminar candidatos anteriores o reiniciar
    await db('detalle_resultados').del();
    await db('candidatos').del();

    for (const c of candidatesList) {
      await db('candidatos').insert(c);
      console.log(`+ Lista ${c.numero_lista}: ${c.nombre_completo} (${c.organizacion_politica} - ${c.siglas})`);
    }

    const total = await db('candidatos').count('* as count').first();
    console.log(`\n✅ ${total.count} candidatos oficiales registrados en la base de datos con éxito.`);
  } catch (err) {
    console.error('Error actualizando candidatos:', err.message);
  } finally {
    await db.destroy();
  }
}

updateCandidatos();
