import React, { useEffect, useState } from 'react';
import resourceService from '../../services/resourceService';
import ResourceForm from '../../components/ResourceForm';
import { toast } from 'react-toastify';
import defaultImg from '../../assets/default_resource.svg';
import catalogImg from '../../assets/assets_catalog.svg';
import { AlertCircle, Trash2, Loader2, X } from 'lucide-react';

const getFallbackImage = (type) => (type === 'EQUIPMENT' ? defaultImg : catalogImg);

const BRAND = '#C45C3C';
const BRAND_HOVER = '#b05336';
const DELETE_COLOR = '#9B2C2C';

const AdminResourceManagement = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    // Delete confirmation modal state
    const [confirmDelete, setConfirmDelete] = useState(null); // holds { id, name, type, location, imageUrl }
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { fetchResources(); }, []);

    const fetchResources = async () => {
        setErrorMsg(null);
        try {
            const data = await resourceService.listResources({ page: 0, size: 100 });
            setResources(data.content || data);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || err.message || 'Failed to load resources');
        } finally { setLoading(false); }
    };

    const onDelete = async () => {
        if (!confirmDelete) return;
        setIsDeleting(true);
        try {
            await resourceService.deleteResource(confirmDelete.id);
            toast.success('Resource deleted');
            setConfirmDelete(null);
            fetchResources();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || 'Delete failed');
        } finally {
            setIsDeleting(false);
        }
    };

    const openCreate = () => { setEditing(null); setShowForm(true); };
    const openEdit   = (r) => { setEditing(r);    setShowForm(true); };

    const handleSave = async (payload, file) => {
        try {
            if (editing) {
                await resourceService.updateResourceWithFile(editing.id, payload, file);
                toast.success('Resource updated');
            } else {
                await resourceService.createResourceWithFile(payload, file);
                toast.success('Resource created');
            }
            setShowForm(false);
            setEditing(null);
            fetchResources();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || 'Failed to save resource');
            throw err;
        }
    };

    const handleCancel = () => { setShowForm(false); setEditing(null); };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded">{errorMsg}</div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Manage Resources</h2>
                <button
                    onClick={openCreate}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200"
                    style={{ background: BRAND }}
                    onMouseEnter={e => e.currentTarget.style.background = BRAND_HOVER}
                    onMouseLeave={e => e.currentTarget.style.background = BRAND}
                >
                    Create Resource
                </button>
            </div>

            {showForm && (
                <div className="mb-4 p-4 border rounded bg-white">
                    <h3 className="font-semibold mb-2">{editing ? 'Edit Resource' : 'Create Resource'}</h3>
                    <ResourceForm initialData={editing} onSave={handleSave} onCancel={handleCancel} />
                </div>
            )}

            <div className="space-y-4">
                {resources.map(r => (
                    <div
                        key={r.id}
                        className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-40 h-28 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                                <img
                                    src={resourceService.getImageUrl(r.imageUrl) || getFallbackImage(r.type)}
                                    alt="thumb"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = getFallbackImage(r.type);
                                    }}
                                />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-gray-900">{r.name}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    {String(r.type || '').replace(/_/g, ' ')} • {r.location || '-'}
                                </div>
                                <div className="mt-2">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        r.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                        {r.status || 'UNKNOWN'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 md:justify-end">
                            <button
                                onClick={() => openEdit(r)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200"
                                style={{ color: BRAND, borderColor: BRAND, background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.background = BRAND; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BRAND; }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setConfirmDelete({ id: r.id, name: r.name, type: r.type, location: r.location, imageUrl: r.imageUrl, status: r.status })}
                                className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200"
                                style={{ color: DELETE_COLOR, borderColor: DELETE_COLOR, background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.background = DELETE_COLOR; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DELETE_COLOR; }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ===== DELETE CONFIRMATION MODAL ===== */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => !isDeleting && setConfirmDelete(null)}
                    />

                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 relative border border-white/20">

                        {/* Header */}
                        <div className="p-6 pb-0">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <div className="flex-1 pt-1">
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">
                                        Delete this resource?
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                                        This will permanently remove{' '}
                                        <span className="font-bold text-gray-800">{confirmDelete.name}</span>{' '}
                                        from the system. Any associated bookings and schedules will also be affected.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    disabled={isDeleting}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Resource preview card */}
                        <div className="px-6 pt-5">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                                    <img
                                        src={resourceService.getImageUrl(confirmDelete.imageUrl) || getFallbackImage(confirmDelete.type)}
                                        alt={confirmDelete.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = getFallbackImage(confirmDelete.type);
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{confirmDelete.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {String(confirmDelete.type || '').replace(/_/g, ' ')}
                                        {confirmDelete.location ? ` • ${confirmDelete.location}` : ''}
                                    </p>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                                    confirmDelete.status === 'ACTIVE'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                }`}>
                                    {confirmDelete.status || 'UNKNOWN'}
                                </span>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="px-6 pt-3">
                            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <p className="text-xs font-semibold text-amber-800">
                                    This action is irreversible and cannot be undone.
                                </p>
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="flex items-center gap-3 p-6">
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                style={{ background: isDeleting ? '#c87171' : DELETE_COLOR }}
                                onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.background = '#7f1d1d'; }}
                                onMouseLeave={e => { if (!isDeleting) e.currentTarget.style.background = DELETE_COLOR; }}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Resource</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminResourceManagement;