import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
    Users, Search, Filter, MoreVertical, Shield, 
    CheckCircle2, XCircle, Mail, MapPin, Loader2
} from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredUsers = users.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="ml-3 text-text-secondary font-medium">Synchronizing User Directory...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">User Directory</h1>
                    <p className="text-sm text-text-secondary mt-1">Manage institutional access, roles, and security status for all members.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Search by name, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-all"
                        />
                    </div>
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-500">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User Identity</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role & Department</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Security Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Activity</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center text-primary font-bold text-sm">
                                                {user.fullName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary">{user.fullName || 'Unnamed'}</p>
                                                <div className="flex items-center text-xs text-text-secondary mt-0.5">
                                                    <Mail className="w-3 h-3 mr-1" />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                            user.role === 'ADMIN' ? 'bg-red-50 text-red-600' : 
                                            user.role === 'STAFF' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                        <div className="flex items-center text-xs text-text-secondary">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {user.department || 'General'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center space-x-2">
                                                <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                <span className="text-xs font-medium text-text-primary">
                                                    {user.isActive ? 'Active' : 'Deactivated'}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-text-secondary">
                                                <Shield className={`w-3 h-3 ${user.twoFactorEnabled ? 'text-green-600' : 'text-orange-500'}`} />
                                                <span className={user.twoFactorEnabled ? 'text-green-600 uppercase' : 'text-orange-500 uppercase'}>
                                                    2FA {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-text-secondary">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never logged in'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-text-primary p-1 rounded-md hover:bg-gray-100">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-text-secondary">
                                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">No users found matching "{searchTerm}"</p>
                                        <p className="text-xs mt-1">Try adjusting your search filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-text-secondary font-medium">Showing {filteredUsers.length} of {users.length} users</p>
                    <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 border border-gray-200 rounded text-xs font-medium disabled:opacity-50 hover:bg-white transition">Previous</button>
                        <button className="px-3 py-1 border border-gray-200 rounded text-xs font-medium disabled:opacity-50 hover:bg-white transition">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
