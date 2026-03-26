import React, { useState, useEffect } from 'react';
import { ArrowRight, Bot, ShieldCheck, Cpu, Smartphone, LogIn, LogOut, UserCircle, PackageOpen, Ticket, Box, Truck, CheckCircle2, X, Store, CreditCard, AlertTriangle, ShieldAlert, UploadCloud, Camera, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chatbot from './Chatbot';
import Login from './Login';

const INNOTREV_CATALOG = ["Handheld Zebra TC22 / TC27", "Handheld Honeywell EDA52", "Impresora de Etiquetas Ribetec RT-420ME", "Impresora Industrial Zebra ZT411", "Impresora de Credenciales Zebra ZC300", "Tableta Industrial Uso Rudo IP67", "Lector RFID Zebra MC33"];

// Variantes de animación para las tarjetas (Efecto Cascada)
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const InnotrevWeb = ({ isAuthenticated, userName, onLoginSuccess, onLogout }) => {
  const [currentView, setCurrentView] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  
  // Estados del Chatbot (Memoria)
  const [chatMessages, setChatMessages] = useState([{ role: 'bot', text: 'Hola. Soy el agente de IA de Innotrev. Estoy aquí para resolver problemas con tus equipos Zebra, Honeywell o infraestructura RFID. ¿En qué te ayudo?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPriority, setChatPriority] = useState(null);
  const [chatShowTicketButton, setChatShowTicketButton] = useState(false);
  const [chatLastUserIssue, setChatLastUserIssue] = useState('');
  const [chatCategory, setChatCategory] = useState('General / Otro');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [file, setFile] = useState(null);
  const [formRecepcion, setFormRecepcion] = useState({ estado_empaque: 'Excelente', confirmacion_encendido: false, notas: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const resEq = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (resEq.ok) setEquipmentList(await resEq.json());
    } catch (error) { console.error(error); }
  };

  const handleSolicitar = async (modelo) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      let userId = 2; 
      try {
        const payloadDecoded = JSON.parse(atob(token.split('.')[1]));
        userId = parseInt(payloadDecoded.id || payloadDecoded.sub) || 2;
      } catch (e) { console.warn("No se pudo leer el ID del token"); }

      const snTemporal = 'REQ-' + Math.random().toString(36).substr(2, 7).toUpperCase();

      const payload = {
          modelo: modelo,
          numero_serie: snTemporal,
          cliente_id: userId,
          status: "SOLICITADO"
      };

      const res = await fetch('http://localhost:8000/api/v1/equipo/', {
        method: 'POST', 
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) { 
          alert(`Solicitud de ${modelo} enviada a Innotrev.`); 
          fetchData(); 
          setCurrentView('recepcion'); 
      } else {
          alert("Hubo un error al procesar la solicitud.");
      }
    } catch (error) { 
        console.error(error); 
    } finally { 
        setIsProcessing(false); 
    }
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

  const pedidos = equipmentList.filter(eq => ['SOLICITADO', 'PENDIENTE_PAGO', 'EN_TRANSITO'].includes(eq.status));

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
            <button onClick={() => {if(isAuthenticated) setCurrentView('tienda'); else setShowLoginModal(true);}} className={`text-sm font-bold px-3 py-2 rounded-lg transition-all ${currentView === 'tienda' ? 'text-blue-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>Catálogo</button>
            <button onClick={() => setCurrentView('support')} className={`text-sm font-bold px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${currentView === 'support' ? 'text-blue-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <Bot size={18} className={currentView === 'support' ? 'animate-pulse text-blue-400' : 'text-emerald-400'} /> <span className="hidden sm:inline">Soporte IA</span>
            </button>
            <div className="w-px h-6 bg-white/20 mx-1 hidden md:block"></div>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden md:flex">
                  <button onClick={() => setCurrentView('recepcion')} className={`text-xs uppercase tracking-widest font-black px-4 py-2.5 rounded-xl transition-all shadow-sm ${currentView === 'recepcion' ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                    Mis Pedidos {pedidos.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1.5 shadow-sm">{pedidos.length}</span>}
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

      <AnimatePresence>
        {showLoginModal && !isAuthenticated && <Login onLoginSuccess={(t, r, n) => { setShowLoginModal(false); onLoginSuccess(t, r, n); }} onClose={() => setShowLoginModal(false)} />}
      </AnimatePresence>

      <main className={`flex-1 flex flex-col relative z-10 ${currentView === 'support' ? 'h-[calc(100dvh-80px)] max-h-[calc(100dvh-80px)] overflow-hidden' : 'overflow-y-auto'}`}>
        
        {/* VISTA HOME PREMIUM */}
        {currentView === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            <div className="bg-[#050b1a] text-white py-32 px-6 text-center relative overflow-hidden flex-1 flex items-center justify-center min-h-[600px]">
              {/* Efectos de luz de fondo */}
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
                  Adquiere equipo industrial RFID y obtén soporte predictivo con inteligencia artificial en segundos.
                </motion.p>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={() => {if(isAuthenticated) setCurrentView('tienda'); else setShowLoginModal(true);}} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-lg font-black flex items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-1">
                    Ver Catálogo Comercial <ArrowRight size={20} />
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TIENDA E-COMMERCE CON EFECTO CASCADA */}
        {isAuthenticated && currentView === 'tienda' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 md:p-12 max-w-7xl mx-auto w-full">
             <div className="mb-12 text-center max-w-2xl mx-auto">
               <h2 className="text-4xl font-black text-[#0b1437] mb-4">Catálogo Empresarial</h2>
               <p className="text-slate-500 text-lg">Hardware de Uso Rudo con póliza de soporte IA incluida y asistencia técnica 24/7.</p>
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
                    <button onClick={() => handleSolicitar(item)} disabled={isProcessing} className="mt-auto w-full bg-slate-50 hover:bg-[#0b1437] text-slate-600 hover:text-white font-black py-4 rounded-xl text-sm transition-all duration-300 hover:shadow-lg disabled:opacity-50">
                      Solicitar Cotización
                    </button>
                 </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* VISTA: MIS PEDIDOS (REDESIGN) */}
        {isAuthenticated && currentView === 'recepcion' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 md:p-12 max-w-5xl mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-[#0b1437]">Mis Pedidos en Curso</h2>
              <p className="text-slate-500 mt-2 text-lg">Sigue el estado de tus compras, realiza el pago y confirma la llegada física.</p>
            </div>
            {pedidos.length > 0 ? (
               <div className="space-y-6">
               {pedidos.map((eq, index) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} key={eq.id} className="bg-white border border-slate-200 hover:border-slate-300 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                    
                    {/* Borde izquierdo de color para indicar estado */}
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
              <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center flex flex-col items-center">
                 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <PackageOpen size={40} className="text-slate-400" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 mb-2">Bandeja Vacía</h3>
                 <p className="text-slate-500 text-lg max-w-md">Visita el catálogo comercial para solicitar y adquirir nuevo hardware.</p>
                 <button onClick={() => setCurrentView('tienda')} className="mt-8 bg-white border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 font-bold px-6 py-3 rounded-xl transition-all">Ir al Catálogo</button>
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
                    <h3 className="font-black text-lg tracking-wide">Soporte Innotrev AI</h3>
                    <p className="text-sm text-blue-200/80 font-medium">Inicia sesión para vincular tu equipo y generar un ticket oficial, o chatea como invitado.</p>
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
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* MODALES DE ACCIÓN */}
      <AnimatePresence>
        
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
                 
                 {/* Select Elegante */}
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
                      <input type="checkbox" required checked={formRecepcion.confirmacion_encendido} onChange={e => setFormRecepcion({...formRecepcion, confirmacion_encendido: e.target.checked})} className="w-6 h-6 border-2 border-slate-300 rounded-lg appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer peer" />
                      <CheckCircle2 size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">Confirmo que el equipo encendió correctamente</span>
                  </label>

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
      </AnimatePresence>
    </div>
  );
};

export default InnotrevWeb;