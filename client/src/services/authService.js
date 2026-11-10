import api from './api';

export const authService = {
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  },

  async login(payload) {
    const { data } = await api.post('/auth/login', payload);
    return data.data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  },

  async updateProfile(payload) {
    const { data } = await api.patch('/auth/profile', payload);
    return data.data.user;
  },

  async changePassword(payload) {
    const { data } = await api.post('/auth/change-password', payload);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },
};
