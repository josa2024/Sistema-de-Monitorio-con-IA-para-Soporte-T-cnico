import React, { useState } from 'react';
import { LayoutDashboard, Package, ShieldCheck, UserCircle, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Garantias from './components/Garantias';
import InnotrevWeb from './components/InnotrevWeb'; 

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLoginSuccess = (token, role, nombre) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    if (nombre) localStorage.setItem('userName', nombre);
    
    setIsAuthenticated(true);
    setUserRole(role);
    if (nombre) setUserName(nombre);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserName('');
  };

  // 1. ES UN VISITANTE PÚBLICO O ES UN CLIENTE LOGUEADO
  if (!isAuthenticated || userRole === 'CLIENTE') {
    return (
      <InnotrevWeb 
        isAuthenticated={isAuthenticated} 
        userName={userName} 
        onLoginSuccess={handleLoginSuccess} 
        onLogout={handleLogout} 
      />
    );
  }

  // 2. ES UN ADMINISTRADOR -> Mostrar Dashboard Privado
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="h-16 flex items-center px-6 bg-slate-950 text-white font-bold text-xl tracking-widest border-b border-slate-800">
          INNOTREV <span className="text-blue-500 ml-2 text-sm bg-blue-500/10 px-2 py-0.5 rounded">ADMIN</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Panel de Control</p>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={20} /> Dashboard General</button>
          <button onClick={() => setActiveTab('inventario')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'inventario' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}><Package size={20} /> Gestión de Inventario</button>
          <button onClick={() => setActiveTab('garantias')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${activeTab === 'garantias' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}><ShieldCheck size={20} /> Licencias y Pólizas</button>
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl mb-3 border border-slate-700">
            <UserCircle size={20} className="text-blue-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName || 'Administrador'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{userRole}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors border border-transparent hover:border-red-500/20"><LogOut size={18} /> Cerrar Sesión</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'inventario' && <Inventario />}
        {activeTab === 'garantias' && <Garantias />}
      </main>
    </div>
  );
}

export default App;