import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShieldCheck, UserCircle, LogOut, Users, Ticket, Award, Zap, Bell, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Licencias from './components/Licencias';
import HistorialUsuarios from './components/HistorialUsuarios'; 
import InnotrevWeb from './components/InnotrevWeb'; 
import ClienteTickets from './components/ClienteTickets';
import Garantias from './components/Garantias';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'dashboard');

  // 🔥 ESTADOS PARA EL SISTEMA GLOBAL DE NOTIFICACIONES (LA CAMPANITA)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Banderas de roles para facilitar la lógica
  const isAdmin = userRole === 'ADMIN';
  const isVentas = userRole === 'VENTAS';
  const isTecnico = userRole === 'TECNICO';

  // Redirección inteligente de pestañas si el rol no tiene permisos
  useEffect(() => {
    if (isVentas && ['dashboard', 'historial'].includes(activeTab)) {
      setActiveTab('inventario');
    } else if (isTecnico && ['inventario', 'historial'].includes(activeTab)) {
      setActiveTab('dashboard');
    } else {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, isVentas, isTecnico]);

  // 🔥 CONEXIÓN GLOBAL A WEBSOCKETS PARA LAS NOTIFICACIONES
  useEffect(() => {
    const token = localStorage.getItem('token');
    // Solo conectamos si está autenticado y es personal interno (no clientes)
    if (!token || !isAuthenticated || userRole === 'CLIENTE') return;

    let socket;
    let reconnectAttempts = 0;
    let shouldReconnect = true;

    const initWebSocket = () => {
      if (!shouldReconnect) return;

      socket = new WebSocket(`ws://localhost:8000/api/v1/ws/tickets?token=${token}`);

      socket.onopen = () => {
        console.log("🔔 WebSocket Global (Notificaciones) Conectado");
        reconnectAttempts = 0;
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Formatear el mensaje según el tipo de evento
        let title = "Nueva Notificación";
        let desc = "";
        let isAlert = false;

        if (data.evento === "NUEVO_TICKET") {
          title = "NUEVO TICKET IA";
          desc = `Se ha generado el folio TKT-${String(data.ticket_id).padStart(4, '0')}.`;
          isAlert = true;
        } else if (data.evento === "EQUIPO_REGISTRADO") {
          title = "ENVÍO REGISTRADO";
          desc = `Equipo registrado en sistema con S/N: ${data.numero_serie}.`;
        } else if (data.evento === "EQUIPO_RECEPCIONADO") {
          title = "RECEPCIÓN CONFIRMADA";
          desc = `El equipo ID ${data.equipo_id} ha sido recibido y revisado.`;
          if (data.status === 'FALLA_REPORTADA') isAlert = true;
        } else if (data.evento === "GARANTIA_ACTIVADA") {
          title = "GARANTÍA ACTIVA";
          desc = `Garantía activada para equipo ID ${data.equipo_id}. Vence: ${new Date(data.fecha_vencimiento).toLocaleDateString()}`;
        } else {
          return; // Si es un ping u otro evento, lo ignoramos
        }

        const newNotif = {
          id: Date.now(),
          title,
          desc,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAlert
        };

        setNotifications(prev => [newNotif, ...prev].slice(0, 15)); // Guardar las últimas 15
        setUnreadCount(prev => prev + 1);
      };

      socket.onclose = () => {
        if (!shouldReconnect) return;
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
        reconnectAttempts++;
        setTimeout(initWebSocket, delay);
      };
    };

    initWebSocket();

    return () => {
      shouldReconnect = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [isAuthenticated, userRole]);

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

  const openNotifications = () => {
    setIsNotifOpen(true);
    setUnreadCount(0); // Limpiar contador al abrir
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

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-hidden bg-[#f8fafc] relative flex flex-col">
        
        {/* BARRA SUPERIOR PARA LA CAMPANITA (OPCIONAL, QUEDA FLOTANDO) */}
        <div className="absolute top-6 right-8 z-30">
          <div className="relative">
            <button 
              onClick={openNotifications} 
              className="bg-white border border-slate-200 p-3.5 rounded-full shadow-md hover:shadow-lg transition-all text-slate-600 hover:text-blue-600 focus:outline-none"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* PANEL DESPLEGABLE DE NOTIFICACIONES */}
            <AnimatePresence>
              {isNotifOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998]" onClick={() => setIsNotifOpen(false)}></motion.div>
                  <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className="absolute right-0 mt-3 w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-[9999] flex flex-col max-h-[600px]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-black text-[#0b1437] flex items-center gap-2"><Bell size={18} className="text-blue-500"/> Notificaciones Globales</h3>
                      <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm"><X size={16}/></button>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {notifications.map(notif => (
                            <div key={notif.id} className="p-5 hover:bg-slate-50 transition-colors flex gap-4 items-start">
                              <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${notif.isAlert ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                              <div>
                                <p className={`text-xs font-black uppercase tracking-widest mb-1 ${notif.isAlert ? 'text-red-600' : 'text-[#0b1437]'}`}>{notif.title}</p>
                                <p className="text-sm font-medium text-slate-600 mb-1">{notif.desc}</p>
                                <p className="text-[10px] font-bold text-slate-400">{notif.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                          <Activity size={32} className="mb-3 opacity-30" />
                          <p className="text-sm font-bold text-[#0b1437] mb-1">Sin alertas recientes</p>
                          <p className="text-xs font-medium">El sistema monitoreará la actividad en segundo plano.</p>
                        </div>
                      )}
                    </div>
                    
                    {notifications.length > 0 && (
                      <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                        <button onClick={() => setNotifications([])} className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#0b1437] transition-colors">Limpiar Historial</button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL ANIMADO */}
        <div className="flex-1 overflow-y-auto relative w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col h-full"
            >
              {activeTab === 'dashboard' && (isAdmin || isTecnico) && <Dashboard />}
              {activeTab === 'inventario' && (isAdmin || isVentas) && <Inventario />}
              {activeTab === 'historial' && isAdmin && <HistorialUsuarios />}
              {activeTab === 'polizas' && (isAdmin || isTecnico || isVentas) && <Licencias />}
              {/* ¡YA ESTÁ CORRECTO APUNTANDO A Garantias! */}
              {activeTab === 'cliente_garantias' && (isAdmin || isTecnico || isVentas) && <Garantias />} 
              {activeTab === 'cliente_tickets' && (isAdmin || isTecnico || isVentas) && <ClienteTickets />}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}

export default App;