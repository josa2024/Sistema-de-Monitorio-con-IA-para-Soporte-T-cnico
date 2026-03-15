import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ShieldAlert, User, Ticket, Sparkles, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = ({ mode = 'admin', isAuthenticated, onAuthRequest }) => {
  const [messages, setMessages] = useState([
    { 
      role: 'bot', 
      text: mode === 'admin' 
        ? 'Sistemas en línea. Soy la IA de diagnóstico técnico de Innotrev.' 
        : 'Hola. Soy el agente de IA de Innotrev. Estoy aquí para resolver problemas con tus equipos Zebra, Honeywell o infraestructura RFID. ¿En qué te ayudo?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(null);
  const [showTicketButton, setShowTicketButton] = useState(false);
  const [lastUserIssue, setLastUserIssue] = useState('');
  const [category, setCategory] = useState('General / Otro'); 

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, loading, showTicketButton]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLastUserIssue(input);
    setInput('');
    setLoading(true);
    setPriority(null);
    setCategory('General / Otro'); 
    setShowTicketButton(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      const response = await fetch('http://127.0.0.1:8000/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg.text })
      });

      if (!response.ok) throw new Error('Error en el servidor');
      const data = await response.json();
      
      if (data.priority) {
        setPriority(data.priority);
        if (mode === 'cliente' && (data.priority === 'ALTA' || data.priority === 'CRITICA')) {
          setShowTicketButton(true);
        }
      }
      if (data.category) setCategory(data.category);
      
      setMessages((prev) => [...prev, { role: 'bot', text: data.response }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ No se pudo establecer conexión con el cerebro de procesamiento.' }]);
    } finally { setLoading(false); }
  };

  const handleCreateTicket = async () => {
    if (!isAuthenticated && onAuthRequest) {
      onAuthRequest();
      return;
    }

    setLoading(true);
    setShowTicketButton(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      const eqResponse = await fetch('http://127.0.0.1:8000/api/v1/equipo/', { headers: { 'Authorization': `Bearer ${token}` } });
      const equipos = await eqResponse.json();

      if (!equipos || equipos.length === 0) {
         setMessages((prev) => [...prev, { role: 'bot', text: '❌ No tienes equipos activos en tu cuenta para vincular este reporte.' }]);
         setLoading(false); return;
      }

      const ticketData = {
        titulo: "Reporte automático vía IA",
        descripcion: `Reporte Original: "${lastUserIssue}". \nDiagnóstico IA: ${priority}`,
        equipo_id: equipos[0].id,
        categoria: category 
      };

      const response = await fetch('http://127.0.0.1:8000/api/v1/tickets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'bot', text: '✅ He generado un ticket oficial con Prioridad Alta. Nuestro equipo de soporte ya fue notificado y se comunicará contigo a la brevedad. Puedes ver el estado en tu pestaña "Mis Tickets".' }]);
      } else { throw new Error("No se pudo crear"); }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ Ocurrió un error al intentar registrar el ticket en tu cuenta.' }]);
    } finally { setLoading(false); }
  };

  const typingDotVariants = {
    initial: { y: 0, opacity: 0.5 },
    animate: { y: -3, opacity: 1, transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative">
      
      {/* HEADER PREMIUM */}
      <div className="bg-[#0b1437] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-inner border border-white/10">
              <Bot size={24} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0b1437] rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="font-black text-lg tracking-wide flex items-center gap-2">
              Innotrev AI <Sparkles size={16} className="text-blue-300" />
            </h2>
            <p className="text-blue-200/80 text-xs font-medium">Asistente de Nivel 0 • Respuestas inmediatas</p>
          </div>
        </div>
      </div>

      {/* NOTIFICACIÓN ADMIN (Si aplica) */}
      <AnimatePresence>
        {mode === 'admin' && priority === 'ALTA' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-500 text-white px-6 py-3 flex items-center gap-3 shadow-inner">
            <ShieldAlert size={20} className="animate-bounce" />
            <div>
               <p className="font-black text-xs uppercase tracking-widest">Nivel de Prioridad Crítica</p>
               <p className="text-xs font-medium opacity-90">Anomalía detectada. Se requiere intervención humana.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÁREA DE CHAT */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar relative">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} layout className={`flex gap-3 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Avatar Bot */}
              {msg.role === 'bot' && (
                <div className="w-8 h-8 bg-[#0b1437] rounded-full flex items-center justify-center shadow-sm shrink-0 border border-slate-200">
                  <Bot size={14} className="text-white" />
                </div>
              )}

              {/* Burbuja de Mensaje */}
              <div className={`px-5 py-3.5 text-[15px] shadow-sm max-w-[85%] sm:max-w-[75%] ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-[20px] rounded-br-sm font-medium' 
                : 'bg-white border border-slate-200/60 text-slate-700 rounded-[20px] rounded-bl-sm font-normal leading-relaxed'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Indicador de "Escribiendo..." */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-3 items-end">
              <div className="w-8 h-8 bg-[#0b1437] rounded-full flex items-center justify-center shadow-sm shrink-0"><Bot size={14} className="text-white" /></div>
              <div className="bg-white border border-slate-200/60 rounded-[20px] rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5 h-[48px]">
                <motion.span variants={typingDotVariants} initial="initial" animate="animate" className="w-1.5 h-1.5 bg-slate-400 rounded-full"></motion.span>
                <motion.span variants={typingDotVariants} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full"></motion.span>
                <motion.span variants={typingDotVariants} initial="initial" animate="animate" transition={{ delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full"></motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TARJETA INTELIGENTE DE TICKET (Reemplaza el botón rojo) */}
        <AnimatePresence>
          {mode === 'cliente' && showTicketButton && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pl-11 pr-4">
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-lg shadow-amber-900/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10"></div>
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                  <div>
                    <h4 className="font-black text-slate-800">Falla de hardware detectada</h4>
                    <p className="text-sm text-slate-500 font-medium leading-snug mt-1">Este problema requiere atención humana. ¿Deseas escalar esto a un ingeniero de Innotrev?</p>
                  </div>
                </div>
                <button onClick={handleCreateTicket} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl transition-all shadow-md hover:shadow-amber-500/30 flex items-center justify-center gap-2 mt-4">
                  <Ticket size={18} /> Escalar a Soporte Técnico
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* ÁREA DE INPUT FLOTANTE */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-10 shrink-0">
        <div className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            className="w-full bg-slate-100 border border-transparent rounded-full pl-6 pr-14 py-4 text-[15px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 shadow-inner"
            placeholder="Escribe tu problema de forma natural aquí..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button 
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-2.5 bg-[#0b1437] hover:bg-blue-600 disabled:bg-slate-300 text-white w-10 h-10 rounded-full transition-all shadow-md flex items-center justify-center"
          >
            <Send size={16} className={`ml-0.5 ${loading ? 'opacity-0' : 'opacity-100'}`} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">La IA puede cometer errores. Verifica el estado de tu equipo físico.</p>
      </div>
    </div>
  );
};

export default Chatbot;