import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
    Users, Search, Filter, MoreVertical, Shield, 
    CheckCircle2, XCircle, Mail, MapPin, Loader2,
    UserPlus, X, AlertCircle, Wrench, GraduationCap, Briefcase
} from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Add User Modal State
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUserData, setNewUserData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'STUDENT',
        department: '',
        studentId: '',
        qualification: '',
        designation: '',
        technicianSpecialization: 'IT_SUPPORT',
        experienceYears: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                fullName: `${newUserData.firstName} ${newUserData.lastName}`,
                email: newUserData.email,
                role: newUserData.role,
                department: newUserData.department,
                studentId: newUserData.role === 'STUDENT' ? newUserData.studentId : null,
                qualification: newUserData.role === 'STAFF' ? newUserData.qualification : null,
                designation: newUserData.role === 'STAFF' ? newUserData.designation : null,
                technicianSpecialization: newUserData.role === 'TECHNICIAN' ? newUserData.technicianSpecialization : null,
                experienceYears: newUserData.role === 'TECHNICIAN' ? parseInt(newUserData.experienceYears) || 0 : null
            };

            await api.post('/users', payload);
            toast.success('User registered successfully');
            setIsAddUserModalOpen(false);
            fetchUsers(); // Refresh list
            setNewUserData({
                firstName: '', lastName: '', email: '', role: 'STUDENT', 
                department: '', studentId: '', qualification: '', designation: '', 
                technicianSpecialization: 'IT_SUPPORT', experienceYears: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to register user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <span className="text-text-secondary font-bold uppercase tracking-widest text-xs">Synchronizing Directory</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary">User Directory</h1>
                    <p className="text-sm text-text-secondary mt-1 max-w-xl">Manage all campus members, their security levels, and role-specific institutional metadata.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative group">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text"
                            placeholder="Find by name, email, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-100 bg-white/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-72 transition-all shadow-sm"
                        />
                    </div>
                    <button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                        <UserPlus size={18} />
                        <span>Register User</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Identity</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role & Metadata</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institutional Context</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security Status</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-primary/[0.01] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center text-primary font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                                                {user.fullName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary leading-tight">{user.fullName || 'Unnamed'}</p>
                                                <div className="flex items-center text-xs text-text-secondary mt-1">
                                                    <Mail className="w-3 h-3 mr-1.5 opacity-60" />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col space-y-1.5">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit border ${
                                                user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' : 
                                                user.role === 'STAFF' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                user.role === 'TECHNICIAN' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                                {user.role}
                                            </span>
                                            {/* Role Specific Metadata badge */}
                                            {user.studentId && (
                                                <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    <GraduationCap className="w-3 h-3 mr-1" />
                                                    {user.studentId}
                                                </div>
                                            )}
                                            {user.technicianSpecialization && (
                                                <div className="flex items-center text-[10px] font-bold text-orange-500 uppercase tracking-tight">
                                                    <Wrench className="w-3 h-3 mr-1" />
                                                    {user.technicianSpecialization.replace('_', ' ')}
                                                </div>
                                            )}
                                            {user.designation && (
                                                <div className="flex items-center text-[10px] font-bold text-blue-500 uppercase tracking-tight">
                                                    <Briefcase className="w-3 h-3 mr-1" />
                                                    {user.designation}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center text-sm font-medium text-text-secondary">
                                            <MapPin className="w-3.5 h-3.5 mr-2 opacity-50" />
                                            {user.department || 'Unassigned'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex flex-col space-y-1.5">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`}></div>
                                                    <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">
                                                        {user.isActive ? 'Access Active' : 'Suspended'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-1.5 text-[9px] font-extrabold uppercase tracking-widest">
                                                    <Shield className={`w-3.5 h-3.5 ${user.twoFactorEnabled ? 'text-green-500' : 'text-orange-400'}`} />
                                                    <span className={user.twoFactorEnabled ? 'text-green-600' : 'text-orange-500'}>
                                                        MFA {user.twoFactorEnabled ? 'PROTECTED' : 'AT RISK'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button className="text-gray-300 hover:text-primary p-2 rounded-xl border border-transparent hover:border-primary/10 hover:bg-primary/5 transition-all">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
                                                <Users className="w-8 h-8 text-gray-200" />
                                            </div>
                                            <p className="text-lg font-bold text-text-primary">No members found</p>
                                            <p className="text-sm text-text-secondary mt-1">Try adjusting your filters or register a new campus user.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Register New User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsAddUserModalOpen(false)}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/20">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-primary/[0.02]">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-primary">
                                    <UserPlus size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-text-primary tracking-tight">Register New User</h2>
                                    <p className="text-xs font-medium text-text-secondary mt-0.5">Initialize a new institutional identity profile.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">First Name</label>
                                    <input required type="text" value={newUserData.firstName} onChange={e => setNewUserData({...newUserData, firstName: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Last Name</label>
                                    <input required type="text" value={newUserData.lastName} onChange={e => setNewUserData({...newUserData, lastName: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">University Email Address</label>
                                <input required type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="identity@smartcampus.edu" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Institutional Role</label>
                                    <select required value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                                        <option value="STUDENT">Student</option>
                                        <option value="STAFF">Academic / Staff</option>
                                        <option value="TECHNICIAN">Technician</option>
                                        <option value="ADMIN">Administrator</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department / Unit</label>
                                    <input type="text" value={newUserData.department} onChange={e => setNewUserData({...newUserData, department: e.target.value})} placeholder="e.g. Engineering" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                </div>
                            </div>

                            {/* Dynamic Role-Based Fields */}
                            <div className="p-6 bg-primary/[0.03] border border-primary/10 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                                {newUserData.role === 'STUDENT' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Student ID Number</label>
                                        <input required type="text" value={newUserData.studentId} onChange={e => setNewUserData({...newUserData, studentId: e.target.value})} placeholder="IT2100...." className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                )}
                                {newUserData.role === 'STAFF' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Qualification</label>
                                            <input required type="text" value={newUserData.qualification} onChange={e => setNewUserData({...newUserData, qualification: e.target.value})} placeholder="MSc, PhD..." className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Designation</label>
                                            <input required type="text" value={newUserData.designation} onChange={e => setNewUserData({...newUserData, designation: e.target.value})} placeholder="Lecturer" className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        </div>
                                    </div>
                                )}
                                {newUserData.role === 'TECHNICIAN' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Specialization</label>
                                            <select required value={newUserData.technicianSpecialization} onChange={e => setNewUserData({...newUserData, technicianSpecialization: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm">
                                                <option value="RESOURCE_MAINTENANCE">Resource Maintenance</option>
                                                <option value="IT_SUPPORT">IT Support</option>
                                                <option value="NETWORK">Networking</option>
                                                <option value="LAB_SUPPORT">Lab Support</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Exp (Years)</label>
                                            <input required type="number" value={newUserData.experienceYears} onChange={e => setNewUserData({...newUserData, experienceYears: e.target.value})} placeholder="0" className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                        </div>
                                    </div>
                                )}
                                {newUserData.role === 'ADMIN' && (
                                    <div className="flex items-center space-x-3 text-primary">
                                        <Shield size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Full Administrative Privileges</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end space-x-4 pt-4">
                                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                                    Discard
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50">
                                    {isSubmitting ? 'Processing Identity...' : 'Initialize Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
