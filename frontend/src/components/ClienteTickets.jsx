import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, MessageSquare, FileText, X, AlertTriangle, Search, Send, RefreshCw, CheckCircle2, Clock, FilterX, User, Bot, ShieldCheck, Wrench } from 'lucide-react'; // 🔥 IMPORTAMOS Wrench
import { getAuthHeaders } from '../services/api';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

const ClienteTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketComments, setTicketComments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtro activo para las tarjetas superiores
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // Nuevos estados para Soporte/Admin
  const [newComment, setNewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Validar rol actual
  const userRole = localStorage.getItem('userRole');
  const canInteract = userRole === 'ADMIN' || userRole === 'TECNICO';

  const fetchTickets = async () => {
    try {
      const headers = getAuthHeaders();
      const resTk = await fetch('http://localhost:8000/api/v1/tickets/?t=' + Date.now(), { headers });
      if (resTk.ok) setTickets(await resTk.json());
      else if (resTk.status === 401) console.error("Token inválido");
    } catch (error) {
      console.error("Error al cargar tickets:", error);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const fetchComments = async (ticketId) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:8000/api/v1/tickets/${ticketId}/comments`, { headers });
      if (res.ok) setTicketComments(await res.json());
    } catch (e) { console.error(e); }
  }

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    await fetchComments(ticket.id);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
    setTicketComments([]);
    setNewComment('');
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsUpdating(true);
    try {
      const headers = getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contenido: newComment })
      });
      setNewComment('');
      await fetchComments(selectedTicket.id);
    } catch (e) {
      alert("Error al enviar comentario");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdating(true);
    try {
      const headers = getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const res = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado: newStatus })
      });
      if (res.ok) {
        const updatedTicket = await res.json();
        setSelectedTicket(updatedTicket);
        fetchTickets();
      }
    } catch (err) {
      alert("Error al cambiar estado");
    } finally {
      setIsUpdating(false);
    }
  };

  const generarComprobanteTicket = (ticket, e) => {
    e?.stopPropagation(); // Evita abrir el modal al dar click en el botón
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(11, 20, 55); doc.text("INNOTREV", 20, 25);
    doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.text("Comprobante de Ticket de Soporte", 20, 35);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.line(20, 42, 190, 42);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(60, 60, 60); 
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 20, 55); 
    doc.text(`Estado: `, 20, 65);
    doc.setFont("helvetica", "bold"); doc.setTextColor(37, 99, 235); doc.text(ticket.status, 40, 65);
    doc.setDrawColor(220, 220, 220); doc.setFillColor(248, 250, 252); doc.roundedRect(20, 80, 170, 70, 3, 3, 'FD');
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(11, 20, 55); doc.text("Detalles del Ticket:", 25, 90);
    doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60); 
    doc.text(`Folio: #TKT-${String(ticket.id).padStart(4, '0')}`, 30, 100); 
    doc.text(`Cliente: ${ticket.cliente?.nombre || ticket.cliente?.email || 'Desconocido'}`, 30, 110);
    doc.text(`Categoría: ${ticket.categoria || 'Diagnóstico IA'}`, 30, 120);
    doc.text(`Prioridad: ${ticket.prioridad || 'No asignada'}`, 30, 130);
    
    const descLines = doc.splitTextToSize(`Descripción: ${ticket.descripcion}`, 150);
    doc.text(descLines, 30, 140);
    
    doc.save(`Ticket_Soporte_${ticket.id}.pdf`);
  };

  // Lógica de filtrado combinado
  const filteredTickets = tickets.filter(t => {
    const matchStatus = activeFilter === 'ALL' || t.status === activeFilter;
    const search = searchTerm.toLowerCase();
    const matchSearch = String(t.id).includes(search) || 
      (t.descripcion && t.descripcion.toLowerCase().includes(search)) ||
      (t.status && t.status.toLowerCase().includes(search)) ||
      (t.categoria && t.categoria.toLowerCase().includes(search)) ||
      (t.cliente?.nombre && t.cliente.nombre.toLowerCase().includes(search));
    
    return matchStatus && matchSearch;
  });

  // Estadísticas 🔥 AGREGAMOS MANTENIMIENTO
  const stats = {
    total: tickets.length,
    abiertos: tickets.filter(t => t.status === 'ABIERTO').length,
    progreso: tickets.filter(t => t.status === 'EN_PROGRESO').length,
    mantenimiento: tickets.filter(t => t.status === 'MANTENIMIENTO').length,
    resueltos: tickets.filter(t => t.status === 'RESUELTO').length
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ABIERTO': return <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-200 flex items-center gap-1.5 w-max"><AlertTriangle size={14} className="text-amber-500 animate-pulse"/> Abierto</span>;
      case 'EN_PROGRESO': return <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-200 flex items-center gap-1.5 w-max"><Clock size={14}/> En Progreso</span>;
      case 'MANTENIMIENTO': return <span className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-300 flex items-center gap-1.5 w-max"><Wrench size={14}/> Mantenimiento</span>; // 🔥 NUEVO BADGE GRIS
      case 'RESUELTO': return <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1.5 w-max"><CheckCircle2 size={14}/> Resuelto</span>;
      default: return <span className="bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 w-max">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* HEADER & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0b1437]">Mesa de Ayuda</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestión y seguimiento de reportes generados por la IA.</p>
        </div>
        
        {tickets.length > 0 && (
          <div className="relative w-full lg:w-96 shrink-0 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por folio, cliente o falla..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* MÉTRICAS / FILTROS 🔥 AJUSTADO A 5 COLUMNAS (xl:grid-cols-5) */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          <div 
            onClick={() => setActiveFilter('ALL')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'ALL' ? 'bg-slate-800 border-slate-800 ring-4 ring-slate-800/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-300'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-md' : 'bg-slate-50 text-slate-600'}`}><Ticket size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>Total Histórico</p><p className={`text-2xl font-black ${activeFilter === 'ALL' ? 'text-white' : 'text-[#0b1437]'}`}>{stats.total}</p></div>
          </div>
          
          <div 
            onClick={() => setActiveFilter('ABIERTO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'ABIERTO' ? 'bg-amber-50 border-amber-300 ring-4 ring-amber-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-amber-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'ABIERTO' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600'}`}><AlertTriangle size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'ABIERTO' ? 'text-amber-700' : 'text-slate-400'}`}>Nuevos / Abiertos</p><p className="text-2xl font-black text-[#0b1437]">{stats.abiertos}</p></div>
          </div>

          <div 
            onClick={() => setActiveFilter('EN_PROGRESO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'EN_PROGRESO' ? 'bg-blue-50 border-blue-300 ring-4 ring-blue-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-blue-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'EN_PROGRESO' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}><Clock size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'EN_PROGRESO' ? 'text-blue-700' : 'text-slate-400'}`}>En Progreso</p><p className="text-2xl font-black text-[#0b1437]">{stats.progreso}</p></div>
          </div>

          {/* 🔥 NUEVA TARJETA: MANTENIMIENTO */}
          <div 
            onClick={() => setActiveFilter('MANTENIMIENTO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'MANTENIMIENTO' ? 'bg-slate-200 border-slate-400 ring-4 ring-slate-400/20 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-300'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'MANTENIMIENTO' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}><Wrench size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'MANTENIMIENTO' ? 'text-slate-800' : 'text-slate-400'}`}>En Mantenimiento</p><p className="text-2xl font-black text-[#0b1437]">{stats.mantenimiento}</p></div>
          </div>

          <div 
            onClick={() => setActiveFilter('RESUELTO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'RESUELTO' ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-emerald-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'RESUELTO' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600'}`}><CheckCircle2 size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'RESUELTO' ? 'text-emerald-700' : 'text-slate-400'}`}>Resueltos</p><p className="text-2xl font-black text-[#0b1437]">{stats.resueltos}</p></div>
          </div>
        </div>
      )}

      {/* INDICADOR DE FILTRO ACTIVO */}
      <AnimatePresence>
        {activeFilter !== 'ALL' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3">
             <span className="text-sm font-bold text-slate-500">Mostrando tickets en estado:</span>
             <button onClick={() => setActiveFilter('ALL')} className="flex items-center gap-1.5 bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-slate-300 transition-colors shadow-sm">
               {activeFilter.replace('_', ' ')} <FilterX size={14} className="ml-1 opacity-70"/>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLA PRINCIPAL */}
      {tickets.length === 0 ? (
        <div className="bg-white p-20 rounded-[2rem] shadow-sm border border-slate-100 text-center text-slate-400 flex flex-col items-center justify-center min-h-[600px]">
          <div className="bg-blue-50 p-6 rounded-full mb-6"><Ticket size={48} className="text-blue-500" /></div>
          <h3 className="text-2xl font-black text-[#0b1437] mb-2">Bandeja Vacía</h3>
          <p className="text-slate-500">Las solicitudes de soporte y diagnósticos de la IA aparecerán aquí.</p>
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[1024px] table-fixed">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="px-8 py-6 w-[12%]">Folio</th>
                  <th className="px-8 py-6 w-[20%]">Cliente</th>
                  <th className="px-8 py-6 w-[30%]">Reporte de Falla</th>
                  <th className="px-8 py-6 w-[13%]">Fecha</th>
                  <th className="px-8 py-6 w-[15%]">Estatus</th>
                  <th className="px-8 py-6 text-right w-[10%]">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredTickets.map(t => (
                  <tr key={t.id} onClick={() => handleOpenTicket(t)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                    <td className="px-8 py-5 font-mono font-black text-blue-600 text-base group-hover:text-blue-700">TKT-{String(t.id).padStart(4, '0')}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black flex items-center justify-center text-xs border border-slate-200 shrink-0">
                          {(t.cliente?.nombre || 'G').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[#0b1437] font-bold truncate max-w-[150px]">{t.cliente?.nombre || t.cliente?.email || 'General'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-slate-600 font-medium truncate max-w-[300px] mb-1" title={t.descripcion}>{t.descripcion}</p>
                      <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-purple-100">
                        {t.categoria || 'Diagnóstico IA'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-500 font-medium">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5">{getStatusBadge(t.status)}</td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={(e) => generarComprobanteTicket(t, e)} className="text-slate-400 bg-white hover:bg-blue-50 hover:text-blue-600 p-2.5 rounded-xl transition-all shadow-sm border border-slate-200 hover:border-blue-200 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 mr-2" title="Descargar PDF">
                        <FileText size={16} />
                      </button>
                      <button className="text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white p-2.5 rounded-xl transition-all shadow-sm inline-flex items-center">
                        <MessageSquare size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center text-slate-400 min-h-[600px] flex flex-col items-center justify-center">
          <Search size={56} className="mb-4 opacity-30" />
          <h3 className="text-xl font-black text-slate-700 mb-2">Búsqueda sin resultados</h3>
          <p className="text-base text-slate-500">No hay tickets que coincidan con los filtros actuales.</p>
        </div>
      )}

      {/* MODAL CHAT / LÍNEA DE TIEMPO DEL TICKET */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {selectedTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#050b1a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:p-6" onClick={handleCloseModal}>
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[90vh] md:h-[80vh]" onClick={(e) => e.stopPropagation()}>
               
               {/* CABECERA DEL MODAL */}
               <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50 shrink-0 gap-4">
                 <div className="flex items-center gap-4">
                   <div className={`p-4 rounded-2xl shadow-sm text-white ${
                     selectedTicket.status === 'ABIERTO' ? 'bg-amber-500 shadow-amber-500/20' : 
                     selectedTicket.status === 'EN_PROGRESO' ? 'bg-blue-600 shadow-blue-600/20' : 
                     selectedTicket.status === 'MANTENIMIENTO' ? 'bg-slate-600 shadow-slate-600/20' : 
                     'bg-emerald-500 shadow-emerald-500/20'
                    }`}>
                     <Ticket size={28}/>
                   </div>
                   <div>
                     <h2 className="font-black text-[#0b1437] text-2xl mb-1 flex items-center gap-2">TKT-{String(selectedTicket.id).padStart(4, '0')}</h2>
                     <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><User size={14}/> {selectedTicket.cliente?.nombre || selectedTicket.cliente?.email || 'Cliente General'}</p>
                   </div>
                 </div>
                 
                 {/* CONTROLES DE ESTADO (SOLO ADMIN Y SOPORTE) */}
                 <div className="flex items-center gap-4 bg-white p-2 pl-4 rounded-2xl shadow-sm border border-slate-100">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:inline-block">Cambiar Estado:</span>
                   {canInteract ? (
                     <select 
                        value={selectedTicket.status} 
                        onChange={handleStatusChange}
                        disabled={isUpdating}
                        className={`text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border outline-none cursor-pointer transition-colors ${
                          selectedTicket.status === 'ABIERTO' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                          selectedTicket.status === 'EN_PROGRESO' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                          selectedTicket.status === 'MANTENIMIENTO' ? 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                     >
                       <option value="ABIERTO">Abierto / Nuevo</option>
                       <option value="EN_PROGRESO">En Progreso / Revisión</option>
                       <option value="MANTENIMIENTO">Mantenimiento Físico</option>
                       <option value="RESUELTO">Marcado como Resuelto</option>
                     </select>
                   ) : (
                     getStatusBadge(selectedTicket.status)
                   )}
                   <div className="w-px h-8 bg-slate-200 mx-1"></div>
                   <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition-colors"><X size={20} /></button>
                 </div>
               </div>
               
               {/* ÁREA DE MENSAJES (CHAT) */}
               <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white custom-scrollbar space-y-6 flex flex-col">
                 
                 {/* Mensaje Original (Reporte IA) */}
                 <div className="flex gap-4 max-w-[85%]">
                    <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                      <Bot size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl rounded-tl-none shadow-sm">
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 border-b border-purple-100/50 pb-2">Diagnóstico Inicial IA ({selectedTicket.categoria})</p>
                        <p className="text-sm text-[#0b1437] font-medium whitespace-pre-wrap leading-relaxed">{selectedTicket.descripcion}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-1.5 ml-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                    </div>
                 </div>

                 {/* Historial de Respuestas */}
                 {ticketComments.length > 0 ? (
                   ticketComments.map((comment, idx) => {
                     const isSupport = comment.autor?.role_id !== 4; // Asumiendo que 4 es CLIENTE
                     
                     return (
                       <div key={idx} className={`flex gap-4 max-w-[85%] ${isSupport ? 'self-end flex-row-reverse' : 'self-start'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${isSupport ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                            {isSupport ? <ShieldCheck size={20} /> : <User size={20} />}
                          </div>
                          <div className={`flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}>
                            <div className={`p-5 rounded-2xl shadow-sm ${isSupport ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-50 border border-slate-200 text-[#0b1437] rounded-tl-none'}`}>
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 border-b pb-2 ${isSupport ? 'text-blue-200 border-blue-500/50' : 'text-slate-400 border-slate-200'}`}>
                                {isSupport ? (comment.autor?.nombre || 'Soporte Innotrev') : 'Cliente'}
                              </p>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{comment.contenido}</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1.5 mx-1">{new Date(comment.fecha_creacion).toLocaleString()}</p>
                          </div>
                       </div>
                     );
                   })
                 ) : (
                   <div className="flex flex-col items-center justify-center py-10 my-auto text-slate-300">
                     <MessageSquare size={48} className="mb-4 opacity-50" />
                     <p className="text-sm font-bold text-slate-400 bg-slate-50 px-6 py-2 rounded-full border border-slate-100">Sin respuestas en este ticket</p>
                   </div>
                 )}
               </div>

               {/* ZONA DE INPUT (TEXTAREA) */}
               {canInteract && (
                 <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 shrink-0">
                   <div className="bg-white border border-slate-200 rounded-3xl p-2 flex items-end gap-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm">
                     <textarea 
                        className="flex-1 bg-transparent p-4 text-sm outline-none resize-none min-h-[60px] max-h-[120px] custom-scrollbar font-medium text-[#0b1437] placeholder:text-slate-400"
                        rows="1"
                        placeholder="Escribe una respuesta para el cliente..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                     ></textarea>
                     <button 
                        onClick={handleAddComment}
                        disabled={isUpdating || !newComment.trim()}
                        className="bg-[#0b1437] hover:bg-blue-600 disabled:opacity-50 text-white p-4 rounded-2xl shadow-md transition-all shrink-0 m-1"
                     >
                       {isUpdating ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                     </button>
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 mt-3 ml-4 text-center">Presiona <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">Enter</span> para enviar. Usa <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">Shift + Enter</span> para salto de línea.</p>
                 </div>
               )}
               
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default ClienteTickets;