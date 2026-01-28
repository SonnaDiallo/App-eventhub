// mobile/src/services/api.ts
import axios from 'axios';
import { Platform } from 'react-native';

import { getToken } from './authStorage';

declare const __DEV__: boolean;

// 🔥 IMPORTANT: Trouve ton IP Windows avec 'ipconfig' dans CMD
// Cherche "Adresse IPv4" dans la section de ta connexion WiFi/Ethernet
const YOUR_LOCAL_IP = '192.168.1.37'; // ⚠️ CHANGE CETTE IP !

const getBaseURL = () => {
  if (__DEV__) {
    // Pour iOS (iPhone ou Simulator), utilise TOUJOURS l'IP locale
    if (Platform.OS === 'ios') {
      return `http://${YOUR_LOCAL_IP}:5000/api`;
    }
    
    // Pour Android Emulator uniquement
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }
  }
  
  // Production
  return `http://${YOUR_LOCAL_IP}:5000/api`;
};

const BASE_URL = getBaseURL();

console.log('🌐 API Base URL:', BASE_URL);
console.log('📱 Platform:', Platform.OS);
console.log('🔧 Dev Mode:', __DEV__);
console.log('ℹ️ API client: unused in Firebase-only mode');

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      // Serveur a répondu avec une erreur
      console.error('❌ Server Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Pas de réponse du serveur
      console.error('❌ Network Error - Cannot reach server');
      console.error('   URL:', `${error.config?.baseURL}${error.config?.url}`);
      console.error('');
      console.error('🔍 Vérifications nécessaires:');
      console.error('   1. Backend démarré? (cd backend && npm run dev)');
      console.error('   2. Backend sur port 5000?');
      console.error('   3. iPhone et PC sur le MÊME WiFi?');
      console.error('   4. IP correcte dans api.ts?');
      console.error('');
      console.error('📝 Pour trouver ton IP Windows:');
      console.error('   - Ouvre CMD (Win + R, tape "cmd")');
      console.error('   - Tape: ipconfig');
      console.error('   - Cherche "Adresse IPv4" (ex: 192.168.1.37)');
      console.error('   - Change YOUR_LOCAL_IP dans api.ts');
    } else {
      console.error('❌ Request Error:', error.message);
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