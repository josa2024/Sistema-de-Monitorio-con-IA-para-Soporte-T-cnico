import React, { useState, useEffect } from 'react';
import { PackageOpen, ShieldCheck, Ticket, UserCircle, LogOut, Box, Truck, CheckCircle2, X, Image as ImageIcon, UploadCloud, Download, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientPortal = ({ onLogout, userName }) => {
  const [activeTab, setActiveTab] = useState('recepcion');
  const [equipmentList, setEquipmentList] = useState([]);
  
  // Estados para Recepción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [file, setFile] = useState(null);
  const [notas, setNotas] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para Licencias
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);
  const [isLoadingLicencias, setIsLoadingLicencias] = useState(false);

  // NUEVO: Estado para Tickets
  const [tickets, setTickets] = useState([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Traer equipos
      const resEq = await fetch('http://127.0.0.1:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());

      // 2. NUEVO: Traer tickets del cliente
      const resTk = await fetch('http://127.0.0.1:8000/api/v1/tickets/?t=' + Date.now(), { headers });
      if (resTk.ok) setTickets(await resTk.json());

    } catch (error) {
      console.error("Error al cargar datos del portal:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- LÓGICA DE RECEPCIÓN ---
  const openModal = (eq) => {
    setSelectedEq(eq);
    setFile(null);
    setNotas('');
    setIsModalOpen(true);
  };

  const handleConfirmarRecepcion = async (e) => {
    e.preventDefault();
    if (!file) return alert("Por favor, adjunta una fotografía como evidencia.");
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notas_recepcion', notas);

      const res = await fetch(`http://127.0.0.1:8000/api/v1/equipo/${selectedEq.id}/recepcion`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData(); // Recargamos todo
      } else { alert("❌ Error al confirmar recepción."); }
    } catch (error) { console.error(error); } 
    finally { setIsProcessing(false); }
  };

  // --- LÓGICA DE LICENCIAS ---
  const verLicencias = async (eq) => {
    setSelectedEqLicencias(eq);
    setIsLoadingLicencias(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/v1/licencias/equipo/${eq.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLicenciasCliente(await res.json());
    } catch (e) { console.error(e); } 
    finally { setIsLoadingLicencias(false); }
  };

  const handleDownloadCertificado = async (licenseId, nombre) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://127.0.0.1:8000/api/v1/licencias/descargar/${licenseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("No hay archivo");
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Certificado_${nombre.replace(/\s+/g, '_')}.pdf`; 
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) { alert("❌ El archivo no existe o hubo un error al descargarlo."); }
  };

  const equiposEnTransito = equipmentList.filter(eq => eq.status === 'EN_TRANSITO');
  const equiposInstalados = equipmentList.filter(eq => eq.status === 'INSTALADO' || eq.status === 'FALLA_REPORTADA');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">IN</div>
          <span className="font-bold text-xl tracking-tight text-slate-800 hidden sm:block">Portal Innotrev</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200">
            <UserCircle className="text-blue-600" size={18} />
            <span className="text-sm font-bold text-slate-700">{userName}</span>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-full hover:bg-red-50" title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 hidden md:flex z-10 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
          <nav className="space-y-2 px-4">
            <button onClick={() => setActiveTab('recepcion')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'recepcion' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
              <div className="flex items-center gap-3"><PackageOpen size={18} /> Recepción</div>
              {equiposEnTransito.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{equiposEnTransito.length}</span>}
            </button>
            <button onClick={() => setActiveTab('garantias')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'garantias' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
              <ShieldCheck size={18} /> Mis Licencias
            </button>
            <button onClick={() => setActiveTab('tickets')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'tickets' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
              <Ticket size={18} /> Historial Tickets
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={activeTab}>
            
            {activeTab === 'recepcion' && (
              <div className="max-w-5xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Equipos en Tránsito</h2>
                  <p className="text-slate-500 mt-1">Confirma la llegada de tus equipos y activa tus garantías adjuntando evidencia física.</p>
                </div>
                
                {equiposEnTransito.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {equiposEnTransito.map(eq => (
                      <div key={eq.id} className="bg-white border border-amber-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200 uppercase tracking-wider mb-2 inline-block">Envío Pendiente</span>
                            <h3 className="font-bold text-slate-800 text-lg">{eq.modelo}</h3>
                          </div>
                          <Truck className="text-amber-500" size={28} />
                        </div>
                        <p className="text-xs text-slate-500 font-mono mb-6 bg-slate-50 p-2 rounded border border-slate-100 inline-block w-max">S/N: {eq.numero_serie}</p>
                        <button onClick={() => openModal(eq)} className="mt-auto w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition-colors flex justify-center items-center gap-2 shadow-lg shadow-amber-200">
                          <CheckCircle2 size={18} /> Registrar Recepción de Hardware
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
                    <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-400 opacity-60" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Todo al día</h3>
                    <p className="text-sm">No tienes equipos pendientes de recibir en este momento.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'garantias' && (
              <div className="max-w-5xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Mis Licencias y Garantías</h2>
                  <p className="text-slate-500 mt-1">Visualiza y descarga los certificados de software y pólizas de hardware de tus equipos activos.</p>
                </div>

                {equiposInstalados.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {equiposInstalados.map(eq => (
                      <div key={eq.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><ShieldCheck size={24} /></div>
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200 uppercase tracking-wider">Activo</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{eq.modelo}</h3>
                        <p className="text-xs text-slate-500 font-mono mb-6 bg-slate-50 p-2 rounded border border-slate-100 inline-block w-max">S/N: {eq.numero_serie}</p>

                        <button onClick={() => verLicencias(eq)} className="mt-auto w-full bg-slate-50 hover:bg-blue-50 text-blue-600 font-bold py-3 rounded-xl text-sm transition-colors flex justify-center items-center gap-2 border border-slate-200 hover:border-blue-200">
                          Ver Certificados
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
                    <ShieldCheck size={56} className="mx-auto mb-4 opacity-40" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Sin equipos activos</h3>
                    <p className="text-sm">Primero debes registrar la recepción de tus equipos para ver sus garantías.</p>
                  </div>
                )}
              </div>
            )}

            {/* --- NUEVA PESTAÑA: HISTORIAL DE TICKETS --- */}
            {activeTab === 'tickets' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Historial de Soporte</h2>
                    <p className="text-slate-500 mt-1">Consulta el estado de los reportes generados por nuestro asistente IA.</p>
                  </div>
                </div>

                {tickets.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                        <tr>
                          <th className="px-6 py-4">Ticket</th>
                          <th className="px-6 py-4">Falla Reportada</th>
                          <th className="px-6 py-4">Clasificación IA</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tickets.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-blue-600">#{t.id}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium max-w-xs truncate" title={t.descripcion}>{t.descripcion}</td>
                            <td className="px-6 py-4">
                              <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-purple-100 flex items-center gap-1 w-max">
                                <MessageSquare size={12} /> {t.categoria_ia || 'Diagnóstico IA'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 w-max ${
                                t.status === 'ABIERTO' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                t.status === 'EN_PROGRESO' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                'bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {new Date(t.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
                    <Ticket size={56} className="mx-auto mb-4 opacity-40 text-blue-400" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Sin reportes activos</h3>
                    <p className="text-sm">Tus solicitudes de soporte aparecerán aquí una vez que interactúes con la IA.</p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </main>
      </div>

      {/* MODAL: REGISTRAR RECEPCIÓN */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18}/> Validar Recepción</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-md shadow-sm"><X size={16} /></button>
              </div>
              <form onSubmit={handleConfirmarRecepcion} className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <p className="text-xs text-blue-800 mb-1">Equipo a recibir:</p>
                  <p className="font-bold text-blue-900 text-sm">{selectedEq?.modelo}</p>
                  <p className="font-mono text-xs text-blue-600 mt-1">S/N: {selectedEq?.numero_serie}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evidencia Fotográfica</label>
                  <input type="file" accept="image/*" required onChange={e => setFile(e.target.files[0])} className="w-full text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notas Adicionales (Opcional)</label>
                  <textarea placeholder="¿Llegó en buenas condiciones?" className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none bg-slate-50 resize-none h-20" value={notas} onChange={e => setNotas(e.target.value)}></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button type="submit" disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50">Confirmar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL: VISUALIZADOR DE LICENCIAS */}
        {selectedEqLicencias && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600" size={18}/> Protecciones del Equipo</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedEqLicencias.modelo} (S/N: {selectedEqLicencias.numero_serie})</p>
                </div>
                <button onClick={() => setSelectedEqLicencias(null)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-md shadow-sm"><X size={16} /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                {isLoadingLicencias ? (
                   <div className="text-center py-10 text-slate-500">Cargando certificados...</div>
                ) : licenciasCliente.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {licenciasCliente.map(lic => (
                      <div key={lic.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md tracking-wider ${lic.tipo === 'SOFTWARE' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {lic.tipo}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-1">{lic.nombre_software}</h3>
                        <p className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mb-4">
                          Key: {lic.licencia_key || 'N/A'}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                          <span className="text-[10px] text-slate-500 font-medium">Vence: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</span>
                          <button onClick={() => handleDownloadCertificado(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm">
                            <Download size={14} /> PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aún no hay pólizas o licencias registradas para este equipo.</p>
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

export default ClientPortal;