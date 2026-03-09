const API_URL = import.meta.env.VITE_API_URL || '';

export function getApiBase(): string {
  if (API_URL) return API_URL;
  if (typeof window !== 'undefined' && window.location.port === '3001') {
    return `${window.location.origin.replace(':3001', ':5000')}/api`;
  }
  return '/api';
}
