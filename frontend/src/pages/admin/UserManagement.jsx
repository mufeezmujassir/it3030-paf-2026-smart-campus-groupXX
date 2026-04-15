import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { 
    Users, Search, Filter, MoreVertical, Shield, 
    CheckCircle2, XCircle, Mail, MapPin, Loader2,
    UserPlus, X, AlertCircle, Wrench, GraduationCap, Briefcase,
    Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle,
    ArrowRight, ArrowLeft, FileX2, RefreshCw
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

    // Bulk Import Modal State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkStep, setBulkStep] = useState(1); // 1=Upload, 2=Preview, 3=Results
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [previewErrors, setPreviewErrors] = useState([]);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data._embedded ? response.data._embedded.userResponseList : response.data);
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

            await api.post('/admin/users', payload);
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

    const handleRemoveUser = async (id) => {
        if (!window.confirm('Are you certain you want to remove this institutional identity profile? This action is irreversible.')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success('User removed from system');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to remove user');
        }
    };

    // ---- Bulk Import Functions ----

    const resetBulkModal = () => {
        setBulkStep(1);
        setSelectedFile(null);
        setPreviewData([]);
        setPreviewErrors([]);
        setIsBulkUploading(false);
        setBulkResult(null);
    };

    const openBulkModal = () => {
        resetBulkModal();
        setIsBulkModalOpen(true);
    };

    const closeBulkModal = () => {
        setIsBulkModalOpen(false);
        resetBulkModal();
    };

    const REQUIRED_HEADERS = ['fullname', 'email', 'role'];
    const VALID_ROLES = ['STUDENT', 'STAFF', 'TECHNICIAN', 'ADMIN'];
    const VALID_SPECIALIZATIONS = ['RESOURCE_MAINTENANCE', 'IT_SUPPORT', 'NETWORK', 'LAB_SUPPORT'];

    const validatePreviewRow = (row, index, allRows) => {
        const errors = [];
        if (!row.fullName || row.fullName.trim() === '') errors.push('Full name is required');
        if (!row.email || row.email.trim() === '') {
            errors.push('Email is required');
        } else if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(row.email.trim())) {
            errors.push('Invalid email format');
        } else {
            // Check in-file duplicates
            const duplicate = allRows.findIndex((r, i) => i !== index && r.email?.trim().toLowerCase() === row.email.trim().toLowerCase());
            if (duplicate !== -1) errors.push(`Duplicate email (same as row ${duplicate + 2})`);
        }
        if (!row.role || !VALID_ROLES.includes(row.role.trim().toUpperCase())) {
            errors.push(`Invalid role. Must be: ${VALID_ROLES.join(', ')}`);
        } else {
            const role = row.role.trim().toUpperCase();
            if (role === 'STUDENT' && (!row.studentId || row.studentId.trim() === '')) errors.push('Student ID required');
            if (role === 'STAFF') {
                if (!row.qualification || row.qualification.trim() === '') errors.push('Qualification required');
                if (!row.designation || row.designation.trim() === '') errors.push('Designation required');
            }
            if (role === 'TECHNICIAN') {
                if (!row.technicianSpecialization || !VALID_SPECIALIZATIONS.includes(row.technicianSpecialization.trim().toUpperCase())) {
                    errors.push('Valid specialization required');
                }
                if (!row.experienceYears || isNaN(row.experienceYears)) errors.push('Experience years required (number)');
            }
        }
        return errors;
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext)) {
            toast.error('Only .xlsx and .xls files are supported');
            return;
        }
        setSelectedFile(file);

        // Parse with xlsx for preview
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (jsonData.length === 0) {
                    toast.error('The Excel file appears to be empty');
                    setSelectedFile(null);
                    return;
                }

                // Normalize header keys
                const normalizedData = jsonData.map(row => {
                    const normalized = {};
                    Object.keys(row).forEach(key => {
                        const normalKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
                        if (normalKey === 'fullname') normalized.fullName = String(row[key]);
                        else if (normalKey === 'email') normalized.email = String(row[key]);
                        else if (normalKey === 'role') normalized.role = String(row[key]);
                        else if (normalKey === 'department') normalized.department = String(row[key]);
                        else if (normalKey === 'studentid') normalized.studentId = String(row[key]);
                        else if (normalKey === 'qualification') normalized.qualification = String(row[key]);
                        else if (normalKey === 'designation') normalized.designation = String(row[key]);
                        else if (normalKey === 'technicianspecialization') normalized.technicianSpecialization = String(row[key]);
                        else if (normalKey === 'experienceyears') normalized.experienceYears = String(row[key]);
                    });
                    return normalized;
                });

                // Validate each row
                const errors = normalizedData.map((row, i) => ({
                    row: i + 2,
                    errors: validatePreviewRow(row, i, normalizedData)
                }));

                setPreviewData(normalizedData);
                setPreviewErrors(errors);
                setBulkStep(2);
            } catch (err) {
                toast.error('Failed to parse Excel file: ' + err.message);
                setSelectedFile(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleBulkUpload = async () => {
        if (!selectedFile) return;
        setIsBulkUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const response = await api.post('/admin/users/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResult(response.data);
            setBulkStep(3);
            fetchUsers(); // Refresh user list
            if (response.data.successCount > 0) {
                toast.success(`${response.data.successCount} users imported successfully`);
            }
            if (response.data.failedCount > 0) {
                toast.warning(`${response.data.failedCount} users were skipped`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bulk upload failed');
        } finally {
            setIsBulkUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/admin/users/bulk-upload/template', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'user_import_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    const exportFailedRecords = () => {
        if (!bulkResult?.failedRecords?.length) return;
        const ws = XLSX.utils.json_to_sheet(bulkResult.failedRecords.map(r => ({
            'Row #': r.rowNumber,
            'Full Name': r.fullName,
            'Email': r.email,
            'Role': r.role,
            'Reason': r.reason
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Failed Records');
        XLSX.writeFile(wb, 'failed_import_records.xlsx');
    };

    const filteredUsers = users.filter(user => 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const validRowCount = previewErrors.filter(e => e.errors.length === 0).length;
    const invalidRowCount = previewErrors.filter(e => e.errors.length > 0).length;

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
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">User Directory</h1>
                    <p className="text-sm text-text-secondary mt-1 max-w-xl">Manage all campus members, their security levels, and role-specific institutional metadata.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <div className="relative group flex-1 sm:flex-initial">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text"
                            placeholder="Find by name, email, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-100 bg-white/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-72 transition-all shadow-sm"
                        />
                    </div>
                    <button id="bulk-import-btn" onClick={openBulkModal} className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]">
                        <FileSpreadsheet size={18} />
                        <span>Bulk Import</span>
                    </button>
                    <button onClick={() => setIsAddUserModalOpen(true)} className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                        <UserPlus size={18} />
                        <span>Register User</span>
                    </button>
                </div>
            </div>

            {/* User List: Table for Desktop, Cards for Mobile */}
            <div className="hidden lg:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
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
                                        <div className="relative inline-block text-left group/action">
                                            <button className="text-gray-300 hover:text-primary p-2 rounded-xl border border-transparent hover:border-primary/10 hover:bg-primary/5 transition-all">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            {/* Bridge container to prevent hover loss */}
                                            <div className="absolute right-0 w-48 pt-2 origin-top-right hidden group-hover/action:block z-50">
                                                <div className="bg-white border border-gray-100 divide-y divide-gray-50 rounded-xl shadow-xl outline-none overflow-hidden">
                                                    <div className="py-1">
                                                        <button 
                                                            onClick={() => handleRemoveUser(user.id)} 
                                                            className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest"
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Remove Identity
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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

            {/* Mobile Cards Layout */}
            <div className="lg:hidden space-y-4">
                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-primary font-bold text-sm">
                                    {user.fullName?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-text-primary leading-tight">{user.fullName || 'Unnamed'}</p>
                                    <p className="text-[10px] text-text-secondary mt-0.5">{user.email}</p>
                                </div>
                            </div>
                            <button onClick={() => handleRemoveUser(user.id)} className="p-2 text-red-400 hover:text-red-500 bg-red-50 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Role & Metadata</p>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    user.role === 'ADMIN' ? 'bg-red-50 text-red-600' : 
                                    user.role === 'STAFF' ? 'bg-blue-50 text-blue-600' : 
                                    'bg-green-50 text-green-600'
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Department</p>
                                <p className="text-[10px] font-bold text-text-secondary">{user.department || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <div className="flex items-center space-x-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-[10px] font-bold text-text-primary uppercase">{user.isActive ? 'Active' : 'Suspended'}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-[9px] font-extrabold text-orange-500 uppercase tracking-wider">
                                <Shield className="w-3 h-3" />
                                <span>MFA {user.twoFactorEnabled ? 'ON' : 'OFF'}</span>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                        <p className="text-sm font-bold text-text-secondary">No members discovered</p>
                    </div>
                )}
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

            {/* ===== BULK IMPORT MODAL ===== */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={closeBulkModal}></div>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/20 flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30 shrink-0">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-text-primary tracking-tight">Bulk User Import</h2>
                                    <p className="text-xs font-medium text-text-secondary mt-0.5">
                                        {bulkStep === 1 && 'Upload an Excel file with user records'}
                                        {bulkStep === 2 && `Preview: ${previewData.length} rows detected`}
                                        {bulkStep === 3 && 'Import complete — review results'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                {/* Step indicators */}
                                <div className="hidden sm:flex items-center space-x-2">
                                    {[1, 2, 3].map(step => (
                                        <div key={step} className={`flex items-center space-x-1.5 ${bulkStep >= step ? 'opacity-100' : 'opacity-30'}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                                                bulkStep > step ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                bulkStep === step ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                                                'border-gray-200 text-gray-400'
                                            }`}>
                                                {bulkStep > step ? <CheckCircle size={14} /> : step}
                                            </div>
                                            {step < 3 && <div className={`w-6 h-0.5 rounded-full ${bulkStep > step ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={closeBulkModal} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 overflow-y-auto flex-1">

                            {/* STEP 1: Upload */}
                            {bulkStep === 1 && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {/* Download Template */}
                                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <div className="flex items-center space-x-3">
                                            <Download size={20} className="text-blue-500" />
                                            <div>
                                                <p className="text-sm font-bold text-blue-900">Download Excel Template</p>
                                                <p className="text-[10px] text-blue-600 mt-0.5">Pre-formatted with all required columns and sample data for each role</p>
                                            </div>
                                        </div>
                                        <button id="download-template-btn" onClick={handleDownloadTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md">
                                            Download .xlsx
                                        </button>
                                    </div>

                                    {/* Drag and Drop Zone */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative border-2 border-dashed rounded-3xl p-12 sm:p-16 text-center cursor-pointer transition-all duration-300 group ${
                                            isDragOver
                                                ? 'border-emerald-400 bg-emerald-50 scale-[1.01]'
                                                : 'border-gray-200 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/30'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={(e) => handleFileSelect(e.target.files[0])}
                                        />
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                                                isDragOver ? 'bg-emerald-100 scale-110' : 'bg-gray-100 group-hover:bg-emerald-50 group-hover:scale-105'
                                            }`}>
                                                <Upload className={`w-10 h-10 transition-colors ${isDragOver ? 'text-emerald-500' : 'text-gray-300 group-hover:text-emerald-400'}`} />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-text-primary">
                                                    {isDragOver ? 'Drop your file here' : 'Drag & drop your Excel file'}
                                                </p>
                                                <p className="text-sm text-text-secondary mt-1">or click to browse • Supports .xlsx and .xls</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column Reference */}
                                    <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Excel Columns</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['fullName *', 'email *', 'role *', 'department', 'studentId', 'qualification', 'designation', 'technicianSpecialization', 'experienceYears'].map(col => (
                                                <div key={col} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
                                                    col.includes('*') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-white text-gray-500 border border-gray-100'
                                                }`}>
                                                    {col}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Preview */}
                            {bulkStep === 2 && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                                            <p className="text-2xl font-black text-text-primary">{previewData.length}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Rows</p>
                                        </div>
                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                                            <p className="text-2xl font-black text-emerald-600">{validRowCount}</p>
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Valid</p>
                                        </div>
                                        <div className={`p-4 rounded-2xl text-center border ${invalidRowCount > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <p className={`text-2xl font-black ${invalidRowCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{invalidRowCount}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${invalidRowCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Issues</p>
                                        </div>
                                    </div>

                                    {/* File Info */}
                                    <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <FileSpreadsheet size={18} className="text-emerald-500" />
                                            <span className="text-sm font-semibold text-text-primary">{selectedFile?.name}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">({(selectedFile?.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                        <button onClick={() => { setBulkStep(1); setSelectedFile(null); setPreviewData([]); setPreviewErrors([]); }} className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors">
                                            Change file
                                        </button>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                        <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                                            <table className="w-full text-left border-collapse min-w-[800px]">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-gray-50 border-b border-gray-100">
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Row</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Full Name</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Department</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Issues</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {previewData.map((row, i) => {
                                                        const rowErrors = previewErrors[i]?.errors || [];
                                                        const isValid = rowErrors.length === 0;
                                                        return (
                                                            <tr key={i} className={`${isValid ? 'hover:bg-emerald-50/30' : 'bg-red-50/30 hover:bg-red-50/50'} transition-colors`}>
                                                                <td className="px-4 py-3 text-xs font-bold text-gray-400">{i + 2}</td>
                                                                <td className="px-4 py-3">
                                                                    {isValid ? (
                                                                        <CheckCircle size={16} className="text-emerald-500" />
                                                                    ) : (
                                                                        <AlertTriangle size={16} className="text-red-500" />
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs font-semibold text-text-primary">{row.fullName || '—'}</td>
                                                                <td className="px-4 py-3 text-xs text-text-secondary">{row.email || '—'}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                                        row.role?.toUpperCase() === 'ADMIN' ? 'bg-red-50 text-red-600' :
                                                                        row.role?.toUpperCase() === 'STAFF' ? 'bg-blue-50 text-blue-600' :
                                                                        row.role?.toUpperCase() === 'TECHNICIAN' ? 'bg-orange-50 text-orange-600' :
                                                                        row.role?.toUpperCase() === 'STUDENT' ? 'bg-green-50 text-green-600' :
                                                                        'bg-gray-50 text-gray-600'
                                                                    }`}>
                                                                        {row.role || '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-text-secondary">{row.department || '—'}</td>
                                                                <td className="px-4 py-3">
                                                                    {rowErrors.length > 0 && (
                                                                        <div className="space-y-0.5">
                                                                            {rowErrors.map((err, j) => (
                                                                                <p key={j} className="text-[10px] font-semibold text-red-500">{err}</p>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {invalidRowCount > 0 && (
                                        <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-amber-900">Some rows have issues</p>
                                                <p className="text-xs text-amber-700 mt-0.5">
                                                    {invalidRowCount} row(s) have validation issues. These will be skipped during import — only valid rows will be processed. The server performs its own final validation including database email uniqueness checks.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: Results */}
                            {bulkStep === 3 && bulkResult && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {/* Result Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                                            <p className="text-3xl font-black text-text-primary">{bulkResult.totalRows}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Processed</p>
                                        </div>
                                        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <CheckCircle size={20} className="text-emerald-500" />
                                                <p className="text-3xl font-black text-emerald-600">{bulkResult.successCount}</p>
                                            </div>
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Successfully Added</p>
                                        </div>
                                        <div className={`p-5 rounded-2xl text-center border ${bulkResult.failedCount > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center justify-center space-x-2">
                                                {bulkResult.failedCount > 0 && <XCircle size={20} className="text-red-500" />}
                                                <p className={`text-3xl font-black ${bulkResult.failedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{bulkResult.failedCount}</p>
                                            </div>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${bulkResult.failedCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>Skipped</p>
                                        </div>
                                    </div>

                                    {/* Success message */}
                                    {bulkResult.successCount > 0 && (
                                        <div className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                            <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                                            <p className="text-sm font-semibold text-emerald-800">
                                                {bulkResult.successCount} user{bulkResult.successCount > 1 ? 's' : ''} imported successfully into the system.
                                            </p>
                                        </div>
                                    )}

                                    {/* Failed Records Table */}
                                    {bulkResult.failedRecords?.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <FileX2 size={16} className="text-red-500" />
                                                    <p className="text-sm font-bold text-text-primary">Skipped Records</p>
                                                </div>
                                                <button id="export-failed-btn" onClick={exportFailedRecords} className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors border border-red-100">
                                                    <Download size={12} />
                                                    <span>Export Failed (.xlsx)</span>
                                                </button>
                                            </div>
                                            <div className="border border-red-100 rounded-2xl overflow-hidden">
                                                <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-red-50 border-b border-red-100">
                                                                <th className="px-4 py-3 text-[9px] font-bold text-red-400 uppercase tracking-widest">Row</th>
                                                                <th className="px-4 py-3 text-[9px] font-bold text-red-400 uppercase tracking-widest">Full Name</th>
                                                                <th className="px-4 py-3 text-[9px] font-bold text-red-400 uppercase tracking-widest">Email</th>
                                                                <th className="px-4 py-3 text-[9px] font-bold text-red-400 uppercase tracking-widest">Role</th>
                                                                <th className="px-4 py-3 text-[9px] font-bold text-red-400 uppercase tracking-widest">Reason</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-red-50">
                                                            {bulkResult.failedRecords.map((record, i) => (
                                                                <tr key={i} className="hover:bg-red-50/50 transition-colors">
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-400">{record.rowNumber}</td>
                                                                    <td className="px-4 py-3 text-xs font-semibold text-text-primary">{record.fullName || '—'}</td>
                                                                    <td className="px-4 py-3 text-xs text-text-secondary">{record.email || '—'}</td>
                                                                    <td className="px-4 py-3 text-xs font-semibold uppercase">{record.role || '—'}</td>
                                                                    <td className="px-4 py-3 text-xs font-semibold text-red-600">{record.reason}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 sm:p-8 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 shrink-0">
                            <div>
                                {bulkStep === 2 && (
                                    <button onClick={() => { setBulkStep(1); setSelectedFile(null); setPreviewData([]); setPreviewErrors([]); }} className="flex items-center space-x-1.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                                        <ArrowLeft size={16} />
                                        <span>Back</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                {bulkStep === 3 ? (
                                    <>
                                        <button onClick={closeBulkModal} className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                                            Close
                                        </button>
                                        <button onClick={() => { resetBulkModal(); }} className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm">
                                            <RefreshCw size={16} />
                                            <span>Import More</span>
                                        </button>
                                    </>
                                ) : bulkStep === 2 ? (
                                    <>
                                        <button onClick={closeBulkModal} className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            id="bulk-upload-btn"
                                            onClick={handleBulkUpload}
                                            disabled={isBulkUploading || previewData.length === 0}
                                            className="flex items-center space-x-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            {isBulkUploading ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} />
                                                    <span>Upload & Process ({validRowCount} valid)</span>
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={closeBulkModal} className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
