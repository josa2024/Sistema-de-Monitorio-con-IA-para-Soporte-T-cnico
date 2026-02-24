import React, { useState, useEffect } from 'react';
import { LifeBuoy, FileText, ShieldCheck, UserCircle, PackageCheck, ArrowLeft, Camera, CheckCircle, Ticket, Clock, AlertCircle } from 'lucide-react';
import Chatbot from './Chatbot'; 

const ClientPortal = () => {
  const [activeView, setActiveView] = useState('home');
  
  // Estados para el Formulario de Recepción
  const [formData, setFormData] = useState({ numeroSerie: '', fechaRecepcion: '', estadoEmpaque: '', confirmacionEncendido: false });
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Estados para Mis Tickets
  const [ticketsList, setTicketsList] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setMensaje(null);
    try {
      const token = localStorage.getItem('token') || '';
      const resEquipos = await fetch('http://localhost:8000/api/v1/equipo/', { headers: { 'Authorization': `Bearer ${token}` } });
      let equipoId = null;
      if (resEquipos.ok) {
        const equipos = await resEquipos.json();
        const equipoEncontrado = equipos.find(eq => eq.numero_serie === formData.numeroSerie);
        if (equipoEncontrado) equipoId = equipoEncontrado.id;
      }
      if (!equipoId) throw new Error('❌ No se encontró ningún equipo con ese Número de Serie.');

      const payload = {
        estado_empaque: formData.estadoEmpaque,
        confirmacion_encendido: formData.confirmacionEncendido,
        fecha_recepcion: new Date(formData.fechaRecepcion).toISOString()
      };

      const response = await fetch(`http://localhost:8000/api/v1/equipo/${equipoId}/reception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('❌ Hubo un error al procesar la recepción.');
      setMensaje({ tipo: 'exito', texto: '✅ ¡Recepción registrada exitosamente!' });
      setTimeout(() => {
        setFormData({ numeroSerie: '', fechaRecepcion: '', estadoEmpaque: '', confirmacionEncendido: false });
        setActiveView('home'); setMensaje(null);
      }, 3500);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('http://localhost:8000/api/v1/tickets/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTicketsList(data);
      }
    } catch (error) {
      console.error("Error al cargar tickets:", error);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeView === 'tickets') {
      fetchTickets();
    }
  }, [activeView]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ABIERTO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EN_PROGRESO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'RESUELTO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CERRADO': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      
      {/* Cabecera */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-md">IN</div>
          <span className="text-slate-800 font-bold tracking-wider text-xl">INNOTREV <span className="text-blue-600 font-medium">Soporte</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveView('tickets')}
            className={`text-sm font-medium transition-colors ${activeView === 'tickets' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-blue-600'}`}
          >
            Mis Tickets
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Cliente Alpha S.A.</span>
            <UserCircle size={28} className="text-slate-400" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden min-h-0">
        
        {/* Columna Izquierda Dinámica */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 pb-4">
          
          {/* 1. VISTA DE INICIO */}
          {activeView === 'home' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 leading-tight">Hola, ¿cómo podemos ayudarte hoy?</h1>
                <p className="text-slate-500 mt-2 text-sm">Nuestro asistente de Inteligencia Artificial está listo para diagnosticar tu equipo en segundos.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-8">
                <div onClick={() => setActiveView('reception')} className="bg-blue-600 p-4 rounded-xl border border-blue-700 shadow-md flex items-start gap-4 hover:bg-blue-700 transition-all cursor-pointer group text-white">
                  <div className="bg-white/20 p-3 rounded-lg"><PackageCheck size={24} /></div>
                  <div>
                    <h3 className="font-bold">Registrar Recepción</h3>
                    <p className="text-xs text-blue-100 mt-1">Confirma la llegada física de tu equipo para activar la garantía.</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><ShieldCheck size={24} /></div>
                  <div>
                    <h3 className="font-bold text-slate-800">Mis Garantías</h3>
                    <p className="text-xs text-slate-500 mt-1">Revisa el estado de protección de tus equipos.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. VISTA DE RECEPCIÓN (RESTAURO EL DISEÑO ORIGINAL) */}
          {activeView === 'reception' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-4 duration-300">
              <button onClick={() => setActiveView('home')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 text-sm font-medium transition-colors">
                <ArrowLeft size={16} /> Volver al menú
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-1">Registro de Recepción</h2>
              <p className="text-slate-500 text-xs mb-6">Completa este formulario para activar tu póliza de garantía Innotrev.</p>

              {mensaje && (
                <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {mensaje.texto}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Serie *</label>
                  <input type="text" name="numeroSerie" value={formData.numeroSerie} onChange={handleInputChange} required placeholder="Ej. SN-98234-A" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Recepción *</label>
                  <input type="date" name="fechaRecepcion" value={formData.fechaRecepcion} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado del Empaque *</label>
                  <select name="estadoEmpaque" value={formData.estadoEmpaque} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all">
                    <option value="">Selecciona una opción...</option>
                    <option value="Excelente">Excelente (Sin daños visibles)</option>
                    <option value="Dañado">Dañado (Golpes o rayones)</option>
                    <option value="Abierto">Abierto (Sellos rotos)</option>
                  </select>
                </div>

                {/* --- SECCIÓN DE FOTOGRAFÍA RESTAURADA --- */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Evidencia Fotográfica</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                    <Camera className="mx-auto text-slate-400 group-hover:text-blue-500 transition-colors mb-2" size={24} />
                    <span className="text-xs text-slate-500 font-medium">Haz clic o arrastra una imagen</span>
                    <input type="file" className="hidden" accept="image/*" />
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input type="checkbox" id="encendido" name="confirmacionEncendido" checked={formData.confirmacionEncendido} onChange={handleInputChange} required className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <label htmlFor="encendido" className="text-sm text-slate-700 cursor-pointer">
                    Confirmo que el equipo <strong>encendió correctamente</strong> y se encuentra operativo.
                  </label>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 flex justify-center items-center gap-2 shadow-sm">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={18} />}
                  {isLoading ? 'Procesando...' : 'Confirmar Recepción'}
                </button>
              </form>
            </div>
          )}

          {/* 3. VISTA DE MIS TICKETS */}
          {activeView === 'tickets' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-full">
              <button onClick={() => setActiveView('home')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 text-sm font-medium transition-colors">
                <ArrowLeft size={16} /> Volver al menú
              </button>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Mis Reportes</h2>
                  <p className="text-slate-500 text-xs">Historial de incidencias reportadas.</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Ticket size={24} />
                </div>
              </div>

              {isLoadingTickets ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-sm">Buscando reportes...</p>
                </div>
              ) : ticketsList.length > 0 ? (
                <div className="space-y-4">
                  {ticketsList.map((ticket) => (
                    <div key={ticket.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-400">TKT-{String(ticket.id).padStart(4, '0')}</span>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide border ${getStatusBadge(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{ticket.titulo}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2 mb-3">{ticket.descripcion}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(ticket.fecha_creacion).toLocaleDateString()}</span>
                        {ticket.prioridad === 'ALTA' || ticket.prioridad === 'CRITICA' ? (
                          <span className="flex items-center gap-1 text-red-500 font-medium"><AlertCircle size={12} /> Prioridad Alta</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <ShieldCheck size={40} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">Todo en orden</h3>
                  <p className="text-xs text-slate-500 mt-1">Actualmente no tienes ningún ticket de soporte abierto.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna Derecha: El Chatbot */}
        <div className="lg:col-span-2 h-full min-h-0">
          <div className="h-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden ring-4 ring-slate-50/50">
            <Chatbot mode="client" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientPortal;