import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Key, Plus, AlertTriangle, Download, X, Search, CalendarClock, Box, Lock, Fingerprint, HardDrive, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [isAlertsMinimized, setIsAlertsMinimized] = useState(false);
  
  const [form, setForm] = useState({ tipo: 'GARANTIA_HW', nombre_software: '', licencia_key: '', fecha_inicio: '', fecha_vencimiento: '', file: null });

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
      formData.append('equipo_id', selectedEquipment.id);
      formData.append('tipo', form.tipo);
      formData.append('nombre_software', form.nombre_software);
      if (form.licencia_key) formData.append('licencia_key', form.licencia_key);
      formData.append('fecha_inicio', form.fecha_inicio);
      formData.append('fecha_vencimiento', form.fecha_vencimiento);
      if (form.file) formData.append('file', form.file);

      const token = localStorage.getItem('token');
      const fetchHeaders = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch('http://localhost:8000/api/v1/licencias/', { method: 'POST', headers: fetchHeaders, body: formData });
      if (res.ok) {
        setIsModalOpen(false); setForm({ tipo: 'GARANTIA_HW', nombre_software: '', licencia_key: '', fecha_inicio: '', fecha_vencimiento: '', file: null });
        const resLic = await fetch(`http://localhost:8000/api/v1/licencias/equipo/${selectedEquipment.id}`, { headers: getAuthHeaders() });
        if (resLic.ok) setEquipmentLicenses(await resLic.json());
        fetchData();
      } else { 
        const errorData = await res.json().catch(() => null);
        console.error("Detalle del Error:", errorData);
        alert(`Error al registrar: ${errorData ? JSON.stringify(errorData.detail) : 'Revisa la consola'}`); 
      }
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
    <div className="absolute inset-0 p-6 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-[#0b1437] flex items-center gap-3">
            <Lock className="text-blue-600" size={32} /> Bóveda de Licencias
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Gestión centralizada de licencias de software, llaves de activación y certificados de garantía.</p>
        </div>
      </div>

      {/* ALERTAS DE VENCIMIENTO */}
      {expiringLicenses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
          <div className="bg-red-100 text-red-600 p-4 rounded-2xl shrink-0 relative z-10">
            <AlertTriangle size={28} className="animate-pulse" />
          </div>
          <div className="w-full relative z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-red-900 font-black text-sm uppercase tracking-widest">Atención Requerida: Renovaciones Próximas ({expiringLicenses.length})</h3>
              <button onClick={() => setIsAlertsMinimized(!isAlertsMinimized)} className="text-red-500 hover:text-red-700 bg-red-100/50 hover:bg-red-200 p-1.5 rounded-lg transition-colors shrink-0">
                {isAlertsMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {!isAlertsMinimized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {expiringLicenses.map(lic => (
                    <div key={lic.id} className="bg-white border border-red-100 p-4 rounded-2xl flex flex-col justify-between shadow-sm min-w-[250px] shrink-0 hover:shadow-md transition-all hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-black text-[#0b1437] truncate">{lic.nombre_software}</p>
                        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-black">EQ. #{lic.equipo_id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
                        <CalendarClock size={14} className="text-red-600"/>
                        <p className="text-xs text-red-700 font-black tracking-wider">VENCE: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ÁREA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* PANEL IZQUIERDO: DIRECTORIO */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden lg:col-span-4 xl:col-span-3">
          <div className="p-6 border-b border-slate-50 bg-[#0b1437] text-white relative overflow-hidden shrink-0">
            <div className="absolute -right-4 -top-4 opacity-10"><HardDrive size={100} /></div>
            <h2 className="font-bold text-sm tracking-widest uppercase mb-5 relative z-10">Directorio de Hardware</h2>
            <div className="relative z-10 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
              <input type="text" placeholder="Buscar S/N o Modelo..." className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm focus:bg-white focus:text-[#0b1437] outline-none transition-all font-medium placeholder:text-blue-300 shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 custom-scrollbar">
            {filteredEquipments.map(eq => {
              const isSelected = selectedEquipment?.id === eq.id;
              return (
                <div key={eq.id} onClick={() => setSelectedEquipment(eq)} className={`relative p-4 rounded-2xl cursor-pointer transition-all mb-3 border flex flex-col gap-2 ${isSelected ? 'bg-blue-50 border-blue-200 shadow-md shadow-blue-900/5 translate-x-1' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                  {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-blue-600 rounded-r-full"></div>}
                  <div className="flex justify-between items-start pl-2">
                    <p className={`text-sm font-black font-mono tracking-widest ${isSelected ? 'text-blue-700' : 'text-[#0b1437]'}`}>{eq.numero_serie}</p>
                    <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-wider ${isSelected ? 'bg-blue-200/50 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>CLI: {eq.cliente_id}</span>
                  </div>
                  <p className={`text-[11px] font-bold pl-2 truncate ${isSelected ? 'text-blue-600/80' : 'text-slate-400'}`}>{eq.modelo}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: BÓVEDA DEL EQUIPO */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden lg:col-span-8 xl:col-span-9 relative">
          {selectedEquipment ? (
            <>
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-white relative z-10 shrink-0">
                <div className="mb-4 md:mb-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Fingerprint size={12}/> Identidad del Equipo</span>
                  <h2 className="font-black text-3xl text-[#0b1437]">{selectedEquipment.modelo}</h2>
                  <p className="text-sm text-blue-600 font-mono font-black tracking-widest mt-1 bg-blue-50 px-3 py-1 rounded-lg inline-block">S/N: {selectedEquipment.numero_serie}</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-[#0b1437] hover:bg-blue-800 text-white px-6 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-0.5">
                  <Plus size={18} /> Agregar a Bóveda
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                {equipmentLicenses.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {equipmentLicenses.map(lic => {
                      const isSoftware = lic.tipo === 'SOFTWARE';
                      return (
                        <div key={lic.id} className={`bg-white border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden ${isSoftware ? 'border-purple-100' : 'border-emerald-100'}`}>
                          <div className={`absolute top-0 left-0 w-full h-1.5 ${isSoftware ? 'bg-gradient-to-r from-purple-400 to-indigo-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}></div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase mb-3 inline-block ${isSoftware ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                {lic.tipo}
                              </span>
                              <h3 className="font-black text-[#0b1437] text-xl">{lic.nombre_software}</h3>
                            </div>
                            <div className={`p-3 rounded-2xl shadow-sm ${isSoftware ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {isSoftware ? <Key size={24} /> : <ShieldCheck size={24} />}
                            </div>
                          </div>

                          <div className="bg-[#050b1a] rounded-2xl p-4 mb-6 shadow-inner border border-slate-800 relative group-hover:border-slate-700 transition-colors">
                            <span className="absolute -top-2.5 left-4 bg-[#050b1a] px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Serial Key</span>
                            <p className="font-mono text-sm md:text-base text-emerald-400 text-center tracking-widest break-all font-bold mt-1">
                              {lic.licencia_key || 'DOCUMENTO FÍSICO ADJUNTO'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</p>
                              <span className="text-sm text-[#0b1437] flex items-center gap-2 font-bold">
                                <CalendarClock size={16} className={isSoftware ? 'text-purple-500' : 'text-emerald-500'}/> 
                                {new Date(lic.fecha_vencimiento).toLocaleDateString()}
                              </span>
                            </div>
                            <button onClick={() => handleDownload(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 border border-blue-100">
                              <Download size={16} /> Certificado
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 space-y-4">
                    <div className="bg-white p-8 rounded-full shadow-sm border border-slate-100 mb-2">
                      <Lock size={64} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-[#0b1437]">Bóveda Vacía</h3>
                    <p className="text-sm font-medium">No hay licencias ni garantías registradas para este equipo.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 space-y-6 bg-slate-50/50">
              <Box size={80} className="opacity-20" />
              <p className="text-lg font-medium bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100 text-slate-500">Selecciona un equipo del directorio lateral.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Licencia Premium */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {isModalOpen && (
          <motion.div key="modal-licencias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#050b1a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="bg-[#0b1437] p-3 rounded-2xl shadow-lg text-white"><Lock size={24}/></div>
                  <div>
                    <h2 className="font-black text-[#0b1437] text-2xl mb-1">Nueva Licencia</h2>
                    <p className="text-xs font-bold text-slate-500">Asegura un nuevo registro en la bóveda.</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleCreateLicense} className="p-8 space-y-6">
                <div className="flex p-1.5 bg-slate-100 rounded-2xl relative mb-4">
                  <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200/50 transition-transform duration-300 ease-out ${form.tipo === 'GARANTIA_HW' ? 'translate-x-full' : 'translate-x-0'}`}></div>
                  <button type="button" onClick={() => setForm({...form, tipo: 'SOFTWARE'})} className={`flex-1 py-3 text-xs uppercase tracking-widest font-black z-10 transition-colors flex items-center justify-center gap-2 ${form.tipo === 'SOFTWARE' ? 'text-purple-700' : 'text-slate-400'}`}><Key size={14}/> Software</button>
                  <button type="button" onClick={() => setForm({...form, tipo: 'GARANTIA_HW'})} className={`flex-1 py-3 text-xs uppercase tracking-widest font-black z-10 transition-colors flex items-center justify-center gap-2 ${form.tipo === 'GARANTIA_HW' ? 'text-emerald-700' : 'text-slate-400'}`}><ShieldCheck size={14}/> Física</button>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre o Descripción</label>
                  <input required type="text" placeholder="Ej. Licencia MDM SOTI / Póliza Extendida" className="w-full border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all font-bold text-[#0b1437]" value={form.nombre_software} onChange={e => setForm({...form, nombre_software: e.target.value})} />
                </div>

                {form.tipo === 'SOFTWARE' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Serial / Activation Key</label>
                    <input type="text" placeholder="XXXX-XXXX-XXXX-XXXX" className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-mono font-black outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 bg-purple-50/30 transition-all uppercase text-purple-700" value={form.licencia_key} onChange={e => setForm({...form, licencia_key: e.target.value})} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CalendarClock size={12}/> Activación</label>
                    <input required type="date" className="w-full border border-slate-200 p-4 rounded-2xl text-sm text-[#0b1437] outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all font-bold" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CalendarClock size={12}/> Vencimiento</label>
                    <input required type="date" className="w-full border border-slate-200 p-4 rounded-2xl text-sm text-[#0b1437] outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 transition-all font-bold" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Certificado o Póliza (PDF)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                    <input type="file" accept=".pdf,image/*" required onChange={e => setForm({...form, file: e.target.files[0]})} className="w-full text-xs font-medium text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#0b1437] file:text-white hover:file:bg-blue-800 cursor-pointer transition-colors" />
                  </div>
                </div>

                <div className="pt-6">
                    <button type="submit" disabled={isProcessing} className="w-full bg-[#0b1437] hover:bg-blue-800 text-white py-4 rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-900/20 hover:-translate-y-0.5 hover:shadow-blue-900/30 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                      {isProcessing ? 'Encriptando...' : <><Lock size={18}/> Guardar en Bóveda</>}
                    </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default Licencias;