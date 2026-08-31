/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('mesas_sufragio', (table) => {
    table.increments('id').primary();
    table.string('numero_mesa', 10).unique().notNullable();
    table.integer('local_id').references('id').inTable('locales_votacion').notNullable();
    table.integer('total_electores_habiles').defaultTo(0);
    table.enum('estado', ['pendiente', 'reportada', 'verificada', 'observada']).defaultTo('pendiente');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('mesas_sufragio');
};
