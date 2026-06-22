import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
});

const TOKEN_KEY = 'crpms_access_token';
const REFRESH_KEY = 'crpms_refresh_token';
const LOGIN_AT_KEY = 'crpms_login_at';

export function getStoredTokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
    loginAt: localStorage.getItem(LOGIN_AT_KEY),
  };
}

export function storeTokens({ access, refresh }) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(LOGIN_AT_KEY, Date.now().toString());
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(LOGIN_AT_KEY);
}

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours, mirrors backend SESSION_TIMEOUT_HOURS

export function isSessionExpired() {
  const { loginAt } = getStoredTokens();
  if (!loginAt) return true;
  return Date.now() - Number(loginAt) > SESSION_TIMEOUT_MS;
}

client.interceptors.request.use((config) => {
  const { access } = getStoredTokens();
  if (access && !isSessionExpired()) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (isSessionExpired()) {
      clearTokens();
      window.dispatchEvent(new CustomEvent('crpms:session-expired'));
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refresh } = getStoredTokens();

      if (!refresh) {
        clearTokens();
        window.dispatchEvent(new CustomEvent('crpms:session-expired'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, originalRequest });
        });
      }

      isRefreshing = true;
      try {
        const resp = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
        storeTokens({ access: resp.data.access, refresh });
        refreshQueue.forEach(({ resolve, originalRequest: req }) => {
          req.headers.Authorization = `Bearer ${resp.data.access}`;
          resolve(client(req));
        });
        refreshQueue = [];
        originalRequest.headers.Authorization = `Bearer ${resp.data.access}`;
        return client(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        clearTokens();
        window.dispatchEvent(new CustomEvent('crpms:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
