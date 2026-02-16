import React from 'react';
import Chatbot from './components/Chatbot';
import './index.css'; // Asegura que Tailwind cargue

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      
      {/* Barra de Navegación (Simulada) */}
      <nav className="bg-white shadow-sm py-4 px-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-900">INNOTREV</h1>
        <div className="space-x-6 text-gray-600">
          <a href="#" className="hover:text-blue-600">Inicio</a>
          <a href="#" className="text-blue-600 font-semibold">Soporte</a>
          <a href="#" className="hover:text-blue-600">Mis Tickets</a>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">¿En qué podemos ayudarte?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Nuestro sistema de IA puede resolver la mayoría de los problemas comunes de hardware y software al instante.
            <br/>Si no lo logramos, te conectaremos con un técnico humano.
          </p>
        </div>

        {/* AQUÍ VA TU CHATBOT CENTRADO */}
        <Chatbot />

        <div className="mt-12 text-gray-400 text-sm">
          ¿Prefieres hablar con un humano? <a href="#" className="text-blue-500 underline">Saltar IA y crear Ticket</a>
        </div>

      </main>
    </div>
  );
}

export default App;