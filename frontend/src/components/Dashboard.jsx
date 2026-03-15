import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Server, Search, Plus, Ticket, ArrowRight, X, MessageSquare, User, Briefcase, CalendarClock, Box, Bot, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
      case 'CRITICA': return 'bg-red-100 text-red-700 border-red-200 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]';
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

      let eqData = [];
      const eqResponse = await fetch(`http://127.0.0.1:8000/api/v1/equipo/?t=${Date.now()}`, { headers });
      if (eqResponse.ok) {
        eqData = await eqResponse.json();
        setEquipmentList(Array.isArray(eqData) ? eqData : []);
      }

      const licResponse = await fetch(`http://127.0.0.1:8000/api/v1/licencias/dashboard/expiring?days=30&t=${Date.now()}`, { headers });
      if (licResponse.ok) setExpiringLicenses(await licResponse.json());

      const tktResponse = await fetch(`http://127.0.0.1:8000/api/v1/tickets/?t=${Date.now()}`, { headers });
      if (tktResponse.ok) {
        const tktData = await tktResponse.json();
        const activeTickets = tktData.filter(t => t.status === 'ABIERTO' || t.status === 'EN_PROGRESO');
        activeTickets.sort((a, b) => {
          const val = { 'CRITICA': 4, 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
          return val[b.prioridad] - val[a.prioridad];
        });
        setTicketsList(activeTickets);

        const categoryCounts = {};
        tktData.forEach(ticket => {
          const catName = ticket.categoria || 'General / Otro';
          categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        });
        setChartData(Object.keys(categoryCounts).map(name => ({ name, fallas: categoryCounts[name] })));
      }
    } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = new WebSocket('ws://127.0.0.1:8000/api/v1/ws/tickets');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.evento === "NUEVO_TICKET") {
        setLiveAlert(`¡ALERTA IA! Ticket TKT-${String(data.ticket_id).padStart(4, '0')}`);
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
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCloseModal = () => { setSelectedTicket(null); setComments([]); setNewComment(''); };

  const handleAssignTicket = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`http://127.0.0.1:8000/api/v1/tickets/${selectedTicket.id}/assign`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      await fetchData(); handleCloseModal();
    } finally { setIsProcessing(false); }
  };

  const handleResolveTicket = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`http://127.0.0.1:8000/api/v1/tickets/${selectedTicket.id}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "RESUELTO" }) });
      await fetchData(); handleCloseModal();
    } finally { setIsProcessing(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://127.0.0.1:8000/api/v1/tickets/${selectedTicket.id}/comments`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ contenido: newComment }) });
      if (res.ok) { setComments([...comments, await res.json()]); setNewComment(''); }
    } finally { setIsProcessing(false); }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center h-full text-slate-500"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1437] mb-4"></div><p>Sincronizando Módulos...</p></div>;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 relative pb-10">
      
      {/* Alerta WebSockets */}
      <AnimatePresence>
        {liveAlert && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className="fixed top-6 left-1/2 z-50 bg-[#0b1437] text-white border border-blue-500/50 px-8 py-3 rounded-full shadow-[0_10px_40px_rgba(11,20,55,0.4)] flex items-center gap-4">
            <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span></span>
            <span className="font-black text-sm tracking-widest uppercase">{liveAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-black text-[#0b1437]">Dashboard Analítico</h1><p className="text-slate-500 text-sm mt-1 font-medium">Supervisión integral de Hardware y diagnósticos IA.</p></div>
      </div>

      {/* Tarjetas Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Monitoreados", val: equipmentList.length, icon: Server, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Tickets Abiertos", val: ticketsList.length, icon: Ticket, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Resolución", val: "94%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { title: "Prioridad Alta", val: ticketsList.filter(t => ['CRITICA','ALTA'].includes(t.prioridad)).length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", bounce: true }
        ].map((c, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all cursor-default">
            <div><p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">{c.title}</p><p className={`text-3xl font-black ${i === 3 ? 'text-red-600' : 'text-[#0b1437]'}`}>{c.val}</p></div>
            <div className={`w-14 h-14 ${c.bg} rounded-2xl flex items-center justify-center ${c.color} group-hover:scale-110 transition-transform ${c.bounce ? 'animate-pulse' : ''}`}><c.icon size={28} /></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Bandeja Izquierda */}
        <div className="xl:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[700px] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-[#0b1437] text-white flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2 tracking-wide"><Activity size={18} className="text-blue-400" /> Cola de Atención</h2>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{ticketsList.length}</span>
          </div>
          <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50">
            <AnimatePresence>
              {ticketsList.length > 0 ? ticketsList.map(ticket => (
                <motion.div key={ticket.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} whileHover={{ scale: 1.02 }} onClick={() => handleOpenTicket(ticket)} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-3"><span className="text-xs font-black tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">TKT-{String(ticket.id).padStart(4, '0')}</span><span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wider uppercase border ${getPriorityBadge(ticket.prioridad)}`}>{ticket.prioridad}</span></div>
                  <h3 className="font-bold text-[#0b1437] text-sm mb-1.5 line-clamp-1">{ticket.titulo}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{ticket.descripcion}</p>
                  <div className="flex justify-between items-center"><span className={`text-[10px] font-bold uppercase tracking-wider ${ticket.status === 'EN_PROGRESO' ? 'text-blue-600' : 'text-slate-400'}`}>{ticket.status}</span><button className="text-blue-600 font-bold flex items-center gap-1 group-hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg text-xs">Revisar <ArrowRight size={14} /></button></div>
                </motion.div>
              )) : <div className="text-center py-20"><CheckCircle2 size={48} className="mx-auto text-emerald-400 opacity-50 mb-3" /><p className="text-sm font-medium text-slate-500">Bandeja despejada</p></div>}
            </AnimatePresence>
          </div>
        </div>

        {/* Lado Derecho: Gráfica y 2 Tablas */}
        <div className="xl:col-span-2 flex flex-col gap-8 h-[700px]">
          
          {/* Gráfica Recharts Restaurada */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-1/2 flex flex-col">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Categorización IA de Anomalías</h2>
            <div className="flex-1 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs><linearGradient id="colorFallas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.2} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="fallas" fill="url(#colorFallas)" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">Sin datos suficientes</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-1/2">
            {/* Directorio Restablecido */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-50 bg-slate-50/80"><h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Equipos Activos</h2></div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <table className="w-full text-left">
                  <tbody className="text-sm divide-y divide-slate-50">
                    {equipmentList.map(eq => (
                      <tr key={eq.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-[#0b1437] text-xs">{eq.numero_serie}</td>
                        <td className="py-3 px-4 text-right"><span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getStatusColor(eq.status)}`}>{eq.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vencimientos Restablecidos */}
            <div className="bg-gradient-to-b from-amber-50/50 to-white rounded-3xl shadow-sm border border-amber-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-amber-100/50 flex justify-between items-center">
                <h2 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2"><CalendarClock size={16}/> Vencimientos (30d)</h2>
                <span className="bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">{expiringLicenses.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {expiringLicenses.map(lic => (
                  <div key={lic.id} className="bg-white border border-amber-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-bold text-sm text-[#0b1437]">{lic.nombre_software}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md">VENCE: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</span>
                      <span className="text-xs font-mono text-slate-500">EQ: {lic.equipo_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Ticket con Comentarios Restaurado y Estilizado */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0b1437]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="px-8 py-6 bg-[#0b1437] text-white flex justify-between items-start shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-black text-blue-300 tracking-widest">TKT-{String(selectedTicket.id).padStart(4, '0')}</span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getPriorityBadge(selectedTicket.prioridad)}`}>{selectedTicket.prioridad}</span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${selectedTicket.status === 'ABIERTO' ? 'bg-white/10 text-white border-white/20' : 'bg-blue-500 text-white border-blue-400'}`}>{selectedTicket.status}</span>
                  </div>
                  <h2 className="text-2xl font-black">{selectedTicket.titulo}</h2>
                </div>
                <button onClick={handleCloseModal} className="text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar space-y-6">
                <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Bot size={14} className="text-blue-500" /> Diagnóstico Original de IA</h3>
                  <p className="text-sm text-[#0b1437] whitespace-pre-wrap leading-relaxed font-medium">{selectedTicket.descripcion}</p>
                </div>
                {comments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2"><MessageSquare size={14} /> Bitácora de Atención</h3>
                    {comments.map((comment, idx) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm"><User size={18} /></div>
                        <div className="bg-white border border-slate-200 p-5 rounded-3xl rounded-tl-sm text-sm text-[#0b1437] shadow-sm w-full">
                          <p className="font-medium leading-relaxed">{comment.contenido}</p>
                          <span className="text-[10px] text-slate-400 mt-3 block font-bold tracking-wider">{new Date(comment.fecha_creacion).toLocaleString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                {selectedTicket.status === 'ABIERTO' ? (
                  <div className="flex justify-end gap-3">
                    <button onClick={handleCloseModal} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors">Cerrar Visor</button>
                    <button onClick={handleAssignTicket} disabled={isProcessing} className="bg-[#0b1437] hover:bg-blue-800 text-white px-8 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30 disabled:opacity-50">
                      <Briefcase size={18} /> {isProcessing ? 'Asignando...' : 'Tomar Caso'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Actualizar estado al cliente..." className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                      <button onClick={handleAddComment} disabled={isProcessing || !newComment.trim()} className="bg-[#0b1437] hover:bg-blue-800 text-white px-8 py-4 rounded-2xl text-sm font-black transition-colors shadow-lg disabled:opacity-50"><Send size={18}/></button>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <span className="text-xs text-blue-600 font-black tracking-widest uppercase bg-blue-50 px-4 py-2 rounded-xl">Técnico Asignado</span>
                      <button onClick={handleResolveTicket} disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                        <CheckCircle2 size={18} /> Concluir Soporte
                      </button>
                    </div>
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