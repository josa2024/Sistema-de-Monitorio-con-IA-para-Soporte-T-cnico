import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, ShieldAlert, Ticket, Sparkles, AlertTriangle, RotateCcw, Zap, Headphones, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_ACTIONS = [
  { emoji: "💳", title: "CardStudio: Instalar/Activar", prompt: "Necesito ayuda con la descarga, instalación y activación de la licencia de CardStudio 2.0." },
  { emoji: "🖨️", title: "Cargar Zebra ZC100/300", prompt: "Explícame cómo hacer la carga de tarjetas y poner el ribbon en una impresora Zebra ZC100 o ZC300." },
  { emoji: "🏷️", title: "ZebraDesigner: Instalar", prompt: "Ayúdame con la descarga de Zebra Designer 3 Essentials y a diseñar una etiqueta sencilla." },
  { emoji: "🔴", title: "Calibrar Impresora (Luz Roja)", prompt: "Mi impresora de escritorio Zebra tiene luz roja o está descalibrada. Necesito calibrarla." }
];

const Chatbot = ({ 
  mode = 'admin', 
  isAuthenticated, 
  onAuthRequest,
  messages,          
  setMessages,       
  input,             
  setInput,          
  loading,           
  setLoading,        
  priority,          
  setPriority,       
  showTicketButton,  
  setShowTicketButton,
  lastUserIssue,     
  setLastUserIssue,  
  category,          
  setCategory,
  selectedProduct = null // NUEVA PROP: Recibe el producto del catálogo
}) => {
  
  const messagesEndRef = useRef(null);
  const [showCasualForm, setShowCasualForm] = useState(false);
  const [casualData, setCasualData] = useState({ nombre: '', contacto: '', equipo: '' });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, loading, showTicketButton, showCasualForm]);

  // NUEVO EFECTO: Ajustar el mensaje de bienvenida si viene del catálogo
  useEffect(() => {
    if (selectedProduct && mode === 'cliente') {
      setMessages([{ 
        role: 'bot', 
        text: `Hola. Soy el agente de IA de Innotrev. Veo que te interesa consultar sobre el equipo **${selectedProduct}**. \n\n¿Tienes alguna duda técnica, deseas cotizarlo o necesitas ayuda para su instalación?` 
      }]);
      // Pre-configuramos el campo oculto por si el cliente pide ticket inmediatamente
      setLastUserIssue(`Consulta generada desde el catálogo para el equipo: ${selectedProduct}`);
      // Llenamos por defecto el formulario de invitado con el equipo
      setCasualData(prev => ({ ...prev, equipo: selectedProduct }));
    }
  }, [selectedProduct, mode, setMessages, setLastUserIssue]);

  const handleResetChat = () => {
    setMessages([{ 
      role: 'bot', 
      text: mode === 'admin' 
        ? 'Sistemas en línea. Soy la IA de diagnóstico técnico de Innotrev.' 
        : (selectedProduct 
            ? `Hola. Soy el agente de IA de Innotrev. Veo que te interesa consultar sobre el equipo **${selectedProduct}**. ¿En qué te ayudo?`
            : 'Hola. Soy el agente de IA de Innotrev. Estoy aquí para resolver problemas con tus equipos Zebra, Honeywell o infraestructura RFID. ¿En qué te ayudo?')
    }]);
    setInput('');
    setPriority(null);
    setShowTicketButton(false);
    setShowCasualForm(false);
    setLastUserIssue('');
    setCategory('General / Otro');
  };

  const renderTextWithLinks = (text, role) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    const linkStyle = role === 'user' 
      ? "text-blue-200 font-bold underline hover:text-white transition-colors break-all" 
      : "text-blue-600 font-bold underline hover:text-blue-800 transition-colors break-all";

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={linkStyle}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const sendMessage = async (overrideText = null) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    if (!textToSend.trim()) return;

    // Si viene del catálogo y es el primer mensaje del usuario, le agregamos el contexto oculto para que la IA sepa de qué hablan
    let textForAI = textToSend;
    if (messages.length === 1 && selectedProduct) {
       textForAI = `Sobre el equipo ${selectedProduct}: ${textToSend}`;
    }

    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setLastUserIssue(textToSend);
    setInput(''); 
    
    setLoading(true); 
    setPriority(null);
    setCategory('General / Otro'); 
    setShowTicketButton(false);
    setShowCasualForm(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      const response = await fetch('http://localhost:8000/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: textForAI }) // Enviamos el texto con contexto a la IA
      });

      if (!response.ok) throw new Error('Error en el servidor');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botText = ""; 
      let isFirstChunk = true; 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.replace('data: ', '');
              const data = JSON.parse(dataStr);
              
              if (data.type === 'metadata') {
                if (data.priority) {
                  setPriority(data.priority);
                  if (mode === 'cliente' && (data.priority === 'ALTA' || data.priority === 'CRITICA')) {
                    setShowTicketButton(true);
                  }
                }
                if (data.category) setCategory(data.category);
              } 
              else if (data.type === 'chunk') {
                botText += data.text;
                if (isFirstChunk) {
                  setLoading(false);
                  isFirstChunk = false;
                  setMessages(prev => [...prev, { role: 'bot', text: botText }]);
                } else {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].text = botText;
                    return newMsgs;
                  });
                }
              }
            } catch (e) {}
          }
        }
      }
      if (isFirstChunk) setLoading(false);

    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ No se pudo establecer conexión con el cerebro de procesamiento.' }]);
      setLoading(false);
    }
  };

  const handleCreateTicket = async (isDirect = false) => {
    if (!isAuthenticated) {
      setShowCasualForm(true);
      setShowTicketButton(false);
      return;
    }

    setLoading(true);
    setShowTicketButton(false);

    try {
      const token = localStorage.getItem('token') || ''; 
      const eqResponse = await fetch('http://localhost:8000/api/v1/equipo/', { headers: { 'Authorization': `Bearer ${token}` } });
      const equipos = await eqResponse.json();

      if (!equipos || equipos.length === 0) {
         setMessages((prev) => [...prev, { role: 'bot', text: '❌ No tienes equipos activos en tu cuenta para vincular este reporte.' }]);
         setLoading(false); return;
      }

      const finalPriority = isDirect ? "BAJA" : (priority || "MEDIA");
      const finalIssue = isDirect ? "El cliente solicitó creación directa de ticket sin diagnóstico." : lastUserIssue;
      const finalCategory = isDirect ? "Atención General" : category;

      const ticketData = {
        titulo: isDirect ? "Solicitud Directa de Soporte" : "Reporte automático vía IA",
        descripcion: `Reporte Original: "${finalIssue}". \nDiagnóstico IA: ${finalPriority}`,
        equipo_id: equipos[0].id,
        cliente_id: equipos[0].cliente_id, 
        categoria: finalCategory,
        prioridad: finalPriority
      };

      const response = await fetch('http://localhost:8000/api/v1/tickets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        if (isDirect) {
           setMessages((prev) => [
             ...prev, 
             { role: 'user', text: "Quiero hablar directamente con un humano y abrir un ticket." },
             { role: 'bot', text: '✅ ¡Entendido! He generado un ticket de atención directa. Nuestro equipo lo revisará y se pondrá en contacto contigo en breve para programar una llamada.' }
           ]);
        } else {
           setMessages((prev) => [...prev, { role: 'bot', text: '✅ He generado un ticket oficial. Nuestro equipo de soporte ya fue notificado y se comunicará contigo a la brevedad para brindarte seguimiento.' }]);
        }
      } else { 
        throw new Error("No se pudo crear el ticket"); 
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ Ocurrió un error al intentar registrar el ticket en tu cuenta.' }]);
    } finally { setLoading(false); }
  };

  const handleSubmitCasualTicket = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowCasualForm(false);

    try {
      const finalPriority = priority || "MEDIA";
      const finalIssue = lastUserIssue || "El cliente omitió el chat y solicitó contacto directo.";
      
      const response = await fetch('http://localhost:8000/api/v1/tickets/casual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: casualData.nombre,
          contacto: casualData.contacto,
          equipo: casualData.equipo,
          problema: finalIssue,
          prioridad: finalPriority,
          categoria: category || "General"
        })
      });

      if (response.ok) {
        setMessages((prev) => [
          ...prev, 
          { role: 'bot', text: `✅ ¡Listo, ${casualData.nombre}! He generado tu solicitud como invitado. Nuestro equipo la analizará y te contactará vía ${casualData.contacto} a la brevedad.` }
        ]);
        setCasualData({ nombre: '', contacto: '', equipo: '' }); 
      } else {
        throw new Error("Error en servidor");
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', text: '❌ Hubo un problema al crear tu reporte invitado. Por favor intenta más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#f8fafc] relative overflow-hidden">
      
      {/* HEADER PREMIUM */}
      <div className="bg-[#0b1437] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md z-20">
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
            <p className="text-blue-200/80 text-xs font-medium">Asistente y Soporte Inmediato</p>
          </div>
        </div>
        
        {messages.length > 1 && (
           <button 
             onClick={handleResetChat} 
             className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors border border-white/10 shadow-sm"
             title="Reiniciar conversación"
           >
             <RotateCcw size={14} /> <span className="hidden sm:inline">Limpiar</span>
           </button>
        )}
      </div>

      <AnimatePresence>
        {mode === 'admin' && priority === 'ALTA' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="shrink-0 bg-red-500 text-white px-6 py-3 flex items-center gap-3 shadow-inner z-10">
            <ShieldAlert size={20} className="animate-bounce" />
            <div>
               <p className="font-black text-xs uppercase tracking-widest">Nivel de Prioridad Crítica</p>
               <p className="text-xs font-medium opacity-90">Anomalía detectada. Se requiere intervención humana.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÁREA DE CHAT */}
      <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#f8fafc] z-10">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} layout className={`flex gap-3 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'bot' && (
                <div className="w-8 h-8 bg-[#0b1437] rounded-full flex items-center justify-center shadow-sm shrink-0 border border-slate-200">
                  <Bot size={14} className="text-white" />
                </div>
              )}

              <div className={`px-5 py-3.5 text-[15px] shadow-sm max-w-[85%] sm:max-w-[75%] ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-[20px] rounded-br-sm font-medium' 
                : 'bg-white border border-slate-200/60 text-slate-700 rounded-[20px] rounded-bl-sm font-normal leading-relaxed'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{renderTextWithLinks(msg.text, msg.role)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* --- OPCIONES INICIALES --- */}
        <AnimatePresence>
          {messages.length === 1 && !loading && mode === 'cliente' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ delay: 0.2 }}
              className="pl-11 pr-4 pt-2 pb-4 space-y-6"
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Headphones size={14} className="text-blue-500" /> Atención Humana Directa
                </p>
                <button
                  onClick={() => handleCreateTicket(true)}
                  className="w-full text-left bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center gap-4"
                >
                  <div className="bg-white p-3 rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                    <Ticket size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-[#0b1437] text-sm group-hover:text-blue-700 transition-colors">Solicitar Cotización o Ayuda</h4>
                    <p className="text-[12px] text-slate-600 font-medium mt-0.5">Crear solicitud directa para ser contactado por ventas o soporte.</p>
                  </div>
                </button>
              </div>

              {!selectedProduct && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" /> Soluciones Rápidas Frecuentes
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {QUICK_ACTIONS.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(action.prompt)}
                        className="text-left bg-white border border-blue-100 hover:border-blue-400 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-start gap-3"
                      >
                        <span className="text-2xl mt-0.5">{action.emoji}</span>
                        <div>
                          <h4 className="font-bold text-[#0b1437] text-[13px] group-hover:text-blue-600 transition-colors leading-tight mb-1">{action.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{action.prompt}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ANIMACIÓN DE CARGA PREMIUM */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-3 items-end">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shrink-0 border border-white/20">
                <Bot size={14} className="text-white animate-pulse" />
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-[20px] rounded-bl-sm px-5 py-4 shadow-md flex items-center gap-2 h-[48px] backdrop-blur-sm">
                <span className="text-sm font-medium text-blue-700">Pensando</span>
                <div className="flex gap-1">
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }} className="w-2 h-2 bg-blue-500 rounded-full"></motion.span>
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2, ease: "easeInOut" }} className="w-2 h-2 bg-indigo-500 rounded-full"></motion.span>
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4, ease: "easeInOut" }} className="w-2 h-2 bg-purple-500 rounded-full"></motion.span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FORMULARIO PARA CLIENTES CASUALES */}
        <AnimatePresence>
          {showCasualForm && (
            <motion.div initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="pl-11 pr-4">
              <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10"></div>
                <div className="flex items-start gap-3 mb-4">
                  <UserCircle className="text-blue-500 shrink-0" size={24} />
                  <div>
                    <h4 className="font-black text-slate-800">Atención Personalizada</h4>
                    <p className="text-xs text-slate-500 font-medium leading-snug mt-1">Ingresa tus datos y un agente te contactará sobre el equipo seleccionado.</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitCasualTicket} className="space-y-3">
                  <input type="text" required placeholder="Tu Nombre Completo" value={casualData.nombre} onChange={e => setCasualData({...casualData, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
                  <input type="text" required placeholder="Correo electrónico o Teléfono" value={casualData.contacto} onChange={e => setCasualData({...casualData, contacto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
                  <input type="text" required placeholder="Modelo de tu equipo" value={casualData.equipo} onChange={e => setCasualData({...casualData, equipo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
                  
                  <div className="flex gap-2 mt-4 pt-2">
                    <button type="button" onClick={() => setShowCasualForm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition-all text-sm">Cancelar</button>
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-md">Enviar Datos</button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mode === 'cliente' && showTicketButton && !showCasualForm && (
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
                <button onClick={() => handleCreateTicket(false)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl transition-all shadow-md hover:shadow-amber-500/30 flex items-center justify-center gap-2 mt-4">
                  <Ticket size={18} /> Escalar a Soporte Técnico
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-20 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            className="w-full bg-slate-100 border border-transparent rounded-full pl-6 pr-14 py-4 text-[15px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 shadow-inner"
            placeholder="O escribe tu duda manualmente aquí..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading || showCasualForm}
          />
          <button 
            onClick={() => sendMessage()}
            disabled={loading || showCasualForm || !input.trim()}
            className="absolute right-2.5 bg-[#0b1437] hover:bg-blue-600 disabled:bg-slate-300 text-white w-10 h-10 rounded-full transition-all shadow-md flex items-center justify-center"
          >
            <Send size={16} className={`ml-0.5 ${loading ? 'opacity-0' : 'opacity-100'}`} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">La IA te asesora en preventa y soporte. Confirma la información con un agente humano.</p>
      </div>
    </div>
  );
};

export default Chatbot;