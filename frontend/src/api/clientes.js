import { api, handleApiError } from './client';

export async function fetchClientes({ skip = 0, limit = 100 } = {}) {
  try {
    const { data } = await api.get('/api/clientes', { params: { skip, limit } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchCliente(id) {
  try {
    const { data } = await api.get(`/api/clientes/${id}`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function createCliente(payload) {
  try {
    const { data } = await api.post('/api/clientes', payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function updateCliente(id, payload) {
  try {
    const { data } = await api.put(`/api/clientes/${id}`, payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function deleteCliente(id) {
  try {
    await api.delete(`/api/clientes/${id}`);
  } catch (err) {
    handleApiError(err);
  }
}
