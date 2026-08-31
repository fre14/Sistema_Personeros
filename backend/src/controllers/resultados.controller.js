import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { notifyCoordinator, notifyAdmin, notifyPersonero } from '../services/websocket.service.js';
import { uploadActaImage, getActaUrl } from '../services/storage.service.js';

export const subirResultado = async (req, res) => {
  try {
    const { mesa_id, votos, votos_blanco, votos_nulo, votos_impugnados, total_cedulas_votacion, observaciones_personero } = req.body;
    
    await db.transaction(async trx => {
      const asignacion = await trx('asignacion_personeros').where({ usuario_id: req.user.id, mesa_id, activo: true }).first();
      if (!asignacion) return res.status(403).json({ success: false, message: 'No asignado a esta mesa' });
      
      const mesa = await trx('mesas').where({ id: mesa_id }).first();
      if (mesa.estado !== 'pendiente' && mesa.estado !== 'observada') {
        return res.status(400).json({ success: false, message: `Mesa en estado ${mesa.estado}` });
      }

      let version = 1;
      let existingRes = null;
      if (mesa.estado === 'observada') {
        existingRes = await trx('resultados_mesa').where({ mesa_id }).first();
        if (existingRes) version = existingRes.version + 1;
      }
      
      let foto_url = existingRes?.foto_acta_url;
      if (req.file) {
        foto_url = await uploadActaImage(req.file.buffer, req.file.mimetype, mesa.numero || mesa_id);
      }
      
      const parsedVotos = typeof votos === 'string' ? JSON.parse(votos) : votos;
      const sumVotosCandidatos = parsedVotos.reduce((acc, curr) => acc + Number(curr.votos), 0);
      const total_votos_emitidos = sumVotosCandidatos + Number(votos_blanco) + Number(votos_nulo) + Number(votos_impugnados);
      
      if (total_votos_emitidos > mesa.total_electores_habiles) {
        return res.status(400).json({ success: false, message: 'Votos exceden electores' });
      }
      
      const resultData = {
        mesa_id,
        votos_blanco: Number(votos_blanco),
        votos_nulo: Number(votos_nulo),
        votos_impugnados: Number(votos_impugnados),
        total_votos_emitidos,
        total_cedulas_votacion: Number(total_cedulas_votacion),
        foto_acta_url: foto_url,
        estado: 'pendiente',
        observaciones_personero,
        version
      };

      let resultId;
      if (existingRes) {
        await trx('resultados_mesa').where({ id: existingRes.id }).update(resultData);
        resultId = existingRes.id;
        await trx('detalle_resultados').where({ resultado_id: resultId }).del();
      } else {
        const [idRes] = await trx('resultados_mesa').insert(resultData).returning('id');
        resultId = idRes.id || idRes;
      }
      
      const detalleInserts = parsedVotos.map(v => ({
        resultado_id: resultId,
        candidato_id: v.candidato_id,
        votos: Number(votos)
      }));
      if (detalleInserts.length > 0) {
        await trx('detalle_resultados').insert(detalleInserts);
      }
      
      await trx('mesas').where({ id: mesa_id }).update({ estado: 'reportada' });
      
      const resultadoFull = { ...resultData, id: resultId, detalles: detalleInserts };
      await registrarAuditoria('resultados_mesa', existingRes ? 'update' : 'create', req.user.id, resultadoFull, req.body, existingRes, trx);
      
      notifyCoordinator(mesa.local_id, 'resultado:nuevo', { mesa_id, estado: 'reportada' });
      notifyAdmin('resultado:nuevo', { mesa_id, local_id: mesa.local_id });
      
      res.status(201).json({ success: true, data: resultadoFull, message: 'Resultado subido' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error subiendo resultado', error: error.message });
  }
};

export const corregirResultado = async (req, res) => {
  // Similar logic to subirResultado but verifies 'observado' state
  // Can be combined or refactored. I will delegate to subirResultado internal logic mostly.
  req.body.mesa_id = (await db('resultados_mesa').where({ id: req.params.id }).first())?.mesa_id;
  if (!req.body.mesa_id) return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
  return subirResultado(req, res);
};

export const verificarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    await db.transaction(async trx => {
      const resultado = await trx('resultados_mesa').where({ id }).first();
      if (!resultado) return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
      
      const mesa = await trx('mesas').where({ id: resultado.mesa_id }).first();
      const asig = await trx('asignacion_coordinadores').where({ usuario_id: req.user.id, local_id: mesa.local_id, activo: true }).first();
      if (!asig) return res.status(403).json({ success: false, message: 'No autorizado' });
      
      if (resultado.estado !== 'pendiente') return res.status(400).json({ success: false, message: `Resultado en estado ${resultado.estado}` });
      
      await trx('resultados_mesa').where({ id }).update({
        estado: 'verificado',
        verificado_por: req.user.id,
        verificado_en: new Date()
      });
      await trx('mesas').where({ id: mesa.id }).update({ estado: 'verificada' });
      
      await registrarAuditoria('resultados_mesa', 'update', req.user.id, { id, estado: 'verificado' }, null, resultado, trx);
      
      notifyAdmin('resultado:verificado', { mesa_id: mesa.id });
      const personero = await trx('asignacion_personeros').where({ mesa_id: mesa.id, activo: true }).first();
      if (personero) notifyPersonero(personero.usuario_id, 'resultado:verificado', { mesa_id: mesa.id });
      
      res.json({ success: true, message: 'Resultado verificado' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verificando', error: error.message });
  }
};

export const observarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones_coordinador } = req.body;
    
    await db.transaction(async trx => {
      const resultado = await trx('resultados_mesa').where({ id }).first();
      if (!resultado) return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
      
      const mesa = await trx('mesas').where({ id: resultado.mesa_id }).first();
      const asig = await trx('asignacion_coordinadores').where({ usuario_id: req.user.id, local_id: mesa.local_id, activo: true }).first();
      if (!asig) return res.status(403).json({ success: false, message: 'No autorizado' });
      
      if (resultado.estado !== 'pendiente') return res.status(400).json({ success: false, message: `Resultado en estado ${resultado.estado}` });
      
      await trx('resultados_mesa').where({ id }).update({
        estado: 'observado',
        observaciones_coordinador
      });
      await trx('mesas').where({ id: mesa.id }).update({ estado: 'observada' });
      
      await registrarAuditoria('resultados_mesa', 'update', req.user.id, { id, estado: 'observado' }, null, resultado, trx);
      
      notifyAdmin('resultado:observado', { mesa_id: mesa.id });
      const personero = await trx('asignacion_personeros').where({ mesa_id: mesa.id, activo: true }).first();
      if (personero) notifyPersonero(personero.usuario_id, 'resultado:observado', { mesa_id: mesa.id, motivo: observaciones_coordinador });
      
      res.json({ success: true, message: 'Resultado observado' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error observando', error: error.message });
  }
};

export const getResultadosPorLocal = async (req, res) => {
  try {
    const { localId } = req.params;
    const asig = await db('asignacion_coordinadores').where({ usuario_id: req.user.id, local_id: localId, activo: true }).first();
    if (!asig && req.user.rol !== 'admin') return res.status(403).json({ success: false, message: 'No autorizado' });
    
    const mesas = await db('mesas').where({ local_id: localId });
    const resultados = await db('resultados_mesa').whereIn('mesa_id', mesas.map(m => m.id));
    
    res.json({ success: true, data: resultados, message: 'Resultados listados' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo resultados', error: error.message });
  }
};

export const getResultadoDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await db('resultados_mesa').where({ id }).first();
    if (!resultado) return res.status(404).json({ success: false, message: 'No encontrado' });
    
    const detalles = await db('detalle_resultados')
      .join('candidatos', 'detalle_resultados.candidato_id', 'candidatos.id')
      .select('detalle_resultados.*', 'candidatos.nombre_completo', 'candidatos.organizacion_politica')
      .where({ resultado_id: id });
      
    if (resultado.foto_acta_url) {
      resultado.foto_acta_url_presigned = await getActaUrl(resultado.foto_acta_url);
    }
    
    res.json({ success: true, data: { ...resultado, detalles }, message: 'Detalle obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo detalle', error: error.message });
  }
};

export const getMiMesa = async (req, res) => {
  try {
    const asig = await db('asignacion_personeros').where({ usuario_id: req.user.id, activo: true }).first();
    if (!asig) return res.status(404).json({ success: false, message: 'No tiene mesa asignada' });
    
    const mesa = await db('mesas').where({ id: asig.mesa_id }).first();
    const local = await db('locales').where({ id: mesa.local_id }).first();
    const resultado = await db('resultados_mesa').where({ mesa_id: mesa.id }).orderBy('created_at', 'desc').first();
    
    res.json({ success: true, data: { mesa, local, resultado }, message: 'Mesa obtenida' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

export const confirmarMesa = async (req, res) => {
  res.json({ success: true, message: 'Presencia confirmada (placeholder)' });
};
