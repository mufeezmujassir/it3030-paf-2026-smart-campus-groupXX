// src/pages/technician/MaintenanceRequests.jsx
import React, { useState, useEffect } from 'react';
import { Wrench, AlertCircle, Calendar, Clock, CheckCircle, XCircle, Loader2, Play, Check, RefreshCw, Eye, Info, Ban } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const MaintenanceRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [extensionDays, setExtensionDays] = useState('');
    const [processing, setProcessing] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        fetchMaintenanceRequests();
    }, []);

    const fetchMaintenanceRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/bookings/my', {
                params: { size: 100 }
            });

            let allBookings = response.data.content || response.data;
            // Filter to MAINTENANCE type only
            const maintenanceBookings = allBookings.filter(
                booking => booking.bookingType === 'MAINTENANCE'
            );

            console.log('Maintenance bookings found:', maintenanceBookings);

            const requestsWithStatus = await Promise.all(
                maintenanceBookings.map(async (booking) => {
                    try {
                        const mrResponse = await api.get('/maintenance/my-requests');
                        const maintenanceRequests = mrResponse.data || [];
                        const matchingRequest = maintenanceRequests.find(
                            mr => mr.bookingId === booking.id
                        );

                        // Determine the display status
                        let displayStatus;
                        if (booking.status === 'REJECTED') {
                            displayStatus = 'REJECTED';
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
                            maintenanceId: matchingRequest?.id
                        };
                    } catch (err) {
                        console.error('Error fetching maintenance status for booking:', booking.id, err);
                        let displayStatus = booking.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
                        if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
                            displayStatus = booking.status;
                        }
                        return {
                            ...booking,
                            maintenanceStatus: displayStatus
                        };
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

    const canStartMaintenance = (request) => {
        const now = new Date();
        const bookingDate = new Date(request.bookingDate);
        const [startHour, startMinute] = request.startTime.split(':').map(Number);

        const scheduledStart = new Date(bookingDate);
        scheduledStart.setHours(startHour, startMinute, 0, 0);

        // Allow starting 15 minutes before scheduled time
        const graceStart = new Date(scheduledStart);
        graceStart.setMinutes(scheduledStart.getMinutes() - 15);

        // Allow starting up to 30 minutes after scheduled start time
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

        const isTodayDate = bookingDate.toDateString() === now.toDateString();
        const isPastDate = bookingDate < new Date(new Date().setHours(0, 0, 0, 0));
        const isFutureDate = bookingDate > new Date(new Date().setHours(0, 0, 0, 0));

        if (isFutureDate) {
            const graceStartTime = new Date(scheduledStart);
            graceStartTime.setMinutes(scheduledStart.getMinutes() - 15);
            const graceEndTime = new Date(scheduledStart);
            graceEndTime.setMinutes(scheduledStart.getMinutes() + 30);
            return {
                canStart: false,
                message: `Maintenance scheduled for ${format(bookingDate, 'MMM d, yyyy')} at ${request.startTime}. You can start on the scheduled date between ${format(graceStartTime, 'h:mm a')} and ${format(graceEndTime, 'h:mm a')}.`,
                variant: 'info'
            };
        }

        if (isPastDate) {
            return {
                canStart: false,
                message: `This maintenance window (${format(bookingDate, 'MMM d, yyyy')} at ${request.startTime}) has passed.`,
                variant: 'error'
            };
        }

        const graceStart = new Date(scheduledStart);
        graceStart.setMinutes(scheduledStart.getMinutes() - 15);

        const graceEnd = new Date(scheduledStart);
        graceEnd.setMinutes(scheduledStart.getMinutes() + 30);

        if (now < graceStart) {
            const minutesUntil = Math.ceil((graceStart - now) / 60000);
            return {
                canStart: false,
                message: `Maintenance can be started at ${format(graceStart, 'h:mm a')} (in about ${minutesUntil} minutes). You have a 15-minute grace period before the scheduled time.`,
                variant: 'warning'
            };
        }

        if (now > graceEnd) {
            return {
                canStart: false,
                message: `The maintenance window has ended. You had until ${format(graceEnd, 'h:mm a')} to start.`,
                variant: 'error'
            };
        }

        return {
            canStart: true,
            message: `You can start maintenance now (scheduled: ${request.startTime})`,
            variant: 'success'
        };
    };

    const getTimeStatusBadge = (request) => {
        // If cancelled or rejected, return appropriate badge
        if (request.maintenanceStatus === 'CANCELLED') {
            return { text: 'Cancelled', className: 'bg-gray-100 text-gray-600' };
        }
        if (request.maintenanceStatus === 'REJECTED') {
            return { text: 'Rejected', className: 'bg-rose-100 text-rose-700' };
        }

        const now = new Date();
        const bookingDate = new Date(request.bookingDate);
        const [startHour] = request.startTime.split(':').map(Number);
        const scheduledStart = new Date(bookingDate);
        scheduledStart.setHours(startHour, 0, 0, 0);

        const isTodayDate = bookingDate.toDateString() === now.toDateString();
        const isPastDate = bookingDate < new Date(new Date().setHours(0, 0, 0, 0));
        const isFutureDate = bookingDate > new Date(new Date().setHours(0, 0, 0, 0));

        if (isFutureDate) {
            return { text: 'Upcoming', className: 'bg-blue-100 text-blue-700' };
        }
        if (isPastDate) {
            return { text: 'Expired', className: 'bg-red-100 text-red-700' };
        }
        if (isTodayDate && canStartMaintenance(request)) {
            return { text: 'Ready to Start', className: 'bg-green-100 text-green-700' };
        }
        if (isTodayDate && !canStartMaintenance(request)) {
            const [startHour, startMinute] = request.startTime.split(':').map(Number);
            const scheduledStartTime = new Date(bookingDate);
            scheduledStartTime.setHours(startHour, startMinute, 0, 0);
            const graceEnd = new Date(scheduledStartTime);
            graceEnd.setMinutes(scheduledStartTime.getMinutes() + 30);

            if (now > graceEnd) {
                return { text: 'Window Closed', className: 'bg-red-100 text-red-700' };
            }
            return { text: 'Waiting for Window', className: 'bg-yellow-100 text-yellow-700' };
        }
        return { text: 'Pending', className: 'bg-gray-100 text-gray-700' };
    };

    const handleStartMaintenance = async (booking) => {
        const bookingId = booking.id;
        console.log('Starting maintenance for booking ID:', bookingId);

        if (!bookingId) {
            toast.error('Invalid booking ID');
            return;
        }

        setProcessing(true);
        try {
            const response = await api.post(`/maintenance/${bookingId}/start`);
            console.log('Start maintenance response:', response.data);
            toast.success('Maintenance started successfully');
            fetchMaintenanceRequests();
        } catch (error) {
            console.error('Start maintenance error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to start maintenance';
            toast.error(errorMsg);
        } finally {
            setProcessing(false);
        }
    };

    const handleCompleteMaintenance = async (booking) => {
        const bookingId = booking.id;
        console.log('Completing maintenance for booking ID:', bookingId);

        if (!bookingId) {
            toast.error('Invalid booking ID');
            return;
        }

        setProcessing(true);
        try {
            const response = await api.post(`/maintenance/${bookingId}/complete`);
            console.log('Complete maintenance response:', response.data);
            toast.success('Maintenance completed successfully');
            fetchMaintenanceRequests();
        } catch (error) {
            console.error('Complete maintenance error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to complete maintenance';
            toast.error(errorMsg);
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelMaintenance = async (request) => {
        const statusText = request.maintenanceStatus === 'APPROVED' ? 'approved' : 'pending';
        if (!window.confirm(`Are you sure you want to cancel this ${statusText} maintenance request for ${request.resourceName} on ${format(new Date(request.bookingDate), 'MMM d, yyyy')} at ${request.startTime}? This action cannot be undone.`)) {
            return;
        }

        setProcessing(true);
        try {
            await api.delete(`/maintenance/${request.id}/cancel`);
            toast.success('Maintenance request cancelled successfully');
            fetchMaintenanceRequests();
        } catch (error) {
            console.error('Cancel maintenance error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to cancel maintenance request';
            toast.error(errorMsg);
        } finally {
            setProcessing(false);
        }
    };

    const handleRequestExtension = async () => {
        if (!selectedRequest || !extensionDays || extensionDays < 1) {
            toast.error('Please enter valid number of days');
            return;
        }

        const bookingId = selectedRequest.id;
        console.log('Requesting extension for booking ID:', bookingId, 'days:', extensionDays);

        setProcessing(true);
        try {
            const response = await api.post(`/maintenance/${bookingId}/extend?days=${extensionDays}`);
            console.log('Extension response:', response.data);
            toast.success(`Extension request for ${extensionDays} days submitted`);
            setShowExtensionModal(false);
            setExtensionDays('');
            setSelectedRequest(null);
            fetchMaintenanceRequests();
        } catch (error) {
            console.error('Extension request error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to request extension';
            toast.error(errorMsg);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            PENDING: {
                bg: 'bg-amber-100',
                text: 'text-amber-700',
                border: 'border-amber-200',
                icon: <Clock className="w-4 h-4" />,
                label: 'Pending Approval',
                actions: ['view', 'cancel']
            },
            APPROVED: {
                bg: 'bg-emerald-100',
                text: 'text-emerald-700',
                border: 'border-emerald-200',
                icon: <CheckCircle className="w-4 h-4" />,
                label: 'Approved - Ready to Start',
                actions: ['start', 'cancel', 'view']
            },
            IN_PROGRESS: {
                bg: 'bg-blue-100',
                text: 'text-blue-700',
                border: 'border-blue-200',
                icon: <Play className="w-4 h-4" />,
                label: 'In Progress',
                actions: ['complete', 'extend', 'view']
            },
            COMPLETED: {
                bg: 'bg-green-100',
                text: 'text-green-700',
                border: 'border-green-200',
                icon: <CheckCircle className="w-4 h-4" />,
                label: 'Completed',
                actions: ['view']
            },
            REJECTED: {
                bg: 'bg-rose-100',
                text: 'text-rose-700',
                border: 'border-rose-200',
                icon: <XCircle className="w-4 h-4" />,
                label: 'Rejected',
                actions: ['view']
            },
            CANCELLED: {
                bg: 'bg-gray-100',
                text: 'text-gray-600',
                border: 'border-gray-200',
                icon: <Ban className="w-4 h-4" />,
                label: 'Cancelled',
                actions: ['view']
            },
            EXTENSION_REQUESTED: {
                bg: 'bg-purple-100',
                text: 'text-purple-700',
                border: 'border-purple-200',
                icon: <RefreshCw className="w-4 h-4" />,
                label: 'Extension Requested',
                actions: ['view']
            }
        };
        return configs[status] || configs.PENDING;
    };

    const getPriorityConfig = (priority) => {
        const configs = {
            CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
            HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
            MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
            LOW: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' }
        };
        return configs[priority] || configs.MEDIUM;
    };

    const filteredRequests = requests.filter(request => {
        if (filterStatus === 'ALL') return true;
        const status = request.maintenanceStatus || request.status;
        return status === filterStatus;
    });

    const stats = {
        total: requests.length,
        pending: requests.filter(r => (r.maintenanceStatus || r.status) === 'PENDING').length,
        approved: requests.filter(r => (r.maintenanceStatus || r.status) === 'APPROVED').length,
        inProgress: requests.filter(r => (r.maintenanceStatus || r.status) === 'IN_PROGRESS').length,
        completed: requests.filter(r => (r.maintenanceStatus || r.status) === 'COMPLETED').length,
        cancelled: requests.filter(r => (r.maintenanceStatus || r.status) === 'CANCELLED' || (r.maintenanceStatus || r.status) === 'REJECTED').length
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Wrench className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-text-primary">Maintenance Dashboard</h1>
                                    <p className="text-sm text-text-secondary mt-0.5">
                                        Track and manage your maintenance requests
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {requests.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 p-6 bg-gray-50/30">
                            <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                                <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                                <p className="text-xs text-text-secondary">Total Requests</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
                                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                                <p className="text-xs text-amber-600">Pending</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                                <p className="text-xs text-emerald-600">Approved</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                                <p className="text-xs text-blue-600">In Progress</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-green-100">
                                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                                <p className="text-xs text-green-600">Completed</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-gray-200">
                                <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
                                <p className="text-xs text-gray-600">Cancelled/Rejected</p>
                            </div>
                        </div>
                    )}

                    <div className="px-6 pt-4 pb-2 border-b border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'ALL' ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
                            <button onClick={() => setFilterStatus('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>Pending</button>
                            <button onClick={() => setFilterStatus('APPROVED')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'APPROVED' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>Approved</button>
                            <button onClick={() => setFilterStatus('IN_PROGRESS')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'IN_PROGRESS' ? 'bg-blue-500 text-white shadow-sm' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>In Progress</button>
                            <button onClick={() => setFilterStatus('COMPLETED')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'COMPLETED' ? 'bg-green-500 text-white shadow-sm' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>Completed</button>
                            <button onClick={() => setFilterStatus('CANCELLED')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'CANCELLED' ? 'bg-gray-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Cancelled/Rejected</button>
                        </div>
                    </div>
                </div>

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
                                const statusConfig = getStatusConfig(displayStatus);
                                const priorityConfig = getPriorityConfig(request.priority);
                                const timeStatus = displayStatus === 'APPROVED' ? getTimeStatusBadge(request) : null;
                                const startStatus = displayStatus === 'APPROVED' ? getStartButtonStatus(request) : null;

                                return (
                                    <div key={request.id} className="p-6 hover:bg-gray-50/30 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 flex-wrap mb-2">
                                                    <h3 className="text-lg font-bold text-text-primary">{request.resourceName}</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.text}`}>{priorityConfig.label}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                                                        {statusConfig.icon}<span>{statusConfig.label}</span>
                                                    </span>
                                                    {displayStatus === 'APPROVED' && timeStatus && (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${timeStatus.className}`}>
                                                            {timeStatus.text}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-text-primary mb-3">{request.issueDescription || 'No description provided'}</p>
                                                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{format(new Date(request.bookingDate), 'EEEE, MMM d, yyyy')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{request.startTime} - {request.endTime}</span>
                                                    </div>
                                                </div>

                                                {/* Show admin reason for cancelled/rejected requests */}
                                                {(displayStatus === 'CANCELLED' || displayStatus === 'REJECTED') && request.adminReason && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <p className="text-xs font-semibold text-text-secondary">Reason:</p>
                                                        <p className="text-sm text-text-primary mt-1">{request.adminReason}</p>
                                                    </div>
                                                )}

                                                {/* Time window info for approved requests */}
                                                {displayStatus === 'APPROVED' && startStatus && !startStatus.canStart && startStatus.variant !== 'success' && (
                                                    <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                                                        startStatus.variant === 'info' ? 'bg-blue-50 border border-blue-100' :
                                                            startStatus.variant === 'warning' ? 'bg-yellow-50 border border-yellow-100' :
                                                                'bg-red-50 border border-red-100'
                                                    }`}>
                                                        <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                                            startStatus.variant === 'info' ? 'text-blue-500' :
                                                                startStatus.variant === 'warning' ? 'text-yellow-500' :
                                                                    'text-red-500'
                                                        }`} />
                                                        <p className={`text-xs ${
                                                            startStatus.variant === 'info' ? 'text-blue-700' :
                                                                startStatus.variant === 'warning' ? 'text-yellow-700' :
                                                                    'text-red-700'
                                                        }`}>{startStatus.message}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-row lg:flex-col gap-2">
                                                {statusConfig.actions.includes('start') && displayStatus === 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleStartMaintenance(request)}
                                                        disabled={!startStatus?.canStart || processing}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition
                                                            ${startStatus?.canStart
                                                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                        title={startStatus?.message || 'Cannot start maintenance yet'}
                                                    >
                                                        <Play className="w-4 h-4" />
                                                        Start Maintenance
                                                    </button>
                                                )}

                                                {statusConfig.actions.includes('complete') && (
                                                    <button
                                                        onClick={() => handleCompleteMaintenance(request)}
                                                        disabled={processing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-semibold hover:bg-green-100 transition"
                                                    >
                                                        <Check className="w-4 h-4" /> Mark Completed
                                                    </button>
                                                )}

                                                {statusConfig.actions.includes('cancel') && (
                                                    <button
                                                        onClick={() => handleCancelMaintenance(request)}
                                                        disabled={processing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition"
                                                    >
                                                        <Ban className="w-4 h-4" /> Cancel Request
                                                    </button>
                                                )}

                                                {statusConfig.actions.includes('extend') && (
                                                    <button
                                                        onClick={() => { setSelectedRequest(request); setShowExtensionModal(true); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
                                                    >
                                                        <RefreshCw className="w-4 h-4" /> Request Extension
                                                    </button>
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

            {/* Extension Modal */}
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
                                    Current maintenance period: {format(new Date(selectedRequest.bookingDate), 'MMM d, yyyy')} • {selectedRequest.startTime} - {selectedRequest.endTime}
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