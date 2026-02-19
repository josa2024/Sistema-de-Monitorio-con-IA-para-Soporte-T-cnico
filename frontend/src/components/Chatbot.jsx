import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ShieldAlert, AlertCircle, User } from 'lucide-react';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Sistemas en línea. Soy la IA de soporte técnico de Innotrev. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(null);
  
  // Referencia para el auto-scroll
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, priority]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setPriority(null);

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
      
      if (data.priority) {
        setPriority(data.priority);
      }
      
      const botMsg = { role: 'bot', text: data.response };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error de conexión con el servidor IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Encabezado Integrado */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">Terminal de Diagnóstico IA</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Llama 3.2 Activo
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Dinámicas */}
      {priority === 'ALTA' && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-start gap-3 animate-pulse">
          <ShieldAlert className="text-red-600 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-red-700 text-sm">NIVEL DE PRIORIDAD: CRÍTICA</p>
            <p className="text-red-600 text-xs mt-0.5">La IA ha detectado una anomalía severa. Los protocolos de emergencia están listos.</p>
          </div>
        </div>
      )}
      {priority === 'MEDIA' && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-start gap-3">
          <AlertCircle className="text-amber-600 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-amber-700 text-sm">NIVEL DE PRIORIDAD: MEDIA</p>
            <p className="text-amber-600 text-xs mt-0.5">Se requiere revisión técnica de rutina.</p>
          </div>
        </div>
      )}

      {/* Área de Mensajes */}
      <div className="flex-1 p-6 overflow-y-auto bg-white space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            
            {/* Avatar */}
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Burbuja */}
            <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {/* Indicador de "Escribiendo..." */}
        {loading && (
          <div className="flex gap-4 flex-row">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de Input */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            className="w-full bg-white border border-slate-300 rounded-full pl-5 pr-14 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
            placeholder="Describe la falla técnica o el reporte del cliente..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button 
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2 rounded-full transition-colors"
          >
            <Send size={18} className={loading ? 'opacity-0' : 'opacity-100 ml-0.5'} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;