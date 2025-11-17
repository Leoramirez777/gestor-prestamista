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
