import api from './api';

const dashboardService = {
    getDashboardStats: () => api.get('/dashboard/stats'),
};

export default dashboardService;
