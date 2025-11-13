import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to handle errors in one place
export function handleApiError(error) {
  if (error.response) {
    console.error('API error:', error.response.status, error.response.data);
    throw new Error(error.response.data?.detail || 'Error de API');
  }
  console.error('Network error:', error.message);
  throw new Error('No se pudo conectar con el servidor');
}
