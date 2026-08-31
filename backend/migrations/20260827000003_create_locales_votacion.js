/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('locales_votacion', (table) => {
    table.increments('id').primary();
    table.string('nombre', 200).notNullable();
    table.string('direccion', 300).nullable();
    table.integer('distrito_id').references('id').inTable('distritos').notNullable();
    table.integer('total_mesas').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('locales_votacion');
};
