import { registrarAuditoria } from '../services/auditoria.service.js';

export const auditLog = (tableName) => {
  return async (req, res, next) => {
    const originalSend = res.json;
    
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const usuarioId = req.user?.id || null;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const lat = req.headers['x-latitude'] ? parseFloat(req.headers['x-latitude']) : null;
        const lng = req.headers['x-longitude'] ? parseFloat(req.headers['x-longitude']) : null;
        
        if (req.auditData) {
          registrarAuditoria({
            tabla: tableName,
            registroId: req.auditData.registroId,
            accion: req.auditData.accion,
            datosAnteriores: req.auditData.datosAnteriores,
            datosNuevos: req.auditData.datosNuevos,
            usuarioId,
            ip,
            userAgent,
            lat,
            lng
          }).catch(err => console.error('Audit log failed:', err));
        }
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};
