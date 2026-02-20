import React from 'react';
import { LifeBuoy, FileText, ShieldCheck, UserCircle } from 'lucide-react';
import Chatbot from './Chatbot'; 

const ClientPortal = () => {
  return (
    // CAMBIO 1: "h-screen" y "overflow-hidden" bloquean la altura total a lo que mide el monitor
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      
      {/* --- Cabecera del Cliente --- */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-md">
            IN
          </div>
          <span className="text-slate-800 font-bold tracking-wider text-xl">INNOTREV <span className="text-blue-600 font-medium">Soporte</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">Mis Tickets</button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Cliente Alpha S.A.</span>
            <UserCircle size={28} className="text-slate-400" />
          </div>
        </div>
      </header>

      {/* --- Contenido Principal --- */}
      {/* CAMBIO 2: "overflow-hidden" para que no se desborde y "min-h-0" para domar el Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden min-h-0">
        
        {/* Columna Izquierda: Opciones Rápidas */}
        {/* Le ponemos overflow-y-auto por si navegan en una laptop pequeña */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 leading-tight">Hola, ¿cómo podemos ayudarte hoy?</h1>
            <p className="text-slate-500 mt-2 text-sm">Nuestro asistente de Inteligencia Artificial está listo para diagnosticar tu equipo en segundos.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-8">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LifeBuoy size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Soporte Técnico</h3>
                <p className="text-xs text-slate-500 mt-1">Diagnóstico en línea y apertura de reportes.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
              <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Mis Garantías</h3>
                <p className="text-xs text-slate-500 mt-1">Revisa el estado de protección de tus equipos.</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
              <div className="bg-purple-50 p-3 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Manuales</h3>
                <p className="text-xs text-slate-500 mt-1">Documentación técnica y guías de uso.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: El Chatbot */}
        {/* CAMBIO 3: Obligamos a la columna a respetar la altura estricta con h-full y min-h-0 */}
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