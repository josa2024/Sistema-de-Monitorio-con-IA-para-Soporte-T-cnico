import React, { useState } from 'react';
import { LayoutDashboard, Package, ShieldCheck, UserCircle, LogOut, Users, Ticket, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Agregamos animaciones
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Garantias from './components/Garantias';
import HistorialUsuarios from './components/HistorialUsuarios'; 
import InnotrevWeb from './components/InnotrevWeb'; 
import ClienteTickets from './components/ClienteTickets';
import ClienteGarantias from './components/ClienteGarantias';

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

  // --- MINI-COMPONENTE PARA LOS BOTONES DEL MENÚ (Código más limpio) ---
  const NavItem = ({ id, icon: Icon, label }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 text-sm font-bold relative overflow-hidden group ${
          isActive 
            ? 'text-white shadow-lg shadow-blue-900/40 translate-x-1' 
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
        }`}
      >
        {/* Fondo con degradado para el botón activo */}
        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 -z-10"></div>}
        {/* Línea indicadora brillante a la izquierda */}
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-0"></div>}
        
        <Icon size={20} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`} />
        <span className="relative z-10">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      
      {/* BARRA LATERAL (SIDEBAR) PREMIUM */}
      <aside className="w-[280px] bg-[#050b1a] flex flex-col shadow-2xl z-20 border-r border-slate-800/60 shrink-0 relative overflow-hidden">
        {/* Destello de luz de fondo sutil */}
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>

        {/* LOGO AREA */}
        <div className="h-20 flex items-center px-8 text-white font-black text-2xl tracking-widest border-b border-white/5 shrink-0 relative z-10">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400">INNOTREV</span>
          <span className="ml-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1">
            <Zap size={10} className="text-blue-400" /> Admin
          </span>
        </div>
        
        {/* NAVEGACIÓN */}
        <nav className="flex-1 py-8 px-5 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
          <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Panel de Control</p>
          
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard General" />
          <NavItem id="inventario" icon={Package} label="Gestión de Inventario" />
          <NavItem id="historial" icon={Users} label="Historial de Usuarios" />
          <NavItem id="polizas" icon={ShieldCheck} label="Bóveda de Pólizas" />

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>
          
          <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Seguimiento Global</p>

          <NavItem id="cliente_garantias" icon={Award} label="Garantías de Equipos" />
          <NavItem id="cliente_tickets" icon={Ticket} label="Todos los Tickets" />
        </nav>

        {/* PERFIL DE USUARIO Y LOGOUT */}
        <div className="p-5 border-t border-white/5 bg-[#050b1a]/90 backdrop-blur-md shrink-0 relative z-10">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl mb-3 border border-white/10 transition-colors cursor-default">
            <UserCircle size={32} className="text-emerald-400 shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName || 'Administrador'}</p>
              <p className="text-[10px] text-emerald-400/80 font-black uppercase tracking-widest mt-0.5">{userRole}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all border border-transparent hover:border-red-500/20 group">
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CON ANIMACIONES DE TRANSICIÓN */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] relative custom-scrollbar flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'inventario' && <Inventario />}
            {activeTab === 'historial' && <HistorialUsuarios />}
            {activeTab === 'polizas' && <Garantias />}
            {activeTab === 'cliente_garantias' && <ClienteGarantias />}
            {activeTab === 'cliente_tickets' && <ClienteTickets />}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}

export default App;