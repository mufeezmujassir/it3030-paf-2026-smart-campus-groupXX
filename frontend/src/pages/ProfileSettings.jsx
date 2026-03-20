import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MonitorSmartphone, Plus, LayoutDashboard, User, Ticket, Settings, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const ProfileSettings = () => {
    const { user, logout, loginFromRedirect } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [department, setDepartment] = useState('');
    const [studentId, setStudentId] = useState('');
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/me');
            setProfileData(response.data);
            
            // Split full name safely
            const nameParts = (response.data.fullName || '').split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
            
            setDepartment(response.data.department || '');
            setStudentId(response.data.studentId || '');
            setLoading(false);
        } catch (error) {
            toast.error('Failed to load profile data');
            setLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        try {
            const response = await api.put('/users/me/profile', {
                firstName,
                lastName,
                department,
                studentId
            });
            setProfileData(response.data);
            
            // Sync context if name changed
            loginFromRedirect({
                ...user,
                fullName: response.data.fullName,
                role: response.data.role
            });

            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        }
    };

    const handlePasswordUpdate = async () => {
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            await api.put('/users/me/password', {
                currentPassword,
                newPassword
            });
            toast.success('Password updated safely');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update password');
        }
    };

    const toggleMFA = async () => {
        try {
            const response = await api.post('/users/me/mfa/toggle');
            setProfileData(response.data);
            toast.success(`MFA has been ${response.data.twoFactorEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            toast.error('Failed to toggle MFA status');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface flex font-sans text-text-primary">
            
            {/* Sidebar Mockup based on Screenshot */}
            <aside className="w-64 bg-white border-r border-gray-100 flex flex-col hidden md:flex">
                <div className="p-6 flex items-center space-x-2 text-primary">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-lg">C</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">CampusLink</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <NavItem icon={<LayoutDashboard />} label="Dashboard" />
                    <NavItem icon={<Ticket />} label="My Tickets" />
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-1">
                    <NavItem icon={<Settings />} label="Settings" active />
                    <button onClick={logout} className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-end px-8">
                    <div className="flex items-center space-x-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold">{profileData?.fullName}</p>
                            <p className="text-xs text-text-secondary">{profileData?.role?.toLowerCase()}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                            {profileData?.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8 lg:px-12">
                    <div className="max-w-5xl mx-auto space-y-8">
                        
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-1">Account Settings</h1>
                            <p className="text-text-secondary">Manage your profile details, security preferences, and active sessions.</p>
                        </div>

                        {/* Banner Profile Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="h-32 bg-orange-100 w-full relative"></div>
                            <div className="px-8 pb-8 relative">
                                <div className="absolute -top-12 flex space-x-4 items-end">
                                    <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-3xl shadow-sm">
                                        {profileData?.fullName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="pb-2">
                                        <div className="flex items-center space-x-3">
                                            <h2 className="text-2xl font-bold">{profileData?.fullName}</h2>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md border border-gray-200 uppercase">
                                                {profileData?.role}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-text-secondary mt-1 space-x-2">
                                            <span>{profileData?.email}</span>
                                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded shadow-sm border border-green-200 flex items-center">
                                                VERIFIED
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center text-text-primary shadow-sm">
                                        <Settings className="w-4 h-4 mr-2" /> View Audit Log
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Left Column (Profile Info & Sessions) */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                {/* Profile Information */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative pt-12">
                                    <div className="absolute top-0 left-6 -translate-y-1/2 w-10 h-10 bg-orange-50 rounded-lg border border-orange-100 flex items-center justify-center shadow-sm">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-bold">Profile Information</h3>
                                    <p className="text-sm text-text-secondary mb-6">Update your personal details and how others see you.</p>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">First Name</label>
                                            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">Last Name</label>
                                            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-4">
                                        <label className="text-xs font-medium text-text-secondary">Email Address</label>
                                        <input type="email" disabled value={profileData?.email || ''} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
                                        <p className="text-[11px] text-gray-400 mt-1">Primary university email cannot be changed.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">Department</label>
                                            <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">Student/Staff ID</label>
                                            <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. CS-2024-9981" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                        <button onClick={fetchProfile} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition">Cancel</button>
                                        <button onClick={handleProfileUpdate} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm transition">Save Changes</button>
                                    </div>
                                </div>

                                {/* Active Sessions Mockup */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative pt-12">
                                     <div className="absolute top-0 left-6 -translate-y-1/2 w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                                        <MonitorSmartphone className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold">Active Sessions</h3>
                                            <p className="text-sm text-text-secondary">Monitor and manage your active login sessions.</p>
                                        </div>
                                        <button className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium rounded-md hover:bg-gray-50 shadow-sm">Revoke All</button>
                                    </div>

                                    {/* Table Mockup */}
                                    <div className="w-full border border-gray-100 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Device / Browser</th>
                                                    <th className="px-4 py-3 font-medium">Location</th>
                                                    <th className="px-4 py-3 font-medium">Last Active</th>
                                                    <th className="px-4 py-3 font-medium text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="px-4 py-4">
                                                        <div className="font-medium text-text-primary">Chrome on macOS (Sonoma)</div>
                                                        <div className="text-[10px] text-primary font-bold tracking-wider mt-1">CURRENT SESSION</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-text-secondary">Colombo, LK</td>
                                                    <td className="px-4 py-4 text-text-secondary">Active Now</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Active Now</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="px-4 py-4">
                                                        <div className="font-medium text-text-primary">Safari on iPhone 15 Pro</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-text-secondary">Colombo, LK</td>
                                                    <td className="px-4 py-4 text-text-secondary">2 hours ago</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <button className="text-xs font-medium text-red-500 hover:text-red-700 transition">Revoke</button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column (Security Health & Password) */}
                            <div className="space-y-6">
                                
                                {/* Security Health */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold flex items-center">Security Health</h3>
                                        {profileData?.twoFactorEnabled ? (
                                            <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-md border border-green-200 flex items-center">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Enabled
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-200 flex items-center">
                                                <AlertCircle className="w-3 h-3 mr-1" /> Disabled
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-start space-x-3 mb-6">
                                        <div className={`p-2 rounded-full ${profileData?.twoFactorEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">Highly Protected</h4>
                                            <p className="text-xs text-text-secondary mt-1">Your account uses Multi-Factor Authentication. Great job keeping your data safe!</p>
                                        </div>
                                    </div>

                                    <button onClick={toggleMFA} className="w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-sm">
                                        {profileData?.twoFactorEnabled ? 'Disable MFA' : 'Enable MFA'}
                                    </button>
                                </div>

                                {/* Security Access (Password) */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative pt-12">
                                    <div className="absolute top-0 left-6 -translate-y-1/2 w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                                        <ShieldCheck className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-4">Security Access</h3>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">Current Password</label>
                                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">New Password</label>
                                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-text-secondary">Confirm New Password</label>
                                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                        </div>
                                    </div>

                                    <button onClick={handlePasswordUpdate} disabled={!currentPassword || !newPassword || !confirmPassword} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition shadow-sm disabled:opacity-50">
                                        Update Password
                                    </button>
                                </div>

                                {/* Help Box */}
                                <div className="bg-orange-50 border border-orange-200 border-dashed rounded-xl p-6 text-center">
                                    <AlertCircle className="w-6 h-6 text-primary mx-auto mb-2" />
                                    <h4 className="font-bold text-sm text-primary">Need help?</h4>
                                    <p className="text-xs text-text-secondary mt-1 mb-4">If you suspect unauthorized access or have trouble with MFA, contact our support team immediately.</p>
                                    <a href="#" className="text-xs font-bold text-primary hover:underline">Create Support Ticket →</a>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    {/* Footer */}
                    <footer className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary">
                        <p>© 2024 CampusLink. All rights reserved.</p>
                        <div className="flex space-x-6 mt-4 sm:mt-0">
                            <a href="#" className="hover:text-text-primary">Privacy Policy</a>
                            <a href="#" className="hover:text-text-primary">Terms of Service</a>
                            <a href="#" className="hover:text-text-primary">Support</a>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, active }) => (
    <a href="#" className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'}`}>
        <div className={active ? 'text-primary' : 'text-gray-400'}>{icon}</div>
        <span>{label}</span>
    </a>
)

export default ProfileSettings;
