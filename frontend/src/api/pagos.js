import { api, handleApiError } from './client';

export async function fetchPagos({ skip = 0, limit = 100 } = {}) {
  try {
    const { data } = await api.get('/api/pagos/', { params: { skip, limit } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPago(id) {
  try {
    const { data } = await api.get(`/api/pagos/${id}`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPagosByPrestamo(prestamoId) {
  try {
    const { data } = await api.get(`/api/pagos/prestamo/${prestamoId}`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function createPago(payload) {
  try {
    const { data } = await api.post('/api/pagos/', payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function deletePago(id) {
  try {
    await api.delete(`/api/pagos/${id}`);
  } catch (err) {
    handleApiError(err);
  }
}

export async function previewPagoCobrador({ monto, porcentaje }) {
  try {
    const { data } = await api.get('/api/pagos/preview-cobrador', { params: { monto, porcentaje } });
    return data; // { monto_comision }
  } catch (err) {
    handleApiError(err);
  }
}
