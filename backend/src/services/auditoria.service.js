import db from '../config/database.js';

export const registrarAuditoria = async ({
  tabla,
  registroId,
  accion,
  datosAnteriores = null,
  datosNuevos = null,
  usuarioId = null,
  ip = null,
  userAgent = null,
  lat = null,
  lng = null
}) => {
  try {
    await db('auditoria').insert({
      tabla_afectada: tabla,
      registro_id: registroId,
      accion,
      datos_anteriores: datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datos_nuevos: datosNuevos ? JSON.stringify(datosNuevos) : null,
      usuario_id: usuarioId,
      ip_address: ip,
      user_agent: userAgent,
      latitud: lat,
      longitud: lng
    });
  } catch (error) {
    console.error('Error registering audit log:', error);
    // Don't throw, we don't want audit failures to break main operations
  }
};
