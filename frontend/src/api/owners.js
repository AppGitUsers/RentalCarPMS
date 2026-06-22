import client from './client';

export async function listOwners(params = {}) {
  const resp = await client.get('/owners/', { params });
  return resp.data;
}

export async function getOwner(id) {
  const resp = await client.get(`/owners/${id}/`);
  return resp.data;
}

export async function createOwner(data) {
  const isFormData = data instanceof FormData;
  const resp = await client.post('/owners/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function updateOwner(id, data) {
  const isFormData = data instanceof FormData;
  const resp = await client.patch(`/owners/${id}/`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function deleteOwner(id) {
  await client.delete(`/owners/${id}/`);
}

export async function getOwnerPayoutQR(id, amount) {
  const resp = await client.get(`/owners/${id}/payout_qr/`, { params: amount ? { amount } : {} });
  return resp.data;
}

export async function getOwnerUnpaidRentals(id) {
  const resp = await client.get(`/owners/${id}/unpaid_rentals/`);
  return resp.data;
}

export async function paySingleRental(ownerId, rentalId, notes = '') {
  const resp = await client.post(`/owners/${ownerId}/pay_single/`, { rental_id: rentalId, notes });
  return resp.data;
}

export async function payCollective(ownerId, rentalIds, notes = '', amount = null) {
  const resp = await client.post(`/owners/${ownerId}/pay_collective/`, {
    rental_ids: rentalIds, notes, amount,
  });
  return resp.data;
}

export async function getOwnerPayoutHistory(id) {
  const resp = await client.get(`/owners/${id}/payout_history/`);
  return resp.data;
}

export async function getOwnerRentalHistory(id) {
  const resp = await client.get(`/owners/${id}/rental_history/`);
  return resp.data;
}
