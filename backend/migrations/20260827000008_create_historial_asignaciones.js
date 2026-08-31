/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('historial_asignaciones', (table) => {
    table.increments('id').primary();
    table.enum('tipo', ['coordinador', 'personero']).notNullable();
    table.integer('usuario_anterior_id').references('id').inTable('usuarios').nullable();
    table.integer('usuario_nuevo_id').references('id').inTable('usuarios').notNullable();
    table.integer('mesa_id').references('id').inTable('mesas_sufragio').nullable();
    table.integer('local_id').references('id').inTable('locales_votacion').nullable();
    table.text('motivo_cambio').nullable();
    table.integer('cambiado_por').references('id').inTable('usuarios').notNullable();
    table.timestamp('fecha_cambio').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('historial_asignaciones');
};
