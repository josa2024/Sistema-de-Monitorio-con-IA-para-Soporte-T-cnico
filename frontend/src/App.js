import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Chatbot from './components/Chatbot';
import Login from './components/Login';
import './index.css';

// Componente para proteger rutas (si no hay token, te manda al login)
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Pública: Login */}
        <Route path="/" element={<Login />} />
        
        {/* Ruta Privada: Dashboard con Chatbot */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <div className="min-h-screen bg-slate-50 flex flex-col">
              {/* Barra Superior */}
              <nav className="bg-white shadow p-4 flex justify-between items-center px-8">
                <h1 className="text-xl font-bold text-blue-900">INNOTREV Support AI</h1>
                <button 
                  onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                  className="text-red-500 font-medium hover:underline"
                >
                  Cerrar Sesión
                </button>
              </nav>

              {/* Contenido Principal */}
              <main className="flex-1 p-8 flex flex-col items-center">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold text-gray-800">Hola, ¿cómo podemos ayudarte hoy?</h2>
                  <p className="text-gray-500">Nuestro asistente virtual está listo para resolver tus dudas.</p>
                </div>
                
                {/* Aquí mostramos tu Chatbot en grande */}
                <Chatbot />
              </main>
            </div>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;