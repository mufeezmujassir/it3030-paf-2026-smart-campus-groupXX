// src/pages/admin/AdminBookingManagement.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, CheckCircle, XCircle, Eye, Filter, Search } from 'lucide-react';
import bookingService from '../../services/bookingService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const AdminBookingManagement = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        bookingDate: '',
        resourceId: ''
    });
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [adminAction, setAdminAction] = useState({ status: '', reason: '' });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, [filters]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.bookingDate) params.bookingDate = filters.bookingDate;
            if (filters.resourceId) params.resourceId = filters.resourceId;

            const data = await bookingService.getAllBookings(params);
            setBookings(data.content || data);
        } catch (error) {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedBooking) return;
        setProcessing(true);
        try {
            await bookingService.updateBookingStatus(selectedBooking.id, {
                status: adminAction.status,
                reason: adminAction.reason
            });
            toast.success(`Booking ${adminAction.status.toLowerCase()} successfully`);
            setShowModal(false);
            setSelectedBooking(null);
            setAdminAction({ status: '', reason: '' });
            fetchBookings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update booking');
        } finally {
            setProcessing(false);
        }
    };

    const openActionModal = (booking, status) => {
        setSelectedBooking(booking);
        setAdminAction({ status, reason: '' });
        setShowModal(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            APPROVED: 'bg-green-100 text-green-700 border-green-200',
            REJECTED: 'bg-red-100 text-red-700 border-red-200',
            CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200'
        };
        return styles[status] || styles.PENDING;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
            case 'REJECTED': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Booking Management</h2>
                    <p className="text-sm text-text-secondary mt-1">
                        Review and manage all resource booking requests
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Date</label>
                        <input
                            type="date"
                            value={filters.bookingDate}
                            onChange={(e) => setFilters({ ...filters, bookingDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div>
                        <button
                            onClick={() => setFilters({ status: '', bookingDate: '', resourceId: '' })}
                            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-primary transition"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Resource</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Purpose</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                                        No bookings found
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-text-primary">
                                                        {booking.resourceName}
                                                    </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{booking.userFullName}</p>
                                                <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    {booking.userEmail}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-text-primary">
                                                {format(new Date(booking.bookingDate), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-text-secondary">
                                                {booking.startTime} - {booking.endTime}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-text-primary line-clamp-2 max-w-xs">
                                                {booking.purpose || '-'}
                                            </p>
                                            {booking.expectedAttendees && (
                                                <p className="text-xs text-text-secondary mt-1">
                                                    👥 {booking.expectedAttendees} attendees
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                                <span className={`
                                                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                                                    ${getStatusBadge(booking.status)}
                                                `}>
                                                    {getStatusIcon(booking.status)}
                                                    {booking.status}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openActionModal(booking, 'APPROVED')}
                                                    disabled={booking.status !== 'PENDING'}
                                                    className={`
                                                            p-2 rounded-lg transition-all
                                                            ${booking.status === 'PENDING'
                                                        ? 'text-green-600 hover:bg-green-50'
                                                        : 'text-gray-300 cursor-not-allowed'}
                                                        `}
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => openActionModal(booking, 'REJECTED')}
                                                    disabled={booking.status !== 'PENDING'}
                                                    className={`
                                                            p-2 rounded-lg transition-all
                                                            ${booking.status === 'PENDING'
                                                        ? 'text-red-600 hover:bg-red-50'
                                                        : 'text-gray-300 cursor-not-allowed'}
                                                        `}
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedBooking(booking);
                                                        setShowModal(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-primary rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {showModal && selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${
                                    adminAction.status === 'APPROVED' ? 'bg-green-100' :
                                        adminAction.status === 'REJECTED' ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                    {adminAction.status === 'APPROVED' ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : adminAction.status === 'REJECTED' ? (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    ) : (
                                        <Eye className="w-6 h-6 text-primary" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary">
                                        {adminAction.status ? `${adminAction.status} Booking` : 'Booking Details'}
                                    </h3>
                                    <p className="text-sm text-text-secondary mt-0.5">
                                        {selectedBooking.resourceName} • {selectedBooking.userFullName}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Date</p>
                                    <p className="text-sm font-semibold text-text-primary mt-1">
                                        {format(new Date(selectedBooking.bookingDate), 'MMMM d, yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Time</p>
                                    <p className="text-sm font-semibold text-text-primary mt-1">
                                        {selectedBooking.startTime} - {selectedBooking.endTime}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-text-secondary uppercase mb-1">Purpose</p>
                                <p className="text-sm text-text-primary bg-gray-50 p-3 rounded-xl">
                                    {selectedBooking.purpose || 'No purpose specified'}
                                </p>
                            </div>

                            {selectedBooking.expectedAttendees && (
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase mb-1">Expected Attendees</p>
                                    <p className="text-sm text-text-primary">{selectedBooking.expectedAttendees} people</p>
                                </div>
                            )}

                            {adminAction.status && (
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase mb-2">
                                        Reason {adminAction.status === 'REJECTED' ? '(Required)' : '(Optional)'}
                                    </label>
                                    <textarea
                                        value={adminAction.reason}
                                        onChange={(e) => setAdminAction({ ...adminAction, reason: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder={adminAction.status === 'REJECTED' ?
                                            "Please provide a reason for rejection..." :
                                            "Add any additional notes (optional)"}
                                        required={adminAction.status === 'REJECTED'}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedBooking(null);
                                    setAdminAction({ status: '', reason: '' });
                                }}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            {adminAction.status && (
                                <button
                                    onClick={handleStatusUpdate}
                                    disabled={processing || (adminAction.status === 'REJECTED' && !adminAction.reason)}
                                    className={`
                                        flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition
                                        ${adminAction.status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                >
                                    {processing ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                                    ) : (
                                        `Confirm ${adminAction.status}`
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBookingManagement;