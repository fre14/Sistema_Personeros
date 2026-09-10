import bcrypt from 'bcryptjs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  const hashGabriela = await bcrypt.hash('123456', 12);
  const hashFredy = await bcrypt.hash('15143104', 12);
  const hashSuperAdmin = await bcrypt.hash('admin123', 12);
  
  await knex('usuarios')
    .insert([
      {
        dni: '73884790',
        nombres: 'Gabriela Ana',
        apellidos: 'Rodrigo Cutipa',
        password_hash: hashGabriela,
        rol: 'admin',
        activo: true
      },
      {
        dni: '74725178',
        nombres: 'Fredy Arturo',
        apellidos: 'Bonilla Rey',
        password_hash: hashFredy,
        rol: 'admin',
        activo: true
      },
      {
        dni: '00000000',
        nombres: 'Administrador',
        apellidos: 'Sistema',
        password_hash: hashSuperAdmin,
        rol: 'admin',
        activo: true
      }
    ])
    .onConflict('dni')
    .merge();
};
