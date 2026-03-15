import React, { useState } from 'react';
import { Mail, Lock, User, MapPin, Phone, Eye, EyeOff, ShieldCheck, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = ({ onLoginSuccess, onClose }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaChecked, setRecaptchaChecked] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', nombre: '', apellidos: '', direccion: '', telefono: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.email.includes('@')) {
      setError('El correo electrónico debe ser válido.');
      setIsLoading(false);
      return;
    }

    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) { setError('Las contraseñas no coinciden.'); setIsLoading(false); return; }
      if (!recaptchaChecked) { setError('Por favor, verifica el reCAPTCHA.'); setIsLoading(false); return; }
      
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: formData.nombre, apellidos: formData.apellidos, direccion: formData.direccion, telefono: formData.telefono, email: formData.email, password: formData.password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Error en el servidor');
        alert('✅ ¡Registro exitoso! Inicia sesión ahora.');
        setIsRegistering(false); 
      } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    } else {
      try {
        const formDataUrlEncoded = new URLSearchParams();
        formDataUrlEncoded.append('username', formData.email);
        formDataUrlEncoded.append('password', formData.password);

        const response = await fetch('http://127.0.0.1:8000/api/v1/login/access-token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formDataUrlEncoded
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Credenciales inválidas.');

        const role = data.role || (formData.email.includes('admin') ? 'ADMIN' : 'CLIENTE');
        const nombre = data.nombre || 'Cliente';
        onLoginSuccess(data.access_token, role, nombre);
      } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0b1437]/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-[420px] rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col max-h-full">
        
        {/* Botón Cerrar flotante */}
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors z-20">
          <X size={18} />
        </button>

        {/* Encabezado Limpio */}
        <div className="px-8 pt-10 pb-6 text-center relative z-10 shrink-0">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-[#0b1437] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-900/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-[#0b1437] tracking-tight">Bienvenido a Innotrev</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">Accede a tu panel de control de hardware</p>
        </div>

        <div className="px-8 pb-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Selector de Pestañas Estilo iOS */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 relative">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out ${isRegistering ? 'translate-x-full' : 'translate-x-0'}`}></div>
            <button type="button" onClick={() => { setIsRegistering(false); setError(''); }} className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${!isRegistering ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>Iniciar Sesión</button>
            <button type="button" onClick={() => { setIsRegistering(true); setError(''); }} className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${isRegistering ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>Crear Cuenta</button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 text-red-600 text-xs font-bold p-3.5 rounded-xl mb-6 border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0"></span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isRegistering && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input type="text" name="nombre" placeholder="Nombre" required onChange={handleInputChange} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
                    </div>
                    <div className="relative group">
                      <input type="text" name="apellidos" placeholder="Apellidos" required onChange={handleInputChange} className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
                    </div>
                  </div>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input type="text" name="direccion" placeholder="Dirección de envío" required onChange={handleInputChange} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input type="tel" name="telefono" placeholder="Número telefónico" required onChange={handleInputChange} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="email" name="email" placeholder="Correo electrónico institucional" required onChange={handleInputChange} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Contraseña de acceso" required onChange={handleInputChange} className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <AnimatePresence>
              {isRegistering && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="relative group pt-4">
                    <Lock className="absolute left-3.5 top-[calc(50%+8px)] -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirma tu contraseña" required onChange={handleInputChange} className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" />
                  </div>
                  
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" id="recaptcha" required checked={recaptchaChecked} onChange={(e) => setRecaptchaChecked(e.target.checked)} className="peer w-5 h-5 appearance-none border-2 border-slate-300 rounded cursor-pointer checked:bg-blue-600 checked:border-blue-600 transition-all" />
                        <CheckCircle2 size={14} className="text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                      <label htmlFor="recaptcha" className="text-sm font-medium text-slate-700 cursor-pointer select-none">No soy un robot</label>
                    </div>
                    <div className="flex flex-col items-center">
                      <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-6 opacity-80" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isRegistering && (
              <div className="flex justify-end pt-1">
                <button type="button" className="text-[13px] font-bold text-blue-600 hover:text-blue-800 transition-colors">¿Olvidaste tu contraseña?</button>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full bg-[#0b1437] hover:bg-blue-700 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-blue-900/20 hover:shadow-blue-600/30 transition-all flex justify-center items-center gap-2 group disabled:opacity-70">
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>{isRegistering ? 'Crear Cuenta Empresarial' : 'Ingresar al Portal'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;