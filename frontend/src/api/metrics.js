import { api, handleApiError } from './client';

export async function fetchMetricsSummary() {
  try {
    const { data } = await api.get('/api/metrics/summary');
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchDueToday() {
  try {
    const { data } = await api.get('/api/metrics/due-today');
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchDueNext(days = 7) {
  try {
    const { data } = await api.get('/api/metrics/due-next', { params: { days } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchKPIs() {
  try {
    const { data } = await api.get('/api/metrics/kpis');
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchDailySimple(days = 1) {
  try {
    const { data } = await api.get('/api/metrics/daily-simple', { params: { days } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchPeriodMetrics(type, startOrDate, end = null) {
  try {
    const params = {};
    if (type === 'date') {
      params.date = startOrDate;
    } else if (type === 'week') {
      params.start_date = startOrDate;
      params.end_date = end;
    } else if (type === 'month') {
      params.month = startOrDate; // YYYY-MM
    }
    const { data } = await api.get(`/api/metrics/period/${type}`, { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchExpectativas(type, startOrDate, end = null) {
  try {
    const params = {};
    if (type === 'date') {
      params.date = startOrDate;
    } else if (type === 'week') {
      params.start_date = startOrDate;
      params.end_date = end;
    } else if (type === 'month') {
      params.month = startOrDate; // YYYY-MM
    }
    const { data } = await api.get(`/api/metrics/expectativas/${type}`, { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchTopClientes(limit = 10) {
  try {
    const { data } = await api.get('/api/metrics/top-clientes', { params: { limit } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchRentabilidad() {
  try {
    const { data } = await api.get('/api/metrics/rentabilidad');
    return data;
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchEvolucion(periodoDias = 30) {
  try {
    const { data } = await api.get('/api/metrics/evolucion', { params: { periodo_dias: periodoDias } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
