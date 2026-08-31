/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('asignacion_coordinadores', (table) => {
    table.increments('id').primary();
    table.integer('usuario_id').references('id').inTable('usuarios').notNullable();
    table.integer('local_id').references('id').inTable('locales_votacion').notNullable();
    table.boolean('activo').defaultTo(true);
    table.timestamp('asignado_en').defaultTo(knex.fn.now());
    table.unique(['usuario_id', 'local_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('asignacion_coordinadores');
};
