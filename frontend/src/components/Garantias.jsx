import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Plus, AlertTriangle, FileText, Download, X, Search, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Garantias = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipmentLicenses, setEquipmentLicenses] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [form, setForm] = useState({
    tipo: 'SOFTWARE',
    nombre_software: '',
    licencia_key: '',
    fecha_inicio: '',
    fecha_vencimiento: '',
    file: null
  });

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    try {
      // 1. Traer todos los equipos despachados
      const resEq = await fetch('http://127.0.0.1:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());

      // 2. Traer licencias a punto de vencer (30 días)
      const resExp = await fetch('http://127.0.0.1:8000/api/v1/licencias/dashboard/expiring?days=30&t=' + Date.now(), { headers });
      if (resExp.ok) setExpiringLicenses(await resExp.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Buscar licencias cuando se selecciona un equipo
  useEffect(() => {
    if (!selectedEquipment) return;
    const fetchLicenses = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/api/v1/licencias/equipo/${selectedEquipment.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setEquipmentLicenses(await res.json());
    };
    fetchLicenses();
  }, [selectedEquipment]);

  const filteredEquipments = equipmentList.filter(eq => 
    eq.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) || 
    eq.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) return alert("Selecciona un equipo primero");
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      // Al enviar archivos, usamos FormData (no JSON)
      const formData = new FormData();
      formData.append('equipo_id', selectedEquipment.id);
      formData.append('tipo', form.tipo);
      formData.append('nombre_software', form.nombre_software);
      if (form.licencia_key) formData.append('licencia_key', form.licencia_key);
      formData.append('fecha_inicio', form.fecha_inicio);
      formData.append('fecha_vencimiento', form.fecha_vencimiento);
      if (form.file) formData.append('file', form.file);

      const res = await fetch('http://127.0.0.1:8000/api/v1/licencias/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // IMPORTANTE: Sin Content-Type para que el navegador ponga el boundary
        body: formData
      });

      if (res.ok) {
        setIsModalOpen(false);
        setForm({ tipo: 'SOFTWARE', nombre_software: '', licencia_key: '', fecha_inicio: '', fecha_vencimiento: '', file: null });
        // Refrescar licencias del equipo actual
        const resLic = await fetch(`http://127.0.0.1:8000/api/v1/licencias/equipo/${selectedEquipment.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (resLic.ok) setEquipmentLicenses(await resLic.json());
        fetchData(); // Refrescar vencimientos
      } else {
        alert("Error al registrar la licencia o póliza.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (licenseId, nombre) => {
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
        a.download = `Doc_${nombre.replace(/\s+/g, '_')}.pdf`; 
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) {
        alert("❌ El archivo no existe o hubo un error al descargarlo.");
    }
  };

  return (
    <div className="space-y-6 pb-10 h-full overflow-y-auto pr-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Garantías y Licencias</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de software, llaves de activación y pólizas de hardware.</p>
        </div>
      </div>

      {/* Alerta de Vencimientos */}
      {expiringLicenses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4">
          <div className="bg-amber-100 text-amber-600 p-3 rounded-full shrink-0"><AlertTriangle size={24} /></div>
          <div className="w-full">
            <h3 className="text-amber-800 font-bold text-sm mb-2">¡Atención! Hay licencias o pólizas próximas a vencer ({expiringLicenses.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {expiringLicenses.map(lic => (
                <div key={lic.id} className="bg-white/60 border border-amber-100 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{lic.nombre_software}</p>
                    <p className="text-[10px] text-amber-700 font-medium">Vence: {new Date(lic.fecha_vencimiento).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-1 rounded shadow-sm text-slate-500 font-bold">Eq. #{lic.equipo_id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* PANEL IZQUIERDO: Buscador de Equipos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden col-span-1">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Directorio de Equipos</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Buscar S/N o Modelo..." 
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-100 outline-none"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredEquipments.map(eq => (
              <div 
                key={eq.id} 
                onClick={() => setSelectedEquipment(eq)}
                className={`p-3 rounded-xl cursor-pointer transition-all border mb-2 ${selectedEquipment?.id === eq.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-xs font-bold ${selectedEquipment?.id === eq.id ? 'text-blue-700' : 'text-slate-700'}`}>{eq.numero_serie}</p>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">ID: {eq.cliente_id}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{eq.modelo}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: Detalles y Licencias */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden col-span-2">
          {selectedEquipment ? (
            <>
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="font-bold text-lg text-slate-800">{selectedEquipment.modelo}</h2>
                  <p className="text-xs text-blue-600 font-mono font-bold tracking-widest mt-0.5">S/N: {selectedEquipment.numero_serie}</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-shadow shadow-sm">
                  <Plus size={16} /> Añadir Póliza / Licencia
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {equipmentLicenses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipmentLicenses.map(lic => (
                      <div key={lic.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md tracking-wider ${lic.tipo === 'SOFTWARE' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {lic.tipo}
                          </span>
                          <ShieldCheck size={18} className={lic.tipo === 'SOFTWARE' ? 'text-purple-400' : 'text-emerald-400'} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-1">{lic.nombre_software}</h3>
                        <p className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mb-4">
                          {lic.licencia_key || 'N/A'}
                        </p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <CalendarClock size={12}/> Vence: {new Date(lic.fecha_vencimiento).toLocaleDateString()}
                          </span>
                          <button onClick={() => handleDownload(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition-colors tooltip" title="Descargar Certificado">
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                    <Key size={48} className="opacity-20" />
                    <p className="text-sm font-medium">Este equipo no tiene licencias ni pólizas asignadas.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <ShieldCheck size={64} className="opacity-20" />
              <p className="text-sm font-medium">Selecciona un equipo del directorio para ver sus garantías.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Crear Licencia */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><Key className="text-blue-600" size={18}/> Registrar Nueva Protección</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-md shadow-sm"><X size={16} /></button>
              </div>
              <form onSubmit={handleCreateLicense} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Protección</label>
                    <select required className="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                      <option value="SOFTWARE">Licencia de Software</option>
                      <option value="PÓLIZA_HARDWARE">Póliza de Hardware</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre / Descripción</label>
                    <input required type="text" placeholder="Ej. Windows 11 Pro" className="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white" value={form.nombre_software} onChange={e => setForm({...form, nombre_software: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clave de Activación (Opcional)</label>
                  <input type="text" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white" value={form.licencia_key} onChange={e => setForm({...form, licencia_key: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha Inicio</label>
                    <input required type="date" className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha Vencimiento</label>
                    <input required type="date" className="w-full border border-slate-200 p-2.5 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Certificado (PDF / Imagen)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                      {isProcessing ? 'Guardando...' : 'Confirmar Registro'}
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

export default Garantias;