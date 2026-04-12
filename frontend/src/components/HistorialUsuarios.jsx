import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, Truck, CheckCircle2, Ticket, Mail, Phone, Clock, Plus, X, ShieldCheck, Briefcase, Activity, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HistorialUsuarios = () => {
  const [users, setUsers] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para el Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    role_id: 3 // Por defecto: 1=ADMIN, 2=VENTAS, 3=CLIENTE, 4=TECNICO
  });

  const fetchAllData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [resCl, resEq, resTk] = await Promise.all([
        fetch('http://localhost:8000/api/v1/usuarios/?t=' + Date.now(), { headers }),
        fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers }),
        fetch('http://localhost:8000/api/v1/tickets/?t=' + Date.now(), { headers })
      ]);
      
      if (resCl.ok) {
        const allUsers = await resCl.json();
        setUsers(allUsers); // Ahora mostramos a todos los usuarios, no solo clientes
      }
      if (resEq.ok) setEquipments(await resEq.json());
      if (resTk.ok) setTickets(await resTk.json());
    } catch (error) {
      console.error("Error cargando historial", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/usuarios/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear el usuario');
      }

      alert("✅ Usuario creado exitosamente");
      setIsModalOpen(false);
      setFormData({ nombre: '', email: '', password: '', role_id: 3 });
      fetchAllData(); // Recargamos la lista
    } catch (error) {
      alert("❌ " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para armar la línea de tiempo del cliente
  const buildTimeline = (clientId) => {
    let events = [];
    const clientEqs = equipments.filter(eq => eq.cliente_id === clientId);
    const clientEqIds = clientEqs.map(eq => eq.id);
    const clientTkts = tickets.filter(t => clientEqIds.includes(t.equipo_id) || t.cliente_id === clientId);

    clientEqs.forEach(eq => {
      events.push({
        id: `desp-${eq.id}`,
        date: eq.created_at || '2026-01-01T00:00:00',
        type: 'DESPACHO', title: 'Hardware Asignado',
        desc: `Se despachó el equipo: ${eq.modelo} (S/N: ${eq.numero_serie}). Estado actual: ${eq.status.replace('_', ' ')}.`,
        icon: Truck, color: 'bg-blue-100 text-blue-600 border-blue-200'
      });

      if (eq.status === 'INSTALADO' || eq.fecha_recepcion) {
        events.push({
          id: `rec-${eq.id}`,
          date: eq.fecha_recepcion || eq.created_at,
          type: 'RECEPCION', title: 'Equipo Instalado / Activo',
          desc: `El equipo ${eq.modelo} fue recepcionado correctamente y está en operación.`,
          icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600 border-emerald-200'
        });
      }
    });

    clientTkts.forEach(t => {
      events.push({
        id: `tkt-${t.id}`,
        date: t.created_at || '2026-01-10T00:00:00',
        type: 'TICKET', title: `Ticket de Soporte (TKT-${String(t.id).padStart(4, '0')})`,
        desc: `Reporte: "${t.descripcion || t.titulo}". Prioridad: ${t.prioridad || 'Baja'}. Estado: ${t.status}.`,
        icon: Ticket, color: 'bg-red-100 text-red-600 border-red-200'
      });
    });

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getRoleInfo = (roleName, roleId) => {
    const name = roleName || (roleId === 1 ? 'ADMIN' : roleId === 2 ? 'VENTAS' : roleId === 4 ? 'TECNICO' : 'CLIENTE');
    if (name === 'ADMIN') return { label: 'Administrador', icon: <ShieldCheck size={10}/>, style: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    if (name === 'VENTAS') return { label: 'Ventas', icon: <Briefcase size={10}/>, style: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (name === 'TECNICO') return { label: 'Soporte Técnico', icon: <User size={10}/>, style: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { label: 'Cliente Activo', icon: <User size={10}/>, style: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  return (
    // 🔥 CAMBIO CLAVE AQUÍ: 'absolute inset-0' y 'overflow-hidden' para bloquear el scroll global
    <div className="absolute inset-0 p-6 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-[#0b1437] flex items-center gap-3">
            <Database className="text-blue-600" size={32} /> Directorio y Cuentas
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Gestiona el personal de Innotrev y visualiza la radiografía operativa de los clientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0b1437] hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 shrink-0"
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* 🔥 ÁREA PRINCIPAL: 'flex-1 min-h-0' para permitir scrolls internos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 h-[calc(100vh-280px)]">
        
        {/* PANEL IZQUIERDO: DIRECTORIO DE USUARIOS (SCROLL INTERNO) */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden lg:col-span-4 xl:col-span-3">
          <div className="p-6 border-b border-slate-50 bg-[#0b1437] text-white relative overflow-hidden shrink-0">
            <div className="absolute -right-4 -top-4 opacity-10"><User size={100} /></div>
            <h2 className="font-bold text-sm tracking-widest uppercase mb-5 relative z-10">Directorio del Sistema</h2>
            <div className="relative z-10 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o correo..." 
                className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm focus:bg-white focus:text-[#0b1437] outline-none transition-all font-medium placeholder:text-blue-300 shadow-inner" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
            {isLoading ? (
               <div className="text-center py-10 flex flex-col items-center gap-3 text-slate-400">
                 <Activity size={24} className="animate-pulse text-blue-400" />
                 <span className="text-sm font-bold uppercase tracking-widest">Cargando directorio...</span>
               </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(u => {
                const roleInfo = getRoleInfo(u.role?.nombre, u.role_id);
                const isSelected = selectedClient?.id === u.id;
                
                return (
                  <div 
                    key={u.id} 
                    onClick={() => setSelectedClient(u)} 
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all mb-3 border flex flex-col gap-3 ${isSelected ? 'bg-blue-50 border-blue-200 shadow-md shadow-blue-900/5 translate-x-1' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-blue-600 rounded-r-full"></div>}
                    <div className="flex items-center gap-4 pl-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ${isSelected ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className={`text-sm font-black truncate mb-1 ${isSelected ? 'text-blue-900' : 'text-[#0b1437]'}`}>{u.nombre}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider flex items-center gap-1 w-max ${roleInfo.style}`}>
                          {roleInfo.icon} {roleInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">No se encontraron usuarios.</div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: PERFIL Y LÍNEA DE TIEMPO (SCROLL INTERNO) */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden lg:col-span-8 xl:col-span-9 relative">
          {selectedClient ? (
            <>
              {/* CABECERA DEL PERFIL */}
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-start gap-6 relative z-10">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-[#0b1437] rounded-[1.5rem] flex items-center justify-center text-white font-black text-3xl md:text-4xl shadow-xl shadow-blue-900/20 shrink-0 border-4 border-white">
                    {selectedClient.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                      <h2 className="font-black text-2xl md:text-3xl text-[#0b1437]">{selectedClient.nombre}</h2>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest flex items-center gap-1.5 w-max ${getRoleInfo(selectedClient.role?.nombre, selectedClient.role_id).style}`}>
                        {getRoleInfo(selectedClient.role?.nombre, selectedClient.role_id).icon}
                        {getRoleInfo(selectedClient.role?.nombre, selectedClient.role_id).label}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3">
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm w-max"><Mail size={16} className="text-blue-500"/> {selectedClient.email}</p>
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm w-max"><Phone size={16} className="text-emerald-500"/> {selectedClient.telefono || 'Teléfono no registrado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* LÍNEA DE TIEMPO (SCROLL INDEPENDIENTE) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Clock size={16} /> Radiografía Operativa</h3>
                
                <div className="relative pl-4 sm:pl-8">
                  {/* Línea Central (Se desvanece al final) */}
                  <div className="absolute top-0 bottom-0 left-[27px] sm:left-[43px] w-[3px] bg-gradient-to-b from-slate-200 via-slate-200 to-transparent rounded-full"></div>

                  {buildTimeline(selectedClient.id).length > 0 ? buildTimeline(selectedClient.id).map((ev, i) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={ev.id} className="relative mb-8 last:mb-0 group">
                      
                      {/* Círculo del Ícono */}
                      <div className={`absolute -left-[24px] sm:-left-[24px] w-10 h-10 rounded-full flex items-center justify-center border-[4px] border-slate-50 shadow-sm transition-transform group-hover:scale-110 z-10 ${ev.color}`}>
                        <ev.icon size={16} />
                      </div>

                      {/* Tarjeta de Contenido */}
                      <div className="pl-12 sm:pl-16">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                            <h4 className="font-black text-[#0b1437] text-base">{ev.title}</h4>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg flex items-center gap-1.5 w-max border border-slate-200/60">
                              <Calendar size={12}/> {new Date(ev.date).toLocaleDateString()} a las {new Date(ev.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">{ev.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="pl-12 sm:pl-16 text-slate-400 font-medium text-sm py-4">Este usuario aún no tiene historial operativo registrado.</div>
                  )}
                  
                  {/* Evento Estático: Creación de Cuenta */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mt-8">
                    <div className="absolute -left-[24px] sm:-left-[24px] w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm bg-slate-200 text-slate-500 z-10"><User size={16} /></div>
                    <div className="pl-12 sm:pl-16">
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 border-dashed opacity-80 hover:opacity-100 transition-opacity">
                          <h4 className="font-black text-slate-600">Creación de Cuenta</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">El perfil fue dado de alta exitosamente en la base de datos central de Innotrev.</p>
                       </div>
                    </div>
                  </motion.div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 bg-slate-50/50">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100"><User size={48} className="text-slate-300" /></div>
              <div className="text-center">
                <p className="text-xl font-black text-[#0b1437] mb-1">Selecciona un Perfil</p>
                <p className="text-sm font-medium text-slate-500">Haz clic en el directorio lateral para visualizar la radiografía.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR USUARIO REDISEÑADO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#050b1a]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 text-blue-50 opacity-50"><User size={120}/></div>
                <div className="relative z-10">
                  <h3 className="font-black text-2xl text-[#0b1437] flex items-center gap-2"><Plus className="text-blue-600" size={24}/> Nuevo Usuario</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Alta de personal interno o cliente en la plataforma.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors relative z-10"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                  <input type="text" required placeholder="Ej. Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#0b1437] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                    <input type="email" required placeholder="correo@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#0b1437] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contraseña Temporal</label>
                    <input type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#0b1437] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nivel de Acceso (Rol)</label>
                  <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-[#0b1437] cursor-pointer">
                    <option value={3}>CLIENTE (Acceso a portal externo)</option>
                    <option value={2}>VENTAS (Gestión de inventario y clientes)</option>
                    <option value={4}>TECNICO DE SOPORTE (Atención de tickets)</option>
                    <option value={1}>ADMINISTRADOR (Control total)</option>
                  </select>
                </div>

                <div className="pt-6 mt-2 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 text-sm font-black text-white bg-[#0b1437] hover:bg-blue-800 rounded-2xl shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5">
                    {isSubmitting ? 'Registrando...' : 'Registrar en Sistema'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistorialUsuarios;