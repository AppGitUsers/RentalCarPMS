import client from './client';

export async function getSettings() {
  const resp = await client.get('/settings/');
  return resp.data;
}

export async function updateSettings(data) {
  const resp = await client.patch('/settings/', data);
  return resp.data;
}
