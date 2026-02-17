import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    // Formato que exige FastAPI (FormData)
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      // CORRECCIÓN AQUÍ: La ruta correcta según tus archivos backend es /login/access-token
      const response = await fetch('http://localhost:8000/api/v1/login/access-token', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Credenciales incorrectas');

      const data = await response.json();
      // Guardamos la llave maestra
      localStorage.setItem('token', data.access_token);
      // Nos vamos al chat
      navigate('/dashboard');
      
    } catch (err) {
      setError('❌ Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-2">Innotrev</h2>
        <p className="text-center text-gray-500 mb-6">Portal de Soporte Técnico</p>
        
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <input 
              type="text" 
              required
              className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-blue-900 text-white p-3 rounded-lg font-bold hover:bg-blue-800 transition-colors">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;