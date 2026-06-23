import axios from 'axios';
import client, { API_BASE_URL } from './client';

// Plain axios instance — no auth interceptors, for the public kiosk endpoint.
const kioskAxios = axios.create({ baseURL: API_BASE_URL });

export async function kioskPunch(staffId) {
  const resp = await kioskAxios.post('/staff/attendance/kiosk_punch/', { staff_id: staffId });
  return resp.data;
}

// ── Shifts ──────────────────────────────────────────────────────────────────

export async function listShifts(params = {}) {
  const resp = await client.get('/staff/shifts/', { params });
  return resp.data;
}

export async function createShift(data) {
  const resp = await client.post('/staff/shifts/', data);
  return resp.data;
}

export async function updateShift(id, data) {
  const resp = await client.patch(`/staff/shifts/${id}/`, data);
  return resp.data;
}

export async function deleteShift(id) {
  await client.delete(`/staff/shifts/${id}/`);
}

// ── Staff Members ────────────────────────────────────────────────────────────

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

// ── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceByDate(date) {
  const resp = await client.get('/staff/attendance/by_date/', { params: { date } });
  return resp.data;
}

export async function getAttendanceByStaffMonth(staffId, month, year) {
  const resp = await client.get('/staff/attendance/by_staff_month/', {
    params: { staff: staffId, month, year },
  });
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

// ── Salary / Payroll ─────────────────────────────────────────────────────────

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
