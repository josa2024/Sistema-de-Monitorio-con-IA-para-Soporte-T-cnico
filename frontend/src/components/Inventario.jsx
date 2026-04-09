import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Truck, Search, FileText, CheckCircle2, ShoppingBag } from 'lucide-react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: '', apellidos: '', direccion: '', telefono: '', email: '', password: '' });
  const [isProcessingClient, setIsProcessingClient] = useState(false);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const resEq = await fetch('http://localhost:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());
      
      // CAMBIO AQUÍ: de /users/ a /usuarios/
      const resCl = await fetch('http://localhost:8000/api/v1/usuarios/?t=' + Date.now(), { headers });
      if (resCl.ok) setClientsList(await resCl.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredClients = clientsList.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()));

  // Envío Directo (Manual)
  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) return alert("Selecciona cliente.");
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/equipo/', { 
        method: 'POST', 
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`, 
            'Content-Type': 'application/json' 
        }, 
        body: JSON.stringify({ 
            ...form, 
            cliente_id: parseInt(form.cliente_id),
            status: "EN_TRANSITO" // Aseguramos el estado inicial manual
        }) 
      });
      if (res.ok) { setIsModalOpen(false); fetchData(); } else { alert("Error al registrar envío. Verifica S/N."); }
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const handleCreateClient = async () => {
    if (!newClient.nombre || !newClient.email || !newClient.password) {
      alert("Por favor llena al menos el nombre, correo y contraseña.");
      return;
    }
    setIsProcessingClient(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al crear cliente');
      
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const resCl = await fetch('http://localhost:8000/api/v1/usuarios/?t=' + Date.now(), { headers });
      if (resCl.ok) {
        const updatedClients = await resCl.json();
        setClientsList(updatedClients);
        const createdUser = updatedClients.find(c => c.email === newClient.email);
        if (createdUser) {
          setForm({...form, cliente_id: createdUser.id});
          setSearchTerm(`${createdUser.nombre}`);
        }
      }
      setIsCreatingClient(false);
      setNewClient({ nombre: '', apellidos: '', direccion: '', telefono: '', email: '', password: '' });
    } catch (error) { alert(error.message); } finally { setIsProcessingClient(false); }
  };

  // Validar Venta de E-commerce
  const handleValidate = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // CORRECCIÓN: Usamos PUT a la ruta base para actualizar el equipo con el nuevo status
      const res = await fetch(`http://localhost:8000/api/v1/equipo/${selectedEq.id}`, { 
        method: 'PUT', 
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`, 
            'Content-Type': 'application/json' 
        }, 
        body: JSON.stringify({ 
            numero_serie: valForm.numero_serie,
            status: "PENDIENTE_PAGO" 
        }) 
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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'SOLICITADO': return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
      case 'PENDIENTE_PAGO': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EN_TRANSITO': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INSTALADO': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FALLA_REPORTADA': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div><h1 className="text-3xl font-black text-[#0b1437]">Ventas y Envíos</h1><p className="text-slate-500 mt-2 font-medium">Valida solicitudes de compra, despacha hardware y genera PDF.</p></div>
        <button onClick={() => {setForm({ modelo: '', numero_serie: 'INN-' + Math.random().toString(36).substr(2, 7).toUpperCase(), marca: '', cliente_id: '' }); setIsModalOpen(true);}} className="bg-[#0b1437] hover:bg-blue-800 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
          <Plus size={20} /> Envío Manual
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr className="text-slate-400 text-[11px] uppercase font-black tracking-widest">
              <th className="px-8 py-5">Equipo Innotrev</th><th className="px-8 py-5">S/N</th><th className="px-8 py-5">Cliente</th><th className="px-8 py-5">Estado</th><th className="px-8 py-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {equipmentList.map(eq => (
              <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-black text-[#0b1437]">{eq.modelo}</td>
                <td className="px-8 py-5 font-mono text-slate-500 font-bold">{eq.numero_serie}</td>
                <td className="px-8 py-5 text-slate-600 font-medium">{(clientsList.find(c => c.id === eq.cliente_id)?.nombre) || `ID #${eq.cliente_id}`}</td>
                <td className="px-8 py-5"><span className={`px-3 py-1.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${getStatusStyle(eq.status)}`}>{eq.status.replace('_', ' ')}</span></td>
                <td className="px-8 py-5 text-right">
                  {eq.status === 'SOLICITADO' ? (
                     <button onClick={() => { setSelectedEq(eq); setValForm({ numero_serie: 'INN-' + Math.random().toString(36).substr(2, 7).toUpperCase() }); setIsValidating(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-purple-700 transition-colors">Validar Venta</button>
                  ) : (
                     <button onClick={() => generarComprobante(eq)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-3 rounded-xl transition-all shadow-sm inline-block"><FileText size={18} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Envío Manual */}
      {typeof document !== 'undefined' && createPortal(<AnimatePresence>
        {isModalOpen && (
          <motion.div key="modal-despacho" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#0b1437]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-visible" onClick={(e) => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
                 <h2 className="font-black text-[#0b1437] text-xl flex items-center gap-2"><Truck className="text-blue-600" size={22}/> Despacho Manual</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><X size={18} /></button>
               </div>
               <form onSubmit={handleDispatch} className="p-8 space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Producto</label>
                    <select required className="w-full border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 font-bold text-[#0b1437]" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
                      <option value="">Selecciona equipo hardware...</option>
                      {INNOTREV_CATALOG.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Marca</label>
                    <select required className="w-full border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 font-bold text-[#0b1437]" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})}>
                      <option value="">Selecciona una marca...</option>
                      <option value="Zebra">Zebra</option>
                      <option value="Ribetec">Ribetec</option>
                      <option value="Evolis">Evolis</option>
                      <option value="HoneyWell">HoneyWell</option>
                      <option value="Sato">Sato</option>
                    </select>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-4 relative">
                      <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out ${isCreatingClient ? 'translate-x-full' : 'translate-x-0'}`}></div>
                      <button type="button" onClick={() => setIsCreatingClient(false)} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest z-10 transition-colors ${!isCreatingClient ? 'text-blue-700' : 'text-slate-400'}`}>Buscar Cliente</button>
                      <button type="button" onClick={() => setIsCreatingClient(true)} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest z-10 transition-colors ${isCreatingClient ? 'text-blue-700' : 'text-slate-400'}`}>Nuevo Cliente</button>
                    </div>

                    {!isCreatingClient ? (
                      <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente Asignado</label>
                        <Search className="absolute left-4 top-[38px] text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar..." className="w-full border border-slate-200 pl-11 pr-4 py-4 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 bg-slate-50 font-bold text-[#0b1437]" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); setForm({...form, cliente_id: ''}); }} onFocus={() => setIsDropdownOpen(true)} />
                        {isDropdownOpen && (
                          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                            {filteredClients.map(c => (
                                <div key={c.id} className="px-6 py-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50" onClick={() => { setForm({...form, cliente_id: c.id}); setSearchTerm(`${c.nombre}`); setIsDropdownOpen(false); }}>
                                  <p className="text-sm font-black text-[#0b1437]">{c.nombre}</p>
                                </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="Nombre" value={newClient.nombre} onChange={e => setNewClient({...newClient, nombre: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                          <input type="text" placeholder="Apellidos" value={newClient.apellidos} onChange={e => setNewClient({...newClient, apellidos: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                        </div>
                        <input type="text" placeholder="Dirección de envío" value={newClient.direccion} onChange={e => setNewClient({...newClient, direccion: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                        <input type="text" placeholder="Teléfono" value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                        <input type="email" placeholder="Correo electrónico" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                        <input type="password" placeholder="Contraseña de acceso" value={newClient.password} onChange={e => setNewClient({...newClient, password: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                        <button type="button" onClick={handleCreateClient} disabled={isProcessingClient} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold mt-2 shadow-md disabled:opacity-50 transition-all">{isProcessingClient ? 'Creando...' : 'Guardar y Asignar Cliente'}</button>
                      </div>
                    )}
                  </div>
                  {!isCreatingClient && (
                    <button type="submit" disabled={isProcessing} className="w-full bg-[#0b1437] hover:bg-blue-800 text-white py-4 rounded-2xl text-sm font-black mt-6 transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30">Despachar Producto</button>
                  )}
               </form>
             </motion.div>
          </motion.div>
        )}

        {/* NUEVO MODAL: Validar Venta E-commerce */}
        {isValidating && (
           <motion.div key="modal-validar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 w-full h-full bg-[#0b1437]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={() => setIsValidating(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-visible" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
                <h2 className="font-black text-[#0b1437] text-xl flex items-center gap-2"><ShoppingBag className="text-purple-600" size={22}/> Validar Venta</h2>
                <button onClick={() => setIsValidating(false)} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><X size={18} /></button>
              </div>
              <form onSubmit={handleValidate} className="p-8 space-y-5">
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                   <p className="text-xs text-purple-600 font-bold uppercase tracking-widest mb-1">Producto Solicitado</p>
                   <p className="font-black text-[#0b1437]">{selectedEq?.modelo}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asignar S/N de Bodega</label>
                  <input required type="text" className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-mono font-black text-purple-600 outline-none focus:ring-4 focus:ring-purple-500/10 bg-slate-50 uppercase" value={valForm.numero_serie} onChange={e => setValForm({...valForm, numero_serie: e.target.value})} />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl text-sm font-black mt-6 shadow-lg shadow-purple-600/30">Aprobar y Enviar a Cobro</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
};

export default Inventario;