import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Truck, Search, FileText, ShoppingBag, Activity, AlertCircle, ShieldCheck, CheckCircle2, FilterX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';

const INNOTREV_CATALOG = ["Handheld Zebra TC22 / TC27", "Handheld Honeywell EDA52", "Impresora de Etiquetas Ribetec RT-420ME", "Impresora Industrial Zebra ZT411", "Impresora de Credenciales Zebra ZC300", "Tableta Industrial Uso Rudo IP67", "Lector RFID Zebra MC33"];

const Inventario = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [form, setForm] = useState({ modelo: '', numero_serie: '', marca: '', cliente_id: '' });
  const [valForm, setValForm] = useState({ numero_serie: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 🔥 NUEVO ESTADO: Controla el filtro activo de las tarjetas
  const [activeFilter, setActiveFilter] = useState('ALL'); 

  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: '', apellidos: '', direccion: '', telefono: '', email: '', password: '' });
  const [isProcessingClient, setIsProcessingClient] = useState(false);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const resEq = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());
      
      const resCl = await fetch('http://localhost:8000/api/v1/usuarios/?t=' + Date.now(), { headers });
      if (resCl.ok) setClientsList(await resCl.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredClients = clientsList.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()));

  // 🔥 LÓGICA DE FILTRADO MEJORADA: Combina el buscador de texto con el filtro de las tarjetas
  const filteredEquipment = equipmentList.filter(eq => {
    const matchStatus = activeFilter === 'ALL' || eq.status === activeFilter;
    
    const clientName = clientsList.find(c => c.id === eq.cliente_id)?.nombre || '';
    const search = equipmentSearchTerm.toLowerCase();
    const matchSearch = eq.modelo.toLowerCase().includes(search) || eq.numero_serie.toLowerCase().includes(search) ||
           clientName.toLowerCase().includes(search) || eq.status.toLowerCase().replace('_', ' ').includes(search);
           
    return matchStatus && matchSearch;
  });

  const stats = {
    total: equipmentList.length,
    instalados: equipmentList.filter(eq => eq.status === 'INSTALADO').length,
    enTransito: equipmentList.filter(eq => eq.status === 'EN_TRANSITO').length,
    falla: equipmentList.filter(eq => eq.status === 'FALLA_REPORTADA').length
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) return alert("Selecciona cliente.");
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/equipo/', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...form, cliente_id: parseInt(form.cliente_id), status: "EN_TRANSITO" }) 
      });
      if (res.ok) { setIsModalOpen(false); fetchData(); } else { alert("Error al registrar envío. Verifica S/N."); }
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const handleCreateClient = async () => {
    if (!newClient.nombre || !newClient.email || !newClient.password) return alert("Por favor llena al menos el nombre, correo y contraseña.");
    setIsProcessingClient(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClient)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al crear cliente');
      
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const resCl = await fetch('http://localhost:8000/api/v1/usuarios/?t=' + Date.now(), { headers });
      if (resCl.ok) {
        const updatedClients = await resCl.json();
        setClientsList(updatedClients);
        const createdUser = updatedClients.find(c => c.email === newClient.email);
        if (createdUser) { setForm({...form, cliente_id: createdUser.id}); setSearchTerm(`${createdUser.nombre}`); }
      }
      setIsCreatingClient(false);
      setNewClient({ nombre: '', apellidos: '', direccion: '', telefono: '', email: '', password: '' });
    } catch (error) { alert(error.message); } finally { setIsProcessingClient(false); }
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/equipo/${selectedEq.id}`, { 
        method: 'PUT', 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ numero_serie: valForm.numero_serie, status: "EN_TRANSITO" })
      });
      if (res.ok) { setIsValidating(false); fetchData(); } else { alert("Error al validar."); }
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const generarComprobante = (eq) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(11, 20, 55); doc.text("INNOTREV", 20, 25);
    doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.text("Comprobante Oficial de Despacho", 20, 35);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.line(20, 42, 190, 42);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(60, 60, 60); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 55); doc.text(`Estado: `, 20, 65);
    doc.setFont("helvetica", "bold"); doc.setTextColor(217, 119, 6); doc.text(eq.status, 40, 65);
    doc.setDrawColor(220, 220, 220); doc.setFillColor(248, 250, 252); doc.roundedRect(20, 80, 170, 40, 3, 3, 'FD');
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(11, 20, 55); doc.text("Equipo:", 25, 90);
    doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60); doc.text(`Modelo: ${eq.modelo}`, 30, 100); doc.text(`S/N: ${eq.numero_serie}`, 30, 110);
    doc.save(`Despacho_${eq.numero_serie}.pdf`);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'SOLICITADO': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500 animate-pulse' },
      'EN_TRANSITO': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      'INSTALADO': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      'FALLA_REPORTADA': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
    };
    const s = styles[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
    
    return (
      <span className={`flex items-center gap-2 w-max px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#0b1437]">Ventas y Envíos</h1>
          <p className="text-slate-500 mt-2 font-medium">Valida solicitudes de compra, despacha hardware y genera PDF.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {equipmentList.length > 0 && (
            <div className="relative w-full sm:w-80 shrink-0 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Buscar equipo, S/N, cliente..." 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-700 shadow-sm"
                value={equipmentSearchTerm}
                onChange={(e) => setEquipmentSearchTerm(e.target.value)}
              />
            </div>
          )}
          <button onClick={() => {setForm({ modelo: '', numero_serie: 'INN-' + Math.random().toString(36).substr(2, 7).toUpperCase(), marca: '', cliente_id: '' }); setIsModalOpen(true);}} className="w-full sm:w-auto bg-[#0b1437] hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 shrink-0">
            <Plus size={20} /> Nuevo Envío
          </button>
        </div>
      </div>

      {/* 🔥 MÉTRICAS DASHBOARD (AHORA FUNCIONAN COMO FILTROS INTERACTIVOS) */}
      {equipmentList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => setActiveFilter('ALL')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'ALL' ? 'bg-blue-50 border-blue-300 ring-4 ring-blue-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-blue-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}><Activity size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'ALL' ? 'text-blue-600' : 'text-slate-400'}`}>Total Histórico</p><p className="text-2xl font-black text-[#0b1437]">{stats.total}</p></div>
          </div>
          
          <div 
            onClick={() => setActiveFilter('INSTALADO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'INSTALADO' ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-emerald-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'INSTALADO' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600'}`}><ShieldCheck size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'INSTALADO' ? 'text-emerald-700' : 'text-slate-400'}`}>Instalados</p><p className="text-2xl font-black text-[#0b1437]">{stats.instalados}</p></div>
          </div>

          <div 
            onClick={() => setActiveFilter('EN_TRANSITO')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'EN_TRANSITO' ? 'bg-amber-50 border-amber-300 ring-4 ring-amber-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-amber-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'EN_TRANSITO' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600'}`}><Truck size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'EN_TRANSITO' ? 'text-amber-700' : 'text-slate-400'}`}>En Tránsito</p><p className="text-2xl font-black text-[#0b1437]">{stats.enTransito}</p></div>
          </div>

          <div 
            onClick={() => setActiveFilter('FALLA_REPORTADA')}
            className={`cursor-pointer p-6 rounded-3xl border shadow-sm flex items-center gap-4 transition-all duration-300 ${activeFilter === 'FALLA_REPORTADA' ? 'bg-red-50 border-red-300 ring-4 ring-red-500/10 scale-105' : 'bg-white border-slate-100 hover:shadow-md hover:border-red-200'}`}
          >
            <div className={`p-4 rounded-2xl ${activeFilter === 'FALLA_REPORTADA' ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-600'}`}><AlertCircle size={24} /></div>
            <div><p className={`text-sm font-bold ${activeFilter === 'FALLA_REPORTADA' ? 'text-red-700' : 'text-slate-400'}`}>En Falla</p><p className="text-2xl font-black text-red-600">{stats.falla}</p></div>
          </div>
        </div>
      )}

      {/* INDICADOR DE FILTRO ACTIVO (Boton para limpiar filtro) */}
      <AnimatePresence>
        {activeFilter !== 'ALL' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3">
             <span className="text-sm font-bold text-slate-500">Mostrando resultados para:</span>
             <button onClick={() => setActiveFilter('ALL')} className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-slate-700 transition-colors shadow-sm">
               {activeFilter.replace('_', ' ')} <FilterX size={14} className="ml-1 opacity-70"/>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLA DE INVENTARIO */}
      {equipmentList.length === 0 ? (
        <div className="bg-white p-20 rounded-[2rem] shadow-sm border border-slate-100 text-center text-slate-400 flex flex-col items-center">
          <div className="bg-blue-50 p-6 rounded-full mb-6"><Truck size={48} className="text-blue-500" /></div>
          <h3 className="text-2xl font-black text-[#0b1437] mb-2">Inventario Limpio</h3>
          <p className="text-slate-500">Haz clic en "Nuevo Envío" para registrar el primer equipo.</p>
        </div>
      ) : filteredEquipment.length > 0 ? (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[900px] table-fixed">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="px-8 py-6 w-[30%]">Producto & Marca</th>
                  <th className="px-8 py-6 w-[20%]">Núm. Serie</th>
                  <th className="px-8 py-6 w-[20%]">Cliente Asignado</th>
                  <th className="px-8 py-6 w-[15%]">Estatus</th>
                  <th className="px-8 py-6 text-right w-[15%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredEquipment.map(eq => {
                  const clientName = clientsList.find(c => c.id === eq.cliente_id)?.nombre || `ID #${eq.cliente_id}`;
                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-black text-[#0b1437] text-base mb-1">{eq.modelo}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{eq.marca || 'INNOTREV'}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-mono text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">{eq.numero_serie}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs border border-blue-200 shrink-0">
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-600 font-bold truncate max-w-[150px]">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">{getStatusBadge(eq.status)}</td>
                      <td className="px-8 py-5 text-right">
                        {eq.status === 'SOLICITADO' ? (
                            <button onClick={() => { setSelectedEq(eq); setValForm({ numero_serie: 'INN-' + Math.random().toString(36).substr(2, 7).toUpperCase() }); setIsValidating(true); }} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md hover:bg-purple-700 transition-all hover:-translate-y-0.5 inline-flex items-center gap-2">
                              Validar <ShoppingBag size={14}/>
                            </button>
                        ) : (
                            <button onClick={() => generarComprobante(eq)} className="text-slate-400 bg-white hover:bg-blue-50 hover:text-blue-600 p-2.5 rounded-xl transition-all shadow-sm border border-slate-200 hover:border-blue-200 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100">
                              <FileText size={18} />
                            </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-[2rem] shadow-sm border border-slate-200 text-center text-slate-400">
          <Search size={56} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-black text-slate-700 mb-2">Búsqueda sin resultados</h3>
          <p className="text-base text-slate-500">Intenta buscar con otros términos o limpia el filtro superior.</p>
        </div>
      )}

      {/* Modal Envío Manual */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {isModalOpen && (
          <motion.div key="modal-despacho" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#050b1a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-visible" onClick={(e) => e.stopPropagation()}>
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
                 <div className="flex items-center gap-4">
                   <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/20 text-white"><Truck size={24}/></div>
                   <div>
                     <h2 className="font-black text-[#0b1437] text-2xl mb-1">Despacho Manual</h2>
                     <p className="text-xs font-bold text-slate-500">Registra un envío físico fuera de e-commerce.</p>
                   </div>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors"><X size={20} /></button>
               </div>
               
               <form onSubmit={handleDispatch} className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><ShoppingBag size={12}/> Producto</label>
                     <select required className="w-full border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50 font-bold text-[#0b1437] transition-all" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
                       <option value="">Selecciona equipo hardware...</option>
                       {INNOTREV_CATALOG.map(p => <option key={p} value={p}>{p}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle2 size={12}/> Marca</label>
                     <select required className="w-full border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50 font-bold text-[#0b1437] transition-all" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})}>
                       <option value="">Selecciona una marca...</option>
                       <option value="Zebra">Zebra</option><option value="Ribetec">Ribetec</option><option value="Evolis">Evolis</option><option value="HoneyWell">HoneyWell</option><option value="Sato">Sato</option>
                     </select>
                   </div>
                 </div>
                 
                 <div className="pt-8 border-t border-slate-100">
                   <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-6 relative">
                     <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200/50 transition-transform duration-300 ease-out ${isCreatingClient ? 'translate-x-full' : 'translate-x-0'}`}></div>
                     <button type="button" onClick={() => setIsCreatingClient(false)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest z-10 transition-colors ${!isCreatingClient ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}>Buscar Cliente</button>
                     <button type="button" onClick={() => setIsCreatingClient(true)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest z-10 transition-colors ${isCreatingClient ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}>Nuevo Cliente</button>
                   </div>

                   {!isCreatingClient ? (
                     <div className="relative">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente Asignado</label>
                       <Search className="absolute left-4 top-[38px] text-slate-400" size={18} />
                       <input type="text" placeholder="Buscar por nombre..." className="w-full border border-slate-200 pl-11 pr-4 py-4 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50 font-bold text-[#0b1437] transition-all" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); setForm({...form, cliente_id: ''}); }} onFocus={() => setIsDropdownOpen(true)} />
                       
                       <AnimatePresence>
                         {isDropdownOpen && (
                           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                             {filteredClients.map(c => (
                                 <div key={c.id} className="px-6 py-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" onClick={() => { setForm({...form, cliente_id: c.id}); setSearchTerm(`${c.nombre}`); setIsDropdownOpen(false); }}>
                                   <p className="text-sm font-black text-[#0b1437]">{c.nombre}</p>
                                   <p className="text-xs font-medium text-slate-400 mt-0.5">{c.email}</p>
                                 </div>
                             ))}
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   ) : (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                       <div className="grid grid-cols-2 gap-4">
                         <input type="text" placeholder="Nombre" value={newClient.nombre} onChange={e => setNewClient({...newClient, nombre: e.target.value})} className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium" />
                         <input type="text" placeholder="Apellidos" value={newClient.apellidos} onChange={e => setNewClient({...newClient, apellidos: e.target.value})} className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium" />
                       </div>
                       <input type="text" placeholder="Dirección de envío completa" value={newClient.direccion} onChange={e => setNewClient({...newClient, direccion: e.target.value})} className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium" />
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <input type="text" placeholder="Teléfono" value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium" />
                         <input type="email" placeholder="Correo electrónico" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium md:col-span-2" />
                       </div>
                       <input type="password" placeholder="Contraseña de acceso al portal" value={newClient.password} onChange={e => setNewClient({...newClient, password: e.target.value})} className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white font-medium" />
                       
                       <button type="button" onClick={handleCreateClient} disabled={isProcessingClient} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-sm font-black mt-4 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all">
                         {isProcessingClient ? 'Creando cuenta...' : 'Guardar y Asignar Cliente'}
                       </button>
                     </motion.div>
                   )}
                 </div>
                 
                 {!isCreatingClient && (
                   <button type="submit" disabled={isProcessing} className="w-full bg-[#0b1437] hover:bg-blue-800 text-white py-4 rounded-2xl text-sm font-black mt-8 transition-all shadow-lg shadow-[#0b1437]/20 hover:shadow-[#0b1437]/30 hover:-translate-y-0.5">
                     Despachar Producto Ahora
                   </button>
                 )}
               </form>
             </motion.div>
          </motion.div>
        )}

        {/* Modal Validar Venta E-commerce */}
        {isValidating && (
           <motion.div key="modal-validar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#050b1a]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsValidating(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-visible" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 border-b border-purple-100 flex justify-between items-center bg-purple-50 rounded-t-[2rem]">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-600/20 text-white"><ShoppingBag size={24}/></div>
                  <div>
                    <h2 className="font-black text-[#0b1437] text-xl mb-1">Validar Venta</h2>
                    <p className="text-xs font-bold text-slate-500">Aprobar compra web</p>
                  </div>
                </div>
                <button onClick={() => setIsValidating(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleValidate} className="p-8 space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Producto Solicitado</p>
                   <p className="font-black text-[#0b1437] text-lg">{selectedEq?.modelo}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Escanea o Ingresa S/N de Bodega</label>
                  <input required type="text" className="w-full border-2 border-purple-200 p-5 rounded-2xl text-center text-lg font-mono font-black text-purple-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 bg-purple-50/30 uppercase transition-all" value={valForm.numero_serie} onChange={e => setValForm({...valForm, numero_serie: e.target.value})} />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl text-sm font-black mt-2 shadow-lg shadow-purple-600/30 transition-all hover:-translate-y-0.5">
                  Aprobar y Enviar a Cobro
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default Inventario;