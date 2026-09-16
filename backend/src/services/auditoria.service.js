import db from '../config/database.js';

export const registrarAuditoria = async (...args) => {
  try {
    let tabla, registroId, accion, datosAnteriores, datosNuevos, usuarioId, ip, userAgent, lat, lng;

    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      // Objeto con parámetros nombrados
      ({ tabla, registroId, accion, datosAnteriores, datosNuevos, usuarioId, ip, userAgent, lat, lng } = args[0]);
    } else {
      // Parámetros posicionales: (tabla, accion, usuarioId, datosNuevos, payload, datosAnteriores, trx)
      tabla = args[0];
      accion = args[1];
      usuarioId = args[2];
      datosNuevos = args[3];
      datosAnteriores = args[5] || args[4] || null;
      registroId = datosNuevos?.id || (typeof args[4] === 'object' && args[4]?.id ? args[4].id : null);
    }

    if (!tabla) return;

    // Normalizar acción a los valores del enum PostgreSQL: 'INSERT', 'UPDATE', 'DELETE'
    let accionEnum = 'UPDATE';
    const accStr = String(accion || '').toUpperCase();
    if (accStr.includes('INSERT') || accStr.includes('CREATE') || accStr.includes('POST')) {
      accionEnum = 'INSERT';
    } else if (accStr.includes('DELETE') || accStr.includes('REMOVE')) {
      accionEnum = 'DELETE';
    } else {
      accionEnum = 'UPDATE';
    }

    const regId = parseInt(registroId, 10) || (datosNuevos?.id ? parseInt(datosNuevos.id, 10) : 0) || 0;

    await db('auditoria').insert({
      tabla_afectada: String(tabla),
      registro_id: regId,
      accion: accionEnum,
      datos_anteriores: datosAnteriores ? (typeof datosAnteriores === 'string' ? datosAnteriores : JSON.stringify(datosAnteriores)) : null,
      datos_nuevos: datosNuevos ? (typeof datosNuevos === 'string' ? datosNuevos : JSON.stringify(datosNuevos)) : null,
      usuario_id: parseInt(usuarioId, 10) || null,
      ip_address: ip || '127.0.0.1',
      user_agent: userAgent || null,
      latitud: lat || null,
      longitud: lng || null
    });
  } catch (error) {
    console.error('Error registrando auditoría:', error.message);
  }
};
