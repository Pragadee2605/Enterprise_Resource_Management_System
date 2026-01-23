/**
 * API Service - Axios configuration and utilities
 */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000');

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add CSRF token
api.interceptors.request.use(
  (config) => {
    // Get CSRF token from cookie
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', error.response.data);
          break;
        case 429:
          // Rate limit exceeded
          console.error('Rate limit exceeded. Please try again later.');
          break;
        case 500:
          // Server error
          console.error('Server error. Please contact support.');
          break;
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Helper function to set CSRF token (called after login)
export function setCSRFToken(token: string): void {
  document.cookie = `csrftoken=${token}; path=/; SameSite=Strict`;
}

// Generic API methods
export const apiService = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    api.get<T>(url, config).then(res => res.data),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.post<T>(url, data, config).then(res => res.data),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.put<T>(url, data, config).then(res => res.data),
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    api.delete<T>(url, config).then(res => res.data),
};

export default api;
