import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Server, Search, Plus, Ticket, ArrowRight, X, MessageSquare, User, Briefcase, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion'; 

const Dashboard = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]); // <-- NUEVO ESTADO PARA VENCIMIENTOS
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const getStatusColor = (status) => {
    switch(status) {
      case 'INSTALADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'EN_TRANSITO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'FALLA_REPORTADA': return 'bg-red-100 text-red-700 border-red-200';
      case 'MANTENIMIENTO': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'CRITICA': return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
      case 'ALTA': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'BAJA': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || ''; 
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      // 1. Obtener Equipos
      let eqData = [];
      const eqResponse = await fetch(`http://127.0.0.1:8000/api/v1/equipo/?t=${Date.now()}`, { headers });
      if (eqResponse.ok) {
        eqData = await eqResponse.json();
        setEquipmentList(Array.isArray(eqData) ? eqData : []);
      }

      // 2. Obtener Licencias por Vencer (NUEVO)
      const licResponse = await fetch(`http://127.0.0.1:8000/api/v1/licenses/dashboard/expiring?days=30&t=${Date.now()}`, { headers });
      if (licResponse.ok) {
        setExpiringLicenses(await licResponse.json());
      }

      // 3. Obtener Tickets
      const tktResponse = await fetch(`http://127.0.0.1:8000/api/v1/tickets/?t=${Date.now()}`, { headers });
      if (tktResponse.ok) {
        const tktData = await tktResponse.json();
        const activeTickets = tktData.filter(t => t.status === 'ABIERTO' || t.status === 'EN_PROGRESO');
        activeTickets.sort((a, b) => {
          const val = { 'CRITICA': 4, 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
          return val[b.prioridad] - val[a.prioridad];
        });
        setTicketsList(activeTickets);

        // Armado de gráfica
        const eqMap = {};
        if (Array.isArray(eqData)) {
          eqData.forEach(eq => { eqMap[eq.id] = eq.modelo || 'Modelo Desconocido'; });
        }
        const modelCounts = {};
        tktData.forEach(ticket => {
          const modelName = eqMap[ticket.equipo_id] || `Equipo #${ticket.equipo_id}`;
          modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
        });
        const newChartData = Object.keys(modelCounts).map(name => ({ name: name, fallas: modelCounts[name] }));
        setChartData(newChartData);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const socket = new WebSocket('ws://127.0.0.1:8000/api/v1/ws/tickets');
    socket.onopen = () => console.log("🟢 Canal de WebSockets conectado");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.evento === "NUEVO_TICKET") {
        setLiveAlert(`¡NUEVA ALERTA! Ticket TKT-${String(data.ticket_id).padStart(4, '0')}`);
        setTimeout(() => setLiveAlert(null), 6000); 
        fetchData(); 
      }
    };
    return () => socket.close();
  }, [fetchData]);

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://127.0.0.1:8000/api/v1/tickets/${ticket.id}/comments`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCloseModal = () => { setSelectedTicket(null); setComments([]); setNewComment(''); };

  const handleAssignTicket = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`http://127.0.0.1:8000/api/v1/tickets/${selectedTicket.id}/assign`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      await fetchData(); 
      handleCloseModal();
    } finally { setIsProcessing(false); }
  };

  const handleResolveTicket = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`http://127.0.0.1:8000/api/v1/tickets/${selectedTicket.id}`, {
        method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "RESUELTO" })
      });
      await fetchData();
      handleCloseModal();
    } finally { setIsProcessing(false); }
  };

  const handleAddComment = async () => {
    if(!newComment.trim()) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://127.0.0.1:8000/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: newComment })
      });
      if(res.ok) {
        const comment = await res.json();
        setComments([...comments, comment]);
        setNewComment('');
      }
    } finally { setIsProcessing(false); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p>Conectando con el Centro de Control...</p>
      </div>
    );
  }

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  return (
    <div className="space-y-6 relative pb-10">
      
      {/* Alerta animada */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className="fixed top-6 left-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></span>
            <span className="font-bold text-sm tracking-wide">{liveAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800">Centro de Control Técnico</h1><p className="text-slate-500 text-sm mt-1">Supervisión de equipos y alertas de soporte en tiempo real.</p></div>
      </motion.div>

      {/* Tarjetas de Métricas Animadas en cascada */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1)" }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-colors">
          <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Equipos Monitoreados</p><p className="text-3xl font-black text-slate-800 mt-1">{equipmentList.length}</p></div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Server size={24} /></div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.1)" }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-colors">
          <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tickets Abiertos</p><p className="text-3xl font-black text-slate-800 mt-1">{ticketsList.length}</p></div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><Ticket size={24} /></div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.1)" }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-colors">
          <div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tasa Resolución</p><p className="text-3xl font-black text-emerald-600 mt-1">94%</p></div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={24} /></div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.2)" }} className="bg-gradient-to-br from-white to-red-50 p-6 rounded-2xl border border-red-200 shadow-sm flex items-center justify-between transition-colors">
          <div><p className="text-red-600 text-xs font-bold uppercase tracking-wider">Alertas Críticas</p><p className="text-3xl font-black text-red-700 mt-1">{ticketsList.filter(t => t.prioridad === 'CRITICA' || t.prioridad === 'ALTA').length}</p></div>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600"><AlertTriangle size={24} /></motion.div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandeja de Tickets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Bandeja de Soporte</h2>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">{ticketsList.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <AnimatePresence>
                {ticketsList.length > 0 ? (
                  ticketsList.map(ticket => (
                    <motion.div key={ticket.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleOpenTicket(ticket)} className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white group">
                      <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">TKT-{String(ticket.id).padStart(4, '0')}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(ticket.prioridad)}`}>{ticket.prioridad}</span></div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{ticket.titulo}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.descripcion}</p>
                      <div className="flex justify-between items-center text-xs"><span className={`font-bold ${ticket.status === 'EN_PROGRESO' ? 'text-blue-600' : 'text-slate-400'}`}>{ticket.status}</span><button className="text-blue-600 font-medium flex items-center gap-1 group-hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">Atender <ArrowRight size={12} /></button></div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 px-4"><CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" /><p className="text-sm font-medium text-slate-600">Todo en orden</p></motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Gráfica y Tablas (Directorio + Vencimientos) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Anomalías Detectadas por Modelo</h2>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="colorFallas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="fallas" fill="url(#colorFallas)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : ( <div className="h-full w-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">Aún no hay tickets suficientes para generar estadísticas.</div> )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Directorio de Equipos */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50"><h2 className="text-sm font-bold text-slate-800">Directorio de Equipos</h2></div>
              <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10"><tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200"><th className="py-3 px-4 font-semibold">S/N</th><th className="py-3 px-4 font-semibold">Estado</th></tr></thead>
                  <tbody className="text-sm">
                    {equipmentList.length > 0 ? (
                      equipmentList.map((eq) => (
                        <tr key={eq.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-800 font-mono text-xs">{eq.numero_serie}</td>
                          <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusColor(eq.status)}`}>{eq.status || 'N/A'}</span></td>
                        </tr>
                      ))
                    ) : ( <tr><td colSpan="2" className="py-6 text-center text-slate-500 text-xs">No hay equipos.</td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NUEVO: Tarjeta de Próximos Vencimientos */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full filter blur-[40px] pointer-events-none"></div>
              <div className="p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white flex justify-between items-center relative z-10">
                <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2"><CalendarClock size={16} className="text-amber-500" /> Próximos Vencimientos (30d)</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded">{expiringLicenses.length}</span>
              </div>
              <div className="p-4 max-h-[250px] overflow-y-auto space-y-3 relative z-10">
                {expiringLicenses.length > 0 ? (
                  expiringLicenses.map(lic => (
                    <div key={lic.id} className="flex justify-between items-center p-3 border border-amber-100 rounded-xl bg-amber-50/30 hover:bg-amber-50 transition-colors">
                      <div>
                        <p className="font-bold text-xs text-slate-800">{lic.nombre_software}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Vence: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</p>
                      </div>
                      <span className="text-amber-700 bg-amber-100 px-2 py-1 rounded text-[10px] font-bold">Eq. #{lic.equipo_id}</span>
                    </div>
                  ))
                ) : (
                   <p className="text-center text-slate-500 text-xs py-8">Todo al día. No hay vencimientos cercanos.</p>
                )}
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Modal ... (Se mantiene intacto el modal del ticket) */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/50">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50/80 backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-3 mb-1"><span className="text-sm font-bold text-slate-500">TKT-{String(selectedTicket.id).padStart(4, '0')}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(selectedTicket.prioridad)}`}>{selectedTicket.prioridad}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedTicket.status === 'ABIERTO' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{selectedTicket.status}</span></div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedTicket.titulo}</h2>
                </div>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-1.5"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle size={14}/> Reporte / Diagnóstico IA</h3><p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.descripcion}</p></div>
                {comments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14}/> Bitácora de Soporte</h3>
                    {comments.map((comment, idx) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className="flex gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm"><User size={14} /></div><div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none text-sm text-slate-700 shadow-sm w-full"><p>{comment.contenido}</p><span className="text-[10px] text-slate-400 mt-2 block font-medium">{new Date(comment.fecha_creacion).toLocaleString()}</span></div></motion.div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-200 bg-white">
                {selectedTicket.status === 'ABIERTO' ? (
                  <div className="flex justify-end gap-3"><button onClick={handleCloseModal} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAssignTicket} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"><Briefcase size={16} /> {isProcessing ? 'Asignando...' : 'Asignarme este Ticket'}</motion.button></div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe una respuesta al cliente..." className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm" onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}/><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddComment} disabled={isProcessing || !newComment.trim()} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-md disabled:opacity-50">Enviar</motion.button></div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100"><span className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-lg">Estás trabajando en este ticket</span><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleResolveTicket} disabled={isProcessing} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"><CheckCircle2 size={16} /> Marcar como Resuelto</motion.button></div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;