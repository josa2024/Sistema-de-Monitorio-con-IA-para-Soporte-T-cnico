import React, { useState } from 'react';

// FÍJATE AQUÍ: Recibimos onLoginSuccess como prop, ya no usamos useNavigate
const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      // Recuerda usar 127.0.0.1
      const response = await fetch('http://127.0.0.1:8000/api/v1/login/access-token', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Credenciales incorrectas');

      const data = await response.json();
      
      // Llamamos a la función que nos pasó App.js, enviando el token y el rol
      onLoginSuccess(data.access_token, data.role);
      
    } catch (err) {
      setError('❌ Usuario o contraseña incorrectos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-slate-200">
        <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-md">IN</div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">Innotrev</h2>
        <p className="text-center text-slate-500 mb-6 text-sm">Portal de Soporte Técnico</p>
        
        {error && <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm text-center font-medium">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              placeholder="admin@innotrev.com"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400"
          >
            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center space-y-1">
            <p>Admin: admin@innotrev.com / admin123</p>
            <p>Cliente: cliente@alpha.com / cliente123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;