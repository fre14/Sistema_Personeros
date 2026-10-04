import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';

export const login = async (req, res) => {
  try {
    const { dni, password } = req.body;
    const user = await db('usuarios').where({ dni, activo: true }).first();
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    let isValid = false;

    if (user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValid && user.rol === 'personero') {
      const asignacion = await db('asignacion_personeros')
        .join('mesas_sufragio', 'asignacion_personeros.mesa_id', 'mesas_sufragio.id')
        .where({
          'asignacion_personeros.usuario_id': user.id,
          'asignacion_personeros.activo': true
        })
        .select('mesas_sufragio.numero_mesa')
        .first();

      if (asignacion && asignacion.numero_mesa === password.trim()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas. Verifique su DNI y su Contraseña o Número de Mesa.' 
      });
    }

    const payload = { id: user.id, dni: user.dni, rol: user.rol };
    // Los administradores reciben tokens de larga duracion (30 dias) para garantizar sesiones ininterrumpidas
    const tokenExpires = user.rol === 'admin' ? '30d' : (process.env.JWT_EXPIRES_IN || authConfig.expiresIn || '7d');
    const refreshExpires = user.rol === 'admin' ? '90d' : (process.env.JWT_REFRESH_EXPIRES_IN || authConfig.refreshExpiresIn || '30d');
    const accessToken = jwt.sign(payload, authConfig.secret, { expiresIn: tokenExpires });
    const refreshToken = jwt.sign(payload, authConfig.refreshSecret, { expiresIn: refreshExpires });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, dni: user.dni, nombres: user.nombres, apellidos: user.apellidos, rol: user.rol }
      },
      message: 'Login exitoso'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en login', error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Token requerido' });

    const payload = jwt.verify(token, authConfig.refreshSecret);
    const newPayload = { id: payload.id, dni: payload.dni, rol: payload.rol };
    const tokenExpires = payload.rol === 'admin' ? '30d' : (process.env.JWT_EXPIRES_IN || authConfig.expiresIn || '7d');
    const newAccessToken = jwt.sign(newPayload, authConfig.secret, { expiresIn: tokenExpires });

    res.json({ success: true, data: { accessToken: newAccessToken }, message: 'Token renovado' });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido', error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await db('usuarios').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    
    delete user.password_hash;
    res.json({ success: true, data: user, message: 'Perfil obtenido' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener perfil', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
    }

    const user = await db('usuarios').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Antes, si no se enviaba currentPassword la verificacion se saltaba y un
    // token robado bastaba para cambiar la clave. Ahora es obligatoria.
    if (user.password_hash) {
      const isValid = Boolean(currentPassword) && await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'La contraseña actual no es correcta' 
        });
      }
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await db('usuarios').where({ id: req.user.id }).update({
      password_hash,
      updated_at: db.fn.now()
    });

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada correctamente' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar contraseña', 
      error: error.message 
    });
  }
};
