import { useState, useEffect } from 'react';
import { 
    Calendar, Ticket, Bell, ArrowRight, CheckCircle2, 
    Clock, AlertCircle, Loader2, Sparkles, LayoutDashboard 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import notificationService from '../../services/notificationService';

const StudentDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, notifyRes] = await Promise.all([
                    dashboardService.getDashboardStats(),
                    notificationService.getNotifications({ size: 5 })
                ]);
                setStats(statsRes.data);
                setNotifications(notifyRes.data.content || notifyRes.data);
            } catch (error) {
                console.error('Failed to fetch student dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
            {/* Greeting */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-accent p-8 sm:p-12 rounded-[2.5rem] text-white shadow-2xl shadow-primary/20">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/20">
                            <Sparkles className="w-3 h-3 mr-2 text-secondary" />
                            Academic Session Active
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                            Welcome back, <br />
                            <span className="text-secondary">{user?.fullName?.split(' ')[0] || 'Scholar'}!</span>
                        </h1>
                        <p className="text-white/80 max-w-md text-sm sm:text-base font-medium leading-relaxed">
                            Your campus ecosystem overview. Manage your resource bookings and technical support tickets in one place.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/resources" className="flex items-center space-x-2 px-6 py-3.5 bg-white text-primary rounded-2xl text-sm font-black hover:bg-secondary hover:text-white transition-all hover:scale-105 shadow-xl">
                            <Calendar size={18} />
                            <span>Book Resource</span>
                        </Link>
                        <Link to="/tickets/create" className="flex items-center space-x-2 px-6 py-3.5 bg-primary-hover text-white rounded-2xl text-sm font-black border border-white/10 hover:bg-white/10 transition-all">
                            <Ticket size={18} />
                            <span>New Ticket</span>
                        </Link>
                    </div>
                </div>
                {/* Abstract Orbs */}
                <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-20%] left-[10%] w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MiniStatCard 
                    title="Awaiting Review" 
                    value={stats?.myPendingBookings} 
                    icon={<Clock className="w-5 h-5 text-amber-500" />} 
                    color="amber"
                />
                <MiniStatCard 
                    title="Confimed Bookings" 
                    value={stats?.myApprovedBookings} 
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} 
                    color="emerald"
                />
                <MiniStatCard 
                    title="Support Tickets" 
                    value={stats?.myTickets} 
                    icon={<AlertCircle className="w-5 h-5 text-rose-500" />} 
                    color="rose"
                />
                <MiniStatCard 
                    title="Total History" 
                    value={stats?.myTotalBookings} 
                    icon={<LayoutDashboard className="w-5 h-5 text-primary" />} 
                    color="primary"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Notifications & Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Recent Activity</h2>
                        <Link to="/notifications" className="text-xs font-black text-primary uppercase tracking-widest hover:underline">View All</Link>
                    </div>
                    
                    <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((n) => (
                                    <div key={n.id} className="p-6 flex items-start space-x-4 hover:bg-surface/50 transition-colors group">
                                        <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <Bell size={18} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold text-text-primary leading-none">{n.title}</p>
                                            <p className="text-xs text-text-secondary line-clamp-1">{n.message}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{new Date(n.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight size={14} className="text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                    <Bell className="text-gray-300" size={32} />
                                </div>
                                <p className="text-sm font-bold text-text-secondary">No recent activity detected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-text-primary tracking-tight">Quick Shortcuts</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <ShortcutLink 
                            to="/resources" 
                            title="Resource Catalogue" 
                            desc="View all available labs and halls"
                            icon={<Calendar size={20} />}
                        />
                        <ShortcutLink 
                            to="/bookings" 
                            title="My Reservations" 
                            desc="Manage and track your bookings"
                            icon={<Clock size={20} />}
                        />
                        <ShortcutLink 
                            to="/tickets" 
                            title="Help Desk Hub" 
                            desc="Check your active support tickets"
                            icon={<AlertCircle size={20} />}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const MiniStatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-5 hover:border-primary/20 transition-all hover:shadow-md">
        <div className={`p-3 rounded-2xl bg-${color}-500/10`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black text-gray-400 underline decoration-gray-200 decoration-2 underline-offset-4 uppercase tracking-[0.1em] mb-1">{title}</p>
            <p className="text-2xl font-black text-text-primary tracking-tighter">{value || '0'}</p>
        </div>
    </div>
);

const ShortcutLink = ({ to, title, desc, icon }) => (
    <Link to={to} className="group p-5 bg-white border border-gray-100 rounded-[1.5rem] flex items-center justify-between hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all">
        <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/5 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                {icon}
            </div>
            <div>
                <p className="text-sm font-black text-text-primary">{title}</p>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">{desc}</p>
            </div>
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
);

export default StudentDashboard;
