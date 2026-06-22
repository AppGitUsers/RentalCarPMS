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

export async function getStaffAttendanceHistory(id) {
  const resp = await client.get(`/staff/members/${id}/attendance_history/`);
  return resp.data;
}

export async function getStaffSalaryHistory(id) {
  const resp = await client.get(`/staff/members/${id}/salary_history/`);
  return resp.data;
}

export async function getAttendanceByDate(date) {
  const resp = await client.get('/staff/attendance/by_date/', { params: { date } });
  return resp.data;
}

export async function markAttendance(data) {
  const resp = await client.post('/staff/attendance/', data);
  return resp.data;
}

export async function updateAttendance(id, data) {
  const resp = await client.patch(`/staff/attendance/${id}/`, data);
  return resp.data;
}

export async function getSalaryForMonth(month, year) {
  const resp = await client.get('/staff/salary/for_month/', { params: { month, year } });
  return resp.data;
}

export async function adjustSalary(id, adjustment) {
  const resp = await client.post(`/staff/salary/${id}/adjust/`, { adjustment });
  return resp.data;
}

export async function paySalary(id, notes = '') {
  const resp = await client.post(`/staff/salary/${id}/pay/`, { notes });
  return resp.data;
}
