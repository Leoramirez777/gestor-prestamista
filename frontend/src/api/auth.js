import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth';

export const login = async (username, password) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  
  const response = await axios.post(`${API_URL}/login`, formData);
  
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('username', response.data.username);
    if (response.data.role) localStorage.setItem('role', response.data.role);
    if (response.data.empleado_id !== undefined) localStorage.setItem('empleado_id', String(response.data.empleado_id ?? ''));
  }
  
  return response.data;
};

export const register = async (username, password, nombre_completo) => {
  const response = await axios.post(`${API_URL}/register`, {
    username,
    password,
    nombre_completo
  });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  localStorage.removeItem('empleado_id');
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.data?.role) localStorage.setItem('role', response.data.role);
    if (response.data?.empleado_id !== undefined) localStorage.setItem('empleado_id', String(response.data.empleado_id ?? ''));
    return response.data;
  } catch (error) {
    logout();
    return null;
  }
};

export const updateCurrentUser = async (data) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No autenticado');
  const response = await axios.put(`${API_URL}/me`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
