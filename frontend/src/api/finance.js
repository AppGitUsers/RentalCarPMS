import client from './client';

export async function listFinanceEntries(params = {}) {
  const resp = await client.get('/finance/entries/', { params });
  return resp.data;
}

export async function createFinanceEntry(data) {
  const isFormData = data instanceof FormData;
  const resp = await client.post('/finance/entries/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function updateFinanceEntry(id, data) {
  const isFormData = data instanceof FormData;
  const resp = await client.patch(`/finance/entries/${id}/`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function deleteFinanceEntry(id) {
  await client.delete(`/finance/entries/${id}/`);
}

export async function getFinanceSummary(month, year) {
  const resp = await client.get('/finance/summary/', { params: { month, year } });
  return resp.data;
}

export async function getFinanceTrend(year) {
  const resp = await client.get('/finance/trend/', { params: { year } });
  return resp.data;
}

export async function downloadFinanceExcel(month, year) {
  const resp = await client.get('/finance/export/', {
    params: { month, year },
    responseType: 'blob',
  });
  return resp.data;
}

export async function downloadFinanceExcelRange(dateFrom, dateTo) {
  const resp = await client.get('/finance/export/range/', {
    params: { date_from: dateFrom, date_to: dateTo },
    responseType: 'blob',
  });
  return resp.data;
}
