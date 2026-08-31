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

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
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
