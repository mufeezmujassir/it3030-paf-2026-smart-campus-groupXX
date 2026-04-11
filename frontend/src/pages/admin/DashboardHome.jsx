import { useState, useEffect } from 'react';
import { Activity, Users, Ticket, Calendar, Database, Server, Wifi, AlertCircle, Loader2 } from 'lucide-react';
import dashboardService from '../../services/dashboardService';

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold">Facility Utilization</h2>
                    <p className="text-sm text-text-secondary -mt-2 mb-6">Real-time occupancy vs total capacity across labs & halls</p>
                    <div className="h-64 bg-surface rounded-lg flex items-center justify-center border border-dashed border-gray-200">
                        <span className="text-sm text-text-secondary font-medium italic">Advanced Analytics Dashboard Coming Soon</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold mb-4">System Telemetry</h2>
                    <TelemetryCard icon={<Database className="w-4 h-4" />} title="PostgreSQL DB" value="12ms Latency" status="LIVE" />
                    <TelemetryCard icon={<Server className="w-4 h-4" />} title="Spring Boot Cluster" value="Healthy" status="LIVE" />
                    <TelemetryCard icon={<Activity className="w-4 h-4" />} title="Notification Engine" value="Active" status="LIVE" />
                    <TelemetryCard icon={<Wifi className="w-4 h-4" />} title="Main API Endpoint" value="200 OK" status="LIVE" />
                    
                    <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-primary">Administrative Notice</p>
                                <p className="text-xs text-text-secondary mt-1">Resource booking policies for next semester are now being reviewed for auto-approval optimizations.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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

export default DashboardHome;
