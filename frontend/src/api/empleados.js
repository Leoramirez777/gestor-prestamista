import { api, handleApiError } from './client';

export async function fetchEmpleados() {
  try {
    const { data } = await api.get('/api/empleados/');
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function createEmpleado(payload) {
  try {
    const { data } = await api.post('/api/empleados/', payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
