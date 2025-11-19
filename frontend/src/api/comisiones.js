import { handleApiError } from './client';

const API_URL = 'http://127.0.0.1:8000';

/**
 * Obtener resumen de comisiones del vendedor
 */
export async function fetchResumenVendedor(vendedorId = null, fechaDesde = null, fechaHasta = null) {
  try {
    const params = new URLSearchParams();
    if (vendedorId) params.append('vendedor_id', vendedorId);
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    
    const queryString = params.toString();
    const url = `${API_URL}/api/comisiones/vendedor/resumen${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Obtener detalle de comisiones por préstamo de un vendedor
 */
export async function fetchDetalleVendedor(vendedorId) {
  try {
    const response = await fetch(`${API_URL}/api/comisiones/vendedor/detalle?vendedor_id=${vendedorId}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Obtener resumen de comisiones del cobrador
 */
export async function fetchResumenCobrador(cobradorId = null, fechaDesde = null, fechaHasta = null) {
  try {
    const params = new URLSearchParams();
    if (cobradorId) params.append('cobrador_id', cobradorId);
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    
    const queryString = params.toString();
    const url = `${API_URL}/api/comisiones/cobrador/resumen${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Obtener comisiones del día
 */
export async function fetchComisionesDia(fecha = null) {
  try {
    const url = fecha 
      ? `${API_URL}/api/comisiones/dia?fecha=${fecha}`
      : `${API_URL}/api/comisiones/dia`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Obtener ranking de empleados por comisiones
 */
export async function fetchRankingEmpleados(fechaDesde = null, fechaHasta = null) {
  try {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    
    const queryString = params.toString();
    const url = `${API_URL}/api/comisiones/empleados/ranking${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    handleApiError(error);
  }
}
