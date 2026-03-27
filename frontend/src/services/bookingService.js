// src/services/bookingService.js
import api from './api';

const BOOKING_BASE = '/bookings';

export const bookingService = {
    // Create a booking
    createBooking: (data) => api.post(BOOKING_BASE, data).then(res => res.data),

    // Get user's own bookings
    getMyBookings: (params) => api.get(`${BOOKING_BASE}/my`, { params }).then(res => res.data),

    // Get booking by ID
    getBookingById: (id) => api.get(`${BOOKING_BASE}/${id}`).then(res => res.data),

    // Cancel a booking
    cancelBooking: (id) => api.delete(`${BOOKING_BASE}/${id}/cancel`).then(res => res.data),

    // Get available time slots for a resource on a date
    getAvailableTimeSlots: (resourceId, date) =>
        api.get(`${BOOKING_BASE}/available-slots`, { params: { resourceId, date } }).then(res => res.data),

    // Check if a time slot conflicts
    checkConflict: (resourceId, date, startTime, endTime) =>
        api.get(`${BOOKING_BASE}/check-conflict`, { params: { resourceId, date, startTime, endTime } }).then(res => res.data),

    // Admin: Get all bookings
    getAllBookings: (params) => api.get(BOOKING_BASE, { params }).then(res => res.data),

    // Admin: Update booking status
    updateBookingStatus: (id, data) => api.patch(`${BOOKING_BASE}/${id}/status`, data).then(res => res.data)
};

export default bookingService;