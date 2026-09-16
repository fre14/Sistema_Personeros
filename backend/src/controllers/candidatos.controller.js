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
    let candidato = await db('candidatos').where({ id, activo: true }).first();
    if (!candidato && !isNaN(Number(id))) {
      candidato = await db('candidatos').where({ numero_lista: Number(id), activo: true }).first();
    }
    if (!candidato) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    res.json({ success: true, data: candidato, message: 'Candidato obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo candidato', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const insertData = {
      nombre_completo: req.body.nombre_completo,
      organizacion_politica: req.body.organizacion_politica,
      siglas: req.body.siglas || '',
      numero_lista: Number(req.body.numero_lista),
      activo: true
    };
    const [idRes] = await db('candidatos').insert(insertData).returning('id');
    const newId = idRes.id || idRes;
    const candidato = await db('candidatos').where({ id: newId }).first();
    await registrarAuditoria('candidatos', 'create', req.user.id, candidato, insertData);
    res.status(201).json({ success: true, data: candidato, message: 'Candidato creado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando candidato', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    let oldData = await db('candidatos').where({ id }).first();
    if (!oldData && !isNaN(Number(id))) {
      oldData = await db('candidatos').where({ numero_lista: Number(id) }).first();
    }
    if (!oldData) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    
    const updateData = {};
    if (req.body.nombre_completo !== undefined) updateData.nombre_completo = req.body.nombre_completo;
    if (req.body.organizacion_politica !== undefined) updateData.organizacion_politica = req.body.organizacion_politica;
    if (req.body.siglas !== undefined) updateData.siglas = req.body.siglas;
    if (req.body.numero_lista !== undefined) updateData.numero_lista = Number(req.body.numero_lista);
    if (req.body.foto_url !== undefined) updateData.foto_url = req.body.foto_url;
    if (req.body.logo_url !== undefined) updateData.logo_url = req.body.logo_url;
    if (req.body.activo !== undefined) updateData.activo = req.body.activo;
    updateData.updated_at = new Date();

    await db('candidatos').where({ id: oldData.id }).update(updateData);
    const candidato = await db('candidatos').where({ id: oldData.id }).first();
    await registrarAuditoria('candidatos', 'update', req.user.id, candidato, updateData, oldData);
    res.json({ success: true, data: candidato, message: 'Candidato actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando candidato', error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    let oldData = await db('candidatos').where({ id }).first();
    if (!oldData && !isNaN(Number(id))) {
      oldData = await db('candidatos').where({ numero_lista: Number(id) }).first();
    }
    if (!oldData) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    
    await db('candidatos').where({ id: oldData.id }).update({ activo: false, updated_at: new Date() });
    const candidato = await db('candidatos').where({ id: oldData.id }).first();
    await registrarAuditoria('candidatos', 'delete', req.user.id, candidato, { activo: false }, oldData);
    res.json({ success: true, data: null, message: 'Candidato eliminado (soft)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando candidato', error: error.message });
  }
};
