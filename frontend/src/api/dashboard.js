import client from './client';

export async function getDashboardOverview() {
  const resp = await client.get('/dashboard/');
  return resp.data;
}
