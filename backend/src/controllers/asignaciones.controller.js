import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';

export const asignarPersonero = async (req, res) => {
  try {
    const { usuario_id, mesa_id } = req.body;
    await db.transaction(async trx => {
      const user = await trx('usuarios').where({ id: usuario_id, rol: 'personero', activo: true }).first();
      if (!user) return res.status(400).json({ success: false, message: 'Usuario inválido o no es personero' });
      
      const mesa = await trx('mesas_sufragio as mesas').where({ id: mesa_id }).first();
      if (!mesa) return res.status(400).json({ success: false, message: 'Mesa inválida' });
      
      const existingUser = await trx('asignacion_personeros').where({ usuario_id, activo: true }).first();
      if (existingUser) return res.status(400).json({ success: false, message: 'El personero ya tiene una mesa asignada' });

      const existing = await trx('asignacion_personeros').where({ mesa_id, activo: true }).first();
      if (existing) return res.status(400).json({ success: false, message: 'Mesa ya tiene personero asignado' });
      
      const [idRes] = await trx('asignacion_personeros').insert({ usuario_id, mesa_id, activo: true }).returning('id');
      const id = idRes.id || idRes;
      
      await trx('historial_asignaciones').insert({
        tipo: 'personero',
        mesa_id: mesa_id,
        usuario_nuevo_id: usuario_id,
        motivo_cambio: 'Asignación inicial',
        cambiado_por: req.user?.id || null
      });
      
      const asignacion = await trx('asignacion_personeros').where({ id }).first();
      await registrarAuditoria('asignacion_personeros', 'create', req.user.id, asignacion, req.body, null, trx);
      
      res.status(201).json({ success: true, data: asignacion, message: 'Personero asignado' });
    });
  } catch (error) {
    console.error('Error asignando personero:', error);
    res.status(500).json({ success: false, message: 'Error asignando personero', error: error.message });
  }
};

export const reasignarPersonero = async (req, res) => {
  try {
    const { id } = req.params; // ID of the asignacion
    const { usuario_nuevo_id, motivo_cambio } = req.body;
    
    await db.transaction(async trx => {
      const current = await trx('asignacion_personeros').where({ id, activo: true }).first();
      if (!current) return res.status(404).json({ success: false, message: 'Asignación activa no encontrada' });
      
      const newUser = await trx('usuarios').where({ id: usuario_nuevo_id, rol: 'personero', activo: true }).first();
      if (!newUser) return res.status(400).json({ success: false, message: 'Usuario nuevo inválido' });
      
      await trx('asignacion_personeros').where({ id }).update({ activo: false });
      
      const [newIdRes] = await trx('asignacion_personeros').insert({
        usuario_id: usuario_nuevo_id,
        mesa_id: current.mesa_id,
        activo: true
      }).returning('id');
      const newId = newIdRes.id || newIdRes;
      
      await trx('historial_asignaciones').insert({
        tipo: 'personero',
        mesa_id: current.mesa_id,
        usuario_anterior_id: current.usuario_id,
        usuario_nuevo_id: usuario_nuevo_id,
        motivo_cambio: motivo_cambio || 'Reasignación',
        cambiado_por: req.user?.id || null
      });
      
      const newAsignacion = await trx('asignacion_personeros').where({ id: newId }).first();
      await registrarAuditoria('asignacion_personeros', 'update', req.user.id, newAsignacion, { activo: false, newId }, current, trx);
      
      res.json({ success: true, data: newAsignacion, message: 'Personero reasignado' });
    });
  } catch (error) {
    console.error('Error reasignando personero:', error);
    res.status(500).json({ success: false, message: 'Error reasignando personero', error: error.message });
  }
};

export const asignarCoordinador = async (req, res) => {
  try {
    const { usuario_id, local_id } = req.body;
    await db.transaction(async trx => {
      const user = await trx('usuarios').where({ id: usuario_id, rol: 'coordinador', activo: true }).first();
      if (!user) return res.status(400).json({ success: false, message: 'Usuario inválido o no es coordinador' });
      
      const local = await trx('locales_votacion as locales').where({ id: local_id }).first();
      if (!local) return res.status(400).json({ success: false, message: 'Local inválido' });
      
      const existing = await trx('asignacion_coordinadores').where({ usuario_id, local_id, activo: true }).first();
      if (existing) return res.status(400).json({ success: false, message: 'El coordinador ya está asignado a este local' });

      const [idRes] = await trx('asignacion_coordinadores').insert({ usuario_id, local_id, activo: true }).returning('id');
      const id = idRes.id || idRes;
      
      await trx('historial_asignaciones').insert({
        tipo: 'coordinador',
        local_id: local_id,
        usuario_nuevo_id: usuario_id,
        motivo_cambio: 'Asignación inicial',
        cambiado_por: req.user?.id || null
      });
      
      const asignacion = await trx('asignacion_coordinadores').where({ id }).first();
      await registrarAuditoria('asignacion_coordinadores', 'create', req.user.id, asignacion, req.body, null, trx);
      
      res.status(201).json({ success: true, data: asignacion, message: 'Coordinador asignado' });
    });
  } catch (error) {
    console.error('Error asignando coordinador:', error);
    res.status(500).json({ success: false, message: 'Error asignando coordinador', error: error.message });
  }
};

export const reasignarCoordinador = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_nuevo_id, motivo_cambio } = req.body;
    
    await db.transaction(async trx => {
      const current = await trx('asignacion_coordinadores').where({ id, activo: true }).first();
      if (!current) return res.status(404).json({ success: false, message: 'Asignación activa no encontrada' });
      
      const newUser = await trx('usuarios').where({ id: usuario_nuevo_id, rol: 'coordinador', activo: true }).first();
      if (!newUser) return res.status(400).json({ success: false, message: 'Usuario nuevo inválido' });
      
      await trx('asignacion_coordinadores').where({ id }).update({ activo: false });
      
      const [newIdRes] = await trx('asignacion_coordinadores').insert({
        usuario_id: usuario_nuevo_id,
        local_id: current.local_id,
        activo: true
      }).returning('id');
      const newId = newIdRes.id || newIdRes;
      
      await trx('historial_asignaciones').insert({
        tipo: 'coordinador',
        local_id: current.local_id,
        usuario_anterior_id: current.usuario_id,
        usuario_nuevo_id: usuario_nuevo_id,
        motivo_cambio: motivo_cambio || 'Reasignación',
        cambiado_por: req.user?.id || null
      });
      
      const newAsignacion = await trx('asignacion_coordinadores').where({ id: newId }).first();
      await registrarAuditoria('asignacion_coordinadores', 'update', req.user.id, newAsignacion, { activo: false, newId }, current, trx);
      
      res.json({ success: true, data: newAsignacion, message: 'Coordinador reasignado' });
    });
  } catch (error) {
    console.error('Error reasignando coordinador:', error);
    res.status(500).json({ success: false, message: 'Error reasignando coordinador', error: error.message });
  }
};

export const getAsignacionesPersoneros = async (req, res) => {
  try {
    const { local_id, distrito_id, q } = req.query;
    let query = db('asignacion_personeros')
      .join('usuarios', 'asignacion_personeros.usuario_id', 'usuarios.id')
      .join('mesas_sufragio as mesas', 'asignacion_personeros.mesa_id', 'mesas.id')
      .join('locales_votacion as locales', 'mesas.local_id', 'locales.id')
      .join('distritos', 'locales.distrito_id', 'distritos.id')
      .select('asignacion_personeros.*', 'usuarios.nombres', 'usuarios.apellidos', 'usuarios.dni', 'mesas.numero_mesa', 'locales.nombre as local_nombre', 'distritos.nombre as distrito_nombre')
      .where('asignacion_personeros.activo', true);
      
    if (local_id) query = query.where('mesas.local_id', local_id);
    if (distrito_id) query = query.where('locales.distrito_id', distrito_id);
    if (q) {
      query = query.where(function() {
        this.where('usuarios.dni', 'ilike', `%${q}%`)
          .orWhere('usuarios.nombres', 'ilike', `%${q}%`)
          .orWhere('usuarios.apellidos', 'ilike', `%${q}%`)
          .orWhere('mesas.numero_mesa', 'ilike', `%${q}%`)
          .orWhere('locales.nombre', 'ilike', `%${q}%`);
      });
    }
    
    const list = await query.orderBy('mesas.numero_mesa', 'asc');
    res.json({ success: true, data: list, message: 'Asignaciones de personeros listadas' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando asignaciones', error: error.message });
  }
};

export const getAsignacionesCoordinadores = async (req, res) => {
  try {
    const { local_id, distrito_id, q } = req.query;
    let query = db('asignacion_coordinadores')
      .join('usuarios', 'asignacion_coordinadores.usuario_id', 'usuarios.id')
      .join('locales_votacion as locales', 'asignacion_coordinadores.local_id', 'locales.id')
      .join('distritos', 'locales.distrito_id', 'distritos.id')
      .select('asignacion_coordinadores.*', 'usuarios.nombres', 'usuarios.apellidos', 'usuarios.dni', 'locales.nombre as local_nombre', 'distritos.nombre as distrito_nombre')
      .where('asignacion_coordinadores.activo', true);
      
    if (local_id) query = query.where('asignacion_coordinadores.local_id', local_id);
    if (distrito_id) query = query.where('locales.distrito_id', distrito_id);
    if (q) {
      query = query.where(function() {
        this.where('usuarios.dni', 'ilike', `%${q}%`)
          .orWhere('usuarios.nombres', 'ilike', `%${q}%`)
          .orWhere('usuarios.apellidos', 'ilike', `%${q}%`)
          .orWhere('locales.nombre', 'ilike', `%${q}%`);
      });
    }
      
    const list = await query.orderBy('locales.nombre', 'asc');
    res.json({ success: true, data: list, message: 'Asignaciones de coordinadores listadas' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando asignaciones', error: error.message });
  }
};

export const getHistorial = async (req, res) => {
  try {
    const { tipo, fecha_inicio, fecha_fin } = req.query;
    let query = db('historial_asignaciones');
    
    if (tipo) query = query.where({ tipo });
    if (fecha_inicio) query = query.where('fecha_cambio', '>=', fecha_inicio);
    if (fecha_fin) query = query.where('fecha_cambio', '<=', fecha_fin);
    
    const list = await query.orderBy('fecha_cambio', 'desc');
    res.json({ success: true, data: list, message: 'Historial listado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error listando historial', error: error.message });
  }
};

export const removeAsignacionPersonero = async (req, res) => {
  try {
    const { id } = req.params;
    await db.transaction(async trx => {
      const current = await trx('asignacion_personeros').where({ id }).first();
      if (!current) return res.status(404).json({ success: false, message: 'No encontrado' });
      
      await trx('asignacion_personeros').where({ id }).update({ activo: false });
      
      await trx('historial_asignaciones').insert({
        tipo: 'personero',
        mesa_id: current.mesa_id,
        usuario_anterior_id: current.usuario_id,
        usuario_nuevo_id: null,
        motivo_cambio: 'Eliminación de asignación',
        cambiado_por: req.user?.id || null
      });
      
      await registrarAuditoria('asignacion_personeros', 'delete', req.user.id, { id }, { activo: false }, current, trx);
      res.json({ success: true, data: null, message: 'Asignación eliminada' });
    });
  } catch (error) {
    console.error('Error eliminando asignación personero:', error);
    res.status(500).json({ success: false, message: 'Error eliminando asignación', error: error.message });
  }
};

export const removeAsignacionCoordinador = async (req, res) => {
  try {
    const { id } = req.params;
    await db.transaction(async trx => {
      const current = await trx('asignacion_coordinadores').where({ id }).first();
      if (!current) return res.status(404).json({ success: false, message: 'No encontrado' });
      
      await trx('asignacion_coordinadores').where({ id }).update({ activo: false });
      
      await trx('historial_asignaciones').insert({
        tipo: 'coordinador',
        local_id: current.local_id,
        usuario_anterior_id: current.usuario_id,
        usuario_nuevo_id: null,
        motivo_cambio: 'Eliminación de asignación',
        cambiado_por: req.user?.id || null
      });
      
      await registrarAuditoria('asignacion_coordinadores', 'delete', req.user.id, { id }, { activo: false }, current, trx);
      res.json({ success: true, data: null, message: 'Asignación eliminada' });
    });
  } catch (error) {
    console.error('Error eliminando asignación coordinador:', error);
    res.status(500).json({ success: false, message: 'Error eliminando asignación', error: error.message });
  }
};
