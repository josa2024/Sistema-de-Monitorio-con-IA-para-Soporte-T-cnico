import React, { useState, useEffect } from 'react';
import { ArrowRight, Bot, ShieldCheck, Cpu, Smartphone, LogIn, LogOut, UserCircle, PackageOpen, Ticket, Box, Truck, CheckCircle2, X, Download, MessageSquare, Key, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chatbot from './Chatbot';
import Login from './Login'; // Importamos el nuevo Modal de Login

const InnotrevWeb = ({ isAuthenticated, userName, onLoginSuccess, onLogout }) => {
  const [currentView, setCurrentView] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false); // Estado para abrir el Modal
  const [equipmentList, setEquipmentList] = useState([]);
  const [tickets, setTickets] = useState([]);
  
  // Estados Recepción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [file, setFile] = useState(null);
  const [formRecepcion, setFormRecepcion] = useState({ estado_empaque: 'Excelente', confirmacion_encendido: false, notas: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados Licencias
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);

  useEffect(() => {
    if (isAuthenticated) { fetchData(); }
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
        setCurrentView('garantias'); 
      } else { alert("Error al confirmar."); }
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const verLicencias = async (eq) => {
    setSelectedEqLicencias(eq);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/v1/licencias/equipo/${eq.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setLicenciasCliente(await res.json());
    } catch (e) { console.error(e); } 
  };

  const handleDownloadCertificado = async (licenseId, nombre) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://127.0.0.1:8000/api/v1/licencias/descargar/${licenseId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error("No hay archivo");
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = downloadUrl; a.download = `${nombre}.pdf`; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("❌ Error al descargar."); }
  };

  const equiposEnTransito = equipmentList.filter(eq => eq.status === 'EN_TRANSITO');
  const equiposInstalados = equipmentList.filter(eq => eq.status === 'INSTALADO' || eq.status === 'FALLA_REPORTADA');

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col relative">
      
      {/* EL SÚPER NAVBAR UNIFICADO - ESTILO INNOTREV */}
      <nav className="bg-[#0b1437] text-white sticky top-0 z-40 shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center font-bold text-xl shadow-inner group-hover:scale-105 transition-transform">IN</div>
            <span className="font-black text-2xl tracking-widest hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">INNOTREV</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('home')} className={`text-sm font-semibold hover:text-blue-400 transition-colors ${currentView === 'home' ? 'text-blue-400' : 'text-slate-300'}`}>Inicio</button>
            <button onClick={() => setCurrentView('support')} className={`text-sm font-semibold flex items-center gap-2 hover:text-blue-400 transition-colors ${currentView === 'support' ? 'text-blue-400' : 'text-slate-300'}`}>
              <Bot size={18} className={currentView === 'support' ? 'animate-pulse' : ''} /> Soporte Inteligente
            </button>
            <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block"></div>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-2">
                  <button onClick={() => setCurrentView('recepcion')} className={`text-xs uppercase tracking-wider font-bold px-3 py-2 rounded-lg transition-all ${currentView === 'recepcion' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>Recepción {equiposEnTransito.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{equiposEnTransito.length}</span>}</button>
                  <button onClick={() => setCurrentView('garantias')} className={`text-xs uppercase tracking-wider font-bold px-3 py-2 rounded-lg transition-all ${currentView === 'garantias' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>Garantías y Licencias</button>
                  <button onClick={() => setCurrentView('tickets')} className={`text-xs uppercase tracking-wider font-bold px-3 py-2 rounded-lg transition-all ${currentView === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>Mis Tickets</button>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 ml-2">
                  <UserCircle className="text-emerald-400" size={20} />
                  <span className="text-sm font-bold text-white pr-2">{userName}</span>
                </div>
                <button onClick={onLogout} className="text-slate-400 hover:text-red-400 p-2 transition-colors"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:scale-105">
                <LogIn size={18} /> Mi Portal
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* RENDERIZADO DEL MODAL DE LOGIN */}
      <AnimatePresence>
        {showLoginModal && !isAuthenticated && (
          <Login onLoginSuccess={(t, r, n) => { setShowLoginModal(false); onLoginSuccess(t, r, n); }} onClose={() => setShowLoginModal(false)} />
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col">
        {currentView === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            {/* HERO SECTION MEJORADO */}
            <div className="bg-[#0b1437] text-white py-32 px-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full opacity-30 pointer-events-none">
                 <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[80px]"></div>
                 <div className="absolute top-40 right-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[100px]"></div>
              </div>
              <div className="max-w-4xl mx-auto relative z-10">
                <span className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-4 block">Hardware • Software • Soporte</span>
                <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight">Soluciones Tecnológicas para Operaciones Críticas</h1>
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light">Optimiza tu cadena de suministro con terminales de uso rudo y obtén soporte predictivo potenciado por Inteligencia Artificial en segundos.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={() => setCurrentView('support')} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-1">
                    Probar Diagnóstico IA <ArrowRight size={20} />
                  </button>
                  <a href="https://www.innotrev.com" target="_blank" rel="noreferrer" className="px-8 py-4 rounded-full text-lg font-bold text-white border border-white/20 hover:bg-white/10 transition-colors">Conocer Catálogo RFID</a>
                </div>
              </div>
            </div>

            {/* CARACTERÍSTICAS */}
            <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { icon: <Smartphone size={32}/>, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Equipos Uso Rudo', desc: 'Despliegue de Handhelds Zebra y terminales Honeywell IP67.' },
                { icon: <ShieldCheck size={32}/>, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Protección Integral', desc: 'Gestión transparente de licencias de software y pólizas de garantía.' },
                { icon: <Bot size={32}/>, color: 'text-purple-600', bg: 'bg-purple-50', title: 'IA de Soporte Nivel 0', desc: 'Resolución de anomalías técnicas al instante sin esperar a un humano.' }
              ].map((f, i) => (
                <div key={i} className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center hover:shadow-xl transition-shadow group">
                  <div className={`w-20 h-20 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>{f.icon}</div>
                  <h3 className="text-xl font-black text-[#0b1437] mb-3">{f.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ... (La vista de Support y Chatbot se queda igual por ahora, la puliremos en el próximo paso) ... */}
        {currentView === 'support' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col h-[calc(100vh-80px)]">
             {!isAuthenticated && (
              <div className="bg-[#0b1437] text-white p-5 rounded-2xl mb-6 flex justify-between items-center shadow-lg border border-blue-900/50">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl hidden sm:block"><ShieldAlert size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">¿Tienes una falla en tu equipo Innotrev?</h3>
                    <p className="text-sm text-blue-200">Inicia sesión para que la IA asigne el ticket directamente a tu cuenta y nuestro equipo técnico lo atienda.</p>
                  </div>
                </div>
                <button onClick={() => setShowLoginModal(true)} className="bg-white text-[#0b1437] px-6 py-3 rounded-xl text-sm font-black shadow-sm whitespace-nowrap hover:bg-blue-50 transition-colors">Iniciar Sesión</button>
              </div>
            )}
            <div className="flex-1 min-h-0 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
              <Chatbot mode="cliente" isAuthenticated={isAuthenticated} onAuthRequest={() => setShowLoginModal(true)} />
            </div>
          </motion.div>
        )}

        {/* --- VISTAS PRIVADAS DEL CLIENTE CON DISEÑO PREMIUM --- */}
        {isAuthenticated && currentView === 'recepcion' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-[#0b1437]">Equipos en Tránsito</h2>
              <p className="text-slate-500 mt-2 text-lg">Confirma la llegada física de tus equipos para activar la póliza de garantía.</p>
            </div>
            {equiposEnTransito.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {equiposEnTransito.map(eq => (
                  <div key={eq.id} className="bg-white border-2 border-amber-200 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-3 py-1.5 rounded-md uppercase tracking-widest mb-4 inline-block">Envío Pendiente</span>
                        <h3 className="font-black text-[#0b1437] text-2xl">{eq.modelo}</h3>
                      </div>
                      <Truck className="text-amber-500" size={32} />
                    </div>
                    <p className="text-sm text-slate-500 font-mono mb-8 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block w-max">S/N: {eq.numero_serie}</p>
                    <button onClick={() => { setSelectedEq(eq); setIsModalOpen(true); }} className="mt-auto w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl text-sm transition-colors flex justify-center items-center gap-2 shadow-[0_4px_14px_rgba(245,158,11,0.4)]">
                      <CheckCircle2 size={20} /> Validar Recepción de Hardware
                    </button>
                  </div>
               ))}
               </div>
            ) : (
              <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-200 text-center">
                 <CheckCircle2 size={64} className="mx-auto mb-6 text-emerald-400 opacity-60" />
                 <h3 className="text-2xl font-black text-slate-700 mb-2">Bandeja al día</h3>
                 <p className="text-slate-500 text-lg">No tienes equipos de Innotrev pendientes de recibir.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* SEPARACIÓN CLARA DE GARANTÍAS Y LICENCIAS */}
        {isAuthenticated && currentView === 'garantias' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-6xl mx-auto w-full">
            <div className="mb-10">
               <h2 className="text-3xl font-black text-[#0b1437]">Mis Garantías y Licencias</h2>
               <p className="text-slate-500 mt-2 text-lg">Centro de control de tus pólizas de protección física y software.</p>
            </div>
            
            {equiposInstalados.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {equiposInstalados.map(eq => (
                  <div key={eq.id} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Box size={28} /></div>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md uppercase tracking-wider">Activo</span>
                    </div>
                    <h3 className="font-black text-[#0b1437] text-xl mb-2">{eq.modelo}</h3>
                    <p className="text-xs text-slate-500 font-mono mb-8 bg-slate-50 p-2 rounded-lg inline-block w-max">S/N: {eq.numero_serie}</p>

                    <button onClick={() => verLicencias(eq)} className="mt-auto w-full bg-[#0b1437] hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors flex justify-center items-center gap-2">
                      <ShieldCheck size={18} /> Ver Pólizas y Claves
                    </button>
                  </div>
                ))}
              </div>
            ) : (
               <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center">
                 <ShieldCheck size={64} className="mx-auto mb-4 opacity-20 text-slate-400" />
                 <h3 className="text-xl font-bold text-slate-700">Sin equipos registrados</h3>
               </div>
            )}
          </motion.div>
        )}

        {/* TABLA DE TICKETS PREMIUM */}
        {isAuthenticated && currentView === 'tickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-6xl mx-auto w-full">
            <div className="mb-10">
               <h2 className="text-3xl font-black text-[#0b1437]">Historial de Soporte</h2>
               <p className="text-slate-500 mt-2 text-lg">Seguimiento en tiempo real de los reportes escalados por la IA.</p>
            </div>
            {tickets.length > 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-wider">
                    <tr><th className="px-8 py-5"># TKT</th><th className="px-8 py-5">Falla Reportada</th><th className="px-8 py-5">Categoría IA</th><th className="px-8 py-5">Estado</th><th className="px-8 py-5">Fecha</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map(t => (
                      <tr key={t.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-8 py-5 font-mono font-black text-[#0b1437]">TKT-{t.id.toString().padStart(4, '0')}</td>
                        <td className="px-8 py-5 text-slate-600 font-medium max-w-xs truncate">{t.descripcion}</td>
                        <td className="px-8 py-5">
                          <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max">
                            <Cpu size={14} /> {t.categoria_ia || 'Diagnóstico IA'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max ${t.status === 'ABIERTO' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {t.status === 'ABIERTO' ? 'Pendiente' : 'Atendido'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-slate-500 font-medium text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-200 text-center">
                 <Ticket size={64} className="mx-auto mb-6 opacity-30 text-blue-500" />
                 <h3 className="text-2xl font-black text-slate-700 mb-2">No hay reportes de falla</h3>
                 <p className="text-slate-500 text-lg">Si tu equipo presenta anomalías, interactúa con el Chatbot para abrir un ticket.</p>
              </div>
            )}
          </motion.div>
        )}
      </main>

       {/* MODALES MANTENIDOS IGUAL DE FUNCIONALES PERO CON DISEÑO MEJORADO */}
      <AnimatePresence>
        {/* ... Modal Recepción ... */}
        {isModalOpen && (
          <motion.div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
               <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50">
                 <h2 className="font-black text-[#0b1437] text-xl">Activar Garantía</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-full"><X size={18} /></button>
               </div>
               <form onSubmit={handleConfirmarRecepcion} className="p-8 space-y-5">
                  {/* ... Mismos campos de recepción, solo cambia el padding ... */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado Físico del Empaque</label>
                    <select required value={formRecepcion.estado_empaque} onChange={e => setFormRecepcion({...formRecepcion, estado_empaque: e.target.value})} className="w-full border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Excelente">Excelente (Sin daños)</option>
                      <option value="Abierto">Abierto o Manipulado</option>
                      <option value="Dañado">Dañado / Golpeado</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <input type="checkbox" id="encendido" checked={formRecepcion.confirmacion_encendido} onChange={e => setFormRecepcion({...formRecepcion, confirmacion_encendido: e.target.checked})} className="w-5 h-5 accent-blue-600 rounded cursor-pointer"/>
                    <label htmlFor="encendido" className="text-sm font-bold text-slate-700 cursor-pointer">Confirmación de Encendido</label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evidencia Fotográfica (Requerido)</label>
                    <input type="file" accept="image/*" required onChange={e => setFile(e.target.files[0])} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                      <button type="submit" disabled={isProcessing} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl text-sm font-black transition-all">Confirmar Instalación</button>
                  </div>
               </form>
             </motion.div>
          </motion.div>
        )}

        {/* ... Modal Visor de Licencias ... */}
        {selectedEqLicencias && (
          <motion.div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#0b1437] text-white">
                  <div>
                    <h2 className="font-black text-xl flex items-center gap-2"><ShieldCheck className="text-emerald-400" size={24}/> Bóveda de Licencias</h2>
                    <p className="text-sm text-blue-200 mt-1">{selectedEqLicencias.modelo}</p>
                  </div>
                  <button onClick={() => setSelectedEqLicencias(null)} className="text-white/50 hover:text-white bg-white/10 p-2 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
                   {licenciasCliente.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {licenciasCliente.map(lic => (
                          <div key={lic.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                             <div className="flex justify-between items-start mb-4">
                               <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest uppercase ${lic.tipo === 'SOFTWARE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                 {lic.tipo === 'SOFTWARE' ? <Key size={12} className="inline mr-1"/> : <ShieldCheck size={12} className="inline mr-1"/>} {lic.tipo}
                               </span>
                             </div>
                             <h3 className="font-black text-slate-800 text-lg mb-2">{lic.nombre_software}</h3>
                             <p className="font-mono text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg block mb-6 break-all">
                               {lic.licencia_key || 'Soporte Físico'}
                             </p>
                             <button onClick={() => handleDownloadCertificado(lic.id, lic.nombre_software)} className="w-full text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white py-3 rounded-xl transition-colors text-sm font-black flex justify-center items-center gap-2">
                               <Download size={18} /> Descargar Certificado
                             </button>
                          </div>
                        ))}
                      </div>
                   ) : (
                     <div className="text-center py-16 text-slate-400">
                       <Box size={64} className="mx-auto mb-4 opacity-20" />
                       <p className="text-lg font-medium">Aún no hay pólizas emitidas para este equipo.</p>
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

export default InnotrevWeb;