import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ShieldAlert, AlertCircle, User, Ticket } from 'lucide-react';

const Chatbot = ({ mode = 'admin' }) => {
  const [messages, setMessages] = useState([
    { role: 'bot', text: mode === 'admin' ? 'Sistemas en línea. Soy la IA de soporte técnico de Innotrev.' : 'Hola, soy el asistente virtual de Innotrev. ¿En qué puedo ayudarte hoy con tu equipo?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(null);
  
  // Nuevo estado para mostrar el botón de crear ticket si la IA no pudo resolverlo o es crítico
  const [showTicketButton, setShowTicketButton] = useState(false);
  // Guardamos el último mensaje del usuario para usarlo como descripción del ticket
  const [lastUserIssue, setLastUserIssue] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, priority, showTicketButton]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLastUserIssue(input); // Guardamos lo que escribió para el ticket
    setInput('');
    setLoading(true);
    setPriority(null);
    setShowTicketButton(false);

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
        // Si el cliente tiene un problema Crítico o Alto, le ofrecemos abrir ticket
        if (mode === 'client' && (data.priority === 'ALTA' || data.priority === 'CRITICA')) {
          setShowTicketButton(true);
        }
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

  // FUNCIÓN PARA CREAR EL TICKET AUTOMÁTICAMENTE
  const handleCreateTicket = async () => {
    setLoading(true);
    setShowTicketButton(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      
      // Creamos el JSON con el formato exacto que pide el backend (TicketCreate)
      const ticketData = {
        titulo: "Reporte automático vía IA",
        descripcion: `Falla reportada por el usuario: "${lastUserIssue}". \nDiagnóstico previo IA: ${priority}`,
        equipo_id: 1 // TODO: En una versión final, este ID lo sacaríamos de un selector del cliente. Por ahora forzamos el 1.
      };

      const response = await fetch('http://localhost:8000/api/v1/tickets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        setMessages((prev) => [...prev, { 
          role: 'bot', 
          text: '✅ He generado un ticket de soporte técnico (Prioridad: Alta) con los detalles de tu problema. Un ingeniero de Innotrev se pondrá en contacto contigo a la brevedad.' 
        }]);
      } else {
        throw new Error("No se pudo crear");
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ Hubo un error al intentar crear el ticket en nuestro sistema. Por favor intenta de nuevo más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Encabezado Dinámico */}
      <div className={`px-6 py-4 border-b border-slate-200 flex items-center justify-between ${
        mode === 'admin' ? 'bg-slate-50' : 'bg-blue-600'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${mode === 'admin' ? 'bg-blue-600 text-white' : 'bg-white/20 text-white'}`}>
            <Bot size={20} />
          </div>
          <div>
            <h2 className={`font-bold text-lg leading-tight ${mode === 'admin' ? 'text-slate-800' : 'text-white'}`}>
              {mode === 'admin' ? 'Terminal de Diagnóstico IA' : 'Asistente Virtual Innotrev'}
            </h2>
            <div className={`flex items-center gap-2 text-xs mt-0.5 ${mode === 'admin' ? 'text-slate-500' : 'text-blue-100'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode === 'admin' ? 'bg-emerald-400' : 'bg-white'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${mode === 'admin' ? 'bg-emerald-500' : 'bg-white'}`}></span>
              </span>
              {mode === 'admin' ? 'Llama 3.2 Activo' : 'En línea - Respuestas instantáneas'}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Admin */}
      {mode === 'admin' && priority === 'ALTA' && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-start gap-3 animate-pulse">
          <ShieldAlert className="text-red-600 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-red-700 text-sm">NIVEL DE PRIORIDAD: CRÍTICA</p>
            <p className="text-red-600 text-xs mt-0.5">La IA ha detectado una anomalía severa.</p>
          </div>
        </div>
      )}

      {/* Área de Mensajes */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 text-sm shadow-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* BOTÓN MÁGICO DE TICKET PARA EL CLIENTE */}
        {mode === 'client' && showTicketButton && (
          <div className="flex justify-start pl-12">
            <button 
              onClick={handleCreateTicket}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm animate-in fade-in slide-in-from-bottom-2"
            >
              <Ticket size={16} />
              Generar Ticket de Soporte Técnico
            </button>
          </div>
        )}

        {loading && (
          <div className="flex gap-4 flex-row">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-center w-full">
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-5 pr-14 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            placeholder="Describe tu problema aquí..."
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