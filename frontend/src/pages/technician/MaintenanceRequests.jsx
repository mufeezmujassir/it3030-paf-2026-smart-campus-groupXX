// src/pages/technician/MaintenanceRequests.jsx
import React, { useState, useEffect } from 'react';
import { Wrench, AlertCircle, Calendar, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const MaintenanceRequests = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMaintenanceBookings();
    }, []);

    const fetchMaintenanceBookings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/bookings/my', {
                params: { bookingType: 'MAINTENANCE' }
            });
            setBookings(response.data.content || response.data);
        } catch (error) {
            console.error('Failed to fetch maintenance requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'CRITICAL': return 'bg-red-100 text-red-700';
            case 'HIGH': return 'bg-orange-100 text-orange-700';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-green-100 text-green-700';
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700';
            case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
            case 'REJECTED': return 'bg-rose-100 text-rose-700';
            case 'CANCELLED': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-primary/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Wrench className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-text-primary">My Maintenance Requests</h1>
                                <p className="text-sm text-text-secondary mt-0.5">
                                    Track and manage your maintenance requests
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="text-center py-16">
                                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-text-secondary">No maintenance requests found</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Go to Resource Catalogue and select "Maintenance Request" when booking
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bookings.map((booking) => (
                                    <div key={booking.id} className="border rounded-xl p-4 hover:shadow-md transition">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-bold">{booking.resourceName}</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(booking.priority)}`}>
                                                        {booking.priority}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-gray-600 mb-3">{booking.issueDescription}</p>

                                                <div className="flex gap-4 text-sm text-gray-500">
                                                    <span>📅 {format(new Date(booking.bookingDate), 'EEEE, MMM d, yyyy')}</span>
                                                    <span>⏰ {booking.startTime} - {booking.endTime}</span>
                                                </div>

                                                {booking.adminReason && (
                                                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                                                        <p className="text-xs font-semibold">Admin Response:</p>
                                                        <p className="text-sm">{booking.adminReason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceRequests;