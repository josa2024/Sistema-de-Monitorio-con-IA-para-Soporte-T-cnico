import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Key, 
  Bot, 
  Settings, 
  Search, 
  Bell, 
  UserCircle,
  LogOut
} from 'lucide-react';
import Login from './components/Login';
import Chatbot from './components/Chatbot';
import Dashboard from './components/Dashboard';
import ClientPortal from './components/ClientPortal';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('ia'); // Iniciamos en la pestaña de IA por defecto

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
      <aside className="w-64 bg-[#1a2654] text-slate-300 flex flex-col shadow-2xl z-20 hidden md:flex">
        {/* Logo Innotrev */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3 font-bold text-white">
            IN
          </div>
          <span className="text-white font-bold tracking-wider text-lg">INNOTREV</span>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard General" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Package size={20} />} label="Inventario y Ventas" isActive={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} />
          <NavItem icon={<Key size={20} />} label="Garantías y Licencias" isActive={activeTab === 'licencias'} onClick={() => setActiveTab('licencias')} />
          
          <div className="mt-4 mb-2">
            <NavItem icon={<UserCircle size={20} />} label="VISTA CLIENTE (Demo)" isActive={activeTab === 'cliente'} onClick={() => setActiveTab('cliente')} />
          </div>

          {/* Separador */}
          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inteligencia Artificial</p>
          </div>
          
          <NavItem icon={<Bot size={20} />} label="Centro de Anomalías" isActive={activeTab === 'ia'} onClick={() => setActiveTab('ia')} />
        </nav>

        {/* Configuración y Salida */}
        <div className="p-4 border-t border-white/10 space-y-1">
          <NavItem icon={<Settings size={20} />} label="Configuración" />
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-400 hover:bg-white/5 hover:text-red-300"
          >
            <LogOut size={20} className="mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Barra Superior (Header) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          {/* Buscador */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar equipos, tickets, clientes..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
            </div>
          </div>

          {/* Perfil y Notificaciones */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center cursor-pointer">
              <UserCircle size={32} className="text-slate-400" />
              <div className="ml-3 hidden sm:block">
                <p className="text-sm font-medium text-slate-700 leading-none">Admin Soporte</p>
                <p className="text-xs text-slate-500 mt-1">Nivel 0</p>
              </div>
            </div>
          </div>
        </header>

        {/* Área de Trabajo (Vistas dinámicas) */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'cliente' && (
            <div className="absolute inset-0 z-50 bg-slate-50 overflow-auto">
              <ClientPortal />
            </div>
          )}
          {activeTab === 'ia' && (
            <div className="h-full flex flex-col max-w-5xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Centro de Anomalías (IA)</h1>
                <p className="text-slate-500 text-sm mt-1">Monitoreo y diagnóstico asistido por Llama 3.2</p>
              </div>
              
              {/* Aquí inyectamos tu Chatbot */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Chatbot mode="admin" />
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto h-full">
              <Dashboard />
            </div>
          )}

          {/* Aquí podemos agregar las demás vistas (Inventario, etc) más adelante */}
        </main>
      </div>
    </div>
  );
}

// Componente auxiliar para los botones del menú lateral
function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );
}

export default App;