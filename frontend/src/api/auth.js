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

export async function listStaffAccounts() {
  const resp = await client.get('/auth/staff-accounts/');
  return resp.data;
}

export async function createStaffAccount(data) {
  const resp = await client.post('/auth/staff-accounts/', data);
  return resp.data;
}

export async function deleteStaffAccount(id) {
  await client.delete(`/auth/staff-accounts/${id}/`);
}

export async function changeStaffPassword(id, password) {
  const resp = await client.patch(`/auth/staff-accounts/${id}/`, { password });
  return resp.data;
}
