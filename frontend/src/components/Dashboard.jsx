import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Activity, CheckCircle2, Server, Ticket, ArrowRight, X, MessageSquare, User, Briefcase, CalendarClock, Bot, Video, LayoutDashboard, Cpu, ShieldAlert, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../services/api';

const Dashboard = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);
  
  // Estados para el Modal del Ticket
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [newComment, setNewComment] = useState('');

  const handleAuthError = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = '/'; 
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'INSTALADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'EN_TRANSITO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'FALLA_REPORTADA': return 'bg-red-100 text-red-700 border-red-200';
      case 'MANTENIMIENTO': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICA': return 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] border-red-600 animate-pulse';
      case 'ALTA': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'BAJA': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const headers = getAuthHeaders();

    try {
      const eqResponse = await fetch(`http://localhost:8000/api/v1/equipo/?t=${Date.now()}`, { headers });
      if (eqResponse.ok) { 
        const eqData = await eqResponse.json(); 
        setEquipmentList(Array.isArray(eqData) ? eqData : []); 
      } else if (eqResponse.status === 401) {
        handleAuthError();
      }
    } catch (error) { console.warn("Aviso: No se pudieron cargar los equipos."); }

    try {
      const licResponse = await fetch(`http://localhost:8000/api/v1/licencias/dashboard/expiring?days=30&t=${Date.now()}`, { headers });
      if (licResponse.ok) setExpiringLicenses(await licResponse.json());
      else if (licResponse.status === 401) handleAuthError();
    } catch (error) { console.warn("Aviso: El endpoint de licencias devolvió error (CORS/404)."); }

    try {
      const tktResponse = await fetch(`http://localhost:8000/api/v1/tickets/?t=${Date.now()}`, { headers });
      if (tktResponse.ok) {
        const tktData = await tktResponse.json();
        const activeTickets = tktData.filter(t => t.status === 'ABIERTO' || t.status === 'EN_PROGRESO');
        activeTickets.sort((a, b) => { const val = { 'CRITICA': 4, 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 }; return val[b.prioridad] - val[a.prioridad]; });
        setTicketsList(activeTickets);

        const categoryCounts = {};
        tktData.forEach(ticket => { const catName = ticket.categoria || 'General / Otro'; categoryCounts[catName] = (categoryCounts[catName] || 0) + 1; });
        setChartData(Object.keys(categoryCounts).map(name => ({ name, fallas: categoryCounts[name] })));
      }
      else if (tktResponse.status === 401) handleAuthError();
    } catch (error) { console.warn("Aviso: No se pudieron cargar los tickets."); }
    
    setIsLoading(false);
  }, [handleAuthError]);

  useEffect(() => {
    fetchData();
    const token = localStorage.getItem('token');
    if (!token) return;

    let socket;
    let reconnectAttempts = 0;
    let shouldReconnect = true;

    const initWebSocket = () => {
      if (!shouldReconnect) return;
      socket = new WebSocket(`ws://localhost:8000/api/v1/ws/tickets?token=${token}`);
      socket.onopen = () => { console.log("WebSocket tickets conectado"); reconnectAttempts = 0; socket.send("ping"); };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.evento === "NUEVO_TICKET") {
          setLiveAlert(`¡ALERTA IA! Ticket TKT-${String(data.ticket_id).padStart(4, '0')}`);
          setTimeout(() => setLiveAlert(null), 6000);
          fetchData();
        }
        if (data.evento === "EQUIPO_REGISTRADO") {
          setLiveAlert(`Producto registrado (S/N: ${data.numero_serie})`);
          setTimeout(() => setLiveAlert(null), 6000);
          fetchData();
        }
        if (data.evento === "EQUIPO_RECEPCIONADO") {
          setLiveAlert(`Equipo revisado / status: ${data.status}`);
          setTimeout(() => setLiveAlert(null), 6000);
          fetchData();
        }
        if (data.evento === "GARANTIA_ACTIVADA") {
          setLiveAlert(`Garantía activada para equipo ID ${data.equipo_id}`);
          setTimeout(() => setLiveAlert(null), 6000);
          fetchData();
        }
      };
      socket.onclose = (event) => {
        if (!shouldReconnect || event.code === 1008) {
          if (event.code === 1008) handleAuthError();
          return;
        }
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
        reconnectAttempts = Math.min(reconnectAttempts + 1, 10);
        setTimeout(initWebSocket, delay);
      };
    };

    initWebSocket();
    return () => { shouldReconnect = false; if (socket && socket.readyState === WebSocket.OPEN) { socket.close(); } };
  }, [fetchData, handleAuthError]);

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setScheduledDate('');
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:8000/api/v1/tickets/${ticket.id}/comments`, { headers });
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCloseModal = () => { setSelectedTicket(null); setComments([]); setScheduledDate(''); setNewComment(''); };

  const handleAssignTicket = async () => {
    setIsProcessing(true);
    try {
      const headers = getAuthHeaders();
      await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/assign`, { 
        method: 'PATCH', 
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tecnico_id: 1 })
      });
      await fetchData(); 
      setSelectedTicket({ ...selectedTicket, status: 'EN_PROGRESO' });
    } finally { setIsProcessing(false); }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket?.id) return;
    setIsProcessing(true);
    const headers = getAuthHeaders();
    try {
      const response = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'RESUELTO' })
      });
      if (!response.ok) throw new Error(`Error actualizando estado`);
      await fetchData();
      handleCloseModal();
    } catch (error) {
      alert('No se pudo resolver el ticket.');
    } finally { setIsProcessing(false); }
  };

  // 🔥 NUEVA FUNCIÓN: ESCALAR A GARANTÍA
  const handleEscalateToWarranty = async () => {
    if (!selectedTicket?.id) return;
    
    if(!window.confirm("⚠️ ¿Estás seguro que deseas escalar este caso a Garantías?\n\nEl ticket de soporte actual se cerrará y el equipo cambiará a estado FALLA REPORTADA para que el departamento de logística/ventas gestione la garantía física.")) return;

    setIsProcessing(true);
    const headers = getAuthHeaders();
    try {
      const response = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/escalate`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al escalar a garantías');
      }
      
      alert('✅ Ticket cerrado y escalado a Garantías exitosamente.');
      await fetchData();
      handleCloseModal();
    } catch (error) {
      alert(`❌ ${error.message}`);
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleScheduleCall = async () => {
    if (!selectedTicket?.id || !scheduledDate) return;
    setIsProcessing(true);
    const token = localStorage.getItem('token') || '';
    const fechaIso = new Date(scheduledDate).toISOString();
    const apiBase = 'http://localhost:8000/api/v1';

    try {
      const updateResponse = await fetch(`${apiBase}/tickets/${selectedTicket.id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_agendada: fechaIso })
      });
      if (!updateResponse.ok) throw new Error(`Error actualizando ticket`);

      const commentPayload = { contenido: `Videollamada de soporte agendada para el ${new Date(fechaIso).toLocaleString()}` };
      const commentResponse = await fetch(`${apiBase}/tickets/${selectedTicket.id}/comments`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commentPayload)
      });
      if (!commentResponse.ok) throw new Error(`Error creando comentario`);

      await fetchData();
      setSelectedTicket({ ...selectedTicket, fecha_agendada: fechaIso });
      const res = await fetch(`${apiBase}/tickets/${selectedTicket.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setComments(await res.json());
    } catch (error) {
      alert('Error al agendar la videollamada.');
    } finally { setIsProcessing(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    setIsProcessing(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ contenido: newComment })
      });
      if (response.ok) {
        setNewComment('');
        const res = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/comments`, { headers });
        if (res.ok) setComments(await res.json());
      }
    } catch (error) { alert('Error al agregar el comentario.'); } finally { setIsProcessing(false); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen text-blue-600 bg-slate-50">
      <Cpu size={48} className="animate-pulse mb-4" />
      <p className="font-black tracking-widest uppercase text-sm">Iniciando Centro de Comando...</p>
    </div>
  );

  return (
    <div className="absolute inset-0 p-6 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
      
      {/* TOAST NOTIFICATIONS (WebSockets) */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className="fixed top-6 left-1/2 z-[9999] bg-[#0b1437] text-white border border-blue-500/50 px-8 py-3.5 rounded-full shadow-[0_10px_40px_rgba(11,20,55,0.4)] flex items-center gap-4">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
            <span className="font-black text-xs tracking-widest uppercase">{liveAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-[#0b1437] flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} /> Dashboard Analítico
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Centro de comando: Supervisión integral de Hardware y diagnósticos IA en tiempo real.</p>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {[
          { title: "Equipos Monitoreados", val: equipmentList.length, icon: Server, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Tickets en Cola", val: ticketsList.length, icon: Ticket, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Tasa de Resolución", val: "94%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { title: "Alertas Críticas", val: ticketsList.filter(t => ['CRITICA','ALTA'].includes(t.prioridad)).length, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", bounce: true }
        ].map((c, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all hover:-translate-y-1">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{c.title}</p>
              <p className={`text-3xl font-black ${i === 3 && c.val > 0 ? 'text-red-600' : 'text-[#0b1437]'}`}>{c.val}</p>
            </div>
            <div className={`w-14 h-14 ${c.bg} rounded-2xl flex items-center justify-center ${c.color} group-hover:scale-110 transition-transform ${c.bounce && c.val > 0 ? 'animate-pulse' : ''}`}><c.icon size={28} /></div>
          </div>
        ))}
      </div>

      {/* ÁREA PRINCIPAL CON SCROLLS INDEPENDIENTES */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* PANEL IZQUIERDO: COLA DE ATENCIÓN */}
        <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-[#0b1437] text-white flex justify-between items-center shrink-0">
            <h2 className="font-bold flex items-center gap-2 tracking-widest uppercase text-sm"><Activity size={18} className="text-blue-400" /> Cola de Atención</h2>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{ticketsList.length}</span>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50/50">
            <AnimatePresence>
              {ticketsList.length > 0 ? ticketsList.map(ticket => (
                <motion.div key={ticket.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={() => handleOpenTicket(ticket)} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">TKT-{String(ticket.id).padStart(4, '0')}</span>
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider uppercase border ${getPriorityBadge(ticket.prioridad)}`}>{ticket.prioridad}</span>
                  </div>
                  
                  <h3 className="font-black text-[#0b1437] text-sm mb-1 line-clamp-1">{ticket.titulo}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><User size={12}/> {ticket.cliente?.nombre || ticket.cliente?.email || 'Desconocido'}</p>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <p className="text-xs text-slate-600 line-clamp-2 font-medium leading-relaxed">{ticket.descripcion}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${ticket.status === 'EN_PROGRESO' ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded' : 'text-slate-400'}`}>{ticket.status.replace('_', ' ')}</span>
                    <button className="text-blue-600 font-black flex items-center gap-1 group-hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg text-xs transition-colors group-hover:bg-blue-100">Abrir Caso <ArrowRight size={14} /></button>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-20 h-full flex flex-col items-center justify-center">
                  <CheckCircle2 size={48} className="mx-auto text-emerald-400 opacity-50 mb-3" />
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Bandeja Despejada</p>
                  <p className="text-xs text-slate-400 mt-1">Todos los tickets han sido atendidos.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PANELES DERECHOS */}
        <div className="xl:col-span-8 flex flex-col gap-6 h-full min-h-0">
          
          {/* GRÁFICA SUPERIOR */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex-1 min-h-[300px] flex flex-col shrink-0 lg:shrink">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Bot size={16} className="text-purple-500"/> Categorización IA de Anomalías Detectadas</h2>
            <div className="flex-1 w-full min-h-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFallas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }} />
                    <Bar dataKey="fallas" fill="url(#colorFallas)" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                  <Activity size={32} className="opacity-20 mb-2"/>
                  <span className="text-xs font-black uppercase tracking-widest">Sin datos suficientes</span>
                </div>
              )}
            </div>
          </div>

          {/* CUADRICULA INFERIOR (Equipos y Vencimientos) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[300px]">
            
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-50 bg-slate-50/80 shrink-0">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Server size={14}/> Equipos Activos / Estado</h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <table className="w-full text-left">
                  <tbody className="text-sm divide-y divide-slate-50">
                    {equipmentList.map(eq => (
                      <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-black text-[#0b1437] text-xs">{eq.numero_serie}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getStatusColor(eq.status)}`}>{eq.status.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gradient-to-b from-amber-50/30 to-white rounded-[2rem] shadow-sm border border-amber-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-amber-100/50 flex justify-between items-center shrink-0">
                <h2 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2"><CalendarClock size={14}/> Vencimientos (Próx. 30d)</h2>
                <span className="bg-amber-200 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-md">{expiringLicenses.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {expiringLicenses.length > 0 ? expiringLicenses.map(lic => (
                  <div key={lic.id} className="bg-white border border-amber-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-black text-sm text-[#0b1437] mb-2 truncate">{lic.nombre_software}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md uppercase tracking-widest">VENCE: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</span>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">EQ: {lic.equipo_id}</span>
                    </div>
                  </div>
                )) : (
                   <div className="h-full flex flex-col items-center justify-center text-amber-600/50">
                     <ShieldAlert size={32} className="mb-2 opacity-50"/>
                     <span className="text-xs font-black uppercase tracking-widest">Todo en orden</span>
                   </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL DEL TICKET (Mesa de Atención) */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {selectedTicket && (
          <motion.div key="modal-ticket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#050b1a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:p-6" onClick={handleCloseModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] md:h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              
              {/* HEADER MODAL */}
              <div className="px-8 py-6 bg-[#0b1437] text-white flex justify-between items-start shrink-0 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10"><Ticket size={150}/></div>
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="text-xs font-black text-blue-300 tracking-widest bg-blue-900/50 px-3 py-1 rounded-lg">TKT-{String(selectedTicket.id).padStart(4, '0')}</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getPriorityBadge(selectedTicket.prioridad)}`}>{selectedTicket.prioridad}</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${selectedTicket.status === 'ABIERTO' ? 'bg-white/10 text-white border-white/20' : 'bg-blue-500 text-white border-blue-400'}`}>{selectedTicket.status.replace('_', ' ')}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black mb-1">{selectedTicket.titulo}</h2>
                  <p className="text-xs font-bold text-blue-200 flex items-center gap-1.5"><User size={14}/> Cliente: {selectedTicket.cliente?.nombre || selectedTicket.cliente?.email || 'Desconocido'}</p>
                </div>
                <button onClick={handleCloseModal} className="text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors relative z-10"><X size={24} /></button>
              </div>
              
              {/* ÁREA DE CONTENIDO (SCROLL) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar space-y-8">
                
                {/* Diagnóstico IA */}
                <div className="flex gap-4 max-w-[90%]">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="bg-white border border-purple-100 p-5 rounded-3xl rounded-tl-none shadow-sm">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 border-b border-purple-50 pb-2">Diagnóstico Original (IA)</p>
                      <p className="text-sm text-[#0b1437] whitespace-pre-wrap leading-relaxed font-medium">{selectedTicket.descripcion}</p>
                    </div>
                  </div>
                </div>

                {/* Bitácora / Comentarios */}
                {comments.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><MessageSquare size={12} className="inline mr-1" /> Bitácora de Atención</h3>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    {comments.map((comment, idx) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className="flex gap-4 max-w-[90%] self-start">
                        <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-sm"><Briefcase size={18} /></div>
                        <div>
                          <div className="bg-white border border-slate-200 p-5 rounded-3xl rounded-tl-none shadow-sm">
                            <p className="font-medium text-sm text-[#0b1437] leading-relaxed whitespace-pre-wrap">{comment.contenido}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1.5 ml-2 block font-bold tracking-widest">{new Date(comment.fecha_creacion).toLocaleString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* CONTROLES INFERIORES */}
              <div className="border-t border-slate-100 bg-white shrink-0">
                
                {/* Zona de input de comentario */}
                <div className="p-6 md:px-8 pb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-2 flex items-end gap-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribe una actualización para la bitácora..."
                      className="flex-1 bg-transparent p-4 text-sm font-medium text-[#0b1437] outline-none resize-none min-h-[60px] max-h-[120px] custom-scrollbar placeholder:text-slate-400"
                      rows="1"
                    ></textarea>
                    <button
                      onClick={handleAddComment}
                      disabled={isProcessing || !newComment.trim()}
                      className="bg-[#0b1437] hover:bg-blue-800 disabled:bg-slate-300 text-white p-4 rounded-2xl shadow-md transition-all shrink-0 m-1"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>

                {/* Botonera de Acción de Estado */}
                <div className="px-6 md:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 rounded-b-[2rem]">
                  {selectedTicket.status === 'ABIERTO' ? (
                    <>
                      <p className="text-xs font-bold text-slate-500">Este ticket requiere ser asignado para iniciar la atención.</p>
                      <button onClick={handleAssignTicket} disabled={isProcessing} className="w-full md:w-auto bg-[#0b1437] hover:bg-blue-800 text-white px-10 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-0.5 disabled:opacity-50">
                        <Briefcase size={18} /> Tomar Caso Ahora
                      </button>
                    </>
                  ) : selectedTicket.status === 'EN_PROGRESO' && !selectedTicket.fecha_agendada ? (
                    <div className="w-full flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2">Agendar Videollamada Técnica</label>
                        <input 
                          type="datetime-local" 
                          value={scheduledDate} 
                          onChange={e => setScheduledDate(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-[#0b1437] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" 
                        />
                      </div>
                      <button onClick={handleScheduleCall} disabled={isProcessing || !scheduledDate} className="w-full md:w-auto h-full mt-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2">
                        <Video size={18}/> Agendar
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
                      {selectedTicket.fecha_agendada && selectedTicket.status !== 'RESUELTO' && (
                        <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-2xl flex items-center gap-3 w-full md:w-auto">
                          <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm shrink-0"><Video size={18} /></div>
                          <div>
                            <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">Videollamada Agendada</p>
                            <p className="text-xs font-black text-[#0b1437] mt-0.5">{new Date(selectedTicket.fecha_agendada).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedTicket.status !== 'RESUELTO' && (
                        <div className="flex flex-col md:flex-row items-center gap-3 ml-auto w-full md:w-auto">
                          
                          {/* 🔥 NUEVO BOTÓN: ESCALAR A GARANTÍA */}
                          <button onClick={handleEscalateToWarranty} disabled={isProcessing} className="w-full md:w-auto bg-orange-100 hover:bg-orange-500 text-orange-700 hover:text-white border border-orange-200 hover:border-transparent px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                            <AlertTriangle size={18} /> Escalar a Garantía
                          </button>

                          <button onClick={handleResolveTicket} disabled={isProcessing} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 disabled:opacity-50">
                            <CheckCircle2 size={18} /> Concluir Soporte
                          </button>

                        </div>
                      )}
                      {selectedTicket.status === 'RESUELTO' && (
                        <div className="w-full text-center md:text-left flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                           <CheckCircle2 size={18}/> <span className="text-sm font-black">Caso cerrado exitosamente</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default Dashboard;