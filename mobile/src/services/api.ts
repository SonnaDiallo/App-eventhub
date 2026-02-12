// mobile/src/services/api.ts
import axios from 'axios';
import { Platform } from 'react-native';

import { getToken } from './authStorage';
import { getApiBaseUrl, API_CONFIG } from '../config/constants';

declare const __DEV__: boolean;

const BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL:', BASE_URL);
console.log('📱 Platform:', Platform.OS);
console.log('🔧 Dev Mode:', __DEV__);
console.log('ℹ️ API client: unused in Firebase-only mode');

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Intercepteur de requête
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = {
        ...((config.headers as any) || {}),
        Authorization: `Bearer ${token}`,
      } as any;
    }

    const fullURL = `${config.baseURL}${config.url}`;
    console.log('📤 API Request:', config.method?.toUpperCase(), fullURL);
    if (config.data) {
      console.log('   Data:', JSON.stringify(config.data));
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Setup Error:', error.message);
    return Promise.reject(error);
  }
);

// Éviter de spammer les warnings réseau (max 1 fois toutes les 10 s)
let lastNetworkWarn = 0;
const NETWORK_WARN_THROTTLE_MS = 10000;

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    const isNetworkOrTimeout =
      !error.response &&
      (error.request || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message?.includes('timeout'));

    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        console.log('📭 Not found (404):', error.config?.url);
      } else {
        console.error('❌ Server Error:', { status, data: error.response.data, url: error.config?.url });
      }
    } else if (error.request || isNetworkOrTimeout) {
      const now = Date.now();
      if (now - lastNetworkWarn >= NETWORK_WARN_THROTTLE_MS) {
        lastNetworkWarn = now;
        console.warn('⚠️ API injoignable – backend éteint ou réseau (cd backend && npm run dev | même WiFi | IP dans api.ts)');
      }
    } else {
      console.warn('❌ Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Test de connexion
export const testConnection = async () => {
  try {
    console.log('🔍 Testing backend connection...');
    console.log('   Target:', BASE_URL);
    const response = await api.get('/health');
    console.log('✅ Backend connected!', response.data);
    return true;
  } catch (error: any) {
    console.error('❌ Backend NOT reachable');
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Backend not started or wrong port');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   → Timeout - check firewall or IP');
    } else {
      console.error('   → Error:', error.message);
    }
    return false;
  }
};