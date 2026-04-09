import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Download, X, Clock, AlertTriangle } from 'lucide-react'; // Cambiamos AlertCircle por AlertTriangle
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../services/api';

const Garantias = () => {
  const [equiposInstalados, setEquiposInstalados] = useState([]);
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);
  const [isLoadingLicencias, setIsLoadingLicencias] = useState(false);

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const data = await apiClient('/equipo/');
        setEquiposInstalados(data.filter(eq => eq.status === 'INSTALADO' || eq.status === 'FALLA_REPORTADA'));
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
      const data = await apiClient(`/licencias/equipo/${eq.id}`);
      setLicenciasCliente(data);
    } catch (e) { 
      console.error(e); 
      setLicenciasCliente([]); 
    } 
    finally { 
      setIsLoadingLicencias(false); 
    }
  };

  const handleDownloadCertificado = async (licenseId, nombre) => {
    try {
        const blob = await apiClient(`/licencias/descargar/${licenseId}`, { responseType: 'blob' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Certificado_${nombre.replace(/\s+/g, '_')}.pdf`; 
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (e) { 
      alert("❌ El archivo no existe o hubo un error al descargarlo."); 
    }
  };

  // Función segura para calcular y mostrar el tiempo restante de la garantía
  const obtenerBadgeVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    
    // Si la fecha es inválida por alguna razón en la base de datos
    if (isNaN(vencimiento.getTime())) return null;

    const diffTiempo = vencimiento - hoy;
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-md bg-red-50 text-red-600 uppercase tracking-wider w-max border border-red-100">
          <AlertTriangle size={12}/> Vencida
        </span>
      );
    } else if (diffDias <= 30) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 uppercase tracking-wider w-max border border-amber-100">
          <Clock size={12}/> Faltan {diffDias} días
        </span>
      );
    } else if (diffDias <= 365) {
      const meses = Math.floor(diffDias / 30);
      return (
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 uppercase tracking-wider w-max border border-emerald-100">
          <ShieldCheck size={12}/> Faltan {meses} {meses === 1 ? 'mes' : 'meses'}
        </span>
      );
    } else {
      const agnos = Math.floor(diffDias / 365);
      return (
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 uppercase tracking-wider w-max border border-emerald-100">
          <ShieldCheck size={12}/> Falta {agnos} {agnos === 1 ? 'año' : 'años'}
        </span>
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full py-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Garantías</h2>
        <p className="text-slate-500 mt-1">Visualiza los datos de los equipos activos y sus coberturas.</p>
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
                Ver Coberturas
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
          <ShieldCheck size={56} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">Sin equipos activos</h3>
          <p className="text-sm">Primero se deben registrar la recepción de los equipos para ver sus garantías.</p>
        </div>
      )}

      {/* MODAL: VISUALIZADOR DE LICENCIAS/GARANTÍAS */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {selectedEqLicencias && (
          <motion.div key="modal-garantias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#0b1437]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedEqLicencias(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600" size={18}/> Protecciones del Equipo</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedEqLicencias.modelo} (S/N: {selectedEqLicencias.numero_serie})</p>
                </div>
                <button onClick={() => setSelectedEqLicencias(null)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-md shadow-sm border border-slate-200 transition-colors"><X size={16} /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                {isLoadingLicencias ? (
                   <div className="text-center py-10 text-slate-500">Cargando coberturas...</div>
                ) : licenciasCliente.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {licenciasCliente.map(lic => (
                      <div key={lic.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md tracking-wider ${lic.tipo === 'SOFTWARE' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            {lic.tipo}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-800 text-sm mb-1">{lic.nombre_software || "Garantía Extendida"}</h3>
                        <p className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-100 inline-block mb-4 break-all">
                          Key: {lic.licencia_key || 'N/A'}
                        </p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              Vence: {new Date(lic.fecha_vencimiento).toLocaleDateString()}
                            </span>
                            {/* Aquí se inyecta el nuevo badge dinámico */}
                            {obtenerBadgeVencimiento(lic.fecha_vencimiento)}
                          </div>

                          <button onClick={() => handleDownloadCertificado(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm border border-blue-100 hover:border-blue-600">
                            <Download size={14} /> PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aún no hay pólizas o garantías registradas para este equipo.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default Garantias;