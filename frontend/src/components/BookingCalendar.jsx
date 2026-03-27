// src/components/BookingCalendar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import bookingService from '../services/bookingService';
import { toast } from 'react-toastify';
import { format, addDays, subDays, isAfter, startOfDay, isBefore, addHours } from 'date-fns';

const BookingCalendar = ({ resourceId, resourceName, onBookingCreated }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timeSlots, setTimeSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [bookingPurpose, setBookingPurpose] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Available time range
    const START_TIME = 8; // 8 AM
    const END_TIME = 17; // 5 PM

    useEffect(() => {
        if (resourceId && selectedDate) {
            fetchTimeSlots();
        }
    }, [resourceId, selectedDate]);

    const fetchTimeSlots = async () => {
        setLoading(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const data = await bookingService.getAvailableTimeSlots(resourceId, formattedDate);
            setTimeSlots(data.availableSlots || []);
            setBookedSlots(data.bookedSlots || []);
        } catch (error) {
            console.error('Failed to fetch time slots:', error);
            toast.error('Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => {
        const newDate = subDays(selectedDate, 1);
        // Can't book past dates
        if (isBefore(startOfDay(newDate), startOfDay(new Date()))) {
            toast.info('Cannot select past dates');
            return;
        }
        setSelectedDate(newDate);
        setSelectedSlot(null);
        setShowBookingForm(false);
    };

    const handleNextDay = () => {
        setSelectedDate(addDays(selectedDate, 1));
        setSelectedSlot(null);
        setShowBookingForm(false);
    };

    const handleSlotClick = (slot) => {
        if (slot.available) {
            setSelectedSlot(slot);
            setShowBookingForm(true);
        } else {
            toast.info('This time slot is already booked');
        }
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSlot) return;

        setSubmitting(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            await bookingService.createBooking({
                resourceId,
                bookingDate: formattedDate,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                purpose: bookingPurpose,
                expectedAttendees: expectedAttendees ? parseInt(expectedAttendees) : null
            });

            toast.success('Booking request submitted! Waiting for approval.');
            setShowBookingForm(false);
            setSelectedSlot(null);
            setBookingPurpose('');
            setExpectedAttendees('');
            fetchTimeSlots(); // Refresh slots

            if (onBookingCreated) onBookingCreated();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create booking';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const getSlotStatus = (startTime, endTime) => {
        const booked = bookedSlots.find(
            b => b.startTime === startTime && b.endTime === endTime
        );
        if (booked) {
            return booked.status === 'APPROVED' ? 'booked' : 'pending';
        }
        return 'available';
    };

    const getSlotClasses = (startTime, endTime) => {
        const status = getSlotStatus(startTime, endTime);
        const isSelected = selectedSlot &&
            selectedSlot.startTime === startTime &&
            selectedSlot.endTime === endTime;

        if (isSelected) {
            return 'bg-primary text-white ring-2 ring-primary ring-offset-2';
        }
        if (status === 'booked') {
            return 'bg-red-100 text-red-700 cursor-not-allowed border-red-200';
        }
        if (status === 'pending') {
            return 'bg-yellow-100 text-yellow-700 cursor-not-allowed border-yellow-200';
        }
        return 'bg-white hover:bg-primary/10 hover:border-primary cursor-pointer border-gray-200';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-text-primary">Booking Calendar</h3>
                        <p className="text-sm text-text-secondary mt-1">
                            Select a date and time slot for {resourceName}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handlePrevDay}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="text-lg font-semibold text-text-primary min-w-[140px] text-center">
                            {format(selectedDate, 'EEE, MMM d')}
                        </span>
                        <button
                            onClick={handleNextDay}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Time Legend */}
                <div className="flex items-center gap-6 mt-4 pt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                        <span className="text-xs text-text-secondary">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                        <span className="text-xs text-text-secondary">Pending Request</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                        <span className="text-xs text-text-secondary">Booked</span>
                    </div>
                </div>
            </div>

            {/* Time Slots Grid */}
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {timeSlots.map((slot, index) => {
                                const status = getSlotStatus(slot.startTime, slot.endTime);
                                const isAvailable = slot.available;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSlotClick(slot)}
                                        disabled={!isAvailable}
                                        className={`
                                            relative p-4 rounded-xl border transition-all duration-200
                                            ${getSlotClasses(slot.startTime, slot.endTime)}
                                            ${!isAvailable ? 'opacity-60' : 'hover:shadow-md'}
                                        `}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-semibold">
                                                {slot.startTime} - {slot.endTime}
                                            </span>
                                            {status === 'pending' && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    Pending
                                                </span>
                                            )}
                                            {status === 'booked' && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    Booked
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {timeSlots.length === 0 && !loading && (
                            <div className="text-center py-12">
                                <p className="text-text-secondary">No available time slots for this date</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Booking Form Modal */}
            {showBookingForm && selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-text-primary">Confirm Booking</h3>
                            <p className="text-sm text-text-secondary mt-1">
                                {resourceName} • {format(selectedDate, 'MMM d, yyyy')} • {selectedSlot.startTime} - {selectedSlot.endTime}
                            </p>
                        </div>

                        <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    Purpose of Booking
                                </label>
                                <textarea
                                    value={bookingPurpose}
                                    onChange={(e) => setBookingPurpose(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Describe the purpose of your booking..."
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

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBookingForm(false);
                                        setSelectedSlot(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Submit Request'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingCalendar;