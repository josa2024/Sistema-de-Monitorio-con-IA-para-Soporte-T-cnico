import React, { useState, useEffect } from 'react';
import { LifeBuoy, FileText, ShieldCheck, UserCircle, PackageCheck, ArrowLeft, Camera, CheckCircle, Ticket, Clock, AlertCircle, X, MessageSquare, User, Bot, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chatbot from './Chatbot'; 

const ClientPortal = () => {
  const [activeView, setActiveView] = useState('home');
  const [formData, setFormData] = useState({ numeroSerie: '', fechaRecepcion: '', estadoEmpaque: '', confirmacionEncendido: false });
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [ticketsList, setTicketsList] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [warrantiesList, setWarrantiesList] = useState([]);
  const [isLoadingWarranties, setIsLoadingWarranties] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketComments, setTicketComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setMensaje(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('❌ Seguridad: No tienes un token válido.');
      const timestamp = Date.now();
      const resEquipos = await fetch(`http://127.0.0.1:8000/api/v1/equipo/?t=${timestamp}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!resEquipos.ok) throw new Error(`❌ Error al conectar con la base de datos`);
      const equipos = await resEquipos.json();
      const equipoEncontrado = equipos.find(eq => eq.numero_serie === formData.numeroSerie);
      if (!equipoEncontrado) throw new Error('❌ El Número de Serie ingresado no existe en tu cuenta.');
      const payload = { estado_empaque: formData.estadoEmpaque, confirmacion_encendido: formData.confirmacionEncendido, fecha_recepcion: new Date(formData.fechaRecepcion).toISOString() };
      const response = await fetch(`http://127.0.0.1:8000/api/v1/equipo/${equipoEncontrado.id}/reception?t=${timestamp}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`❌ Error del servidor al registrar.`);
      setMensaje({ tipo: 'exito', texto: '✅ ¡Recepción registrada exitosamente! Tu garantía está activa.' });
      setTimeout(() => {
        setFormData({ numeroSerie: '', fechaRecepcion: '', estadoEmpaque: '', confirmacionEncendido: false });
        setActiveView('warranties'); setMensaje(null);
      }, 3000);
    } catch (error) { setMensaje({ tipo: 'error', texto: error.message }); } finally { setIsLoading(false); }
  };

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`http://127.0.0.1:8000/api/v1/tickets/?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setTicketsList(await response.json());
    } catch (error) { console.error("Error:", error); } finally { setIsLoadingTickets(false); }
  };

  const fetchWarranties = async () => {
    setIsLoadingWarranties(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`http://127.0.0.1:8000/api/v1/equipo/?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setWarrantiesList(await response.json());
    } catch (error) { console.error("Error:", error); } finally { setIsLoadingWarranties(false); }
  };

  useEffect(() => {
    if (activeView === 'tickets') fetchTickets();
    if (activeView === 'warranties') fetchWarranties();
  }, [activeView]);

  const handleOpenTicketDetails = async (ticket) => {
    setSelectedTicket(ticket); setIsLoadingComments(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://127.0.0.1:8000/api/v1/tickets/${ticket.id}/comments`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(res.ok) setTicketComments(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoadingComments(false); }
  };

  const closeTicketModal = () => { setSelectedTicket(null); setTicketComments([]); };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ABIERTO': return 'bg-blue-100 text-blue-700 border-blue-200/50';
      case 'EN_PROGRESO': return 'bg-amber-100 text-amber-700 border-amber-200/50';
      case 'RESUELTO': return 'bg-emerald-100 text-emerald-700 border-emerald-200/50';
      case 'CERRADO': return 'bg-slate-100 text-slate-600 border-slate-200/50';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const viewVariants = {
    hidden: { opacity: 0, x: -20, filter: "blur(10px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: 20, filter: "blur(10px)", transition: { duration: 0.2 } }
  };

  return (
    <div className="h-screen bg-slate-100 font-sans flex flex-col overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-purple-400/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000"></div>
      
      <header className="bg-white/60 backdrop-blur-xl border-b border-white/40 py-4 px-8 flex justify-between items-center shadow-sm flex-shrink-0 z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/30">IN</div>
          <span className="text-slate-800 font-bold tracking-wider text-xl">INNOTREV <span className="text-blue-600 font-medium">Soporte</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveView('tickets')} className={`text-sm font-medium transition-colors ${activeView === 'tickets' ? 'text-blue-600 font-bold' : 'text-slate-600 hover:text-blue-600'}`}>Mis Tickets</button>
          <div className="h-6 w-px bg-slate-300/50"></div>
          <div className="flex items-center gap-2 cursor-pointer bg-white/40 px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
            <span className="text-sm font-medium text-slate-700">Cliente Alpha S.A.</span>
            <UserCircle size={24} className="text-blue-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden min-h-0 relative z-10">
        <div className="lg:col-span-1 overflow-y-auto pr-2 pb-4 relative">
          <AnimatePresence mode="wait">
            {activeView === 'home' && (
              <motion.div key="home" variants={viewVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <div>
                  <h1 className="text-4xl font-black text-slate-800 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">Hola,<br/>¿cómo podemos ayudarte hoy?</h1>
                  <p className="text-slate-600 mt-3 text-sm font-medium">Nuestro asistente de Inteligencia Artificial está listo para diagnosticar tu equipo en segundos.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-8">
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} onClick={() => setActiveView('reception')} className="bg-gradient-to-br from-blue-600 to-indigo-600 p-5 rounded-2xl border border-white/20 shadow-xl shadow-blue-500/20 flex items-start gap-4 cursor-pointer group text-white">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl"><PackageCheck size={24} /></div>
                    <div><h3 className="font-bold text-lg">Registrar Recepción</h3><p className="text-xs text-blue-100 mt-1 opacity-90">Confirma la llegada física de tu equipo para activar la garantía.</p></div>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} onClick={() => setActiveView('tickets')} className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-4 cursor-pointer group hover:bg-white/80 transition-colors">
                    <div className="bg-blue-100/80 p-3 rounded-xl text-blue-600"><Ticket size={24} /></div>
                    <div><h3 className="font-bold text-slate-800 text-lg">Mis Tickets</h3><p className="text-xs text-slate-500 mt-1">Revisa el estado de tus reportes de soporte técnico.</p></div>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} onClick={() => setActiveView('warranties')} className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-4 cursor-pointer group hover:bg-white/80 transition-colors">
                    <div className="bg-emerald-100/80 p-3 rounded-xl text-emerald-600"><ShieldCheck size={24} /></div>
                    <div><h3 className="font-bold text-slate-800 text-lg">Mis Garantías</h3><p className="text-xs text-slate-500 mt-1">Revisa el estado de protección de tus equipos.</p></div>
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            {/* VISTAS DE TICKETS, RECEPCIÓN Y GARANTÍAS */}
            {activeView === 'tickets' && (
              <motion.div key="tickets" variants={viewVariants} initial="hidden" animate="visible" exit="exit" className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50 min-h-full">
                <button onClick={() => setActiveView('home')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 text-sm font-bold transition-colors"><ArrowLeft size={16} /> Volver</button>
                <div className="flex items-center justify-between mb-6"><div><h2 className="text-2xl font-black text-slate-800">Mis Reportes</h2></div><div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shadow-sm"><Ticket size={24} /></div></div>
                {isLoadingTickets ? ( <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> ) : ticketsList.length > 0 ? (
                  <div className="space-y-4">{ticketsList.map((t) => (
                    <motion.div whileHover={{ scale: 1.02 }} key={t.id} onClick={() => handleOpenTicketDetails(t)} className="bg-white/80 border border-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400 group-hover:text-blue-600">TKT-{String(t.id).padStart(4, '0')}</span><span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${getStatusBadge(t.status)}`}>{t.status}</span></div>
                      <h3 className="font-bold text-slate-800 text-sm mb-2">{t.titulo}</h3>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100"><span className="flex items-center gap-1"><Clock size={12} /> {new Date(t.fecha_creacion).toLocaleDateString()}</span><span className="text-blue-600 font-bold">Ver Detalles →</span></div>
                    </motion.div>
                  ))}</div>
                ) : ( <div className="text-center py-12 px-4 bg-white/40 rounded-2xl border border-dashed border-slate-300"><ShieldCheck size={40} className="mx-auto text-slate-400 mb-3" /><h3 className="text-sm font-bold text-slate-700">Todo en orden</h3></div> )}
              </motion.div>
            )}

            {activeView === 'reception' && (
              <motion.div key="reception" variants={viewVariants} initial="hidden" animate="visible" exit="exit" className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50">
                <button onClick={() => setActiveView('home')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 text-sm font-bold transition-colors"><ArrowLeft size={16} /> Volver</button>
                <h2 className="text-2xl font-black text-slate-800 mb-6">Registro de Recepción</h2>
                {mensaje && (<div className={`p-4 rounded-xl mb-6 text-sm font-bold shadow-sm ${mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{mensaje.texto}</div>)}
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Número de Serie</label><input type="text" name="numeroSerie" value={formData.numeroSerie} onChange={handleInputChange} required className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Recepción</label><input type="date" name="fechaRecepcion" value={formData.fechaRecepcion} onChange={handleInputChange} required className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Estado del Empaque</label><select name="estadoEmpaque" value={formData.estadoEmpaque} onChange={handleInputChange} required className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"><option value="">Selecciona...</option><option value="Excelente">Excelente</option><option value="Dañado">Dañado</option></select></div>
                  <div className="flex items-start gap-3 mt-6 bg-blue-50/50 backdrop-blur-sm p-4 rounded-xl border border-blue-100"><input type="checkbox" id="encendido" name="confirmacionEncendido" checked={formData.confirmacionEncendido} onChange={handleInputChange} required className="mt-1 w-5 h-5 accent-blue-600 rounded" /><label htmlFor="encendido" className="text-sm text-slate-700 cursor-pointer font-medium">Confirmo que el equipo <strong>encendió correctamente</strong> y está operativo.</label></div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl mt-8 shadow-lg shadow-blue-500/30">{isLoading ? 'Procesando...' : 'Confirmar y Activar Garantía'}</motion.button>
                </form>
              </motion.div>
            )}

            {activeView === 'warranties' && (
              <motion.div key="warranties" variants={viewVariants} initial="hidden" animate="visible" exit="exit" className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50 min-h-full">
                <button onClick={() => setActiveView('home')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 text-sm font-bold transition-colors"><ArrowLeft size={16} /> Volver</button>
                <div className="flex items-center justify-between mb-6"><div><h2 className="text-2xl font-black text-slate-800">Mis Garantías</h2></div><div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-sm"><ShieldCheck size={24} /></div></div>
                {isLoadingWarranties ? ( <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div> ) : warrantiesList.length > 0 ? (
                  <div className="space-y-4">{warrantiesList.map((eq) => {
                    const isActive = eq.status === 'INSTALADO' || eq.status === 'ACTIVO';
                    return (
                      <motion.div whileHover={{ scale: 1.02 }} key={eq.id} className="bg-white/80 border border-white rounded-2xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-slate-400">SN: {eq.numero_serie}</span><span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{isActive ? 'GARANTÍA ACTIVA' : 'PENDIENTE'}</span></div>
                        <h3 className="font-bold text-slate-800 text-sm mb-3">{eq.modelo}</h3>
                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100"><span className="flex items-center gap-1 font-medium"><Clock size={12} className={isActive ? "text-emerald-500" : "text-slate-400"} /> Vence: {eq.fecha_vencimiento_garantia ? new Date(eq.fecha_vencimiento_garantia).toLocaleDateString() : 'Por activar'}</span></div>
                      </motion.div>
                    );
                  })}</div>
                ) : ( <div className="text-center py-12 px-4 bg-white/40 rounded-2xl border border-dashed border-slate-300"><PackageCheck size={40} className="mx-auto text-slate-400 mb-3" /><p className="text-sm font-bold text-slate-700">Sin equipos registrados</p></div> )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-2 h-full min-h-0 relative z-10">
          <div className="h-full bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-white/60 overflow-hidden">
            <Chatbot mode="client" />
          </div>
        </div>

        {/* --- MODAL DETALLE DE TICKET --- */}
        <AnimatePresence>
          {selectedTicket && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm rounded-2xl">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white/80 backdrop-blur-2xl w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85%] overflow-hidden border border-white/60">
                <div className="px-6 py-5 border-b border-white/50 flex justify-between items-center bg-white/40">
                  <div className="flex items-center gap-4"><div className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Ticket size={20} /></div><div><h2 className="font-black text-slate-800">Detalles del Reporte</h2><p className="text-xs text-blue-600 font-bold tracking-wider">TKT-{String(selectedTicket.id).padStart(4, '0')}</p></div></div>
                  <button onClick={closeTicketModal} className="text-slate-400 hover:text-slate-800 bg-white/50 hover:bg-white rounded-full p-2 transition-all shadow-sm"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex gap-4 flex-row-reverse">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shadow-inner"><User size={20} /></div>
                    <div className="max-w-[85%] bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-5 py-4 text-sm shadow-md"><p className="font-bold mb-2 pb-2 border-b border-white/20">{selectedTicket.titulo}</p><p className="whitespace-pre-wrap leading-relaxed opacity-95">{selectedTicket.descripcion}</p></div>
                  </div>
                  <div className="flex justify-center my-4"><span className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide border shadow-sm flex items-center gap-2 bg-white/80 backdrop-blur-sm ${getStatusBadge(selectedTicket.status)}`}>{selectedTicket.status === 'RESUELTO' ? <CheckCircle size={14} /> : <Activity size={14} className="animate-spin-slow" />} ESTADO: {selectedTicket.status}</span></div>
                  {isLoadingComments ? ( <div className="flex justify-center py-4"><div className="animate-bounce w-2 h-2 bg-blue-400 rounded-full mx-1"></div><div className="animate-bounce w-2 h-2 bg-blue-400 rounded-full mx-1 delay-75"></div><div className="animate-bounce w-2 h-2 bg-blue-400 rounded-full mx-1 delay-150"></div></div> ) : ticketComments.length > 0 ? (
                    ticketComments.map((comment, idx) => (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={idx} className="flex gap-4 flex-row">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-200"><Bot size={20} /></div>
                        <div className="max-w-[85%] bg-white/90 border border-white text-slate-700 rounded-2xl rounded-tl-none px-5 py-4 text-sm shadow-md"><p className="text-xs font-black text-emerald-600 mb-2 uppercase tracking-wide">Técnico de Innotrev</p><p className="whitespace-pre-wrap leading-relaxed font-medium">{comment.contenido}</p><span className="text-[10px] text-slate-400 mt-3 block font-bold">{new Date(comment.fecha_creacion).toLocaleString()}</span></div>
                      </motion.div>
                    ))
                  ) : ( <p className="text-center text-xs text-slate-500 font-medium bg-white/50 py-3 rounded-xl border border-white/50">Un ingeniero responderá a tu reporte pronto.</p> )}
                </div>
                {selectedTicket.status === 'RESUELTO' && ( <div className="p-5 bg-emerald-50/90 backdrop-blur-md border-t border-emerald-200/50 text-center"><p className="text-sm font-black text-emerald-700">Este ticket ha sido marcado como Resuelto.</p><p className="text-xs text-emerald-600 mt-1 font-medium">Si la falla persiste, por favor abre un nuevo reporte con la IA.</p></div> )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ClientPortal;