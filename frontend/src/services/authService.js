import api from './api';

export const authService = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  getProfile: () => api.get('/api/auth/me'),
  logout: () => {
    localStorage.removeItem('authToken');
  }
};