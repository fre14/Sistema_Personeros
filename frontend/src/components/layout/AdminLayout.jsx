import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { LayoutDashboard, Users, MapPin, Inbox, UsersRound, ClipboardList, BarChart3, ShieldCheck, LogOut, Menu, Key } from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('La nueva contraseña y la confirmación no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoadingPass(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('¡Contraseña actualizada con éxito!');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoadingPass(false);
    }
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
    { to: '/admin/locales', icon: MapPin, label: 'Locales' },
    { to: '/admin/mesas', icon: Inbox, label: 'Mesas' },
    { to: '/admin/candidatos', icon: UsersRound, label: 'Candidatos' },
    { to: '/admin/asignaciones', icon: ClipboardList, label: 'Asignaciones' },
    { to: '/admin/resultados', icon: BarChart3, label: 'Resultados' },
    { to: '/admin/auditoria', icon: ShieldCheck, label: 'Auditoría' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-blue-900 text-white w-64 flex flex-col transition-transform duration-300 z-30 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-blue-800 flex items-center justify-between">
          <h1 className="text-xl font-bold truncate">Sistema Electoral</h1>
          <button className="lg:hidden text-blue-200 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <Menu size={24} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => 
                    `flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-800 text-white border-l-4 border-white' : 'text-blue-100 hover:bg-blue-800 hover:text-white border-l-4 border-transparent'}`
                  }
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <div className="flex items-center mb-3 truncate text-sm">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold mr-3">
              {user?.nombres?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold truncate">{user?.nombres} {user?.apellidos}</p>
              <p className="text-xs text-blue-300 truncate capitalize">{user?.rol} • DNI {user?.dni}</p>
            </div>
          </div>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center w-full px-4 py-2 mb-1 text-sm text-blue-200 hover:text-white hover:bg-blue-800 rounded transition-colors"
          >
            <Key className="mr-2 h-4 w-4" />
            Cambiar Contraseña
          </button>
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-300 hover:text-red-100 hover:bg-blue-800 rounded transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Modal Cambiar Contraseña */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Key className="mr-2 text-blue-600" size={20} />
                Cambiar Contraseña
              </h3>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingPass}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingPass ? 'Guardando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm lg:hidden flex items-center p-4">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 mr-4">
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-semibold text-gray-800 truncate">Sistema Electoral</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
