import React, { useState, useEffect } from 'react';
import { ArrowRight, Bot, ShieldCheck, Cpu, Smartphone, LogIn, LogOut, UserCircle, PackageOpen, Ticket, Box, Truck, CheckCircle2, X, Image as ImageIcon, UploadCloud, Download, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chatbot from './Chatbot';

const InnotrevWeb = ({ isAuthenticated, userName, onLoginClick, onLogout }) => {
  const [currentView, setCurrentView] = useState('home'); // home, support, recepcion, garantias, tickets
  const [equipmentList, setEquipmentList] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Estados del Formulario de Recepción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [file, setFile] = useState(null);
  const [formRecepcion, setFormRecepcion] = useState({ estado_empaque: 'Excelente', confirmacion_encendido: false, notas: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Licencias
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const resEq = await fetch('http://127.0.0.1:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());
      const resTk = await fetch('http://127.0.0.1:8000/api/v1/tickets/?t=' + Date.now(), { headers });
      if (resTk.ok) setTickets(await resTk.json());
    } catch (error) { console.error("Error cargando datos:", error); }
  };

  const handleConfirmarRecepcion = async (e) => {
    e.preventDefault();
    if (!file) return alert("Falta evidencia fotográfica.");
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('estado_empaque', formRecepcion.estado_empaque);
      formData.append('confirmacion_encendido', formRecepcion.confirmacion_encendido);
      formData.append('notas_recepcion', formRecepcion.notas);

      const res = await fetch(`http://127.0.0.1:8000/api/v1/equipo/${selectedEq.id}/recepcion`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setCurrentView('garantias'); // Lo mandamos a ver sus licencias
      } else { alert("Error al confirmar."); }
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const equiposEnTransito = equipmentList.filter(eq => eq.status === 'EN_TRANSITO');
  const equiposInstalados = equipmentList.filter(eq => eq.status === 'INSTALADO' || eq.status === 'FALLA_REPORTADA');

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* EL SÚPER NAVBAR UNIFICADO */}
      <nav className="bg-[#1a2654] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-bold text-xl">IN</div>
            <span className="font-bold text-2xl tracking-widest hidden sm:block">INNOTREV</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('home')} className={`text-sm font-medium hover:text-blue-400 transition-colors ${currentView === 'home' ? 'text-blue-400' : 'text-slate-300'}`}>Inicio</button>
            <button onClick={() => setCurrentView('support')} className={`text-sm font-medium flex items-center gap-2 hover:text-blue-400 transition-colors ${currentView === 'support' ? 'text-blue-400' : 'text-slate-300'}`}>
              <Bot size={18} /> IA de Soporte
            </button>
            <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block"></div>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {/* MENÚ PRIVADO DEL CLIENTE */}
                <div className="hidden md:flex gap-4">
                  <button onClick={() => setCurrentView('recepcion')} className={`text-sm font-bold flex items-center gap-1 ${currentView === 'recepcion' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}><PackageOpen size={16}/> Recepción {equiposEnTransito.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{equiposEnTransito.length}</span>}</button>
                  <button onClick={() => setCurrentView('garantias')} className={`text-sm font-bold flex items-center gap-1 ${currentView === 'garantias' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}><ShieldCheck size={16}/> Licencias</button>
                  <button onClick={() => setCurrentView('tickets')} className={`text-sm font-bold flex items-center gap-1 ${currentView === 'tickets' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}><Ticket size={16}/> Mis Tickets</button>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 ml-2">
                  <UserCircle className="text-blue-400" size={18} />
                  <span className="text-sm font-bold text-white">{userName}</span>
                </div>
                <button onClick={onLogout} className="text-slate-300 hover:text-red-400 p-2" title="Cerrar Sesión"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={onLoginClick} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md">
                <LogIn size={18} /> Portal Cliente
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col">
        {currentView === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            <div className="bg-gradient-to-b from-[#1a2654] to-slate-900 text-white py-24 px-6 text-center">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl font-black mb-6 leading-tight">Soluciones Tecnológicas Integrales</h1>
                <p className="text-xl text-slate-300 mb-10">Hardware de uso rudo y soporte predictivo potenciado por Inteligencia Artificial.</p>
                <button onClick={() => setCurrentView('support')} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl text-lg font-bold flex items-center gap-3 mx-auto shadow-lg shadow-blue-900/50">
                  Hablar con Asistente IA <ArrowRight size={20} />
                </button>
              </div>
            </div>
            {/* ... Aquí puedes dejar tus tarjetas de características de la página comercial ... */}
          </motion.div>
        )}

        {currentView === 'support' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col h-[calc(100vh-80px)]">
            {!isAuthenticated && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="font-bold text-blue-900">¿Eres cliente de Innotrev?</h3>
                  <p className="text-sm text-blue-700">Para que la IA pueda generar un ticket oficial y asignarle un técnico a tu falla, necesitas iniciar sesión.</p>
                </div>
                <button onClick={onLoginClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap">Iniciar Sesión</button>
              </div>
            )}
            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <Chatbot mode="cliente" isAuthenticated={isAuthenticated} onAuthRequest={onLoginClick} />
            </div>
          </motion.div>
        )}

        {/* --- VISTAS PRIVADAS (Se renderizan igual que en tu antiguo ClientPortal) --- */}
        {isAuthenticated && currentView === 'recepcion' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Equipos Pendientes de Instalación</h2>
            {equiposEnTransito.map(eq => (
               <div key={eq.id} className="bg-white border border-amber-200 p-6 rounded-2xl shadow-sm mb-4 flex justify-between items-center">
                 <div>
                   <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase mb-2 inline-block">En Camino</span>
                   <h3 className="font-bold text-slate-800 text-lg">{eq.modelo}</h3>
                   <p className="text-xs font-mono text-slate-500 mt-1">S/N: {eq.numero_serie}</p>
                 </div>
                 <button onClick={() => { setSelectedEq(eq); setIsModalOpen(true); }} className="bg-amber-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm hover:bg-amber-600">
                   <CheckCircle2 size={18} /> Registrar Recepción
                 </button>
               </div>
            ))}
          </motion.div>
        )}
      </main>

      {/* MODAL DE RECEPCIÓN MEJORADO */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex justify-between bg-slate-50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><PackageOpen size={18}/> Formulario de Recepción</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1 rounded-md"><X size={16} /></button>
              </div>
              <form onSubmit={handleConfirmarRecepcion} className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                  <p className="font-bold text-blue-900 text-sm">Validación: {selectedEq?.modelo}</p>
                  <p className="font-mono text-xs text-blue-600 mt-1">Verifica que el S/N coincida: {selectedEq?.numero_serie}</p>
                </div>
                
                {/* LOS NUEVOS CAMPOS DEL DOCUMENTO */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado Físico del Empaque</label>
                  <select required value={formRecepcion.estado_empaque} onChange={e => setFormRecepcion({...formRecepcion, estado_empaque: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm">
                    <option value="Excelente">Excelente (Sin daños)</option>
                    <option value="Abierto">Abierto o Manipulado</option>
                    <option value="Dañado">Dañado / Golpeado</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <input type="checkbox" id="encendido" checked={formRecepcion.confirmacion_encendido} onChange={e => setFormRecepcion({...formRecepcion, confirmacion_encendido: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"/>
                  <label htmlFor="encendido" className="text-sm font-medium text-slate-700">Confirmación de Encendido: El equipo prende correctamente.</label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evidencia Fotográfica de Instalación</label>
                  <input type="file" accept="image/*" required onChange={e => setFile(e.target.files[0])} className="w-full text-xs" />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button type="submit" disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">Activar Garantía</button>
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