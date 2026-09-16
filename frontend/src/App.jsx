import React, { Suspense, lazy } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/ui/Spinner';

/**
 * Carga diferida por rol.
 *
 * Antes el paquete incluia todas las pantallas: un personero con celular de
 * gama baja y red 3G descargaba tambien el panel de administracion, la
 * auditoria y las graficas. Ahora cada rol descarga solo lo suyo.
 */

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UsuariosPage = lazy(() => import('./pages/admin/UsuariosPage'));
const LocalesPage = lazy(() => import('./pages/admin/LocalesPage'));
const MesasPage = lazy(() => import('./pages/admin/MesasPage'));
const CandidatosPage = lazy(() => import('./pages/admin/CandidatosPage'));
const AsignacionesPage = lazy(() => import('./pages/admin/AsignacionesPage'));
const ResultadosAdminPage = lazy(() => import('./pages/admin/ResultadosAdminPage'));
const AuditoriaPage = lazy(() => import('./pages/admin/AuditoriaPage'));

const CoordinadorLayout = lazy(() => import('./components/layout/CoordinadorLayout'));
const MisLocalesPage = lazy(() => import('./pages/coordinador/MisLocalesPage'));
const MesasLocalPage = lazy(() => import('./pages/coordinador/MesasLocalPage'));
const ResultadoDetallePage = lazy(() => import('./pages/coordinador/ResultadoDetallePage'));
const PersonerosSupervisadosPage = lazy(() => import('./pages/coordinador/PersonerosSupervisadosPage'));

const PersoneroLayout = lazy(() => import('./components/layout/PersoneroLayout'));
const MiMesaPage = lazy(() => import('./pages/personero/MiMesaPage'));
const CargarResultadoPage = lazy(() => import('./pages/personero/CargarResultadoPage'));
const EstadoResultadoPage = lazy(() => import('./pages/personero/EstadoResultadoPage'));

const Cargando = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spinner />
  </div>
);

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <Cargando />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.rol === 'coordinador') return <Navigate to="/coordinador/mis-locales" replace />;
  if (user.rol === 'personero') return <Navigate to="/personero/mi-mesa" replace />;
  return <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute role="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'usuarios', element: <UsuariosPage /> },
      { path: 'locales', element: <LocalesPage /> },
      { path: 'mesas', element: <MesasPage /> },
      { path: 'candidatos', element: <CandidatosPage /> },
      { path: 'asignaciones', element: <AsignacionesPage /> },
      { path: 'resultados', element: <ResultadosAdminPage /> },
      { path: 'auditoria', element: <AuditoriaPage /> },
      { path: '', element: <Navigate to="/admin/dashboard" replace /> },
    ],
  },
  {
    path: '/coordinador',
    element: (
      <ProtectedRoute role="coordinador">
        <CoordinadorLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'mis-locales', element: <MisLocalesPage /> },
      { path: 'mesas/:localId', element: <MesasLocalPage /> },
      { path: 'resultado/:id', element: <ResultadoDetallePage /> },
      { path: 'personeros', element: <PersonerosSupervisadosPage /> },
      { path: '', element: <Navigate to="/coordinador/mis-locales" replace /> },
    ],
  },
  {
    path: '/personero',
    element: (
      <ProtectedRoute role="personero">
        <PersoneroLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'mi-mesa', element: <MiMesaPage /> },
      { path: 'cargar-resultado', element: <CargarResultadoPage /> },
      { path: 'estado', element: <EstadoResultadoPage /> },
      { path: '', element: <Navigate to="/personero/mi-mesa" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

const App = () => (
  <AuthProvider>
    <SocketProvider>
      <Suspense fallback={<Cargando />}>
        <RouterProvider router={router} />
      </Suspense>
    </SocketProvider>
  </AuthProvider>
);

export default App;
