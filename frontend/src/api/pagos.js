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

export async function fetchPagoVendedor(id) {
  try {
    const { data } = await api.get(`/api/pagos/${id}/vendedor`);
    return data; // PagoVendedor registro
  } catch (err) {
    // Si 404, simplemente no hay comisión para ese pago
    if (err.message && err.message.includes('404')) return null;
    handleApiError(err);
  }
}

export async function fetchPagoCobrador(id) {
  try {
    const { data } = await api.get(`/api/pagos/${id}/cobrador`);
    return data; // PagoCobrador registro
  } catch (err) {
    // 404: sin registro
    return null;
  }
}

export async function aprobarPagoCobrador(id, { porcentaje, empleado_id }) {
  try {
    const { data } = await api.put(`/api/pagos/${id}/aprobar-cobrador`, { porcentaje, empleado_id });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
