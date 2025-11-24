import { api } from './client';

const AUTH_BASE = '/api/auth';

export const login = async (username, password) => {
  // OAuth2PasswordRequestForm requiere application/x-www-form-urlencoded
  const body = new URLSearchParams({ username, password });
  const response = await api.post(`${AUTH_BASE}/login`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('username', response.data.username);
    if (response.data.role) localStorage.setItem('role', response.data.role);
    if (response.data.empleado_id !== undefined) localStorage.setItem('empleado_id', String(response.data.empleado_id ?? ''));
  }
  return response.data;
};

export const register = async (username, password, nombre_completo) => {
  // Nota: si no existe endpoint de registro público, esto fallará.
  const response = await api.post(`${AUTH_BASE}/register`, {
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
    const response = await api.get(`${AUTH_BASE}/me`);
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
