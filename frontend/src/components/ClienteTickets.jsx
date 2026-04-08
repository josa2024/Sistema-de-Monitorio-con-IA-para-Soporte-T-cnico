import React, { useState, useEffect } from 'react';
import { Ticket, MessageSquare, FileText } from 'lucide-react';
import { getAuthHeaders } from '../services/api';
import { jsPDF } from 'jspdf';

const ClienteTickets = () => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const headers = getAuthHeaders();
        const resTk = await fetch('http://localhost:8000/api/v1/tickets/?t=' + Date.now(), { 
          headers
        });
        if (resTk.ok) setTickets(await resTk.json());
        else if (resTk.status === 401) console.error("Token inválido");
      } catch (error) {
        console.error("Error al cargar tickets:", error);
      }
    };
    fetchTickets();
  }, []);

  const generarComprobanteTicket = (ticket) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(11, 20, 55); doc.text("INNOTREV", 20, 25);
    doc.setFontSize(14); doc.setTextColor(100, 100, 100); doc.text("Comprobante de Ticket de Soporte", 20, 35);
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.line(20, 42, 190, 42);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(60, 60, 60); 
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 20, 55); 
    doc.text(`Estado: `, 20, 65);
    doc.setFont("helvetica", "bold"); doc.setTextColor(37, 99, 235); doc.text(ticket.status, 40, 65);
    doc.setDrawColor(220, 220, 220); doc.setFillColor(248, 250, 252); doc.roundedRect(20, 80, 170, 70, 3, 3, 'FD');
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(11, 20, 55); doc.text("Detalles del Ticket:", 25, 90);
    doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60); 
    doc.text(`Folio: #TKT-${String(ticket.id).padStart(4, '0')}`, 30, 100); 
    doc.text(`Cliente: ${ticket.cliente?.nombre || ticket.cliente?.email || 'Desconocido'}`, 30, 110);
    doc.text(`Categoría: ${ticket.categoria || 'Diagnóstico IA'}`, 30, 120);
    doc.text(`Prioridad: ${ticket.prioridad || 'No asignada'}`, 30, 130);
    
    const descLines = doc.splitTextToSize(`Descripción: ${ticket.descripcion}`, 150);
    doc.text(descLines, 30, 140);
    
    doc.save(`Ticket_Soporte_${ticket.id}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 w-full py-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historial de Soporte</h2>
          <p className="text-slate-500 mt-1">Consulta el estado de los reportes generados por nuestro asistente IA.</p>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm table-fixed min-w-[1024px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4 w-[8%]">Ticket</th>
                <th className="px-6 py-4 w-[18%]">Cliente</th>
                <th className="px-6 py-4 w-[30%]">Falla Reportada</th>
                <th className="px-6 py-4 w-[14%]">Clasificación IA</th>
                <th className="px-6 py-4 w-[10%]">Estado</th>
                <th className="px-6 py-4 w-[10%]">Fecha</th>
                <th className="px-6 py-4 text-right w-[10%]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">#{t.id}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium truncate" title={t.cliente?.nombre || t.cliente?.email}>{t.cliente?.nombre || t.cliente?.email || 'Desconocido'}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium truncate" title={t.descripcion}>{t.descripcion}</td>
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
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => generarComprobanteTicket(t)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-2.5 rounded-xl transition-all shadow-sm inline-block" title="Descargar Comprobante">
                      <FileText size={16} />
                    </button>
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