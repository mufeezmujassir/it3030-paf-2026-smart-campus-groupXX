import { Activity, Users, Ticket, Calendar, Database, Server, Wifi, AlertCircle } from 'lucide-react';

const DashboardHome = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Campus Users" value="12,482" change="+12% from last month" icon={<Users className="w-5 h-5 text-blue-500" />} />
                <StatCard title="Active Tickets" value="42" change="5 urgent priority" icon={<Ticket className="w-5 h-5 text-red-500" />} />
                <StatCard title="Resource Requests" value="18" change="pending approval" icon={<Calendar className="w-5 h-5 text-green-500" />} />
                <StatCard title="System Uptime" value="99.98%" change="+0.01% last 30 days" icon={<Activity className="w-5 h-5 text-purple-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold">Facility Utilization</h2>
                    <p className="text-sm text-text-secondary -mt-2 mb-6">Real-time occupancy vs total capacity across labs & halls</p>
                    <div className="h-64 bg-orange-50/30 rounded-lg flex items-center justify-center border border-dashed border-orange-200">
                        <span className="text-sm text-orange-400 font-medium">Chart Visualization Placeholder</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-bold mb-4">System Telemetry</h2>
                    <TelemetryCard icon={<Database />} title="PostgreSQL DB" value="12ms Latency" status="LIVE" />
                    <TelemetryCard icon={<Server />} title="Redis Cache" value="Hit Rate 98.4%" status="LIVE" />
                    <TelemetryCard icon={<Activity />} title="Main API Cluster" value="14% Load" status="LIVE" />
                    <TelemetryCard icon={<Wifi />} title="Auth / Google SSO" value="Operational" status="LIVE" />
                    
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-primary">Maintenance Window</p>
                                <p className="text-xs text-text-secondary mt-1">Scheduled maintenance for 'Lab Management' module on Oct 24th, 02:00 AM UTC.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, change, icon }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all">
        <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-primary/5 transition-colors">{icon}</div>
        </div>
        <h3 className="text-3xl font-bold mb-1">{value}</h3>
        <p className="text-xs font-medium text-gray-500">{change}</p>
    </div>
)

const TelemetryCard = ({ icon, title, value, status }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3">
            <div className="text-gray-400">{icon}</div>
            <p className="text-sm font-medium">{title}</p>
        </div>
        <div className="text-right">
            <p className="text-sm font-bold">{value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{status}</p>
        </div>
    </div>
)

export default DashboardHome;
