import { api, handleApiError } from './client';

export async function fetchEmpleados(params = {}) {
  try {
    const { data } = await api.get('/api/empleados/', { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchEmpleado(id) {
  try {
    const { data } = await api.get(`/api/empleados/${id}`);
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

export async function updateEmpleado(id, payload) {
  try {
    const { data } = await api.put(`/api/empleados/${id}`, payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchComisionesEmpleado(empleadoId) {
  try {
    const { data } = await api.get(`/api/empleados/${empleadoId}/comisiones`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchComisionesVendedorEmpleado(empleadoId) {
  try {
    const { data } = await api.get(`/api/empleados/${empleadoId}/comisiones-vendedor`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchGananciasEmpleado(empleadoId, { startDate = null, endDate = null } = {}) {
  try {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const { data } = await api.get(`/api/empleados/${empleadoId}/ganancias`, { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
