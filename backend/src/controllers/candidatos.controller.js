import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const getAll = async (req, res) => {
  try {
    const candidatos = await db('candidatos').where({ activo: true }).orderBy('numero_lista', 'asc');
    res.json({ success: true, data: candidatos, message: 'Candidatos listados' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando candidatos', error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidato = await db('candidatos').where({ id, activo: true }).first();
    if (!candidato) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    res.json({ success: true, data: candidato, message: 'Candidato obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo candidato', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const [id] = await db('candidatos').insert(req.body).returning('id');
    const candidato = await db('candidatos').where({ id: id.id || id }).first();
    await registrarAuditoria('candidatos', 'create', req.user.id, candidato, req.body);
    res.status(201).json({ success: true, data: candidato, message: 'Candidato creado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando candidato', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('candidatos').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    
    await db('candidatos').where({ id }).update(req.body);
    const candidato = await db('candidatos').where({ id }).first();
    await registrarAuditoria('candidatos', 'update', req.user.id, candidato, req.body, oldData);
    res.json({ success: true, data: candidato, message: 'Candidato actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando candidato', error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('candidatos').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    
    await db('candidatos').where({ id }).update({ activo: false });
    const candidato = await db('candidatos').where({ id }).first();
    await registrarAuditoria('candidatos', 'delete', req.user.id, candidato, { activo: false }, oldData);
    res.json({ success: true, data: null, message: 'Candidato eliminado (soft)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando candidato', error: error.message });
  }
};
