// src/pages/admin/AdminBookingManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, User, Mail, CheckCircle, XCircle, Eye, Building,
    ChevronLeft, ChevronRight, AlertCircle, Loader2, TrendingUp,
    Filter, X, Wrench, RefreshCw, LayoutGrid, Users
} from 'lucide-react';
import bookingService from '../../services/bookingService';
import resourceService from '../../services/resourceService';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format, addDays, subDays, isBefore, startOfDay } from 'date-fns';
import AdminResourceCalendar from './AdminResourceCalendar';

const AdminBookingManagement = () => {

    // ── Bookings-calendar state ───────────────────────────────────────────
    const [resources,        setResources]        = useState([]);
    const [selectedResource, setSelectedResource] = useState(null);
    const [selectedDate,     setSelectedDate]     = useState(new Date());
    const [calendarLoading,  setCalendarLoading]  = useState(false);
    const [timeSlots,        setTimeSlots]        = useState([]);
    const [stats,            setStats]            = useState({ totalRequests: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0, maintenance: 0 });
    const [filters,          setFilters]          = useState({ status: '' });
    const [selectedBooking,  setSelectedBooking]  = useState(null);
    const [showModal,        setShowModal]        = useState(false);
    const [adminAction,      setAdminAction]      = useState({ status: '', reason: '' });
    const [processing,       setProcessing]       = useState(false);
    const [showFilters,      setShowFilters]      = useState(false);

    // ── Tab ───────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('bookings');

    // ── Maintenance-tab state ─────────────────────────────────────────────
    const [maintenanceRecords,   setMaintenanceRecords]   = useState([]);
    const [maintenanceLoading,   setMaintenanceLoading]   = useState(false);
    const [maintenanceFilter,    setMaintenanceFilter]    = useState('ALL');
    const [selectedMR,           setSelectedMR]           = useState(null);
    const [showMRModal,          setShowMRModal]          = useState(false);
    const [mrAction,             setMRAction]             = useState({ approve: true, notes: '' });
    const [mrProcessing,         setMRProcessing]         = useState(false);

    const START_TIME = 8;
    const END_TIME   = 17;

    useEffect(() => { fetchResources(); }, []);
    useEffect(() => { if (selectedResource) fetchCalendarData(); }, [selectedResource, selectedDate, filters.status]);
    useEffect(() => { if (activeTab === 'maintenance') fetchMaintenanceRecords(); }, [activeTab]);

    // ── Fetch resources ───────────────────────────────────────────────────
    const fetchResources = async () => {
        try {
            const data = await resourceService.listResources({ size: 100 });
            setResources(data.content || data);
        } catch (err) { console.error(err); }
    };

    // ── Fetch all maintenance records (merged from both sources) ──────────
    const fetchMaintenanceRecords = async () => {
        setMaintenanceLoading(true);
        try {
            // Source 1: All MAINTENANCE type bookings
            const bookingsRes = await api.get('/bookings', { params: { size: 500 } });
            const allBookings = bookingsRes.data.content || bookingsRes.data;
            const maintenanceBookings = allBookings.filter(b => b.bookingType === 'MAINTENANCE');

            // Source 2: All MaintenanceRequest records
            let maintenanceRecordsRaw = [];
            try {
                const mrRes = await api.get('/maintenance/admin/all');
                maintenanceRecordsRaw = mrRes.data || [];
            } catch (err) {
                console.error('Failed to fetch maintenance records:', err);
            }

            // Build lookup map: bookingId -> MaintenanceRequest
            const mrByBookingId = {};
            maintenanceRecordsRaw.forEach(mr => {
                mrByBookingId[mr.bookingId] = mr;
            });

            // Merge both sources
            const merged = maintenanceBookings.map(booking => {
                const mr = mrByBookingId[booking.id];

                let displayStatus;
                if (mr) {
                    displayStatus = mr.maintenanceStatus;
                } else {
                    if (booking.status === 'PENDING')        displayStatus = 'PENDING';
                    else if (booking.status === 'APPROVED')  displayStatus = 'APPROVED';
                    else if (booking.status === 'REJECTED')  displayStatus = 'REJECTED';
                    else if (booking.status === 'CANCELLED') displayStatus = 'CANCELLED';
                    else displayStatus = booking.status;
                }

                return {
                    ...booking,
                    maintenanceStatus:  displayStatus,
                    maintenanceId:      mr?.id || null,
                    technicianName:     booking.userFullName,
                    extensionRequested: mr?.extensionRequested || null,
                    extensionReason:    mr?.extensionReason || null,
                    adminNotes:         mr?.adminNotes || booking.adminReason || null,
                    startedAt:          mr?.startedAt || null,
                    completedAt:        mr?.completedAt || null,
                    bookingStatus:      booking.status,
                };
            });

            // Sort: action-required first, then by date desc
            const priorityOrder = {
                PENDING: 0, EXTENSION_REQUESTED: 1, APPROVED: 2,
                IN_PROGRESS: 3, COMPLETED: 4, REJECTED: 5, CANCELLED: 6
            };
            merged.sort((a, b) => {
                const pa = priorityOrder[a.maintenanceStatus] ?? 99;
                const pb = priorityOrder[b.maintenanceStatus] ?? 99;
                if (pa !== pb) return pa - pb;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setMaintenanceRecords(merged);
        } catch (err) {
            console.error('Failed to fetch maintenance records:', err);
            toast.error('Failed to load maintenance records');
        } finally {
            setMaintenanceLoading(false);
        }
    };

    // ── Handle maintenance approve / reject ───────────────────────────────
    const handleMRAction = async () => {
        if (!selectedMR) return;
        setMRProcessing(true);
        try {
            if (selectedMR.maintenanceStatus === 'EXTENSION_REQUESTED') {
                await api.patch(`/maintenance/admin/${selectedMR.maintenanceId}`, {
                    status: 'IN_PROGRESS',
                    notes: mrAction.notes || (mrAction.approve
                        ? 'Extension approved — continue maintenance'
                        : 'Extension rejected — please complete by original end date'),
                    extensionApproved: mrAction.approve
                });
                toast.success(`Extension ${mrAction.approve ? 'approved' : 'rejected'} — technician can now mark maintenance as completed.`);

            } else if (selectedMR.maintenanceStatus === 'PENDING') {
                await bookingService.updateBookingStatus(selectedMR.id, {
                    status: mrAction.approve ? 'APPROVED' : 'REJECTED',
                    reason: mrAction.notes,
                });
                toast.success(`Maintenance request ${mrAction.approve ? 'approved' : 'rejected'} successfully`);
            }

            setShowMRModal(false);
            setSelectedMR(null);
            setMRAction({ approve: true, notes: '' });
            fetchMaintenanceRecords();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update maintenance request');
        } finally {
            setMRProcessing(false);
        }
    };

    // ── Calendar helpers ──────────────────────────────────────────────────
    const fetchCalendarData = async () => {
        if (!selectedResource) return;
        setCalendarLoading(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const params = { resourceId: selectedResource.id, bookingDate: formattedDate };
            if (filters.status) params.status = filters.status;
            const data = await bookingService.getAllBookings(params);
            const bookingsData = data.content || data;
            generateTimeSlots(bookingsData);
            calculateStats(bookingsData);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load calendar data');
        } finally {
            setCalendarLoading(false);
        }
    };

    const formatTimeToHHMM = (t) => (t && t.includes(':') ? t.substring(0, 5) : t || '');

    const calculateStats = (data) => setStats({
        totalRequests: data.length,
        approved:    data.filter(b => b.status === 'APPROVED').length,
        pending:     data.filter(b => b.status === 'PENDING').length,
        rejected:    data.filter(b => b.status === 'REJECTED').length,
        cancelled:   data.filter(b => b.status === 'CANCELLED').length,
        maintenance: data.filter(b => b.bookingType === 'MAINTENANCE').length,
    });

    const isDateInPast   = (d) => isBefore(startOfDay(d), startOfDay(new Date()));
    const isTimeSlotPast = (startTime, date) => {
        if (isDateInPast(date)) return true;
        const now = new Date();
        const slot = new Date(date);
        slot.setHours(parseInt(startTime.split(':')[0]), 0, 0, 0);
        return slot < now;
    };

    const generateTimeSlots = (bookingsData) => {
        const slots = [];
        for (let hour = START_TIME; hour < END_TIME; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endTime   = `${(hour + 1).toString().padStart(2, '0')}:00`;
            const slotBookings = bookingsData.filter(b =>
                formatTimeToHHMM(b.startTime) === startTime && formatTimeToHHMM(b.endTime) === endTime
            );
            const isPastSlot     = isDateInPast(selectedDate) || isTimeSlotPast(startTime, selectedDate);
            const approvedCount  = slotBookings.filter(b => b.status === 'APPROVED').length;
            const pendingCount   = slotBookings.filter(b => b.status === 'PENDING').length;
            const rejectedCount  = slotBookings.filter(b => b.status === 'REJECTED').length;
            const cancelledCount = slotBookings.filter(b => b.status === 'CANCELLED').length;
            const maintenanceCount = slotBookings.filter(b => b.bookingType === 'MAINTENANCE').length;
            slots.push({
                startTime, endTime, bookings: slotBookings,
                approvedCount, pendingCount, rejectedCount, cancelledCount, maintenanceCount,
                totalCount: slotBookings.length,
                status: approvedCount > 0 ? 'approved' : pendingCount > 0 ? 'pending' : 'available',
                isPastSlot,
            });
        }
        setTimeSlots(slots);
    };

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));

    const handleStatusUpdate = async () => {
        if (!selectedBooking) return;
        setProcessing(true);
        try {
            await bookingService.updateBookingStatus(selectedBooking.id, {
                status: adminAction.status,
                reason: adminAction.reason,
            });
            toast.success(`Booking ${adminAction.status.toLowerCase()} successfully`);
            setShowModal(false);
            setSelectedBooking(null);
            setAdminAction({ status: '', reason: '' });
            fetchCalendarData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update booking');
        } finally {
            setProcessing(false);
        }
    };

    // ── Style helpers ─────────────────────────────────────────────────────
    const getStatusBadge = (s) => ({
        PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
        APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
        REJECTED:  'bg-rose-50 text-rose-700 border-rose-200',
        CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
    }[s] || 'bg-amber-50 text-amber-700 border-amber-200');

    const getStatusIcon = (s) => ({
        APPROVED:  <CheckCircle className="w-3 h-3" />,
        REJECTED:  <XCircle className="w-3 h-3" />,
        CANCELLED: <XCircle className="w-3 h-3" />,
    }[s] || <Clock className="w-3 h-3" />);

    const getSlotClasses = (status, isPastSlot) => {
        if (isPastSlot)            return 'bg-gray-50 border-gray-200';
        if (status === 'approved') return 'bg-gradient-to-r from-rose-50 to-white border-rose-200';
        if (status === 'pending')  return 'bg-gradient-to-r from-amber-50 to-white border-amber-200';
        return 'bg-white border-gray-100 hover:border-primary/20';
    };

    const getResourceIcon    = (type) => ({ LAB: '🧪', LECTURE_HALL: '📚', MEETING_SPACE: '💼', STUDY_ROOM: '📖', EQUIPMENT: '🔧' }[type] || '🏢');
    const getUserRoleBadge   = (role) => ({ TECHNICIAN: 'bg-purple-100 text-purple-700', STAFF: 'bg-blue-100 text-blue-700', ADMIN: 'bg-red-100 text-red-700' }[role] || 'bg-green-100 text-green-700');
    const getPriorityBadge   = (p)    => ({ CRITICAL: 'bg-red-100 text-red-800', HIGH: 'bg-orange-100 text-orange-800', MEDIUM: 'bg-yellow-100 text-yellow-800', LOW: 'bg-green-100 text-green-800' }[p] || 'bg-yellow-100 text-yellow-800');

    const getMRStatusConfig = (status) => ({
        PENDING:              { cls: 'bg-amber-100 text-amber-700',   label: 'Pending Approval',      icon: <Clock className="w-3.5 h-3.5" /> },
        APPROVED:             { cls: 'bg-emerald-100 text-emerald-700',label: 'Approved — Not Started', icon: <CheckCircle className="w-3.5 h-3.5" /> },
        IN_PROGRESS:          { cls: 'bg-blue-100 text-blue-700',     label: 'In Progress',           icon: <Wrench className="w-3.5 h-3.5" /> },
        EXTENSION_REQUESTED:  { cls: 'bg-purple-100 text-purple-700', label: 'Extension Requested',   icon: <RefreshCw className="w-3.5 h-3.5" /> },
        COMPLETED:            { cls: 'bg-green-100 text-green-700',   label: 'Completed',             icon: <CheckCircle className="w-3.5 h-3.5" /> },
        REJECTED:             { cls: 'bg-rose-100 text-rose-700',     label: 'Rejected',              icon: <XCircle className="w-3.5 h-3.5" /> },
        CANCELLED:            { cls: 'bg-gray-100 text-gray-600',     label: 'Cancelled',             icon: <XCircle className="w-3.5 h-3.5" /> },
    }[status] || { cls: 'bg-gray-100 text-gray-600', label: status, icon: null });

    // ── Maintenance stats + filters ───────────────────────────────────────
    const mrStats = {
        total:      maintenanceRecords.length,
        pending:    maintenanceRecords.filter(r => r.maintenanceStatus === 'PENDING').length,
        approved:   maintenanceRecords.filter(r => r.maintenanceStatus === 'APPROVED').length,
        inProgress: maintenanceRecords.filter(r => r.maintenanceStatus === 'IN_PROGRESS').length,
        extension:  maintenanceRecords.filter(r => r.maintenanceStatus === 'EXTENSION_REQUESTED').length,
        completed:  maintenanceRecords.filter(r => r.maintenanceStatus === 'COMPLETED').length,
        rejected:   maintenanceRecords.filter(r => r.maintenanceStatus === 'REJECTED').length,
        cancelled:  maintenanceRecords.filter(r => r.maintenanceStatus === 'CANCELLED').length,
    };

    const filteredMR = maintenanceRecords.filter(r =>
        maintenanceFilter === 'ALL' || r.maintenanceStatus === maintenanceFilter
    );

    const MR_FILTERS = [
        { key: 'ALL',                label: 'All',               active: 'bg-primary text-white',     inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200',      count: null },
        { key: 'PENDING',            label: 'Pending',           active: 'bg-amber-500 text-white',   inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100',    count: mrStats.pending },
        { key: 'APPROVED',           label: 'Approved',          active: 'bg-emerald-500 text-white', inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', count: mrStats.approved },
        { key: 'IN_PROGRESS',        label: 'In Progress',       active: 'bg-blue-500 text-white',    inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100',       count: mrStats.inProgress },
        { key: 'EXTENSION_REQUESTED',label: 'Extension Pending', active: 'bg-purple-500 text-white',  inactive: 'bg-purple-50 text-purple-600 hover:bg-purple-100', count: mrStats.extension },
        { key: 'COMPLETED',          label: 'Completed',         active: 'bg-green-500 text-white',   inactive: 'bg-green-50 text-green-600 hover:bg-green-100',    count: mrStats.completed },
        { key: 'REJECTED',           label: 'Rejected',          active: 'bg-rose-500 text-white',    inactive: 'bg-rose-50 text-rose-600 hover:bg-rose-100',       count: mrStats.rejected },
        { key: 'CANCELLED',          label: 'Cancelled',         active: 'bg-gray-500 text-white',    inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200',      count: mrStats.cancelled },
    ];

    const formatBookingDate = (bookingDate) => {
        if (!bookingDate) return '—';
        try {
            const dateStr = Array.isArray(bookingDate)
                ? `${bookingDate[0]}-${String(bookingDate[1]).padStart(2, '0')}-${String(bookingDate[2]).padStart(2, '0')}`
                : bookingDate;
            return format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMM d, yyyy');
        } catch { return String(bookingDate); }
    };

    const formatBookingDateLong = (bookingDate) => {
        if (!bookingDate) return '—';
        try {
            const dateStr = Array.isArray(bookingDate)
                ? `${bookingDate[0]}-${String(bookingDate[1]).padStart(2, '0')}-${String(bookingDate[2]).padStart(2, '0')}`
                : bookingDate;
            return format(new Date(dateStr + 'T00:00:00'), 'MMMM d, yyyy');
        } catch { return String(bookingDate); }
    };

    const StatCard = ({ icon, title, value, color }) => (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center`}>{icon}</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* ── Page header + tab bar ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">Booking Management</h1>
                                <p className="text-sm text-text-secondary mt-0.5">Manage all resource booking and maintenance requests</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab bar - 3 tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'bookings' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                            <Calendar className="w-4 h-4" /> Bookings Calendar
                        </button>
                        <button
                            onClick={() => setActiveTab('maintenance')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'maintenance' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                            <Wrench className="w-4 h-4" /> Maintenance Requests
                            {(mrStats.pending > 0 || mrStats.extension > 0) && (
                                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                                    {mrStats.pending + mrStats.extension}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Resource Calendar
                        </button>
                    </div>
                </div>

                {/* ════════════════════════════════════════════
                    TAB 1: BOOKINGS CALENDAR
                ════════════════════════════════════════════ */}
                {activeTab === 'bookings' && (
                    <>
                        {/* Resource selector + filters */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Select Resource</label>
                                        <div className="relative">
                                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                value={selectedResource?.id || ''}
                                                onChange={(e) => { const r = resources.find(r => r.id === e.target.value); setSelectedResource(r || null); setTimeSlots([]); }}
                                                className="w-full md:w-96 pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="">Choose a resource...</option>
                                                {resources.map(r => <option key={r.id} value={r.id}>{getResourceIcon(r.type)} {r.name} ({r.type?.replace(/_/g, ' ')})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${showFilters || filters.status ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        <Filter className="w-4 h-4" /> Filters
                                        {filters.status && <span className="ml-1 w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">1</span>}
                                    </button>
                                </div>
                                {showFilters && (
                                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-text-primary">Filter by Status</h4>
                                            {filters.status && <button onClick={() => { setFilters({ status: '' }); setShowFilters(false); }} className="text-xs text-primary flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[['', 'All Status'], ['PENDING', '⏳ Pending'], ['APPROVED', '✓ Approved'], ['REJECTED', '✗ Rejected'], ['CANCELLED', '✗ Cancelled']].map(([val, label]) => (
                                                <button key={val} onClick={() => { setFilters({ status: val }); setShowFilters(false); }}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.status === val ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Booking stats */}
                        {selectedResource && stats.totalRequests > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                                <StatCard icon={<TrendingUp className="w-5 h-5 text-primary" />}      title="Total"       value={stats.totalRequests} color="primary" />
                                <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}  title="Approved"    value={stats.approved}      color="emerald" />
                                <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />}          title="Pending"     value={stats.pending}       color="amber" />
                                <StatCard icon={<XCircle className="w-5 h-5 text-rose-500" />}         title="Rejected"    value={stats.rejected}      color="rose" />
                                <StatCard icon={<XCircle className="w-5 h-5 text-gray-500" />}         title="Cancelled"   value={stats.cancelled}     color="gray" />
                                <StatCard icon={<Wrench className="w-5 h-5 text-purple-500" />}        title="Maintenance" value={stats.maintenance}   color="purple" />
                            </div>
                        )}

                        {/* Calendar */}
                        {selectedResource ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <span className="text-2xl">{getResourceIcon(selectedResource.type)}</span>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-text-primary">{selectedResource.name}</h2>
                                                <p className="text-xs text-text-secondary">{selectedResource.type?.replace(/_/g, ' ')} • Cap: {selectedResource.capacity} • {selectedResource.location}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                                            <button onClick={handlePrevDay} className="p-2 hover:bg-gray-50 rounded-lg transition"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                                            <div className="px-4 py-1 text-center">
                                                <p className="text-sm font-semibold text-text-primary">{format(selectedDate, 'EEEE')}</p>
                                                <p className="text-xs text-text-secondary">{format(selectedDate, 'MMM d, yyyy')}</p>
                                                {isDateInPast(selectedDate) && <p className="text-[10px] text-gray-400">Past — View Only</p>}
                                            </div>
                                            <button onClick={handleNextDay} className="p-2 hover:bg-gray-50 rounded-lg transition"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-2">
                                        {[['bg-white border-gray-300','Available'],['bg-amber-100 border-amber-200','Pending'],['bg-rose-100 border-rose-200','Approved'],['bg-purple-100 border-purple-200','Maintenance'],['bg-gray-200 border-gray-300','Past']].map(([cls, label]) => (
                                            <div key={label} className="flex items-center gap-2"><div className={`w-3 h-3 ${cls} rounded border`}></div><span className="text-xs text-text-secondary">{label}</span></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6">

                                    {/* ── Resource status banner ── */}
                                    {selectedResource.status !== 'ACTIVE' && (
                                        <div className="mb-4 flex items-start gap-3 p-4 bg-gray-100 border border-gray-300 rounded-xl">
                                            <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">Resource is Out of Service</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    This resource is currently inactive. No new bookings can be made until it is set back to Active.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedResource.maintenanceMode === true && (() => {
                                        // Check if today falls within the maintenance window
                                        const today = format(selectedDate, 'yyyy-MM-dd');
                                        let startDate = selectedResource.maintenanceStartDate;
                                        let endDate   = selectedResource.maintenanceEndDate;

                                        if (Array.isArray(startDate)) {
                                            startDate = `${startDate[0]}-${String(startDate[1]).padStart(2,'0')}-${String(startDate[2]).padStart(2,'0')}`;
                                            endDate   = `${endDate[0]}-${String(endDate[1]).padStart(2,'0')}-${String(endDate[2]).padStart(2,'0')}`;
                                        }

                                        const isInMaintenanceWindow = today >= startDate && today <= endDate;

                                        if (!isInMaintenanceWindow) return null;

                                        return (
                                            <div className="mb-4 flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                                <Wrench className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-bold text-purple-700">Resource Under Maintenance</p>
                                                    <p className="text-xs text-purple-600 mt-0.5">
                                                        {selectedResource.maintenanceReason
                                                            ? `Reason: ${selectedResource.maintenanceReason}`
                                                            : 'This resource is currently under scheduled maintenance.'}
                                                        {' '}Maintenance runs from <strong>{startDate}</strong> to <strong>{endDate}</strong>.
                                                        Bookings cannot be made during this period.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {calendarLoading ? (
                                        <div className="flex flex-col items-center justify-center py-16"><Loader2 className="w-10 h-10 text-primary animate-spin mb-3" /><p className="text-text-secondary text-sm">Loading...</p></div>
                                    ) : (
                                        <div className="space-y-3">
                                            {timeSlots.map((slot, idx) => (
                                                <div key={idx} className={`border rounded-xl overflow-hidden transition-all hover:shadow-md ${getSlotClasses(slot.status, slot.isPastSlot)}`}>
                                                    <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${slot.isPastSlot ? 'bg-gray-100' : 'bg-gray-50/50'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center"><Clock className="w-4 h-4 text-primary" /></div>
                                                            <span className="text-base font-semibold text-text-primary">{slot.startTime} - {slot.endTime}</span>
                                                            {slot.totalCount > 0 && <span className="text-xs text-text-secondary">({slot.totalCount})</span>}
                                                        </div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {slot.approvedCount   > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg text-xs font-medium text-emerald-600"><CheckCircle className="w-3 h-3" />{slot.approvedCount}</span>}
                                                            {slot.pendingCount    > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg text-xs font-medium text-amber-600"><Clock className="w-3 h-3" />{slot.pendingCount}</span>}
                                                            {slot.rejectedCount   > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 rounded-lg text-xs font-medium text-rose-600"><XCircle className="w-3 h-3" />{slot.rejectedCount}</span>}
                                                            {slot.maintenanceCount> 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-lg text-xs font-medium text-purple-600"><Wrench className="w-3 h-3" />{slot.maintenanceCount}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        {slot.bookings.length > 0 ? slot.bookings.map(booking => (
                                                            <div key={booking.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition border-gray-100 hover:border-primary/20">
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-primary" /></div>
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                                    <h4 className="text-sm font-semibold text-text-primary">{booking.userFullName}</h4>
                                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getUserRoleBadge(booking.userRole)}`}>{booking.userRole}</span>
                                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(booking.status)}`}>{getStatusIcon(booking.status)}<span>{booking.status}</span></span>
                                                                                </div>
                                                                                <p className="text-xs text-text-secondary flex items-center gap-1 mb-2"><Mail className="w-3 h-3" />{booking.userEmail}</p>
                                                                                {booking.bookingType === 'MAINTENANCE' && booking.issueDescription && (
                                                                                    <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                                                        <div className="flex items-center gap-2 mb-1"><Wrench className="w-4 h-4 text-purple-600" /><span className="text-xs font-bold text-purple-700 uppercase">Maintenance</span>{booking.priority && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityBadge(booking.priority)}`}>{booking.priority}</span>}</div>
                                                                                        <p className="text-sm text-text-primary">{booking.issueDescription}</p>
                                                                                    </div>
                                                                                )}
                                                                                {booking.purpose && !booking.issueDescription && (
                                                                                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                                                                        <p className="text-sm text-text-primary">📝 {booking.purpose}</p>
                                                                                    </div>
                                                                                )}
                                                                                {/* Expected attendees - Regular bookings only */}
                                                                                {booking.bookingType !== 'MAINTENANCE' && booking.expectedAttendees && (
                                                                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                                                                                        <Users className="w-3.5 h-3.5 text-blue-500" />
                                                                                        <span className="text-xs font-semibold text-blue-700">
                                                                                            {booking.expectedAttendees} attendee{booking.expectedAttendees !== 1 ? 's' : ''}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                <p className="text-xs text-text-secondary mt-2">Requested: {format(new Date(booking.createdAt), 'MMM d, h:mm a')}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 md:border-l md:border-gray-100 md:pl-4">
                                                                        {booking.status === 'PENDING' && !slot.isPastSlot ? (
                                                                            <>
                                                                                <button onClick={() => { setSelectedBooking(booking); setAdminAction({ status: 'APPROVED', reason: '' }); setShowModal(true); }} className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105 transition-all" title="Approve"><CheckCircle className="w-5 h-5" /></button>
                                                                                <button onClick={() => { setSelectedBooking(booking); setAdminAction({ status: 'REJECTED', reason: '' }); setShowModal(true); }} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all" title="Reject"><XCircle className="w-5 h-5" /></button>
                                                                            </>
                                                                        ) : <div className="text-xs text-gray-400 px-2">{booking.status}</div>}
                                                                        <button onClick={() => { setSelectedBooking(booking); setAdminAction({ status: '', reason: '' }); setShowModal(true); }} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-primary transition-all" title="View"><Eye className="w-5 h-5" /></button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <div className="text-center py-6">
                                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                                                                    {slot.isPastSlot ? <><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-text-secondary">Past time slot</span></> : <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm text-text-secondary">Available for booking</span></>}
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
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-16 text-center">
                                    <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-5"><Calendar className="w-12 h-12 text-primary" /></div>
                                    <h3 className="text-xl font-bold text-text-primary mb-2">Select a Resource</h3>
                                    <p className="text-text-secondary max-w-md mx-auto">Choose a resource from the dropdown above to view and manage bookings</p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ════════════════════════════════════════════
                    TAB 2: MAINTENANCE REQUESTS
                ════════════════════════════════════════════ */}
                {activeTab === 'maintenance' && (
                    <>
                        {/* Stats row — 8 cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                            <StatCard icon={<TrendingUp className="w-5 h-5 text-primary" />}       title="Total"        value={mrStats.total}      color="primary" />
                            <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />}           title="Pending"      value={mrStats.pending}    color="amber" />
                            <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}   title="Approved"     value={mrStats.approved}   color="emerald" />
                            <StatCard icon={<Wrench className="w-5 h-5 text-blue-500" />}           title="In Progress"  value={mrStats.inProgress} color="blue" />
                            <StatCard icon={<RefreshCw className="w-5 h-5 text-purple-500" />}      title="Ext. Pending" value={mrStats.extension}  color="purple" />
                            <StatCard icon={<CheckCircle className="w-5 h-5 text-green-500" />}     title="Completed"    value={mrStats.completed}  color="green" />
                            <StatCard icon={<XCircle className="w-5 h-5 text-rose-500" />}          title="Rejected"     value={mrStats.rejected}   color="rose" />
                            <StatCard icon={<XCircle className="w-5 h-5 text-gray-500" />}          title="Cancelled"    value={mrStats.cancelled}  color="gray" />
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                            <Wrench className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-text-primary">Maintenance Requests</h2>
                                            <p className="text-sm text-text-secondary mt-0.5">All maintenance bookings from submission through completion</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={fetchMaintenanceRecords}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
                                    >
                                        <RefreshCw className="w-4 h-4" /> Refresh
                                    </button>
                                </div>

                                {/* Filter tabs */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {MR_FILTERS.map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setMaintenanceFilter(f.key)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${maintenanceFilter === f.key ? f.active : f.inactive}`}
                                        >
                                            {f.label}
                                            {f.count != null && f.count > 0 && maintenanceFilter !== f.key && (
                                                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-white/70 text-current">{f.count}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* List */}
                            {maintenanceLoading ? (
                                <div className="flex flex-col items-center justify-center py-16"><Loader2 className="w-10 h-10 text-primary animate-spin mb-3" /><p className="text-text-secondary text-sm">Loading...</p></div>
                            ) : filteredMR.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench className="w-10 h-10 text-purple-300" /></div>
                                    <h3 className="text-lg font-semibold text-text-primary mb-1">No Records Found</h3>
                                    <p className="text-sm text-text-secondary">No maintenance records match the current filter.</p>
                                    {maintenanceFilter !== 'ALL' && <button onClick={() => setMaintenanceFilter('ALL')} className="mt-3 text-sm text-primary hover:underline">View all</button>}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredMR.map((mr) => {
                                        const statusCfg   = getMRStatusConfig(mr.maintenanceStatus);
                                        const needsAction = mr.maintenanceStatus === 'PENDING' || mr.maintenanceStatus === 'EXTENSION_REQUESTED';
                                        const isExtension = mr.maintenanceStatus === 'EXTENSION_REQUESTED';
                                        const isPending   = mr.maintenanceStatus === 'PENDING';

                                        return (
                                            <div key={mr.id} className={`p-6 hover:bg-gray-50/30 transition-colors ${needsAction ? 'border-l-4 border-l-amber-400' : ''}`}>
                                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">

                                                    {/* Left: details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 flex-wrap mb-2">
                                                            <h3 className="text-lg font-bold text-text-primary">{mr.resourceName}</h3>
                                                            {mr.priority && <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(mr.priority)}`}>{mr.priority}</span>}
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${statusCfg.cls}`}>
                                                                {statusCfg.icon}<span>{statusCfg.label}</span>
                                                            </span>
                                                            {needsAction && (
                                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
                                                                    ⚡ Action Required
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Technician */}
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"><User className="w-3 h-3 text-purple-600" /></div>
                                                            <span className="text-sm text-text-primary font-medium">{mr.technicianName || mr.userFullName}</span>
                                                            <span className="text-xs text-text-secondary">· Technician</span>
                                                        </div>

                                                        {/* Issue description */}
                                                        {mr.issueDescription && (
                                                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 mb-3">
                                                                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Issue</p>
                                                                <p className="text-sm text-text-primary">{mr.issueDescription}</p>
                                                            </div>
                                                        )}

                                                        {/* Extension info */}
                                                        {isExtension && (
                                                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 mb-3">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <RefreshCw className="w-4 h-4 text-purple-600" />
                                                                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Extension Requested</p>
                                                                </div>
                                                                <p className="text-sm text-purple-800">
                                                                    The technician needs <strong>{mr.extensionRequested} additional day{mr.extensionRequested !== 1 ? 's' : ''}</strong> to complete the maintenance.
                                                                    {mr.extensionReason && <span> Reason: {mr.extensionReason}</span>}
                                                                </p>
                                                                <p className="text-xs text-purple-600 mt-1">
                                                                    Approving or rejecting will both resume <strong>In Progress</strong> status so the technician can mark it as completed.
                                                                    Rejecting signals the technician to wrap up within the original timeframe.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Approved but not started info */}
                                                        {mr.maintenanceStatus === 'APPROVED' && (
                                                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                                    <p className="text-xs text-emerald-700">
                                                                        Approved — waiting for technician to start maintenance within the scheduled time window.
                                                                        If not started within 30 minutes of the scheduled time, this will be auto-cancelled.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Date + time */}
                                                        <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                                                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatBookingDate(mr.bookingDate)}</span></div>
                                                            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{mr.startTime} – {mr.endTime}</span></div>
                                                        </div>

                                                        {/* Started / completed timestamps */}
                                                        {mr.startedAt && (
                                                            <p className="text-xs text-text-secondary mt-2">
                                                                Started: {format(new Date(mr.startedAt), 'MMM d, h:mm a')}
                                                            </p>
                                                        )}
                                                        {mr.completedAt && (
                                                            <p className="text-xs text-text-secondary mt-1">
                                                                Completed: {format(new Date(mr.completedAt), 'MMM d, h:mm a')}
                                                            </p>
                                                        )}

                                                        {/* Admin notes */}
                                                        {mr.adminNotes && (
                                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                <p className="text-xs font-semibold text-text-secondary">Admin notes:</p>
                                                                <p className="text-sm text-text-primary mt-1">{mr.adminNotes}</p>
                                                            </div>
                                                        )}

                                                        {/* Rejection/cancellation reason from booking */}
                                                        {(mr.maintenanceStatus === 'REJECTED' || mr.maintenanceStatus === 'CANCELLED') && mr.adminReason && !mr.adminNotes && (
                                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                                <p className="text-xs font-semibold text-text-secondary">Reason:</p>
                                                                <p className="text-sm text-text-primary mt-1">{mr.adminReason}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right: action buttons */}
                                                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                                                        {needsAction ? (
                                                            <>
                                                                <button
                                                                    onClick={() => { setSelectedMR(mr); setMRAction({ approve: true, notes: '' }); setShowMRModal(true); }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition border border-emerald-200"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    {isExtension ? 'Approve Extension' : 'Approve'}
                                                                </button>
                                                                <button
                                                                    onClick={() => { setSelectedMR(mr); setMRAction({ approve: false, notes: '' }); setShowMRModal(true); }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold hover:bg-rose-100 transition border border-rose-200"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    {isExtension ? 'Reject Extension' : 'Reject'}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${statusCfg.cls}`}>
                                                                {statusCfg.icon}
                                                                {statusCfg.label}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ════════════════════════════════════════════
                    TAB 3: RESOURCE CALENDAR
                ════════════════════════════════════════════ */}
                {activeTab === 'calendar' && (
                    <AdminResourceCalendar isEmbedded={true} />
                )}

                {/* ── Booking action modal ── */}
                {showModal && selectedBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${adminAction.status === 'APPROVED' ? 'bg-emerald-100' : adminAction.status === 'REJECTED' ? 'bg-rose-100' : 'bg-primary/10'}`}>
                                        {adminAction.status === 'APPROVED' ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : adminAction.status === 'REJECTED' ? <XCircle className="w-6 h-6 text-rose-600" /> : <Eye className="w-6 h-6 text-primary" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">{adminAction.status ? `${adminAction.status} Booking` : 'Booking Details'}</h3>
                                        <p className="text-sm text-text-secondary">{selectedBooking.resourceName} • {selectedBooking.userFullName}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div><p className="text-xs font-bold text-text-secondary uppercase">Date</p><p className="text-base font-semibold text-text-primary mt-1">{format(new Date(selectedBooking.bookingDate), 'MMMM d, yyyy')}</p></div>
                                    <div><p className="text-xs font-bold text-text-secondary uppercase">Time</p><p className="text-base font-semibold text-text-primary mt-1">{selectedBooking.startTime} - {selectedBooking.endTime}</p></div>
                                </div>
                                {selectedBooking.bookingType === 'MAINTENANCE' && selectedBooking.issueDescription && (
                                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                        <div className="flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 text-purple-600" /><p className="text-xs font-bold text-purple-700 uppercase">Maintenance</p>{selectedBooking.priority && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityBadge(selectedBooking.priority)}`}>{selectedBooking.priority}</span>}</div>
                                        <p className="text-sm text-text-primary">{selectedBooking.issueDescription}</p>
                                    </div>
                                )}
                                {selectedBooking.purpose && (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                        <p className="text-xs font-bold text-amber-700 uppercase mb-1">Purpose</p>
                                        <p className="text-sm text-amber-800">{selectedBooking.purpose}</p>
                                    </div>
                                )}
                                {/* Expected attendees - Regular bookings only */}
                                {selectedBooking.bookingType !== 'MAINTENANCE' && selectedBooking.expectedAttendees && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-blue-700 uppercase">Expected Attendees</p>
                                            <p className="text-sm font-semibold text-blue-900 mt-0.5">
                                                {selectedBooking.expectedAttendees} {selectedBooking.expectedAttendees !== 1 ? 'people' : 'person'}
                                            </p>
                                        </div>
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
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder={adminAction.status === 'REJECTED' ? 'Provide a reason...' : 'Optional notes'}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3">
                                <button onClick={() => { setShowModal(false); setSelectedBooking(null); setAdminAction({ status: '', reason: '' }); }} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                                {adminAction.status && (
                                    <button
                                        onClick={handleStatusUpdate}
                                        disabled={processing || (adminAction.status === 'REJECTED' && !adminAction.reason)}
                                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 ${adminAction.status === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                                    >
                                        {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Confirm ${adminAction.status}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Maintenance request action modal ── */}
                {showMRModal && selectedMR && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className={`p-6 border-b border-gray-100 bg-gradient-to-r ${mrAction.approve ? 'from-emerald-50' : 'from-rose-50'} to-white`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mrAction.approve ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                        {mrAction.approve ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-rose-600" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">
                                            {mrAction.approve ? 'Approve' : 'Reject'}{' '}
                                            {selectedMR.maintenanceStatus === 'EXTENSION_REQUESTED' ? 'Extension Request' : 'Maintenance Request'}
                                        </h3>
                                        <p className="text-sm text-text-secondary">{selectedMR.resourceName} · {selectedMR.technicianName || selectedMR.userFullName}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div><p className="text-xs font-bold text-text-secondary uppercase">Date</p><p className="text-base font-semibold text-text-primary mt-1">{formatBookingDateLong(selectedMR.bookingDate)}</p></div>
                                    <div><p className="text-xs font-bold text-text-secondary uppercase">Time</p><p className="text-base font-semibold text-text-primary mt-1">{selectedMR.startTime} – {selectedMR.endTime}</p></div>
                                </div>
                                {selectedMR.issueDescription && (
                                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                        <p className="text-xs font-bold text-purple-700 uppercase mb-1">Issue</p>
                                        <p className="text-sm text-text-primary">{selectedMR.issueDescription}</p>
                                    </div>
                                )}
                                {selectedMR.maintenanceStatus === 'EXTENSION_REQUESTED' && (
                                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <RefreshCw className="w-4 h-4 text-purple-600" />
                                            <p className="text-xs font-bold text-purple-700 uppercase">Extension Details</p>
                                        </div>
                                        <p className="text-sm text-purple-800">
                                            Requesting <strong>{selectedMR.extensionRequested} additional day{selectedMR.extensionRequested !== 1 ? 's' : ''}</strong>.
                                            {selectedMR.extensionReason && <span> {selectedMR.extensionReason}</span>}
                                        </p>
                                        <p className={`text-xs mt-2 font-medium ${mrAction.approve ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {mrAction.approve
                                                ? '✓ Approving sets status back to In Progress — technician can then mark it as completed.'
                                                : '✗ Rejecting also sets status back to In Progress — technician should complete within the original timeframe.'}
                                        </p>
                                    </div>
                                )}
                                {selectedMR.maintenanceStatus === 'PENDING' && (
                                    <div className={`p-3 rounded-xl border flex items-start gap-2 ${mrAction.approve ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${mrAction.approve ? 'text-emerald-600' : 'text-rose-600'}`} />
                                        <p className={`text-xs ${mrAction.approve ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {mrAction.approve
                                                ? 'Approving will mark this resource for maintenance on the scheduled date. The technician will be notified and can start within the scheduled window.'
                                                : 'Rejecting will notify the technician. The resource will remain available for regular bookings.'}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                                        Notes {!mrAction.approve ? '(Required)' : '(Optional)'}
                                    </label>
                                    <textarea
                                        value={mrAction.notes}
                                        onChange={(e) => setMRAction({ ...mrAction, notes: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder={!mrAction.approve ? 'Please provide a reason for rejection...' : 'Optional notes for the technician'}
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3">
                                <button onClick={() => { setShowMRModal(false); setSelectedMR(null); setMRAction({ approve: true, notes: '' }); }} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                                <button onClick={handleMRAction} disabled={mrProcessing || (!mrAction.approve && !mrAction.notes)} className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 ${mrAction.approve ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200'}`}>
                                    {mrProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Confirm ${mrAction.approve ? 'Approval' : 'Rejection'}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminBookingManagement;