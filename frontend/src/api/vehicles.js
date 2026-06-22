import client from './client';

export async function listVehicles(params = {}) {
  const resp = await client.get('/vehicles/', { params });
  return resp.data;
}

export async function getVehicle(id) {
  const resp = await client.get(`/vehicles/${id}/`);
  return resp.data;
}

export async function createVehicle(data) {
  const isFormData = data instanceof FormData;
  const resp = await client.post('/vehicles/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function updateVehicle(id, data) {
  const isFormData = data instanceof FormData;
  const resp = await client.patch(`/vehicles/${id}/`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function deleteVehicle(id) {
  await client.delete(`/vehicles/${id}/`);
}

export async function getVehicleStatusSummary() {
  const resp = await client.get('/vehicles/status_summary/');
  return resp.data;
}

export async function getUpcomingArrivals() {
  const resp = await client.get('/vehicles/upcoming_arrivals/');
  return resp.data;
}

export async function getVehicleRentalHistory(id) {
  const resp = await client.get(`/vehicles/${id}/rental_history/`);
  return resp.data;
}

export async function uploadVehicleGalleryImage(id, file, caption = '') {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('caption', caption);
  const resp = await client.post(`/vehicles/${id}/upload_gallery_image/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data;
}

export async function deleteVehicleGalleryImage(vehicleId, imageId) {
  await client.delete(`/vehicles/${vehicleId}/gallery_image/${imageId}/`);
}
