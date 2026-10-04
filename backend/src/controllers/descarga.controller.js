import { ZipArchive } from 'archiver';
import path from 'path';
import * as XLSX from 'xlsx';
import db from '../config/database.js';
import { getActaBuffer } from '../services/storage.service.js';

const sanitizeNombre = (nombre) => {
  return String(nombre || '')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_');
};

const generarTextoReporte = (item, detalles) => {
  const tipo = (item.tipo_eleccion || 'provincial').toUpperCase();
  const lineas = [
    '==================================================',
    `ACTA ELECTORAL ESCRUTADA Y VERIFICADA (${tipo})`,
    '==================================================',
    `Distrito:            ${item.distrito_nombre || 'N/A'}`,
    `Local de Votación:   ${item.local_nombre || 'N/A'}`,
    `Dirección Local:     ${item.local_direccion || 'N/A'}`,
    `Mesa de Sufragio:    ${item.numero_mesa}`,
    `Electores Hábiles:   ${item.total_electores_habiles || 0}`,
    '--------------------------------------------------',
    'DATOS DE LOS RESPONSABLES DE LA MESA / LOCAL:',
    '--------------------------------------------------',
    'PERSONERO DE MESA:',
    `  Nombre Completo:   ${item.personero_nombre || 'Sin asignar'}`,
    `  DNI:               ${item.personero_dni || 'N/A'}`,
    `  Teléfono/Contacto: ${item.personero_telefono || 'No registrado'}`,
    '',
    'COORDINADOR DE LOCAL:',
    `  Nombre Completo:   ${item.coordinador_nombre || 'Sin asignar'}`,
    `  DNI:               ${item.coordinador_dni || 'N/A'}`,
    `  Teléfono/Contacto: ${item.coordinador_telefono || 'No registrado'}`,
    '--------------------------------------------------',
    'VOTOS POR CANDIDATO / ORGANIZACIÓN POLÍTICA:',
    '--------------------------------------------------',
  ];

  if (detalles && detalles.length > 0) {
    detalles.forEach((d) => {
      lineas.push(`  Lista ${d.numero_lista}: ${d.nombre_completo} (${d.siglas || d.organizacion_politica}) -> ${d.votos} votos`);
    });
  } else {
    lineas.push('  (Sin detalles de candidatos registrados)');
  }

  lineas.push('--------------------------------------------------');
  lineas.push(`Votos en Blanco:     ${item.votos_blanco || 0}`);
  lineas.push(`Votos Nulos:         ${item.votos_nulo || 0}`);
  lineas.push(`Votos Impugnados:    ${item.votos_impugnados || 0}`);
  lineas.push('--------------------------------------------------');
  lineas.push(`TOTAL VOTOS EMITIDOS: ${item.total_votos_emitidos || 0}`);
  lineas.push(`Total Cédulas:        ${item.total_cedulas_votacion || 0}`);
  lineas.push('==================================================');
  lineas.push(`Estado del Acta:     ${(item.estado || '').toUpperCase()}`);
  lineas.push(`Fecha de Transmisión: ${item.subido_en ? new Date(item.subido_en).toISOString() : 'N/A'}`);
  lineas.push(`Fecha de Verificación:${item.verificado_en ? new Date(item.verificado_en).toISOString() : 'N/A'}`);
  if (item.observaciones_personero) {
    lineas.push(`Observaciones Personero: ${item.observaciones_personero}`);
  }
  if (item.observaciones_coordinador) {
    lineas.push(`Observaciones Coordinador: ${item.observaciones_coordinador}`);
  }
  lineas.push('==================================================\n');

  return lineas.join('\n');
};

const empaquetarActas = async (archive, tipoFiltro, distritoIdFiltro = null) => {
  let query = db('resultados_mesa as rm')
    .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
    .join('locales_votacion as l', 'm.local_id', 'l.id')
    .join('distritos as d', 'l.distrito_id', 'd.id')
    .leftJoin('usuarios as u_per', 'rm.personero_id', 'u_per.id')
    .leftJoin('asignacion_personeros as ap', function() {
      this.on('m.id', '=', 'ap.mesa_id').andOn('ap.activo', '=', db.raw('true'));
    })
    .leftJoin('usuarios as u_per_mesa', 'ap.usuario_id', 'u_per_mesa.id')
    .leftJoin('asignacion_coordinadores as ac', function() {
      this.on('l.id', '=', 'ac.local_id').andOn('ac.activo', '=', db.raw('true'));
    })
    .leftJoin('usuarios as u_coord', 'ac.usuario_id', 'u_coord.id')
    .leftJoin('usuarios as u_ver', 'rm.verificado_por', 'u_ver.id')
    .where('rm.estado', 'verificado');

  if (tipoFiltro) {
    query = query.where('rm.tipo_eleccion', tipoFiltro);
  }

  if (distritoIdFiltro) {
    query = query.where('d.id', distritoIdFiltro);
  }

  const actas = await query.select(
    'rm.*',
    'm.numero_mesa',
    'm.total_electores_habiles',
    'l.nombre as local_nombre',
    'l.direccion as local_direccion',
    'd.nombre as distrito_nombre',
    db.raw("COALESCE(NULLIF(TRIM(CONCAT(u_per.nombres, ' ', u_per.apellidos)), ''), NULLIF(TRIM(CONCAT(u_per_mesa.nombres, ' ', u_per_mesa.apellidos)), ''), 'Sin asignar') as personero_nombre"),
    db.raw("COALESCE(u_per.dni, u_per_mesa.dni, 'N/A') as personero_dni"),
    db.raw("COALESCE(u_per.telefono, u_per_mesa.telefono, 'No registrado') as personero_telefono"),
    db.raw("COALESCE(NULLIF(TRIM(CONCAT(u_coord.nombres, ' ', u_coord.apellidos)), ''), NULLIF(TRIM(CONCAT(u_ver.nombres, ' ', u_ver.apellidos)), ''), 'Sin asignar') as coordinador_nombre"),
    db.raw("COALESCE(u_coord.dni, u_ver.dni, 'N/A') as coordinador_dni"),
    db.raw("COALESCE(u_coord.telefono, u_ver.telefono, 'No registrado') as coordinador_telefono")
  ).orderBy('d.nombre', 'asc')
   .orderBy('l.nombre', 'asc')
   .orderBy('m.numero_mesa', 'asc');

  if (actas.length === 0) {
    return 0;
  }

  const resultadoIds = actas.map((a) => a.id);
  const todosDetalles = await db('detalle_resultados as dr')
    .join('candidatos as c', 'dr.candidato_id', 'c.id')
    .whereIn('dr.resultado_id', resultadoIds)
    .select(
      'dr.resultado_id',
      'dr.votos',
      'c.nombre_completo',
      'c.organizacion_politica',
      'c.siglas',
      'c.numero_lista'
    )
    .orderBy('c.numero_lista', 'asc');

  const detallesPorResultado = {};
  todosDetalles.forEach((d) => {
    if (!detallesPorResultado[d.resultado_id]) {
      detallesPorResultado[d.resultado_id] = [];
    }
    detallesPorResultado[d.resultado_id].push(d);
  });

  for (const acta of actas) {
    const tipoCarpeta = acta.tipo_eleccion === 'distrital' ? 'distrital' : 'provincial';
    const distritoCarpeta = sanitizeNombre(acta.distrito_nombre || 'Distrito');
    const localCarpeta = sanitizeNombre(acta.local_nombre || 'Local');
    const mesaCarpeta = `Mesa_${sanitizeNombre(acta.numero_mesa)}`;

    const rutaBase = path.posix.join(tipoCarpeta, distritoCarpeta, localCarpeta, mesaCarpeta);

    const reporteTexto = generarTextoReporte(acta, detallesPorResultado[acta.id] || []);
    const nombreReporte = `reporte_${acta.numero_mesa}.txt`;
    archive.append(reporteTexto, { name: path.posix.join(rutaBase, nombreReporte) });

    if (acta.foto_acta_url) {
      const bufferFoto = await getActaBuffer(acta.foto_acta_url);
      if (bufferFoto) {
        const ext = path.extname(acta.foto_acta_url) || '.jpg';
        const nombreFoto = `acta_${acta.numero_mesa}${ext}`;
        archive.append(bufferFoto, { name: path.posix.join(rutaBase, nombreFoto) });
      }
    }
  }

  return actas.length;
};

export const descargarProvincial = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="actas_provinciales_${timestamp}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('Error creando archivo ZIP provincial:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error generando ZIP', error: err.message });
      }
    });

    const cantidad = await empaquetarActas(archive, 'provincial');
    if (cantidad === 0) {
      archive.append('No se encontraron actas provinciales verificadas para descargar.\n', {
        name: 'provincial/LEEME.txt',
      });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error en descarga provincial:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error descargando actas provinciales', error: error.message });
    }
  }
};

export const descargarDistrital = async (req, res) => {
  try {
    const { distrito_id } = req.query;
    let distritoNombreSlug = '';
    let distritoObj = null;

    if (distrito_id) {
      distritoObj = await db('distritos').where('id', distrito_id).first();
      if (distritoObj) {
        distritoNombreSlug = `_${sanitizeNombre(distritoObj.nombre)}`;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="actas_distritales${distritoNombreSlug}_${timestamp}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('Error creando archivo ZIP distrital:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error generando ZIP', error: err.message });
      }
    });

    const cantidad = await empaquetarActas(archive, 'distrital', distrito_id ? Number(distrito_id) : null);
    if (cantidad === 0) {
      const nomDist = distritoObj ? distritoObj.nombre : 'en este ámbito';
      archive.append(`No se encontraron actas distritales verificadas para descargar (${nomDist}).\n`, {
        name: 'distrital/LEEME.txt',
      });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error en descarga distrital:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error descargando actas distritales', error: error.message });
    }
  }
};

export const descargarCompleta = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="actas_electorales_completas_${timestamp}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('Error creando archivo ZIP completo:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error generando ZIP', error: err.message });
      }
    });

    const cantidad = await empaquetarActas(archive, null);
    if (cantidad === 0) {
      archive.append('No se encontraron actas electorales verificadas para descargar.\n', {
        name: 'LEEME.txt',
      });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error en descarga completa:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error descargando actas completas', error: error.message });
    }
  }
};

/**
 * Exporta el archivo Excel de distribución por colegio (1 hoja por colegio)
 * con el detalle de mesas cubiertas, mesas faltantes y coordinadores.
 */
export const descargarColegiosExcel = async (req, res) => {
  try {
    const [distritos, locales, mesas, asigPers, asigCoord, usuarios] = await Promise.all([
      db('distritos').select('id', 'nombre'),
      db('locales_votacion').select('id', 'nombre', 'direccion', 'distrito_id').orderBy('nombre', 'asc'),
      db('mesas_sufragio').select('id', 'numero_mesa', 'local_id', 'total_electores_habiles', 'estado').orderBy('numero_mesa', 'asc'),
      db('asignacion_personeros as ap')
        .join('usuarios as u', 'ap.usuario_id', 'u.id')
        .select('ap.mesa_id', 'ap.usuario_id', 'ap.asignado_en', 'u.dni', 'u.nombres', 'u.apellidos', 'u.telefono')
        .where('ap.activo', true),
      db('asignacion_coordinadores as ac')
        .join('usuarios as u', 'ac.usuario_id', 'u.id')
        .select('ac.local_id', 'ac.usuario_id', 'ac.asignado_en', 'u.dni', 'u.nombres', 'u.apellidos', 'u.telefono')
        .where('ac.activo', true),
      db('usuarios').select('id', 'dni', 'nombres', 'apellidos', 'telefono', 'rol', 'activo')
    ]);

    const distMap = {};
    distritos.forEach((d) => { distMap[d.id] = d.nombre; });

    const persPorMesa = {};
    asigPers.forEach((ap) => { persPorMesa[ap.mesa_id] = ap; });

    const coordPorLocal = {};
    asigCoord.forEach((ac) => {
      if (!coordPorLocal[ac.local_id]) coordPorLocal[ac.local_id] = [];
      coordPorLocal[ac.local_id].push(ac);
    });

    const sanitizeSheetTitle = (name, usedMap) => {
      let clean = String(name || '').trim().replace(/[\\/*?\[\]:]/g, '-');
      const prefixes = [
        'INSTITUCION EDUCATIVA PRIVADA ',
        'INSTITUCION EDUCATIVA ',
        'IEPE ', 'IESTP ', 'IES ', 'IEP ', 'IE '
      ];
      for (const p of prefixes) {
        if (clean.toUpperCase().startsWith(p)) {
          clean = clean.substring(p.length).trim();
          break;
        }
      }
      clean = clean.replace(/NUESTRA SEÑORA DE /gi, 'Ntra Sra ')
                   .replace(/NUESTRA SENORA DE /gi, 'Ntra Sra ')
                   .replace(/REPUBLICA BOLIVARIANA DE /gi, 'Rep. ')
                   .replace(/PLANTELES DE APLICACION /gi, 'Planteles ')
                   .replace(/PLANTELES DE APLICACIÓN /gi, 'Planteles ');

      if (clean.length > 25) clean = clean.substring(0, 25).trim();
      const upper = clean.toUpperCase();
      let title = clean;
      if (usedMap[upper]) {
        usedMap[upper]++;
        title = `${clean.substring(0, 24)} (${usedMap[upper]})`;
      } else {
        usedMap[upper] = 1;
      }
      return title.substring(0, 31);
    };

    const usedTitles = {};
    const localesData = locales.map((loc) => {
      const locMesas = mesas.filter((m) => m.local_id === loc.id);
      locMesas.sort((a, b) => String(a.numero_mesa).localeCompare(String(b.numero_mesa)));
      const cubiertas = locMesas.filter((m) => persPorMesa[m.id]);
      const faltantes = locMesas.filter((m) => !persPorMesa[m.id]);
      const coords = coordPorLocal[loc.id] || [];

      return {
        id: loc.id,
        nombre: loc.nombre,
        direccion: loc.direccion || 'Sin dirección registrada',
        distrito: distMap[loc.distrito_id] || 'Ayacucho',
        mesas: locMesas,
        totalMesas: locMesas.length,
        cubiertasCnt: cubiertas.length,
        faltantesCnt: faltantes.length,
        coordinadores: coords,
        sheetTitle: sanitizeSheetTitle(loc.nombre, usedTitles),
        pctCobertura: locMesas.length ? ((cubiertas.length / locMesas.length) * 100) : 0,
      };
    });

    // Priorizar colegios con asignaciones o coordinadores
    localesData.sort((a, b) => {
      if (b.cubiertasCnt !== a.cubiertasCnt) return b.cubiertasCnt - a.cubiertasCnt;
      if ((b.coordinadores.length > 0) !== (a.coordinadores.length > 0)) {
        return (b.coordinadores.length > 0 ? 1 : 0) - (a.coordinadores.length > 0 ? 1 : 0);
      }
      if (b.totalMesas !== a.totalMesas) return b.totalMesas - a.totalMesas;
      return a.nombre.localeCompare(b.nombre);
    });

    const wb = XLSX.utils.book_new();

    // 1. Hoja RESUMEN GENERAL
    const resumenAoa = [
      ['SISTEMA ELECTORAL HUAMANGA 2026 — ESTADO DE DISTRIBUCIÓN POR COLEGIO'],
      [`Mesas Asignadas, Mesas Faltantes y Coordinadores de Local | Colegios: ${localesData.length} | Mesas Totales: ${mesas.length} | Generado: ${new Date().toISOString().slice(0, 10)}`],
      [],
      ['N°', 'Distrito', 'Colegio / Local de Votación', 'Coordinador(es) Responsable(s)', 'Celular(es) Coordinador', 'Total Mesas', 'Mesas Cubiertas', 'MESAS FALTANTES', '% Cobertura', 'Estado de Cobertura']
    ];

    localesData.forEach((loc, idx) => {
      const coordStr = loc.coordinadores.length
        ? loc.coordinadores.map((c) => `${c.apellidos} ${c.nombres} (DNI: ${c.dni})`).join(' / ')
        : 'SIN COORDINADOR ASIGNADO';
      const telStr = loc.coordinadores.length
        ? loc.coordinadores.map((c) => c.telefono || '-').join(' / ')
        : '-';
      const estStr = loc.faltantesCnt === 0 && loc.totalMesas > 0
        ? '100% COMPLETO'
        : loc.cubiertasCnt > 0
        ? `PARCIAL (${loc.cubiertasCnt}/${loc.totalMesas})`
        : 'SIN ASIGNAR (0%)';

      resumenAoa.push([
        idx + 1,
        loc.distrito,
        loc.nombre,
        coordStr,
        telStr,
        loc.totalMesas,
        loc.cubiertasCnt,
        loc.faltantesCnt,
        `${loc.pctCobertura.toFixed(1)}%`,
        estStr
      ]);
    });

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoa);
    wsResumen['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 38 }, { wch: 42 }, { wch: 24 },
      { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN GENERAL');

    // 2. Cada colegio en su propia hoja
    localesData.forEach((loc) => {
      const coordText = loc.coordinadores.length
        ? loc.coordinadores.map((c) => `${c.apellidos} ${c.nombres} (DNI: ${c.dni} | Celular: ${c.telefono || '-'} | Clave: ${c.dni})`).join(' / ')
        : 'SIN COORDINADOR ASIGNADO AÚN';

      const schoolAoa = [
        [`LOCAL DE VOTACIÓN: ${loc.nombre.toUpperCase()}`],
        [`Distrito: ${loc.distrito} | Dirección: ${loc.direccion}`],
        [`COORDINADOR DE LOCAL: ${coordText}`],
        [`Total Mesas: ${loc.totalMesas} | Mesas Cubiertas: ${loc.cubiertasCnt} | MESAS FALTANTES: ${loc.faltantesCnt} | Cobertura: ${loc.pctCobertura.toFixed(1)}%`],
        [],
        ['N°', 'Número de Mesa', 'Electores Hábiles', 'Estado Asignación', 'Personero Asignado', 'DNI Personero', 'Contraseña (Mesa)', 'Celular / Contacto', 'Estado en Sistema', 'Fecha Asignación']
      ];

      loc.mesas.forEach((m, mIdx) => {
        const pers = persPorMesa[m.id];
        if (pers) {
          const nom = `${pers.apellidos || ''} ${pers.nombres || ''}`.trim();
          let fecha = pers.asignado_en ? new Date(pers.asignado_en).toISOString().slice(0, 16).replace('T', ' ') : '-';
          schoolAoa.push([
            mIdx + 1,
            String(m.numero_mesa),
            m.total_electores_habiles || 0,
            'CUBIERTA',
            nom,
            pers.dni || '-',
            String(m.numero_mesa),
            pers.telefono || '-',
            'ASIGNADO ACTIVO',
            fecha
          ]);
        } else {
          schoolAoa.push([
            mIdx + 1,
            String(m.numero_mesa),
            m.total_electores_habiles || 0,
            'FALTA PERSONERO',
            'VACANTE  (FALTA ASIGNAR PERSONERO)',
            '-',
            `${m.numero_mesa} (al asignar)`,
            '-',
            'PENDIENTE DE ASIGNACIÓN',
            '-'
          ]);
        }
      });

      const wsSchool = XLSX.utils.aoa_to_sheet(schoolAoa);
      wsSchool['!cols'] = [
        { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 36 },
        { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSchool, loc.sheetTitle);
    });

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Distribucion_Colegios_Mesas_Faltantes_${timestamp}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error al exportar distribución de colegios:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al generar Excel de colegios', error: error.message });
    }
  }
};

/**
 * Exporta el archivo Excel general de Asignaciones y Credenciales
 * (Personeros por Mesa, Coordinadores de Local, Personeros Libres y Cobertura).
 */
export const descargarAsignacionesExcel = async (req, res) => {
  try {
    const [personeros, coordinadores, usuarios, locales, distritos, mesas] = await Promise.all([
      db('asignacion_personeros as ap')
        .join('usuarios as u', 'ap.usuario_id', 'u.id')
        .join('mesas_sufragio as m', 'ap.mesa_id', 'm.id')
        .join('locales_votacion as l', 'm.local_id', 'l.id')
        .join('distritos as d', 'l.distrito_id', 'd.id')
        .select(
          'ap.id', 'ap.usuario_id', 'ap.mesa_id', 'ap.asignado_en',
          'u.dni', 'u.nombres', 'u.apellidos', 'u.telefono', 'u.activo',
          'm.numero_mesa', 'l.nombre as local_nombre', 'd.nombre as distrito_nombre'
        )
        .where('ap.activo', true)
        .orderBy('d.nombre', 'asc')
        .orderBy('l.nombre', 'asc')
        .orderBy('m.numero_mesa', 'asc'),
      db('asignacion_coordinadores as ac')
        .join('usuarios as u', 'ac.usuario_id', 'u.id')
        .join('locales_votacion as l', 'ac.local_id', 'l.id')
        .join('distritos as d', 'l.distrito_id', 'd.id')
        .select(
          'ac.id', 'ac.usuario_id', 'ac.local_id', 'ac.asignado_en',
          'u.dni', 'u.nombres', 'u.apellidos', 'u.telefono', 'u.activo',
          'l.nombre as local_nombre', 'd.nombre as distrito_nombre'
        )
        .where('ac.activo', true)
        .orderBy('d.nombre', 'asc')
        .orderBy('l.nombre', 'asc'),
      db('usuarios').select('*').where('rol', 'personero').orderBy('apellidos', 'asc'),
      db('locales_votacion').select('id', 'distrito_id'),
      db('distritos').select('id', 'nombre'),
      db('mesas_sufragio').select('id', 'local_id')
    ]);

    const assignedUserIds = new Set(personeros.map((p) => p.usuario_id));
    const personerosLibres = usuarios.filter((u) => !assignedUserIds.has(u.id));

    const wb = XLSX.utils.book_new();

    // Hoja 1: Personeros de Mesa
    const persAoa = [
      ['N°', 'Distrito', 'Local de Votación', 'N° Mesa', 'Usuario (DNI)', 'Contraseña (N° Mesa)', 'Apellidos y Nombres', 'Teléfono / Celular', 'Estado', 'Fecha Asignación']
    ];
    personeros.forEach((p, idx) => {
      let fStr = p.asignado_en ? new Date(p.asignado_en).toISOString().slice(0, 16).replace('T', ' ') : '-';
      persAoa.push([
        idx + 1,
        p.distrito_nombre,
        p.local_nombre,
        String(p.numero_mesa),
        p.dni,
        String(p.numero_mesa),
        `${p.apellidos} ${p.nombres}`.trim(),
        p.telefono || '-',
        p.activo ? 'ASIGNADO / ACTIVO' : 'INACTIVO',
        fStr
      ]);
    });
    const wsPers = XLSX.utils.aoa_to_sheet(persAoa);
    wsPers['!cols'] = [
      { wch: 6 }, { wch: 24 }, { wch: 38 }, { wch: 14 }, { wch: 16 },
      { wch: 22 }, { wch: 34 }, { wch: 18 }, { wch: 20 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPers, 'Personeros de Mesa');

    // Hoja 2: Coordinadores de Local
    const coordAoa = [
      ['N°', 'Distrito', 'Local de Votación', 'Usuario (DNI)', 'Contraseña (DNI)', 'Apellidos y Nombres', 'Teléfono / Celular', 'Estado', 'Fecha Asignación']
    ];
    coordinadores.forEach((c, idx) => {
      let fStr = c.asignado_en ? new Date(c.asignado_en).toISOString().slice(0, 16).replace('T', ' ') : '-';
      coordAoa.push([
        idx + 1,
        c.distrito_nombre,
        c.local_nombre,
        c.dni,
        c.dni,
        `${c.apellidos} ${c.nombres}`.trim(),
        c.telefono || '-',
        'COORDINADOR ACTIVO',
        fStr
      ]);
    });
    const wsCoord = XLSX.utils.aoa_to_sheet(coordAoa);
    wsCoord['!cols'] = [
      { wch: 6 }, { wch: 24 }, { wch: 38 }, { wch: 16 }, { wch: 18 },
      { wch: 34 }, { wch: 18 }, { wch: 22 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsCoord, 'Coordinadores de Local');

    // Hoja 3: Personeros Libres
    const libresAoa = [
      ['N°', 'Usuario (DNI)', 'Contraseña (DNI)', 'Apellidos y Nombres', 'Teléfono / Celular', 'Rol', 'Estado', 'Disponibilidad']
    ];
    personerosLibres.forEach((pl, idx) => {
      libresAoa.push([
        idx + 1,
        pl.dni,
        pl.dni,
        `${pl.apellidos} ${pl.nombres}`.trim(),
        pl.telefono || '-',
        pl.rol,
        pl.activo ? 'Activo' : 'Inactivo',
        'LIBRE / LISTO PARA ASIGNAR'
      ]);
    });
    const wsLibres = XLSX.utils.aoa_to_sheet(libresAoa);
    wsLibres['!cols'] = [
      { wch: 6 }, { wch: 16 }, { wch: 18 }, { wch: 34 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, wsLibres, 'Personeros Libres');

    // Hoja 4: Resumen de Cobertura
    const localDistMap = {};
    locales.forEach((l) => { localDistMap[l.id] = l.distrito_id; });
    const distMesasCount = {};
    mesas.forEach((m) => {
      const dId = localDistMap[m.local_id];
      distMesasCount[dId] = (distMesasCount[dId] || 0) + 1;
    });
    const distCubiertasCount = {};
    personeros.forEach((p) => {
      const dNom = p.distrito_nombre;
      distCubiertasCount[dNom] = (distCubiertasCount[dNom] || 0) + 1;
    });

    const cobAoa = [
      ['N°', 'Distrito', 'Total Mesas Oficiales', 'Mesas con Personero', 'Mesas Faltantes', '% Cobertura']
    ];
    distritos.forEach((d, idx) => {
      const totalM = distMesasCount[d.id] || 0;
      const cubM = distCubiertasCount[d.nombre] || 0;
      const falM = totalM - cubM;
      const pct = totalM ? ((cubM / totalM) * 100).toFixed(1) + '%' : '0.0%';
      cobAoa.push([idx + 1, d.nombre, totalM, cubM, falM, pct]);
    });
    const wsCob = XLSX.utils.aoa_to_sheet(cobAoa);
    wsCob['!cols'] = [
      { wch: 6 }, { wch: 26 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsCob, 'Resumen de Cobertura');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Relacion_General_Asignaciones_${timestamp}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error al exportar asignaciones:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al generar Excel de asignaciones', error: error.message });
    }
  }
};

/**
 * Exporta el padrón completo de usuarios del sistema a Excel.
 */
export const descargarUsuariosExcel = async (req, res) => {
  try {
    const usuarios = await db('usuarios as u')
      .leftJoin('asignacion_personeros as ap', function() {
        this.on('u.id', '=', 'ap.usuario_id').andOn('ap.activo', '=', db.raw('true'));
      })
      .leftJoin('mesas_sufragio as m', 'ap.mesa_id', 'm.id')
      .leftJoin('asignacion_coordinadores as ac', function() {
        this.on('u.id', '=', 'ac.usuario_id').andOn('ac.activo', '=', db.raw('true'));
      })
      .leftJoin('locales_votacion as l_coord', 'ac.local_id', 'l_coord.id')
      .leftJoin('locales_votacion as l_mesa', 'm.local_id', 'l_mesa.id')
      .select(
        'u.id', 'u.dni', 'u.nombres', 'u.apellidos', 'u.rol', 'u.telefono', 'u.activo', 'u.created_at',
        'm.numero_mesa',
        db.raw("COALESCE(l_mesa.nombre, l_coord.nombre, '-') as local_asignado")
      )
      .orderBy('u.rol', 'asc')
      .orderBy('u.apellidos', 'asc');

    const wb = XLSX.utils.book_new();
    const rows = [
      ['N°', 'DNI (Usuario)', 'Contraseña de Acceso', 'Apellidos y Nombres', 'Rol', 'Teléfono / Celular', 'Estado', 'Mesa Asignada', 'Local de Votación', 'Fecha de Registro']
    ];

    usuarios.forEach((u, idx) => {
      let claveAcceso = '-';
      if (u.rol === 'personero') {
        claveAcceso = u.numero_mesa ? String(u.numero_mesa) : u.dni;
      } else if (u.rol === 'coordinador') {
        claveAcceso = u.dni;
      } else {
        claveAcceso = '(Contraseña de Admin)';
      }

      let fecha = u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '-';
      rows.push([
        idx + 1,
        u.dni,
        claveAcceso,
        `${u.apellidos} ${u.nombres}`.trim(),
        u.rol.toUpperCase(),
        u.telefono || '-',
        u.activo ? 'ACTIVO' : 'INACTIVO',
        u.numero_mesa || '-',
        u.local_asignado,
        fecha
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 16 }, { wch: 22 }, { wch: 34 }, { wch: 16 },
      { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 38 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Padrón de Usuarios');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Padron_Usuarios_Sistema_${timestamp}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error al exportar padrón de usuarios:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al generar Excel de usuarios', error: error.message });
    }
  }
};

/**
 * Exporta el reporte de resultados y cómputo de votos a Excel.
 */
export const descargarResultadosExcel = async (req, res) => {
  try {
    const { tipo_eleccion = 'provincial' } = req.query;

    const [candidatos, resultados, distritos] = await Promise.all([
      db('candidatos').where('tipo_eleccion', tipo_eleccion).orderBy('numero_lista', 'asc'),
      db('resultados_mesa as rm')
        .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
        .join('locales_votacion as l', 'm.local_id', 'l.id')
        .join('distritos as d', 'l.distrito_id', 'd.id')
        .where('rm.tipo_eleccion', tipo_eleccion)
        .select(
          'rm.id', 'rm.estado', 'rm.votos_blanco', 'rm.votos_nulo', 'rm.votos_impugnados', 'rm.total_votos_emitidos',
          'm.numero_mesa', 'm.total_electores_habiles',
          'l.nombre as local_nombre', 'd.nombre as distrito_nombre'
        ),
      db('distritos').select('id', 'nombre')
    ]);

    const resultadoIds = resultados.map((r) => r.id);
    const detalles = resultadoIds.length
      ? await db('detalle_resultados').whereIn('resultado_id', resultadoIds).select('*')
      : [];

    const detallePorResultado = {};
    detalles.forEach((d) => {
      if (!detallePorResultado[d.resultado_id]) detallePorResultado[d.resultado_id] = {};
      detallePorResultado[d.resultado_id][d.candidato_id] = d.votos;
    });

    // Calcular votos totales por candidato
    const votosPorCandidato = {};
    candidatos.forEach((c) => { votosPorCandidato[c.id] = 0; });
    let totalValidos = 0;
    let totalBlancos = 0;
    let totalNulos = 0;
    let totalImpugnados = 0;
    let totalEmitidos = 0;

    resultados.forEach((r) => {
      totalBlancos += Number(r.votos_blanco || 0);
      totalNulos += Number(r.votos_nulo || 0);
      totalImpugnados += Number(r.votos_impugnados || 0);
      totalEmitidos += Number(r.total_votos_emitidos || 0);

      const dMap = detallePorResultado[r.id] || {};
      candidatos.forEach((c) => {
        const v = Number(dMap[c.id] || 0);
        votosPorCandidato[c.id] += v;
        totalValidos += v;
      });
    });

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen de Candidatos
    const candAoa = [
      [`CÓMPUTO DE RESULTADOS (${tipo_eleccion.toUpperCase()})`],
      [`Mesas Procesadas: ${resultados.length} | Total Votos Emitidos: ${totalEmitidos} | Total Válidos: ${totalValidos}`],
      [],
      ['N° Lista', 'Organización Política', 'Siglas', 'Candidato', 'Total Votos', '% Votos Válidos', '% Votos Emitidos']
    ];

    candidatos.forEach((c) => {
      const v = votosPorCandidato[c.id] || 0;
      const pctVal = totalValidos ? ((v / totalValidos) * 100).toFixed(2) + '%' : '0.00%';
      const pctEmi = totalEmitidos ? ((v / totalEmitidos) * 100).toFixed(2) + '%' : '0.00%';
      candAoa.push([
        c.numero_lista,
        c.organizacion_politica,
        c.siglas || '-',
        c.nombre_completo,
        v,
        pctVal,
        pctEmi
      ]);
    });

    candAoa.push([]);
    candAoa.push(['OTROS VOTOS', '', '', '', '', '', '']);
    candAoa.push(['Votos en Blanco', '', '', '', totalBlancos, '-', totalEmitidos ? ((totalBlancos / totalEmitidos) * 100).toFixed(2) + '%' : '0.00%']);
    candAoa.push(['Votos Nulos', '', '', '', totalNulos, '-', totalEmitidos ? ((totalNulos / totalEmitidos) * 100).toFixed(2) + '%' : '0.00%']);
    candAoa.push(['Votos Impugnados', '', '', '', totalImpugnados, '-', totalEmitidos ? ((totalImpugnados / totalEmitidos) * 100).toFixed(2) + '%' : '0.00%']);
    candAoa.push(['TOTAL EMITIDOS', '', '', '', totalEmitidos, '-', '100.00%']);

    const wsCand = XLSX.utils.aoa_to_sheet(candAoa);
    wsCand['!cols'] = [
      { wch: 10 }, { wch: 34 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsCand, 'Votación por Candidato');

    // Hoja 2: Detalle por Mesa
    const mesaHeader = ['N°', 'Mesa', 'Distrito', 'Local de Votación', 'Estado Acta', 'Electores Hábiles'];
    candidatos.forEach((c) => { mesaHeader.push(`Lista ${c.numero_lista} (${c.siglas || c.organizacion_politica})`); });
    mesaHeader.push('Votos Blanco', 'Votos Nulos', 'Votos Impugnados', 'Total Votos');

    const mesaAoa = [mesaHeader];
    resultados.forEach((r, idx) => {
      const row = [
        idx + 1,
        String(r.numero_mesa),
        r.distrito_nombre,
        r.local_nombre,
        (r.estado || '').toUpperCase(),
        r.total_electores_habiles || 0
      ];
      const dMap = detallePorResultado[r.id] || {};
      candidatos.forEach((c) => {
        row.push(Number(dMap[c.id] || 0));
      });
      row.push(
        Number(r.votos_blanco || 0),
        Number(r.votos_nulo || 0),
        Number(r.votos_impugnados || 0),
        Number(r.total_votos_emitidos || 0)
      );
      mesaAoa.push(row);
    });

    const wsMesa = XLSX.utils.aoa_to_sheet(mesaAoa);
    XLSX.utils.book_append_sheet(wb, wsMesa, 'Detalle por Mesa');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Resultados_Computo_${tipo_eleccion}_${timestamp}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error al exportar resultados:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al generar Excel de resultados', error: error.message });
    }
  }
};
