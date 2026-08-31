import bcrypt from 'bcryptjs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  const password_hash = await bcrypt.hash('admin123', 12);
  
  // Use ON CONFLICT DO NOTHING to make it idempotent without deleting
  await knex('usuarios')
    .insert([
      {
        dni: '00000000',
        nombres: 'Administrador',
        apellidos: 'Sistema',
        password_hash,
        rol: 'admin',
        activo: true
      }
    ])
    .onConflict('dni')
    .ignore();
};
