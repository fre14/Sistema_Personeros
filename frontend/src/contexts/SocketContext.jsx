import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

/**
 * Conexion en tiempo real.
 *
 * Cambios: una sola instancia de socket por sesion (antes se recreaba en
 * cada render que cambiara el token), reconexion con respaldo por polling
 * para redes moviles debiles, y estado de conexion visible para la interfaz.
 */

const SocketContext = createContext({ socket: null, connected: false });

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return undefined;
    }

    const url = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(url, {
      // Funcion y no objeto: en cada reconexion se lee el token vigente. Antes
      // se reutilizaba el del login y, al vencer, el socket no volvia a entrar.
      auth: (cb) => cb({ token: localStorage.getItem('token') || token }),
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    let intentosAuth = 0;
    let renovando = false;
    let temporizador = null;

    socket.on('connect', () => {
      intentosAuth = 0;
      setConnected(true);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', async () => {
      setConnected(false);
      // Si el servidor rechazo el token (socket.active=false), el cliente ya no
      // reintenta solo. Se fuerza la renovacion del token (el interceptor de
      // api.js lo hace ante un 401) y se reconecta con espera creciente.
      if (socket.active || renovando) return;
      renovando = true;
      try {
        await api.get('/auth/profile');
      } catch {
        // Si no se pudo renovar, api.js ya envia al usuario al login.
      } finally {
        renovando = false;
      }
      const espera = Math.min(30000, 1000 * 2 ** intentosAuth);
      intentosAuth += 1;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (!socket.connected && localStorage.getItem('token')) socket.connect();
      }, espera);
    });

    socketRef.current = socket;

    return () => {
      clearTimeout(temporizador);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
