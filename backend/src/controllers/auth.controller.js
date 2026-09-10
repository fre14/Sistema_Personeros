import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Controller para Auth
 */

export const login = async (req, res) => {
  try {
    const { dni, password } = req.body;
    const user = await db('usuarios').where({ dni, activo: true }).first();
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    let isValid = false;

    // 1. Verificación estándar de password con bcrypt
    if (user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    }

    // 2. Si es personero, permitir autenticación con su número de mesa oficial asignado
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
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh', { expiresIn: '7d' });

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

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh');
    const newPayload = { id: payload.id, dni: payload.dni, rol: payload.rol };
    const newAccessToken = jwt.sign(newPayload, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });

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

    // Si el usuario ya tiene contraseña, verificar la actual
    if (user.password_hash && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
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
