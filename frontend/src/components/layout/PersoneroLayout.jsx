import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Inbox, UploadCloud, Activity, LogOut } from 'lucide-react';

const PersoneroLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-16">
      {/* Top Navbar */}
      <header className="bg-blue-600 text-white shadow-md fixed top-0 left-0 right-0 z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">Sistema Electoral</h1>
            <p className="text-xs text-blue-200 truncate max-w-[200px]">{user?.nombres} {user?.apellidos}</p>
          </div>
          <button onClick={logout} className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area (padding top for navbar) */}
      <main className="flex-1 overflow-y-auto pt-16 p-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10 flex justify-around items-center h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <NavLink 
          to="/personero/mi-mesa" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Inbox size={24} className="mb-1" />
          <span>Mi Mesa</span>
        </NavLink>
        <NavLink 
          to="/personero/cargar-resultado" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <UploadCloud size={24} className="mb-1" />
          <span>Cargar</span>
        </NavLink>
        <NavLink 
          to="/personero/estado" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Activity size={24} className="mb-1" />
          <span>Estado</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default PersoneroLayout;
