// src/pages/MyBookings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Edit2, Trash2, AlertCircle, Loader2, Users, Filter, X, Save, QrCode, Download, MapPin, User, Shield } from 'lucide-react';
import bookingService from '../services/bookingService';
import resourceService from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// ─── Helper: has the booking slot already ended? ──────────────────────────────
const isSlotPast = (bookingDate, endTime) => {
    try {
        let year, month, day;
        if (Array.isArray(bookingDate)) {
            [year, month, day] = [bookingDate[0], bookingDate[1] - 1, bookingDate[2]];
        } else {
            const parts = String(bookingDate).split('-').map(Number);
            [year, month, day] = [parts[0], parts[1] - 1, parts[2]];
        }
        const [h, m] = String(endTime).split(':').map(Number);
        return new Date(year, month, day, h, m, 0, 0) < new Date();
    } catch { return false; }
};

// ─── QR Code Modal ────────────────────────────────────────────────────────────
// Uses the free QR server API (no npm package needed — works in any env)
const QRCodeModal = ({ booking, resource, user, onClose }) => {
    const qrRef = useRef(null);

    // Encode all booking info into the QR payload
    // The QR encodes a compact JSON string — a door scanner / admin tablet
    // can decode this and verify the booking ID + status server-side
    // Format the booking date from array or string
    const fmtDate = (d) => {
        try {
            const s = Array.isArray(d)
                ? `${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`
                : String(d);
            return format(new Date(s + 'T00:00:00'), 'EEEE, MMMM d, yyyy');
        } catch { return String(d); }
    };

    // Human-readable plain-text payload — scans as clean bullet list on any phone
    const payload = [
        '════════════════════════',
        '   MAPLELINK BOOKING PASS',
        '════════════════════════',
        '',
        `▸ Resource   : ${booking.resourceName}`,
        `▸ Date       : ${fmtDate(booking.bookingDate)}`,
        `▸ Time       : ${booking.startTime} – ${booking.endTime}`,
        `▸ Status     : ${booking.status}`,
        '',
        `▸ Booked by  : ${booking.userFullName || user?.fullName}`,
        `▸ Email      : ${booking.userEmail || user?.email}`,
        booking.purpose ? `▸ Purpose    : ${booking.purpose}` : null,
        '',
        '────────────────────────',
        `  Booking ID : ${booking.id}`,
        `  Issued     : ${new Date().toLocaleString()}`,
        '────────────────────────',
        '',
        '  Scan to verify at reception',
    ].filter(line => line !== null).join('\n');

    const encodedPayload = encodeURIComponent(payload);
    const qrUrl = `${import.meta.env.VITE_QR_API_URL}?size=280x280&margin=10&data=${encodedPayload}`;

    const handleDownload = async () => {
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `booking-qr-${booking.id.substring(0, 8)}.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to download QR code');
        }
    };

    const resourceIcon = { LAB: '🧪', LECTURE_HALL: '📚', MEETING_SPACE: '💼', STUDY_ROOM: '📖', EQUIPMENT: '🔧' }[resource?.type] || '🏢';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <QrCode className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">Access QR Code</h3>
                                <p className="text-xs text-text-secondary">Show this at the resource entrance</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* QR Code */}
                <div className="p-6 flex flex-col items-center">
                    {/* Verified badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200 mb-4">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved Booking</span>
                    </div>

                    {/* QR image */}
                    <div className="p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-lg mb-4">
                        <img
                            ref={qrRef}
                            src={qrUrl}
                            alt="Booking QR Code"
                            className="w-52 h-52 rounded-lg"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                        />
                        {/* Fallback if QR API fails */}
                        <div className="w-52 h-52 rounded-lg bg-gray-50 hidden items-center justify-center text-center p-4">
                            <div>
                                <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">QR generation failed — check your connection</p>
                            </div>
                        </div>
                    </div>

                    {/* Booking details summary */}
                    <div className="w-full space-y-2 mb-5">
                        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                            <span className="text-lg">{resourceIcon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-text-primary truncate">{booking.resourceName}</p>
                                {resource && <p className="text-xs text-text-secondary truncate">{resource.location}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Calendar className="w-3 h-3 text-text-secondary" />
                                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Date</p>
                                </div>
                                <p className="text-xs font-bold text-text-primary">{fmtDate(booking.bookingDate)}</p>
                            </div>
                            <div className="p-2.5 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Clock className="w-3 h-3 text-text-secondary" />
                                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Time</p>
                                </div>
                                <p className="text-xs font-bold text-text-primary">{booking.startTime} – {booking.endTime}</p>
                            </div>
                        </div>
                        <div className="p-2.5 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <User className="w-3 h-3 text-text-secondary" />
                                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Booked by</p>
                            </div>
                            <p className="text-xs font-bold text-text-primary">{booking.userFullName || user?.fullName}</p>
                            <p className="text-[10px] text-text-secondary">{booking.userEmail || user?.email}</p>
                        </div>
                    </div>

                    {/* Booking ID */}
                    <p className="text-[10px] text-gray-400 font-mono mb-4">
                        ID: {booking.id}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 border border-emerald-200 transition"
                        >
                            <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MyBookings = () => {
    const { user } = useAuth();
    const [bookings,                   setBookings]                   = useState([]);
    const [resources,                  setResources]                  = useState([]);
    const [loading,                    setLoading]                    = useState(true);
    const [editingBooking,             setEditingBooking]             = useState(null);
    const [showEditModal,              setShowEditModal]              = useState(false);
    const [showCancelConfirm,          setShowCancelConfirm]          = useState(false);
    const [selectedBookingForCancel,   setSelectedBookingForCancel]   = useState(null);
    const [selectedStatus,             setSelectedStatus]             = useState('');
    const [showFilters,                setShowFilters]                = useState(false);
    const [processing,                 setProcessing]                 = useState(false);
    const [qrBooking,                  setQrBooking]                  = useState(null); // booking for QR modal

    const [editForm, setEditForm] = useState({ purpose: '', expectedAttendees: '' });

    useEffect(() => { fetchResources(); }, []);
    useEffect(() => { fetchMyBookings(); }, [selectedStatus]);

    const fetchResources = async () => {
        try {
            const data = await resourceService.listResources({ size: 100 });
            setResources(data.content || data);
        } catch (err) { console.error(err); }
    };

    const fetchMyBookings = async () => {
        setLoading(true);
        try {
            const params = { bookingType: 'REGULAR' };
            if (selectedStatus) params.status = selectedStatus;
            const data = await bookingService.getMyBookings(params);
            const all = data.content || data;
            setBookings(all.filter(b => b.bookingType !== 'MAINTENANCE'));
        } catch (err) {
            console.error(err);
            toast.error('Failed to load your bookings');
        } finally { setLoading(false); }
    };

    const handleCancelBooking = async (bookingId) => {
        setProcessing(true);
        try {
            await bookingService.cancelBooking(bookingId);
            toast.success('Booking cancelled successfully');
            setShowCancelConfirm(false);
            setSelectedBookingForCancel(null);
            fetchMyBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel booking');
        } finally { setProcessing(false); }
    };

    const handleEditBooking = async () => {
        if (!editingBooking) return;
        setProcessing(true);
        try {
            await bookingService.updateBooking(editingBooking.id, {
                purpose: editForm.purpose,
                expectedAttendees: editForm.expectedAttendees ? parseInt(editForm.expectedAttendees) : null,
            });
            toast.success('Booking updated successfully');
            setShowEditModal(false);
            setEditingBooking(null);
            setEditForm({ purpose: '', expectedAttendees: '' });
            fetchMyBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update booking');
        } finally { setProcessing(false); }
    };

    const getStatusConfig = (status) => ({
        PENDING: {
            bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
            icon: <Clock className="w-4 h-4" />, label: 'Pending',
            canEdit: true, canCancel: true,
            cancelClass: 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50 border',
        },
        APPROVED: {
            bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
            icon: <CheckCircle className="w-4 h-4" />, label: 'Approved',
            canEdit: false, canCancel: true,
            cancelClass: 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100',
        },
        REJECTED: {
            bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200',
            icon: <XCircle className="w-4 h-4" />, label: 'Rejected',
            canEdit: false, canCancel: false, cancelClass: '',
        },
        CANCELLED: {
            bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200',
            icon: <XCircle className="w-4 h-4" />, label: 'Cancelled',
            canEdit: false, canCancel: false, cancelClass: '',
        },
    }[status] || { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="w-4 h-4" />, label: status, canEdit: false, canCancel: false, cancelClass: '' });

    const getResourceIcon = (type) => ({ LAB: '🧪', LECTURE_HALL: '📚', MEETING_SPACE: '💼', STUDY_ROOM: '📖', EQUIPMENT: '🔧' }[type] || '🏢');
    const getResourceDetails = (id) => resources.find(r => r.id === id);
    const getStatusDisplayName = () => ({ PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled' }[selectedStatus] || null);

    const stats = {
        total:     bookings.length,
        pending:   bookings.filter(b => b.status === 'PENDING').length,
        approved:  bookings.filter(b => b.status === 'APPROVED').length,
        rejected:  bookings.filter(b => b.status === 'REJECTED').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* ── Header ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-text-primary">My Bookings</h1>
                                        <p className="text-sm text-text-secondary mt-0.5">View and manage all your resource booking requests</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${showFilters || selectedStatus ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <Filter className="w-4 h-4" /> Filter
                                    {selectedStatus && <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">1</span>}
                                </button>
                            </div>

                            {showFilters && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-text-primary">Filter by Status</h4>
                                        {selectedStatus && <button onClick={() => { setSelectedStatus(''); setShowFilters(false); }} className="text-xs text-primary flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: '',          label: 'All Bookings', active: 'bg-primary text-white',    inactive: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
                                            { key: 'PENDING',   label: 'Pending',      active: 'bg-amber-500 text-white',  inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                                            { key: 'APPROVED',  label: 'Approved',     active: 'bg-emerald-500 text-white',inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                                            { key: 'REJECTED',  label: 'Rejected',     active: 'bg-rose-500 text-white',   inactive: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
                                            { key: 'CANCELLED', label: 'Cancelled',    active: 'bg-gray-500 text-white',   inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                                        ].map(f => (
                                            <button key={f.key} onClick={() => { setSelectedStatus(f.key); setShowFilters(false); }}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedStatus === f.key ? f.active : f.inactive}`}>
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedStatus && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="px-3 py-1.5 bg-primary/10 rounded-full">
                                        <span className="text-xs font-medium text-primary">Showing: {getStatusDisplayName()} bookings</span>
                                    </div>
                                    <button onClick={() => setSelectedStatus('')} className="text-xs text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stats ── */}
                {bookings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Total',     value: stats.total,     icon: <Calendar className="w-5 h-5 text-primary" />,         bg: 'bg-primary/10' },
                            { label: 'Pending',   value: stats.pending,   icon: <Clock className="w-5 h-5 text-amber-500" />,          bg: 'bg-amber-50' },
                            { label: 'Approved',  value: stats.approved,  icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,  bg: 'bg-emerald-50' },
                            { label: 'Rejected',  value: stats.rejected,  icon: <XCircle className="w-5 h-5 text-rose-500" />,         bg: 'bg-rose-50' },
                            { label: 'Cancelled', value: stats.cancelled, icon: <XCircle className="w-5 h-5 text-gray-500" />,         bg: 'bg-gray-100' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{s.label}</p>
                                        <p className="text-2xl font-bold text-text-primary mt-1">{s.value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>{s.icon}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Bookings list ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                            <p className="text-text-secondary text-sm">Loading your bookings...</p>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Calendar className="w-12 h-12 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2">No Bookings Found</h3>
                            <p className="text-text-secondary max-w-md mx-auto">
                                {selectedStatus ? `You don't have any ${getStatusDisplayName()?.toLowerCase()} bookings.` : "You haven't made any booking requests yet."}
                            </p>
                            {selectedStatus && <button onClick={() => setSelectedStatus('')} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition">Clear Filters</button>}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {bookings.map((booking) => {
                                const resource     = getResourceDetails(booking.resourceId);
                                const statusConfig = getStatusConfig(booking.status);
                                const slotPast     = isSlotPast(booking.bookingDate, booking.endTime);
                                const canEdit      = statusConfig.canEdit  && booking.status === 'PENDING'  && !slotPast;
                                const canCancel    = statusConfig.canCancel && !slotPast;
                                // QR code only for approved bookings whose slot hasn't ended yet
                                const showQR       = booking.status === 'APPROVED' && !slotPast;

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
                                                            {/* QR available badge */}
                                                            {showQR && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                    <QrCode className="w-3 h-3" /> QR Ready
                                                                </span>
                                                            )}
                                                            {/* Slot ended indicator */}
                                                            {booking.status === 'APPROVED' && slotPast && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                                                    <Clock className="w-3 h-3" /> Slot Ended
                                                                </span>
                                                            )}
                                                        </div>

                                                        {resource && <p className="text-xs text-text-secondary mb-3">{resource.type?.replace(/_/g, ' ')} • Capacity: {resource.capacity} • {resource.location}</p>}

                                                        <div className="flex flex-wrap gap-4 mb-3">
                                                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-text-secondary" /><span className="text-sm text-text-primary">{format(new Date(booking.bookingDate), 'EEEE, MMM d, yyyy')}</span></div>
                                                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-text-secondary" /><span className="text-sm text-text-primary">{booking.startTime} – {booking.endTime}</span></div>
                                                            {booking.expectedAttendees && <div className="flex items-center gap-2"><Users className="w-4 h-4 text-text-secondary" /><span className="text-sm text-text-primary">{booking.expectedAttendees} attendees</span></div>}
                                                        </div>

                                                        {booking.purpose && <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100"><p className="text-sm text-text-primary">📝 {booking.purpose}</p></div>}

                                                        {booking.adminReason && (booking.status === 'REJECTED' || booking.status === 'CANCELLED') && (
                                                            <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg border ${booking.status === 'REJECTED' ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-200'}`}>
                                                                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${booking.status === 'REJECTED' ? 'text-rose-600' : 'text-gray-500'}`} />
                                                                <div>
                                                                    <p className={`text-xs font-semibold ${booking.status === 'REJECTED' ? 'text-rose-700' : 'text-gray-600'}`}>
                                                                        {booking.status === 'REJECTED' ? 'Reason for rejection:' : 'Reason for cancellation:'}
                                                                    </p>
                                                                    <p className={`text-sm ${booking.status === 'REJECTED' ? 'text-rose-600' : 'text-gray-500'}`}>{booking.adminReason}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <p className="text-xs text-text-secondary mt-3">Requested on {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Action buttons ── */}
                                            <div className="flex flex-row lg:flex-col gap-2 lg:items-end flex-shrink-0">

                                                {/* QR Code button — only approved, slot not yet ended */}
                                                {showQR && (
                                                    <button
                                                        onClick={() => setQrBooking(booking)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 border border-emerald-200 transition-all hover:shadow-md"
                                                    >
                                                        <QrCode className="w-4 h-4" /> Show QR Code
                                                    </button>
                                                )}

                                                {canEdit && (
                                                    <button onClick={() => { setEditingBooking(booking); setEditForm({ purpose: booking.purpose || '', expectedAttendees: booking.expectedAttendees || '' }); setShowEditModal(true); }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-text-primary hover:bg-gray-50 hover:border-primary/30 transition-all">
                                                        <Edit2 className="w-4 h-4" /> Edit
                                                    </button>
                                                )}

                                                {canCancel && (
                                                    <button onClick={() => { setSelectedBookingForCancel(booking); setShowCancelConfirm(true); }}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${statusConfig.cancelClass}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                        Cancel {booking.status === 'APPROVED' ? 'Booking' : 'Request'}
                                                    </button>
                                                )}

                                                {/* Static state badges when no action is possible */}
                                                {!showQR && !canEdit && !canCancel && booking.status === 'APPROVED' && !slotPast && (
                                                    <div className="px-4 py-2 bg-emerald-50 rounded-xl text-sm font-medium text-emerald-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Confirmed</div>
                                                )}
                                                {booking.status === 'APPROVED' && slotPast && (
                                                    <div className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Slot Ended</div>
                                                )}
                                                {booking.status === 'REJECTED' && (
                                                    <div className="px-4 py-2 bg-rose-50 rounded-xl text-sm font-medium text-rose-600 flex items-center gap-2"><XCircle className="w-4 h-4" /> Not Approved</div>
                                                )}
                                                {booking.status === 'CANCELLED' && (
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

            </div>

            {/* ══ QR Code Modal ══ */}
            {qrBooking && (
                <QRCodeModal
                    booking={qrBooking}
                    resource={getResourceDetails(qrBooking.resourceId)}
                    user={user}
                    onClose={() => setQrBooking(null)}
                />
            )}

            {/* ══ Cancel confirmation modal ══ */}
            {showCancelConfirm && selectedBookingForCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`p-6 border-b border-gray-100 ${selectedBookingForCancel.status === 'APPROVED' ? 'bg-gradient-to-r from-amber-50 to-white' : 'bg-gradient-to-r from-rose-50 to-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBookingForCancel.status === 'APPROVED' ? 'bg-amber-100' : 'bg-rose-100'}`}>
                                    <AlertCircle className={`w-5 h-5 ${selectedBookingForCancel.status === 'APPROVED' ? 'text-amber-600' : 'text-rose-600'}`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary">Cancel {selectedBookingForCancel.status === 'APPROVED' ? 'Booking' : 'Request'}</h3>
                                    <p className="text-sm text-text-secondary">This action cannot be undone.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-text-primary">
                                {selectedBookingForCancel.status === 'APPROVED'
                                    ? "This booking is confirmed. Cancelling it will free up the time slot for others."
                                    : "The time slot will become available for other users."}
                            </p>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-semibold text-text-primary">{selectedBookingForCancel.resourceName}</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {format(new Date(selectedBookingForCancel.bookingDate), 'EEEE, MMM d, yyyy')} &bull; {selectedBookingForCancel.startTime} – {selectedBookingForCancel.endTime}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button onClick={() => { setShowCancelConfirm(false); setSelectedBookingForCancel(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                                Keep {selectedBookingForCancel.status === 'APPROVED' ? 'Booking' : 'Request'}
                            </button>
                            <button onClick={() => handleCancelBooking(selectedBookingForCancel.id)} disabled={processing}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 ${selectedBookingForCancel.status === 'APPROVED' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Edit modal ══ */}
            {showEditModal && editingBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Edit2 className="w-5 h-5 text-primary" /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary">Edit Booking</h3>
                                    <p className="text-sm text-text-secondary">{editingBooking.resourceName} • {format(new Date(editingBooking.bookingDate), 'MMM d, yyyy')} • {editingBooking.startTime} – {editingBooking.endTime}</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleEditBooking(); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">Purpose of Booking <span className="text-red-500">*</span></label>
                                <textarea value={editForm.purpose} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} rows="3"
                                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                          placeholder="Describe the purpose..." required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">Expected Attendees</label>
                                <input type="number" value={editForm.expectedAttendees} onChange={(e) => setEditForm({ ...editForm, expectedAttendees: e.target.value })}
                                       className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                       placeholder="Number of people" min="1" />
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-amber-600">Editing will not change the time slot. Your request remains pending and needs admin approval again.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowEditModal(false); setEditingBooking(null); setEditForm({ purpose: '', expectedAttendees: '' }); }}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                                <button type="submit" disabled={processing}
                                        className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBookings;