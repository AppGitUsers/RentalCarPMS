import client from './client';

export async function listStaff(params = {}) {
  const resp = await client.get('/staff/members/', { params });
  return resp.data;
}

export async function getStaffMember(id) {
  const resp = await client.get(`/staff/members/${id}/`);
  return resp.data;
}

export async function createStaffMember(data) {
  const isFormData = data instanceof FormData;
  const resp = await client.post('/staff/members/', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function updateStaffMember(id, data) {
  const isFormData = data instanceof FormData;
  const resp = await client.patch(`/staff/members/${id}/`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return resp.data;
}

export async function deleteStaffMember(id) {
  await client.delete(`/staff/members/${id}/`);
}

export async function getSalarySummary(id, month, year) {
  const resp = await client.get(`/staff/members/${id}/salary_summary/`, {
    params: { month, year },
  });
  return resp.data;
}

export async function getAttendanceByStaffMonth(staffId, month, year) {
  const resp = await client.get('/staff/attendance/by_staff_month/', {
    params: { staff: staffId, month, year },
  });
  return resp.data;
}

export async function toggleAttendance(staffId, date) {
  const resp = await client.post('/staff/attendance/toggle/', { staff_id: staffId, date });
  return resp.data;
}

export async function recordPayment(staffId, data) {
  const resp = await client.post(`/staff/members/${staffId}/record_payment/`, data);
  return resp.data;
}

export async function getPaymentHistory(staffId) {
  const resp = await client.get(`/staff/members/${staffId}/payment_history/`);
  return resp.data;
}
