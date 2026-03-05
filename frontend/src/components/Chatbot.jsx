import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ShieldAlert, User, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = ({ mode = 'admin' }) => {
  const [messages, setMessages] = useState([
    { role: 'bot', text: mode === 'admin' ? 'Sistemas en línea. Soy la IA de soporte técnico de Innotrev.' : 'Hola, soy el asistente virtual de Innotrev. ¿En qué puedo ayudarte hoy con tu equipo?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(null);
  const [showTicketButton, setShowTicketButton] = useState(false);
  const [lastUserIssue, setLastUserIssue] = useState('');
  
  // AQUÍ ESTÁ LA VARIABLE FALTANTE:
  const [category, setCategory] = useState('General / Otro'); 

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, showTicketButton]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLastUserIssue(input);
    setInput('');
    setLoading(true);
    setPriority(null);
    setCategory('General / Otro'); // Reiniciamos la categoría por defecto
    setShowTicketButton(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      const response = await fetch('http://127.0.0.1:8000/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg.text })
      });

      if (!response.ok) throw new Error('Error en el servidor');
      const data = await response.json();
      
      // Capturamos la prioridad
      if (data.priority) {
        setPriority(data.priority);
        if (mode === 'client' && (data.priority === 'ALTA' || data.priority === 'CRITICA')) {
          setShowTicketButton(true);
        }
      }

      // Capturamos la categoría que extrajo la IA
      if (data.category) {
        setCategory(data.category);
      }
      
      const botMsg = { role: 'bot', text: data.response };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ Error de conexión con el cerebro de Llama 3.2. Verifica que Ollama esté corriendo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    setLoading(true);
    setShowTicketButton(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      
      const eqResponse = await fetch('http://127.0.0.1:8000/api/v1/equipo/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const equipos = await eqResponse.json();

      if (!equipos || equipos.length === 0) {
         setMessages((prev) => [...prev, { role: 'bot', text: '❌ No tienes equipos vinculados a tu cuenta para reportar fallas. Contacta a Innotrev.' }]);
         setLoading(false);
         return;
      }

      const equipoAsignadoId = equipos[0].id; 

      const ticketData = {
        titulo: "Reporte automático vía IA",
        descripcion: `Falla reportada por el usuario: "${lastUserIssue}". \nDiagnóstico previo IA: ${priority}`,
        equipo_id: equipoAsignadoId,
        categoria: category // ¡Ahora sí existe y se envía al backend!
      };

      const response = await fetch('http://127.0.0.1:8000/api/v1/tickets/', {
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
          text: '✅ He generado un ticket de soporte técnico (Prioridad: Alta) con los detalles de tu problema. Un ingeniero de Innotrev lo está revisando en este momento.' 
        }]);
      } else {
        throw new Error("No se pudo crear");
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ Hubo un error al intentar crear el ticket en nuestro sistema.' }]);
    } finally {
      setLoading(false);
    }
  };

  const bubbleVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", damping: 22, stiffness: 300 }
    }
  };

  const typingDotVariants = {
    initial: { y: 0 },
    animate: { y: -4, transition: { duration: 0.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      <div className={`px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10 ${
        mode === 'admin' ? 'bg-slate-50/90 backdrop-blur-md' : 'bg-gradient-to-r from-blue-600 to-blue-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shadow-sm ${mode === 'admin' ? 'bg-blue-600 text-white' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
            <Bot size={22} />
          </div>
          <div>
            <h2 className={`font-bold text-lg leading-tight tracking-wide ${mode === 'admin' ? 'text-slate-800' : 'text-white'}`}>
              {mode === 'admin' ? 'Terminal de Diagnóstico IA' : 'Asistente Virtual Innotrev'}
            </h2>
            <div className={`flex items-center gap-2 text-xs mt-0.5 font-medium ${mode === 'admin' ? 'text-slate-500' : 'text-blue-100'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode === 'admin' ? 'bg-emerald-400' : 'bg-white'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${mode === 'admin' ? 'bg-emerald-500' : 'bg-white'}`}></span>
              </span>
              {mode === 'admin' ? 'Llama 3.2 Activo' : 'En línea - Respuestas instantáneas'}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mode === 'admin' && priority === 'ALTA' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-start gap-3 overflow-hidden"
          >
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <ShieldAlert className="text-red-600 mt-0.5" size={20} />
            </motion.div>
            <div>
              <p className="font-bold text-red-700 text-sm tracking-wide">NIVEL DE PRIORIDAD: CRÍTICA</p>
              <p className="text-red-600 text-xs mt-0.5 font-medium">La IA ha detectado una anomalía severa que requiere atención humana.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-5 scroll-smooth relative">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div 
              key={index} 
              variants={bubbleVariants}
              initial="hidden"
              animate="visible"
              layout
              className={`flex gap-3 items-end ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm z-10 ${
                msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className={`max-w-[80%] px-5 py-3.5 text-[15px] shadow-sm relative ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex gap-3 items-end flex-row"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                <Bot size={15} />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm flex items-center gap-1.5 h-[46px]">
                <motion.span variants={typingDotVariants} initial="initial" animate="animate" className="w-1.5 h-1.5 bg-slate-400 rounded-full block"></motion.span>
                <motion.span variants={typingDotVariants} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full block"></motion.span>
                <motion.span variants={typingDotVariants} initial="initial" animate="animate" transition={{ delay: 0.3 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full block"></motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mode === 'client' && showTicketButton && (
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex justify-start pl-11"
            >
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateTicket}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Ticket size={18} />
                Generar Ticket de Soporte de Emergencia
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 z-10 relative">
        <div className="relative flex items-center w-full">
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-6 pr-14 py-3.5 text-[15px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner"
            placeholder={mode === 'admin' ? "Consultar estado del sistema..." : "Describe tu problema de forma natural..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-full transition-colors shadow-sm"
          >
            <Send size={18} className={loading ? 'opacity-0' : 'opacity-100 ml-0.5'} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;