import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Seed: Carga los locales de votación y genera automáticamente las mesas de sufragio
 * para toda la Provincia de Huamanga (16 distritos, 97 locales, 787 mesas).
 * 
 * Datos extraídos del padrón electoral oficial 2026.
 * Cada mesa tiene ~300 electores hábiles.
 */
export const seed = async function(knex) {
  // Leer datos del JSON extraído de los Excel oficiales
  const dataPath = join(__dirname, 'data_huamanga.json');
  const localesData = JSON.parse(readFileSync(dataPath, 'utf8'));

  // Mapeo de nombres de distrito del Excel a los nombres en la BD (seed 01_distritos)
  const distritoMap = {
    'ACOCRO': 'Acocro',
    'ACOS VINCHOS': 'Acos Vinchos',
    'ANDRES AVELINO CACERES DORREGARAY': 'Andrés Avelino Cáceres Dorregaray',
    'AYACUCHO': 'Ayacucho',
    'CARMEN ALTO': 'Carmen Alto',
    'CHIARA': 'Chiara',
    'JESUS NAZARENO': 'Jesús Nazareno',
    'OCROS': 'Ocros',
    'PACAYCASA': 'Pacaycasa',
    'QUINUA': 'Quinua',
    'SAN JOSE DE TICLLAS': 'San José de Ticllas',
    'SAN JUAN BAUTISTA': 'San Juan Bautista',
    'SANTIAGO DE PISCHA': 'Santiago de Pischa',
    'SOCOS': 'Socos',
    'TAMBILLO': 'Tambillo',
    'VINCHOS': 'Vinchos',
  };

  // Obtener IDs de distritos de la BD
  const distritos = await knex('distritos').select('id', 'nombre');
  const distritoIdMap = {};
  distritos.forEach(d => {
    distritoIdMap[d.nombre] = d.id;
  });

  // Contador global de mesas para generar números únicos
  let mesaCounter = 1;
  let totalLocales = 0;
  let totalMesas = 0;

  for (const local of localesData) {
    const distritoNombre = distritoMap[local.distrito];
    if (!distritoNombre) {
      console.warn(`Distrito no mapeado: ${local.distrito}`);
      continue;
    }

    const distritoId = distritoIdMap[distritoNombre];
    if (!distritoId) {
      console.warn(`Distrito no encontrado en BD: ${distritoNombre}`);
      continue;
    }

    // Insertar local de votación (ignorar si ya existe por nombre+distrito)
    const existingLocal = await knex('locales_votacion')
      .where({ nombre: local.nombre, distrito_id: distritoId })
      .first();

    let localId;
    if (existingLocal) {
      localId = existingLocal.id;
    } else {
      const [inserted] = await knex('locales_votacion')
        .insert({
          nombre: local.nombre,
          direccion: local.direccion,
          distrito_id: distritoId,
          total_mesas: local.mesas,
        })
        .returning('id');
      localId = inserted.id || inserted;
      totalLocales++;
    }

    // Calcular electores por mesa
    const electoresPorMesa = Math.ceil(local.electores / local.mesas);

    // Generar mesas de sufragio
    for (let m = 1; m <= local.mesas; m++) {
      const numeroMesa = String(mesaCounter).padStart(6, '0');
      
      // Verificar si la mesa ya existe
      const existingMesa = await knex('mesas_sufragio')
        .where({ numero_mesa: numeroMesa })
        .first();

      if (!existingMesa) {
        // La última mesa del local puede tener menos electores
        const electoresEstaMesa = (m === local.mesas) 
          ? local.electores - (electoresPorMesa * (local.mesas - 1))
          : electoresPorMesa;

        await knex('mesas_sufragio').insert({
          numero_mesa: numeroMesa,
          local_id: localId,
          total_electores_habiles: Math.max(electoresEstaMesa, 0),
          estado: 'pendiente',
        });
        totalMesas++;
      }
      
      mesaCounter++;
    }
  }

  console.log(`✅ Seed completado: ${totalLocales} locales y ${totalMesas} mesas creadas.`);
};
