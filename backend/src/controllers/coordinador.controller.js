import db from '../config/database.js';

export const getMisLocales = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const esAdmin = req.user.rol === 'admin';

    let localesQuery = db('locales_votacion as l')
      .join('distritos as d', 'l.distrito_id', 'd.id');

    if (!esAdmin) {
      localesQuery = localesQuery
        .join('asignacion_coordinadores as ac', 'ac.local_id', 'l.id')
        .where({ 'ac.usuario_id': usuarioId, 'ac.activo': true });
    }

    const locales = await localesQuery
      .select('l.id', 'l.nombre', 'l.direccion', 'd.nombre as distrito', 'd.id as distrito_id', 'd.tiene_eleccion_distrital')
      .orderBy('l.nombre', 'asc');

    const localesConStats = await Promise.all(
      locales.map(async (local) => {
        const tieneDistrital = local.tiene_eleccion_distrital || false;

        const mesasEstados = await db('mesas_sufragio')
          .where({ local_id: local.id })
          .select('estado')
          .count('id as c')
          .groupBy('estado');

        const stats = {
          total: 0,
          pendientes: 0,
          reportadas: 0,
          verificadas: 0,
          observadas: 0,
          personeros_asignados: 0,
        };

        if (Array.isArray(mesasEstados)) {
          mesasEstados.forEach((fila) => {
            const count = parseInt(fila.c, 10) || 0;
            stats.total += count;
            if (fila.estado === 'pendiente') stats.pendientes += count;
            else if (fila.estado === 'reportada') stats.reportadas += count;
            else if (fila.estado === 'verificada') stats.verificadas += count;
            else if (fila.estado === 'observada') stats.observadas += count;
          });
        }

        const statsDistrital = {
          total: 0,
          pendientes: 0,
          reportadas: 0,
          verificadas: 0,
          observadas: 0,
        };

        if (tieneDistrital) {
          const mesasDistritales = await db('mesas_sufragio')
            .where({ local_id: local.id })
            .whereNotNull('estado_distrital')
            .select('estado_distrital')
            .count('id as c')
            .groupBy('estado_distrital');

          if (Array.isArray(mesasDistritales)) {
            mesasDistritales.forEach((fila) => {
              const count = parseInt(fila.c, 10) || 0;
              statsDistrital.total += count;
              if (fila.estado_distrital === 'pendiente') statsDistrital.pendientes += count;
              else if (fila.estado_distrital === 'reportada') statsDistrital.reportadas += count;
              else if (fila.estado_distrital === 'verificada') statsDistrital.verificadas += count;
              else if (fila.estado_distrital === 'observada') statsDistrital.observadas += count;
            });
          }
        }

        const personerosCount = await db('asignacion_personeros as ap')
          .join('mesas_sufragio as m', 'ap.mesa_id', 'm.id')
          .where({ 'm.local_id': local.id, 'ap.activo': true })
          .count('ap.id as c')
          .first();

        stats.personeros_asignados = parseInt(personerosCount?.c, 10) || 0;

        const resultado = {
          id: local.id,
          nombre: local.nombre,
          direccion: local.direccion,
          distrito: local.distrito,
          distrito_id: local.distrito_id,
          tiene_distrital: tieneDistrital,
          stats,
        };

        if (tieneDistrital) {
          resultado.stats_distrital = statsDistrital;
          resultado.avance_provincial = stats.total ? Number(((stats.verificadas / stats.total) * 100).toFixed(2)) : 0;
          resultado.avance_distrital = statsDistrital.total ? Number(((statsDistrital.verificadas / statsDistrital.total) * 100).toFixed(2)) : 0;
        }

        return resultado;
      })
    );

    res.json({
      success: true,
      data: localesConStats,
      message: 'Locales asignados obtenidos correctamente',
    });
  } catch (error) {
    console.error('Error obteniendo locales de coordinador:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo locales', error: error.message });
  }
};

export const getMesasDeLocal = async (req, res) => {
  try {
    const { localId } = req.params;
    const usuarioId = req.user.id;
    const esAdmin = req.user.rol === 'admin';

    if (!esAdmin) {
      const permiso = await db('asignacion_coordinadores')
        .where({ usuario_id: usuarioId, local_id: localId, activo: true })
        .first();
      if (!permiso) {
        return res.status(403).json({ success: false, message: 'No tiene asignado este local de votación' });
      }
    }

    const local = await db('locales_votacion as l')
      .join('distritos as d', 'l.distrito_id', 'd.id')
      .where('l.id', localId)
      .select('l.id', 'l.nombre', 'l.direccion', 'd.nombre as distrito', 'd.tiene_eleccion_distrital')
      .first();

    if (!local) {
      return res.status(404).json({ success: false, message: 'Local no encontrado' });
    }

    const tieneDistrital = local.tiene_eleccion_distrital || false;

    const mesas = await db('mesas_sufragio as m')
      .leftJoin('asignacion_personeros as ap', function () {
        this.on('ap.mesa_id', '=', 'm.id').andOn('ap.activo', '=', db.raw('true'));
      })
      .leftJoin('usuarios as u', 'ap.usuario_id', 'u.id')
      .leftJoin('resultados_mesa as rm_prov', function () {
        this.on('rm_prov.mesa_id', '=', 'm.id').andOn('rm_prov.tipo_eleccion', '=', db.raw("'provincial'"));
      })
      .leftJoin('resultados_mesa as rm_dist', function () {
        this.on('rm_dist.mesa_id', '=', 'm.id').andOn('rm_dist.tipo_eleccion', '=', db.raw("'distrital'"));
      })
      .where('m.local_id', localId)
      .select(
        'm.id',
        'm.numero_mesa',
        'm.estado',
        'm.estado_distrital',
        'm.total_electores_habiles as electores_habiles',
        'rm_prov.id as resultado_id',
        'rm_prov.estado as resultado_estado',
        'rm_prov.total_votos_emitidos',
        'rm_prov.subido_en as resultado_fecha',
        'rm_dist.id as resultado_distrital_id',
        'rm_dist.estado as resultado_distrital_estado',
        'rm_dist.total_votos_emitidos as votos_distrital',
        'rm_dist.subido_en as resultado_distrital_fecha',
        'u.id as personero_id',
        db.raw("CONCAT(u.nombres, ' ', u.apellidos) as personero_nombre"),
        'u.dni as personero_dni',
        'u.telefono as personero_telefono',
        'u.activo as personero_activo'
      )
      .orderBy('m.numero_mesa', 'asc');

    res.json({
      success: true,
      data: {
        local: { ...local, tiene_distrital: tieneDistrital },
        mesas,
      },
      message: 'Mesas del local obtenidas correctamente',
    });
  } catch (error) {
    console.error('Error obteniendo mesas del local:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo mesas', error: error.message });
  }
};

export const getPersonerosSupervisados = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const esAdmin = req.user.rol === 'admin';
    const { localId, q } = req.query;

    let query = db('asignacion_personeros as ap')
      .join('usuarios as u', 'ap.usuario_id', 'u.id')
      .join('mesas_sufragio as m', 'ap.mesa_id', 'm.id')
      .join('locales_votacion as l', 'm.local_id', 'l.id')
      .join('distritos as d', 'l.distrito_id', 'd.id')
      .leftJoin('resultados_mesa as rm', function () {
        this.on('rm.mesa_id', '=', 'm.id').andOn('rm.tipo_eleccion', '=', db.raw("'provincial'"));
      })
      .where('ap.activo', true);

    if (!esAdmin) {
      query = query.whereIn('l.id', function () {
        this.select('local_id')
          .from('asignacion_coordinadores')
          .where({ usuario_id: usuarioId, activo: true });
      });
    }

    if (localId) {
      query = query.where('l.id', localId);
    }

    if (q) {
      query = query.where(function () {
        this.where('u.dni', 'ilike', `%${q}%`)
          .orWhere('u.nombres', 'ilike', `%${q}%`)
          .orWhere('u.apellidos', 'ilike', `%${q}%`)
          .orWhere('m.numero_mesa', 'ilike', `%${q}%`)
          .orWhere('l.nombre', 'ilike', `%${q}%`);
      });
    }

    const personeros = await query
      .select(
        'u.id as personero_id',
        'u.dni',
        'u.nombres',
        'u.apellidos',
        db.raw("CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo"),
        'u.telefono',
        'u.email',
        'u.activo',
        'ap.id as asignacion_id',
        'ap.asignado_en',
        'm.id as mesa_id',
        'm.numero_mesa',
        'm.estado as estado_mesa',
        'm.estado_distrital',
        'm.total_electores_habiles',
        'l.id as local_id',
        'l.nombre as local_nombre',
        'l.direccion as local_direccion',
        'd.id as distrito_id',
        'd.nombre as distrito_nombre',
        'd.tiene_eleccion_distrital',
        'rm.id as resultado_id',
        'rm.estado as estado_resultado',
        'rm.total_votos_emitidos',
        'rm.subido_en as resultado_fecha'
      )
      .orderBy('l.nombre', 'asc')
      .orderBy('m.numero_mesa', 'asc');

    res.json({
      success: true,
      data: personeros,
      message: 'Personeros supervisados listados correctamente',
    });
  } catch (error) {
    console.error('Error obteniendo personeros supervisados:', error);
    res.status(500).json({ success: false, message: 'Error listando personeros supervisados', error: error.message });
  }
};
