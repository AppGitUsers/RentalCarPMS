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
  const resp = await client.post('/customers/', data);
  return resp.data;
}

export async function updateCustomer(id, data) {
  const resp = await client.patch(`/customers/${id}/`, data);
  return resp.data;
}

export async function getCustomerRentalHistory(id) {
  const resp = await client.get(`/customers/${id}/rental_history/`);
  return resp.data;
}
