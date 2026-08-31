/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  const distritos = [
    { nombre: 'Ayacucho', codigo: 'AYA' },
    { nombre: 'Acocro', codigo: 'ACO' },
    { nombre: 'Acos Vinchos', codigo: 'ACV' },
    { nombre: 'Carmen Alto', codigo: 'CAL' },
    { nombre: 'Chiara', codigo: 'CHI' },
    { nombre: 'Jesús Nazareno', codigo: 'JNA' },
    { nombre: 'Ocros', codigo: 'OCR' },
    { nombre: 'Pacaycasa', codigo: 'PAC' },
    { nombre: 'Quinua', codigo: 'QUI' },
    { nombre: 'San José de Ticllas', codigo: 'SJT' },
    { nombre: 'San Juan Bautista', codigo: 'SJB' },
    { nombre: 'Santiago de Pischa', codigo: 'SDP' },
    { nombre: 'Socos', codigo: 'SOC' },
    { nombre: 'Tambillo', codigo: 'TAM' },
    { nombre: 'Vinchos', codigo: 'VIN' },
    { nombre: 'Andrés Avelino Cáceres Dorregaray', codigo: 'AAC' }
  ];
  
  // Use ON CONFLICT DO NOTHING based on 'codigo'
  await knex('distritos')
    .insert(distritos)
    .onConflict('codigo')
    .ignore();
};
