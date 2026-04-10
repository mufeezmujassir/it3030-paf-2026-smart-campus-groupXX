// src/pages/technician/MaintenanceRequests.jsx
import React, { useState, useEffect } from 'react';
import { Wrench, AlertCircle, Calendar, Clock, CheckCircle, XCircle, Loader2, Play, Check, RefreshCw, Info, Ban, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const MaintenanceRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [requestToCancel, setRequestToCancel] = useState(null);
    const [extensionDays, setExtensionDays] = useState('');
    const [processing, setProcessing] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        fetchMaintenanceRequests();
    }, []);

    const fetchMaintenanceRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/bookings/my', { params: { size: 100 } });
            let allBookings = response.data.content || response.data;
            const maintenanceBookings = allBookings.filter(b => b.bookingType === 'MAINTENANCE');

            const requestsWithStatus = await Promise.all(
                maintenanceBookings.map(async (booking) => {
                    try {
                        const mrResponse = await api.get('/maintenance/my-requests');
                        const maintenanceRequests = mrResponse.data || [];
                        const matchingRequest = maintenanceRequests.find(mr => mr.bookingId === booking.id);

                        let displayStatus;
                        if (booking.status === 'REJECTED') {
                            displayStatus = 'CANCELLED';
                        } else if (booking.status === 'CANCELLED') {
                            displayStatus = 'CANCELLED';
                        } else if (matchingRequest?.maintenanceStatus) {
                            displayStatus = matchingRequest.maintenanceStatus;
                        } else {
                            displayStatus = booking.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
                        }

                        return {
                            ...booking,
                            maintenanceStatus: displayStatus,
                            maintenanceStartedAt: matchingRequest?.startedAt,
                            maintenanceCompletedAt: matchingRequest?.completedAt,
                            maintenanceId: matchingRequest?.id,
                        };
                    } catch (err) {
                        let displayStatus = booking.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
                        if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') displayStatus = 'CANCELLED';
                        return { ...booking, maintenanceStatus: displayStatus };
                    }
                })
            );

            setRequests(requestsWithStatus);
        } catch (error) {
            console.error('Failed to fetch maintenance requests:', error);
            toast.error('Failed to load maintenance requests');
        } finally {
            setLoading(false);
        }
    };

    // ─── Cancel helpers ────────────────────────────────────────────────
    // A request can be cancelled only if:
    //   • It is PENDING (not yet approved), OR
    //   • It is APPROVED but maintenance has NOT yet been started (not IN_PROGRESS / COMPLETED)
    const canCancel = (request) => {
        const status = request.maintenanceStatus;
        return status === 'PENDING' || status === 'APPROVED';
    };

    const openCancelConfirm = (request) => {
        setRequestToCancel(request);
        setShowCancelConfirm(true);
    };

    const handleCancelRequest = async () => {
        if (!requestToCancel) return;
        setProcessing(true);
        try {
            // Re-use the existing booking cancel endpoint
            await api.delete(`/bookings/${requestToCancel.id}/cancel`);
            toast.success('Maintenance request cancelled successfully');
            setShowCancelConfirm(false);
            setRequestToCancel(null);
            fetchMaintenanceRequests();
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to cancel maintenance request';
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    // ─── Time-window helpers (unchanged) ──────────────────────────────
    const canStartMaintenance = (request) => {
        const now = new Date();
        const bookingDate = new Date(request.bookingDate);
        const [startHour, startMinute] = request.startTime.split(':').map(Number);
        const scheduledStart = new Date(bookingDate);
        scheduledStart.setHours(startHour, startMinute, 0, 0);
        const graceStart = new Date(scheduledStart);
        graceStart.setMinutes(scheduledStart.getMinutes() - 15);
        const graceEnd = new Date(scheduledStart);
        graceEnd.setMinutes(scheduledStart.getMinutes() + 30);
        const isTodayDate = bookingDate.toDateString() === now.toDateString();
        return isTodayDate && now >= graceStart && now <= graceEnd;
    };

    const getStartButtonStatus = (request) => {
        const now = new Date();
        const bookingDate = new Date(request.bookingDate);
        const [startHour, startMinute] = request.startTime.split(':').map(Number);
        const scheduledStart = new Date(bookingDate);
        scheduledStart.setHours(startHour, startMinute, 0, 0);
        const isPastDate = bookingDate < new Date(new Date().setHours(0, 0, 0, 0));
        const isFutureDate = bookingDate > new Date(new Date().setHours(0, 0, 0, 0));
        if (isFutureDate) {
            const graceStartF = new Date(scheduledStart);
            graceStartF.setMinutes(scheduledStart.getMinutes() - 15);
            const graceEndF = new Date(scheduledStart);
            graceEndF.setMinutes(scheduledStart.getMinutes() + 30);
            return { canStart: false, message: `Maintenance scheduled for ${format(bookingDate, 'MMM d, yyyy')} at ${request.startTime}. You can start between ${format(graceStartF, 'h:mm a')} and ${format(graceEndF, 'h:mm a')} on that day.`, variant: 'info' };
        }
        if (isPastDate) return { canStart: false, message: `This maintenance window (${format(bookingDate, 'MMM d, yyyy')} at ${request.startTime}) has passed.`, variant: 'error' };
        const graceStart = new Date(scheduledStart);
        graceStart.setMinutes(scheduledStart.getMinutes() - 15);
        const graceEnd = new Date(scheduledStart);
        graceEnd.setMinutes(scheduledStart.getMinutes() + 30);
        if (now < graceStart) {
            const minutesUntil = Math.ceil((graceStart - now) / 60000);
            return { canStart: false, message: `Maintenance can be started at ${format(graceStart, 'h:mm a')} (in about ${minutesUntil} minutes). You have a 15-minute grace period before the scheduled time.`, variant: 'warning' };
        }
        if (now > graceEnd) return { canStart: false, message: `The maintenance window has ended. You had until ${format(graceEnd, 'h:mm a')} to start.`, variant: 'error' };
        return { canStart: true, message: `You can start maintenance now (scheduled: ${request.startTime})`, variant: 'success' };
    };

    const getTimeStatusBadge = (request) => {
        if (request.maintenanceStatus === 'CANCELLED') return { text: 'Cancelled', className: 'bg-gray-100 text-gray-600' };
        const now = new Date();
        const bookingDate = new Date(request.bookingDate);
        const isTodayDate = bookingDate.toDateString() === now.toDateString();
        const isPastDate = bookingDate < new Date(new Date().setHours(0, 0, 0, 0));
        const isFutureDate = bookingDate > new Date(new Date().setHours(0, 0, 0, 0));
        if (isFutureDate) return { text: 'Upcoming', className: 'bg-blue-100 text-blue-700' };
        if (isPastDate) return { text: 'Expired', className: 'bg-red-100 text-red-700' };
        if (isTodayDate && canStartMaintenance(request)) return { text: 'Ready to Start', className: 'bg-green-100 text-green-700' };
        if (isTodayDate) {
            const [sh, sm] = request.startTime.split(':').map(Number);
            const sched = new Date(bookingDate); sched.setHours(sh, sm, 0, 0);
            const ge = new Date(sched); ge.setMinutes(sched.getMinutes() + 30);
            if (now > ge) return { text: 'Window Closed', className: 'bg-red-100 text-red-700' };
            return { text: 'Waiting for Window', className: 'bg-yellow-100 text-yellow-700' };
        }
        return { text: 'Pending', className: 'bg-gray-100 text-gray-700' };
    };

    // ─── Action handlers (unchanged) ──────────────────────────────────
    const handleStartMaintenance = async (booking) => {
        setProcessing(true);
        try {
            await api.post(`/maintenance/${booking.id}/start`);
            toast.success('Maintenance started successfully');
            fetchMaintenanceRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to start maintenance');
        } finally {
            setProcessing(false);
        }
    };

    const handleCompleteMaintenance = async (booking) => {
        setProcessing(true);
        try {
            await api.post(`/maintenance/${booking.id}/complete`);
            toast.success('Maintenance completed successfully');
            fetchMaintenanceRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to complete maintenance');
        } finally {
            setProcessing(false);
        }
    };

    const handleRequestExtension = async () => {
        if (!selectedRequest || !extensionDays || extensionDays < 1) {
            toast.error('Please enter valid number of days');
            return;
        }
        setProcessing(true);
        try {
            await api.post(`/maintenance/${selectedRequest.id}/extend?days=${extensionDays}`);
            toast.success(`Extension request for ${extensionDays} days submitted`);
            setShowExtensionModal(false);
            setExtensionDays('');
            setSelectedRequest(null);
            fetchMaintenanceRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to request extension');
        } finally {
            setProcessing(false);
        }
    };

    // ─── Config helpers ────────────────────────────────────────────────
    const getStatusConfig = (status) => {
        const configs = {
            PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="w-4 h-4" />, label: 'Pending Approval', actions: ['cancel'] },
            APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle className="w-4 h-4" />, label: 'Approved — Ready to Start', actions: ['start', 'cancel'] },
            IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: <Play className="w-4 h-4" />, label: 'In Progress', actions: ['complete', 'extend'] },
            COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle className="w-4 h-4" />, label: 'Completed', actions: [] },
            REJECTED: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle className="w-4 h-4" />, label: 'Rejected', actions: [] },
            CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: <Ban className="w-4 h-4" />, label: 'Cancelled', actions: [] },
            EXTENSION_REQUESTED: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: <RefreshCw className="w-4 h-4" />, label: 'Extension Requested', actions: ['complete'] },
        };
        return configs[status] || configs.PENDING;
    };

    const getPriorityConfig = (priority) => {
        const configs = {
            CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
            HIGH:     { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
            MEDIUM:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
            LOW:      { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' },
        };
        return configs[priority] || configs.MEDIUM;
    };

    const filteredRequests = requests.filter(request => {
        if (filterStatus === 'ALL') return true;
        const status = request.maintenanceStatus || request.status;
        if (filterStatus === 'CANCELLED') return status === 'CANCELLED' || status === 'REJECTED';
        return status === filterStatus;
    });

    const stats = {
        total:      requests.length,
        pending:    requests.filter(r => (r.maintenanceStatus) === 'PENDING').length,
        approved:   requests.filter(r => (r.maintenanceStatus) === 'APPROVED').length,
        inProgress: requests.filter(r => (r.maintenanceStatus) === 'IN_PROGRESS').length,
        completed:  requests.filter(r => (r.maintenanceStatus) === 'COMPLETED').length,
        cancelled:  requests.filter(r => ['CANCELLED', 'REJECTED'].includes(r.maintenanceStatus)).length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* ── Header ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Wrench className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">Maintenance Dashboard</h1>
                                <p className="text-sm text-text-secondary mt-0.5">Track and manage your maintenance requests</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Stats ── */}
                    {requests.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 p-6 bg-gray-50/30">
                            <div className="bg-white rounded-xl p-3 text-center border border-gray-100"><p className="text-2xl font-bold text-text-primary">{stats.total}</p><p className="text-xs text-text-secondary">Total</p></div>
                            <div className="bg-white rounded-xl p-3 text-center border border-amber-100"><p className="text-2xl font-bold text-amber-600">{stats.pending}</p><p className="text-xs text-amber-600">Pending</p></div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100"><p className="text-2xl font-bold text-emerald-600">{stats.approved}</p><p className="text-xs text-emerald-600">Approved</p></div>
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100"><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p><p className="text-xs text-blue-600">In Progress</p></div>
                            <div className="bg-white rounded-xl p-3 text-center border border-green-100"><p className="text-2xl font-bold text-green-600">{stats.completed}</p><p className="text-xs text-green-600">Completed</p></div>
                            <div className="bg-white rounded-xl p-3 text-center border border-gray-200"><p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p><p className="text-xs text-gray-600">Cancelled</p></div>
                        </div>
                    )}

                    {/* ── Filters ── */}
                    <div className="px-6 pt-4 pb-2 border-b border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: 'ALL',         label: 'All',         active: 'bg-primary text-white',   inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                                { key: 'PENDING',     label: 'Pending',     active: 'bg-amber-500 text-white',  inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
                                { key: 'APPROVED',    label: 'Approved',    active: 'bg-emerald-500 text-white',inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
                                { key: 'IN_PROGRESS', label: 'In Progress', active: 'bg-blue-500 text-white',   inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                                { key: 'COMPLETED',   label: 'Completed',   active: 'bg-green-500 text-white',  inactive: 'bg-green-50 text-green-600 hover:bg-green-100' },
                                { key: 'CANCELLED',   label: 'Cancelled',   active: 'bg-gray-500 text-white',   inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                            ].map(f => (
                                <button key={f.key} onClick={() => setFilterStatus(f.key)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === f.key ? f.active : f.inactive}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Request list ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-16">
                            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-text-secondary">No maintenance requests found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredRequests.map((request) => {
                                const displayStatus = request.maintenanceStatus || request.status;
                                const statusConfig  = getStatusConfig(displayStatus);
                                const priorityConfig = getPriorityConfig(request.priority);
                                const timeStatus   = displayStatus === 'APPROVED' ? getTimeStatusBadge(request) : null;
                                const startStatus  = displayStatus === 'APPROVED' ? getStartButtonStatus(request) : null;

                                return (
                                    <div key={request.id} className="p-6 hover:bg-gray-50/30 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">

                                            {/* ── Left: details ── */}
                                            <div className="flex-1 min-w-0">
                                                {/* Title row */}
                                                <div className="flex items-center gap-3 flex-wrap mb-2">
                                                    <h3 className="text-lg font-bold text-text-primary">{request.resourceName}</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.text}`}>{priorityConfig.label}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                                                        {statusConfig.icon}<span>{statusConfig.label}</span>
                                                    </span>
                                                    {displayStatus === 'APPROVED' && timeStatus && (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${timeStatus.className}`}>{timeStatus.text}</span>
                                                    )}
                                                </div>

                                                {/* Issue description */}
                                                <p className="text-sm text-text-primary mb-3">{request.issueDescription || 'No description provided'}</p>

                                                {/* Date / time */}
                                                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{format(new Date(request.bookingDate), 'EEEE, MMM d, yyyy')}</span></div>
                                                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{request.startTime} - {request.endTime}</span></div>
                                                </div>

                                                {/* Time-window info banner for approved requests */}
                                                {displayStatus === 'APPROVED' && startStatus && !startStatus.canStart && (
                                                    <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                                                        startStatus.variant === 'info'    ? 'bg-blue-50 border border-blue-100' :
                                                            startStatus.variant === 'warning' ? 'bg-yellow-50 border border-yellow-100' :
                                                                'bg-red-50 border border-red-100'
                                                    }`}>
                                                        <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                                            startStatus.variant === 'info'    ? 'text-blue-500' :
                                                                startStatus.variant === 'warning' ? 'text-yellow-500' :
                                                                    'text-red-500'
                                                        }`} />
                                                        <p className={`text-xs ${
                                                            startStatus.variant === 'info'    ? 'text-blue-700' :
                                                                startStatus.variant === 'warning' ? 'text-yellow-700' :
                                                                    'text-red-700'
                                                        }`}>{startStatus.message}</p>
                                                    </div>
                                                )}

                                                {/* Admin reason for cancelled/rejected */}
                                                {(displayStatus === 'CANCELLED' || displayStatus === 'REJECTED') && request.adminReason && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <p className="text-xs font-semibold text-text-secondary">Reason for cancellation:</p>
                                                        <p className="text-sm text-text-primary mt-1">{request.adminReason}</p>
                                                    </div>
                                                )}

                                                {/* Admin notes for other statuses */}
                                                {request.adminReason && displayStatus !== 'CANCELLED' && displayStatus !== 'REJECTED' && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                        <p className="text-xs font-semibold text-text-secondary">Admin notes:</p>
                                                        <p className="text-sm text-text-primary mt-1">{request.adminReason}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Right: action buttons ── */}
                                            <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">

                                                {/* Start button (APPROVED only) */}
                                                {statusConfig.actions.includes('start') && (
                                                    <button
                                                        onClick={() => handleStartMaintenance(request)}
                                                        disabled={!startStatus?.canStart || processing}
                                                        title={startStatus?.message}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                                                            startStatus?.canStart
                                                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <Play className="w-4 h-4" /> Start Maintenance
                                                    </button>
                                                )}

                                                {/* Complete button (IN_PROGRESS / EXTENSION_REQUESTED) */}
                                                {statusConfig.actions.includes('complete') && (
                                                    <button
                                                        onClick={() => handleCompleteMaintenance(request)}
                                                        disabled={processing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-semibold hover:bg-green-100 transition"
                                                    >
                                                        <Check className="w-4 h-4" /> Mark Completed
                                                    </button>
                                                )}

                                                {/* Extend button (IN_PROGRESS) */}
                                                {statusConfig.actions.includes('extend') && (
                                                    <button
                                                        onClick={() => { setSelectedRequest(request); setShowExtensionModal(true); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
                                                    >
                                                        <RefreshCw className="w-4 h-4" /> Request Extension
                                                    </button>
                                                )}

                                                {/* Cancel button (PENDING or APPROVED-before-start) */}
                                                {statusConfig.actions.includes('cancel') && (
                                                    <button
                                                        onClick={() => openCancelConfirm(request)}
                                                        disabled={processing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold hover:bg-rose-100 border border-rose-200 transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        {displayStatus === 'PENDING' ? 'Cancel Request' : 'Cancel Booking'}
                                                    </button>
                                                )}

                                                {/* Completed state badge */}
                                                {displayStatus === 'COMPLETED' && (
                                                    <div className="px-4 py-2 bg-green-50 rounded-xl text-sm font-medium text-green-600 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4" /> Completed
                                                    </div>
                                                )}

                                                {/* Cancelled state badge */}
                                                {displayStatus === 'CANCELLED' && (
                                                    <div className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 flex items-center gap-2">
                                                        <Ban className="w-4 h-4" /> Cancelled
                                                    </div>
                                                )}

                                                {/* Extension requested badge */}
                                                {displayStatus === 'EXTENSION_REQUESTED' && (
                                                    <div className="px-4 py-2 bg-purple-50 rounded-xl text-sm font-medium text-purple-600 flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4" /> Extension Pending
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
            </div>

            {/* ══════════════════════════════════════════
                CANCEL CONFIRMATION MODAL
            ══════════════════════════════════════════ */}
            {showCancelConfirm && requestToCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className={`p-6 border-b border-gray-100 ${
                            requestToCancel.maintenanceStatus === 'APPROVED'
                                ? 'bg-gradient-to-r from-amber-50 to-white'
                                : 'bg-gradient-to-r from-rose-50 to-white'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    requestToCancel.maintenanceStatus === 'APPROVED' ? 'bg-amber-100' : 'bg-rose-100'
                                }`}>
                                    <AlertCircle className={`w-5 h-5 ${
                                        requestToCancel.maintenanceStatus === 'APPROVED' ? 'text-amber-600' : 'text-rose-600'
                                    }`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary">
                                        Cancel {requestToCancel.maintenanceStatus === 'APPROVED' ? 'Approved Maintenance' : 'Maintenance Request'}
                                    </h3>
                                    <p className="text-sm text-text-secondary mt-0.5">{requestToCancel.resourceName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Contextual warning */}
                            {requestToCancel.maintenanceStatus === 'APPROVED' ? (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-700">
                                        This maintenance request has already been approved. Cancelling it will free up the time slot and notify the admin. This action cannot be undone.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-text-secondary">
                                    Are you sure you want to cancel this pending maintenance request? This action cannot be undone and the time slot will become available again.
                                </p>
                            )}

                            {/* Booking summary */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                <p className="text-sm font-semibold text-text-primary">{requestToCancel.resourceName}</p>
                                <p className="text-xs text-text-secondary">
                                    {format(new Date(requestToCancel.bookingDate), 'EEEE, MMM d, yyyy')} &bull; {requestToCancel.startTime} – {requestToCancel.endTime}
                                </p>
                                {requestToCancel.issueDescription && (
                                    <p className="text-xs text-text-secondary italic">"{requestToCancel.issueDescription}"</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => { setShowCancelConfirm(false); setRequestToCancel(null); }}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Keep {requestToCancel.maintenanceStatus === 'PENDING' ? 'Request' : 'Booking'}
                            </button>
                            <button
                                onClick={handleCancelRequest}
                                disabled={processing}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 ${
                                    requestToCancel.maintenanceStatus === 'APPROVED'
                                        ? 'bg-amber-600 hover:bg-amber-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                EXTENSION MODAL
            ══════════════════════════════════════════ */}
            {showExtensionModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary">Request Extension</h3>
                                    <p className="text-sm text-text-secondary">{selectedRequest.resourceName}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-text-primary">
                                    Current maintenance period: {format(new Date(selectedRequest.bookingDate), 'MMM d, yyyy')} &bull; {selectedRequest.startTime} – {selectedRequest.endTime}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    Additional Days Needed <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={extensionDays}
                                    onChange={(e) => setExtensionDays(e.target.value)}
                                    min="1"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Enter number of days"
                                    required
                                />
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-700">
                                    ℹ️ Your extension request will be sent to the admin for approval. The resource will remain in maintenance mode until a decision is made.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => { setShowExtensionModal(false); setSelectedRequest(null); setExtensionDays(''); }}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestExtension}
                                disabled={processing || !extensionDays}
                                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceRequests;