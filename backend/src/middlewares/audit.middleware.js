import { registrarAuditoria } from '../services/auditoria.service.js';

/**
 * Middleware to log audit trail for write operations.
 * Must be used after successful operations, or capture data from req before passing to next.
 * @param {string} tableName - The name of the table being affected.
 */
export const auditLog = (tableName) => {
  return async (req, res, next) => {
    // We hook into res.json or similar to capture success?
    // A simpler approach: attach a function to req for the controller to call,
    // or intercept the response.
    // Intercepting response:
    const originalSend = res.json;
    
    res.json = function (body) {
      // Check if it's a successful response and has data
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const usuarioId = req.user?.id || null;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const lat = req.headers['x-latitude'] ? parseFloat(req.headers['x-latitude']) : null;
        const lng = req.headers['x-longitude'] ? parseFloat(req.headers['x-longitude']) : null;
        
        // This relies on the controller setting req.auditData
        // { accion: 'INSERT', registroId: 1, datosAnteriores: {...}, datosNuevos: {...} }
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
