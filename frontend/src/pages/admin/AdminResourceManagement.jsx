import React, { useEffect, useState } from 'react';
import resourceService from '../../services/resourceService';
import ResourceForm from '../../components/ResourceForm';
import { toast } from 'react-toastify';
import defaultImg from '../../assets/default_resource.svg';
import catalogImg from '../../assets/assets_catalog.svg';

const getFallbackImage = (type) => (type === 'EQUIPMENT' ? defaultImg : catalogImg);

const AdminResourceManagement = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { console.log('AdminResourceManagement mounted'); fetchResources(); }, []);

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

    const onDelete = async (id) => {
        if (!window.confirm('Delete this resource?')) return;
        try {
            await resourceService.deleteResource(id);
            toast.success('Resource deleted');
            fetchResources();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Delete failed';
            toast.error(msg);
        }
    };

    const openCreate = () => { setEditing(null); setShowForm(true); };

    const openEdit = (r) => { setEditing(r); setShowForm(true); };

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
            const msg = err.response?.data?.message || err.message || 'Failed to save resource';
            toast.error(msg);
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
                <button onClick={openCreate} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200" style={{ background: '#C45C3C' }} onMouseEnter={e => e.currentTarget.style.background = '#b05336'} onMouseLeave={e => e.currentTarget.style.background = '#C45C3C'}>Create Resource</button>
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
                                <div className="text-sm text-gray-600 mt-1">{String(r.type || '').replace(/_/g, ' ')} • {r.location || '-'}</div>
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
                                style={{ color: '#C45C3C', borderColor: '#C45C3C', background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#C45C3C'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C45C3C'; }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(r.id)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200"
                                style={{ color: '#9B2C2C', borderColor: '#9B2C2C', background: 'transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#9B2C2C'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9B2C2C'; }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminResourceManagement;
