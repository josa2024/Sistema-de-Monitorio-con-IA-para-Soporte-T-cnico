import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Server, Search, Plus } from 'lucide-react';
// IMPORTAMOS LA LIBRERÍA DE GRÁFICAS
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  // Datos de la tabla
  const [equipmentList, setEquipmentList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token') || ''; 
        
        // ⚠️ ATENCIÓN AQUÍ: Esta es la ruta a tu backend. 
        // Necesitaremos asegurarnos de que esta ruta exista en tu FastAPI.
        const response = await fetch('http://localhost:8000/api/v1/equipos', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Asumiendo que tu backend devuelve la lista de equipos
          setEquipmentList(data.equipos || []);
          // Y los datos para la gráfica
          setChartData(data.estadisticas || []);
        } else {
          console.error("Error al traer los datos del servidor");
        }
      } catch (error) {
        console.error("Error de conexión:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  

  return (
    <div className="space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard General</h1>
          <p className="text-slate-500 text-sm mt-1">Visión general del estado de los equipos y alertas operativas</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={18} />
          Nuevo Registro de Equipo
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Equipos</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">1,248</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Server size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Licencias Activas</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">1,102</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Por Vencer (30d)</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">124</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <Activity size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Anomalías / Vencidas</p>
            <p className="text-3xl font-bold text-red-600 mt-1">22</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 animate-pulse">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* NUEVO: SECCIÓN DE GRÁFICA */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Anomalías Detectadas por Modelo (Últimos 30 días)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="fallas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sección de Tabla (Inventario Reciente) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Inventario Reciente</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por N/S o Cliente..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-64 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="py-3 px-6 font-semibold">ID Registro</th>
                <th className="py-3 px-6 font-semibold">Número de Serie</th>
                <th className="py-3 px-6 font-semibold">Modelo</th>
                <th className="py-3 px-6 font-semibold">Cliente</th>
                <th className="py-3 px-6 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {equipmentList.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-slate-500 font-medium">{item.id}</td>
                  <td className="py-4 px-6 text-slate-800 font-mono font-medium">{item.sn}</td>
                  <td className="py-4 px-6 text-slate-700">{item.model}</td>
                  <td className="py-4 px-6 text-slate-700">{item.client}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${item.statusColor}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;