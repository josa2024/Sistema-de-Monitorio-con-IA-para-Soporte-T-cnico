import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShieldCheck, UserCircle, LogOut } from 'lucide-react';

// Importación de Componentes
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Garantias from './components/Garantias';
import InnotrevWeb from './components/InnotrevWeb'; // El nuevo Súper Componente unificado

function App() {
  // --- ESTADOS DE AUTENTICACIÓN Y NAVEGACIÓN ---
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  
  // Estado para el menú del Administrador
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estado para saber si estamos viendo la web pública o la pantalla de Login
  const [publicView, setPublicView] = useState('web');

  // --- MANEJADORES DE SESIÓN ---
  const handleLoginSuccess = (token, role, nombre) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    if (nombre) localStorage.setItem('userName', nombre);
    
    setIsAuthenticated(true);
    setUserRole(role);
    if (nombre) setUserName(nombre);
    
    setPublicView('web'); // Al iniciar sesión, reseteamos la vista pública
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
    setPublicView('web'); // Al cerrar sesión, los mandamos a la web comercial
  };

  // ==========================================
  // LÓGICA DE RUTAS (ROUTER MANUAL)
  // ==========================================

  // 1. EL USUARIO QUIERE INICIAR SESIÓN (NO ESTÁ AUTENTICADO)
  if (!isAuthenticated && publicView === 'login') {
    return (
      <div className="relative h-screen bg-slate-50">
        <button 
          onClick={() => setPublicView('web')} 
          className="absolute top-6 left-6 z-50 text-slate-500 hover:text-blue-600 font-medium flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm"
        >
          ← Volver a Innotrev
        </button>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // 2. ES UN VISITANTE PÚBLICO O ES UN CLIENTE LOGUEADO
  if (!isAuthenticated || userRole === 'CLIENTE') {
    return (
      <InnotrevWeb 
        isAuthenticated={isAuthenticated} 
        userName={userName} 
        onLoginClick={() => setPublicView('login')} 
        onLogout={handleLogout} 
      />
    );
  }

  // 3. ES UN ADMINISTRADOR (O TÉCNICO) -> Mostrar Dashboard Privado
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR DEL ADMINISTRADOR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="h-16 flex items-center px-6 bg-slate-950 text-white font-bold text-xl tracking-widest border-b border-slate-800">
          INNOTREV <span className="text-blue-500 ml-2 text-sm bg-blue-500/10 px-2 py-0.5 rounded">ADMIN</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Panel de Control</p>
          
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} /> Dashboard General
          </button>
          
          <button 
            onClick={() => setActiveTab('inventario')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'inventario' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Package size={20} /> Gestión de Inventario
          </button>
          
          <button 
            onClick={() => setActiveTab('garantias')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'garantias' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <ShieldCheck size={20} /> Garantías y Licencias
          </button>
        </nav>

        {/* PERFIL Y LOGOUT DEL ADMIN */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl mb-3 border border-slate-700">
            <UserCircle size={20} className="text-blue-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName || 'Administrador'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{userRole}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO DEL ADMINISTRADOR */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'inventario' && <Inventario />}
        {activeTab === 'garantias' && <Garantias />}
      </main>
    </div>
  );
}

export default App;