import React, { useEffect } from 'react';
import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import CoordinadorLayout from './components/layout/CoordinadorLayout';
import PersoneroLayout from './components/layout/PersoneroLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsuariosPage from './pages/admin/UsuariosPage';
import LocalesPage from './pages/admin/LocalesPage';
import MesasPage from './pages/admin/MesasPage';
import CandidatosPage from './pages/admin/CandidatosPage';
import AsignacionesPage from './pages/admin/AsignacionesPage';
import ResultadosAdminPage from './pages/admin/ResultadosAdminPage';
import AuditoriaPage from './pages/admin/AuditoriaPage';
import MisLocalesPage from './pages/coordinador/MisLocalesPage';
import MesasLocalPage from './pages/coordinador/MesasLocalPage';
import ResultadoDetallePage from './pages/coordinador/ResultadoDetallePage';
import MiMesaPage from './pages/personero/MiMesaPage';
import CargarResultadoPage from './pages/personero/CargarResultadoPage';
import EstadoResultadoPage from './pages/personero/EstadoResultadoPage';

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.rol === 'coordinador') return <Navigate to="/coordinador/mis-locales" replace />;
  if (user.rol === 'personero') return <Navigate to="/personero/mi-mesa" replace />;
  return <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
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
      { path: '', element: <Navigate to="/admin/dashboard" replace /> }
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
      { path: '', element: <Navigate to="/coordinador/mis-locales" replace /> }
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
      { path: '', element: <Navigate to="/personero/mi-mesa" replace /> }
    ],
  }
]);

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
