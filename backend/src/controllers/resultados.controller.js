import db from '../config/database.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { notifyCoordinator, notifyAdmin, notifyPersonero } from '../services/websocket.service.js';
import { uploadActaImage, getActaUrl } from '../services/storage.service.js';
import { invalidateDashboard } from '../services/cache.service.js';

class ErrorNegocio extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const aNumero = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const responderError = (res, error, contexto) => {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(`${contexto}:`, error);
  return res.status(500).json({ success: false, message: contexto, error: error.message });
};

const parsearVotos = (votos) => {
  let lista = votos;
  if (typeof lista === 'string') {
    try {
      lista = JSON.parse(lista);
    } catch {
      throw new ErrorNegocio(400, 'El campo votos no tiene un formato valido');
    }
  }
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new ErrorNegocio(400, 'Debe enviar los votos de al menos un candidato');
  }
  return lista.map((v) => {
    const candidatoId = aNumero(v.candidato_id, 0);
    const cantidad = aNumero(v.votos, -1);
    if (!candidatoId) throw new ErrorNegocio(400, 'Cada voto debe indicar el candidato');
    if (cantidad < 0) throw new ErrorNegocio(400, 'Los votos no pueden ser negativos');
    return { candidato_id: candidatoId, votos: cantidad };
  });
};

export const subirResultado = async (req, res) => {
  try {
    const {
      mesa_id, votos, votos_blanco, votos_nulo,
      votos_impugnados, total_cedulas_votacion, observaciones_personero,
    } = req.body;

    const mesaId = aNumero(mesa_id, 0);
    if (!mesaId) throw new ErrorNegocio(400, 'Debe indicar la mesa');

    const listaVotos = parsearVotos(votos);
    const blanco = aNumero(votos_blanco);
    const nulo = aNumero(votos_nulo);
    const impugnados = aNumero(votos_impugnados);
    const cedulas = aNumero(total_cedulas_votacion);

    const sumaCandidatos = listaVotos.reduce((acc, v) => acc + v.votos, 0);
    const totalEmitidos = sumaCandidatos + blanco + nulo + impugnados;

    const asignacion = await db('asignacion_personeros')
      .where({ usuario_id: req.user.id, mesa_id: mesaId, activo: true })
      .first();
    if (!asignacion) throw new ErrorNegocio(403, 'Usted no esta asignado a esta mesa');

    const mesa = await db('mesas_sufragio').where({ id: mesaId }).first();
    if (!mesa) throw new ErrorNegocio(404, 'Mesa no encontrada');
    if (mesa.estado !== 'pendiente' && mesa.estado !== 'observada') {
      throw new ErrorNegocio(400, `La mesa ya fue procesada (estado: ${mesa.estado})`);
    }

    const LIMITE_MESA = Number(process.env.MAX_VOTOS_POR_MESA || 300);
    if (totalEmitidos > LIMITE_MESA) {
      throw new ErrorNegocio(400, `El total de votos (${totalEmitidos}) supera el maximo de ${LIMITE_MESA} por mesa`);
    }
    if (mesa.total_electores_habiles && totalEmitidos > mesa.total_electores_habiles) {
      throw new ErrorNegocio(400,
        `El total de votos (${totalEmitidos}) supera los electores habiles de la mesa (${mesa.total_electores_habiles})`);
    }
    if (cedulas && totalEmitidos > cedulas) {
      throw new ErrorNegocio(400,
        `El total de votos (${totalEmitidos}) no puede superar las cedulas de votacion (${cedulas})`);
    }

    const candidatosValidos = await db('candidatos')
      .whereIn('id', listaVotos.map((v) => v.candidato_id))
      .pluck('id');
    if (candidatosValidos.length !== listaVotos.length) {
      throw new ErrorNegocio(400, 'Uno o mas candidatos no existen en el sistema');
    }

    const anterior = await db('resultados_mesa')
      .where({ mesa_id: mesaId })
      .orderBy('subido_en', 'desc')
      .first();

    if (anterior && anterior.estado !== 'observado') {
      throw new ErrorNegocio(400, 'El acta de esta mesa ya fue transmitida y no puede modificarse mientras esté en revisión o haya sido aprobada. Solo se permite corregir si fue observada/declinada por el coordinador.');
    }

    let fotoUrl = anterior?.foto_acta_url || null;
    if (req.file) {
      fotoUrl = await uploadActaImage(req.file.buffer, req.file.mimetype, mesa.numero_mesa || mesaId);
    }
    if (!fotoUrl) {
      throw new ErrorNegocio(400, 'Debe adjuntar la foto del acta');
    }

    const version = anterior ? aNumero(anterior.version, 1) + 1 : 1;

    const datos = {
      mesa_id: mesaId,
      personero_id: req.user.id,
      votos_blanco: blanco,
      votos_nulo: nulo,
      votos_impugnados: impugnados,
      total_votos_emitidos: totalEmitidos,
      total_cedulas_votacion: cedulas,
      foto_acta_url: fotoUrl,
      estado: 'pendiente',
      observaciones_personero: observaciones_personero || null,
      version,
      updated_at: new Date(),
    };

    const resultado = await db.transaction(async (trx) => {
      let resultadoId;

      if (anterior) {
        await trx('resultados_mesa').where({ id: anterior.id }).update(datos);
        resultadoId = anterior.id;
        await trx('detalle_resultados').where({ resultado_id: resultadoId }).del();
      } else {
        const [fila] = await trx('resultados_mesa').insert(datos).returning('id');
        resultadoId = fila?.id ?? fila;
      }

      await trx('detalle_resultados').insert(
        listaVotos.map((v) => ({
          resultado_id: resultadoId,
          candidato_id: v.candidato_id,
          votos: v.votos,
        }))
      );

      await trx('mesas_sufragio').where({ id: mesaId })
        .update({ estado: 'reportada', updated_at: trx.fn.now() });

      return { id: resultadoId, ...datos, detalles: listaVotos };
    });

    await registrarAuditoria({
      tabla: 'resultados_mesa',
      registroId: resultado.id,
      accion: anterior ? 'UPDATE' : 'INSERT',
      usuarioId: req.user.id,
      datosAnteriores: anterior || null,
      datosNuevos: { ...datos, detalles: listaVotos },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await invalidateDashboard();

    notifyCoordinator(mesa.local_id, 'resultado:nuevo', {
      mesa_id: mesaId, numero_mesa: mesa.numero_mesa,
      resultado_id: resultado.id, estado: 'reportada',
    });
    notifyAdmin('resultado:nuevo', {
      mesa_id: mesaId, local_id: mesa.local_id, numero_mesa: mesa.numero_mesa,
    });

    res.status(201).json({ success: true, data: resultado, message: 'Acta enviada correctamente' });
  } catch (error) {
    responderError(res, error, 'Error subiendo el acta');
  }
};

export const corregirResultado = async (req, res) => {
  try {
    const resultado = await db('resultados_mesa').where({ id: req.params.id }).first();
    if (!resultado) throw new ErrorNegocio(404, 'Resultado no encontrado');

    if (resultado.estado !== 'observado') {
      throw new ErrorNegocio(400, 'Solo se pueden corregir actas que hayan sido observadas/declinadas por el coordinador');
    }

    const asignacion = await db('asignacion_personeros')
      .where({ usuario_id: req.user.id, mesa_id: resultado.mesa_id, activo: true })
      .first();
    if (!asignacion) throw new ErrorNegocio(403, 'Usted no esta asignado a esta mesa');

    req.body.mesa_id = resultado.mesa_id;
    return subirResultado(req, res);
  } catch (error) {
    responderError(res, error, 'Error corrigiendo el acta');
  }
};

export const verificarResultado = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await db('resultados_mesa').where({ id }).first();
    if (!resultado) throw new ErrorNegocio(404, 'Resultado no encontrado');
    if (resultado.estado === 'verificado') {
      throw new ErrorNegocio(400, 'El acta ya fue verificada previamente');
    }

    const mesa = await db('mesas_sufragio').where({ id: resultado.mesa_id }).first();
    if (!mesa) throw new ErrorNegocio(404, 'Mesa no encontrada');

    if (req.user.rol !== 'admin') {
      const asignado = await db('asignacion_coordinadores')
        .where({ usuario_id: req.user.id, local_id: mesa.local_id, activo: true })
        .first();
      if (!asignado) throw new ErrorNegocio(403, 'No tiene permisos sobre este local');
    }

    await db.transaction(async (trx) => {
      await trx('resultados_mesa').where({ id }).update({
        estado: 'verificado',
        verificado_por: req.user.id,
        verificado_en: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
      await trx('mesas_sufragio').where({ id: mesa.id })
        .update({ estado: 'verificada', updated_at: trx.fn.now() });
    });

    await registrarAuditoria({
      tabla: 'resultados_mesa',
      registroId: Number(id),
      accion: 'UPDATE',
      usuarioId: req.user.id,
      datosAnteriores: resultado,
      datosNuevos: { estado: 'verificado', verificado_por: req.user.id },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await invalidateDashboard();

    notifyAdmin('resultado:verificado', { mesa_id: mesa.id, numero_mesa: mesa.numero_mesa, resultado_id: id });
    notifyCoordinator(mesa.local_id, 'resultado:verificado', { mesa_id: mesa.id, numero_mesa: mesa.numero_mesa, resultado_id: id });
    if (resultado.personero_id) {
      notifyPersonero(resultado.personero_id, 'resultado:verificado', {
        mesa_id: mesa.id, numero_mesa: mesa.numero_mesa, resultado_id: id,
      });
    }

    res.json({ success: true, message: 'Acta verificada y aprobada correctamente' });
  } catch (error) {
    responderError(res, error, 'Error verificando el acta');
  }
};

export const observarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const observaciones_coordinador = req.body.observaciones_coordinador || req.body.observacion;

    if (!observaciones_coordinador || !String(observaciones_coordinador).trim()) {
      throw new ErrorNegocio(400, 'Debe indicar el motivo de la observacion');
    }

    const resultado = await db('resultados_mesa').where({ id }).first();
    if (!resultado) throw new ErrorNegocio(404, 'Resultado no encontrado');
    if (resultado.estado === 'observado') {
      throw new ErrorNegocio(400, 'El acta ya se encuentra en estado observado');
    }

    const mesa = await db('mesas_sufragio').where({ id: resultado.mesa_id }).first();
    if (!mesa) throw new ErrorNegocio(404, 'Mesa no encontrada');

    if (req.user.rol !== 'admin') {
      const asignado = await db('asignacion_coordinadores')
        .where({ usuario_id: req.user.id, local_id: mesa.local_id, activo: true })
        .first();
      if (!asignado) throw new ErrorNegocio(403, 'No tiene permisos sobre este local');
    }

    const motivoTexto = String(observaciones_coordinador).trim();

    await db.transaction(async (trx) => {
      await trx('resultados_mesa').where({ id }).update({
        estado: 'observado',
        observaciones_coordinador: motivoTexto,
        updated_at: trx.fn.now(),
      });
      await trx('mesas_sufragio').where({ id: mesa.id })
        .update({ estado: 'observada', updated_at: trx.fn.now() });
    });

    await registrarAuditoria({
      tabla: 'resultados_mesa',
      registroId: Number(id),
      accion: 'UPDATE',
      usuarioId: req.user.id,
      datosAnteriores: resultado,
      datosNuevos: { estado: 'observado', observaciones_coordinador: motivoTexto },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await invalidateDashboard();

    notifyAdmin('resultado:observado', { mesa_id: mesa.id, numero_mesa: mesa.numero_mesa, resultado_id: id, motivo: motivoTexto });
    notifyCoordinator(mesa.local_id, 'resultado:observado', { mesa_id: mesa.id, numero_mesa: mesa.numero_mesa, resultado_id: id, motivo: motivoTexto });
    if (resultado.personero_id) {
      notifyPersonero(resultado.personero_id, 'resultado:observado', {
        mesa_id: mesa.id,
        numero_mesa: mesa.numero_mesa,
        resultado_id: id,
        motivo: motivoTexto,
      });
    }

    res.json({ success: true, message: 'Acta declinada/observada. El personero fue notificado para corregirla.' });
  } catch (error) {
    responderError(res, error, 'Error observando el acta');
  }
};

export const getResultadosPorLocal = async (req, res) => {
  try {
    const { localId } = req.params;

    if (req.user.rol !== 'admin') {
      const asignado = await db('asignacion_coordinadores')
        .where({ usuario_id: req.user.id, local_id: localId, activo: true })
        .first();
      if (!asignado) throw new ErrorNegocio(403, 'No tiene permisos sobre este local');
    }

    const filas = await db('mesas_sufragio as m')
      .leftJoin('resultados_mesa as rm', 'rm.mesa_id', 'm.id')
      .leftJoin('asignacion_personeros as ap', function () {
        this.on('ap.mesa_id', '=', 'm.id').andOn('ap.activo', '=', db.raw('true'));
      })
      .leftJoin('usuarios as u', 'ap.usuario_id', 'u.id')
      .where('m.local_id', localId)
      .select(
        'm.id as mesa_id', 'm.numero_mesa', 'm.estado as estado_mesa',
        'm.total_electores_habiles',
        'rm.id as resultado_id', 'rm.estado as estado_resultado',
        'rm.total_votos_emitidos', 'rm.votos_blanco', 'rm.votos_nulo',
        'rm.votos_impugnados', 'rm.observaciones_coordinador',
        'rm.subido_en', 'rm.version',
        'u.dni as personero_dni',
        db.raw("CONCAT(u.nombres, ' ', u.apellidos) as personero_nombre"),
        'u.telefono as personero_telefono'
      )
      .orderBy('m.numero_mesa', 'asc');

    res.json({ success: true, data: filas, message: 'Resultados del local' });
  } catch (error) {
    responderError(res, error, 'Error obteniendo resultados del local');
  }
};

export const getResultadoDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await db('resultados_mesa as rm')
      .join('mesas_sufragio as m', 'rm.mesa_id', 'm.id')
      .join('locales_votacion as l', 'm.local_id', 'l.id')
      .leftJoin('usuarios as u', 'rm.personero_id', 'u.id')
      .select(
        'rm.*',
        'm.numero_mesa',
        'm.local_id',
        'm.estado as estado_mesa',
        'm.total_electores_habiles',
        'm.total_electores_habiles as electores_habiles',
        'rm.total_votos_emitidos as total_votos',
        'rm.votos_nulo as votos_nulos',
        'rm.subido_en as fecha_registro',
        'l.nombre as local_nombre',
        'u.dni as personero_dni',
        db.raw("CONCAT(u.nombres, ' ', u.apellidos) as personero_nombre"),
        'u.telefono as personero_telefono'
      )
      .where('rm.id', id)
      .first();

    if (!resultado) throw new ErrorNegocio(404, 'Resultado no encontrado');

    if (req.user.rol === 'personero') {
      const propio = await db('asignacion_personeros')
        .where({ usuario_id: req.user.id, mesa_id: resultado.mesa_id, activo: true })
        .first();
      if (!propio) throw new ErrorNegocio(403, 'No tiene acceso a esta acta');
    } else if (req.user.rol === 'coordinador') {
      const asignado = await db('asignacion_coordinadores')
        .where({ usuario_id: req.user.id, local_id: resultado.local_id, activo: true })
        .first();
      if (!asignado) throw new ErrorNegocio(403, 'No tiene acceso a esta acta');
    }

    const detalles = await db('detalle_resultados as dr')
      .join('candidatos as c', 'dr.candidato_id', 'c.id')
      .select(
        'dr.id',
        'dr.candidato_id',
        'dr.votos',
        'c.nombre_completo',
        'c.nombre_completo as nombre',
        'c.organizacion_politica',
        'c.organizacion_politica as organizacion',
        'c.siglas',
        'c.numero_lista'
      )
      .where('dr.resultado_id', id)
      .orderBy('c.numero_lista', 'asc');

    if (resultado.foto_acta_url) {
      resultado.foto_acta_url_presigned = await getActaUrl(resultado.foto_acta_url);
    }

    res.json({
      success: true,
      data: {
        ...resultado,
        detalles,
        votos_candidatos: detalles,
      },
      message: 'Detalle del acta',
    });
  } catch (error) {
    responderError(res, error, 'Error obteniendo el detalle');
  }
};

export const getMiMesa = async (req, res) => {
  try {
    const asignacion = await db('asignacion_personeros')
      .where({ usuario_id: req.user.id, activo: true })
      .first();
    if (!asignacion) throw new ErrorNegocio(404, 'Usted no tiene una mesa asignada');

    const mesa = await db('mesas_sufragio as m')
      .join('locales_votacion as l', 'm.local_id', 'l.id')
      .join('distritos as d', 'l.distrito_id', 'd.id')
      .select('m.*', 'l.nombre as local_nombre', 'l.direccion as local_direccion',
        'd.nombre as distrito_nombre')
      .where('m.id', asignacion.mesa_id)
      .first();

    const resultado = await db('resultados_mesa')
      .where({ mesa_id: asignacion.mesa_id })
      .orderBy('subido_en', 'desc')
      .first();

    let detalles = [];
    if (resultado) {
      detalles = await db('detalle_resultados as dr')
        .join('candidatos as c', 'dr.candidato_id', 'c.id')
        .select('dr.candidato_id', 'dr.votos', 'c.nombre_completo', 'c.organizacion_politica')
        .where('dr.resultado_id', resultado.id);
      if (resultado.foto_acta_url) {
        resultado.foto_acta_url_presigned = await getActaUrl(resultado.foto_acta_url);
      }
    }

    const candidatos = await db('candidatos')
      .where({ activo: true })
      .select('id', 'nombre_completo', 'organizacion_politica', 'siglas', 'numero_lista', 'logo_url')
      .orderBy('numero_lista', 'asc');

    res.json({
      success: true,
      data: {
        mesa,
        local: {
          id: mesa.local_id,
          nombre: mesa.local_nombre,
          direccion: mesa.local_direccion,
          distrito: mesa.distrito_nombre,
        },
        resultado: resultado ? { ...resultado, detalles } : null,
        candidatos,
      },
      message: 'Mesa obtenida',
    });
  } catch (error) {
    responderError(res, error, 'Error obteniendo su mesa');
  }
};

export const confirmarMesa = async (req, res) => {
  try {
    const asignacion = await db('asignacion_personeros')
      .where({ usuario_id: req.user.id, activo: true })
      .first();
    if (!asignacion) throw new ErrorNegocio(404, 'Usted no tiene una mesa asignada');

    const mesa = await db('mesas_sufragio').where({ id: asignacion.mesa_id }).first();

    await registrarAuditoria({
      tabla: 'asignacion_personeros',
      registroId: asignacion.id,
      accion: 'UPDATE',
      usuarioId: req.user.id,
      datosNuevos: { confirmacion_presencia: true, mesa_id: asignacion.mesa_id },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      lat: req.body?.latitud ? Number(req.body.latitud) : null,
      lng: req.body?.longitud ? Number(req.body.longitud) : null,
    });

    if (mesa) {
      notifyCoordinator(mesa.local_id, 'personero:presente', {
        mesa_id: mesa.id, numero_mesa: mesa.numero_mesa, usuario_id: req.user.id,
      });
    }

    res.json({ success: true, message: 'Presencia confirmada en su mesa' });
  } catch (error) {
    responderError(res, error, 'Error confirmando presencia');
  }
};
