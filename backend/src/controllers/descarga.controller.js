import { ZipArchive } from 'archiver';
import path from 'path';
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
