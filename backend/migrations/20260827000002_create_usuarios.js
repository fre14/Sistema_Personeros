/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('dni', 8).unique().notNullable();
    table.string('nombres', 100).notNullable();
    table.string('apellidos', 100).notNullable();
    table.string('telefono', 15).nullable();
    table.string('email', 100).nullable();
    table.string('password_hash', 255).notNullable();
    table.enum('rol', ['admin', 'coordinador', 'personero']).notNullable();
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('usuarios');
};
