/**
 * Idealmente, esta URL base vendría de una variable de entorno.
 * En un proyecto con Create React App, se usaría un archivo .env con:
 * REACT_APP_API_URL=http://localhost:8000/api/v1
 * Y se leería como: process.env.REACT_APP_API_URL
 */
const BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Obtiene los headers autenticados correctamente. Garantiza que no envíe "Bearer null".
 * @returns {object} Headers con Authorization si el token existe
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

/**
 * Una función de fetch reutilizable que automáticamente incluye el token de autorización.
 * @param {string} endpoint El endpoint de la API al que llamar (ej. '/equipo/').
 * @param {object} options Opciones de fetch (method, body, etc.).
 * @returns {Promise<any>} La respuesta de la API.
 */
export const apiClient = async (endpoint, options = {}) => {
    const headers = {
        ...getAuthHeaders(),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
        if (response.status === 401) {
            // Token inválido o expirado, limpiar localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            window.location.href = '/';
        }
        throw new Error(`Error en la petición: ${response.statusText}`);
    }

    // Devuelve un blob si se especifica, si no, el JSON.
    return options.responseType === 'blob' ? response.blob() : response.json();
};
