// src/pages/admin/AdminResourceCalendar.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Calendar, ChevronLeft, ChevronRight, Loader2,
    Building, Wrench, CheckCircle, XCircle, Clock,
    Eye, TrendingUp, AlertCircle, Download, Ban
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';

const AdminResourceCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [resources, setResources] = useState([]);
    const [bookingsData, setBookingsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedResource, setSelectedResource] = useState(null);
    const [selectedDateBookings, setSelectedDateBookings] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isPastDate, setIsPastDate] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState('');

    const tableContainerRef = useRef(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const today = new Date();
    const todayIndex = daysInMonth.findIndex(day =>
        format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        if (resources.length > 0) {
            fetchAllBookingsForMonth();
        }
    }, [currentDate, resources]);

    useEffect(() => {
        if (todayIndex !== -1 && tableContainerRef.current && !loading) {
            setTimeout(() => {
                const todayCell = document.getElementById(`today-column-${format(today, 'yyyy-MM-dd')}`);
                if (todayCell) {
                    todayCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }, 300);
        }
    }, [currentDate, loading, todayIndex]);

    const fetchResources = async () => {
        try {
            const response = await api.get('/resources', { params: { size: 100 } });
            setResources(response.data.content || response.data);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
            toast.error('Failed to load resources');
        }
    };

    const fetchAllBookingsForMonth = async () => {
        setLoading(true);
        try {
            const startDate = format(monthStart, 'yyyy-MM-dd');
            const endDate = format(monthEnd, 'yyyy-MM-dd');

            const response = await api.get('/bookings', {
                params: {
                    startDate: startDate,
                    endDate: endDate,
                    size: 500
                }
            });

            const allBookings = response.data.content || response.data;

            const organized = {};
            resources.forEach(resource => {
                organized[resource.id] = {};
            });

            allBookings.forEach(booking => {
                let bookingDate;
                if (Array.isArray(booking.bookingDate)) {
                    bookingDate = `${booking.bookingDate[0]}-${String(booking.bookingDate[1]).padStart(2, '0')}-${String(booking.bookingDate[2]).padStart(2, '0')}`;
                } else {
                    bookingDate = booking.bookingDate;
                }

                const resourceId = booking.resourceId;

                if (!organized[resourceId]) {
                    organized[resourceId] = {};
                }
                if (!organized[resourceId][bookingDate]) {
                    organized[resourceId][bookingDate] = [];
                }
                organized[resourceId][bookingDate].push(booking);
            });

            setBookingsData(organized);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            toast.error('Failed to load booking data');
        } finally {
            setLoading(false);
        }
    };

    const isDatePast = (date) => {
        const todayDate = startOfDay(new Date());
        const checkDate = startOfDay(date);
        return isBefore(checkDate, todayDate);
    };

    const isToday = (date) => {
        return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    };

    // Replace getResourceStatusForDate function:
    const getResourceStatusForDate = (resource, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isPast = isDatePast(date);

        // ── Check maintenance FIRST — even past dates can be under maintenance ──
        if (resource.maintenanceMode === true && resource.maintenanceStartDate && resource.maintenanceEndDate) {
            let startDate, endDate;
            if (Array.isArray(resource.maintenanceStartDate)) {
                startDate = new Date(resource.maintenanceStartDate[0], resource.maintenanceStartDate[1] - 1, resource.maintenanceStartDate[2]);
                endDate   = new Date(resource.maintenanceEndDate[0],   resource.maintenanceEndDate[1] - 1,   resource.maintenanceEndDate[2]);
            } else {
                startDate = new Date(resource.maintenanceStartDate + 'T00:00:00');
                endDate   = new Date(resource.maintenanceEndDate   + 'T00:00:00');
            }
            // Normalize date to midnight for fair comparison
            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            if (checkDate >= startDate && checkDate <= endDate) {
                return {
                    status: 'maintenance',
                    label: 'Maintenance',
                    color: 'bg-purple-100 text-purple-700 border-purple-200',
                    icon: <Wrench className="w-4 h-4" />,
                    tooltip: resource.maintenanceReason
                        ? `Under maintenance: ${resource.maintenanceReason}`
                        : 'Resource under maintenance',
                };
            }
        }

        // ── Past date (after maintenance check) ──────────────────────────────
        if (isPast) {
            const resourceBookings = bookingsData[resource.id]?.[dateStr] || [];
            const approvedCount = resourceBookings.filter(b => b.status === 'APPROVED').length;
            if (approvedCount > 0) {
                return {
                    status: 'past_with_bookings',
                    label: `${approvedCount} Booked`,
                    color: 'bg-gray-300 text-gray-600 border-gray-400',
                    icon: <Clock className="w-4 h-4" />,
                    tooltip: `${approvedCount} bookings occurred on this date (past)`,
                };
            }
            return {
                status: 'past',
                label: 'Past Date',
                color: 'bg-gray-200 text-gray-500 border-gray-300',
                icon: <Ban className="w-4 h-4" />,
                tooltip: 'This date has passed',
            };
        }

        // ── Inactive resource ─────────────────────────────────────────────────
        if (resource.status !== 'ACTIVE') {
            return {
                status: 'inactive',
                label: 'Inactive',
                color: 'bg-gray-100 text-gray-500 border-gray-200',
                icon: <XCircle className="w-4 h-4" />,
                tooltip: 'Resource is inactive',
            };
        }

        // ── Future dates: check booking counts ───────────────────────────────
        const resourceBookings = bookingsData[resource.id]?.[dateStr] || [];
        const approvedCount  = resourceBookings.filter(b => b.status === 'APPROVED').length;
        const pendingCount   = resourceBookings.filter(b => b.status === 'PENDING').length;
        const totalSlots = 9;

        if (approvedCount >= totalSlots) {
            return {
                status: 'full',
                label: 'Fully Booked',
                color: 'bg-red-100 text-red-700 border-red-200',
                icon: <XCircle className="w-4 h-4" />,
                tooltip: `${approvedCount}/${totalSlots} slots booked`,
            };
        } else if (approvedCount > 0) {
            return {
                status: 'partial',
                label: `${approvedCount}/${totalSlots} Booked`,
                color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                icon: <Clock className="w-4 h-4" />,
                tooltip: `${approvedCount} approved, ${pendingCount} pending`,
            };
        } else if (pendingCount > 0) {
            return {
                status: 'pending',
                label: `${pendingCount} Pending`,
                color: 'bg-amber-100 text-amber-700 border-amber-200',
                icon: <Clock className="w-4 h-4" />,
                tooltip: `${pendingCount} pending requests`,
            };
        }

        return {
            status: 'available',
            label: 'Available',
            color: 'bg-green-100 text-green-700 border-green-200',
            icon: <CheckCircle className="w-4 h-4" />,
            tooltip: 'All slots available for booking',
        };
    };

    const handleCellClick = async (resource, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isPast = isDatePast(date);

        try {
            const response = await api.get('/bookings', {
                params: { resourceId: resource.id, bookingDate: dateStr, size: 50 }
            });
            const bookings = response.data.content || response.data;
            setSelectedResource(resource);
            setSelectedDateBookings(bookings);
            setIsPastDate(isPast);
            setSelectedDateStr(format(date, 'EEEE, MMM d, yyyy'));
            setShowDetailModal(true);
        } catch (error) {
            toast.error('Failed to load booking details');
        }
    };

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleToday = () => {
        setCurrentDate(new Date());
        setTimeout(() => {
            const todayCell = document.getElementById(`today-column-${format(new Date(), 'yyyy-MM-dd')}`);
            if (todayCell) {
                todayCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 300);
    };

    const exportToCSV = () => {
        const headers = ['Resource', 'Type', 'Capacity', 'Location'];
        daysInMonth.forEach(day => {
            headers.push(format(day, 'MM/dd'));
        });

        const rows = resources.map(resource => {
            const row = [resource.name, resource.type, resource.capacity, resource.location];
            daysInMonth.forEach(day => {
                const status = getResourceStatusForDate(resource, day);
                row.push(status.label);
            });
            return row;
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resource-utilization-${format(currentDate, 'yyyy-MM')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported successfully');
    };

    // Replace summaryStats object:
    const summaryStats = {
        totalResources: resources.length,
        activeResources: resources.filter(r => r.status === 'ACTIVE').length,
        totalBookingsToday: Object.values(bookingsData).reduce((sum, resourceBookings) => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            return sum + (resourceBookings[todayStr]?.filter(b => b.status === 'APPROVED').length || 0);
        }, 0),
        // Safe check — maintenanceMode might come as boolean true/false or be absent
        maintenanceResources: resources.filter(r => r.maintenanceMode === true).length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-full mx-auto p-6 space-y-6">

                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-text-primary">Resource Utilization Calendar</h1>
                                    <p className="text-sm text-text-secondary mt-0.5">
                                        View all resource bookings across dates — identify usage patterns and availability
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportToCSV}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
                                >
                                    <Download className="w-4 h-4" /> Export Report
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-gray-50/30">
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <p className="text-2xl font-bold text-text-primary">{summaryStats.totalResources}</p>
                            <p className="text-xs text-text-secondary">Total Resources</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <p className="text-2xl font-bold text-emerald-600">{summaryStats.activeResources}</p>
                            <p className="text-xs text-text-secondary">Active Resources</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <p className="text-2xl font-bold text-blue-600">{summaryStats.totalBookingsToday}</p>
                            <p className="text-xs text-text-secondary">Bookings Today</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <p className="text-2xl font-bold text-purple-600">{summaryStats.maintenanceResources}</p>
                            <p className="text-xs text-text-secondary">Under Maintenance</p>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex flex-wrap items-center gap-6">
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Legend:</span>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div><span className="text-xs text-text-secondary">Available (Future)</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div><span className="text-xs text-text-secondary">Partially Booked</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div><span className="text-xs text-text-secondary">Fully Booked</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-100 border border-amber-200 rounded"></div><span className="text-xs text-text-secondary">Pending Requests</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div><span className="text-xs font-semibold text-purple-700">Under Maintenance (No Bookings)</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div><span className="text-xs text-text-secondary">Inactive</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded"></div><span className="text-xs text-text-secondary">Past Date (with bookings)</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div><span className="text-xs text-text-secondary">Past Date (no bookings)</span></div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-r from-primary/20 to-primary/40 rounded border border-primary/50"></div>
                            <span className="text-xs font-semibold text-primary">Today</span>
                        </div>
                    </div>
                </div>

                {/* Calendar Navigation */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold text-text-primary min-w-[200px] text-center">
                                {format(currentDate, 'MMMM yyyy')}
                            </h2>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={handleToday}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition shadow-md shadow-primary/20 flex items-center gap-2"
                        >
                            <Calendar className="w-4 h-4" /> Today
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="overflow-x-auto" ref={tableContainerRef}>
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="bg-gray-50">
                                    <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-gray-200 min-w-[220px]">
                                        Resource
                                    </th>
                                    {daysInMonth.map((day, idx) => {
                                        const isTodayDate = isToday(day);
                                        return (
                                            <th
                                                key={idx}
                                                id={`today-column-${format(day, 'yyyy-MM-dd')}`}
                                                className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-b min-w-[95px] transition-all ${
                                                    isTodayDate
                                                        ? 'bg-primary/15 text-primary border-primary/30 shadow-inner'
                                                        : 'bg-gray-50 text-text-secondary border-gray-200'
                                                }`}
                                            >
                                                <div>{format(day, 'EEE')}</div>
                                                <div className={`text-sm font-bold mt-1 ${
                                                    isTodayDate ? 'text-primary text-base' : 'text-text-primary'
                                                }`}>
                                                    {format(day, 'd')}
                                                </div>
                                                {isTodayDate && (
                                                    <div className="text-[8px] font-bold text-primary mt-0.5 uppercase tracking-wider">
                                                        Today
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                                </thead>
                                <tbody>
                                {resources.map((resource) => (
                                    <tr key={resource.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                                        <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-primary flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary">{resource.name}</p>
                                                    <p className="text-xs text-text-secondary">{resource.type?.replace(/_/g, ' ')}</p>
                                                    {resource.capacity && (
                                                        <p className="text-[10px] text-text-secondary">Cap: {resource.capacity}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {daysInMonth.map((day, idx) => {
                                            const status = getResourceStatusForDate(resource, day);
                                            const isTodayDate = isToday(day);
                                            return (
                                                <td
                                                    key={idx}
                                                    onClick={() => handleCellClick(resource, day)}
                                                    className={`px-2 py-2 text-center cursor-pointer transition-all hover:scale-105 ${
                                                        isTodayDate ? 'bg-primary/5' : ''
                                                    }`}
                                                    title={status.tooltip}
                                                >
                                                    <div className={`p-2 rounded-lg border ${status.color} flex flex-col items-center gap-1 min-w-[75px] ${
                                                        isTodayDate ? 'ring-1 ring-primary/50 shadow-sm' : ''
                                                    }`}>
                                                        {status.icon}
                                                        <span className="text-[10px] font-semibold text-center">{status.label}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!loading && resources.length === 0 && (
                        <div className="text-center py-16">
                            <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-text-secondary">No resources found</p>
                            <p className="text-xs text-text-secondary mt-1">Please add resources to see the calendar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Building className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">{selectedResource.name}</h3>
                                        <p className="text-sm text-text-secondary">
                                            Bookings for {selectedDateStr}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                                    <XCircle className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {isPastDate && (
                                <div className="mb-4 p-3 bg-gray-100 rounded-xl border border-gray-200 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600">Historical Data</p>
                                        <p className="text-xs text-gray-500">
                                            This date has already passed. These bookings are for historical reference only.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedDateBookings.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                                    <p className="text-text-secondary">No bookings for this date</p>
                                    {!isPastDate && (
                                        <p className="text-xs text-text-secondary mt-1">This resource is fully available</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateBookings.map(booking => (
                                        <div key={booking.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <Clock className="w-4 h-4 text-text-secondary" />
                                                        <span className="text-sm font-semibold text-text-primary">
                                                            {booking.startTime} - {booking.endTime}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                            booking.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                        }`}>
                                                            {booking.status}
                                                        </span>
                                                        {booking.bookingType === 'MAINTENANCE' && (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                                                Maintenance
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-text-primary">{booking.userFullName}</p>
                                                    <p className="text-xs text-text-secondary">{booking.userEmail}</p>
                                                    {booking.purpose && (
                                                        <p className="text-xs text-text-secondary mt-1">📝 {booking.purpose}</p>
                                                    )}
                                                    {booking.issueDescription && (
                                                        <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                                                            <Wrench className="w-3 h-3" /> {booking.issueDescription}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowDetailModal(false);
                                                        window.location.href = `/admin/bookings?resource=${selectedResource.id}`;
                                                    }}
                                                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
                                                    title="View all bookings for this resource"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    window.location.href = `/admin/bookings?resource=${selectedResource.id}`;
                                }}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition"
                            >
                                Manage Bookings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminResourceCalendar;