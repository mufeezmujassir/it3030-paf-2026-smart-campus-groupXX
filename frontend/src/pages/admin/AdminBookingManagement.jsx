// src/pages/admin/AdminBookingManagement.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, CheckCircle, XCircle, Eye, Filter, Search, Building, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import bookingService from '../../services/bookingService';
import resourceService from '../../services/resourceService';
import { toast } from 'react-toastify';
import { format, addDays, subDays, isBefore, startOfDay } from 'date-fns';

const AdminBookingManagement = () => {
    const [bookings, setBookings] = useState([]);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedResource, setSelectedResource] = useState(null);
    const [calendarView, setCalendarView] = useState('list');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timeSlots, setTimeSlots] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);

    const [filters, setFilters] = useState({
        status: '',
        bookingDate: '',
        resourceId: ''
    });
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [adminAction, setAdminAction] = useState({ status: '', reason: '' });
    const [processing, setProcessing] = useState(false);

    const START_TIME = 8;
    const END_TIME = 17;

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [filters]);

    useEffect(() => {
        if (selectedResource && selectedDate && calendarView === 'calendar') {
            fetchCalendarSlots();
        }
    }, [selectedResource, selectedDate, calendarView]);

    const fetchResources = async () => {
        try {
            const data = await resourceService.listResources({ size: 100 });
            setResources(data.content || data);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.status && filters.status !== '') {
                params.status = filters.status;
            }
            if (filters.bookingDate && filters.bookingDate !== '') {
                params.bookingDate = filters.bookingDate;
            }
            if (filters.resourceId && filters.resourceId !== '') {
                params.resourceId = filters.resourceId;
            }

            const data = await bookingService.getAllBookings(params);
            setBookings(data.content || data);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendarSlots = async () => {
        if (!selectedResource) return;
        setCalendarLoading(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const data = await bookingService.getAvailableTimeSlots(selectedResource.id, formattedDate);
            setTimeSlots(data.availableSlots || []);
        } catch (error) {
            console.error('Failed to fetch calendar slots:', error);
        } finally {
            setCalendarLoading(false);
        }
    };

    const handlePrevDay = () => {
        const newDate = subDays(selectedDate, 1);
        if (isBefore(startOfDay(newDate), startOfDay(new Date()))) {
            toast.info('Cannot view past dates');
            return;
        }
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        setSelectedDate(addDays(selectedDate, 1));
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
            if (calendarView === 'calendar' && selectedResource) {
                fetchCalendarSlots();
            }
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

    const getBookingsForSlot = (startTime, endTime) => {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        return bookings.filter(booking =>
            booking.resourceId === selectedResource?.id &&
            booking.bookingDate === formattedDate &&
            booking.startTime === startTime &&
            booking.endTime === endTime
        );
    };

    const getSlotStatus = (startTime, endTime) => {
        const bookingsForSlot = getBookingsForSlot(startTime, endTime);
        const hasApproved = bookingsForSlot.some(b => b.status === 'APPROVED');
        const hasPending = bookingsForSlot.some(b => b.status === 'PENDING');

        if (hasApproved) return 'approved';
        if (hasPending) return 'pending';
        return 'available';
    };

    const getSlotClasses = (startTime, endTime) => {
        const status = getSlotStatus(startTime, endTime);
        if (status === 'approved') {
            return 'bg-red-100 border-red-200';
        }
        if (status === 'pending') {
            return 'bg-yellow-100 border-yellow-200';
        }
        return 'bg-white border-gray-200';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Booking Management</h2>
                    <p className="text-sm text-text-secondary mt-1">
                        Review and manage all resource booking requests
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCalendarView('list')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            calendarView === 'list'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        List View
                    </button>
                    <button
                        onClick={() => setCalendarView('calendar')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            calendarView === 'calendar'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Calendar View
                    </button>
                </div>
            </div>

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
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Resource</label>
                        <select
                            value={filters.resourceId}
                            onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">All Resources</option>
                            {resources.map(resource => (
                                <option key={resource.id} value={resource.id}>
                                    {resource.name}
                                </option>
                            ))}
                        </select>
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

            {calendarView === 'calendar' && (
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <label className="block text-sm font-semibold text-text-primary mb-3">Select Resource</label>
                    <select
                        value={selectedResource?.id || ''}
                        onChange={(e) => {
                            const resource = resources.find(r => r.id === e.target.value);
                            setSelectedResource(resource || null);
                        }}
                        className="w-full md:w-96 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">Choose a resource...</option>
                        {resources.map(resource => (
                            <option key={resource.id} value={resource.id}>
                                {resource.name} ({resource.type})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {calendarView === 'calendar' && selectedResource && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Building className="w-5 h-5 text-primary" />
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">{selectedResource.name}</h3>
                                    <p className="text-xs text-text-secondary">{selectedResource.type} • {selectedResource.location}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handlePrevDay}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <span className="text-base font-semibold text-text-primary min-w-[140px] text-center">
                                    {format(selectedDate, 'EEEE, MMM d, yyyy')}
                                </span>
                                <button
                                    onClick={handleNextDay}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                                <span className="text-xs text-text-secondary">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                                <span className="text-xs text-text-secondary">Pending Requests</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                                <span className="text-xs text-text-secondary">Approved Bookings</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {calendarLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {Array.from({ length: END_TIME - START_TIME }, (_, i) => {
                                    const hour = START_TIME + i;
                                    const startTime = `${hour.toString().padStart(2, '0')}:00`;
                                    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
                                    const bookingsForSlot = getBookingsForSlot(startTime, endTime);
                                    const slotStatus = getSlotStatus(startTime, endTime);

                                    return (
                                        <div key={hour} className={`border rounded-xl overflow-hidden ${getSlotClasses(startTime, endTime)}`}>
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                                                <span className="text-sm font-semibold text-text-primary">
                                                    {startTime} - {endTime}
                                                </span>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {bookingsForSlot.length > 0 ? (
                                                    bookingsForSlot.map(booking => (
                                                        <div key={booking.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="w-4 h-4 text-gray-400" />
                                                                    <span className="text-sm font-medium text-text-primary">
                                                                        {booking.userFullName}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(booking.status)}`}>
                                                                        {booking.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" />
                                                                    {booking.userEmail}
                                                                </p>
                                                                {booking.purpose && (
                                                                    <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                                                                        📝 {booking.purpose}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
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
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-3 text-text-secondary text-sm">
                                                        {slotStatus === 'available' ? 'Available for booking' : 'No bookings'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {calendarView === 'list' && (
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
            )}

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

                            {!adminAction.status && selectedBooking.status === 'PENDING' && (
                                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                        <p className="text-xs text-yellow-700">
                                            This booking is pending approval. Approving this booking will automatically reject all other pending bookings for the same time slot.
                                        </p>
                                    </div>
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