import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Plus, AlertTriangle, Download, X, Search, CalendarClock, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../services/api';

const Licencias = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipmentLicenses, setEquipmentLicenses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [form, setForm] = useState({ tipo: 'SOFTWARE', nombre_software: '', licencia_key: '', fecha_inicio: '', fecha_vencimiento: '', file: null });

  const fetchData = async () => {
    const headers = getAuthHeaders();
    try {
      const resEq = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());

      const resExp = await fetch('http://localhost:8000/api/v1/licencias/dashboard/expiring?days=30&t=' + Date.now(), { headers });
      if (resExp.ok) setExpiringLicenses(await resExp.json());
      else if (resExp.status === 401) console.error("Token inválido para licencias expirando");
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedEquipment) return;
    const fetchLicenses = async () => {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:8000/api/v1/licencias/equipo/${selectedEquipment.id}`, { headers });
      if (res.ok) setEquipmentLicenses(await res.json());
    };
    fetchLicenses();
  }, [selectedEquipment]);

  const filteredEquipments = equipmentList.filter(eq => eq.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) || eq.modelo.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return alert("Selecciona un equipo.");
    if (!form.nombre_software) return alert("Ingresa el nombre del software.");
    if (!form.licencia_key && !form.file) return alert("Proporciona una clave de producto o un archivo PDF.");
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('equipment_id', selectedEquipment.id);
      formData.append('tipo_licencia', form.tipo);
      formData.append('nombre_software', form.nombre_software);
      if (form.licencia_key) formData.append('clave_producto', form.licencia_key);
      formData.append('fecha_inicio', form.fecha_inicio);
      if (form.fecha_vencimiento) formData.append('fecha_vencimiento', form.fecha_vencimiento);
      if (form.file) formData.append('file', form.file);

      const headers = getAuthHeaders();
      const res = await fetch('http://localhost:8000/api/v1/licencias/', { method: 'POST', headers, body: formData });
      if (res.ok) {
        setIsModalOpen(false); setForm({ tipo: 'SOFTWARE', nombre_software: '', licencia_key: '', fecha_inicio: '', fecha_vencimiento: '', file: null });
        const resLic = await fetch(`http://localhost:8000/api/v1/licencias/equipo/${selectedEquipment.id}`, { headers });
        if (resLic.ok) setEquipmentLicenses(await resLic.json());
        fetchData();
      } else { alert("Error al registrar."); }
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const handleDownload = async (licenseId, nombre) => {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`http://localhost:8000/api/v1/licencias/descargar/${licenseId}`, { headers });
        if (!response.ok) throw new Error("No hay archivo");
        const blob = await response.blob();
        const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `Doc_${nombre.replace(/\s+/g, '_')}.pdf`; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("Error de descarga."); }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-black text-[#0b1437]">Bóveda de Licencias</h1>
        <p className="text-slate-500 mt-1 font-medium">Gestión centralizada de licencias de software, llaves de activación y certificados de garantía.</p>
      </div>

      {expiringLicenses.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-3xl flex items-start gap-5 shadow-sm">
          <div className="bg-amber-100 text-amber-600 p-4 rounded-2xl shrink-0"><AlertTriangle size={28} /></div>
          <div className="w-full">
            <h3 className="text-amber-900 font-black text-sm uppercase tracking-widest mb-3">Renovaciones Próximas ({expiringLicenses.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {expiringLicenses.map(lic => (
                <div key={lic.id} className="bg-white border border-amber-100 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="text-xs font-bold text-[#0b1437]">{lic.nombre_software}</p>
                    <p className="text-[10px] text-amber-700 font-black tracking-wider mt-1">VENCE: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-black">EQ. #{lic.equipo_id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-[650px]">
        {/* PANEL IZQUIERDO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden col-span-1">
          <div className="p-6 border-b border-slate-50 bg-[#0b1437] text-white">
            <h2 className="font-bold text-sm tracking-wide mb-4">Directorio de Hardware</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar S/N o Modelo..." className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-sm focus:bg-white focus:text-[#0b1437] outline-none transition-all font-medium placeholder:text-blue-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-50/50">
            {filteredEquipments.map(eq => (
              <div key={eq.id} onClick={() => setSelectedEquipment(eq)} className={`p-4 rounded-2xl cursor-pointer transition-all border mb-3 ${selectedEquipment?.id === eq.id ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30 scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className={`text-sm font-black font-mono tracking-widest ${selectedEquipment?.id === eq.id ? 'text-white' : 'text-[#0b1437]'}`}>{eq.numero_serie}</p>
                  <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-wider ${selectedEquipment?.id === eq.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>CLI: {eq.cliente_id}</span>
                </div>
                <p className={`text-[11px] font-medium truncate ${selectedEquipment?.id === eq.id ? 'text-blue-100' : 'text-slate-500'}`}>{eq.modelo}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden col-span-2">
          {selectedEquipment ? (
            <>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                <div>
                  <h2 className="font-black text-2xl text-[#0b1437]">{selectedEquipment.modelo}</h2>
                  <p className="text-sm text-blue-600 font-mono font-black tracking-widest mt-1">S/N: {selectedEquipment.numero_serie}</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-[#0b1437] hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 hover:scale-105">
                  <Plus size={18} /> Agregar Licencia
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                {equipmentLicenses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {equipmentLicenses.map(lic => (
                      <div key={lic.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest uppercase ${lic.tipo === 'SOFTWARE' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {lic.tipo}
                          </span>
                          <ShieldCheck size={20} className={lic.tipo === 'SOFTWARE' ? 'text-purple-400' : 'text-emerald-400'} />
                        </div>
                        <h3 className="font-black text-[#0b1437] text-lg mb-2">{lic.nombre_software}</h3>
                        <p className="font-mono text-sm text-slate-500 bg-slate-50 p-3 rounded-xl inline-block w-full mb-6 break-all font-medium border border-slate-100">
                          Key: {lic.licencia_key || 'Física'}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <CalendarClock size={14}/> {new Date(lic.fecha_vencimiento).toLocaleDateString()}
                          </span>
                          <button onClick={() => handleDownload(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl transition-colors shadow-sm" title="Descargar Certificado">
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                    <Key size={64} className="opacity-20" />
                    <p className="text-lg font-medium">Bóveda vacía para este equipo.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 bg-slate-50/50">
              <Box size={80} className="opacity-20" />
              <p className="text-lg font-medium">Selecciona un equipo del directorio lateral.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Licencia Premium */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0b1437]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-black text-[#0b1437] text-xl flex items-center gap-2"><Key className="text-blue-600" size={22}/> Nueva Licencia</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateLicense} className="p-8 space-y-5">
                <div className="flex p-1 bg-slate-100 rounded-xl relative mb-2">
                  <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out ${form.tipo === 'GARANTIA' ? 'translate-x-full' : 'translate-x-0'}`}></div>
                  <button type="button" onClick={() => setForm({...form, tipo: 'SOFTWARE'})} className={`flex-1 py-3 text-xs uppercase tracking-widest font-black z-10 transition-colors ${form.tipo === 'SOFTWARE' ? 'text-blue-700' : 'text-slate-400'}`}>Software</button>
                  <button type="button" onClick={() => setForm({...form, tipo: 'GARANTIA'})} className={`flex-1 py-3 text-xs uppercase tracking-widest font-black z-10 transition-colors ${form.tipo === 'GARANTIA' ? 'text-blue-700' : 'text-slate-400'}`}>Física</button>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                  <input required type="text" placeholder="Ej. Licencia MDM SOTI" className="w-full border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all font-medium text-[#0b1437]" value={form.nombre_software} onChange={e => setForm({...form, nombre_software: e.target.value})} />
                </div>
                {form.tipo === 'SOFTWARE' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Serial / Key</label>
                    <input type="text" placeholder="XXXX-XXXX-XXXX-XXXX" className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-mono font-bold outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all uppercase text-blue-600" value={form.licencia_key} onChange={e => setForm({...form, licencia_key: e.target.value})} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activación</label>
                    <input required type="date" className="w-full border border-slate-200 p-4 rounded-2xl text-sm text-[#0b1437] outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all font-bold" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimiento</label>
                    <input required type="date" className="w-full border border-slate-200 p-4 rounded-2xl text-sm text-[#0b1437] outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all font-bold" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Certificado PDF</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 hover:bg-blue-50 transition-colors">
                    <input type="file" accept=".pdf,image/*" required onChange={e => setForm({...form, file: e.target.files[0]})} className="w-full text-xs font-medium text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#0b1437] file:text-white hover:file:bg-blue-800 cursor-pointer" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isProcessing} className="w-full bg-[#0b1437] hover:bg-blue-800 text-white py-4 rounded-2xl text-sm font-black transition-all shadow-lg disabled:opacity-50">
                      {isProcessing ? 'Encriptando...' : 'Guardar en Bóveda'}
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

export default Licencias;