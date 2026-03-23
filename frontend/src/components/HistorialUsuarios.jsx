import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, Truck, CheckCircle2, Ticket, Mail, Phone, MapPin, Clock, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HistorialUsuarios = () => {
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        // CORRECCIÓN: Rutas ajustadas a localhost y a /usuarios en lugar de /clientes
        const [resCl, resEq, resTk] = await Promise.all([
          fetch('http://localhost:8000/api/v1/usuarios/?t=' + Date.now(), { headers }),
          fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers }),
          fetch('http://localhost:8000/api/v1/tickets/?t=' + Date.now(), { headers })
        ]);
        
        // Filtramos para asegurarnos de que la tabla solo muestre a los que tienen rol de CLIENTE
        if (resCl.ok) {
            const allUsers = await resCl.json();
            // CORRECCIÓN: El ID de Cliente en la BD suele ser 3 según el script create_user.py
            // (ADMIN=1, VENTAS=2, CLIENTE=3)
            const onlyClients = allUsers.filter(u => u.role_id === 3 || !u.role_id || u.role?.nombre === 'CLIENTE'); 
            setClients(onlyClients);
        }
        if (resEq.ok) setEquipments(await resEq.json());
        if (resTk.ok) setTickets(await resTk.json());
      } catch (error) {
        console.error("Error cargando historial", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para armar la línea de tiempo del cliente
  const buildTimeline = (clientId) => {
    let events = [];
    const clientEqs = equipments.filter(eq => eq.cliente_id === clientId);
    const clientEqIds = clientEqs.map(eq => eq.id);
    const clientTkts = tickets.filter(t => clientEqIds.includes(t.equipo_id));

    // 1. Eventos de Equipos (Despachos y Recepciones)
    clientEqs.forEach(eq => {
      events.push({
        id: `desp-${eq.id}`,
        date: eq.created_at || '2026-01-01T00:00:00',
        type: 'DESPACHO',
        title: 'Equipo Despachado',
        desc: `Se asignó y envió el equipo: ${eq.modelo} (S/N: ${eq.numero_serie}).`,
        icon: Truck,
        color: 'bg-blue-100 text-blue-600 border-blue-200'
      });

      if (eq.status === 'INSTALADO' || eq.fecha_recepcion) {
        events.push({
          id: `rec-${eq.id}`,
          date: eq.fecha_recepcion || '2026-01-05T00:00:00',
          type: 'RECEPCION',
          title: 'Recepción Confirmada',
          desc: `El cliente confirmó la llegada física del equipo ${eq.modelo} y activó su garantía.`,
          icon: CheckCircle2,
          color: 'bg-emerald-100 text-emerald-600 border-emerald-200'
        });
      }
    });

    // 2. Eventos de Tickets (Fallas reportadas a la IA)
    clientTkts.forEach(t => {
      events.push({
        id: `tkt-${t.id}`,
        date: t.created_at || '2026-01-10T00:00:00',
        type: 'TICKET',
        title: `Anomalía Reportada (TKT-${String(t.id).padStart(4, '0')})`,
        desc: `El cliente interactuó con la IA reportando: "${t.titulo}". Prioridad asignada: ${t.prioridad}.`,
        icon: Ticket,
        color: 'bg-red-100 text-red-600 border-red-200'
      });
    });

    // Ordenar de más reciente a más antiguo
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-black text-[#0b1437]">Historial y Seguimiento</h1>
        <p className="text-slate-500 mt-1 font-medium">Radiografía completa del ciclo de vida y soporte de cada cliente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[650px]">
        
        {/* PANEL IZQUIERDO: DIRECTORIO DE CLIENTES */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden col-span-1">
          <div className="p-6 border-b border-slate-50 bg-[#0b1437] text-white">
            <h2 className="font-bold text-sm tracking-wide mb-4">Directorio de Clientes</h2>
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
            ) : filteredClients.length > 0 ? (
              filteredClients.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedClient(c)} 
                  className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center gap-4 ${selectedClient?.id === c.id ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30 scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${selectedClient?.id === c.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-sm font-black truncate ${selectedClient?.id === c.id ? 'text-white' : 'text-[#0b1437]'}`}>{c.nombre}</p>
                    <p className={`text-xs truncate font-medium ${selectedClient?.id === c.id ? 'text-blue-100' : 'text-slate-500'}`}>{c.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">No se encontraron clientes.</div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: PERFIL Y LÍNEA DE TIEMPO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden col-span-2 relative">
          {selectedClient ? (
            <>
              {/* Cabecera del Perfil */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm shrink-0">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-[#0b1437] rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-900/20 shrink-0">
                    {selectedClient.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-black text-3xl text-[#0b1437] mb-2">{selectedClient.nombre}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2"><Mail size={16} className="text-slate-400"/> {selectedClient.email}</p>
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2"><Phone size={16} className="text-slate-400"/> {selectedClient.telefono || 'N/A'}</p>
                      <p className="text-sm text-slate-600 font-medium flex items-center gap-2 w-full mt-1"><MapPin size={16} className="text-slate-400"/> {selectedClient.direccion || 'Dirección no registrada'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Línea de Tiempo (Timeline) */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Clock size={16} /> Seguimiento Operativo</h3>
                
                <div className="relative pl-4 sm:pl-8">
                  {/* Línea vertical */}
                  <div className="absolute top-0 bottom-0 left-[27px] sm:left-[43px] w-0.5 bg-slate-200 rounded-full"></div>

                  {/* Renderizado de Eventos */}
                  {buildTimeline(selectedClient.id).length > 0 ? buildTimeline(selectedClient.id).map((ev, i) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={ev.id} className="relative mb-8 last:mb-0">
                      <div className={`absolute -left-[24px] sm:-left-[24px] w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm ${ev.color} z-10`}>
                        <ev.icon size={16} />
                      </div>
                      <div className="pl-12 sm:pl-16">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-black text-[#0b1437]">{ev.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{new Date(ev.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">{ev.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="pl-12 sm:pl-16 text-slate-400 font-medium text-sm py-4">Aún no hay actividad registrada para este cliente. El historial comenzará cuando se le despache su primer equipo.</div>
                  )}
                  
                  {/* Evento Base de Registro (Simulado) */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mt-8">
                    <div className="absolute -left-[24px] sm:-left-[24px] w-10 h-10 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-sm bg-slate-100 text-slate-500 z-10"><User size={16} /></div>
                    <div className="pl-12 sm:pl-16">
                       <div className="bg-white p-5 rounded-2xl border border-slate-200 border-dashed opacity-70">
                          <h4 className="font-black text-slate-600">Creación de Cuenta</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">El perfil del cliente fue dado de alta en la base de datos de Innotrev.</p>
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
                <p className="text-xl font-black text-slate-600 mb-1">Selecciona un Cliente</p>
                <p className="text-sm font-medium">Haz clic en el directorio lateral para ver su radiografía completa.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialUsuarios;