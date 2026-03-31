/**
 * Idealmente, esta URL base vendría de una variable de entorno.
 * En un proyecto con Create React App, se usaría un archivo .env con:
 * REACT_APP_API_URL=http://localhost:8000/api/v1
 * Y se leería como: process.env.REACT_APP_API_URL
 */
const BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Una función de fetch reutilizable que automáticamente incluye el token de autorización.
 * @param {string} endpoint El endpoint de la API al que llamar (ej. '/equipo/').
 * @param {object} options Opciones de fetch (method, body, etc.).
 * @returns {Promise<any>} La respuesta de la API.
 */
export const apiClient = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
        // Un manejo de errores más robusto podría ir aquí.
        throw new Error(`Error en la petición: ${response.statusText}`);
    }

    // Devuelve un blob si se especifica, si no, el JSON.
    return options.responseType === 'blob' ? response.blob() : response.json();
};
