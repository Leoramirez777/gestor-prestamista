import { api, handleApiError } from './client';

export async function fetchPrestamos({ skip = 0, limit = 100 } = {}) {
  try {
    const { data } = await api.get('/api/prestamos/', { params: { skip, limit } });
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
    const { data } = await api.post('/api/prestamos/', payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function previewVendedorComision({ monto, tasa_interes, porcentaje, base }) {
  try {
    const { data } = await api.get('/api/prestamos/preview-vendedor', {
      params: { monto, tasa_interes, porcentaje, base }
    });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPrestamoVendedor(prestamoId) {
  try {
    const { data } = await api.get(`/api/prestamos/${prestamoId}/vendedor`);
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

export async function refinanciarPrestamo(id, payload) {
  // payload: { interes_adicional: number, cuotas: number, frecuencia_pago?: 'semanal'|'mensual', fecha_inicio?: 'YYYY-MM-DD' }
  try {
    const { data } = await api.post(`/api/prestamos/${id}/refinanciar`, payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchAmortizacion(id) {
  try {
    const { data } = await api.get(`/api/prestamos/${id}/amortizacion`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function approvePrestamo(id, { porcentaje, base_tipo = 'total', vendedor_empleado_id = null }) {
  try {
    const payload = { porcentaje, base_tipo };
    if (vendedor_empleado_id) payload.vendedor_empleado_id = vendedor_empleado_id;
    const { data } = await api.put(`/api/prestamos/${id}/aprobar`, payload);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPrestamoVendedorResumen(id) {
  try {
    const { data } = await api.get(`/api/prestamos/${id}/vendedor/resumen`);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
