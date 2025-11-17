import { api, handleApiError } from './client';

export async function fetchMetricsSummary() {
  try {
    const { data } = await api.get('/api/metrics/summary');
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
