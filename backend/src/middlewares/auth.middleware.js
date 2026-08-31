import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';
import db from '../config/database.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, authConfig.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid token.' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

export const requireOwnMesa = async (req, res, next) => {
  try {
    const { mesaId } = req.params; // Assuming route has :mesaId
    const userId = req.user.id;
    
    if (req.user.rol === 'admin') return next();

    const asignacion = await db('asignacion_personeros')
      .where({ usuario_id: userId, mesa_id: mesaId, activo: true })
      .first();

    if (!asignacion) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a esta mesa.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOwnLocal = async (req, res, next) => {
  try {
    const { localId } = req.params; // Assuming route has :localId
    const userId = req.user.id;

    if (req.user.rol === 'admin') return next();

    const asignacion = await db('asignacion_coordinadores')
      .where({ usuario_id: userId, local_id: localId, activo: true })
      .first();

    if (!asignacion) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este local de votación.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};
