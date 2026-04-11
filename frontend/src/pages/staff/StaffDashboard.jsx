import { useState, useEffect } from 'react';
import { 
    Briefcase, Calendar, Ticket, Bell, ArrowRight, CheckCircle2, 
    Clock, AlertCircle, Loader2, Award, Zap 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import notificationService from '../../services/notificationService';

const StaffDashboard = () => {
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
                console.error('Failed to fetch staff dashboard data:', error);
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
            {/* Professional Header */}
            <div className="bg-white border border-gray-100 p-8 sm:p-12 rounded-[3rem] shadow-sm relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center px-4 py-1.5 bg-primary/5 rounded-full text-[10px] font-black uppercase tracking-widest text-primary border border-primary/10">
                            <Briefcase className="w-3 h-3 mr-2" />
                            {stats?.department || 'Academic Division'}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary">
                            Good morning, <br />
                            <span className="text-primary">{user?.fullName || 'Colleague'}</span>
                        </h1>
                        <p className="text-sm text-text-secondary max-w-lg font-medium leading-relaxed">
                            Monitor your departmental resource allocations and technical requests. Ensure smooth campus operations for your faculty and students.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link to="/resources" className="flex items-center justify-center space-x-2 px-8 py-4 bg-text-primary text-white rounded-2xl text-sm font-black hover:bg-primary transition-all shadow-xl hover:-translate-y-1">
                            <Calendar size={18} />
                            <span>Facility Booking</span>
                        </Link>
                        <Link to="/tickets" className="flex items-center justify-center space-x-2 px-8 py-4 bg-white border-2 border-gray-100 text-text-primary rounded-2xl text-sm font-black hover:border-primary transition-all">
                            <Ticket size={18} />
                            <span>Service Center</span>
                        </Link>
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 -skew-x-12 translate-x-32 group-hover:translate-x-28 transition-transform duration-1000"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard 
                    title="Active Bookings" 
                    value={stats?.myApprovedBookings} 
                    subvalue={stats?.myPendingBookings}
                    subtitle="Pending Approval"
                    icon={<Calendar className="w-6 h-6" />}
                    trend="Operational Efficiency High"
                />
                <MetricCard 
                    title="Faculty Tickets" 
                    value={stats?.myTickets} 
                    subvalue="0"
                    subtitle="Urgent Attention"
                    icon={<Ticket className="w-6 h-6" />}
                    trend="All Systems Normal"
                    color="rose"
                />
                <div className="bg-gradient-to-br from-secondary to-accent p-8 rounded-[2rem] text-white flex flex-col justify-between shadow-xl shadow-secondary/20">
                    <div className="flex items-center justify-between">
                        <Award className="w-8 h-8 opacity-50" />
                        <Zap className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter">Premium</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Staff Access Tier</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Activity Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Departmental Activity</h2>
                        <Link to="/notifications" className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center hover:opacity-70 transition-opacity">
                            Audit Logs <ArrowRight size={14} className="ml-2" />
                        </Link>
                    </div>
                    
                    <div className="space-y-4">
                        {notifications.length > 0 ? notifications.map((n) => (
                            <div key={n.id} className="p-6 bg-white border border-gray-50 rounded-3xl hover:border-primary/20 transition-all flex items-center justify-between group">
                                <div className="flex items-center space-x-5">
                                    <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-primary border border-gray-100 shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-text-primary text-sm">{n.title}</p>
                                        <p className="text-xs text-text-secondary font-medium mt-0.5">{n.message}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        )) : (
                            <div className="p-16 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                                <p className="text-sm font-bold text-text-secondary tracking-tight italic">No recent system alerts or activity.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resource Explorer */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-text-primary tracking-tight">Resource Explorer</h2>
                    <div className="bg-surface p-8 rounded-[2rem] border border-gray-100 text-center space-y-6">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-lg border border-gray-100 flex items-center justify-center mx-auto text-primary">
                            <Award size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="font-black text-text-primary">Ready to Book?</p>
                            <p className="text-xs text-text-secondary font-medium">Browse our state-of-the-art facilities and secure your space today.</p>
                        </div>
                        <Link to="/resources" className="block w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">
                            Browse Catalogue
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subvalue, subtitle, icon, trend, color = 'primary' }) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 hover:shadow-xl hover:shadow-primary/5 transition-all">
        <div className="flex items-center justify-between">
            <div className={`p-4 rounded-2xl bg-${color}/5 text-${color}`}>
                {icon}
            </div>
            <div className="flex items-center text-[10px] font-black text-emerald-500 uppercase tracking-tight">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                {trend}
            </div>
        </div>
        <div className="flex items-baseline space-x-3">
            <span className="text-5xl font-black tracking-tighter text-text-primary">{value || '0'}</span>
            <div className="border-l border-gray-100 pl-3">
                <p className="text-xs font-black text-primary leading-none">{subvalue || '0'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{subtitle}</p>
            </div>
        </div>
        <p className="text-[10px] font-black text-gray-300 uppercase underline decoration-gray-100 underline-offset-8 tracking-[0.2em]">{title}</p>
    </div>
);

export default StaffDashboard;
