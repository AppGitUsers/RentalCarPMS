import client from './client';

export async function listCustomers(params = {}) {
  const resp = await client.get('/customers/', { params });
  return resp.data;
}

export async function getCustomer(id) {
  const resp = await client.get(`/customers/${id}/`);
  return resp.data;
}

export async function createCustomer(data) {
  const isFormData = data instanceof FormData;
  const resp = await client.post('/customers/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function updateCustomer(id, data) {
  const isFormData = data instanceof FormData;
  const resp = await client.patch(`/customers/${id}/`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function getCustomerRentalHistory(id) {
  const resp = await client.get(`/customers/${id}/rental_history/`);
  return resp.data;
}
