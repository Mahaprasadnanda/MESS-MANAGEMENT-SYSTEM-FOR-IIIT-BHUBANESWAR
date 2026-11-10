import api from './api';

export const studentService = {
  async getDashboard() {
    const { data } = await api.get('/student/dashboard');
    return data.data;
  },

  async getWeeklyMenu(date) {
    const { data } = await api.get('/student/menu/weekly', {
      params: date ? { date } : undefined,
    });
    return data.data;
  },

  async getBookingWindow() {
    const { data } = await api.get('/student/bookings/window');
    return data.data;
  },

  async createBookingOrder(payload) {
    const { data } = await api.post('/student/bookings/create-order', payload);
    return data.data;
  },

  async getSameDayWindow() {
    const { data } = await api.get('/student/bookings/same-day/window');
    return data.data;
  },

  async createSameDayOrder(payload) {
    const { data } = await api.post('/student/bookings/same-day/create-order', payload);
    return data.data;
  },

  async getBookings() {
    const { data } = await api.get('/student/bookings');
    return data.data.bookings;
  },

  async getBookingById(id) {
    const { data } = await api.get(`/student/bookings/${id}`);
    return data.data.booking;
  },

  async getCoupons(filters = {}) {
    const { data } = await api.get('/student/coupons', { params: filters });
    return data.data.coupons;
  },

  async getPayments() {
    const { data } = await api.get('/student/payments');
    return data.data.payments;
  },

  async verifyPayment(payload) {
    const { data } = await api.post('/student/payments/verify', payload);
    return data.data;
  },

  async recordPaymentFailure(payload) {
    const { data } = await api.post('/student/payments/fail', payload);
    return data.data;
  },
};
