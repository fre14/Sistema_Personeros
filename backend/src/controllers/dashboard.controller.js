import db from '../config/database.js';
import { cacheWrap } from '../services/cache.service.js';

/**
 * Dashboard en tiempo real.
 *
 * Correcciones respecto a la version anterior:
 *  - Consultaba las tablas "mesas" y "locales", que no existen (el esquema
 *    real usa mesas_sufragio y locales_votacion). Dependia de un script
 *    manual que creaba vistas; si no se ejecutaba, el dashboard fallaba.
 *  - Los reportes por distrito y por local devolvian [] siempre.
 *  - La auditoria ordenaba por "created_at", columna que no existe (es "fecha").
 *  - Cada refresco lanzaba 6 agregaciones sin cache.
 */

const TTL = Number(process.env.CACHE_TTL_SECONDS || 5);
const num = (v) => Number(v || 0);

export const getResumen = async (req, res) => {
  try {
    const { distrito_id, local_id } = req.query;
    if (distrito_id || local_id) {
      const clave = `dashboard:resumen:${distrito_id || 'all'}:${local_id || 'all'}`;
      const data = await cacheWrap(clave, TTL, async () => {
        let mesaQuery = db('mesas_sufragio as m')
          .join('locales_votacion as l', 'm.local_id', 'l.id');

        if (distrito_id) mesaQuery = mesaQuery.where('l.distrito_id', distrito_id);
        if (local_id) mesaQuery = mesaQuery.where('m.local_id', local_id);

        const [totalMesas, estadosMesa, totalLocales] = await Promise.all([
          mesaQuery.clone().count('m.id as c').first(),
          mesaQuery.clone().select('m.estado').count('m.id as c').groupBy('m.estado'),
          mesaQuery.clone().countDistinct('m.local_id as c').first(),
        ]);

        const porEstado = estadosMesa.reduce((acc, row) => {
          acc[row.estado] = num(row.c);
          return acc;
        }, {});

        const total = num(totalMesas?.c);
        const verificadas = porEstado.verificada || 0;
        const reportadas = porEstado.reportada || 0;

        let votosQuery = db('resultados_mesa as rm')
          .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
          .join('locales_votacion as l', 'm.local_id', 'l.id')
          .where('rm.estado', 'verificado');

        if (distrito_id) votosQuery = votosQuery.where('l.distrito_id', distrito_id);
        if (local_id) votosQuery = votosQuery.where('m.local_id', local_id);

        const votos = await votosQuery.sum('rm.total_votos_emitidos as s').first();

        return {
          total_mesas: total,
          mesas_pendientes: porEstado.pendiente || 0,
          mesas_reportadas: reportadas,
          mesas_verificadas: verificadas,
          mesas_observadas: porEstado.observada || 0,
          total_locales: num(totalLocales?.c),
          porcentaje_avance: total ? Number(((verificadas / total) * 100).toFixed(2)) : 0,
          porcentaje_procesado: total ? Number((((verificadas + reportadas) / total) * 100).toFixed(2)) : 0,
          total_votos_contados: num(votos?.s),
          actualizado_en: new Date().toISOString(),
        };
      });
      return res.json({ success: true, data, message: 'Resumen obtenido' });
    }

    const data = await cacheWrap('dashboard:resumen', TTL, async () => {
      const [
        totalMesas, estadosMesa, totalPersoneros, personerosAsignados,
        totalLocales, totalCoordinadores, votos,
      ] = await Promise.all([
        db('mesas_sufragio').count('id as c').first(),
        db('mesas_sufragio').select('estado').count('id as c').groupBy('estado'),
        db('usuarios').where({ rol: 'personero', activo: true }).count('id as c').first(),
        db('asignacion_personeros').where({ activo: true }).count('id as c').first(),
        db('locales_votacion').count('id as c').first(),
        db('usuarios').where({ rol: 'coordinador', activo: true }).count('id as c').first(),
        db('resultados_mesa').where({ estado: 'verificado' })
          .sum('total_votos_emitidos as s').first(),
      ]);

      const porEstado = estadosMesa.reduce((acc, row) => {
        acc[row.estado] = num(row.c);
        return acc;
      }, {});

      const total = num(totalMesas.c);
      const verificadas = porEstado.verificada || 0;
      const reportadas = porEstado.reportada || 0;
      const personeros = num(totalPersoneros.c);
      const asignados = num(personerosAsignados.c);

      return {
        total_mesas: total,
        mesas_pendientes: porEstado.pendiente || 0,
        mesas_reportadas: reportadas,
        mesas_verificadas: verificadas,
        mesas_observadas: porEstado.observada || 0,
        total_personeros: personeros,
        personeros_asignados: asignados,
        personeros_sin_asignar: Math.max(personeros - asignados, 0),
        total_coordinadores: num(totalCoordinadores.c),
        total_locales: num(totalLocales.c),
        porcentaje_avance: total ? Number(((verificadas / total) * 100).toFixed(2)) : 0,
        porcentaje_procesado: total ? Number((((verificadas + reportadas) / total) * 100).toFixed(2)) : 0,
        total_votos_contados: num(votos.s),
        actualizado_en: new Date().toISOString(),
      };
    });

    res.json({ success: true, data, message: 'Resumen obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo resumen', error: error.message });
  }
};

export const getComposicionVoto = async (req, res) => {
  try {
    const { distrito_id, local_id } = req.query;
    const clave = `dashboard:composicion:${distrito_id || 'all'}:${local_id || 'all'}`;

    const data = await cacheWrap(clave, TTL, async () => {
      let query = db('resultados_mesa as rm')
        .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
        .join('locales_votacion as l', 'm.local_id', 'l.id')
        .where('rm.estado', 'verificado');

      if (distrito_id) query = query.where('l.distrito_id', distrito_id);
      if (local_id) query = query.where('m.local_id', local_id);

      const fila = await query.select(
        db.raw('COALESCE(SUM(rm.total_votos_emitidos), 0) as total_emitidos'),
        db.raw('COALESCE(SUM(rm.votos_blanco), 0) as votos_blanco'),
        db.raw('COALESCE(SUM(rm.votos_nulo), 0) as votos_nulo'),
        db.raw('COALESCE(SUM(rm.votos_impugnados), 0) as votos_impugnados')
      ).first();

      const emitidos = num(fila?.total_emitidos);
      const blanco = num(fila?.votos_blanco);
      const nulo = num(fila?.votos_nulo);
      const impugnados = num(fila?.votos_impugnados);
      const validos = Math.max(0, emitidos - blanco - nulo - impugnados);

      return {
        total_emitidos: emitidos,
        votos_validos: validos,
        votos_blanco: blanco,
        votos_nulo: nulo,
        votos_impugnados: impugnados,
        porcentaje_validos: emitidos ? Number(((validos / emitidos) * 100).toFixed(2)) : 0,
        porcentaje_blanco: emitidos ? Number(((blanco / emitidos) * 100).toFixed(2)) : 0,
        porcentaje_nulo: emitidos ? Number(((nulo / emitidos) * 100).toFixed(2)) : 0,
        porcentaje_impugnados: emitidos ? Number(((impugnados / emitidos) * 100).toFixed(2)) : 0,
      };
    });

    res.json({ success: true, data, message: 'Composición de votos obtenida' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo composición de votos', error: error.message });
  }
};

export const getResultadosPorCandidato = async (req, res) => {
  try {
    const { distrito_id, local_id } = req.query;
    const clave = `dashboard:candidatos:${distrito_id || 'all'}:${local_id || 'all'}`;

    const data = await cacheWrap(clave, TTL, async () => {
      let query = db('detalle_resultados as dr')
        .join('resultados_mesa as rm', 'dr.resultado_id', 'rm.id')
        .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
        .join('locales_votacion as l', 'm.local_id', 'l.id')
        .join('candidatos as c', 'dr.candidato_id', 'c.id')
        .where('rm.estado', 'verificado')
        .select('c.id', 'c.nombre_completo', 'c.organizacion_politica', 'c.siglas', 'c.numero_lista')
        .sum('dr.votos as total_votos')
        .groupBy('c.id', 'c.nombre_completo', 'c.organizacion_politica', 'c.siglas', 'c.numero_lista');

      if (distrito_id) query = query.where('l.distrito_id', distrito_id);
      if (local_id) query = query.where('m.local_id', local_id);

      const filas = await query.orderBy('total_votos', 'desc');
      const total = filas.reduce((acc, f) => acc + num(f.total_votos), 0);

      return filas.map((f) => ({
        ...f,
        total_votos: num(f.total_votos),
        porcentaje: total ? Number(((num(f.total_votos) / total) * 100).toFixed(2)) : 0,
      }));
    });

    res.json({ success: true, data, message: 'Resultados por candidato' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo resultados', error: error.message });
  }
};

export const getResultadosPorDistrito = async (req, res) => {
  try {
    const data = await cacheWrap('dashboard:distritos', TTL, async () => {
      const filas = await db('distritos as d')
        .leftJoin('locales_votacion as l', 'l.distrito_id', 'd.id')
        .leftJoin('mesas_sufragio as m', 'm.local_id', 'l.id')
        .leftJoin('resultados_mesa as rm', function () {
          this.on('rm.mesa_id', '=', 'm.id').andOn('rm.estado', '=', db.raw('?', ['verificado']));
        })
        .select('d.id', 'd.nombre', 'd.codigo')
        .count('m.id as total_mesas')
        .countDistinct('l.id as total_locales')
        .sum('rm.total_votos_emitidos as votos_contados')
        .groupBy('d.id', 'd.nombre', 'd.codigo')
        .orderBy('d.nombre', 'asc');

      const verificadasPorDistrito = await db('mesas_sufragio as m')
        .join('locales_votacion as l', 'm.local_id', 'l.id')
        .where('m.estado', 'verificada')
        .select('l.distrito_id')
        .count('m.id as c')
        .groupBy('l.distrito_id');

      const mapaVerif = verificadasPorDistrito.reduce((acc, r) => {
        acc[r.distrito_id] = num(r.c);
        return acc;
      }, {});

      return filas.map((f) => {
        const totalMesas = num(f.total_mesas);
        const verificadas = mapaVerif[f.id] || 0;
        return {
          id: f.id,
          nombre: f.nombre,
          codigo: f.codigo,
          total_locales: num(f.total_locales),
          total_mesas: totalMesas,
          mesas_verificadas: verificadas,
          votos_contados: num(f.votos_contados),
          porcentaje_avance: totalMesas ? Number(((verificadas / totalMesas) * 100).toFixed(2)) : 0,
        };
      });
    });

    res.json({ success: true, data, message: 'Resultados por distrito' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo distritos', error: error.message });
  }
};

export const getResultadosPorLocal = async (req, res) => {
  try {
    const { distrito_id } = req.query;
    const clave = `dashboard:locales:${distrito_id || 'all'}`;

    const data = await cacheWrap(clave, TTL, async () => {
      let base = db('locales_votacion as l')
        .join('distritos as d', 'l.distrito_id', 'd.id')
        .leftJoin('mesas_sufragio as m', 'm.local_id', 'l.id')
        .select('l.id', 'l.nombre', 'l.direccion', 'd.nombre as distrito_nombre')
        .count('m.id as total_mesas')
        .groupBy('l.id', 'l.nombre', 'l.direccion', 'd.nombre')
        .orderBy('l.nombre', 'asc');

      if (distrito_id) base = base.where('l.distrito_id', distrito_id);

      const locales = await base;

      const porEstado = await db('mesas_sufragio as m')
        .select('m.local_id', 'm.estado')
        .count('m.id as c')
        .groupBy('m.local_id', 'm.estado');

      const mapa = porEstado.reduce((acc, r) => {
        acc[r.local_id] = acc[r.local_id] || {};
        acc[r.local_id][r.estado] = num(r.c);
        return acc;
      }, {});

      let votosPorLocal = [];
      try {
        const resVotos = await db('resultados_mesa as rm')
          .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
          .where('rm.estado', 'verificado')
          .select('m.local_id')
          .sum('rm.total_votos_emitidos as votos')
          .groupBy('m.local_id');
        if (Array.isArray(resVotos)) votosPorLocal = resVotos;
      } catch {
        votosPorLocal = [];
      }

      const mapaVotos = votosPorLocal.reduce((acc, r) => {
        acc[r.local_id] = num(r.votos);
        return acc;
      }, {});

      return locales.map((l) => {
        const estados = mapa[l.id] || {};
        const totalMesas = num(l.total_mesas);
        const verificadas = estados.verificada || 0;
        return {
          ...l,
          total_mesas: totalMesas,
          mesas_pendientes: estados.pendiente || 0,
          mesas_reportadas: estados.reportada || 0,
          mesas_verificadas: verificadas,
          mesas_observadas: estados.observada || 0,
          votos_contados: mapaVotos[l.id] || 0,
          porcentaje_avance: totalMesas ? Number(((verificadas / totalMesas) * 100).toFixed(2)) : 0,
        };
      });
    });

    res.json({ success: true, data, message: 'Resultados por local' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo locales', error: error.message });
  }
};

export const getMesasPendientes = async (req, res) => {
  try {
    const { distrito_id, local_id, limit = 200 } = req.query;

    let query = db('mesas_sufragio as m')
      .join('locales_votacion as l', 'm.local_id', 'l.id')
      .join('distritos as d', 'l.distrito_id', 'd.id')
      .leftJoin('asignacion_personeros as ap', function () {
        this.on('ap.mesa_id', '=', 'm.id').andOn('ap.activo', '=', db.raw('true'));
      })
      .leftJoin('usuarios as u', 'ap.usuario_id', 'u.id')
      .where('m.estado', 'pendiente')
      .select(
        'm.id', 'm.numero_mesa', 'm.estado', 'm.total_electores_habiles',
        'l.id as local_id', 'l.nombre as local_nombre',
        'd.nombre as distrito_nombre',
        'u.dni as personero_dni',
        db.raw("CONCAT(u.nombres, ' ', u.apellidos) as personero_nombre"),
        'u.telefono as personero_telefono'
      )
      .orderBy('m.numero_mesa', 'asc')
      .limit(Number(limit) || 200);

    if (distrito_id) query = query.where('l.distrito_id', distrito_id);
    if (local_id) query = query.where('m.local_id', local_id);

    const mesas = await query;
    res.json({ success: true, data: mesas, message: 'Mesas pendientes' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo mesas pendientes', error: error.message });
  }
};

export const getAuditoria = async (req, res) => {
  try {
    const { page = 1, limit = 50, tabla, usuario_id, q } = req.query;
    const parsedLimit = Math.min(Number(limit) || 50, 200);
    const parsedPage = Math.max(Number(page) || 1, 1);

    let query = db('auditoria as a')
      .leftJoin('usuarios as u', 'a.usuario_id', 'u.id')
      .select(
        'a.*',
        'a.fecha as created_at',
        'u.dni as usuario_dni',
        'u.rol as usuario_rol',
        db.raw("CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre")
      );

    if (tabla) query = query.where('a.tabla_afectada', tabla);
    if (usuario_id) query = query.where('a.usuario_id', usuario_id);
    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      query = query.where(function() {
        this.whereILike('a.tabla_afectada', term)
          .orWhereILike('u.dni', term)
          .orWhereILike('u.nombres', term)
          .orWhereILike('u.apellidos', term)
          .orWhereILike('a.ip_address', term);
      });
    }

    const totalRes = await query.clone().clearSelect().clearOrder().count('* as total').first();

    const registros = await query.orderBy('a.fecha', 'desc')
      .limit(parsedLimit)
      .offset((parsedPage - 1) * parsedLimit);

    res.json({
      success: true,
      data: registros,
      meta: { total: num(totalRes?.total || 0), page: parsedPage, limit: parsedLimit },
      message: 'Auditoria obtenida',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo auditoria', error: error.message });
  }
};
