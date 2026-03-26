import React, { useState, useEffect } from 'react';
import { PackageOpen, UserCircle, LogOut, Truck, CheckCircle2, X, UploadCloud, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientPortal = ({ onLogout, userName }) => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [file, setFile] = useState(null);
  const [notas, setNotas] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const resEq = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());
    } catch (error) {
      console.error("Error al cargar datos del portal:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      formData.append('observaciones', notas);
      formData.append('fecha_recepcion', new Date().toISOString());
      formData.append('estado_empaque', 'BUENO');
      formData.append('encendio_correctamente', 'true');

      const res = await fetch(`http://localhost:8000/api/v1/equipo/${selectedEq.id}/reception`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else { alert("❌ Error al confirmar recepción. Verifica que subiste una imagen válida."); }
    } catch (error) { console.error(error); } 
    finally { setIsProcessing(false); }
  };

  const equiposEnTransito = equipmentList.filter(eq => eq.status === 'EN_TRANSITO');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans relative">
      
      {/* HEADER (Se oculta automáticamente en la vista de Admin gracias a tu App.js) */}
      <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center font-black text-white shadow-inner">
            IN
          </div>
          <span className="font-black text-2xl tracking-tight text-[#0b1437] hidden sm:block">Portal Innotrev</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 bg-slate-50 px-5 py-2 rounded-full border border-slate-200 shadow-sm">
            <UserCircle className="text-blue-600" size={20} />
            <span className="text-sm font-bold text-slate-700">{userName}</span>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-all p-2.5 bg-white rounded-full hover:bg-red-50 border border-transparent hover:border-red-100 shadow-sm" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-6xl mx-auto w-full">
        <div className="space-y-8">
          
          <div className="mb-10">
            <h2 className="text-3xl font-black text-[#0b1437]">Equipos en Tránsito</h2>
            <p className="text-slate-500 mt-2 text-lg">Confirma la llegada de tu hardware y activa tu póliza de soporte adjuntando evidencia física.</p>
          </div>
          
          {equiposEnTransito.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {equiposEnTransito.map(eq => (
                <div key={eq.id} className="group bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-xl hover:border-amber-200 transition-all duration-300 flex flex-col relative overflow-hidden hover:-translate-y-1">
                  
                  {/* Fondo decorativo animado */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
                  
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md uppercase tracking-widest mb-3 inline-block shadow-sm">Envío Pendiente</span>
                      <h3 className="font-black text-[#0b1437] text-2xl leading-tight">{eq.modelo}</h3>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 shadow-sm">
                      <Truck size={28} />
                    </div>
                  </div>
                  
                  <div className="relative z-10 mb-8">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Número de Serie</p>
                    <p className="text-sm text-slate-700 font-mono font-bold bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 inline-block">{eq.numero_serie}</p>
                  </div>

                  <button onClick={() => openModal(eq)} className="relative z-10 mt-auto w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 rounded-2xl text-sm transition-all flex justify-center items-center gap-2 shadow-[0_4px_14px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.6)]">
                    <CheckCircle2 size={20} /> Registrar Llegada Física
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-16 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Todo al día</h3>
              <p className="text-slate-500 text-lg max-w-md">No tienes equipos pendientes de recibir en este momento. Tu inventario está actualizado.</p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE RECEPCIÓN */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0b1437]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
              
              {/* Header de la Modal */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <h2 className="font-black text-xl text-[#0b1437] flex items-center gap-3">
                  <span className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><CheckCircle2 size={20}/></span> 
                  Validar Recepción
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm transition-colors border border-slate-100"><X size={18} /></button>
              </div>

              <form onSubmit={handleConfirmarRecepcion} className="p-8 space-y-6">
                
                {/* Resumen del Equipo */}
                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0"><PackageOpen size={24}/></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Equipo a recibir</p>
                    <p className="font-black text-[#0b1437] text-base leading-tight">{selectedEq?.modelo}</p>
                    <p className="font-mono text-xs text-blue-600 font-bold mt-1">S/N: {selectedEq?.numero_serie}</p>
                  </div>
                </div>

                {/* Zona de Subida de Archivos Estilo Drag & Drop */}
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
                    {/* El input real está invisible encima de toda la zona */}
                    <input type="file" accept="image/*" required onChange={e => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Notas Adicionales <span className="text-slate-300 font-normal">(Opcional)</span></label>
                  <textarea 
                    placeholder="Ej. La caja llegó ligeramente golpeada de una esquina, pero el equipo está intacto..." 
                    className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none bg-slate-50 resize-none h-24 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all placeholder:text-slate-400" 
                    value={notas} 
                    onChange={e => setNotas(e.target.value)}
                  ></textarea>
                </div>

                {/* Botones de Acción */}
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-sm font-black shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      {isProcessing ? 'Procesando...' : 'Confirmar Recepción'}
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

export default ClientPortal;