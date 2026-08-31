import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const getAll = async (req, res) => {
  try {
    const { q } = req.query;
    let query = db('distritos');
    if (q) {
      query = query.where('nombre', 'ilike', `%${q}%`);
    }
    const distritos = await query.orderBy('nombre', 'asc');
    res.json({ success: true, data: distritos, message: 'Distritos listados' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando distritos', error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const distrito = await db('distritos').where({ id }).first();
    if (!distrito) return res.status(404).json({ success: false, message: 'Distrito no encontrado' });
    res.json({ success: true, data: distrito, message: 'Distrito obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo distrito', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const [id] = await db('distritos').insert(req.body).returning('id');
    const distrito = await db('distritos').where({ id: id.id || id }).first();
    await registrarAuditoria('distritos', 'create', req.user.id, distrito, req.body);
    res.status(201).json({ success: true, data: distrito, message: 'Distrito creado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando distrito', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('distritos').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Distrito no encontrado' });
    
    await db('distritos').where({ id }).update(req.body);
    const distrito = await db('distritos').where({ id }).first();
    await registrarAuditoria('distritos', 'update', req.user.id, distrito, req.body, oldData);
    res.json({ success: true, data: distrito, message: 'Distrito actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando distrito', error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('distritos').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Distrito no encontrado' });
    
    const count = await db('locales').where({ distrito_id: id }).count('id as c').first();
    if (parseInt(count.c) > 0) {
      return res.status(400).json({ success: false, message: 'Distrito tiene locales asociados' });
    }

    await db('distritos').where({ id }).del();
    await registrarAuditoria('distritos', 'delete', req.user.id, { id }, null, oldData);
    res.json({ success: true, data: null, message: 'Distrito eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando distrito', error: error.message });
  }
};
