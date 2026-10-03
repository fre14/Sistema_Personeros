/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  await knex.schema.alterTable('historial_asignaciones', (table) => {
    table.integer('usuario_nuevo_id').nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  await knex.schema.alterTable('historial_asignaciones', (table) => {
    table.integer('usuario_nuevo_id').notNullable().alter();
  });
};
