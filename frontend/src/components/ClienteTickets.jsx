import React, { useState, useEffect } from 'react';
import { Ticket, MessageSquare } from 'lucide-react';

const ClienteTickets = () => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('token');
        const resTk = await fetch('http://localhost:8000/api/v1/tickets/?t=' + Date.now(), { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (resTk.ok) setTickets(await resTk.json());
      } catch (error) {
        console.error("Error al cargar tickets:", error);
      }
    };
    fetchTickets();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 w-full py-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historial de Soporte</h2>
          <p className="text-slate-500 mt-1">Consulta el estado de los reportes generados por nuestro asistente IA.</p>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Falla Reportada</th>
                <th className="px-6 py-4">Clasificación IA</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">#{t.id}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium max-w-xs truncate" title={t.descripcion}>{t.descripcion}</td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-purple-100 flex items-center gap-1 w-max">
                      <MessageSquare size={12} /> {t.categoria || 'Diagnóstico IA'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 w-max ${
                      t.status === 'ABIERTO' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                      t.status === 'EN_PROGRESO' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-400">
          <Ticket size={56} className="mx-auto mb-4 opacity-40 text-blue-400" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">Sin reportes activos</h3>
          <p className="text-sm">Las solicitudes de soporte aparecerán aquí una vez que interactúes con la IA.</p>
        </div>
      )}
    </div>
  );
};

export default ClienteTickets;