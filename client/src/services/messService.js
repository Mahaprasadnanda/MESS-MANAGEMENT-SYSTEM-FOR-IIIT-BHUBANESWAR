import api from './api';

export const messService = {
  async getDashboard() {
    const { data } = await api.get('/mess/dashboard');
    return data.data;
  },

  async getWeeklyMenu(date) {
    const { data } = await api.get('/mess/menu/weekly', {
      params: date ? { date } : undefined,
    });
    return data.data;
  },

  async upsertMenu(payload) {
    const { data } = await api.put('/mess/menu', payload);
    return data.data.menu;
  },

  async deleteMenu(menuId) {
    const { data } = await api.delete(`/mess/menu/${menuId}`);
    return data.data;
  },

  async getDailyMealOverview(params) {
    const { data } = await api.get('/mess/bookings/daily', { params });
    return data.data;
  },

  async getStudentBookings(params) {
    const { data } = await api.get('/mess/bookings', { params });
    return data.data;
  },

  async getVerificationSession() {
    const { data } = await api.get('/mess/coupons/session');
    return data.data;
  },

  async verifyCoupon(payload) {
    const { data } = await api.post('/mess/coupons/verify', payload);
    return data;
  },

  async getReports(params) {
    const { data } = await api.get('/mess/reports', { params });
    return data.data;
  },

  async downloadReportCsv(params) {
    const response = await api.get('/mess/reports/export', {
      params,
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `iiitbbs-mess-report-${params.type || 'meals'}.csv`;
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
