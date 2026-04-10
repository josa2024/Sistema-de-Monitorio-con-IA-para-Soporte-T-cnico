import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Download, X, Clock, AlertTriangle, User, Calendar, Tag, Factory, Image as ImageIcon, Search, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../services/api';

const Garantias = () => {
  const [equiposInstalados, setEquiposInstalados] = useState([]);
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingLicencias, setIsLoadingLicencias] = useState(false);

  // Validar rol actual
  const userRole = localStorage.getItem('userRole');
  const canModify = userRole === 'ADMIN' || userRole === 'VENTAS';

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

  // --- NUEVAS FUNCIONES PARA ADMIN Y VENTAS ---
  const handleUpdateDate = async (id, currentDate) => {
    const defaultDate = currentDate ? currentDate.split('T')[0] : '';
    const newDate = window.prompt("Ingresa la nueva fecha de vencimiento (YYYY-MM-DD):", defaultDate);
    if (!newDate || newDate === defaultDate) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/licencias/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ fecha_vencimiento: newDate })
      });
      if(!res.ok) throw new Error("Error al actualizar");
      alert("✅ Fecha actualizada correctamente");
      verLicencias(selectedEqLicencias); // Recargar
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  const handleDeleteLicense = async (id) => {
    if(!window.confirm("⚠️ ¿Estás COMPLETAMENTE seguro de eliminar este expediente? Esta acción es irreversible.")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/licencias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(!res.ok) throw new Error("Error al eliminar");
      alert("✅ Expediente eliminado");
      verLicencias(selectedEqLicencias); // Recargar
    } catch (e) {
      alert("❌ " + e.message);
    }
  };

  const obtenerBadgeVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    if (isNaN(vencimiento.getTime())) return null;

    const diffTiempo = vencimiento - hoy;
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return <span className="text-xs font-black px-3 py-1 rounded-md bg-red-100 text-red-600 flex items-center gap-1"><AlertTriangle size={14}/> Vencida</span>;
    if (diffDias <= 30) return <span className="text-xs font-black px-3 py-1 rounded-md bg-amber-100 text-amber-600 flex items-center gap-1"><Clock size={14}/> Faltan {diffDias} días</span>;
    
    const meses = Math.floor(diffDias / 30);
    return <span className="text-xs font-black px-3 py-1 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1"><ShieldCheck size={14}/> Activa ({meses} meses)</span>;
  };

  const filteredEquipos = equiposInstalados.filter(eq => 
    eq.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) || 
    eq.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0b1437]">Expedientes de Garantía</h2>
          <p className="text-slate-500 mt-2 text-lg">Consulta el estado, coberturas y evidencias de tu hardware instalado.</p>
        </div>
        
        {equiposInstalados.length > 0 && (
          <div className="relative w-full md:w-96 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por S/N o modelo..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {equiposInstalados.length === 0 ? (
        <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center text-slate-400">
          <ShieldCheck size={56} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-xl font-black text-slate-700 mb-2">Sin equipos activos</h3>
          <p className="text-base text-slate-500">Primero se debe registrar la recepción de los equipos para generar su expediente.</p>
        </div>
      ) : filteredEquipos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipos.map(eq => (
            <div key={eq.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-md"><ShieldCheck size={24} /></div>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 uppercase tracking-widest">Protegido</span>
              </div>
              <h3 className="font-black text-[#0b1437] text-xl mb-1">{eq.modelo}</h3>
              <p className="text-xs text-slate-500 font-mono mb-6 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block w-max font-bold">S/N: {eq.numero_serie}</p>

              <button onClick={() => verLicencias(eq)} className="mt-auto w-full bg-slate-50 hover:bg-blue-600 text-blue-600 hover:text-white font-black py-3.5 rounded-xl text-sm transition-all flex justify-center items-center gap-2 border border-slate-200 hover:border-transparent hover:shadow-lg">
                Abrir Expediente Completo
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center text-slate-400">
          <Search size={56} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-xl font-black text-slate-700 mb-2">No se encontraron resultados</h3>
          <p className="text-base text-slate-500">No hay ningún equipo activo que coincida con "{searchTerm}".</p>
        </div>
      )}

      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {selectedEqLicencias && (
          <motion.div key="modal-expediente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#050b1a]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedEqLicencias(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative overflow-hidden shrink-0">
                <div className="absolute -right-10 -top-10 text-blue-50 opacity-50 pointer-events-none"><ShieldCheck size={150} /></div>
                <div className="relative z-10">
                  <span className="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-md uppercase tracking-widest mb-3 inline-block">Expediente Oficial</span>
                  <h2 className="text-2xl md:text-3xl font-black text-[#0b1437] mb-1">{selectedEqLicencias.modelo}</h2>
                  <p className="text-sm text-slate-500 font-mono font-bold">Número de Serie: {selectedEqLicencias.numero_serie}</p>
                </div>
                <button onClick={() => setSelectedEqLicencias(null)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors relative z-10"><X size={20} /></button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white custom-scrollbar">
                {isLoadingLicencias ? (
                   <div className="text-center py-20 text-slate-500 font-bold animate-pulse">Cargando datos del expediente...</div>
                ) : licenciasCliente.length > 0 ? (
                  <div className="space-y-8">
                    {licenciasCliente.map(lic => (
                      <div key={lic.id} className="border-2 border-slate-100 rounded-3xl p-6 relative overflow-hidden">
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Folio / ID de Garantía</p>
                            <p className="text-xl font-black text-blue-700 font-mono">{lic.folio || "GAR-PENDIENTE"}</p>
                          </div>
                          <div className="flex flex-col md:items-end gap-2">
                            {obtenerBadgeVencimiento(lic.fecha_vencimiento)}
                            <div className="flex gap-2">
                              {/* BOTONES ADMINISTRATIVOS */}
                              {canModify && (
                                <>
                                  <button onClick={() => handleUpdateDate(lic.id, lic.fecha_vencimiento)} className="text-slate-600 bg-slate-50 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors text-xs font-black flex items-center gap-2 shadow-sm border border-slate-200" title="Editar Vencimiento">
                                    <Edit3 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteLicense(lic.id)} className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-2 rounded-xl transition-colors text-xs font-black flex items-center gap-2 shadow-sm border border-red-100" title="Eliminar Garantía">
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleDownloadCertificado(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl transition-colors text-xs font-black flex items-center gap-2 shadow-sm border border-blue-100">
                                <Download size={14} /> Descargar
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1"><Tag size={14}/> Marca y Proveedor</p>
                            <p className="text-sm font-black text-[#0b1437]">{lic.marca || "Zebra Technologies"}</p>
                            <p className="text-xs text-slate-500 font-medium">{lic.proveedor || "Distribuidor Autorizado"}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1"><User size={14}/> Detalles Operativos</p>
                            <p className="text-sm font-black text-[#0b1437]">{lic.cliente_nombre}</p>
                            <p className="text-xs text-slate-500 font-medium">Ejecutivo: {lic.ejecutivo?.nombre || lic.ejecutivo_cargo || "Admin General"}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1"><Calendar size={14}/> Línea de Tiempo</p>
                            <div className="text-xs text-slate-600 font-medium space-y-1">
                              <p className="flex justify-between"><span>Reporte:</span> <span className="font-bold">{lic.fecha_reporte ? new Date(lic.fecha_reporte).toLocaleDateString() : 'N/A'}</span></p>
                              <p className="flex justify-between"><span>Ingreso:</span> <span className="font-bold text-emerald-600">{lic.fecha_inicio ? new Date(lic.fecha_inicio).toLocaleDateString() : 'N/A'}</span></p>
                              <p className="flex justify-between"><span>Cierre:</span> <span className="font-bold text-red-500">{new Date(lic.fecha_vencimiento).toLocaleDateString()}</span></p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row items-stretch">
                          <div className="bg-slate-100 p-6 flex flex-col justify-center items-center border-r border-slate-200 md:w-1/3 text-center">
                            <ImageIcon size={32} className="text-slate-400 mb-2"/>
                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Evidencia de Instalación</p>
                            <p className="text-[10px] text-slate-500 mt-1">Foto subida por el cliente al confirmar recepción.</p>
                          </div>
                          <div className="p-4 md:w-2/3 bg-white flex items-center justify-center min-h-[150px]">
                            {selectedEqLicencias.url_evidencia ? (
                               <img src={`http://localhost:8000/${selectedEqLicencias.url_evidencia}`} alt="Evidencia Equipo" className="max-h-48 object-contain rounded-lg shadow-sm border border-slate-100" />
                            ) : (
                               <p className="text-sm font-bold text-slate-400 italic">No hay fotografía adjunta a este expediente.</p>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                    <Factory size={64} className="mb-4 opacity-20" />
                    <h3 className="text-xl font-black text-slate-600 mb-1">Sin expediente generado</h3>
                    <p className="text-sm">Aún no hay pólizas o reportes registrados para este equipo.</p>
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