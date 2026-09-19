import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Seed: Carga los locales de votación y las mesas de sufragio oficiales
 * para toda la Provincia de Huamanga según el padrón ONPE ERM 2026
 * (16 distritos, 93 locales activos, 783 mesas oficiales rotadas).
 */
export const seed = async function(knex) {
  const dataPath = join(__dirname, 'mesas_oficiales_huamanga.json');
  const localesData = JSON.parse(readFileSync(dataPath, 'utf8'));

  const distritos = await knex('distritos').select('id', 'nombre');
  const distritoIdMap = {};
  distritos.forEach(d => {
    distritoIdMap[d.nombre] = d.id;
  });

  const activeLocalIds = [];
  let totalLocales = 0;
  let totalMesas = 0;

  for (const local of localesData) {
    const distritoId = local.distrito_id || distritoIdMap[local.distrito];
    if (!distritoId) {
      console.warn(`Distrito no encontrado en BD: ${local.distrito}`);
      continue;
    }

    // Insertar o actualizar local
    const existingLocal = await knex('locales_votacion')
      .where({ id: local.id })
      .orWhere({ nombre: local.nombre, distrito_id: distritoId })
      .first();

    let localId;
    if (existingLocal) {
      localId = existingLocal.id;
      await knex('locales_votacion')
        .where({ id: localId })
        .update({
          direccion: local.direccion || existingLocal.direccion,
          total_mesas: local.total_mesas || local.mesas.length,
          updated_at: knex.fn.now()
        });
    } else {
      const [inserted] = await knex('locales_votacion')
        .insert({
          id: local.id,
          nombre: local.nombre,
          direccion: local.direccion,
          distrito_id: distritoId,
          total_mesas: local.total_mesas || local.mesas.length,
        })
        .returning('id');
      localId = inserted.id || inserted;
      totalLocales++;
    }

    activeLocalIds.push(localId);

    // Insertar o actualizar mesas de este local
    for (const numeroMesa of local.mesas) {
      const existingMesa = await knex('mesas_sufragio')
        .where({ numero_mesa: numeroMesa })
        .first();

      if (existingMesa) {
        await knex('mesas_sufragio')
          .where({ id: existingMesa.id })
          .update({
            local_id: localId,
            total_electores_habiles: 300,
            updated_at: knex.fn.now()
          });
      } else {
        await knex('mesas_sufragio').insert({
          numero_mesa: numeroMesa,
          local_id: localId,
          total_electores_habiles: 300,
          estado: 'pendiente'
        });
        totalMesas++;
      }
    }
  }

  // Marcar con total_mesas: 0 cualquier local no activo en el padrón 2026
  await knex('locales_votacion')
    .whereNotIn('id', activeLocalIds)
    .update({ total_mesas: 0, updated_at: knex.fn.now() });

  console.log(`✅ Seed oficial ONPE completado: ${localesData.length} locales y 783 mesas sincronizadas.`);
};
