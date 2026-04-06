// src/pages/MyBookings.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, CheckCircle, XCircle, Eye, Building, Edit2, Trash2, AlertCircle, Loader2, Users, Filter, X, Save } from 'lucide-react';
import bookingService from '../services/bookingService';
import resourceService from '../services/resourceService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingBooking, setEditingBooking] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [editForm, setEditForm] = useState({
        purpose: '',
        expectedAttendees: ''
    });

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        fetchMyBookings();
    }, [selectedStatus]);

    const fetchResources = async () => {
        try {
            const data = await resourceService.listResources({ size: 100 });
            setResources(data.content || data);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        }
    };

    const fetchMyBookings = async () => {
        setLoading(true);
        try {
            const params = {};
            if (selectedStatus && selectedStatus !== '') {
                params.status = selectedStatus;
            }
            const data = await bookingService.getMyBookings(params);
            const bookingsData = data.content || data;
            setBookings(bookingsData);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            toast.error('Failed to load your bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        setProcessing(true);
        try {
            await bookingService.cancelBooking(bookingId);
            toast.success('Booking cancelled successfully');
            setShowCancelConfirm(false);
            setSelectedBookingForCancel(null);
            fetchMyBookings();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to cancel booking';
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const handleEditBooking = async () => {
        if (!editingBooking) return;
        setProcessing(true);
        try {
            await bookingService.updateBooking(editingBooking.id, {
                purpose: editForm.purpose,
                expectedAttendees: editForm.expectedAttendees ? parseInt(editForm.expectedAttendees) : null
            });
            toast.success('Booking updated successfully');
            setShowEditModal(false);
            setEditingBooking(null);
            setEditForm({ purpose: '', expectedAttendees: '' });
            fetchMyBookings();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to update booking';
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    const openEditModal = (booking) => {
        setEditingBooking(booking);
        setEditForm({
            purpose: booking.purpose || '',
            expectedAttendees: booking.expectedAttendees || ''
        });
        setShowEditModal(true);
    };

    const openCancelModal = (booking) => {
        setSelectedBookingForCancel(booking);
        setShowCancelConfirm(true);
    };

    const handleStatusFilter = (status) => {
        setSelectedStatus(status);
        setShowFilters(false);
    };

    const clearFilter = () => {
        setSelectedStatus('');
        setShowFilters(false);
    };

    const getStatusConfig = (status) => {
        const configs = {
            PENDING: {
                bg: 'bg-amber-50',
                text: 'text-amber-700',
                border: 'border-amber-200',
                icon: <Clock className="w-4 h-4" />,
                label: 'Pending',
                canEdit: true,
                canCancel: true,
                cancelClass: 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
            },
            APPROVED: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-700',
                border: 'border-emerald-200',
                icon: <CheckCircle className="w-4 h-4" />,
                label: 'Approved',
                canEdit: false,
                canCancel: true,
                cancelClass: 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
            },
            REJECTED: {
                bg: 'bg-rose-50',
                text: 'text-rose-700',
                border: 'border-rose-200',
                icon: <XCircle className="w-4 h-4" />,
                label: 'Rejected',
                canEdit: false,
                canCancel: false,
                cancelClass: ''
            },
            CANCELLED: {
                bg: 'bg-gray-50',
                text: 'text-gray-600',
                border: 'border-gray-200',
                icon: <XCircle className="w-4 h-4" />,
                label: 'Cancelled',
                canEdit: false,
                canCancel: false,
                cancelClass: ''
            }
        };
        return configs[status] || configs.PENDING;
    };

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

    const getResourceDetails = (resourceId) => {
        return resources.find(r => r.id === resourceId);
    };

    const getStatusDisplayName = () => {
        switch(selectedStatus) {
            case 'PENDING': return 'Pending';
            case 'APPROVED': return 'Approved';
            case 'REJECTED': return 'Rejected';
            case 'CANCELLED': return 'Cancelled';
            default: return null;
        }
    };

    const stats = {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'PENDING').length,
        approved: bookings.filter(b => b.status === 'APPROVED').length,
        rejected: bookings.filter(b => b.status === 'REJECTED').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length
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
                                            <h1 className="text-2xl font-bold text-text-primary">My Bookings</h1>
                                            <p className="text-sm text-text-secondary mt-0.5">
                                                View and manage all your resource booking requests
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                        showFilters || selectedStatus
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Filter</span>
                                    {selectedStatus && (
                                        <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                                            1
                                        </span>
                                    )}
                                </button>
                            </div>

                            {showFilters && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-text-primary">Filter by Status</h4>
                                        {selectedStatus && (
                                            <button onClick={clearFilter} className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                                                <X className="w-3 h-3" /> Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button onClick={() => handleStatusFilter('')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!selectedStatus ? 'bg-primary text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>All Bookings</button>
                                        <button onClick={() => handleStatusFilter('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}><Clock className="w-4 h-4 inline mr-1" /> Pending</button>
                                        <button onClick={() => handleStatusFilter('APPROVED')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === 'APPROVED' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><CheckCircle className="w-4 h-4 inline mr-1" /> Approved</button>
                                        <button onClick={() => handleStatusFilter('REJECTED')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === 'REJECTED' ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}><XCircle className="w-4 h-4 inline mr-1" /> Rejected</button>
                                        <button onClick={() => handleStatusFilter('CANCELLED')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === 'CANCELLED' ? 'bg-gray-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><XCircle className="w-4 h-4 inline mr-1" /> Cancelled</button>
                                    </div>
                                </div>
                            )}

                            {selectedStatus && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="px-3 py-1.5 bg-primary/10 rounded-full">
                                        <span className="text-xs font-medium text-primary">Showing: {getStatusDisplayName()} bookings</span>
                                    </div>
                                    <button onClick={clearFilter} className="text-xs text-gray-400 hover:text-gray-600 transition"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {bookings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Bookings</p><p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p></div><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div></div></div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Pending</p><p className="text-2xl font-bold text-text-primary mt-1">{stats.pending}</p></div><div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-500" /></div></div></div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Approved</p><p className="text-2xl font-bold text-text-primary mt-1">{stats.approved}</p></div><div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-500" /></div></div></div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Rejected</p><p className="text-2xl font-bold text-text-primary mt-1">{stats.rejected}</p></div><div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-rose-500" /></div></div></div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Cancelled</p><p className="text-2xl font-bold text-text-primary mt-1">{stats.cancelled}</p></div><div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><XCircle className="w-5 h-5 text-gray-500" /></div></div></div>
                    </div>
                )}

                {/* Bookings List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16"><Loader2 className="w-10 h-10 text-primary animate-spin mb-3" /><p className="text-text-secondary text-sm">Loading your bookings...</p></div>
                    ) : bookings.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-5"><Calendar className="w-12 h-12 text-primary" /></div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">No Bookings Found</h3>
                            <p className="text-text-secondary max-w-md mx-auto">{selectedStatus ? `You don't have any ${getStatusDisplayName()?.toLowerCase()} bookings. Try clearing the filter to see all bookings.` : "You haven't made any booking requests yet. Browse resources and book your first slot!"}</p>
                            {selectedStatus && <button onClick={clearFilter} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition">Clear Filters</button>}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {bookings.map((booking) => {
                                const resource = getResourceDetails(booking.resourceId);
                                const statusConfig = getStatusConfig(booking.status);
                                const canEdit = statusConfig.canEdit && booking.status === 'PENDING';
                                const canCancel = statusConfig.canCancel;

                                return (
                                    <div key={booking.id} className="p-6 hover:bg-gray-50/30 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-2xl">{resource ? getResourceIcon(resource.type) : '🏢'}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 flex-wrap mb-2">
                                                            <h3 className="text-lg font-bold text-text-primary">{booking.resourceName}</h3>
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                                                                {statusConfig.icon}<span>{statusConfig.label}</span>
                                                            </span>
                                                        </div>
                                                        {resource && (<p className="text-xs text-text-secondary mb-3">{resource.type?.replace(/_/g, ' ')} • Capacity: {resource.capacity} • {resource.location}</p>)}
                                                        <div className="flex flex-wrap gap-4 mb-3">
                                                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-text-secondary" /><span className="text-sm text-text-primary">{format(new Date(booking.bookingDate), 'EEEE, MMM d, yyyy')}</span></div>
                                                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-text-secondary" /><span className="text-sm text-text-primary">{booking.startTime} - {booking.endTime}</span></div>
                                                            {booking.expectedAttendees && (<div className="flex items-center gap-2"><Users className="w-4 h-4 text-text-secondary" /><span className="text-sm text-text-primary">{booking.expectedAttendees} attendees</span></div>)}
                                                        </div>
                                                        {booking.purpose && (<div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100"><p className="text-sm text-text-primary">📝 {booking.purpose}</p></div>)}
                                                        {booking.adminReason && (booking.status === 'REJECTED' || booking.status === 'CANCELLED') && (
                                                            <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg border ${booking.status === 'REJECTED' ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-200'}`}>
                                                                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${booking.status === 'REJECTED' ? 'text-rose-600' : 'text-gray-500'}`} />
                                                                <div>
                                                                    <p className={`text-xs font-semibold ${booking.status === 'REJECTED' ? 'text-rose-700' : 'text-gray-600'}`}>{booking.status === 'REJECTED' ? 'Reason for rejection:' : 'Reason for cancellation:'}</p>
                                                                    <p className={`text-sm ${booking.status === 'REJECTED' ? 'text-rose-600' : 'text-gray-500'}`}>{booking.adminReason}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-text-secondary mt-3">Requested on {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-row lg:flex-col gap-2 lg:items-end">
                                                {canEdit && (
                                                    <button onClick={() => openEditModal(booking)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-text-primary hover:bg-gray-50 hover:border-primary/30 transition-all">
                                                        <Edit2 className="w-4 h-4" /> Edit
                                                    </button>
                                                )}
                                                {canCancel && (
                                                    <button onClick={() => openCancelModal(booking)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${statusConfig.cancelClass}`}>
                                                        <Trash2 className="w-4 h-4" /> Cancel {booking.status === 'APPROVED' ? 'Booking' : 'Request'}
                                                    </button>
                                                )}
                                                {!canEdit && !canCancel && booking.status === 'APPROVED' && (
                                                    <div className="px-4 py-2 bg-emerald-50 rounded-xl text-sm font-medium text-emerald-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Confirmed</div>
                                                )}
                                                {!canEdit && !canCancel && booking.status === 'REJECTED' && (
                                                    <div className="px-4 py-2 bg-rose-50 rounded-xl text-sm font-medium text-rose-600 flex items-center gap-2"><XCircle className="w-4 h-4" /> Not Approved</div>
                                                )}
                                                {!canEdit && !canCancel && booking.status === 'CANCELLED' && (
                                                    <div className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancelled</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Cancel Confirmation Modal */}
                {showCancelConfirm && selectedBookingForCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className={`p-6 border-b border-gray-100 ${
                                selectedBookingForCancel.status === 'APPROVED'
                                    ? 'bg-gradient-to-r from-amber-50 to-white'
                                    : 'bg-gradient-to-r from-rose-50 to-white'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${
                                        selectedBookingForCancel.status === 'APPROVED'
                                            ? 'bg-amber-100'
                                            : 'bg-rose-100'
                                    } flex items-center justify-center`}>
                                        <AlertCircle className={`w-5 h-5 ${
                                            selectedBookingForCancel.status === 'APPROVED'
                                                ? 'text-amber-600'
                                                : 'text-rose-600'
                                        }`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">
                                            Cancel {selectedBookingForCancel.status === 'APPROVED' ? 'Booking' : 'Request'}
                                        </h3>
                                        <p className="text-sm text-text-secondary">
                                            Are you sure you want to cancel this {selectedBookingForCancel.status === 'APPROVED' ? 'approved booking' : 'pending request'}?
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-text-primary">
                                    {selectedBookingForCancel.status === 'APPROVED'
                                        ? "This booking is confirmed. Cancelling it will free up the time slot for others. This action cannot be undone."
                                        : "This action cannot be undone. The time slot will become available for other users."}
                                </p>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-text-primary">{selectedBookingForCancel.resourceName}</p>
                                    <p className="text-xs text-text-secondary mt-1">
                                        {format(new Date(selectedBookingForCancel.bookingDate), 'EEEE, MMM d, yyyy')} •
                                        {selectedBookingForCancel.startTime} - {selectedBookingForCancel.endTime}
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3">
                                <button onClick={() => { setShowCancelConfirm(false); setSelectedBookingForCancel(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                                    Keep {selectedBookingForCancel.status === 'APPROVED' ? 'Booking' : 'Request'}
                                </button>
                                <button onClick={() => handleCancelBooking(selectedBookingForCancel.id)} disabled={processing} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
                                    selectedBookingForCancel.status === 'APPROVED'
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                } disabled:opacity-50`}>
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Booking Modal */}
                {showEditModal && editingBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Edit2 className="w-5 h-5 text-primary" /></div>
                                    <div><h3 className="text-xl font-bold text-text-primary">Edit Booking</h3><p className="text-sm text-text-secondary">{editingBooking.resourceName} • {format(new Date(editingBooking.bookingDate), 'MMM d, yyyy')} • {editingBooking.startTime} - {editingBooking.endTime}</p></div>
                                </div>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleEditBooking(); }} className="p-6 space-y-4">
                                <div><label className="block text-sm font-semibold text-text-primary mb-2">Purpose of Booking <span className="text-red-500">*</span></label><textarea value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} rows="3" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Describe the purpose of your booking..." required /></div>
                                <div><label className="block text-sm font-semibold text-text-primary mb-2">Expected Attendees</label><input type="number" value={editForm.expectedAttendees} onChange={(e) => setEditForm({ ...editForm, expectedAttendees: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Number of people attending" min="1" /></div>
                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100"><div className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" /><div><p className="text-xs font-semibold text-amber-700">Note</p><p className="text-xs text-amber-600">Editing your booking will not change the time slot. Your request will remain pending and will need to be approved again by an admin.</p></div></div></div>
                                <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowEditModal(false); setEditingBooking(null); setEditForm({ purpose: '', expectedAttendees: '' }); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button><button type="submit" disabled={processing} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50 flex items-center justify-center gap-2">{processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}</button></div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBookings;