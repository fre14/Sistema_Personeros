/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('asignacion_personeros', (table) => {
    table.increments('id').primary();
    table.integer('usuario_id').references('id').inTable('usuarios').notNullable();
    table.integer('mesa_id').references('id').inTable('mesas_sufragio').notNullable().unique();
    table.boolean('activo').defaultTo(true);
    table.timestamp('asignado_en').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('asignacion_personeros');
};
