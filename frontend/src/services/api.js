import axios from 'axios';

/**
 * Cliente HTTP.
 *
 * Mejoras respecto a la version anterior:
 *  - Renovacion automatica del token: antes, al vencer el access token el
 *    usuario era expulsado al login. En plena jornada eso significa un
 *    personero perdiendo el acta que estaba llenando.
 *  - Las peticiones que fallan por un 401 se reintentan una sola vez tras
 *    renovar, y las simultaneas esperan a la misma renovacion (sin avalancha).
 *  - Timeout explicito: en redes moviles lentas una peticion colgada dejaba
 *    la pantalla bloqueada para siempre.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 30000),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let renovando = null;

const cerrarSesion = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

const renovarToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Sin refresh token');

  const base = import.meta.env.VITE_API_URL || '/api';
  const { data } = await axios.post(`${base}/auth/refresh`, { token: refreshToken });
  const nuevo = data?.data?.accessToken;
  if (!nuevo) throw new Error('Respuesta de refresh invalida');

  localStorage.setItem('token', nuevo);
  return nuevo;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._reintentado) {
      original._reintentado = true;
      try {
        renovando = renovando || renovarToken().finally(() => { renovando = null; });
        const nuevo = await renovando;
        original.headers.Authorization = `Bearer ${nuevo}`;
        return api(original);
      } catch {
        cerrarSesion();
        return Promise.reject(error);
      }
    }

    if (status === 401) cerrarSesion();
    return Promise.reject(error);
  }
);

export const get = (url, config = {}) => api.get(url, config);
export const post = (url, data, config = {}) => api.post(url, data, config);
export const put = (url, data, config = {}) => api.put(url, data, config);
export const patch = (url, data, config = {}) => api.patch(url, data, config);
export const del = (url, config = {}) => api.delete(url, config);

export default api;
