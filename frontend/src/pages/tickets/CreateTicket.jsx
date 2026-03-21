import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, uploadAttachment } from '../../services/ticketService';

const CATEGORIES = ['ELECTRICAL', 'PLUMBING', 'HVAC', 'IT_EQUIPMENT', 'FURNITURE', 'CLEANING', 'SECURITY', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const CreateTicket = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '',
        category: '',
        description: '',
        priority: '',
        resourceLocation: '',
        preferredContact: '',
    });
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 3) {
            alert('Maximum 3 attachments allowed');
            return;
        }
        setFiles(selected);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await createTicket(form);
            const ticketId = res.data.id;

            for (const file of files) {
                await uploadAttachment(ticketId, file);
            }

            navigate(`/tickets/${ticketId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/tickets')} className="text-gray-400 hover:text-gray-600">←</button>
                <h1 className="text-2xl font-bold text-gray-800">Create Incident Ticket</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input name="title" value={form.title} onChange={handleChange} required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description of the issue" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select name="category" value={form.category} onChange={handleChange} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select category</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                        <select name="priority" value={form.priority} onChange={handleChange} required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select priority</option>
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resource / Location *</label>
                    <input name="resourceLocation" value={form.resourceLocation} onChange={handleChange} required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Lab 3, Room 201, Projector #5" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe the issue in detail..." />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
                    <input name="preferredContact" value={form.preferredContact} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Phone number or email" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attachments <span className="text-gray-400 font-normal">(max 3 images)</span>
                    </label>
                    <input type="file" accept="image/*" multiple onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {files.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{files.length} file(s) selected</p>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => navigate('/tickets')}
                        className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                        {loading ? 'Creating...' : 'Create Ticket'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateTicket;