// src/pages/admin/AdminBookingManagement.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, CheckCircle, XCircle, Eye, Building, ChevronLeft, ChevronRight, AlertCircle, Loader2, Users } from 'lucide-react';
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
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [timeSlots, setTimeSlots] = useState([]);

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
        if (calendarView === 'list') {
            fetchListBookings();
        }
    }, [filters, calendarView]);

    useEffect(() => {
        if (calendarView === 'calendar' && selectedResource) {
            fetchCalendarData();
        }
    }, [selectedResource, selectedDate, filters.status, calendarView]);

    const fetchResources = async () => {
        try {
            const data = await resourceService.listResources({ size: 100 });
            setResources(data.content || data);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        }
    };

    const fetchListBookings = async () => {
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
            const bookingsData = data.content || data;
            setBookings(bookingsData);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
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

            console.log('Calendar API params:', params);
            const data = await bookingService.getAllBookings(params);
            const bookingsData = data.content || data;
            console.log('Calendar bookings:', bookingsData);

            setBookings(bookingsData);
            generateTimeSlots(bookingsData);

        } catch (error) {
            console.error('Failed to load calendar data:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setCalendarLoading(false);
        }
    };

    // Helper function to format time to HH:MM format
    const formatTimeToHHMM = (timeStr) => {
        if (!timeStr) return '';
        // If time is in format "14:00:00", take first 5 characters
        if (typeof timeStr === 'string' && timeStr.includes(':')) {
            return timeStr.substring(0, 5);
        }
        return timeStr;
    };

    const generateTimeSlots = (bookingsData) => {
        const slots = [];

        console.log('Generating slots for bookings count:', bookingsData.length);

        for (let hour = START_TIME; hour < END_TIME; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

            // Filter bookings for this slot - FIXED: compare only HH:MM part
            const slotBookings = bookingsData.filter(booking => {
                const bookingStart = formatTimeToHHMM(booking.startTime);
                const bookingEnd = formatTimeToHHMM(booking.endTime);
                const match = bookingStart === startTime && bookingEnd === endTime;
                if (match) {
                    console.log(`✅ Slot ${startTime} matched booking:`, booking);
                }
                return match;
            });

            console.log(`Slot ${startTime}-${endTime}: found ${slotBookings.length} bookings`);

            const approvedCount = slotBookings.filter(b => b.status === 'APPROVED').length;
            const pendingCount = slotBookings.filter(b => b.status === 'PENDING').length;
            const rejectedCount = slotBookings.filter(b => b.status === 'REJECTED').length;
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
                totalCount,
                status: slotStatus
            });
        }

        console.log('Generated slots summary:', slots.map(s => ({
            time: `${s.startTime}-${s.endTime}`,
            count: s.totalCount,
            status: s.status
        })));

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

            if (calendarView === 'list') {
                fetchListBookings();
            } else {
                fetchCalendarData();
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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ status: '', bookingDate: '', resourceId: '' });
        setSelectedResource(null);
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

    const getSlotClasses = (status) => {
        if (status === 'approved') return 'bg-red-50 border-red-200';
        if (status === 'pending') return 'bg-yellow-50 border-yellow-200';
        return 'bg-white border-gray-200';
    };

    const renderTimeSlots = () => {
        if (!selectedResource) {
            return (
                <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-text-secondary">Select a resource to view the calendar</p>
                </div>
            );
        }

        if (calendarLoading) {
            return (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            );
        }

        if (timeSlots.length === 0) {
            return (
                <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-text-secondary">Loading time slots...</p>
                </div>
            );
        }

        // Check if there are any bookings in timeSlots
        const hasAnyBookings = timeSlots.some(slot => slot.totalCount > 0);
        console.log('Has any bookings in slots:', hasAnyBookings);

        return (
            <div className="space-y-4">
                {timeSlots.map((slot, idx) => (
                    <div key={idx} className={`border rounded-xl overflow-hidden ${getSlotClasses(slot.status)}`}>
                        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-semibold">{slot.startTime} - {slot.endTime}</span>
                                {slot.totalCount > 0 && (
                                    <div className="flex gap-2">
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {slot.totalCount} request{slot.totalCount !== 1 ? 's' : ''}
                                        </span>
                                        {slot.approvedCount > 0 && (
                                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                ✓ {slot.approvedCount} approved
                                            </span>
                                        )}
                                        {slot.pendingCount > 0 && (
                                            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                                                ⏳ {slot.pendingCount} pending
                                            </span>
                                        )}
                                        {slot.rejectedCount > 0 && (
                                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                ✗ {slot.rejectedCount} rejected
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 space-y-2">
                            {slot.bookings.length > 0 ? (
                                slot.bookings.map(booking => (
                                    <div key={booking.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">{booking.userFullName}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> {booking.userEmail}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            {booking.purpose && (
                                                <p className="text-sm mt-2 ml-10">📝 {booking.purpose}</p>
                                            )}
                                            {booking.expectedAttendees && (
                                                <p className="text-xs text-gray-500 mt-1 ml-10">👥 {booking.expectedAttendees} attendees</p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1 ml-10">
                                                Requested: {format(new Date(booking.createdAt), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openActionModal(booking, 'APPROVED')}
                                                disabled={booking.status !== 'PENDING'}
                                                className={`p-2 rounded-lg ${booking.status === 'PENDING' ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 cursor-not-allowed'}`}
                                                title="Approve"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => openActionModal(booking, 'REJECTED')}
                                                disabled={booking.status !== 'PENDING'}
                                                className={`p-2 rounded-lg ${booking.status === 'PENDING' ? 'text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                                                title="Reject"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedBooking(booking);
                                                    setShowModal(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-primary rounded-lg"
                                                title="Details"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span>No bookings for this time slot</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
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
                        onClick={() => {
                            setCalendarView('list');
                            fetchListBookings();
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            calendarView === 'list'
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        List View
                    </button>
                    <button
                        onClick={() => {
                            setCalendarView('calendar');
                        }}
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
                            onChange={(e) => handleFilterChange('status', e.target.value)}
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
                            onChange={(e) => handleFilterChange('bookingDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Resource</label>
                        <select
                            value={filters.resourceId}
                            onChange={(e) => handleFilterChange('resourceId', e.target.value)}
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
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-primary transition"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {calendarView === 'calendar' && (
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <label className="block text-sm font-semibold text-text-primary mb-3">Select Resource for Calendar View</label>
                        <select
                            value={selectedResource?.id || ''}
                            onChange={(e) => {
                                const resource = resources.find(r => r.id === e.target.value);
                                console.log('Selected resource:', resource);
                                setSelectedResource(resource || null);
                                setTimeSlots([]);
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

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Building className="w-5 h-5 text-primary" />
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary">
                                            {selectedResource ? selectedResource.name : 'No Resource Selected'}
                                        </h3>
                                        {selectedResource && (
                                            <p className="text-xs text-text-secondary">{selectedResource.type} • {selectedResource.location}</p>
                                        )}
                                    </div>
                                </div>
                                {selectedResource && (
                                    <div className="flex items-center gap-4">
                                        <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-xl">
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <span className="text-base font-semibold min-w-[140px] text-center">
                                            {format(selectedDate, 'EEEE, MMM d, yyyy')}
                                        </span>
                                        <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-xl">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {selectedResource && (
                                <div className="flex items-center gap-6 mt-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                                        <span className="text-xs">Available</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                                        <span className="text-xs">Pending Requests</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                                        <span className="text-xs">Approved Bookings</span>
                                    </div>
                                    {filters.status && filters.status !== '' && (
                                        <div className="px-3 py-1 bg-blue-50 rounded-full">
                                            <span className="text-xs text-blue-600">Filtered: {filters.status}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            {renderTimeSlots()}
                        </div>
                    </div>
                </div>
            )}

            {calendarView === 'list' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Resource</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">User</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Date & Time</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Purpose</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p>No bookings found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map(booking => (
                                        <tr key={booking.id} className="hover:bg-gray-50/30">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-medium">{booking.resourceName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium">{booking.userFullName}</p>
                                                <p className="text-xs text-gray-500">{booking.userEmail}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>{format(new Date(booking.bookingDate), 'MMM d, yyyy')}</div>
                                                <div className="text-xs text-gray-500">{booking.startTime} - {booking.endTime}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm line-clamp-2 max-w-xs">{booking.purpose || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(booking.status)}`}>
                                                        {getStatusIcon(booking.status)} {booking.status}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openActionModal(booking, 'APPROVED')} disabled={booking.status !== 'PENDING'} className={`p-2 rounded-lg ${booking.status === 'PENDING' ? 'text-green-600 hover:bg-green-50' : 'text-gray-300'}`}>
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => openActionModal(booking, 'REJECTED')} disabled={booking.status !== 'PENDING'} className={`p-2 rounded-lg ${booking.status === 'PENDING' ? 'text-red-600 hover:bg-red-50' : 'text-gray-300'}`}>
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => { setSelectedBooking(booking); setShowModal(true); }} className="p-2 text-gray-400 hover:text-primary">
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${adminAction.status === 'APPROVED' ? 'bg-green-100' : adminAction.status === 'REJECTED' ? 'bg-red-100' : 'bg-gray-100'}`}>
                                    {adminAction.status === 'APPROVED' ? <CheckCircle className="w-6 h-6 text-green-600" /> : adminAction.status === 'REJECTED' ? <XCircle className="w-6 h-6 text-red-600" /> : <Eye className="w-6 h-6 text-primary" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{adminAction.status ? `${adminAction.status} Booking` : 'Booking Details'}</h3>
                                    <p className="text-sm text-gray-500">{selectedBooking.resourceName} • {selectedBooking.userFullName}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                <div><p className="text-xs font-bold uppercase">Date</p><p className="text-sm font-semibold mt-1">{format(new Date(selectedBooking.bookingDate), 'MMMM d, yyyy')}</p></div>
                                <div><p className="text-xs font-bold uppercase">Time</p><p className="text-sm font-semibold mt-1">{selectedBooking.startTime} - {selectedBooking.endTime}</p></div>
                            </div>
                            <div><p className="text-xs font-bold uppercase mb-1">Purpose</p><p className="text-sm bg-gray-50 p-3 rounded-xl">{selectedBooking.purpose || 'No purpose specified'}</p></div>
                            {adminAction.status && (
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2">Reason {adminAction.status === 'REJECTED' ? '(Required)' : '(Optional)'}</label>
                                    <textarea value={adminAction.reason} onChange={(e) => setAdminAction({ ...adminAction, reason: e.target.value })} rows="3" className="w-full px-4 py-2 border rounded-xl text-sm" placeholder={adminAction.status === 'REJECTED' ? "Please provide a reason..." : "Add notes (optional)"} required={adminAction.status === 'REJECTED'} />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t flex gap-3">
                            <button onClick={() => { setShowModal(false); setSelectedBooking(null); setAdminAction({ status: '', reason: '' }); }} className="flex-1 px-4 py-2 border rounded-xl text-sm font-semibold">Cancel</button>
                            {adminAction.status && (
                                <button onClick={handleStatusUpdate} disabled={processing || (adminAction.status === 'REJECTED' && !adminAction.reason)} className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white ${adminAction.status === 'APPROVED' ? 'bg-green-600' : 'bg-red-600'} disabled:opacity-50`}>
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Confirm ${adminAction.status}`}
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