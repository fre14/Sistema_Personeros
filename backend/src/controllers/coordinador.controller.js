import db from '../config/database.js';

/**
 * Controlador para la gestión y supervisión de Coordinadores de Local.
 * 
 * Regla de negocio fundamental:
 * Al coordinar un local de votación, todos los personeros asignados a las mesas
 * de dicho local pertenecen y son supervisados automáticamente por el coordinador.
 */

// Listar todos los locales asignados al coordinador autenticado
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
      .select('l.id', 'l.nombre', 'l.direccion', 'd.nombre as distrito', 'd.id as distrito_id')
      .orderBy('l.nombre', 'asc');

    // Obtener estadísticas de cada local
    const localesConStats = await Promise.all(
      locales.map(async (local) => {
        // Conteo de mesas por estado
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

        mesasEstados.forEach((fila) => {
          const count = parseInt(fila.c, 10) || 0;
          stats.total += count;
          if (fila.estado === 'pendiente') stats.pendientes += count;
          else if (fila.estado === 'reportada') stats.reportadas += count;
          else if (fila.estado === 'verificada') stats.verificadas += count;
          else if (fila.estado === 'observada') stats.observadas += count;
        });

        // Conteo de personeros activos asignados a mesas de este local
        const personerosCount = await db('asignacion_personeros as ap')
          .join('mesas_sufragio as m', 'ap.mesa_id', 'm.id')
          .where({ 'm.local_id': local.id, 'ap.activo': true })
          .count('ap.id as c')
          .first();

        stats.personeros_asignados = parseInt(personerosCount?.c, 10) || 0;

        return {
          id: local.id,
          nombre: local.nombre,
          direccion: local.direccion,
          distrito: local.distrito,
          distrito_id: local.distrito_id,
          stats,
        };
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

// Obtener todas las mesas de un local asignado con la información de sus personeros supervisados
export const getMesasDeLocal = async (req, res) => {
  try {
    const { localId } = req.params;
    const usuarioId = req.user.id;
    const esAdmin = req.user.rol === 'admin';

    // Verificar permiso sobre el local
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
      .select('l.id', 'l.nombre', 'l.direccion', 'd.nombre as distrito')
      .first();

    if (!local) {
      return res.status(404).json({ success: false, message: 'Local no encontrado' });
    }

    // Obtener mesas con el personero asignado y el resultado más reciente
    const mesas = await db('mesas_sufragio as m')
      .leftJoin('asignacion_personeros as ap', function () {
        this.on('ap.mesa_id', '=', 'm.id').andOn('ap.activo', '=', db.raw('true'));
      })
      .leftJoin('usuarios as u', 'ap.usuario_id', 'u.id')
      .leftJoin('resultados_mesa as rm', 'rm.mesa_id', 'm.id')
      .where('m.local_id', localId)
      .select(
        'm.id',
        'm.numero_mesa',
        'm.estado',
        'm.total_electores_habiles as electores_habiles',
        'rm.id as resultado_id',
        'rm.estado as resultado_estado',
        'rm.total_votos_emitidos',
        'rm.subido_en as resultado_fecha',
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
        local,
        mesas,
      },
      message: 'Mesas del local obtenidas correctamente',
    });
  } catch (error) {
    console.error('Error obteniendo mesas del local:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo mesas', error: error.message });
  }
};

// Obtener todos los personeros supervisados automáticamente por el coordinador
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
      .leftJoin('resultados_mesa as rm', 'rm.mesa_id', 'm.id')
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
        'm.total_electores_habiles',
        'l.id as local_id',
        'l.nombre as local_nombre',
        'l.direccion as local_direccion',
        'd.id as distrito_id',
        'd.nombre as distrito_nombre',
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
