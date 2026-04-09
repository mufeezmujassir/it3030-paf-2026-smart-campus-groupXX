// src/components/BookingCalendar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2, AlertCircle, CheckCircle, XCircle, Wrench, CalendarX } from 'lucide-react';
import bookingService from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

const formatLongDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

// LocalDate from Java serializes as an array [year, month, day] or "YYYY-MM-DD" string
const formatMaintenanceEndDate = (dateValue) => {
    if (!dateValue) return null;
    try {
        let date;
        if (Array.isArray(dateValue)) {
            // Java LocalDate → Jackson array: month is 1-based, Date() needs 0-based
            date = new Date(dateValue[0], dateValue[1] - 1, dateValue[2]);
        } else {
            // ISO string — append time to avoid UTC offset flipping the day
            date = new Date(String(dateValue) + 'T00:00:00');
        }
        return date.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
    } catch {
        return String(dateValue);
    }
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const startOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const BookingCalendar = ({ resourceId, resourceName, isResourceActive = true, onBookingCreated }) => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timeSlots, setTimeSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    // null = not under maintenance; object = { maintenanceReason, maintenanceEndDate }
    const [maintenanceInfo, setMaintenanceInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [bookingPurpose, setBookingPurpose] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [myBookings, setMyBookings] = useState([]);
    const [showMyBookings, setShowMyBookings] = useState(false);

    // Maintenance request fields (technician only)
    const [bookingType, setBookingType] = useState('REGULAR');
    const [issueDescription, setIssueDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        if (user) setUserRole(user.role);
    }, [user]);

    useEffect(() => {
        if (resourceId && selectedDate) fetchTimeSlots();
        fetchMyBookings();
    }, [resourceId, selectedDate]);

    const fetchMyBookings = async () => {
        try {
            const data = await bookingService.getMyBookings({ size: 50 });
            setMyBookings(data.content || data);
        } catch (err) {
            console.error('Failed to fetch my bookings:', err);
        }
    };

    const fetchTimeSlots = async () => {
        setLoading(true);
        setMaintenanceInfo(null);
        try {
            const formattedDate = formatDate(selectedDate);
            const data = await bookingService.getAvailableTimeSlots(resourceId, formattedDate);

            // Log so we can inspect the exact field names from the backend
            console.log('[BookingCalendar] slot response:', data);

            // Jackson strips "is" from primitive booleans → "underMaintenance".
            // @JsonProperty on the DTO fixes it on the backend, but we also handle
            // the old name here as a safety net in case of a caching/build issue.
            const underMaintenance =
                data.isUnderMaintenance === true ||
                data.underMaintenance === true;

            if (underMaintenance) {
                setMaintenanceInfo({
                    maintenanceReason: data.maintenanceReason || null,
                    maintenanceEndDate: data.maintenanceEndDate || null,
                });
                setTimeSlots([]);
                setBookedSlots([]);
            } else {
                setMaintenanceInfo(null);
                setTimeSlots(data.availableSlots || []);
                setBookedSlots(data.bookedSlots || []);
            }
        } catch (error) {
            console.error('Failed to fetch time slots:', error);
            toast.error('Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const resetNav = () => {
        setSelectedSlot(null);
        setShowBookingForm(false);
        setBookingType('REGULAR');
        setIssueDescription('');
        setPriority('MEDIUM');
    };

    const handlePrevDay = () => {
        const newDate = addDays(selectedDate, -1);
        if (newDate < startOfDay(new Date())) {
            toast.info('Cannot select past dates');
            return;
        }
        setSelectedDate(newDate);
        resetNav();
    };

    const handleNextDay = () => {
        setSelectedDate(addDays(selectedDate, 1));
        resetNav();
    };

    const getSlotStatus = (startTime, endTime) => {
        const booked = bookedSlots.find(b => b.startTime === startTime && b.endTime === endTime);
        if (booked) return booked.status === 'APPROVED' ? 'booked' : 'pending';
        return 'available';
    };

    const getSlotClasses = (startTime, endTime) => {
        const status = getSlotStatus(startTime, endTime);
        const isSelected = selectedSlot?.startTime === startTime && selectedSlot?.endTime === endTime;
        if (isSelected) return 'bg-primary text-white ring-2 ring-primary ring-offset-2';
        if (status === 'booked') return 'bg-red-100 text-red-700 cursor-not-allowed border-red-200 opacity-60';
        if (status === 'pending') return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 cursor-pointer';
        return 'bg-white hover:bg-primary/10 hover:border-primary cursor-pointer border-gray-200';
    };

    const handleSlotClick = (slot) => {
        if (!isResourceActive) {
            toast.error('This resource is currently unavailable for booking');
            return;
        }
        const status = getSlotStatus(slot.startTime, slot.endTime);
        if (status === 'booked') {
            toast.info('This time slot is already approved and cannot be booked');
        } else if (status === 'pending') {
            toast.warning('There is already a pending request for this slot. You can still book, but only one will be approved.');
            setSelectedSlot(slot);
            setShowBookingForm(true);
        } else {
            setSelectedSlot(slot);
            setShowBookingForm(true);
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSlot) return;
        setSubmitting(true);
        try {
            const formattedDate = formatDate(selectedDate);
            const now = new Date();
            if (formatDate(new Date()) === formattedDate) {
                const currentHour = now.getHours();
                const bookingHour = parseInt(selectedSlot.startTime.split(':')[0]);
                if (bookingHour <= currentHour) {
                    toast.error('Cannot book a time slot that has already passed');
                    setSubmitting(false);
                    return;
                }
            }

            const bookingData = {
                resourceId,
                bookingDate: formattedDate,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                purpose: bookingPurpose,
                expectedAttendees: expectedAttendees ? parseInt(expectedAttendees) : null,
                bookingType: userRole === 'TECHNICIAN' && bookingType === 'MAINTENANCE' ? 'MAINTENANCE' : 'REGULAR',
            };
            if (bookingData.bookingType === 'MAINTENANCE') {
                bookingData.issueDescription = issueDescription;
                bookingData.priority = priority;
            }

            await bookingService.createBooking(bookingData);
            toast.success(bookingData.bookingType === 'MAINTENANCE'
                ? 'Maintenance request submitted! Waiting for admin approval.'
                : 'Booking request submitted! Waiting for approval.');

            setShowBookingForm(false);
            setSelectedSlot(null);
            setBookingPurpose('');
            setExpectedAttendees('');
            setBookingType('REGULAR');
            setIssueDescription('');
            setPriority('MEDIUM');
            fetchTimeSlots();
            fetchMyBookings();
            if (onBookingCreated) onBookingCreated();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setSubmitting(false);
        }
    };

    const userBookingsForDate = myBookings.filter(
        b => b.resourceId === resourceId && b.bookingDate === formatDate(selectedDate)
    );
    const isUnderMaintenance = maintenanceInfo !== null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Header ── */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-text-primary">Book This Resource</h3>
                        <p className="text-sm text-text-secondary mt-1">
                            Select a date and time slot for {resourceName}
                        </p>
                        {!isResourceActive && (
                            <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                This resource is currently unavailable for booking
                            </p>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="text-lg font-semibold text-text-primary min-w-[140px] text-center">
                            {formatDisplayDate(selectedDate)}
                        </span>
                        <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Slot legend — hidden while under maintenance */}
                {!isUnderMaintenance && !loading && (
                    <div className="flex items-center gap-6 mt-4 pt-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
                            <span className="text-xs text-text-secondary">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded" />
                            <span className="text-xs text-text-secondary">Pending Request (Still Bookable)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
                            <span className="text-xs text-text-secondary">Approved &amp; Booked</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── My bookings for this date (not shown under maintenance) ── */}
            {!isUnderMaintenance && userBookingsForDate.length > 0 && (
                <div className="px-6 pt-4">
                    <button
                        onClick={() => setShowMyBookings(!showMyBookings)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                        <Clock size={16} />
                        {showMyBookings ? 'Hide' : 'Show'} my bookings for this date
                    </button>
                    {showMyBookings && (
                        <div className="mt-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <h4 className="text-sm font-bold text-text-primary mb-2">
                                Your Bookings on {formatDisplayDate(selectedDate)}
                            </h4>
                            <div className="space-y-2">
                                {userBookingsForDate.map(booking => (
                                    <div key={booking.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">
                                                {booking.startTime} - {booking.endTime}
                                            </p>
                                            <p className="text-xs text-text-secondary">{booking.purpose || 'No purpose'}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            booking.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'PENDING'  ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                        }`}>
                                            {booking.status === 'APPROVED' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                            {booking.status === 'PENDING'  && <Clock className="w-3 h-3 inline mr-1" />}
                                            {booking.status === 'REJECTED' && <XCircle className="w-3 h-3 inline mr-1" />}
                                            {booking.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Main body ── */}
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>

                ) : isUnderMaintenance ? (
                    /* ══════════════════════════════════════════════════
                       MAINTENANCE BANNER
                       Replaces the time-slot grid whenever the selected
                       date falls within the resource's maintenance window.
                    ══════════════════════════════════════════════════ */
                    <div className="flex flex-col items-center text-center py-8 px-4">

                        {/* Wrench icon */}
                        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mb-5 border border-amber-200">
                            <Wrench className="w-10 h-10 text-amber-600" />
                        </div>

                        {/* Heading */}
                        <h4 className="text-xl font-bold text-text-primary mb-2">
                            Resource Under Maintenance
                        </h4>

                        {/* Body */}
                        <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
                            <span className="font-semibold text-text-primary">{resourceName}</span> is
                            currently under maintenance on{' '}
                            <span className="font-semibold text-text-primary">
                                {formatDisplayDate(selectedDate)}
                            </span>.
                            All time slots are blocked and no new bookings can be made for this date.
                        </p>

                        {/* Reason */}
                        {maintenanceInfo.maintenanceReason && (
                            <div className="w-full max-w-md mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                                    Reason for maintenance
                                </p>
                                <p className="text-sm text-amber-900 leading-relaxed">
                                    {maintenanceInfo.maintenanceReason}
                                </p>
                            </div>
                        )}

                        {/* End date */}
                        {maintenanceInfo.maintenanceEndDate && (
                            <div className="w-full max-w-md mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-left flex items-start gap-3">
                                <CalendarX className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-0.5">
                                        Maintenance ends on
                                    </p>
                                    <p className="text-sm font-semibold text-blue-900">
                                        {formatMaintenanceEndDate(maintenanceInfo.maintenanceEndDate)}
                                    </p>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        Bookings will be available again after this date.
                                        If an extension was requested, this date may change — check back for updates.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Navigation hint */}
                        <p className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                            Use the arrows above to navigate to a different date and check availability.
                        </p>
                    </div>

                ) : (
                    /* ── Normal time-slot grid ── */
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {timeSlots.map((slot, index) => {
                                const status = getSlotStatus(slot.startTime, slot.endTime);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSlotClick(slot)}
                                        disabled={status === 'booked' || !isResourceActive}
                                        className={`relative p-4 rounded-xl border transition-all duration-200
                                            ${getSlotClasses(slot.startTime, slot.endTime)}
                                            ${status === 'booked' || !isResourceActive ? 'opacity-60' : 'hover:shadow-md'}`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-semibold">
                                                {slot.startTime} - {slot.endTime}
                                            </span>
                                            {status === 'pending' && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Pending
                                                </span>
                                            )}
                                            {status === 'booked' && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                                                    Booked
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {timeSlots.length === 0 && (
                            <div className="text-center py-12">
                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-text-secondary">No available time slots for this date</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Bookings are only available from 8:00 AM to 5:00 PM, hourly slots only
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Booking / Maintenance-request modal ── */}
            {showBookingForm && selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
                            <h3 className="text-xl font-bold text-text-primary">
                                Confirm {bookingType === 'MAINTENANCE' ? 'Maintenance Request' : 'Booking'}
                            </h3>
                            <p className="text-sm text-text-secondary mt-1">
                                {resourceName} • {formatLongDate(selectedDate)} • {selectedSlot.startTime} - {selectedSlot.endTime}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    Purpose of {bookingType === 'MAINTENANCE' ? 'Maintenance' : 'Booking'}{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={bookingPurpose}
                                    onChange={(e) => setBookingPurpose(e.target.value)}
                                    rows="2"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={bookingType === 'MAINTENANCE'
                                        ? 'Describe the issue or reason for maintenance...'
                                        : 'Describe the purpose of your booking...'}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    Expected Attendees
                                </label>
                                <input
                                    type="number"
                                    value={expectedAttendees}
                                    onChange={(e) => setExpectedAttendees(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Number of people attending"
                                    min="1"
                                />
                            </div>

                            {userRole === 'TECHNICIAN' && (
                                <div className="border-t border-gray-200 pt-3">
                                    <label className="block text-sm font-semibold text-text-primary mb-2">
                                        Request Type
                                    </label>
                                    <div className="flex gap-4 mb-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="REGULAR" checked={bookingType === 'REGULAR'} onChange={(e) => setBookingType(e.target.value)} className="w-4 h-4 text-primary" />
                                            <span className="text-sm">Regular Booking</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="MAINTENANCE" checked={bookingType === 'MAINTENANCE'} onChange={(e) => setBookingType(e.target.value)} className="w-4 h-4 text-primary" />
                                            <span className="text-sm">Maintenance Request</span>
                                        </label>
                                    </div>
                                    {bookingType === 'MAINTENANCE' && (
                                        <div className="space-y-3 bg-red-50 p-3 rounded-xl border border-red-100">
                                            <div>
                                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                                    Issue Description <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    value={issueDescription}
                                                    onChange={(e) => setIssueDescription(e.target.value)}
                                                    rows="2"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    placeholder="Describe the issue in detail..."
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                                    Priority Level
                                                </label>
                                                <select
                                                    value={priority}
                                                    onChange={(e) => setPriority(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                >
                                                    <option value="LOW">Low - Can wait, schedule when available</option>
                                                    <option value="MEDIUM">Medium - Needs attention within a week</option>
                                                    <option value="HIGH">High - Urgent repair needed</option>
                                                    <option value="CRITICAL">Critical - Resource completely unusable</option>
                                                </select>
                                            </div>
                                            <div className="bg-red-100/50 p-2 rounded-lg flex items-start gap-2">
                                                <Wrench className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-red-600">
                                                    Once approved, the resource will be blocked and other users notified.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-yellow-600">
                                        {bookingType === 'MAINTENANCE'
                                            ? 'Your maintenance request will be pending until an admin approves it. Once approved, the resource will be marked for maintenance during this time slot.'
                                            : 'Your request will be pending until an admin approves it. Multiple users can request the same time slot, but only one will be approved.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => { setShowBookingForm(false); setSelectedSlot(null); setBookingType('REGULAR'); setIssueDescription(''); setPriority('MEDIUM'); }}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={handleBookingSubmit}
                                disabled={submitting || !bookingPurpose.trim() || (bookingType === 'MAINTENANCE' && !issueDescription.trim())}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50"
                            >
                                {submitting
                                    ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    : bookingType === 'MAINTENANCE' ? 'Submit Maintenance Request' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingCalendar;