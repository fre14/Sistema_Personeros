/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('detalle_resultados', (table) => {
    table.increments('id').primary();
    table.integer('resultado_id').references('id').inTable('resultados_mesa').onDelete('CASCADE').notNullable();
    table.integer('candidato_id').references('id').inTable('candidatos').notNullable();
    table.integer('votos').defaultTo(0);
    table.unique(['resultado_id', 'candidato_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('detalle_resultados');
};
