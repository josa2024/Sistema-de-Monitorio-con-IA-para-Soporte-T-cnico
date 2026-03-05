import React, { useState, useEffect } from 'react';
import { Plus, Box, PackageSearch, X, Truck, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // ESTADOS NUEVOS PARA EL BUSCADOR INTELIGENTE
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

  // Lógica para filtrar clientes mientras se escribe
  const filteredClients = clientsList.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = () => {
    setForm({ modelo: '', numero_serie: 'INN-' + Math.random().toString(36).substr(2, 7).toUpperCase(), cliente_id: '' });
    setSearchTerm(''); // Limpiamos el buscador al abrir
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) {
      alert("❌ Por favor, selecciona un cliente de la lista desplegable.");
      return;
    }

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
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
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
                </tr>
              ))
            ) : (
               <tr><td colSpan="4" className="py-12 text-center text-slate-400">Aún no hay equipos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
                
                {/* BUSCADOR DE CLIENTES INTELIGENTE */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente Comprador</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o correo..."
                      className="w-full border border-slate-200 pl-9 pr-3 py-3 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white transition-colors" 
                      value={searchTerm} 
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        setForm({...form, cliente_id: ''}); // Borra el ID si el admin cambia el texto
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />
                  </div>
                  
                  {/* Lista desplegable flotante */}
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