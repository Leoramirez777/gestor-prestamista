import { api, handleApiError } from './client';

export async function fetchCierreCaja(fecha = null) {
  try {
    const params = {};
    if (fecha) params.fecha = fecha;
    const { data } = await api.get('/api/caja/cierre', { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchMovimientosCaja(fecha) {
  try {
    const { data } = await api.get('/api/caja/movimientos', { params: { fecha } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function crearMovimientoCaja(mov) {
  try {
    const { data } = await api.post('/api/caja/movimientos', mov);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function cerrarDia(fecha, saldoFinal) {
  try {
    const { data } = await api.post('/api/caja/cerrar-dia', { fecha, saldo_final: saldoFinal });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function abrirDia(fecha) {
  try {
    const { data } = await api.post('/api/caja/abrir-dia', { fecha });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

// ===== Caja Empleado =====
export async function fetchCajaEmpleadoResumen(fecha) {
  try {
    const { data } = await api.get('/api/caja/empleado/resumen', { params: { fecha } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function crearMovimientoCajaEmpleado({ fecha, tipo, monto, categoria, descripcion }) {
  try {
    const { data } = await api.post('/api/caja/empleado/movimientos', { fecha, tipo, monto, categoria, descripcion });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchMovimientosCajaEmpleado(fecha) {
  try {
    const { data } = await api.get('/api/caja/empleado/movimientos', { params: { fecha } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function cerrarDiaEmpleado(fecha, entregado) {
  try {
    const { data } = await api.post('/api/caja/empleado/cerrar-dia', { fecha, entregado });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function abrirDiaEmpleado(fecha) {
  try {
    const { data } = await api.post('/api/caja/empleado/abrir-dia', { fecha });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}