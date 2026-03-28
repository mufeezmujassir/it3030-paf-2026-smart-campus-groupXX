// src/pages/admin/AdminBookingManagement.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, CheckCircle, XCircle, Eye, Building, ChevronLeft, ChevronRight, AlertCircle, Loader2, Users, TrendingUp, Award, Clock as ClockIcon, Filter, X } from 'lucide-react';
import bookingService from '../../services/bookingService';
import resourceService from '../../services/resourceService';
import { toast } from 'react-toastify';
import { format, addDays, subDays, isBefore, startOfDay } from 'date-fns';

const AdminBookingManagement = () => {
    const [resources, setResources] = useState([]);
    const [selectedResource, setSelectedResource] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [timeSlots, setTimeSlots] = useState([]);
    const [stats, setStats] = useState({ totalRequests: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 });

    const [filters, setFilters] = useState({
        status: ''
    });
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [adminAction, setAdminAction] = useState({ status: '', reason: '' });
    const [processing, setProcessing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const START_TIME = 8;
    const END_TIME = 17;

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        if (selectedResource) {
            fetchCalendarData();
        }
    }, [selectedResource, selectedDate, filters.status]);

    const fetchResources = async () => {
        try {
            const data = await resourceService.listResources({ size: 100 });
            setResources(data.content || data);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        }
    };

    const fetchCalendarData = async () => {
        if (!selectedResource) return;

        setCalendarLoading(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');

            const params = {
                resourceId: selectedResource.id,
                bookingDate: formattedDate
            };

            if (filters.status && filters.status !== '') {
                params.status = filters.status;
            }

            const data = await bookingService.getAllBookings(params);
            const bookingsData = data.content || data;

            generateTimeSlots(bookingsData);
            calculateStats(bookingsData);

        } catch (error) {
            console.error('Failed to load calendar data:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setCalendarLoading(false);
        }
    };

    const formatTimeToHHMM = (timeStr) => {
        if (!timeStr) return '';
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            return timeStr.substring(0, 5);
        }
        return timeStr;
    };

    const calculateStats = (bookingsData) => {
        const total = bookingsData.length;
        const approved = bookingsData.filter(b => b.status === 'APPROVED').length;
        const pending = bookingsData.filter(b => b.status === 'PENDING').length;
        const rejected = bookingsData.filter(b => b.status === 'REJECTED').length;
        const cancelled = bookingsData.filter(b => b.status === 'CANCELLED').length;
        setStats({ totalRequests: total, approved, pending, rejected, cancelled });
    };

    const generateTimeSlots = (bookingsData) => {
        const slots = [];

        for (let hour = START_TIME; hour < END_TIME; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

            const slotBookings = bookingsData.filter(booking => {
                const bookingStart = formatTimeToHHMM(booking.startTime);
                const bookingEnd = formatTimeToHHMM(booking.endTime);
                return bookingStart === startTime && bookingEnd === endTime;
            });

            const approvedCount = slotBookings.filter(b => b.status === 'APPROVED').length;
            const pendingCount = slotBookings.filter(b => b.status === 'PENDING').length;
            const rejectedCount = slotBookings.filter(b => b.status === 'REJECTED').length;
            const cancelledCount = slotBookings.filter(b => b.status === 'CANCELLED').length;
            const totalCount = slotBookings.length;

            let slotStatus = 'available';
            if (approvedCount > 0) {
                slotStatus = 'approved';
            } else if (pendingCount > 0) {
                slotStatus = 'pending';
            }

            slots.push({
                startTime,
                endTime,
                hour,
                bookings: slotBookings,
                approvedCount,
                pendingCount,
                rejectedCount,
                cancelledCount,
                totalCount,
                status: slotStatus
            });
        }

        setTimeSlots(slots);
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
            fetchCalendarData();
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

    const handleFilterChange = (value) => {
        setFilters({ status: value });
        setShowFilters(false);
    };

    const clearFilters = () => {
        setFilters({ status: '' });
        setShowFilters(false);
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
            APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
            CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200'
        };
        return styles[status] || styles.PENDING;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="w-3 h-3" />;
            case 'REJECTED': return <XCircle className="w-3 h-3" />;
            case 'CANCELLED': return <XCircle className="w-3 h-3" />;
            default: return <Clock className="w-3 h-3" />;
        }
    };

    const getSlotClasses = (status) => {
        if (status === 'approved') return 'bg-gradient-to-r from-rose-50 to-white border-rose-200';
        if (status === 'pending') return 'bg-gradient-to-r from-amber-50 to-white border-amber-200';
        return 'bg-white border-gray-100 hover:border-primary/20';
    };

    const StatCard = ({ icon, title, value, color }) => (
        <div className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    const getResourceIcon = (type) => {
        const icons = {
            LAB: '🧪',
            LECTURE_HALL: '📚',
            MEETING_SPACE: '💼',
            STUDY_ROOM: '📖',
            EQUIPMENT: '🔧'
        };
        return icons[type] || '🏢';
    };

    const getActiveFilterName = () => {
        switch(filters.status) {
            case 'PENDING': return 'Pending';
            case 'APPROVED': return 'Approved';
            case 'REJECTED': return 'Rejected';
            case 'CANCELLED': return 'Cancelled';
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-text-primary">Booking Management</h1>
                                            <p className="text-sm text-text-secondary mt-0.5">
                                                Manage and review all resource booking requests
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                {selectedResource && stats.totalRequests > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        <div className="px-3 py-1.5 bg-emerald-50 rounded-full">
                                            <span className="text-xs font-semibold text-emerald-600">✓ {stats.approved} Approved</span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-amber-50 rounded-full">
                                            <span className="text-xs font-semibold text-amber-600">⏳ {stats.pending} Pending</span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-rose-50 rounded-full">
                                            <span className="text-xs font-semibold text-rose-600">✗ {stats.rejected} Rejected</span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-gray-100 rounded-full">
                                            <span className="text-xs font-semibold text-gray-600">✗ {stats.cancelled} Cancelled</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resource Selector with Enhanced Design */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                        Select Resource
                                    </label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedResource?.id || ''}
                                            onChange={(e) => {
                                                const resource = resources.find(r => r.id === e.target.value);
                                                setSelectedResource(resource || null);
                                                setTimeSlots([]);
                                            }}
                                            className="w-full md:w-96 pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        >
                                            <option value="">Choose a resource...</option>
                                            {resources.map(resource => (
                                                <option key={resource.id} value={resource.id}>
                                                    {getResourceIcon(resource.type)} {resource.name} ({resource.type?.replace(/_/g, ' ')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Filter Toggle Button */}
                                <div>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                            showFilters || filters.status
                                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Filter className="w-4 h-4" />
                                        <span>Filters</span>
                                        {filters.status && (
                                            <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                                                1
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Filter Panel */}
                            {showFilters && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-text-primary">Filter by Status</h4>
                                        {filters.status && (
                                            <button
                                                onClick={clearFilters}
                                                className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
                                            >
                                                <X className="w-3 h-3" /> Clear all
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleFilterChange('')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                !filters.status
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            All Status
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('PENDING')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                filters.status === 'PENDING'
                                                    ? 'bg-amber-500 text-white shadow-sm'
                                                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                            }`}
                                        >
                                            ⏳ Pending
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('APPROVED')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                filters.status === 'APPROVED'
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                            }`}
                                        >
                                            ✓ Approved
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('REJECTED')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                filters.status === 'REJECTED'
                                                    ? 'bg-rose-500 text-white shadow-sm'
                                                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                            }`}
                                        >
                                            ✗ Rejected
                                        </button>
                                        <button
                                            onClick={() => handleFilterChange('CANCELLED')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                filters.status === 'CANCELLED'
                                                    ? 'bg-gray-500 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            ✗ Cancelled
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Active Filter Badge */}
                            {filters.status && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="px-3 py-1.5 bg-primary/10 rounded-full">
                                        <span className="text-xs font-medium text-primary">
                                            Showing: {getActiveFilterName()} bookings
                                        </span>
                                    </div>
                                    <button
                                        onClick={clearFilters}
                                        className="text-xs text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards - Only show when resource selected */}
                {selectedResource && stats.totalRequests > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5 text-primary" />}
                            title="Total Requests"
                            value={stats.totalRequests}
                            color="primary"
                        />
                        <StatCard
                            icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                            title="Approved"
                            value={stats.approved}
                            color="emerald"
                        />
                        <StatCard
                            icon={<ClockIcon className="w-5 h-5 text-amber-500" />}
                            title="Pending"
                            value={stats.pending}
                            color="amber"
                        />
                        <StatCard
                            icon={<XCircle className="w-5 h-5 text-rose-500" />}
                            title="Rejected"
                            value={stats.rejected}
                            color="rose"
                        />
                        <StatCard
                            icon={<XCircle className="w-5 h-5 text-gray-500" />}
                            title="Cancelled"
                            value={stats.cancelled}
                            color="gray"
                        />
                    </div>
                )}

                {/* Calendar Container */}
                {selectedResource ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Calendar Header with Date Navigation */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="text-2xl">{getResourceIcon(selectedResource.type)}</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary">{selectedResource.name}</h2>
                                        <p className="text-xs text-text-secondary">{selectedResource.type?.replace(/_/g, ' ')} • Capacity: {selectedResource.capacity} • {selectedResource.location}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                                    <button
                                        onClick={handlePrevDay}
                                        className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                                    </button>
                                    <div className="px-4 py-1 text-center">
                                        <p className="text-sm font-semibold text-text-primary">
                                            {format(selectedDate, 'EEEE')}
                                        </p>
                                        <p className="text-xs text-text-secondary">
                                            {format(selectedDate, 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleNextDay}
                                        className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-4 mt-5 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                                    <span className="text-xs text-text-secondary">Available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
                                    <span className="text-xs text-text-secondary">Pending Requests</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-rose-100 border border-rose-200 rounded"></div>
                                    <span className="text-xs text-text-secondary">Approved Bookings</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                                    <span className="text-xs text-text-secondary">Cancelled</span>
                                </div>
                                {filters.status && filters.status !== '' && (
                                    <div className="ml-auto">
                                        <div className="px-3 py-1 bg-primary/10 rounded-full">
                                            <span className="text-xs text-primary font-medium">
                                                Filtered: {getActiveFilterName()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Time Slots */}
                        <div className="p-6">
                            {calendarLoading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                                    <p className="text-text-secondary text-sm">Loading bookings...</p>
                                </div>
                            ) : timeSlots.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Clock className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-text-primary mb-1">No Time Slots Available</h3>
                                    <p className="text-sm text-text-secondary">
                                        Bookings are available from 8:00 AM to 5:00 PM
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {timeSlots.map((slot, idx) => (
                                        <div
                                            key={idx}
                                            className={`border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md ${getSlotClasses(slot.status)}`}
                                        >
                                            {/* Slot Header */}
                                            <div className="px-5 py-3 bg-gray-50/50 border-b flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                                        <Clock className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <span className="text-base font-semibold text-text-primary">
                                                            {slot.startTime} - {slot.endTime}
                                                        </span>
                                                        {slot.totalCount > 0 && (
                                                            <span className="ml-2 text-xs text-text-secondary">
                                                                ({slot.totalCount} request{slot.totalCount !== 1 ? 's' : ''})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {slot.totalCount > 0 && (
                                                    <div className="flex gap-2 flex-wrap">
                                                        {slot.approvedCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg text-xs font-medium text-emerald-600">
                                                                <CheckCircle className="w-3 h-3" />
                                                                {slot.approvedCount}
                                                            </span>
                                                        )}
                                                        {slot.pendingCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg text-xs font-medium text-amber-600">
                                                                <Clock className="w-3 h-3" />
                                                                {slot.pendingCount}
                                                            </span>
                                                        )}
                                                        {slot.rejectedCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 rounded-lg text-xs font-medium text-rose-600">
                                                                <XCircle className="w-3 h-3" />
                                                                {slot.rejectedCount}
                                                            </span>
                                                        )}
                                                        {slot.cancelledCount > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                                                                <XCircle className="w-3 h-3" />
                                                                {slot.cancelledCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Slot Bookings */}
                                            <div className="p-4 space-y-3">
                                                {slot.bookings.length > 0 ? (
                                                    slot.bookings.map(booking => (
                                                        <div
                                                            key={booking.id}
                                                            className="group bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md transition-all duration-200 hover:border-primary/20"
                                                        >
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                            <User className="w-5 h-5 text-primary" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                                <h4 className="text-sm font-semibold text-text-primary">
                                                                                    {booking.userFullName}
                                                                                </h4>
                                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                                                                                    {getStatusIcon(booking.status)}
                                                                                    <span>{booking.status}</span>
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-text-secondary flex items-center gap-1 mb-2">
                                                                                <Mail className="w-3 h-3" />
                                                                                {booking.userEmail}
                                                                            </p>
                                                                            {booking.purpose && (
                                                                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                                                                    <p className="text-sm text-text-primary">
                                                                                        📝 {booking.purpose}
                                                                                    </p>
                                                                                    {booking.expectedAttendees && (
                                                                                        <p className="text-xs text-text-secondary mt-1">
                                                                                            👥 {booking.expectedAttendees} attendees
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <p className="text-xs text-text-secondary mt-2">
                                                                                Requested: {format(new Date(booking.createdAt), 'MMM d, h:mm a')}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Action Buttons - Only for PENDING bookings */}
                                                                <div className="flex items-center gap-2 md:border-l md:border-gray-100 md:pl-4">
                                                                    {booking.status === 'PENDING' ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => openActionModal(booking, 'APPROVED')}
                                                                                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105 transition-all duration-200"
                                                                                title="Approve Booking"
                                                                            >
                                                                                <CheckCircle className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => openActionModal(booking, 'REJECTED')}
                                                                                className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all duration-200"
                                                                                title="Reject Booking"
                                                                            >
                                                                                <XCircle className="w-5 h-5" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <div className="text-xs text-gray-400 px-2">
                                                                            {booking.status === 'APPROVED' ? 'Approved' :
                                                                                booking.status === 'REJECTED' ? 'Rejected' :
                                                                                    booking.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                                                                        </div>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedBooking(booking);
                                                                            setShowModal(true);
                                                                        }}
                                                                        className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-primary transition-all duration-200"
                                                                        title="View Details"
                                                                    >
                                                                        <Eye className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-6">
                                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                            <span className="text-sm text-text-secondary">No bookings for this time slot</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* No Resource Selected Message */
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-16 text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Calendar className="w-12 h-12 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">Select a Resource</h3>
                            <p className="text-text-secondary max-w-md mx-auto">
                                Choose a resource from the dropdown above to view and manage bookings in calendar view
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Modal */}
                {showModal && selectedBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            adminAction.status === 'APPROVED' ? 'bg-emerald-100' :
                                                adminAction.status === 'REJECTED' ? 'bg-rose-100' : 'bg-primary/10'
                                        }`}>
                                            {adminAction.status === 'APPROVED' ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                                            ) : adminAction.status === 'REJECTED' ? (
                                                <XCircle className="w-6 h-6 text-rose-600" />
                                            ) : (
                                                <Eye className="w-6 h-6 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-text-primary">
                                                {adminAction.status ? `${adminAction.status} Booking` : 'Booking Details'}
                                            </h3>
                                            <p className="text-sm text-text-secondary">
                                                {selectedBooking.resourceName} • {selectedBooking.userFullName}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Date</p>
                                        <p className="text-base font-semibold text-text-primary mt-1">
                                            {format(new Date(selectedBooking.bookingDate), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Time</p>
                                        <p className="text-base font-semibold text-text-primary mt-1">
                                            {selectedBooking.startTime} - {selectedBooking.endTime}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Purpose</p>
                                    <p className="text-sm text-amber-800">
                                        {selectedBooking.purpose || 'No purpose specified'}
                                    </p>
                                </div>

                                {selectedBooking.expectedAttendees && (
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Expected Attendees</p>
                                        <p className="text-sm text-text-primary">{selectedBooking.expectedAttendees} people</p>
                                    </div>
                                )}

                                {adminAction.status && (
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                                            Reason {adminAction.status === 'REJECTED' ? '(Required)' : '(Optional)'}
                                        </label>
                                        <textarea
                                            value={adminAction.reason}
                                            onChange={(e) => setAdminAction({ ...adminAction, reason: e.target.value })}
                                            rows="3"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            placeholder={adminAction.status === 'REJECTED' ?
                                                "Please provide a reason for rejection..." :
                                                "Add any additional notes (optional)"}
                                            required={adminAction.status === 'REJECTED'}
                                        />
                                    </div>
                                )}

                                {!adminAction.status && selectedBooking.status === 'PENDING' && (
                                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-700">
                                            This booking is pending approval. Approving this booking will automatically reject all other pending bookings for the same time slot.
                                        </p>
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
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                {adminAction.status && (
                                    <button
                                        onClick={handleStatusUpdate}
                                        disabled={processing || (adminAction.status === 'REJECTED' && !adminAction.reason)}
                                        className={`
                                            flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all
                                            ${adminAction.status === 'APPROVED'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                                            : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200'}
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                        `}
                                    >
                                        {processing ? (
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
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
        </div>
    );
};

export default AdminBookingManagement;