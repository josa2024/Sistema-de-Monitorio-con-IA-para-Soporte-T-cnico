import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Bot, ShieldCheck, LogIn, LogOut, UserCircle, PackageOpen, Ticket, Truck, CheckCircle2, X, Store, CreditCard, AlertTriangle, ShieldAlert, UploadCloud, Camera, Sparkles, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chatbot from './Chatbot';
import Login from './Login';

const INNOTREV_CATALOG = ["Handheld Zebra TC22 / TC27", "Handheld Honeywell EDA52", "Impresora de Etiquetas Ribetec RT-420ME", "Impresora Industrial Zebra ZT411", "Impresora de Credenciales Zebra ZC300", "Tableta Industrial Uso Rudo IP67", "Lector RFID Zebra MC33"];

// Variantes de animación para las tarjetas
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const InnotrevWeb = ({ isAuthenticated, userName, onLoginSuccess, onLogout }) => {
  const [currentView, setCurrentView] = useState(localStorage.getItem('innotrevCurrentView') || 'home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [selectedProductForChat, setSelectedProductForChat] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketComments, setTicketComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isProcessingComment, setIsProcessingComment] = useState(false);
  
  // Estados del Chatbot
  const [chatMessages, setChatMessages] = useState([{ role: 'bot', text: 'Hola. Soy el agente de IA de Innotrev. Estoy aquí para resolver problemas con tus equipos Zebra, Honeywell o infraestructura RFID. ¿En qué te ayudo?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPriority, setChatPriority] = useState(null);
  const [chatShowTicketButton, setChatShowTicketButton] = useState(false);
  const [chatLastUserIssue, setChatLastUserIssue] = useState('');
  const [chatCategory, setChatCategory] = useState('General / Otro');

  // Estados para Modal de Pedidos y Recepción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [file, setFile] = useState(null);
  const [formRecepcion, setFormRecepcion] = useState({ estado_empaque: 'Excelente', confirmacion_encendido: false, notas: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, currentView]); // Refrescar los datos al cambiar de vista

  useEffect(() => {
    localStorage.setItem('innotrevCurrentView', currentView);
  }, [currentView]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const resEq = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (resEq.ok) setEquipmentList(await resEq.json());
      const resTk = await fetch('http://localhost:8000/api/v1/tickets/?t=' + Date.now(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (resTk.ok) setTicketsList(await resTk.json());
    } catch (error) { console.error(error); }
  };

  const handleConsultarEquipo = (modelo) => {
    setSelectedProductForChat(modelo);
    setCurrentView('support');
  };

  const handlePagar = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/equipo/${selectedEq.id}`, {
        method: 'PUT', 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: "EN_TRANSITO" })
      });
      if (res.ok) { 
        setIsPaymentModalOpen(false); 
        alert("✅ Pago exitoso. El equipo será despachado."); 
        fetchData(); 
      } else {
        alert("Hubo un error al procesar el pago.");
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleConfirmarRecepcion = async (e) => {
    e.preventDefault();
    if (!file) return alert("Por favor, adjunta una fotografía como evidencia.");
    setIsProcessing(true);
    try {
      const formData = new FormData(); 
      formData.append('file', file); 
      formData.append('estado_empaque', formRecepcion.estado_empaque); 
      formData.append('encendio_correctamente', formRecepcion.confirmacion_encendido ? "true" : "false"); 
      if (formRecepcion.notas) formData.append('observaciones', formRecepcion.notas);
      formData.append('fecha_recepcion', new Date().toISOString());

      const res = await fetch(`http://localhost:8000/api/v1/equipo/${selectedEq.id}/reception`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, 
        body: formData 
      });
      
      if (res.ok) { 
        // Si se reporta daño, empaque abierto o falla al encender, generamos ticket automático
        if (formRecepcion.estado_empaque === 'Abierto' || formRecepcion.estado_empaque === 'Dañado' || !formRecepcion.confirmacion_encendido) {
          const ticketData = {
            titulo: `Alerta de Recepción: ${formRecepcion.estado_empaque !== 'Excelente' ? 'Daño/Manipulación' : 'Falla de Encendido'}`,
            descripcion: `El cliente reportó una anomalía durante la recepción física del equipo ${selectedEq.modelo} (S/N: ${selectedEq.numero_serie}).\n\nDetalles marcados:\n- Estado del empaque: ${formRecepcion.estado_empaque}\n- ¿Encendió correctamente?: ${formRecepcion.confirmacion_encendido ? 'Sí' : 'No (o no confirmado por prevención)'}\n- Notas adicionales: ${formRecepcion.notas || 'Ninguna'}`,
            equipo_id: selectedEq.id,
            cliente_id: selectedEq.cliente_id,
            categoria: "Logística / Envío",
            prioridad: "ALTA"
          };
          
          try {
            await fetch('http://localhost:8000/api/v1/tickets/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify(ticketData)
            });
          } catch (error) {
            console.error("Error al generar ticket automático de recepción:", error);
          }
        }

        setIsModalOpen(false); 
        fetchData(); 
        setCurrentView('recepcion'); 
      } else {
        alert("Hubo un error al confirmar la recepción. Revisa la consola.");
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/tickets/${ticket.id}/comments`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setTicketComments(await res.json());
    } catch (e) { console.error(e); }
  };
  
  const handleCloseTicketModal = () => {
    setSelectedTicket(null);
    setTicketComments([]);
    setNewComment('');
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    setIsProcessingComment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contenido: newComment })
      });
      if (response.ok) {
        setNewComment('');
        // Recargar los comentarios para mostrar el nuevo al instante
        const res = await fetch(`http://localhost:8000/api/v1/tickets/${selectedTicket.id}/comments`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setTicketComments(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessingComment(false);
    }
  };

  // Clasificación de equipos del usuario
  const pedidos = equipmentList.filter(eq => ['SOLICITADO', 'PENDIENTE_PAGO', 'EN_TRANSITO'].includes(eq.status));
  const instalados = equipmentList.filter(eq => ['INSTALADO', 'FALLA_REPORTADA'].includes(eq.status));

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col relative overflow-hidden">
      
      {/* NAVBAR GLASSMORPHISM */}
      <nav className="bg-[#050b1a]/90 backdrop-blur-md text-white sticky top-0 z-40 border-b border-white/10 h-20 shrink-0 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-105 transition-transform">IN</div>
            <span className="font-black text-2xl tracking-widest hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">INNOTREV</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <button onClick={() => setCurrentView('home')} className={`text-sm font-bold px-3 py-2 rounded-lg transition-all ${currentView === 'home' ? 'text-blue-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>Inicio</button>
            <button onClick={() => setCurrentView('tienda')} className={`text-sm font-bold px-3 py-2 rounded-lg transition-all ${currentView === 'tienda' ? 'text-blue-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>Catálogo</button>
            <button onClick={() => setCurrentView('support')} className={`text-sm font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${currentView === 'support' ? 'text-blue-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <Bot size={18} className={currentView === 'support' ? 'animate-pulse text-blue-400' : 'text-emerald-400'} /> <span className="hidden sm:inline">Soporte IA</span>
            </button>
            <div className="w-px h-6 bg-white/20 mx-1 hidden md:block"></div>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden md:flex">
                  <button onClick={() => setCurrentView('recepcion')} className={`text-xs uppercase tracking-widest font-black px-4 py-2.5 rounded-xl transition-all shadow-sm ${currentView === 'recepcion' ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                    Mi Hardware {(pedidos.length > 0 || instalados.length > 0 || ticketsList.length > 0) && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1.5 shadow-sm">{pedidos.length + instalados.length + ticketsList.length}</span>}
                  </button>
                </div>
                <div className="flex items-center gap-3 bg-[#0a1229] px-3 py-1.5 rounded-full border border-white/10 ml-2 shadow-inner">
                  <UserCircle className="text-blue-400" size={24} />
                  <span className="text-sm font-bold text-slate-200 pr-2 hidden sm:block">{userName}</span>
                </div>
                <button onClick={onLogout} className="text-slate-400 hover:text-red-400 p-2.5 hover:bg-red-500/10 rounded-full transition-colors"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-0.5 ml-2">
                <LogIn size={18} /> Acceder
              </button>
            )}
          </div>
        </div>
      </nav>

      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {showLoginModal && !isAuthenticated && <Login onLoginSuccess={(t, r, n) => { setShowLoginModal(false); onLoginSuccess(t, r, n); }} onClose={() => setShowLoginModal(false)} />}
      </AnimatePresence>, document.body)}

      <main className={`flex-1 flex flex-col relative z-10 ${currentView === 'support' ? 'h-[calc(100dvh-80px)] max-h-[calc(100dvh-80px)] overflow-hidden' : 'overflow-y-auto'}`}>
        
        {/* VISTA HOME PREMIUM */}
        {currentView === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            <div className="bg-[#050b1a] text-white py-32 px-6 text-center relative overflow-hidden flex-1 flex items-center justify-center min-h-[600px]">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#f8fafc] to-transparent z-10"></div>
              
              <div className="max-w-4xl mx-auto relative z-20">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black tracking-widest text-xs uppercase mb-6">
                    <Sparkles size={12} /> Hardware • Software • Soporte IA
                  </span>
                </motion.div>
                <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                  Soluciones Tecnológicas Integrales
                </motion.h1>
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                  Explora nuestro catálogo de equipo industrial RFID y obtén soporte predictivo con inteligencia artificial en segundos.
                </motion.p>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={() => setCurrentView('tienda')} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-lg font-black flex items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-1">
                    Ver Catálogo de Equipos <ArrowRight size={20} />
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TIENDA E-COMMERCE PÚBLICA */}
        {currentView === 'tienda' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 md:p-12 max-w-7xl mx-auto w-full">
             <div className="mb-12 text-center max-w-2xl mx-auto">
               <h2 className="text-4xl font-black text-[#0b1437] mb-4">Catálogo de Hardware</h2>
               <p className="text-slate-500 text-lg">Conoce nuestras soluciones enterprise. ¿Tienes dudas sobre un equipo? Nuestra IA te asesora al instante.</p>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {INNOTREV_CATALOG.map(item => (
                 <motion.div variants={itemVariants} key={item} className="group bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 hover:border-blue-200 transition-all duration-300 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-16 h-16 bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-400 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 shadow-inner">
                      <Store size={28}/>
                    </div>
                    <h3 className="font-black text-[#0b1437] text-xl mb-3 leading-snug group-hover:text-blue-700 transition-colors">{item}</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Solución enterprise optimizada para operaciones críticas en almacén, logística y punto de venta.</p>
                    <button onClick={() => handleConsultarEquipo(item)} className="mt-auto w-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-black py-4 rounded-xl text-sm transition-all duration-300 hover:shadow-[0_4px_15px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2">
                      <MessageSquare size={18} /> Consultar con IA
                    </button>
                 </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* VISTA: MIS PEDIDOS Y EQUIPOS INSTALADOS */}
        {isAuthenticated && currentView === 'recepcion' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 md:p-12 max-w-5xl mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-[#0b1437]">Mi Centro de Hardware</h2>
              <p className="text-slate-500 mt-2 text-lg">Sigue el estado de tus compras y visualiza tu equipo instalado.</p>
            </div>

            {pedidos.length === 0 && instalados.length === 0 && ticketsList.length === 0 ? (
              <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center flex flex-col items-center">
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <PackageOpen size={40} className="text-slate-400" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 mb-2">Bandeja Vacía</h3>
                 <p className="text-slate-500 text-lg max-w-md">Aún no tienes hardware registrado, en proceso de envío, ni tickets de soporte.</p>
                 <button onClick={() => setCurrentView('tienda')} className="mt-8 bg-white border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 font-bold px-6 py-3 rounded-xl transition-all">Ir al Catálogo</button>
              </div>
            ) : (
              <div className="space-y-12">
                
                {/* PEDIDOS EN TRÁMITE */}
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Truck className="text-blue-600" /> Pedidos en Curso
                  </h3>
                  
                  {pedidos.length > 0 ? (
                    <div className="space-y-6">
                    {pedidos.map((eq, index) => (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} key={eq.id} className="bg-white border border-slate-200 hover:border-slate-300 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                          <div className={`absolute left-0 top-0 bottom-0 w-2 ${eq.status === 'SOLICITADO' ? 'bg-purple-400' : eq.status === 'PENDIENTE_PAGO' ? 'bg-blue-500' : 'bg-amber-400'}`}></div>

                          <div className="w-full md:w-auto flex-1 pl-4">
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest mb-3 inline-block shadow-sm ${eq.status === 'SOLICITADO' ? 'bg-purple-50 text-purple-700 border border-purple-200' : eq.status === 'PENDIENTE_PAGO' ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              {eq.status.replace('_', ' ')}
                            </span>
                            <h3 className="font-black text-[#0b1437] text-2xl mb-1 group-hover:text-blue-700 transition-colors">{eq.modelo}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">S/N</span>
                              <span className="text-sm text-slate-600 font-mono font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{eq.numero_serie.startsWith('REQ') ? 'Pendiente asignación...' : eq.numero_serie}</span>
                            </div>
                          </div>

                          <div className="w-full md:w-auto shrink-0">
                            {eq.status === 'SOLICITADO' && (
                               <div className="text-left md:text-right bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <p className="text-sm font-black text-slate-700">Validando inventario</p>
                                  <p className="text-xs text-slate-500 mt-1 font-medium">Un ejecutivo revisará tu solicitud.</p>
                               </div>
                            )}
                            {eq.status === 'PENDIENTE_PAGO' && (
                               <button onClick={() => { setSelectedEq(eq); setIsPaymentModalOpen(true); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:-translate-y-0.5">
                                 <CreditCard size={20} /> Realizar Checkout
                               </button>
                            )}
                            {eq.status === 'EN_TRANSITO' && (
                               <button onClick={() => { setSelectedEq(eq); setIsModalOpen(true); }} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-8 rounded-2xl transition-all flex justify-center items-center gap-2 shadow-[0_4px_14px_rgba(245,158,11,0.3)] hover:-translate-y-0.5">
                                 <CheckCircle2 size={20} /> Registrar Llegada Física
                               </button>
                            )}
                          </div>
                        </motion.div>
                    ))}
                    </div>
                  ) : (
                    <div className="bg-white/50 border-2 border-slate-200 border-dashed p-8 rounded-3xl text-center">
                      <p className="text-slate-500 font-bold">No tienes pedidos en curso o pendientes de pago.</p>
                    </div>
                  )}
                </div>

                {/* EQUIPOS INSTALADOS */}
                {instalados.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <ShieldCheck className="text-emerald-500" /> Equipos Instalados y Activos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {instalados.map((eq, index) => (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} key={eq.id} className="bg-white border border-slate-200 hover:border-emerald-200 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                           
                           <div className="flex justify-between items-start mb-4 relative z-10">
                             <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md uppercase tracking-widest inline-block shadow-sm">
                               Garantía Activa
                             </span>
                             <ShieldCheck className="text-emerald-500" size={24} />
                           </div>
                           
                           <h3 className="font-black text-[#0b1437] text-xl mb-1 relative z-10">{eq.modelo}</h3>
                           <div className="flex items-center gap-2 mt-2 mb-6 relative z-10">
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">S/N</span>
                             <span className="text-sm text-slate-600 font-mono font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{eq.numero_serie}</span>
                           </div>
                           
                           {eq.status === 'FALLA_REPORTADA' ? (
                             <div className="mt-auto flex flex-col gap-2 relative z-10 mb-2">
                               <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 flex items-center gap-2 text-xs font-bold">
                                 <AlertTriangle size={16} /> En revisión por Soporte
                               </div>
                             </div>
                           ) : (
                             <div className="mt-auto bg-slate-50 text-slate-500 p-3 rounded-xl border border-slate-100 flex items-center gap-2 text-xs font-bold relative z-10 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors mb-2">
                               <CheckCircle2 size={16} className="text-emerald-500" /> Operando correctamente
                             </div>
                           )}

                           {/* Mostrar el botón del ticket siempre que el equipo tenga un ticket asociado */}
                           {(() => {
                             const eqTickets = ticketsList.filter(t => t.equipo_id === eq.id);
                             if (eqTickets.length > 0) {
                               const eqTicket = eqTickets.sort((a, b) => b.id - a.id)[0]; // Obtener el ticket más reciente
                               return (
                                 <button onClick={() => handleOpenTicket(eqTicket)} className={`w-full bg-white border font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm relative z-10 ${eq.status === 'FALLA_REPORTADA' ? 'border-amber-200 hover:border-amber-400 text-amber-700' : 'border-blue-200 hover:border-blue-400 text-blue-700'}`}>
                                   <MessageSquare size={14} /> Ver Ticket de Soporte
                                 </button>
                               );
                             }
                             return null;
                           })()}
                         </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* TICKETS DE SOPORTE */}
                {ticketsList.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-xl font-bold text-slate-800 mb-6 mt-8 flex items-center gap-2">
                      <Ticket className="text-blue-600" /> Mis Tickets de Soporte
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {ticketsList.map((ticket, index) => {
                        const eqAssociated = equipmentList.find(e => e.id === ticket.equipo_id);
                        return (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} key={ticket.id} className="bg-white border border-slate-200 hover:border-blue-200 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                           <div className="flex justify-between items-start mb-4">
                             <span className={`text-[10px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest inline-block shadow-sm ${ticket.status === 'ABIERTO' ? 'bg-amber-100 text-amber-700' : ticket.status === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                               {ticket.status.replace('_', ' ')}
                             </span>
                             <span className="text-xs font-bold text-slate-400">TKT-{String(ticket.id).padStart(4, '0')}</span>
                           </div>
                           
                           <h3 className="font-black text-[#0b1437] text-lg mb-1 line-clamp-1">{ticket.titulo}</h3>
                           {eqAssociated && (
                             <p className="text-[11px] font-mono font-bold text-slate-500 mb-3 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                               Eq: {eqAssociated.modelo} (S/N: {eqAssociated.numero_serie})
                             </p>
                           )}
                           <p className="text-sm text-slate-500 mb-6 line-clamp-2">{ticket.descripcion}</p>
                           
                           <div className="mt-auto flex flex-col gap-2">
                             <button onClick={() => handleOpenTicket(ticket)} className="w-full bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                               <MessageSquare size={14} /> Ver Detalles y Mensajes
                             </button>
                           </div>
                         </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VISTA: CHATBOT DE SOPORTE */}
        {currentView === 'support' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col min-h-0">
             {!isAuthenticated && (
              <div className="bg-gradient-to-r from-[#050b1a] to-[#0b1437] text-white p-4 sm:p-5 rounded-3xl mb-4 flex justify-between items-center shadow-lg border border-blue-900/30 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 text-blue-400 p-3 rounded-2xl hidden sm:block border border-blue-500/30"><ShieldAlert size={24} /></div>
                  <div>
                    <h3 className="font-black text-lg tracking-wide">Soporte y Consultas Innotrev</h3>
                    <p className="text-sm text-blue-200/80 font-medium">Inicia sesión para vincular tu equipo a un ticket oficial, o chatea como invitado.</p>
                  </div>
                </div>
                <button onClick={() => setShowLoginModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-black shadow-md whitespace-nowrap hover:bg-blue-500 transition-colors">Ingresar</button>
              </div>
            )}
            <div className="flex-1 min-h-0 w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
              <Chatbot 
                mode="cliente" 
                isAuthenticated={isAuthenticated} 
                onAuthRequest={() => setShowLoginModal(true)} 
                messages={chatMessages}
                setMessages={setChatMessages}
                input={chatInput}
                setInput={setChatInput}
                loading={chatLoading}
                setLoading={setChatLoading}
                priority={chatPriority}
                setPriority={setChatPriority}
                showTicketButton={chatShowTicketButton}
                setShowTicketButton={setChatShowTicketButton}
                lastUserIssue={chatLastUserIssue}
                setLastUserIssue={setChatLastUserIssue}
                category={chatCategory}
                setCategory={setChatCategory}
                selectedProduct={selectedProductForChat} 
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* FOOTER CORPORATIVO COMPLETO E INTEGRADO */}
      <footer className="bg-[#050b1a] text-slate-400 py-12 border-t border-white/10 shrink-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            
            {/* Columna 1: Marca y Experiencia */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center font-black text-xs text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]">IN</div>
                <span className="font-black text-xl tracking-widest text-white">INNOTREV</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed pr-4">
                Tenemos 13 años de experiencia en el sector tecnológico de identificación y etiquetado.
              </p>
            </div>

            {/* Columna 2: Productos */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Productos</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> Impresoras de credenciales</li>
                <li className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> Impresoras de etiquetas</li>
                <li className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> Impresoras portátiles</li>
                <li className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> Lectores de códigos de barras</li>
                <li className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> Computadoras móviles</li>
              </ul>
            </div>

            {/* Columna 3: Enlaces */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Enlaces</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Nosotros</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Servicio técnico</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Productos</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Soporte</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Soluciones</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Noticias</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Marcas</span>
                <span className="hover:text-blue-400 cursor-pointer transition-colors">Contáctanos</span>
              </div>
            </div>

            {/* Columna 4: Contacto */}
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Contacto</h4>
              <ul className="space-y-2 text-sm text-slate-500 mb-6">
                <li><span className="text-slate-400 font-semibold">Email:</span> contacto@innotrev.com</li>
                <li><span className="text-slate-400 font-semibold">GDL:</span> 33 2960 8136</li>
                <li><span className="text-slate-400 font-semibold">CDMX:</span> 55 7337 5192</li>
                <li><span className="text-slate-400 font-semibold">MTY:</span> 33 1452 4414</li>
              </ul>
              <div className="text-xs font-bold text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 inline-block shadow-inner">
                💳 Aceptamos pago con tarjetas TDD y TDC
              </div>
            </div>
          </div>

          {/* Fila Inferior: Copyright */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-medium text-sm text-slate-500">© {new Date().getFullYear()} INNOTREV. Todos los derechos reservados.</span>
            <div className="text-sm font-medium">
              Visítanos en: <a href="https://www.innotrev.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">www.innotrev.com</a>
            </div>
          </div>
        </div>
      </footer>

      {/* SE RESTAURARON LAS MODALES DE ACCIÓN */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        
        {/* MODAL DE PAGO (CHECKOUT STRIPE-LIKE) */}
        {isPaymentModalOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#050b1a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                 <h2 className="font-black text-[#0b1437] text-xl flex items-center gap-2"><CreditCard className="text-blue-600" size={22}/> Checkout Seguro</h2>
                 <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full border border-slate-100 shadow-sm transition-colors"><X size={18} /></button>
               </div>
               <form onSubmit={handlePagar} className="p-8 space-y-6">
                 
                 <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full blur-2xl"></div>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-2 relative z-10">Resumen de Compra</p>
                    <p className="text-4xl font-black text-[#0b1437] tracking-tight relative z-10">$2,450.00 <span className="text-sm font-bold text-slate-500 tracking-normal">USD</span></p>
                    <p className="text-sm text-slate-600 mt-3 font-medium relative z-10">{selectedEq?.modelo}</p>
                 </div>

                 <div className="space-y-4">
                   <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Número de Tarjeta</label>
                      <input type="text" required placeholder="4152 0000 0000 0000" className="w-full border border-slate-200 p-4 rounded-xl text-base font-mono outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50 transition-all placeholder:text-slate-300" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Vencimiento</label>
                        <input type="text" required placeholder="MM/YY" className="w-full border border-slate-200 p-4 rounded-xl text-base font-mono outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50 transition-all placeholder:text-slate-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">CVC</label>
                        <input type="password" required placeholder="•••" className="w-full border border-slate-200 p-4 rounded-xl text-base font-mono outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50 transition-all placeholder:text-slate-300" />
                      </div>
                   </div>
                 </div>

                 <button type="submit" disabled={isProcessing} className="w-full bg-[#0b1437] hover:bg-blue-600 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-lg hover:shadow-blue-900/30 hover:-translate-y-0.5 mt-2 flex justify-center items-center gap-2 disabled:opacity-50">
                   {isProcessing ? 'Procesando...' : 'Pagar Ahora'} <ArrowRight size={16} className={isProcessing ? 'hidden' : 'block'}/>
                 </button>
               </form>
             </motion.div>
           </motion.div>
        )}

        {/* MODAL DE RECEPCION FÍSICA (DRAG & DROP) */}
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#050b1a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                 <h2 className="font-black text-xl text-[#0b1437] flex items-center gap-3">
                   <span className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><CheckCircle2 size={20}/></span> 
                   Validar Recepción
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm transition-colors border border-slate-100"><X size={18} /></button>
               </div>
               
               <form onSubmit={handleConfirmarRecepcion} className="p-8 space-y-6">
                 
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Estado Físico del Empaque <span className="text-red-500">*</span></label>
                    <select required value={formRecepcion.estado_empaque} onChange={e => setFormRecepcion({...formRecepcion, estado_empaque: e.target.value})} className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50 transition-all appearance-none cursor-pointer">
                      <option value="Excelente">Excelente (Sin daños)</option>
                      <option value="Abierto">Abierto o Manipulado</option>
                      <option value="Dañado">Dañado / Golpeado</option>
                    </select>
                  </div>
                  
                  {/* Zona de Subida de Archivos Drag & Drop */}
                  <div className="relative group cursor-pointer">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Evidencia Fotográfica <span className="text-red-500">*</span></label>
                    <div className={`flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-2xl transition-all duration-300 ${file ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-400'}`}>
                      <div className="flex flex-col items-center pointer-events-none text-center">
                        {file ? (
                          <>
                            <Camera className="text-emerald-500 mb-3" size={32} />
                            <span className="text-sm font-bold text-emerald-700">{file.name}</span>
                            <span className="text-xs font-medium text-emerald-500 mt-1">Imagen lista para subir</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="text-slate-400 group-hover:text-blue-500 mb-3 transition-colors" size={32} />
                            <span className="text-sm font-bold text-slate-600 group-hover:text-blue-700 transition-colors">Haz clic para seleccionar imagen</span>
                            <span className="text-xs font-medium text-slate-400 mt-1">JPG, PNG o WEBP (Max. 5MB)</span>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" required onChange={e => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  {/* Checkbox Mejorado */}
                  <label className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200 cursor-pointer transition-colors group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" required={formRecepcion.estado_empaque === 'Excelente'} checked={formRecepcion.confirmacion_encendido} onChange={e => setFormRecepcion({...formRecepcion, confirmacion_encendido: e.target.checked})} className="w-6 h-6 border-2 border-slate-300 rounded-lg appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer peer" />
                      <CheckCircle2 size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">Confirmo que el equipo encendió correctamente</span>
                  </label>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Comentarios Adicionales (Opcional)</label>
                    <textarea placeholder="Describe cualquier detalle sobre el empaque o equipo (ej. Faltan cables, caja golpeada)..." value={formRecepcion.notas} onChange={e => setFormRecepcion({...formRecepcion, notas: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none" rows="2"></textarea>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                      <button type="submit" disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-sm font-black shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 flex items-center gap-2">
                        {isProcessing ? 'Validando...' : 'Confirmar Instalación'}
                      </button>
                  </div>
               </form>
             </motion.div>
          </motion.div>
        )}

        {/* MODAL DE TICKET (SOPORTE) */}
        {selectedTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#050b1a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
                 <div>
                   <h2 className="font-black text-[#0b1437] text-xl flex items-center gap-2"><Ticket className="text-blue-600" size={22}/> Detalles de Soporte</h2>
                   <p className="text-xs text-slate-500 mt-1">TKT-{String(selectedTicket.id).padStart(4, '0')} • Estado: {selectedTicket.status}</p>
                 </div>
                 <button onClick={handleCloseTicketModal} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full border border-slate-100 shadow-sm transition-colors"><X size={18} /></button>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 custom-scrollbar space-y-6">
                 <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Reporte Original</h3>
                   <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{selectedTicket.descripcion}</p>
                 </div>
                 
                 <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare size={14} className="text-blue-500" /> Respuestas y Seguimiento</h3>
                   {ticketComments.length > 0 ? (
                     ticketComments.map((comment, idx) => (
                       <div key={idx} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-xs font-bold text-blue-700">{comment.autor?.nombre || comment.autor?.email || 'Soporte Técnico'}</span>
                           <span className="text-[10px] font-bold text-slate-400">{new Date(comment.fecha_creacion).toLocaleString()}</span>
                         </div>
                         <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{comment.contenido}</p>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                       <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                       <p className="text-sm font-medium">Aún no hay respuestas de soporte.</p>
                     </div>
                   )}
                 </div>
                 
                 {/* Caja de nuevo comentario para el cliente */}
                 <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mt-4">
                   <textarea
                     value={newComment}
                     onChange={(e) => setNewComment(e.target.value)}
                     placeholder="Escribe una respuesta o actualización para soporte..."
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                     rows="2"
                     ></textarea>
                   <div className="flex justify-end mt-2">
                     <button 
                       onClick={handleAddComment} 
                       disabled={!newComment.trim() || isProcessingComment} 
                       className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                     >
                       {isProcessingComment ? 'Enviando...' : 'Enviar Respuesta'}
                     </button>
                   </div>
                 </div>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default InnotrevWeb;