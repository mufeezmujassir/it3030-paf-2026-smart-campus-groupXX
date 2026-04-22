import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Ticket, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { getAllTickets } from '../../services/ticketService';
import SLATimer from '../../components/SLATimer';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#880d1e', '#2563eb', '#16a34a', '#d97706'];

const DashboardHome = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await dashboardService.getDashboardStats();
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    const userDistData = stats?.userDistribution ? Object.entries(stats.userDistribution).map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Campus Users"
                    value={stats?.totalUsers?.toLocaleString() || '0'}
                    change="Registered institutional accounts"
                    icon={<Users className="w-5 h-5 text-blue-500" />}
                />
                <StatCard
                    title="Active Tickets"
                    value={stats?.activeTickets || '0'}
                    change="Open or in-progress tickets"
                    icon={<Ticket className="w-5 h-5 text-red-500" />}
                />
                <StatCard
                    title="Pending Bookings"
                    value={stats?.pendingBookings || '0'}
                    change="Awaiting administrative review"
                    icon={<Calendar className="w-5 h-5 text-green-500" />}
                />
                <StatCard
                    title="Total Resources"
                    value={stats?.totalResources || '0'}
                    change="Campus facilities & hardware"
                    icon={<Activity className="w-5 h-5 text-purple-500" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-full text-left mb-8">
                        <h2 className="text-2xl font-black text-text-primary leading-tight">User Demographics</h2>
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Global Role Distribution Overview</p>
                    </div>

                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={userDistData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationBegin={200}
                                    animationDuration={1500}
                                >
                                    {userDistData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-text-primary">{stats?.totalUsers || 0}</span>
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-tighter">Total Active Users</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                        {userDistData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl border border-transparent hover:border-primary/10 transition-colors">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter">{entry.name}</span>
                                    <span className="text-sm font-black text-text-primary">{entry.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
            {/* SLA Breach Alerts */}
            <SLABreachPanel />
        </div>
    );
};

const StatCard = ({ title, value, change, icon }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">{title}</p>
            <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-primary/5 transition-colors">{icon}</div>
        </div>
        <h3 className="text-3xl font-black mb-1">{value}</h3>
        <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{change}</p>
        </div>
    </div>
)

const TelemetryCard = ({ icon, title, value, status }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-primary/10 transition-all">
        <div className="flex items-center space-x-3">
            <div className="text-primary/60">{icon}</div>
            <p className="text-sm font-semibold text-text-primary">{title}</p>
        </div>
        <div className="text-right">
            <p className="text-sm font-black text-text-secondary">{value}</p>
            <p className="text-[9px] font-black text-emerald-500 tracking-widest uppercase flex items-center justify-end">
                <span className="w-1 h-1 bg-emerald-500 rounded-full mr-1"></span>
                {status}
            </p>
        </div>
    </div>
)

const SLABreachPanel = () => {
    const [breachedTickets, setBreachedTickets] = useState([]);
    const [warningTickets, setWarningTickets] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        getAllTickets().then(res => {
            const active = res.data.filter(t =>
                !['CLOSED', 'RESOLVED', 'REJECTED'].includes(t.status) && t.slaDeadline
            );
            const now = new Date();
            const breached = active.filter(t => new Date(t.slaDeadline) < now);
            const warning = active.filter(t => {
                const diff = new Date(t.slaDeadline) - now;
                return diff > 0 && diff < 2 * 60 * 60 * 1000; // under 2 hours
            });
            setBreachedTickets(breached);
            setWarningTickets(warning);
        }).catch(console.error);
    }, []);

    if (breachedTickets.length === 0 && warningTickets.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    ⏱ SLA Monitor
                </h2>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="text-2xl">✅</span>
                    <div>
                        <p className="text-sm font-bold text-green-700">All tickets within SLA</p>
                        <p className="text-xs text-green-600">No breaches or warnings at this time</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                ⏱ SLA Monitor
                {breachedTickets.length > 0 && (
                    <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-600 rounded-full animate-pulse">
                        {breachedTickets.length} BREACHED
                    </span>
                )}
                {warningTickets.length > 0 && (
                    <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                        {warningTickets.length} WARNING
                    </span>
                )}
            </h2>

            {breachedTickets.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">
                        🔴 Breached ({breachedTickets.length})
                    </p>
                    <div className="space-y-2">
                        {breachedTickets.map(ticket => (
                            <div key={ticket.id}
                                 onClick={() => navigate(`/tickets/${ticket.id}`)}
                                 className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:shadow-sm transition">
                                <div>
                                    <p className="text-sm font-semibold text-red-800">
                                        {ticket.title}
                                    </p>
                                    <p className="text-xs text-red-600">
                                        📍 {ticket.resourceLocation} • {ticket.priority}
                                    </p>
                                </div>
                                <SLATimer
                                    slaDeadline={ticket.slaDeadline}
                                    status={ticket.status}
                                    compact={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {warningTickets.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">
                        🟠 Expiring Soon ({warningTickets.length})
                    </p>
                    <div className="space-y-2">
                        {warningTickets.map(ticket => (
                            <div key={ticket.id}
                                 onClick={() => navigate(`/tickets/${ticket.id}`)}
                                 className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100 cursor-pointer hover:shadow-sm transition">
                                <div>
                                    <p className="text-sm font-semibold text-orange-800">
                                        {ticket.title}
                                    </p>
                                    <p className="text-xs text-orange-600">
                                        📍 {ticket.resourceLocation} • {ticket.priority}
                                    </p>
                                </div>
                                <SLATimer
                                    slaDeadline={ticket.slaDeadline}
                                    status={ticket.status}
                                    compact={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
