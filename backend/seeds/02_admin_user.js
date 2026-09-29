import bcrypt from 'bcryptjs';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Las claves locales de ejemplo estan publicadas en el repositorio. En AWS
  // (sistema expuesto a internet) todas las cuentas admin reciben la clave
  // generada al desplegar via SEED_ADMINS_PASSWORD; cada admin la cambia luego.
  const claveAdmins = process.env.SEED_ADMINS_PASSWORD;
  const hashGabriela = await bcrypt.hash(claveAdmins || '123456', 12);
  const hashFredy = await bcrypt.hash(claveAdmins || '15143104', 12);
  // En AWS la clave del superadministrador (DNI 00000000) se genera al
  // desplegar y llega por SEED_SUPERADMIN_PASSWORD. 'admin123' solo en local.
  const hashSuperAdmin = await bcrypt.hash(process.env.SEED_SUPERADMIN_PASSWORD || 'admin123', 12);
  
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
    // No se pisa password_hash: volver a correr los seeds ya no resetea las
    // claves que los administradores cambiaron.
    .merge(['nombres', 'apellidos', 'rol', 'activo']);
};
