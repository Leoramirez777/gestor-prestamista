import { api, handleApiError } from './client';

export async function fetchPrestamos({ skip = 0, limit = 100 } = {}) {
  try {
    const { data } = await api.get('/api/prestamos', { params: { skip, limit } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPrestamo(id) {
  try {
    const { data } = await api.get(`/api/prestamos/${id}`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPrestamosByCliente(clienteId) {
  try {
    const { data } = await api.get(`/api/prestamos/cliente/${clienteId}`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function createPrestamo(payload) {
  try {
    const { data } = await api.post('/api/prestamos', payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function updatePrestamo(id, payload) {
  try {
    const { data } = await api.put(`/api/prestamos/${id}`, payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function deletePrestamo(id) {
  try {
    await api.delete(`/api/prestamos/${id}`);
  } catch (err) {
    handleApiError(err);
  }
}
