import React, { useState } from 'react';
import { ArrowRight, Bot, ShieldCheck, Cpu, Smartphone, LogIn, Menu, X } from 'lucide-react';
import Chatbot from './Chatbot'; // Importamos tu Chatbot IA
import { motion } from 'framer-motion';

const PublicWeb = ({ onLoginClick }) => {
  const [currentView, setCurrentView] = useState('home'); // 'home' o 'support'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* MENÚ DE NAVEGACIÓN SUPERIOR */}
      <nav className="bg-[#1a2654] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setCurrentView('home')}
          >
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-bold text-xl">IN</div>
            <span className="font-bold text-2xl tracking-widest">INNOTREV</span>
          </div>

          {/* Menú Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setCurrentView('home')} className={`text-sm font-medium hover:text-blue-400 transition-colors ${currentView === 'home' ? 'text-blue-400' : 'text-slate-300'}`}>Inicio</button>
            <a href="https://www.innotrev.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors">Soluciones RFID</a>
            <button onClick={() => setCurrentView('support')} className={`text-sm font-medium flex items-center gap-2 hover:text-blue-400 transition-colors ${currentView === 'support' ? 'text-blue-400' : 'text-slate-300'}`}>
              <Bot size={18} /> Soporte IA
            </button>
            <div className="w-px h-6 bg-white/20 mx-2"></div>
            <button onClick={onLoginClick} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md">
              <LogIn size={18} /> Portal Cliente
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO DINÁMICO */}
      <main className="flex-1 flex flex-col">
        {currentView === 'home' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            {/* Sección Hero */}
            <div className="bg-gradient-to-b from-[#1a2654] to-slate-900 text-white py-24 px-6 text-center">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl font-black mb-6 leading-tight">Soluciones Tecnológicas para tu Empresa</h1>
                <p className="text-xl text-slate-300 mb-10">Optimiza tus operaciones con hardware de uso rudo, soluciones RFID y soporte potenciado por Inteligencia Artificial.</p>
                <button onClick={() => setCurrentView('support')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold flex items-center gap-3 mx-auto transition-all shadow-lg shadow-blue-900/50">
                  Probar Asistente IA <ArrowRight size={20} />
                </button>
              </div>
            </div>

            {/* Características */}
            <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Smartphone size={32} /></div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Hardware Especializado</h3>
                <p className="text-slate-500">Equipos de grado industrial como Handhelds Zebra y terminales Honeywell.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><ShieldCheck size={32} /></div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Garantía Extendida</h3>
                <p className="text-slate-500">Gestión y control de licencias de software y pólizas de hardware en un solo lugar.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Cpu size={32} /></div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Integración RFID</h3>
                <p className="text-slate-500">Visibilidad total de tu cadena de suministro con tecnología de radiofrecuencia.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 max-w-5xl mx-auto w-full p-6 flex flex-col h-[calc(100vh-80px)]">
            <div className="text-center mb-8 mt-4 shrink-0">
              <h2 className="text-3xl font-black text-slate-800">Centro de Soporte Inteligente</h2>
              <p className="text-slate-500 mt-2">Habla con nuestra IA para resolver problemas técnicos en segundos.</p>
            </div>
            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Aquí montamos el Chatbot en modo cliente/público */}
              <Chatbot mode="cliente" />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default PublicWeb;