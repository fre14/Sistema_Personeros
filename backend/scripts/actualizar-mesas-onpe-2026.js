import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';
import { invalidateDashboard } from '../src/services/cache.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script de sincronización oficial ONPE ERM 2026 - ODPE Huamanga
 * Actualiza la base de datos de locales y mesas de sufragio con los números rotados.
 */
async function actualizarMesas() {
  console.log('=== INICIANDO ACTUALIZACION DE MESAS Y LOCALES (ONPE HUAMANGA 2026) ===\n');

  try {
    const dataPath = path.join(__dirname, '../seeds/mesas_actualizadas_erm2026.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`No se encontró el archivo de datos: ${dataPath}`);
    }

    const localesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Cargados ${localesData.length} locales oficiales desde ${dataPath}`);

    // Extraer todas las mesas oficiales
    const allOfficialMesas = [];
    const activeLocalIds = new Set();

    for (const loc of localesData) {
      activeLocalIds.add(loc.id);
      for (const m of loc.mesas) {
        allOfficialMesas.push({
          numero_mesa: m,
          local_id: loc.id,
          total_electores_habiles: 300,
          distrito_id: loc.distrito_id,
          distrito: loc.distrito
        });
      }
    }

    const officialMesaNumbers = allOfficialMesas.map(m => m.numero_mesa);
    console.log(`Total de mesas oficiales en el padrón ONPE: ${allOfficialMesas.length}`);

    await db.transaction(async (trx) => {
      // 1. Actualizar locales de votación
      console.log('\n--- 1. Actualizando Locales de Votación ---');
      let localesActualizados = 0;
      for (const loc of localesData) {
        await trx('locales_votacion')
          .where({ id: loc.id })
          .update({
            total_mesas: loc.total_mesas,
            direccion: loc.direccion || trx.raw('direccion'),
            updated_at: trx.fn.now()
          });
        localesActualizados++;
      }
      console.log(`Actualizados ${localesActualizados} locales con su cantidad oficial de mesas y direcciones.`);

      // Locales inactivos (no usados en 2026)
      const localesInactivos = await trx('locales_votacion')
        .whereNotIn('id', Array.from(activeLocalIds))
        .update({
          total_mesas: 0,
          updated_at: trx.fn.now()
        });
      console.log(`Locales inactivos marcados con total_mesas = 0: ${localesInactivos}`);

      // 2. Mesas obsoletas a depurar
      console.log('\n--- 2. Verificando Mesas Obsoletas ---');
      const mesasObsoletas = await trx('mesas_sufragio')
        .whereNotIn('numero_mesa', officialMesaNumbers);
      console.log(`Mesas en BD que no están en el nuevo padrón: ${mesasObsoletas.length}`);

      if (mesasObsoletas.length > 0) {
        const obsoleteIds = mesasObsoletas.map(m => m.id);
        
        // Validar que no tengan resultados ni asignaciones
        const conResultados = await trx('resultados_mesa').whereIn('mesa_id', obsoleteIds);
        const conAsignaciones = await trx('asignacion_personeros').whereIn('mesa_id', obsoleteIds);

        if (conResultados.length > 0 || conAsignaciones.length > 0) {
          throw new Error(`No se pueden eliminar mesas obsoletas porque tienen relaciones activas!`);
        }

        const eliminadas = await trx('mesas_sufragio').whereIn('id', obsoleteIds).del();
        console.log(`Depuradas exitosamente ${eliminadas} mesas obsoletas.`);
      }

      // 3. Sincronizar mesas oficiales
      console.log('\n--- 3. Sincronizando Mesas de Sufragio Oficiales (Rotación) ---');
      const existingMesas = await trx('mesas_sufragio')
        .whereIn('numero_mesa', officialMesaNumbers)
        .select('id', 'numero_mesa', 'local_id', 'estado');
      
      const existingMap = new Map(existingMesas.map(m => [m.numero_mesa, m]));

      let mesasRotadasActualizadas = 0;
      let mesasNuevasInsertadas = 0;

      for (const m of allOfficialMesas) {
        const existing = existingMap.get(m.numero_mesa);
        if (existing) {
          // Si el local cambió (rotación) o actualizamos electores
          await trx('mesas_sufragio')
            .where({ id: existing.id })
            .update({
              local_id: m.local_id,
              total_electores_habiles: 300,
              updated_at: trx.fn.now()
            });
          mesasRotadasActualizadas++;
        } else {
          // Insertar mesa nueva
          await trx('mesas_sufragio').insert({
            numero_mesa: m.numero_mesa,
            local_id: m.local_id,
            total_electores_habiles: 300,
            estado: 'pendiente'
          });
          mesasNuevasInsertadas++;
        }
      }

      console.log(`Mesas existentes actualizadas/rotadas: ${mesasRotadasActualizadas}`);
      console.log(`Mesas nuevas insertadas: ${mesasNuevasInsertadas}`);

      // 4. Asignación de coordinador para supervisión
      // Local 15 (IE 38083 LOS LICENCIADOS) tiene actas existentes (009434, 009436, 009438)
      // Asegurar que el coordinador 7 esté asignado al local 15 para supervisión continua
      const coordAsignado = await trx('asignacion_coordinadores')
        .where({ usuario_id: 7, local_id: 15, activo: true })
        .first();

      if (!coordAsignado) {
        await trx('asignacion_coordinadores').insert({
          usuario_id: 7,
          local_id: 15,
          activo: true,
          asignado_en: trx.fn.now()
        });
        console.log('Asignado coordinador 7 al local 15 (IE 38083 LOS LICENCIADOS) para supervisión de actas.');
      }
    });

    // 5. Invalidar caché del dashboard
    await invalidateDashboard();
    console.log('\nCaché del dashboard en Redis invalidada correctamente.');

    // 6. Verificación final de la base de datos
    console.log('\n--- 4. Verificación Final ---');
    const totalMesasDB = await db('mesas_sufragio').count('id as c').first();
    const totalLocalesActivos = await db('locales_votacion').where('total_mesas', '>', 0).count('id as c').first();
    
    console.log(`Total de mesas en BD: ${totalMesasDB.c} (Esperado: 783)`);
    console.log(`Total de locales activos en BD: ${totalLocalesActivos.c} (Esperado: 93)`);

    // Resumen por distrito
    const resumenDistritos = await db('mesas_sufragio as m')
      .join('locales_votacion as l', 'm.local_id', 'l.id')
      .join('distritos as d', 'l.distrito_id', 'd.id')
      .select('d.nombre as distrito')
      .count('m.id as total_mesas')
      .groupBy('d.nombre')
      .orderBy('total_mesas', 'desc');

    console.log('\nDistribución de mesas por distrito en BD:');
    resumenDistritos.forEach(rd => {
      console.log(`  ${rd.distrito.padEnd(35)} : ${rd.total_mesas} mesas`);
    });

    console.log('\n=== ACTUALIZACION COMPLETADA CON EXITO ===');

  } catch (error) {
    console.error('Error durante la actualización de mesas:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

actualizarMesas();
