import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const getAll = async (req, res) => {
  try {
    const { local_id, distrito_id, estado, q, disponible, page = 1, limit = 50 } = req.query;
    let query = db('mesas')
      .join('locales', 'mesas.local_id', 'locales.id')
      .join('distritos', 'locales.distrito_id', 'distritos.id')
      .leftJoin('asignacion_personeros', function() {
        this.on('mesas.id', '=', 'asignacion_personeros.mesa_id')
            .andOn('asignacion_personeros.activo', '=', db.raw('true'));
      })
      .leftJoin('usuarios', 'asignacion_personeros.usuario_id', 'usuarios.id')
      .select(
        'mesas.*',
        'locales.nombre as local_nombre',
        'locales.distrito_id',
        'distritos.nombre as distrito_nombre',
        'asignacion_personeros.id as asignacion_id',
        'usuarios.dni as personero_dni',
        db.raw("CONCAT(usuarios.nombres, ' ', usuarios.apellidos) as personero_nombre")
      );
    
    if (local_id) query = query.where('mesas.local_id', local_id);
    if (distrito_id) query = query.where('locales.distrito_id', distrito_id);
    if (estado) query = query.where('mesas.estado', estado);
    if (disponible === 'true') {
      query = query.whereNull('asignacion_personeros.id');
    }
    if (q) {
      query = query.where(function() {
        this.where('mesas.numero_mesa', 'ilike', `%${q}%`)
          .orWhere('locales.nombre', 'ilike', `%${q}%`);
      });
    }
    
    const parsedLimit = Number(limit) || 50;
    const parsedPage = Number(page) || 1;

    const totalQuery = query.clone().clearSelect().count('* as total').first();
    const [totalRes, mesas] = await Promise.all([
      totalQuery,
      query.orderBy('mesas.numero_mesa', 'asc').limit(parsedLimit).offset((parsedPage - 1) * parsedLimit)
    ]);
    
    res.json({ success: true, data: mesas, meta: { total: parseInt(totalRes.total), page: parsedPage, limit: parsedLimit }, message: 'Mesas listadas' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando mesas', error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const mesa = await db('mesas')
      .join('locales', 'mesas.local_id', 'locales.id')
      .join('distritos', 'locales.distrito_id', 'distritos.id')
      .select('mesas.*', 'locales.nombre as local_nombre', 'distritos.nombre as distrito_nombre')
      .where('mesas.id', id).first();
      
    if (!mesa) return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    
    const personero = await db('asignacion_personeros')
      .join('usuarios', 'asignacion_personeros.usuario_id', 'usuarios.id')
      .select('usuarios.id', 'usuarios.nombres', 'usuarios.apellidos', 'usuarios.dni')
      .where({ 'asignacion_personeros.mesa_id': id, 'asignacion_personeros.activo': true }).first();
      
    const resultado = await db('resultados_mesa').where({ mesa_id: id }).orderBy('created_at', 'desc').first();
      
    res.json({ success: true, data: { ...mesa, personero, resultado }, message: 'Mesa obtenida' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo mesa', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    await db.transaction(async trx => {
      const [id] = await trx('mesas').insert(req.body).returning('id');
      const mesa = await trx('mesas').where({ id: id.id || id }).first();
      
      await trx('locales').where({ id: req.body.local_id }).increment('total_mesas', 1);
      
      await registrarAuditoria('mesas', 'create', req.user.id, mesa, req.body, null, trx);
      res.status(201).json({ success: true, data: mesa, message: 'Mesa creada' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando mesa', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    await db.transaction(async trx => {
      const oldData = await trx('mesas').where({ id }).first();
      if (!oldData) return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
      
      await trx('mesas').where({ id }).update(req.body);
      const mesa = await trx('mesas').where({ id }).first();
      
      if (req.body.local_id && req.body.local_id !== oldData.local_id) {
        await trx('locales').where({ id: oldData.local_id }).decrement('total_mesas', 1);
        await trx('locales').where({ id: req.body.local_id }).increment('total_mesas', 1);
      }
      
      await registrarAuditoria('mesas', 'update', req.user.id, mesa, req.body, oldData, trx);
      res.json({ success: true, data: mesa, message: 'Mesa actualizada' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando mesa', error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await db.transaction(async trx => {
      const oldData = await trx('mesas').where({ id }).first();
      if (!oldData) return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
      
      const count = await trx('resultados_mesa').where({ mesa_id: id }).count('id as c').first();
      if (parseInt(count.c) > 0) {
        return res.status(400).json({ success: false, message: 'Mesa tiene resultados asociados' });
      }

      await trx('mesas').where({ id }).del();
      await trx('locales').where({ id: oldData.local_id }).decrement('total_mesas', 1);
      
      await registrarAuditoria('mesas', 'delete', req.user.id, { id }, null, oldData, trx);
      res.json({ success: true, data: null, message: 'Mesa eliminada' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando mesa', error: error.message });
  }
};
