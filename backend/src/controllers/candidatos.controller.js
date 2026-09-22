import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const getAll = async (req, res) => {
  try {
    const { tipo_eleccion, distrito_id } = req.query;
    let query = db('candidatos')
      .leftJoin('distritos', 'candidatos.distrito_id', 'distritos.id')
      .where({ activo: true })
      .select('candidatos.*', 'distritos.nombre as distrito_nombre');

    if (tipo_eleccion) {
      query = query.where({ tipo_eleccion });
    }
    if (distrito_id) {
      query = query.where({ distrito_id: Number(distrito_id) });
    }

    const candidatos = await query.orderBy('candidatos.numero_lista', 'asc');
    res.json({ success: true, data: candidatos, message: 'Candidatos listados' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando candidatos', error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    let candidato = await db('candidatos as c')
      .leftJoin('distritos as d', 'c.distrito_id', 'd.id')
      .where({ 'c.id': id, 'c.activo': true })
      .select('c.*', 'd.nombre as distrito_nombre')
      .first();

    if (!candidato && !isNaN(Number(id))) {
      candidato = await db('candidatos as c')
        .leftJoin('distritos as d', 'c.distrito_id', 'd.id')
        .where({ 'c.numero_lista': Number(id), 'c.activo': true })
        .select('c.*', 'd.nombre as distrito_nombre')
        .first();
    }
    if (!candidato) return res.status(404).json({ success: false, message: 'Candidato no encontrado' });
    res.json({ success: true, data: candidato, message: 'Candidato obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo candidato', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const tipoEleccion = req.body.tipo_eleccion || 'provincial';
    const distritoId = req.body.distrito_id ? Number(req.body.distrito_id) : null;

    if (tipoEleccion === 'distrital' && !distritoId) {
      return res.status(400).json({ success: false, message: 'Los candidatos distritales requieren indicar el distrito' });
    }

    const insertData = {
      nombre_completo: req.body.nombre_completo,
      organizacion_politica: req.body.organizacion_politica,
      siglas: req.body.siglas || '',
      numero_lista: Number(req.body.numero_lista),
      tipo_eleccion: tipoEleccion,
      distrito_id: tipoEleccion === 'distrital' ? distritoId : null,
      foto_url: req.body.foto_url || null,
      logo_url: req.body.logo_url || null,
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
    if (req.body.tipo_eleccion !== undefined) updateData.tipo_eleccion = req.body.tipo_eleccion;
    if (req.body.distrito_id !== undefined) updateData.distrito_id = req.body.distrito_id ? Number(req.body.distrito_id) : null;
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
