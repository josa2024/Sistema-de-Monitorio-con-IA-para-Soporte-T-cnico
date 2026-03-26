import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClienteGarantias = () => {
  const [equiposInstalados, setEquiposInstalados] = useState([]);
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);
  const [isLoadingLicencias, setIsLoadingLicencias] = useState(false);

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEquiposInstalados(data.filter(eq => eq.status === 'INSTALADO' || eq.status === 'FALLA_REPORTADA'));
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchEquipos();
  }, []);

  const verLicencias = async (eq) => {
    setSelectedEqLicencias(eq);
    setIsLoadingLicencias(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/v1/licencias/equipo/${eq.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLicenciasCliente(await res.json());
    } catch (e) { console.error(e); } 
    finally { setIsLoadingLicencias(false); }
  };

  const handleDownloadCertificado = async (licenseId, nombre) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/v1/licencias/descargar/${licenseId}`, {
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full py-8">
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

      {/* MODAL: VISUALIZADOR DE LICENCIAS */}
      <AnimatePresence>
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
                        <p className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block mb-4 break-all">
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

export default ClienteGarantias;