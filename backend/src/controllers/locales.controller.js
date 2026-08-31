import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const getAll = async (req, res) => {
  try {
    const { q, distrito_id } = req.query;
    let query = db('locales')
      .join('distritos', 'locales.distrito_id', 'distritos.id')
      .select('locales.*', 'distritos.nombre as distrito_nombre');
    
    if (q) query = query.where('locales.nombre', 'ilike', `%${q}%`);
    if (distrito_id) query = query.where({ distrito_id });
    
    const locales = await query.orderBy('locales.nombre', 'asc');
    res.json({ success: true, data: locales, message: 'Locales listados' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando locales', error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const local = await db('locales')
      .join('distritos', 'locales.distrito_id', 'distritos.id')
      .select('locales.*', 'distritos.nombre as distrito_nombre')
      .where('locales.id', id).first();
      
    if (!local) return res.status(404).json({ success: false, message: 'Local no encontrado' });
    
    const mesas_count = await db('mesas').where({ local_id: id }).count('id as c').first();
    const coordinadores = await db('asignacion_coordinadores')
      .join('usuarios', 'asignacion_coordinadores.usuario_id', 'usuarios.id')
      .select('usuarios.id', 'usuarios.nombres', 'usuarios.apellidos', 'usuarios.dni')
      .where({ 'asignacion_coordinadores.local_id': id, 'asignacion_coordinadores.activo': true });
      
    res.json({ success: true, data: { ...local, mesas_count: parseInt(mesas_count.c), coordinadores }, message: 'Local obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo local', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const [id] = await db('locales').insert(req.body).returning('id');
    const local = await db('locales').where({ id: id.id || id }).first();
    await registrarAuditoria('locales', 'create', req.user.id, local, req.body);
    res.status(201).json({ success: true, data: local, message: 'Local creado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando local', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('locales').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Local no encontrado' });
    
    await db('locales').where({ id }).update(req.body);
    const local = await db('locales').where({ id }).first();
    await registrarAuditoria('locales', 'update', req.user.id, local, req.body, oldData);
    res.json({ success: true, data: local, message: 'Local actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando local', error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('locales').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Local no encontrado' });
    
    const count = await db('mesas').where({ local_id: id }).count('id as c').first();
    if (parseInt(count.c) > 0) {
      return res.status(400).json({ success: false, message: 'Local tiene mesas asociadas' });
    }

    await db('locales').where({ id }).del();
    await registrarAuditoria('locales', 'delete', req.user.id, { id }, null, oldData);
    res.json({ success: true, data: null, message: 'Local eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando local', error: error.message });
  }
};
