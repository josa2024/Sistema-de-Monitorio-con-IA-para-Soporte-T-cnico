import React, { useState, useEffect } from 'react';
import { PackageOpen, UserCircle, LogOut, Truck, CheckCircle2, X } from 'lucide-react';
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

      <main className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full">
        <div className="space-y-8">
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
      </main>

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
      </AnimatePresence>
    </div>
  );
};

export default ClientPortal;