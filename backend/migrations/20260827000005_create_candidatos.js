/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('candidatos', (table) => {
    table.increments('id').primary();
    table.string('nombre_completo', 200).notNullable();
    table.string('organizacion_politica', 200).notNullable();
    table.string('siglas', 20).nullable();
    table.string('logo_url', 500).nullable();
    table.integer('numero_lista').notNullable();
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('candidatos');
};
