import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Users, LogOut, Menu } from 'lucide-react';

const CoordinadorLayout = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

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
      <aside className={`fixed inset-y-0 left-0 bg-red-900 text-white w-64 flex flex-col transition-transform duration-300 z-30 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl`}>
        <div className="p-4 border-b border-red-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🗳️</span>
            <div>
              <h1 className="text-base font-bold truncate leading-tight">Coordinación</h1>
              <p className="text-xs text-red-200">Huamanga 2026</p>
            </div>
          </div>
          <button className="lg:hidden text-red-200 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <Menu size={24} />
          </button>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/coordinador/mis-locales"
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-red-800 text-white border-l-4 border-white font-bold' : 'text-red-100 hover:bg-red-800/70 hover:text-white border-l-4 border-transparent'}`
                }
              >
                <MapPin className="mr-3 h-5 w-5" />
                Mis Locales
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/coordinador/personeros"
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-red-800 text-white border-l-4 border-white font-bold' : 'text-red-100 hover:bg-red-800/70 hover:text-white border-l-4 border-transparent'}`
                }
              >
                <Users className="mr-3 h-5 w-5" />
                Personeros Supervisados
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-red-800 bg-red-950/40">
          <div className="flex items-center mb-4 truncate text-sm">
            <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center font-bold mr-3 border border-red-500">
              {user?.nombres?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold truncate">{user?.nombres}</p>
              <p className="text-xs text-red-300 truncate capitalize">Coordinador de Local</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-200 hover:text-white hover:bg-red-800 rounded transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm lg:hidden flex items-center p-4 border-b border-gray-200">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 mr-4">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🗳️</span>
            <h2 className="text-xl font-semibold text-gray-800 truncate">Panel Coordinador</h2>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CoordinadorLayout;
