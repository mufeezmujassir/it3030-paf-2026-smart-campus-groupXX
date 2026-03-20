import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
    LayoutDashboard, Users, Building, Calendar, Ticket, Settings, LogOut,
    Search, Bell, Activity, Plus, X, UserPlus
} from 'lucide-react';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    
    // Add User Modal State
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'STUDENT',
        department: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/users', {
                fullName: `${newUserData.firstName} ${newUserData.lastName}`,
                email: newUserData.email,
                role: newUserData.role,
                department: newUserData.department
            });
            toast.success('User created successfully. Invitation sent.');
            setIsAddUserModalOpen(false);
            setNewUserData({ firstName: '', lastName: '', email: '', role: 'STUDENT', department: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex font-sans text-text-primary">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 flex flex-col hidden md:flex">
                <div className="p-6 flex items-center space-x-2 text-primary">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-lg">M</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">MapleLink</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <NavItem to="/admin" icon={<LayoutDashboard />} label="Dashboard" active={location.pathname === '/admin'} />
                    <NavItem to="/admin/users" icon={<Users />} label="Users" active={location.pathname === '/admin/users'} />
                    <NavItem to="/admin/facilities" icon={<Building />} label="Facilities" />
                    <NavItem to="/admin/allocations" icon={<Calendar />} label="Allocations" />
                    <NavItem to="/admin/tickets" icon={<Ticket />} label="Tickets" />
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-1">
                    <Link to="/settings" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-text-secondary hover:bg-gray-50 hover:text-text-primary">
                        <div className="text-gray-400"><Settings className="w-5 h-5" /></div>
                        <span>Settings</span>
                    </Link>
                    <button 
                        onClick={logout}
                        className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Search resources..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                        <button className="text-gray-400 hover:text-gray-600 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                        
                        <Link to="/settings" className="flex items-center space-x-3 border-l border-gray-200 pl-6 cursor-pointer hover:opacity-80 transition">
                            <div className="text-right hidden sm:block text-text-primary">
                                <p className="text-sm font-semibold">{user?.fullName || user?.email || 'Admin User'}</p>
                                <p className="text-xs text-text-secondary">{user?.role || 'Admin'}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                                {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Sub-navigation Headers (Title + Buttons) */}
                <div className="px-8 pt-8 flex items-center justify-between shrink-0">
                    <div>
                        {location.pathname === '/admin' && (
                            <>
                                <h1 className="text-3xl font-bold tracking-tight mb-1">Admin Dashboard</h1>
                                <p className="text-text-secondary">Welcome back. Here's what's happening across the campus today.</p>
                            </>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button className="px-4 py-2 bg-white border border-gray-200 text-text-primary rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center">
                            <Activity className="w-4 h-4 mr-2" /> System Logs
                        </button>
                        <button onClick={() => setIsAddUserModalOpen(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover flex items-center shadow-sm">
                            <Plus className="w-4 h-4 mr-2" /> Add New User
                        </button>
                    </div>
                </div>

                {/* Dashboard Scrollable Area - Content changes based on route */}
                <div className="flex-1 overflow-auto p-8">
                   <Outlet />
                </div>
            </main>

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary">Register New User</h2>
                                    <p className="text-sm text-text-secondary mt-0.5">Create a new institutional account for staff or students.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateUser} className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary">First Name</label>
                                    <input required type="text" value={newUserData.firstName} onChange={e => setNewUserData({...newUserData, firstName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary">Last Name</label>
                                    <input required type="text" value={newUserData.lastName} onChange={e => setNewUserData({...newUserData, lastName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-4">
                                <label className="text-sm font-medium text-text-primary">Institutional Email</label>
                                <div className="relative">
                                    <input required type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="j.doe@maplelink.edu" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary">Assigned Role</label>
                                    <select required value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white">
                                        <option value="STUDENT">Student</option>
                                        <option value="STAFF">Staff</option>
                                        <option value="TECHNICIAN">Technician</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-text-primary">Department</label>
                                    <input type="text" value={newUserData.department} onChange={e => setNewUserData({...newUserData, department: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                            </div>

                            <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex items-start space-x-3 mb-6">
                                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-text-primary">Security Note</h4>
                                    <p className="text-xs text-text-secondary mt-1">The user will receive an automated invitation email to set their initial password and complete 2FA setup as per institutional policy.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm transition disabled:opacity-50">
                                    {isSubmitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavItem = ({ to, icon, label, active }) => (
    <Link to={to} className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'}`}>
        <div className={active ? 'text-primary' : 'text-gray-400'}>{icon}</div>
        <span>{label}</span>
    </Link>
)

const StatCard = ({ title, value, change, icon }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        </div>
        <h3 className="text-3xl font-bold mb-1">{value}</h3>
        <p className="text-xs font-medium text-gray-500">{change}</p>
    </div>
)

const TelemetryCard = ({ icon, title, value, status }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
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

export default AdminDashboard;
