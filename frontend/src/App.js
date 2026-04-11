import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShieldCheck, UserCircle, LogOut, Users, Ticket, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Licencias from './components/Licencias';
import HistorialUsuarios from './components/HistorialUsuarios'; 
import InnotrevWeb from './components/InnotrevWeb'; 
import ClienteTickets from './components/ClienteTickets';
import ClienteGarantias from './components/ClienteGarantias'; // 👈 ¡CAMBIO AQUÍ!

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'dashboard');

  // Banderas de roles para facilitar la lógica
  const isAdmin = userRole === 'ADMIN';
  const isVentas = userRole === 'VENTAS';
  const isTecnico = userRole === 'TECNICO';

  // Redirección inteligente de pestañas si el rol no tiene permisos
  useEffect(() => {
    if (isVentas && ['dashboard', 'historial'].includes(activeTab)) {
      setActiveTab('inventario');
    } else if (isTecnico && ['inventario', 'historial'].includes(activeTab)) {
      setActiveTab('dashboard'); // El técnico ahora sí tiene dashboard
    } else {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, isVentas, isTecnico]);

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

  // Si no está autenticado o es cliente, mostramos el portal público/cliente
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

  // --- MINI-COMPONENTE PARA LOS BOTONES DEL MENÚ ---
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
        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 -z-10"></div>}
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
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>

        {/* LOGO AREA Y BADGE DE ROL DINÁMICO */}
        <div className="h-20 flex items-center px-8 text-white font-black text-2xl tracking-widest border-b border-white/5 shrink-0 relative z-10">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-400">INNOTREV</span>
          <span className={`ml-2 border text-[9px] px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1 ${
            isAdmin ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
            isTecnico ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            <Zap size={10} /> {userRole || 'STAFF'}
          </span>
        </div>
        
        {/* NAVEGACIÓN BASADA EN ROLES */}
        <nav className="flex-1 py-8 px-5 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
          <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Panel de Control</p>
          
          {/* Visible para Admin y Técnico */}
          {(isAdmin || isTecnico) && <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard General" />}
          
          {/* Visible para Admin y Ventas */}
          {(isAdmin || isVentas) && <NavItem id="inventario" icon={Package} label="Gestión de Inventario" />}
          
          {/* Visible SOLO para Admin */}
          {isAdmin && <NavItem id="historial" icon={Users} label="Registro de Usuarios" />}
          
          {/* Visible para Todos los Internos */}
          {(isAdmin || isTecnico || isVentas) && (
            <>
              <NavItem id="polizas" icon={ShieldCheck} label="Bóveda de Licencias" />
              <NavItem id="cliente_garantias" icon={Award} label="Visor de Garantías" />
              <NavItem id="cliente_tickets" icon={Ticket} label="Mesa de Tickets" />
            </>
          )}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>
        </nav>

        {/* PERFIL DE USUARIO Y LOGOUT */}
        <div className="p-5 border-t border-white/5 bg-[#050b1a]/90 backdrop-blur-md shrink-0 relative z-10">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl mb-3 border border-white/10 transition-colors cursor-default">
            <UserCircle size={32} className={`shrink-0 drop-shadow-md ${isAdmin ? 'text-blue-400' : isTecnico ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName || 'Personal Innotrev'}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{userRole}</p>
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
            {activeTab === 'dashboard' && (isAdmin || isTecnico) && <Dashboard />}
            {activeTab === 'inventario' && (isAdmin || isVentas) && <Inventario />}
            {activeTab === 'historial' && isAdmin && <HistorialUsuarios />}
            {activeTab === 'polizas' && (isAdmin || isTecnico || isVentas) && <Licencias />}
            {activeTab === 'cliente_garantias' && (isAdmin || isTecnico || isVentas) && <ClienteGarantias />} {/* 👈 ¡CAMBIO AQUÍ! */}
            {activeTab === 'cliente_tickets' && (isAdmin || isTecnico || isVentas) && <ClienteTickets />}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}

export default App;