import React, { useState } from 'react';
import { Mail, Lock, User, MapPin, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaChecked, setRecaptchaChecked] = useState(false);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellidos: '',
    direccion: '',
    telefono: ''
  });

  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };



const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.includes('@')) {
      setError('El correo electrónico debe contener un "@".');
      return;
    }

    if (isRegistering) {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (!recaptchaChecked) {
        setError('Por favor, verifica el reCAPTCHA de seguridad.');
        return;
      }
      
      // --- CONEXIÓN REAL AL BACKEND PARA REGISTRAR ---
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            direccion: formData.direccion,
            telefono: formData.telefono,
            email: formData.email,
            password: formData.password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Error al conectar con el servidor');
        }

        alert('✅ ¡Registro exitoso! Ahora puedes iniciar sesión con tu correo y contraseña.');
        setIsRegistering(false); // Cambia la vista a Iniciar Sesión automáticamente
        
      } catch (err) {
        setError(err.message);
      }

    } else {
      // --- CONEXIÓN REAL AL BACKEND PARA INICIAR SESIÓN ---
      try {
        const formDataUrlEncoded = new URLSearchParams();
        formDataUrlEncoded.append('username', formData.email);
        formDataUrlEncoded.append('password', formData.password);

        const response = await fetch('http://127.0.0.1:8000/api/v1/login/access-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formDataUrlEncoded
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error('Credenciales inválidas o el usuario no existe.');
        }

        // Si es exitoso, decodificamos el JWT para saber el rol (simulado por ahora si no viene en el token)
        // Pero tú ya estás devolviendo el rol al loguear.
        // Si tu backend no devuelve el rol en el login directamente, usamos el correo para rutear:
        const role = data.role || (formData.email.includes('admin') ? 'ADMIN' : 'CLIENTE');
const nombre = data.nombre || 'Cliente';
onLoginSuccess(data.access_token, role, nombre);

      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Esferas de fondo estilo Cristal para mantener la congruencia del diseño */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-emerald-400/30 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>

      <div className="bg-white/80 backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/60 relative z-10">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-br from-[#1a2654] to-blue-800 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/20">
            <ShieldCheck size={32} className="text-blue-300" />
          </div>
          <h1 className="text-2xl font-black tracking-wider">INNOTREV</h1>
          <p className="text-blue-200 text-sm mt-1 font-medium">Sistema de Soporte Técnico</p>
        </div>

        <div className="p-8">
          {/* Selector Login / Registro */}
          <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6">
            <button 
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isRegistering ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isRegistering ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Crear Cuenta
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-6 border border-red-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* CAMPOS DE REGISTRO */}
            {isRegistering && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="nombre" placeholder="Nombre" required onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="relative">
                    <input type="text" name="apellidos" placeholder="Apellidos" required onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" name="direccion" placeholder="Dirección completa" required onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="tel" name="telefono" placeholder="Teléfono" required onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            )}

            {/* CAMPOS COMPARTIDOS (Email y Password) */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                name="email" 
                placeholder="Correo electrónico" 
                required 
                onChange={handleInputChange} 
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="Contraseña" 
                required 
                onChange={handleInputChange} 
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* CONFIRMAR CONTRASEÑA (Solo Registro) */}
            {isRegistering && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="confirmPassword" 
                  placeholder="Confirmar contraseña" 
                  required 
                  onChange={handleInputChange} 
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
            )}

            {/* MOCKUP DE RECAPTCHA (Solo Registro) */}
            {isRegistering && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl mt-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="recaptcha" 
                    checked={recaptchaChecked} 
                    onChange={(e) => setRecaptchaChecked(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer" 
                  />
                  <label htmlFor="recaptcha" className="text-sm font-medium text-slate-700 cursor-pointer">No soy un robot</label>
                </div>
                <div className="flex flex-col items-center">
                  <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="w-6 opacity-70" />
                  <span className="text-[8px] text-slate-400 mt-1">reCAPTCHA</span>
                </div>
              </div>
            )}

            {!isRegistering && (
              <div className="flex justify-end mt-2">
                <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">¿Olvidaste tu contraseña?</span>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl mt-6 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all"
            >
              {isRegistering ? 'Crear Cuenta' : 'Ingresar al Sistema'}
            </button>
            
            {/* Aviso de Protección de Datos */}
            {isRegistering && (
               <p className="text-[10px] text-slate-400 text-center mt-4 leading-tight">
                 Al registrarte, aceptas nuestra política de <strong>Protección de Datos</strong>. Tu información está cifrada y segura.
               </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;