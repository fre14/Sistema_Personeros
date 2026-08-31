/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  return knex.schema.createTable('auditoria', (table) => {
    table.bigIncrements('id').primary();
    table.string('tabla_afectada', 100).notNullable();
    table.integer('registro_id').notNullable();
    table.enum('accion', ['INSERT', 'UPDATE', 'DELETE']).notNullable();
    table.jsonb('datos_anteriores').nullable();
    table.jsonb('datos_nuevos').nullable();
    table.integer('usuario_id').references('id').inTable('usuarios').nullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.float('latitud').nullable();
    table.float('longitud').nullable();
    table.timestamp('fecha').defaultTo(knex.fn.now());
    
    table.index('tabla_afectada');
    table.index('fecha');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  return knex.schema.dropTable('auditoria');
};
