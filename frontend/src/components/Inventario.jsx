import React, { useState, useEffect } from 'react';
import { Plus, Box, X, Truck, Search, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf'; // NUEVA LIBRERÍA

const INNOTREV_CATALOG = [
  "Handheld Zebra TC22 / TC27",
  "Handheld Honeywell EDA52",
  "Impresora de Etiquetas Ribetec RT-420ME",
  "Impresora Industrial Zebra ZT411",
  "Impresora de Credenciales Zebra ZC300",
  "Tableta Industrial Uso Rudo IP67",
  "Lector RFID Zebra MC33"
];

const Inventario = () => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({ modelo: '', numero_serie: '', cliente_id: '' });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const resEq = await fetch('http://127.0.0.1:8000/api/v1/equipo/?t=' + Date.now(), { headers });
      if (resEq.ok) setEquipmentList(await resEq.json());

      const resCl = await fetch('http://127.0.0.1:8000/api/v1/clientes?t=' + Date.now(), { headers });
      if (resCl.ok) setClientsList(await resCl.json());
    } catch (e) {
      console.error("Error cargando inventario", e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredClients = clientsList.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = () => {
    setForm({ modelo: '', numero_serie: 'INN-' + Math.random().toString(36).substr(2, 7).toUpperCase(), cliente_id: '' });
    setSearchTerm('');
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) return alert("❌ Por favor, selecciona un cliente de la lista desplegable.");

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:8000/api/v1/equipo/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cliente_id: parseInt(form.cliente_id) })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else { 
        alert("❌ Error al registrar envío. Verifica que el Número de Serie no esté duplicado."); 
      }
    } catch (error) { console.error(error); } 
    finally { setIsProcessing(false); }
  };

  // --- NUEVA FUNCIÓN: GENERADOR DE PDF ---
  const generarComprobante = (eq) => {
    const doc = new jsPDF();

    // Estilos de Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(26, 38, 84); 
    doc.text("INNOTREV", 20, 25);

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Comprobante Oficial de Despacho", 20, 35);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Datos del Documento
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 20, 55);
    doc.text(`Estado del Trámite: `, 20, 65);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 119, 6); // Color ámbar para En tránsito
    doc.text(eq.status, 58, 65);

    // Caja de Detalles del Hardware
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252); // Fondo gris muy suave
    doc.roundedRect(20, 80, 170, 40, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 38, 84);
    doc.text("Especificaciones del Equipo:", 25, 90);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Modelo / Producto: ${eq.modelo}`, 30, 100);
    doc.text(`Número de Serie (S/N): ${eq.numero_serie}`, 30, 110);

    // Caja de Detalles del Cliente
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 130, 170, 30, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 38, 84);
    doc.text("Asignación de Destino:", 25, 140);

    // Buscamos el nombre del cliente si está en la lista actual
    const clienteRef = clientsList.find(c => c.id === eq.cliente_id);
    const nombreCliente = clienteRef ? clienteRef.nombre : `ID Cliente #${eq.cliente_id}`;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Entregar a: ${nombreCliente}`, 30, 150);

    // Pie de página
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Este documento digital es generado automáticamente por el Centro de Control de Innotrev.", 20, 280);

    // Descargar el PDF
    doc.save(`Despacho_${eq.numero_serie}.pdf`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'INSTALADO': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'EN_TRANSITO': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'FALLA_REPORTADA': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800">Inventario y Ventas</h1><p className="text-slate-500 text-sm mt-1">Gestión de hardware de Innotrev despachado a clientes.</p></div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Box className="text-blue-600" size={20}/> Control de Despachos</h2>
          <p className="text-sm text-slate-500 font-medium">Asigna un nuevo equipo a un cliente y ponlo 'En Tránsito'.</p>
        </div>
        <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm">
          <Plus size={18} /> Nuevo Envío
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
              <th className="px-6 py-4">Equipo Innotrev</th>
              <th className="px-6 py-4">Número de Serie</th>
              <th className="px-6 py-4">ID Cliente</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {equipmentList.length > 0 ? (
              equipmentList.map(eq => (
                <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{eq.modelo}</td>
                  <td className="px-6 py-4 font-mono text-blue-600">{eq.numero_serie}</td>
                  <td className="px-6 py-4 text-slate-500">Cliente #{eq.cliente_id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase ${getStatusColor(eq.status)}`}>
                      {eq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {/* BOTÓN MÁGICO PARA DESCARGAR PDF */}
                    <button 
                      onClick={() => generarComprobante(eq)} 
                      className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition-colors shadow-sm inline-flex"
                      title="Descargar PDF de Envío"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
               <tr><td colSpan="5" className="py-12 text-center text-slate-400">Aún no hay equipos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DESPACHO (Se mantiene igual) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-visible border border-slate-200">
              <div className="p-5 border-b border-slate-200 flex justify-between bg-slate-50 rounded-t-2xl">
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><Truck className="text-blue-600" size={18}/> Registrar Despacho</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white p-1.5 rounded-md shadow-sm"><X size={16} /></button>
              </div>
              <form onSubmit={handleDispatch} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Producto del Catálogo</label>
                  <select required className="w-full border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white transition-colors" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}>
                    <option value="">-- Selecciona equipo hardware --</option>
                    {INNOTREV_CATALOG.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Número de Serie Asignado</label>
                  <input required type="text" className="w-full border border-slate-200 p-3 rounded-xl text-sm font-mono uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white transition-colors" value={form.numero_serie} onChange={e => setForm({...form, numero_serie: e.target.value})} />
                </div>
                
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente Comprador</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" placeholder="Buscar por nombre o correo..."
                      className="w-full border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white transition-colors" 
                      value={searchTerm} 
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        setForm({...form, cliente_id: ''});
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 transition-colors"
                            onClick={() => {
                              setForm({...form, cliente_id: c.id});
                              setSearchTerm(`${c.nombre} (${c.email})`);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <p className="text-sm font-bold text-slate-800">{c.nombre}</p>
                            <p className="text-xs text-slate-500">{c.email}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-sm text-slate-500 text-center">No se encontraron clientes</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                      {isProcessing ? 'Procesando...' : 'Despachar Producto'}
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

export default Inventario;