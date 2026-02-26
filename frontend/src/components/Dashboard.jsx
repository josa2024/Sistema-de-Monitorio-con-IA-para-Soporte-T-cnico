import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Server, Search, Plus, Ticket, ArrowRight, X, MessageSquare, User, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Alerta mágica de WebSockets
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

  // Convertimos fetchData en un useCallback para que sea seguro llamarlo desde WebSockets
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

      const tktResponse = await fetch(`http://127.0.0.1:8000/api/v1/tickets/?t=${Date.now()}`, { headers });
      if (tktResponse.ok) {
        const tktData = await tktResponse.json();
        const activeTickets = tktData.filter(t => t.status === 'ABIERTO' || t.status === 'EN_PROGRESO');
        activeTickets.sort((a, b) => {
          const val = { 'CRITICA': 4, 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
          return val[b.prioridad] - val[a.prioridad];
        });
        setTicketsList(activeTickets);

        const eqMap = {};
        if (Array.isArray(eqData)) {
          eqData.forEach(eq => { eqMap[eq.id] = eq.modelo || 'Modelo Desconocido'; });
        }

        const modelCounts = {};
        tktData.forEach(ticket => {
          const modelName = eqMap[ticket.equipo_id] || `Equipo #${ticket.equipo_id}`;
          modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
        });

        const newChartData = Object.keys(modelCounts).map(name => ({
          name: name,
          fallas: modelCounts[name]
        }));
        
        setChartData(newChartData);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- EFECTO INICIAL Y WEBSOCKETS ---
  useEffect(() => { 
    fetchData(); 

    // Nos conectamos al servidor en tiempo real
    const socket = new WebSocket('ws://127.0.0.1:8000/api/v1/ws/tickets');

    socket.onopen = () => console.log("🟢 Canal de WebSockets de Innotrev: CONECTADO");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("⚡ Mensaje de Servidor:", data);
      
      if (data.evento === "NUEVO_TICKET") {
        setLiveAlert(`¡NUEVA ALERTA! Se ha creado el Ticket TKT-${String(data.ticket_id).padStart(4, '0')} en tiempo real.`);
        setTimeout(() => setLiveAlert(null), 6000); // Se oculta en 6 segundos
        fetchData(); // Recarga la bandeja automáticamente
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
        <p>Conectando con el Centro de Control de Innotrev...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">

      {/* --- BANNER DE ALERTA EN VIVO --- */}
      {liveAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="font-bold text-sm tracking-wide">{liveAlert}</span>
        </div>
      )}
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centro de Control Técnico</h1>
          <p className="text-slate-500 text-sm mt-1">Supervisión de equipos y alertas de soporte en tiempo real.</p>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div><p className="text-slate-500 text-sm font-medium">Equipos Monitoreados</p><p className="text-3xl font-bold text-slate-800 mt-1">{equipmentList.length}</p></div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Server size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div><p className="text-slate-500 text-sm font-medium">Tickets Abiertos</p><p className="text-3xl font-bold text-slate-800 mt-1">{ticketsList.length}</p></div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><Ticket size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div><p className="text-slate-500 text-sm font-medium">Tasa de Resolución</p><p className="text-3xl font-bold text-emerald-600 mt-1">94%</p></div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle2 size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-red-50">
          <div><p className="text-red-600 text-sm font-bold">Alertas Críticas</p><p className="text-3xl font-black text-red-700 mt-1">{ticketsList.filter(t => t.prioridad === 'CRITICA' || t.prioridad === 'ALTA').length}</p></div>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse"><AlertTriangle size={24} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandeja de Tickets */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Bandeja de Soporte</h2>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">{ticketsList.length}</span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {ticketsList.length > 0 ? (
                ticketsList.map(ticket => (
                  <div key={ticket.id} onClick={() => handleOpenTicket(ticket)} className="border border-slate-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">TKT-{String(ticket.id).padStart(4, '0')}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(ticket.prioridad)}`}>{ticket.prioridad}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{ticket.titulo}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.descripcion}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${ticket.status === 'EN_PROGRESO' ? 'text-blue-600' : 'text-slate-400'}`}>{ticket.status}</span>
                      <button className="text-blue-600 font-medium flex items-center gap-1 group-hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">Atender <ArrowRight size={12} /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Todo en orden</p>
                  <p className="text-xs text-slate-400 mt-1">No hay tickets pendientes de atención.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráfica y Tabla */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Anomalías Detectadas por Modelo</h2>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="fallas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  Aún no hay tickets suficientes para generar estadísticas.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Directorio de Equipos</h2>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-6 font-semibold">ID</th>
                    <th className="py-3 px-6 font-semibold">Número de Serie</th>
                    <th className="py-3 px-6 font-semibold">Modelo</th>
                    <th className="py-3 px-6 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {equipmentList.length > 0 ? (
                    equipmentList.map((eq) => (
                      <tr key={eq.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-6 text-slate-500 font-medium">#{eq.id}</td>
                        <td className="py-3 px-6 text-slate-800 font-mono font-medium">{eq.numero_serie}</td>
                        <td className="py-3 px-6 text-slate-600">{eq.modelo}</td>
                        <td className="py-3 px-6"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border ${getStatusColor(eq.status)}`}>{eq.status || 'SIN ESTADO'}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-500 text-sm">No hay equipos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE ATENCIÓN DE TICKET */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start bg-slate-50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-bold text-slate-500">TKT-{String(selectedTicket.id).padStart(4, '0')}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(selectedTicket.prioridad)}`}>{selectedTicket.prioridad}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedTicket.status === 'ABIERTO' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{selectedTicket.status}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{selectedTicket.titulo}</h2>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Reporte / Diagnóstico IA</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.descripcion}</p>
              </div>
              {comments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14}/> Bitácora de Soporte</h3>
                  {comments.map((comment, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><User size={14} /></div>
                      <div className="bg-white border border-slate-200 p-3 rounded-lg rounded-tl-none text-sm text-slate-700 shadow-sm w-full">
                        <p>{comment.contenido}</p>
                        <span className="text-[10px] text-slate-400 mt-2 block">{new Date(comment.fecha_creacion).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-white">
              {selectedTicket.status === 'ABIERTO' ? (
                <div className="flex justify-end gap-3">
                  <button onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancelar</button>
                  <button onClick={handleAssignTicket} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                    <Briefcase size={16} /> {isProcessing ? 'Asignando...' : 'Asignarme este Ticket'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe una respuesta al cliente..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}/>
                    <button onClick={handleAddComment} disabled={isProcessing || !newComment.trim()} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Enviar</button>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-xs text-blue-600 font-medium">Estás trabajando en este ticket.</span>
                    <button onClick={handleResolveTicket} disabled={isProcessing} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                      <CheckCircle2 size={16} /> Marcar como Resuelto
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;