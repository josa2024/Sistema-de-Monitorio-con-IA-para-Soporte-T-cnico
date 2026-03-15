import React, { useState } from 'react';
import { LayoutDashboard, Package, ShieldCheck, UserCircle, LogOut, Users } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Garantias from './components/Garantias';
import HistorialUsuarios from './components/HistorialUsuarios'; 
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

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      <aside className="w-[280px] bg-[#070d24] text-slate-400 flex flex-col shadow-2xl z-20 border-r border-slate-800/50">
        <div className="h-20 flex items-center px-8 bg-[#040817] text-white font-black text-2xl tracking-widest border-b border-white/5 shadow-inner">
          INNOTREV <span className="text-blue-500 ml-2 text-[10px] bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-widest border border-blue-500/20">Admin</span>
        </div>
        
        <nav className="flex-1 py-8 px-5 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[11px] font-black text-slate-600 uppercase tracking-widest mb-4">Panel de Control</p>
          
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' : 'hover:bg-white/5 hover:text-slate-200'}`}>
            <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-500'} /> Dashboard General
          </button>
          
          <button onClick={() => setActiveTab('inventario')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'inventario' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' : 'hover:bg-white/5 hover:text-slate-200'}`}>
            <Package size={20} className={activeTab === 'inventario' ? 'text-white' : 'text-slate-500'} /> Gestión de Inventario
          </button>

          {/* NUEVO BOTÓN: Historial de Usuarios */}
          <button onClick={() => setActiveTab('historial')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'historial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' : 'hover:bg-white/5 hover:text-slate-200'}`}>
            <Users size={20} className={activeTab === 'historial' ? 'text-white' : 'text-slate-500'} /> Historial y Seguimiento
          </button>
          
          <button onClick={() => setActiveTab('garantias')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${activeTab === 'garantias' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' : 'hover:bg-white/5 hover:text-slate-200'}`}>
            <ShieldCheck size={20} className={activeTab === 'garantias' ? 'text-white' : 'text-slate-500'} /> Licencias y Pólizas
          </button>
        </nav>

        <div className="p-5 border-t border-white/5 bg-gradient-to-t from-[#040817] to-transparent">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-white/5 rounded-2xl mb-4 border border-white/5 backdrop-blur-sm">
            <UserCircle size={24} className="text-emerald-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName || 'Administrador'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{userRole}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-2xl transition-colors border border-transparent hover:border-red-500/20">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] relative custom-scrollbar">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'inventario' && <Inventario />}
        {activeTab === 'historial' && <HistorialUsuarios />} {/* NUEVA RUTA */}
        {activeTab === 'garantias' && <Garantias />}
      </main>
    </div>
  );
}

export default App;