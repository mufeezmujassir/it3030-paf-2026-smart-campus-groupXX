// src/components/layout/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, Building, Calendar, Ticket, Settings, LogOut,
    BookOpen, GraduationCap, ClipboardList, Briefcase, Wrench, HardHat, Leaf, X,
    CalendarDays, CheckCircle, Clock, History
} from 'lucide-react';

const Sidebar = ({ isOpen, closeSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const menuItems = {
        ADMIN: [
            { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
            { icon: <Users size={20} />, label: 'User Directory', path: '/admin/users' },
            { icon: <Building size={20} />, label: 'Assets & Labs', path: '/admin/assets' },
            { icon: <Calendar size={20} />, label: 'Schedules', path: '/admin/schedules' },
            { icon: <CalendarDays size={20} />, label: 'Booking Management', path: '/admin/bookings' },
            { icon: <Ticket size={20} />, label: 'Support Tickets', path: '/admin/tickets' },
        ],
        STUDENT: [
            { icon: <LayoutDashboard size={20} />, label: 'My Dashboard', path: '/student' },
            { icon: <Building size={20} />, label: 'Catalogue', path: '/resources' },
            { icon: <CalendarDays size={20} />, label: 'My Bookings', path: '/student/my-bookings' },
            { icon: <BookOpen size={20} />, label: 'My Courses', path: '/student/courses' },
            { icon: <GraduationCap size={20} />, label: 'Grades', path: '/student/grades' },
            { icon: <Ticket size={20} />, label: 'Help Desk', path: '/student/tickets' },
        ],
        STAFF: [
            { icon: <LayoutDashboard size={20} />, label: 'Staff Portal', path: '/staff' },
            { icon: <ClipboardList size={20} />, label: 'Management', path: '/staff/manage' },
            { icon: <CalendarDays size={20} />, label: 'My Bookings', path: '/staff/my-bookings' },
            { icon: <Briefcase size={20} />, label: 'My Department', path: '/staff/department' },
            { icon: <Ticket size={20} />, label: 'Service Requests', path: '/staff/tickets' },
        ],
        TECHNICIAN: [
            { icon: <LayoutDashboard size={20} />, label: 'Tech Console', path: '/technician' },
            { icon: <Wrench size={20} />, label: 'Maintenance', path: '/technician/maintenance' },
            { icon: <CalendarDays size={20} />, label: 'My Bookings', path: '/technician/my-bookings' },
            { icon: <HardHat size={20} />, label: 'Safety Logs', path: '/technician/safety' },
            { icon: <Leaf size={20} />, label: 'Environment', path: '/technician/environment' },
        ]
    };

    const currentRoleMenu = menuItems[user?.role] || [];

    return (
        <aside className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col h-full transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            {/* Header / Branding */}
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-primary">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center rotate-3 border border-primary/5 shadow-sm">
                        <Leaf className="w-6 h-6 -rotate-3" />
                    </div>
                    <div>
                        <span className="text-xl font-black tracking-tight block leading-none">MapleLink</span>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1 block">Operations Hub</span>
                    </div>
                </div>
                {/* Close button for mobile */}
                <button
                    onClick={closeSidebar}
                    className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
                <p className="px-4 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Navigation</p>
                {currentRoleMenu.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => { if(window.innerWidth < 1024) closeSidebar() }}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group ${
                                isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                    : 'text-text-secondary hover:bg-primary/[0.04] hover:text-primary'
                            }`}
                        >
                            <div className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}>
                                {item.icon}
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-6 border-t border-gray-50 space-y-2">
                <p className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">System & Config</p>
                <Link
                    to="/settings"
                    onClick={() => { if(window.innerWidth < 1024) closeSidebar() }}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group ${
                        location.pathname === '/settings'
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'text-text-secondary hover:bg-primary/[0.04] hover:text-primary'
                    }`}
                >
                    <Settings className={`w-5 h-5 transition-colors ${location.pathname === '/settings' ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                    <span>Account Settings</span>
                </Link>
                <button
                    onClick={logout}
                    className="flex w-full items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all group"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                    <span>Logout Hub</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;