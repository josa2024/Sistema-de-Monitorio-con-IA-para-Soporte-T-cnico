import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Download, X, Clock, AlertTriangle, User, Calendar, Tag, Factory, Image as ImageIcon, Search, Trash2, Edit3, MessageCircle, Paperclip, Send, FileText, FilterX, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../services/api';

const Garantias = () => {
  const [equiposInstalados, setEquiposInstalados] = useState([]);
  const [selectedEqLicencias, setSelectedEqLicencias] = useState(null);
  const [licenciasCliente, setLicenciasCliente] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingLicencias, setIsLoadingLicencias] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [comments, setComments] = useState({});
  const [chatInputs, setChatInputs] = useState({});
  const [isSendingChat, setIsSendingChat] = useState(false);

  const rawRole = localStorage.getItem('userRole') || '';
  const userRole = rawRole.trim().toUpperCase();
  const canModify = userRole === 'ADMIN' || userRole === 'VENTAS';

  const fetchEquipos = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/equipo/?t=${Date.now()}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEquiposInstalados(data.filter(eq => eq.status === 'INSTALADO' || eq.status === 'FALLA_REPORTADA'));
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchEquipos(); }, []);

  const loadComments = async (licId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/licencias/${licId}/comments`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({ ...prev, [licId]: data }));
      }
    } catch(e) { console.error(e); }
  };

  const verLicencias = async (eq) => {
    setSelectedEqLicencias(eq);
    setIsLoadingLicencias(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/licencias/equipo/${eq.id}?t=${Date.now()}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLicenciasCliente(data);
        data.forEach(lic => loadComments(lic.id));
      } else { setLicenciasCliente([]); }
    } catch (e) { setLicenciasCliente([]); } 
    finally { setIsLoadingLicencias(false); }
  };

  const handleSendComment = async (licId) => {
    const input = chatInputs[licId] || {};
    if (!input.text?.trim() && !input.file) return;

    setIsSendingChat(true);
    try {
      const formData = new FormData();
      formData.append('contenido', input.text?.trim() ? input.text : 'Evidencia adjunta enviada.');
      if (input.file) formData.append('file', input.file);

      const res = await fetch(`http://localhost:8000/api/v1/licencias/${licId}/comments`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData
      });
      if (res.ok) {
        setChatInputs(prev => ({ ...prev, [licId]: { text: '', file: null } }));
        await loadComments(licId);
      }
    } catch (e) { alert("❌ " + e.message); } finally { setIsSendingChat(false); }
  };

  const handleDownloadCertificado = async (licenseId, nombre) => {
    try {
        const res = await fetch(`http://localhost:8000/api/v1/licencias/descargar/${licenseId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Error");
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `Certificado_${nombre.replace(/\s+/g, '_')}.pdf`; 
        document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { alert("❌ El archivo no existe o hubo un error al descargarlo."); }
  };

  const handleDeleteEquipment = async (e, equipmentId, modelo) => {
    e.stopPropagation(); 
    if(!window.confirm(`⚠️ ADVERTENCIA CRÍTICA: Estás por eliminar el equipo "${modelo}" de la base de datos. ¿Continuar?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/equipo/${equipmentId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error("No se pudo eliminar el producto.");
      alert("✅ Producto eliminado."); fetchEquipos(); 
    } catch (error) { alert("❌ Error: " + error.message); }
  };

  const handleUpdateDate = async (id, currentDate) => {
    const defaultDate = currentDate ? currentDate.split('T')[0] : '';
    const newDate = window.prompt("Ingresa nueva fecha (YYYY-MM-DD):", defaultDate);
    if (!newDate || newDate === defaultDate) return;
    try {
      await fetch(`http://localhost:8000/api/v1/licencias/${id}`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_vencimiento: newDate }) });
      verLicencias(selectedEqLicencias); 
    } catch (e) { alert("❌ " + e.message); }
  };

  const handleDeleteLicense = async (id) => {
    if(!window.confirm("⚠️ ¿Eliminar este expediente?")) return;
    try {
      await fetch(`http://localhost:8000/api/v1/licencias/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      verLicencias(selectedEqLicencias);
    } catch (e) { alert("❌ " + e.message); }
  };

  const obtenerBadgeVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const diffDias = Math.ceil((new Date(fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return <span className="text-xs font-black px-3 py-1 rounded-md bg-red-100 text-red-600 flex items-center gap-1"><AlertTriangle size={14}/> Vencida</span>;
    if (diffDias <= 30) return <span className="text-xs font-black px-3 py-1 rounded-md bg-amber-100 text-amber-600 flex items-center gap-1"><Clock size={14}/> Faltan {diffDias} días</span>;
    return <span className="text-xs font-black px-3 py-1 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1"><ShieldCheck size={14}/> Activa</span>;
  };

  const stats = {
    total: equiposInstalados.length,
    protegidos: equiposInstalados.filter(eq => eq.status === 'INSTALADO').length,
    revision: equiposInstalados.filter(eq => eq.status === 'FALLA_REPORTADA').length
  };

  const filteredEquipos = equiposInstalados.filter(eq => {
    const matchStatus = activeFilter === 'ALL' || eq.status === activeFilter;
    const matchSearch = eq.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) || eq.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0b1437]">Expedientes de Garantía</h2>
          <p className="text-slate-500 mt-2 text-lg">Consulta y gestiona el hardware instalado y sus coberturas.</p>
        </div>
        {equiposInstalados.length > 0 && (
          <div className="relative w-full md:w-96 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="Buscar por S/N o modelo..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>

      {/* MÉTRICAS / FILTROS */}
      {equiposInstalados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setActiveFilter('ALL')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'ALL' ? 'bg-blue-50 border-blue-300 ring-4 ring-blue-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-blue-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}><Activity size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'ALL' ? 'text-blue-600' : 'text-slate-400'}`}>Todos los Equipos</p><p className="text-2xl font-black text-[#0b1437]">{stats.total}</p></div>
          </div>
          
          <div 
            onClick={() => setActiveFilter('INSTALADO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'INSTALADO' ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-emerald-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'INSTALADO' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'INSTALADO' ? 'text-emerald-700' : 'text-slate-400'}`}>Protegidos</p><p className="text-2xl font-black text-[#0b1437]">{stats.protegidos}</p></div>
          </div>

          <div 
            onClick={() => setActiveFilter('FALLA_REPORTADA')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'FALLA_REPORTADA' ? 'bg-red-50 border-red-300 ring-4 ring-red-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-red-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'FALLA_REPORTADA' ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-600'}`}><AlertTriangle size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'FALLA_REPORTADA' ? 'text-red-700' : 'text-slate-400'}`}>Revisión Técnica</p><p className="text-2xl font-black text-red-600">{stats.revision}</p></div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeFilter !== 'ALL' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3">
             <span className="text-sm font-bold text-slate-500">Mostrando resultados para:</span>
             <button onClick={() => setActiveFilter('ALL')} className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-slate-700 transition-colors shadow-sm">
               {activeFilter === 'INSTALADO' ? 'Protegidos' : 'Revisión Técnica'} <FilterX size={14} className="ml-1 opacity-70"/>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {equiposInstalados.length === 0 ? (
        <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center text-slate-400">
          <ShieldCheck size={56} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-xl font-black text-slate-700 mb-2">Sin equipos activos</h3>
        </div>
      ) : filteredEquipos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipos.map(eq => {
            const isDamaged = eq.status === 'FALLA_REPORTADA';
            return (
              <div key={eq.id} className={`bg-white border ${isDamaged ? 'border-red-200' : 'border-slate-200'} p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col group relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-24 h-24 ${isDamaged ? 'bg-red-50' : 'bg-blue-50'} rounded-bl-full -z-10 group-hover:scale-110 transition-transform`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`${isDamaged ? 'bg-red-600' : 'bg-blue-600'} text-white p-3 rounded-2xl shadow-md`}>{isDamaged ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}</div>
                  <div className="flex items-center gap-2">
                    {isDamaged ? <span className="text-[10px] font-black bg-red-100 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 uppercase tracking-widest text-center">Revisión<br/>Técnica</span> : <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 uppercase tracking-widest">Protegido</span>}
                    {canModify && <button onClick={(e) => handleDeleteEquipment(e, eq.id, eq.modelo)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={18} /></button>}
                  </div>
                </div>
                <h3 className="font-black text-[#0b1437] text-xl mb-1">{eq.modelo}</h3>
                <p className="text-xs text-slate-500 font-mono mb-6 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block w-max font-bold">S/N: {eq.numero_serie}</p>
                <button onClick={() => verLicencias(eq)} className={`mt-auto w-full ${isDamaged ? 'bg-red-50 text-red-600 hover:bg-red-600' : 'bg-slate-50 text-blue-600 hover:bg-blue-600'} hover:text-white font-black py-3.5 rounded-xl text-sm transition-all border ${isDamaged ? 'border-red-200' : 'border-slate-200'}`}>{isDamaged ? 'Ver Detalles de Falla' : 'Abrir Expediente Completo'}</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center text-slate-400"><Search size={56} className="mx-auto mb-4 opacity-40" /><h3 className="text-xl font-black text-slate-700 mb-2">No se encontraron resultados</h3></div>
      )}

      {/* MODAL: EXPEDIENTE COMPLETO */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {selectedEqLicencias && (
          <motion.div key="modal-expediente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#050b1a]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedEqLicencias(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              
              <div className={`p-6 md:p-8 border-b ${selectedEqLicencias.status === 'FALLA_REPORTADA' ? 'border-amber-100 bg-amber-50/50' : 'border-slate-100 bg-slate-50'} flex justify-between items-start relative overflow-hidden shrink-0`}>
                <div className={`absolute -right-10 -top-10 ${selectedEqLicencias.status === 'FALLA_REPORTADA' ? 'text-amber-100' : 'text-blue-50'} opacity-50 pointer-events-none`}>{selectedEqLicencias.status === 'FALLA_REPORTADA' ? <AlertTriangle size={150} /> : <ShieldCheck size={150} />}</div>
                <div className="relative z-10">
                  {selectedEqLicencias.status === 'FALLA_REPORTADA' ? <span className="text-xs font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-md uppercase tracking-widest mb-3 inline-block">Equipo en Revisión Técnica</span> : <span className="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-md uppercase tracking-widest mb-3 inline-block">Expediente Oficial</span>}
                  <h2 className="text-2xl md:text-3xl font-black text-[#0b1437] mb-1">{selectedEqLicencias.modelo}</h2>
                  <p className="text-sm text-slate-500 font-mono font-bold">S/N: {selectedEqLicencias.numero_serie}</p>
                </div>
                <button onClick={() => setSelectedEqLicencias(null)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors relative z-10"><X size={20} /></button>
              </div>

              {/* 🔥 AQUÍ ESTÁ EL CAMBIO: SE QUITÓ EL BLOQUEO VISUAL */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white custom-scrollbar">
                {isLoadingLicencias ? (
                   <div className="text-center py-20 text-slate-500 font-bold animate-pulse">Cargando datos...</div>
                ) : (
                  <>
                    {selectedEqLicencias.status === 'FALLA_REPORTADA' && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-start gap-3 text-amber-700 shadow-sm">
                        <AlertTriangle className="shrink-0 mt-0.5" size={20}/>
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest">Atención Requerida</p>
                          <p className="text-xs font-medium mt-1">Este equipo fue reportado o escalado con fallas. Utiliza la bitácora para gestionar la revisión física o garantía.</p>
                        </div>
                      </div>
                    )}

                    {licenciasCliente.length > 0 ? (
                      <div className="space-y-12">
                        {licenciasCliente.map(lic => (
                          <div key={lic.id} className="border-2 border-slate-100 rounded-[2rem] p-6 relative overflow-hidden bg-white shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Folio / ID de Garantía</p>
                                <p className="text-xl font-black text-blue-700 font-mono">{lic.folio || "GAR-PENDIENTE"}</p>
                              </div>
                              <div className="flex flex-col md:items-end gap-2">
                                {obtenerBadgeVencimiento(lic.fecha_vencimiento)}
                                <div className="flex gap-2 mt-2 md:mt-0">
                                  {canModify && (
                                    <>
                                      <button onClick={() => handleUpdateDate(lic.id, lic.fecha_vencimiento)} className="text-slate-600 bg-slate-50 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors text-xs font-black border border-slate-200"><Edit3 size={14} /></button>
                                      <button onClick={() => handleDeleteLicense(lic.id)} className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-2 rounded-xl transition-colors text-xs font-black border border-red-100"><Trash2 size={14} /></button>
                                    </>
                                  )}
                                  <button onClick={() => handleDownloadCertificado(lic.id, lic.nombre_software)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl transition-colors text-xs font-black flex items-center gap-2 border border-blue-100"><Download size={14} /> Descargar</button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1"><Tag size={14}/> Marca y Proveedor</p>
                                <p className="text-sm font-black text-[#0b1437]">{lic.marca || "No especificada"}</p>
                                <p className="text-xs text-slate-500 font-medium">{lic.proveedor || "Distribuidor Autorizado"}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1"><User size={14}/> Propietario</p>
                                <p className="text-sm font-black text-[#0b1437]">{lic.cliente_nombre}</p>
                                <p className="text-xs text-slate-500 font-medium">Ejecutivo: {lic.ejecutivo_cargo || "Sistema"}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1"><Calendar size={14}/> Vigencia</p>
                                <div className="text-xs text-slate-600 font-medium space-y-1">
                                  <p className="flex justify-between"><span>Ingreso:</span> <span className="font-bold text-emerald-600">{lic.fecha_inicio ? new Date(lic.fecha_inicio).toLocaleDateString() : 'N/A'}</span></p>
                                  <p className="flex justify-between"><span>Vence:</span> <span className="font-bold text-red-500">{lic.fecha_vencimiento ? new Date(lic.fecha_vencimiento).toLocaleDateString() : 'N/A'}</span></p>
                                </div>
                              </div>
                            </div>

                            {/* CHAT */}
                            <div className="mt-8 border-t border-slate-100 pt-8">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><MessageCircle size={16} className="text-blue-500"/> Bitácora y Seguimiento</h4>
                              <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                {comments[lic.id]?.map(c => {
                                  const isClient = c.autor?.role_id === 3; 
                                  return (
                                    <div key={c.id} className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isClient ? 'self-start' : 'self-end flex-row-reverse ml-auto'}`}>
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${isClient ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-blue-100 border-blue-200 text-blue-600'}`}><User size={14} /></div>
                                      <div className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                                        <div className={`p-4 rounded-2xl shadow-sm ${isClient ? 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200' : 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/20'}`}>
                                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 border-b pb-1 ${isClient ? 'border-slate-300 opacity-60' : 'border-blue-400/50 text-blue-100'}`}>{c.autor?.nombre || 'Usuario'}</p>
                                          <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{c.contenido}</p>
                                          {c.archivo_url && (
                                            <div className="mt-3">
                                              {c.archivo_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                <a href={`http://localhost:8000${c.archivo_url}`} target="_blank" rel="noreferrer"><img src={`http://localhost:8000${c.archivo_url}`} alt="Evidencia adjunta" className="max-w-full md:max-w-[250px] max-h-48 object-cover rounded-lg border border-white/20 shadow-sm" /></a>
                                              ) : (
                                                <a href={`http://localhost:8000${c.archivo_url}`} target="_blank" rel="noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold w-max ${isClient ? 'bg-white border border-slate-200 text-blue-600' : 'bg-white/20 text-white'}`}><FileText size={14}/> Ver Documento Adjunto</a>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1 mx-1">{new Date(c.fecha_creacion).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                                {!comments[lic.id]?.length && (
                                  <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-3xl">
                                    <MessageCircle size={32} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-sm font-bold">Aún no hay mensajes en la bitácora.</p>
                                  </div>
                                )}
                              </div>

                              <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-2 flex flex-col md:flex-row items-end gap-3 shadow-sm">
                                <div className="flex items-center w-full md:w-auto px-2 md:px-0">
                                  <label className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-full cursor-pointer relative">
                                    <Paperclip size={20} />
                                    <input type="file" className="hidden" onChange={(e) => setChatInputs(prev => ({...prev, [lic.id]: { ...prev[lic.id], file: e.target.files[0] }}))} />
                                    {chatInputs[lic.id]?.file && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></div>}
                                  </label>
                                </div>
                                <div className="flex-1 flex flex-col justify-end w-full px-2 md:px-0 pb-1">
                                  {chatInputs[lic.id]?.file && (
                                    <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-black w-max mb-2 flex items-center gap-2 border border-blue-200">
                                      <FileText size={14}/> {chatInputs[lic.id]?.file.name}
                                      <button onClick={() => setChatInputs(prev => ({...prev, [lic.id]: { ...prev[lic.id], file: null }}))} className="hover:text-red-500 bg-white rounded-full p-0.5"><X size={12}/></button>
                                    </div>
                                  )}
                                  <textarea
                                    value={chatInputs[lic.id]?.text || ''}
                                    onChange={e => setChatInputs(prev => ({...prev, [lic.id]: { ...prev[lic.id], text: e.target.value }}))}
                                    placeholder="Escribe un mensaje o adjunta evidencia técnica..."
                                    className="w-full bg-transparent p-2 text-sm font-medium text-[#0b1437] outline-none resize-none min-h-[44px] max-h-[120px] custom-scrollbar"
                                    rows="1"
                                  />
                                </div>
                                <div className="w-full md:w-auto flex justify-end">
                                  <button onClick={() => handleSendComment(lic.id)} disabled={isSendingChat || (!chatInputs[lic.id]?.text?.trim() && !chatInputs[lic.id]?.file)} className="bg-[#0b1437] hover:bg-blue-800 text-white px-6 py-3 rounded-2xl shadow-md font-black flex items-center gap-2 m-1 disabled:opacity-50">
                                    <span className="md:hidden">Enviar</span><Send size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                        <Factory size={64} className="mb-4 opacity-20" />
                        <h3 className="text-xl font-black text-slate-600 mb-1">Sin expedientes</h3>
                        <p className="text-sm font-medium">Este equipo está en revisión, pero aún no tiene una póliza de seguimiento generada.</p>
                      </div>
                    )}
                  </>
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