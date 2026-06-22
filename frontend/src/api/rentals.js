import client from './client';

export async function listRentals(params = {}) {
  const resp = await client.get('/rentals/', { params });
  return resp.data;
}

export async function getRental(id) {
  const resp = await client.get(`/rentals/${id}/`);
  return resp.data;
}

export async function createRental(data) {
  const resp = await client.post('/rentals/', data);
  return resp.data;
}

export async function startRental(id, odometerStart) {
  const resp = await client.post(`/rentals/${id}/start/`, { odometer_start: odometerStart });
  return resp.data;
}

export async function closeRental(id, payload) {
  const resp = await client.post(`/rentals/${id}/close/`, payload);
  return resp.data;
}

export async function cancelRental(id) {
  const resp = await client.post(`/rentals/${id}/cancel/`);
  return resp.data;
}

export async function getRentalEstimate(id) {
  const resp = await client.get(`/rentals/${id}/estimate/`);
  return resp.data;
}

export async function addRentalPayment(id, amount, method, notes = '') {
  const resp = await client.post(`/rentals/${id}/add_payment/`, { amount, method, notes });
  return resp.data;
}

export async function getRentalPaymentQR(id, amount) {
  const resp = await client.get(`/rentals/${id}/payment_qr/`, { params: amount ? { amount } : {} });
  return resp.data;
}

export function getInvoicePdfUrl(id) {
  return `/rentals/${id}/invoice_pdf/`;
}

export function getAgreementPdfUrl(id) {
  return `/rentals/${id}/agreement_pdf/`;
}

export async function downloadRentalPdf(id, type = 'invoice') {
  const path = type === 'invoice' ? `/rentals/${id}/invoice_pdf/` : `/rentals/${id}/agreement_pdf/`;
  const resp = await client.get(path, { responseType: 'blob' });
  return resp.data;
}

export async function getActiveRentals() {
  const resp = await client.get('/rentals/active_list/');
  return resp.data;
}

export async function getPendingRentals() {
  const resp = await client.get('/rentals/pending_list/');
  return resp.data;
}
