import React, { useState } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'bot', text: '¡Hola! Soy la IA de Innotrev. Cuéntame tu problema.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(null); // <--- NUEVO ESTADO

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setPriority(null); // Limpiamos prioridad anterior

    try {
      const token = localStorage.getItem('token') || ''; 
      const response = await fetch('http://localhost:8000/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg.text })
      });

      if (!response.ok) throw new Error('Error en el servidor');
      const data = await response.json();
      
      // NUEVO: Guardamos la prioridad
      if (data.priority) {
        setPriority(data.priority);
      }
      
      const botMsg = { role: 'bot', text: data.response };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error de conexión.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      
      {/* Encabezado */}
      <div className="bg-blue-900 p-6 text-white flex items-center gap-4">
        <div className="bg-white p-2 rounded-full">
          <span className="text-2xl">🤖</span>
        </div>
        <div>
          <h2 className="font-bold text-xl">Asistente Virtual Innotrev</h2>
          <p className="text-blue-200 text-sm">Soporte técnico automatizado nivel 1</p>
        </div>
      </div>

      {/* --- AQUÍ ESTÁ LA ALERTA VISUAL (NUEVO) --- */}
      {priority === 'ALTA' && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4 mt-4 rounded shadow-sm animate-pulse">
          <p className="font-bold">⚠️ PRIORIDAD CRÍTICA DETECTADA</p>
          <p className="text-sm">Se ha notificado a un ingeniero senior inmediatamente.</p>
        </div>
      )}
      {priority === 'MEDIA' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mx-4 mt-4 rounded shadow-sm">
          <p className="font-bold">⚠️ Atención Requerida</p>
          <p className="text-sm">Un técnico revisará tu caso en breve.</p>
        </div>
      )}
      {/* ------------------------------------------ */}

      {/* Área de Mensajes */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-base shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-400 italic ml-4">Analizando problema...</div>}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
        <input
          type="text"
          className="flex-1 bg-gray-100 border-0 rounded-xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          placeholder="Describe tu problema aquí..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button 
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Chatbot;