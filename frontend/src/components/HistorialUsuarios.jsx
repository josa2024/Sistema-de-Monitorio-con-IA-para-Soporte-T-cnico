import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, Truck, CheckCircle2, Ticket, Mail, Phone, MapPin, Clock, Plus, X, ShieldCheck, Briefcase } from 'lucide-react';
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
        type: 'DESPACHO', title: 'Equipo Registrado',
        desc: `Se registró el equipo: ${eq.modelo} (S/N: ${eq.numero_serie}).`,
        icon: Truck, color: 'bg-blue-100 text-blue-600 border-blue-200'
      });

      if (eq.status === 'INSTALADO' || eq.fecha_recepcion) {
        events.push({
          id: `rec-${eq.id}`,
          date: eq.fecha_recepcion || eq.created_at,
          type: 'RECEPCION', title: 'Equipo Instalado / Recepcionado',
          desc: `El equipo ${eq.modelo} está marcado como activo/instalado.`,
          icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600 border-emerald-200'
        });
      }
    });

    clientTkts.forEach(t => {
      events.push({
        id: `tkt-${t.id}`,
        date: t.created_at || '2026-01-10T00:00:00',
        type: 'TICKET', title: `Ticket Registrado (TKT-${String(t.id).padStart(4, '0')})`,
        desc: `Reporte: "${t.titulo}". Prioridad: ${t.prioridad}. Estado: ${t.status}.`,
        icon: Ticket, color: 'bg-red-100 text-red-600 border-red-200'
      });
    });

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getRoleBadge = (roleName, roleId) => {
    const name = roleName || (roleId === 1 ? 'ADMIN' : roleId === 2 ? 'VENTAS' : roleId === 4 ? 'TECNICO' : 'CLIENTE');
    if (name === 'ADMIN') return <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md flex items-center gap-1"><ShieldCheck size={10}/> ADMIN</span>;
    if (name === 'VENTAS') return <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md flex items-center gap-1"><Briefcase size={10}/> VENTAS</span>;
    if (name === 'TECNICO') return <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1"><User size={10}/> SOPORTE</span>;
    return <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">CLIENTE</span>;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 h-full flex flex-col relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[#0b1437]">Directorio y Cuentas</h1>
          <p className="text-slate-500 mt-1 font-medium">Gestiona el personal de Innotrev y la radiografía de los clientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[650px]">
        
        {/* PANEL IZQUIERDO: DIRECTORIO DE USUARIOS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden col-span-1">
          <div className="p-6 border-b border-slate-50 bg-[#0b1437] text-white">
            <h2 className="font-bold text-sm tracking-wide mb-4">Directorio del Sistema</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o correo..." 
                className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-sm focus:bg-white focus:text-[#0b1437] outline-none transition-all font-medium placeholder:text-blue-200" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 space-y-3">
            {isLoading ? (
               <div className="text-center py-10 text-slate-400">Cargando directorio...</div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => setSelectedClient(u)} 
                  className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center gap-4 ${selectedClient?.id === u.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${selectedClient?.id === u.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-black truncate ${selectedClient?.id === u.id ? 'text-blue-900' : 'text-[#0b1437]'}`}>{u.nombre}</p>
                      {getRoleBadge(u.role?.nombre, u.role_id)}
                    </div>
                    <p className="text-xs truncate font-medium text-slate-500 mt-0.5">{u.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">No se encontraron usuarios.</div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: PERFIL Y LÍNEA DE TIEMPO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden col-span-2 relative">
          {selectedClient ? (
            <>
              <div className="p-8 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm shrink-0">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-[#0b1437] rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-900/20 shrink-0">
                    {selectedClient.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-black text-3xl text-[#0b1437]">{selectedClient.nombre}</h2>
                      {getRoleBadge(selectedClient.role?.nombre, selectedClient.role_id)}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2"><Mail size={16} className="text-slate-400"/> {selectedClient.email}</p>
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2"><Phone size={16} className="text-slate-400"/> {selectedClient.telefono || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Línea de Tiempo (Solo relevante si es cliente o si el staff tiene tickets) */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Clock size={16} /> Seguimiento Operativo</h3>
                
                <div className="relative pl-4 sm:pl-8">
                  <div className="absolute top-0 bottom-0 left-[27px] sm:left-[43px] w-0.5 bg-slate-200 rounded-full"></div>

                  {buildTimeline(selectedClient.id).length > 0 ? buildTimeline(selectedClient.id).map((ev, i) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={ev.id} className="relative mb-8 last:mb-0">
                      <div className={`absolute -left-[24px] sm:-left-[24px] w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm ${ev.color} z-10`}>
                        <ev.icon size={16} />
                      </div>
                      <div className="pl-12 sm:pl-16">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-black text-[#0b1437]">{ev.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{new Date(ev.date).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">{ev.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="pl-12 sm:pl-16 text-slate-400 font-medium text-sm py-4">No hay actividad operativa registrada.</div>
                  )}
                  
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mt-8">
                    <div className="absolute -left-[24px] sm:-left-[24px] w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm bg-slate-100 text-slate-500 z-10"><User size={16} /></div>
                    <div className="pl-12 sm:pl-16">
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 border-dashed opacity-70">
                          <h4 className="font-black text-slate-600">Creación de Cuenta</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">El perfil fue dado de alta en la base de datos de Innotrev.</p>
                       </div>
                    </div>
                  </motion.div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 bg-slate-50/50">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center"><User size={48} className="text-slate-300" /></div>
              <div className="text-center">
                <p className="text-xl font-black text-slate-600 mb-1">Selecciona un Perfil</p>
                <p className="text-sm font-medium">Haz clic en el directorio lateral para ver detalles.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR USUARIO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1437]/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-xl text-[#0b1437]">Crear Nuevo Usuario</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                  <input type="text" required placeholder="Ej. Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                  <input type="email" required placeholder="correo@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña Temporal</label>
                  <input type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol del Sistema</label>
                  <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700">
                    <option value={3}>CLIENTE (Acceso a portal externo)</option>
                    <option value={2}>VENTAS (Gestión de inventario y clientes)</option>
                    <option value={4}>TECNICO DE SOPORTE (Atención de tickets)</option>
                    <option value={1}>ADMINISTRADOR (Control total)</option>
                  </select>
                </div>

                <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? 'Guardando...' : 'Registrar Usuario'}
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