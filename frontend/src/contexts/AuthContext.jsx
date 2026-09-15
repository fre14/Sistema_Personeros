import React, { createContext, useState, useEffect, useContext } from 'react';
import { get, post } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await get('/auth/profile');
          setUser(res.data.data);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (dni, password) => {
    try {
      const res = await post('/auth/login', { dni, password });
      const { accessToken, refreshToken, user: userData } = res.data.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);
      setUser(userData);
      return userData;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al iniciar sesión');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.rol === 'admin';
  const isCoordinador = user?.rol === 'coordinador';
  const isPersonero = user?.rol === 'personero';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isCoordinador, isPersonero }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
