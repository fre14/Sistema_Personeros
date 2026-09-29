/**
 * Seed: candidatos provinciales (alcaldia de Huamanga 2026).
 *
 * Misma lista que seed_candidatos.js. Aquel script solo sembraba si la tabla
 * estaba vacia, pero la migracion de candidatos distritales ya la llena, asi
 * que en una base nueva los provinciales nunca se creaban. Este seed solo
 * inserta si todavia no hay ningun candidato provincial: no toca datos
 * cargados o corregidos por el administrador.
 *
 * @param { import("knex").Knex } knex
 */
const CANDIDATOS_PROVINCIALES = [
  { numero_lista: 1, nombre_completo: 'Hernan Garagondo', organizacion_politica: 'Ahora Nación', siglas: 'AN' },
  { numero_lista: 2, nombre_completo: 'Alfredo Caceres', organizacion_politica: 'Frente de la Esperanza', siglas: 'FE' },
  { numero_lista: 3, nombre_completo: 'Carlos Herencia', organizacion_politica: 'Libertad Popular', siglas: 'LP' },
  { numero_lista: 4, nombre_completo: 'Edwin Flores', organizacion_politica: 'Perú Primero', siglas: 'PP1' },
  { numero_lista: 5, nombre_completo: 'Javier Martinez', organizacion_politica: 'Frepap', siglas: 'Frepap' },
  { numero_lista: 6, nombre_completo: 'Richard Prado', organizacion_politica: 'Podemos Perú', siglas: 'PP' },
  { numero_lista: 7, nombre_completo: 'Ruben Loayza', organizacion_politica: 'Batalla Perú', siglas: 'BP' },
  { numero_lista: 8, nombre_completo: 'Yuri Oscorima', organizacion_politica: 'Alianza para el Progreso', siglas: 'A' },
  { numero_lista: 9, nombre_completo: 'Silver Palomino', organizacion_politica: 'Somos Perú', siglas: 'SP' },
];

export const seed = async function (knex) {
  if (!(await knex.schema.hasColumn('candidatos', 'tipo_eleccion'))) {
    console.log('Falta la migracion de soporte distrital: ejecute migrate:latest antes de los seeds.');
    return;
  }
  const existentes = await knex('candidatos')
    .where({ tipo_eleccion: 'provincial' })
    .count('* as c')
    .first();
  if (Number(existentes?.c || 0) > 0) {
    console.log(`Candidatos provinciales ya cargados (${existentes.c}); no se modifican.`);
    return;
  }
  await knex('candidatos').insert(
    CANDIDATOS_PROVINCIALES.map((c) => ({ ...c, tipo_eleccion: 'provincial', activo: true })),
  );
  console.log(`✅ ${CANDIDATOS_PROVINCIALES.length} candidatos provinciales registrados.`);
};
