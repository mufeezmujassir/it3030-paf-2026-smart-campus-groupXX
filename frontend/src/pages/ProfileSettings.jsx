import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MonitorSmartphone, User, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const ProfileSettings = () => {
    const { user, updateUser } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [department, setDepartment] = useState('');
    const [qualification, setQualification] = useState('');
    const [designation, setDesignation] = useState('');
    const [studentId, setStudentId] = useState('');
    const [technicianSpecialization, setTechnicianSpecialization] = useState('IT_SUPPORT');
    const [experienceYears, setExperienceYears] = useState('');
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/me');
            const data = response.data;
            setProfileData(data);
            
            const nameParts = (data.fullName || '').split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
            
            setDepartment(data.department || '');
            setQualification(data.qualification || '');
            setDesignation(data.designation || '');
            setStudentId(data.studentId || '');
            setTechnicianSpecialization(data.technicianSpecialization || 'IT_SUPPORT');
            setExperienceYears(data.experienceYears || '');
            
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
                qualification: profileData.role === 'STAFF' ? qualification : null,
                designation: profileData.role === 'STAFF' ? designation : null,
                studentId: profileData.role === 'STUDENT' ? studentId : null,
                technicianSpecialization: profileData.role === 'TECHNICIAN' ? technicianSpecialization : null,
                experienceYears: profileData.role === 'TECHNICIAN' ? parseInt(experienceYears) || 0 : null
            });
            setProfileData(response.data);
            
            updateUser({
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
        try {
            await api.put('/users/me/password', { currentPassword, newPassword });
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
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Account Settings</h1>
                    <p className="text-text-secondary text-sm mt-1">Manage your identity, security preferences, and institutional profile.</p>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm w-fit">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span>Member since {new Date(profileData?.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile Form */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-sm relative pt-12 overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                        
                        <div className="absolute top-0 left-8 -translate-y-1/2 w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-md">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="mb-8">
                            <h3 className="text-lg sm:text-xl font-bold text-text-primary">Profile Information</h3>
                            <p className="text-sm text-text-secondary mt-1">Update your personal details and how others see you on the hub.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">First Name</label>
                                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Last Name</label>
                                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Department / Unit</label>
                                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. IT Services" className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Registration Identity</label>
                                <span className={`inline-flex px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl text-sm font-medium w-full cursor-not-allowed`}>
                                    {profileData?.role}
                                </span>
                            </div>
                        </div>

                        {/* Role Specific Fields */}
                        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 mb-8 animate-in zoom-in-95 duration-500">
                             {profileData?.role === 'STUDENT' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Student ID Number</label>
                                    <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. IT21004455" className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                </div>
                            )}

                            {profileData?.role === 'STAFF' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Qualification</label>
                                        <input type="text" value={qualification} onChange={e => setQualification(e.target.value)} placeholder="PhD, MSc..." className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Designation</label>
                                        <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Senior Lecturer" className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                    </div>
                                </div>
                            )}

                            {profileData?.role === 'TECHNICIAN' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Tech Specialization</label>
                                        <select value={technicianSpecialization} onChange={e => setTechnicianSpecialization(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                            <option value="RESOURCE_MAINTENANCE">Resource Maintenance</option>
                                            <option value="IT_SUPPORT">IT Support</option>
                                            <option value="NETWORK">Networking</option>
                                            <option value="LAB_SUPPORT">Lab Support</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Experience (Years)</label>
                                        <input type="number" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="5" className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-50">
                            <button onClick={handleProfileUpdate} className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                                Update Profile
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative pt-12">
                        <div className="absolute top-0 left-6 -translate-y-1/2 w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-md">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Security Health</h3>
                                {profileData?.twoFactorEnabled ? (
                                    <span className="inline-flex items-center text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Fully Protected
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">
                                        <AlertCircle className="w-3 h-3 mr-1" /> Action Required
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
                            Multi-Factor Authentication adds an extra layer of security to your institutional account by requiring more than just a password to sign in.
                        </p>

                        <button 
                            onClick={toggleMFA}
                            className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                                profileData?.twoFactorEnabled 
                                ? 'bg-white text-red-500 border-red-100 hover:bg-red-50' 
                                : 'bg-primary text-white border-transparent hover:bg-primary-hover'
                            }`}
                        >
                            {profileData?.twoFactorEnabled ? 'Disable 2FA Security' : 'Enable 2FA Protection'}
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative pt-12">
                         <div className="absolute top-0 left-6 -translate-y-1/2 w-10 h-10 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-md">
                            <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">•••</div>
                        </div>
                        <h3 className="text-lg font-bold mb-6">Access Credentials</h3>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Current Password</label>
                                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>
                        </div>

                        <button 
                            onClick={handlePasswordUpdate}
                            disabled={!currentPassword || !newPassword}
                            className="w-full py-3 bg-white border border-gray-100 text-text-primary rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                        >
                            Update Credentials
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
