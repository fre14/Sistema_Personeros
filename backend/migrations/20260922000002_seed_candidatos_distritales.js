// Los 16 distritos de Huamanga (mismos datos que seeds/01_distritos.js).
// En una base NUEVA (p. ej. RDS recien creada) las migraciones corren antes
// que los seeds: sin esto la tabla distritos esta vacia, distrito_id queda
// en NULL y la restriccion chk_candidato_distrital hace fallar la migracion.
const DISTRITOS_HUAMANGA = [
  { nombre: 'Ayacucho', codigo: 'AYA' },
  { nombre: 'Acocro', codigo: 'ACO' },
  { nombre: 'Acos Vinchos', codigo: 'ACV' },
  { nombre: 'Carmen Alto', codigo: 'CAL' },
  { nombre: 'Chiara', codigo: 'CHI' },
  { nombre: 'Jesús Nazareno', codigo: 'JNA' },
  { nombre: 'Ocros', codigo: 'OCR' },
  { nombre: 'Pacaycasa', codigo: 'PAC' },
  { nombre: 'Quinua', codigo: 'QUI' },
  { nombre: 'San José de Ticllas', codigo: 'SJT' },
  { nombre: 'San Juan Bautista', codigo: 'SJB' },
  { nombre: 'Santiago de Pischa', codigo: 'SDP' },
  { nombre: 'Socos', codigo: 'SOC' },
  { nombre: 'Tambillo', codigo: 'TAM' },
  { nombre: 'Vinchos', codigo: 'VIN' },
  { nombre: 'Andrés Avelino Cáceres Dorregaray', codigo: 'AAC' },
];

export async function up(knex) {
  await knex('distritos').insert(DISTRITOS_HUAMANGA).onConflict('codigo').ignore();
  await knex('distritos')
    .whereIn('codigo', ['SJB', 'AAC', 'CAL', 'JNA', 'TAM'])
    .update({ tiene_eleccion_distrital: true });

  const distritos = await knex('distritos')
    .whereIn('codigo', ['SJB', 'AAC', 'CAL', 'JNA', 'TAM'])
    .select('id', 'codigo', 'nombre');

  const distritoMap = {};
  for (const d of distritos) {
    distritoMap[d.codigo] = d.id;
  }

  const candidatosDistritales = [
    { distrito: 'SJB', numero_lista: 1, nombre_completo: 'Sergio Sekov Canchari Castillo', organizacion_politica: 'Ahora Nación', siglas: 'AN' },
    { distrito: 'SJB', numero_lista: 2, nombre_completo: 'Víctor Hugo Pillaca Valdez', organizacion_politica: 'Frente de la Esperanza 2021', siglas: 'FE' },
    { distrito: 'SJB', numero_lista: 3, nombre_completo: 'Carlos Alfredo Cabrera Quispe', organizacion_politica: 'Libertad Popular', siglas: 'LP' },
    { distrito: 'SJB', numero_lista: 4, nombre_completo: 'Consuelo Sosa Quispe', organizacion_politica: 'Perú Primero', siglas: 'PP1' },
    { distrito: 'SJB', numero_lista: 5, nombre_completo: 'Francisco Llallahui Quispe', organizacion_politica: 'Podemos Perú', siglas: 'PP' },
    { distrito: 'SJB', numero_lista: 6, nombre_completo: 'Raúl Alberto Bautista Gómez', organizacion_politica: 'Batalla Perú', siglas: 'BP' },
    { distrito: 'SJB', numero_lista: 7, nombre_completo: 'Percy Ángel Flores Jota', organizacion_politica: 'APP/Trabaja Ayacucho', siglas: 'APP' },
    { distrito: 'SJB', numero_lista: 8, nombre_completo: 'Alex Rumer Ayala Tineo', organizacion_politica: 'Somos Perú', siglas: 'SP' },

    { distrito: 'AAC', numero_lista: 1, nombre_completo: 'Michel Andre Bonifacio Quispe', organizacion_politica: 'Ahora Nación', siglas: 'AN' },
    { distrito: 'AAC', numero_lista: 2, nombre_completo: 'Suliana Paredes Huamancusi', organizacion_politica: 'Frente de la Esperanza 2021', siglas: 'FE' },
    { distrito: 'AAC', numero_lista: 3, nombre_completo: 'Raúl Ramos Rodríguez', organizacion_politica: 'Libertad Popular', siglas: 'LP' },
    { distrito: 'AAC', numero_lista: 4, nombre_completo: 'Otto Granados Apaico', organizacion_politica: 'Perú Primero', siglas: 'PP1' },
    { distrito: 'AAC', numero_lista: 5, nombre_completo: 'Edilberto Lara Villavicencio', organizacion_politica: 'Podemos Perú', siglas: 'PP' },
    { distrito: 'AAC', numero_lista: 6, nombre_completo: 'Javier Navarro Gonzales', organizacion_politica: 'Batalla Perú', siglas: 'BP' },
    { distrito: 'AAC', numero_lista: 7, nombre_completo: 'Nilton Gamboa Vila', organizacion_politica: 'APP/Trabaja Ayacucho', siglas: 'APP' },
    { distrito: 'AAC', numero_lista: 8, nombre_completo: 'Rusbell Torres Yupari', organizacion_politica: 'Somos Perú', siglas: 'SP' },

    { distrito: 'CAL', numero_lista: 1, nombre_completo: 'Felipe Ayala Tineo', organizacion_politica: 'Ahora Nación', siglas: 'AN' },
    { distrito: 'CAL', numero_lista: 2, nombre_completo: 'Marcelino Paucca Cancho', organizacion_politica: 'Frente de la Esperanza 2021', siglas: 'FE' },
    { distrito: 'CAL', numero_lista: 3, nombre_completo: 'Felipe Rodríguez Mendoza', organizacion_politica: 'Libertad Popular', siglas: 'LP' },
    { distrito: 'CAL', numero_lista: 4, nombre_completo: 'Tony Salvatierra Conde', organizacion_politica: 'Podemos Perú', siglas: 'PP' },
    { distrito: 'CAL', numero_lista: 5, nombre_completo: 'Dante Paul Avilés Pérez', organizacion_politica: 'Batalla Perú', siglas: 'BP' },
    { distrito: 'CAL', numero_lista: 6, nombre_completo: 'Zenobio Quispe Fernández', organizacion_politica: 'APP/Trabaja Ayacucho', siglas: 'APP' },
    { distrito: 'CAL', numero_lista: 7, nombre_completo: 'Nicolás Gutiérrez Espinoza', organizacion_politica: 'Somos Perú', siglas: 'SP' },

    { distrito: 'JNA', numero_lista: 1, nombre_completo: 'Emerson Cordero Palomino', organizacion_politica: 'Ahora Nación', siglas: 'AN' },
    { distrito: 'JNA', numero_lista: 2, nombre_completo: 'Víctor Rolando Gálvez Santa Cruz', organizacion_politica: 'Frente de la Esperanza 2021', siglas: 'FE' },
    { distrito: 'JNA', numero_lista: 3, nombre_completo: 'Reinaldo Cuadros Aguado', organizacion_politica: 'Libertad Popular', siglas: 'LP' },
    { distrito: 'JNA', numero_lista: 4, nombre_completo: 'Rafael Mavila Huancahuari', organizacion_politica: 'Renovación Popular', siglas: 'RP' },
    { distrito: 'JNA', numero_lista: 5, nombre_completo: 'Iván Ramos Chaviguri', organizacion_politica: 'Podemos Perú', siglas: 'PP' },
    { distrito: 'JNA', numero_lista: 6, nombre_completo: 'Ronald Mauricio Quispe', organizacion_politica: 'APP/Trabaja Ayacucho', siglas: 'APP' },
    { distrito: 'JNA', numero_lista: 7, nombre_completo: 'Adriel Antero Valenzuela Pillihuamán', organizacion_politica: 'Somos Perú', siglas: 'SP' },

    { distrito: 'TAM', numero_lista: 1, nombre_completo: 'Epifanio Alejandro Ñahuirima Gonzales', organizacion_politica: 'Ahora Nación', siglas: 'AN' },
    { distrito: 'TAM', numero_lista: 2, nombre_completo: 'Arturo Quispe Solórzano', organizacion_politica: 'Libertad Popular', siglas: 'LP' },
    { distrito: 'TAM', numero_lista: 3, nombre_completo: 'Flauver Huamani Yupanqui', organizacion_politica: 'Perú Primero', siglas: 'PP1' },
    { distrito: 'TAM', numero_lista: 4, nombre_completo: 'Víctor Miranda Prado', organizacion_politica: 'Podemos Perú', siglas: 'PP' },
    { distrito: 'TAM', numero_lista: 5, nombre_completo: 'Walter Arce Prado', organizacion_politica: 'APP/Trabaja Ayacucho', siglas: 'APP' },
  ];

  const inserts = candidatosDistritales.filter(c => distritoMap[c.distrito]).map(c => ({
    nombre_completo: c.nombre_completo,
    organizacion_politica: c.organizacion_politica,
    siglas: c.siglas,
    numero_lista: c.numero_lista,
    tipo_eleccion: 'distrital',
    distrito_id: distritoMap[c.distrito],
    activo: true,
  }));

  if (inserts.length) await knex('candidatos').insert(inserts);
}

export async function down(knex) {
  await knex('candidatos').where('tipo_eleccion', 'distrital').del();
}
