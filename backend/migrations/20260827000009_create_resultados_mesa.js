/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('resultados_mesa', (table) => {
    table.increments('id').primary();
    table.integer('mesa_id').references('id').inTable('mesas_sufragio').notNullable();
    table.integer('personero_id').references('id').inTable('usuarios').notNullable();
    table.string('foto_acta_url', 500).nullable();
    table.integer('votos_blanco').defaultTo(0);
    table.integer('votos_nulo').defaultTo(0);
    table.integer('votos_impugnados').defaultTo(0);
    table.integer('total_votos_emitidos').defaultTo(0);
    table.integer('total_cedulas_votacion').defaultTo(0);
    table.enum('estado', ['pendiente', 'verificado', 'observado']).defaultTo('pendiente');
    table.text('observaciones_personero').nullable();
    table.text('observaciones_coordinador').nullable();
    table.integer('verificado_por').references('id').inTable('usuarios').nullable();
    table.timestamp('verificado_en').nullable();
    table.integer('version').defaultTo(1);
    table.timestamp('subido_en').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('resultados_mesa');
};
