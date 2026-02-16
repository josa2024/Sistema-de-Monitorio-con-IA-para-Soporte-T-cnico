import React, { useState } from 'react';

const Chatbot = () => {
  // Ya no necesitamos isOpen porque siempre estará visible
  const [messages, setMessages] = useState([
    { role: 'bot', text: '¡Hola! Soy la IA de Innotrev. Antes de agendar una cita, cuéntame tu problema. Quizás pueda solucionarlo ahora mismo.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

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
      
      const botMsg = { role: 'bot', text: data.response };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error de conexión. Por favor intenta más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    // CAMBIO CLAVE: Quitamos 'fixed' y usamos un contenedor centrado
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