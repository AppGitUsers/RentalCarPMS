import client from './client';

export async function getSettings() {
  const resp = await client.get('/settings/');
  return resp.data;
}

export async function updateSettings(data) {
  const isFormData = data instanceof FormData;
  const resp = await client.patch('/settings/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}
