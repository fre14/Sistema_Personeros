import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const getAll = async (req, res) => {
  try {
    const { rol, q, page = 1, limit = 50 } = req.query;
    let query = db('usuarios').select('id', 'dni', 'nombres', 'apellidos', 'telefono', 'email', 'rol', 'activo', 'created_at');
    
    if (rol) query = query.where({ rol });
    if (q) {
      query = query.where(function() {
        this.where('dni', 'ilike', `%${q}%`)
          .orWhere('nombres', 'ilike', `%${q}%`)
          .orWhere('apellidos', 'ilike', `%${q}%`);
      });
    }
    
    const totalQuery = query.clone().clearSelect().count('* as total').first();
    const [totalRes, usuarios] = await Promise.all([
      totalQuery,
      query.orderBy('created_at', 'desc').limit(limit).offset((page - 1) * limit)
    ]);
    
    res.json({ success: true, data: usuarios, meta: { total: parseInt(totalRes.total), page: Number(page), limit: Number(limit) }, message: 'Usuarios listados' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando usuarios', error: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await db('usuarios').select('id', 'dni', 'nombres', 'apellidos', 'telefono', 'email', 'rol', 'activo', 'created_at').where({ id }).first();
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    
    let asignacion = null;
    if (usuario.rol === 'personero') {
      asignacion = await db('asignacion_personeros').where({ usuario_id: id, activo: true }).first();
    } else if (usuario.rol === 'coordinador') {
      asignacion = await db('asignacion_coordinadores').where({ usuario_id: id, activo: true }).first();
    }
    
    res.json({ success: true, data: { ...usuario, asignacion }, message: 'Usuario obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo usuario', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    const password_hash = await bcrypt.hash(password, 12);
    
    const [id] = await db('usuarios').insert({ ...userData, password_hash }).returning('id');
    const usuario = await db('usuarios').select('id', 'dni', 'nombres', 'apellidos', 'rol', 'activo').where({ id: id.id || id }).first();
    
    await registrarAuditoria('usuarios', 'create', req.user.id, usuario, req.body);
    res.status(201).json({ success: true, data: usuario, message: 'Usuario creado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creando usuario', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, ...userData } = req.body;
    const oldData = await db('usuarios').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    
    const updateData = { ...userData };
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 12);
    }
    
    await db('usuarios').where({ id }).update(updateData);
    const usuario = await db('usuarios').select('id', 'dni', 'nombres', 'apellidos', 'rol', 'activo').where({ id }).first();
    
    await registrarAuditoria('usuarios', 'update', req.user.id, usuario, req.body, { id: oldData.id, dni: oldData.dni });
    res.json({ success: true, data: usuario, message: 'Usuario actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando usuario', error: error.message });
  }
};

export const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const oldData = await db('usuarios').where({ id }).first();
    if (!oldData) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    
    await db('usuarios').where({ id }).update({ activo: !oldData.activo });
    const usuario = await db('usuarios').select('id', 'dni', 'nombres', 'apellidos', 'rol', 'activo').where({ id }).first();
    
    await registrarAuditoria('usuarios', 'update', req.user.id, usuario, { activo: usuario.activo }, { activo: oldData.activo });
    res.json({ success: true, data: usuario, message: 'Estado del usuario actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando estado', error: error.message });
  }
};
