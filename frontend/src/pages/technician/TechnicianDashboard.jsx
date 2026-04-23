import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wrench, Ticket, CheckCircle2, AlertCircle, Clock,
    ArrowRight, Bell, Loader2, Award, Zap, HardHat, Calendar
} from 'lucide-react';
import { getAllTickets } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import notificationService from '../../services/notificationService';
import api from '../../services/api';
import { format } from 'date-fns';

const PRIORITY_COLORS = {
    LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const TechnicianDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Incident Tickets (Team member's module)
    const [tickets, setTickets] = useState([]);
    const [ticketStats, setTicketStats] = useState(null);
    const [ticketFilter, setTicketFilter] = useState('ALL');

    // Maintenance Requests (Your module)
    const [maintenanceRequests, setMaintenanceRequests] = useState([]);
    const [maintenanceStats, setMaintenanceStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0
    });

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance' or 'tickets'

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch incident tickets (team member's part)
                const ticketsRes = await getAllTickets();
                const statsRes = await dashboardService.getDashboardStats();

                setTickets(ticketsRes.data || []);
                setTicketStats(statsRes.data);

                // Fetch maintenance requests (your part)
                const maintenanceRes = await api.get('/bookings/my', {
                    params: { size: 100, bookingType: 'MAINTENANCE' }
                });

                const bookings = maintenanceRes.data.content || maintenanceRes.data;
                setMaintenanceRequests(bookings);

                // Calculate maintenance stats
                setMaintenanceStats({
                    total: bookings.length,
                    pending: bookings.filter(b => b.status === 'PENDING').length,
                    approved: bookings.filter(b => b.status === 'APPROVED' && b.maintenanceStatus !== 'IN_PROGRESS' && b.maintenanceStatus !== 'COMPLETED').length,
                    inProgress: bookings.filter(b => b.maintenanceStatus === 'IN_PROGRESS').length,
                    completed: bookings.filter(b => b.maintenanceStatus === 'COMPLETED' || b.status === 'COMPLETED').length,
                    cancelled: bookings.filter(b => b.status === 'CANCELLED' || b.status === 'REJECTED').length
                });

                // Fetch notifications
                const notifyRes = await notificationService.getNotifications({ size: 5 });
                setNotifications(notifyRes.data.content || notifyRes.data);

            } catch (error) {
                console.error('Failed to load technician dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const getMaintenanceStatusBadge = (request) => {
        const status = request.maintenanceStatus || request.status;
        switch(status) {
            case 'PENDING': return { text: 'Pending', className: 'bg-amber-100 text-amber-700' };
            case 'APPROVED': return { text: 'Approved', className: 'bg-emerald-100 text-emerald-700' };
            case 'IN_PROGRESS': return { text: 'In Progress', className: 'bg-blue-100 text-blue-700' };
            case 'COMPLETED': return { text: 'Completed', className: 'bg-green-100 text-green-700' };
            case 'CANCELLED': return { text: 'Cancelled', className: 'bg-gray-100 text-gray-600' };
            default: return { text: status, className: 'bg-gray-100 text-gray-600' };
        }
    };

    function statusMap(f) {
        if (f === 'IN_PROGRESS') return 'IN_PROGRESS';
        return f;
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Maintenance Command Center Header */}
            <div className="bg-text-primary p-8 sm:p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.25em] border border-white/10">
                            <HardHat className="w-4 h-4 mr-2 text-secondary" />
                            Operations Command Center
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                            Field Ops: <br />
                            <span className="text-secondary">{user?.fullName?.split(' ')[0] || 'Technician'}</span>
                        </h1>
                        <p className="text-white/60 max-w-sm text-sm font-medium leading-relaxed">
                            Campus infrastructure maintenance hub. Manage maintenance requests and incident tickets.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-text-primary shadow-lg shadow-secondary/20">
                                <Zap size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black tracking-tighter">{maintenanceStats.total + (ticketStats?.totalAssignedTickets || 0)}</p>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Total Tasks</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-secondary/5 to-transparent"></div>
            </div>

            {/* Combined Stats - Both Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <TechStatCard
                    title="Maintenance Requests"
                    value={maintenanceStats.total}
                    icon={<Wrench className="w-5 h-5" />}
                    color="primary"
                />
                <TechStatCard
                    title="Maintenance In Progress"
                    value={maintenanceStats.inProgress}
                    icon={<Clock className="w-5 h-5" />}
                    color="blue"
                />
                <TechStatCard
                    title="Assigned Tickets"
                    value={ticketStats?.totalAssignedTickets || 0}
                    icon={<Ticket className="w-5 h-5" />}
                    color="amber"
                />
                <TechStatCard
                    title="Tickets In Progress"
                    value={ticketStats?.assignedTicketsInProgress || 0}
                    icon={<AlertCircle className="w-5 h-5" />}
                    color="orange"
                />
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`px-6 py-3 text-sm font-bold transition-all ${
                        activeTab === 'maintenance'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-text-secondary hover:text-primary'
                    }`}
                >
                    <Wrench className="w-4 h-4 inline mr-2" />
                    Maintenance Requests ({maintenanceStats.total})
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`px-6 py-3 text-sm font-bold transition-all ${
                        activeTab === 'tickets'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-text-secondary hover:text-primary'
                    }`}
                >
                    <Ticket className="w-4 h-4 inline mr-2" />
                    Assigned Tickets ({ticketStats?.totalAssignedTickets || 0})
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content Area - Changes based on active tab */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'maintenance' ? (
                        // MAINTENANCE REQUESTS SECTION (YOUR MODULE)
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-2xl font-black text-text-primary tracking-tighter">Maintenance Queue</h2>
                                <button
                                    onClick={() => navigate('/technician/maintenance')}
                                    className="text-sm font-bold text-primary hover:underline"
                                >
                                    View All →
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {maintenanceRequests.length > 0 ? (
                                    maintenanceRequests.slice(0, 5).map(request => {
                                        const statusBadge = getMaintenanceStatusBadge(request);
                                        return (
                                            <div
                                                key={request.id}
                                                onClick={() => navigate('/technician/maintenance')}
                                                className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusBadge.className}`}>
                                                            {statusBadge.text}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 italic">#{request.id.slice(0,8)}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-text-primary leading-tight group-hover:text-primary transition-colors">{request.resourceName}</h3>
                                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter mt-1">
                                                            📍 {request.bookingDate} • {request.startTime} - {request.endTime}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                        <div className="flex items-center space-x-2">
                                                            <Calendar className="w-3 h-3 text-text-secondary" />
                                                            <span className="text-[10px] font-bold text-text-secondary uppercase">
                                                                {request.purpose?.substring(0, 50) || 'Maintenance request'}
                                                            </span>
                                                        </div>
                                                        <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition" />
                                                    </div>
                                                </div>
                                                {request.maintenanceStatus === 'IN_PROGRESS' && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-bl-full animate-pulse"></div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 text-center bg-surface/50 rounded-[2rem] border border-dashed border-gray-200">
                                        <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-text-secondary opacity-50">No maintenance requests</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // INCIDENT TICKETS SECTION (TEAM MEMBER'S MODULE)
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-2xl font-black text-text-primary tracking-tighter">Active Missions</h2>
                                <div className="flex p-1 bg-surface rounded-2xl border border-gray-100 w-fit">
                                    {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setTicketFilter(s)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                ticketFilter === s
                                                    ? 'bg-primary text-white'
                                                    : 'text-text-secondary hover:text-primary'
                                            }`}
                                        >
                                            {s.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {tickets.length > 0 ?
                                    (ticketFilter === 'ALL' ? tickets : tickets.filter(t => t.status === ticketFilter))
                                        .slice(0, 5).map(ticket => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                        className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${PRIORITY_COLORS[ticket.priority]?.bg} ${PRIORITY_COLORS[ticket.priority]?.text} ${PRIORITY_COLORS[ticket.priority]?.border}`}>
                                                    {ticket.priority}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 italic">#{ticket.id?.slice(0,8)}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-text-primary leading-tight group-hover:text-primary transition-colors">{ticket.title}</h3>
                                                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter mt-1">📍 {ticket.resourceLocation}</p>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center text-[10px] font-bold text-text-secondary">
                                                        {ticket.createdByName?.charAt(0)}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-text-secondary uppercase">{ticket.createdByName}</span>
                                                </div>
                                                <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition" />
                                            </div>
                                        </div>
                                        {['ASSIGNED', 'IN_PROGRESS'].includes(ticket.status) && (
                                            <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-bl-full animate-pulse"></div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="py-12 text-center bg-surface/50 rounded-[2rem] border border-dashed border-gray-200">
                                        <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-text-secondary opacity-50">No assigned tickets</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Sidebar - Notifications & Guidelines (unchanged) */}
                <div className="space-y-8">
                    {/* Activity Feed */}
                    <section className="space-y-6">
                        <h3 className="text-xl font-black text-text-primary tracking-tight">Ops Comms</h3>
                        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
                            {notifications.length > 0 ? notifications.map(n => (
                                <div key={n.id} className="p-5 flex items-start space-x-4 border-b border-gray-50 last:border-0 hover:bg-surface/50 transition-colors">
                                    <div className="p-2 bg-primary/5 text-primary rounded-xl">
                                        <Bell size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-text-primary leading-tight">{n.title}</p>
                                        <p className="text-[10px] text-text-secondary mt-1">{n.message}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-10 text-center italic text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    No incoming transmissions
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Guidelines Card */}
                    <section className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 space-y-4">
                        <div className="inline-flex p-3 bg-white rounded-2xl text-primary shadow-sm">
                            <AlertCircle size={20} />
                        </div>
                        <h4 className="text-sm font-black text-text-primary">Technician Protocols</h4>
                        <ul className="space-y-3">
                            {[
                                "Update status strictly upon arrival",
                                "Document resolutions with digital logs",
                                "Escalate hardware failure to Admin",
                                "Start maintenance only within scheduled time window"
                            ].map((p, i) => (
                                <li key={i} className="flex items-start space-x-2 text-[10px] font-bold text-text-secondary leading-normal">
                                    <span className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                                    <span>{p}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

const TechStatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        primary: 'bg-primary/10 text-primary'
    };

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:border-primary/20 transition-all hover:shadow-lg">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
                <p className="text-3xl font-black text-text-primary tracking-tighter">{value || '0'}</p>
            </div>
            <div className={`p-4 rounded-2xl ${colorClasses[color] || colorClasses.primary}`}>
                {icon}
            </div>
        </div>
    );
};

export default TechnicianDashboard;