import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Base URL mengarah ke server backend MariaDB di IP 172.16.5.254:4000
export const BASE_API_URL = 'http://172.16.5.254:4000/api';
export const BASE_SERVER_URL = 'http://172.16.5.254:4000';

const api = axios.create({
  baseURL: BASE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Ambil JWT Token dari SecureStore
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('taurus_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Gagal membaca token dari SecureStore:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Tangani 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await SecureStore.deleteItemAsync('taurus_token');
      await SecureStore.deleteItemAsync('taurus_user');
    }
    return Promise.reject(error);
  }
);

export const saveAuthSession = async (token: string, user: any) => {
  await SecureStore.setItemAsync('taurus_token', token);
  await SecureStore.setItemAsync('taurus_user', JSON.stringify(user));
};

export const clearAuthSession = async () => {
  await SecureStore.deleteItemAsync('taurus_token');
  await SecureStore.deleteItemAsync('taurus_user');
};

export const getStoredUser = async () => {
  const userJson = await SecureStore.getItemAsync('taurus_user');
  return userJson ? JSON.parse(userJson) : null;
};

export default api;
