import client, { storeTokens, clearTokens } from './client';

export async function login(username, password) {
  const resp = await client.post('/auth/login/', { username, password });
  storeTokens({ access: resp.data.access, refresh: resp.data.refresh });
  return resp.data;
}

export function logout() {
  clearTokens();
}

export async function getCurrentUser() {
  const resp = await client.get('/auth/me/');
  return resp.data;
}
