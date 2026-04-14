import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, uploadAttachment } from '../../services/ticketService';

const CATEGORIES = [
    { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
    { value: 'PLUMBING', label: 'Plumbing', icon: '🔧' },
    { value: 'HVAC', label: 'HVAC', icon: '❄️' },
    { value: 'IT_EQUIPMENT', label: 'IT Equipment', icon: '💻' },
    { value: 'FURNITURE', label: 'Furniture', icon: '🪑' },
    { value: 'CLEANING', label: 'Cleaning', icon: '🧹' },
    { value: 'SECURITY', label: 'Security', icon: '🔒' },
    { value: 'OTHER', label: 'Other', icon: '📋' },
];

const PRIORITIES = [
    { value: 'LOW', label: 'Low', desc: 'Minor issue, work can continue.', color: '#22C55E' },
    { value: 'MEDIUM', label: 'Medium', desc: 'Default priority for standard issues.', color: '#EAB308' },
    { value: 'HIGH', label: 'High', desc: 'Impacting work for multiple users.', color: '#F97316' },
    { value: 'CRITICAL', label: 'Critical', desc: 'Critical system down. Immediate risk.', color: '#EF4444' },
];

const CreateTicket = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '',
        category: '',
        description: '',
        priority: 'MEDIUM',
        resourceLocation: '',
        preferredContact: '',
    });
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [createdTicketId, setCreatedTicketId] = useState(null);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        const total = files.length + selected.length;
        if (total > 3) {
            alert('Maximum 3 attachments allowed');
            return;
        }
        setFiles([...files, ...selected]);
    };

    const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Frontend validation
        if (!form.category) {
            setError('Please select a category');
            return;
        }
        if (form.title.length < 5) {
            setError('Title must be at least 5 characters');
            return;
        }
        if (form.description.length < 20) {
            setError('Description must be at least 20 characters');
            return;
        }
        if (form.preferredContact && !/^[0-9]{10}$/.test(form.preferredContact)) {
            setError('Please enter a valid phone number (7-15 digits)');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await createTicket(form);
            const ticketId = res.data.id;
            for (const file of files) {
                await uploadAttachment(ticketId, file);
            }
            setCreatedTicketId(ticketId);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ticket');
        } finally {
            setLoading(false);
        }
    };

    // Success modal
    if (submitted) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50"
                 style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="rounded-3xl p-8 w-full max-w-md mx-4 text-center shadow-2xl"
                     style={{ backgroundColor: 'var(--color-surface)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                         style={{ backgroundColor: '#DCFCE7' }}>
                        <span className="text-3xl">✅</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Ticket Submitted Successfully
                    </h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                        Your ticket has been created and will be reviewed shortly.
                    </p>
                    <div className="rounded-xl p-4 mb-6 text-left space-y-2"
                         style={{ backgroundColor: 'var(--color-background)' }}>
                        <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--color-text-secondary)' }}>Est. Response Time</span>
                            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Under 30 Minutes</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                            <span className="font-semibold text-amber-600">OPEN</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/tickets/${createdTicketId}`)}
                        className="w-full py-3 rounded-xl text-white font-semibold transition hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary)' }}>
                        Go to My Ticket
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/tickets')}
                            className="w-9 h-9 rounded-xl flex items-center justify-center border transition hover:opacity-80"
                            style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4', color: 'var(--color-text-secondary)' }}>
                        ←
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                            Report an Incident
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Submit a ticket and our team will resolve it promptly.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Category */}
                    <div className="rounded-2xl border p-5"
                         style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            Incident Details
                        </h2>
                        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Select the category that best describes your issue.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            {CATEGORIES.map(cat => (
                                <button key={cat.value} type="button"
                                        onClick={() => setForm({ ...form, category: cat.value })}
                                        className="flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition"
                                        style={{
                                            backgroundColor: form.category === cat.value ? 'var(--color-primary)' : 'var(--color-background)',
                                            borderColor: form.category === cat.value ? 'var(--color-primary)' : '#E8D5C4',
                                            color: form.category === cat.value ? 'white' : 'var(--color-text-secondary)',
                                        }}>
                                    <span className="text-lg">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Title */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                Subject *
                            </label>
                            <input name="title" value={form.title} onChange={handleChange} required
                                   placeholder="Summarize the issue in a few words..."
                                   className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
                                   style={{
                                       backgroundColor: 'var(--color-background)',
                                       borderColor: '#E8D5C4',
                                       color: 'var(--color-text-primary)',
                                   }} />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                Detailed Description *
                            </label>
                            <textarea name="description" value={form.description} onChange={handleChange} required rows={4}
                                      placeholder="Please describe the issue in detail. Include any error messages or steps to reproduce..."
                                      className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none"
                                      style={{
                                          backgroundColor: 'var(--color-background)',
                                          borderColor: form.description.length > 0 && form.description.length < 20 ? '#EF4444' : '#E8D5C4',
                                          color: 'var(--color-text-primary)',
                                      }} />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs" style={{
                                    color: form.description.length < 20 && form.description.length > 0 ? '#EF4444' : 'var(--color-text-secondary)'
                                }}>
                                    {form.description.length < 20 ? `${20 - form.description.length} more characters needed` : '✓ Good length'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    {form.description.length}/2000
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Priority + Location */}
                    <div className="rounded-2xl border p-5"
                         style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                Priority Level
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {PRIORITIES.map(p => (
                                <button key={p.value} type="button"
                                        onClick={() => setForm({ ...form, priority: p.value })}
                                        className="text-left p-3 rounded-xl border text-xs transition"
                                        style={{
                                            backgroundColor: form.priority === p.value ? `${p.color}15` : 'var(--color-background)',
                                            borderColor: form.priority === p.value ? p.color : '#E8D5C4',
                                            color: form.priority === p.value ? p.color : 'var(--color-text-secondary)',
                                        }}>
                                    <p className="font-bold">{p.label}</p>
                                    <p className="mt-0.5 opacity-80">{p.desc}</p>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                    Location / Room Number *
                                </label>
                                <input name="resourceLocation" value={form.resourceLocation} onChange={handleChange} required
                                       placeholder="e.g. Lab B4, Room 402"
                                       className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                       style={{
                                           backgroundColor: 'var(--color-background)',
                                           borderColor: '#E8D5C4',
                                           color: 'var(--color-text-primary)',
                                       }} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                    Preferred Contact
                                </label>
                                <input name="preferredContact" value={form.preferredContact} onChange={handleChange}
                                       placeholder="Phone number (e.g. 0771234567)"
                                       className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                                       style={{
                                           backgroundColor: 'var(--color-background)',
                                           borderColor: form.preferredContact && !/^[0-9]{10}$/.test(form.preferredContact) ? '#EF4444' : '#E8D5C4',
                                           color: 'var(--color-text-primary)',
                                       }} />
                                {form.preferredContact && !/^[0-9]{10}$/.test(form.preferredContact) && (
                                    <p className="text-xs mt-1 text-red-500">Please enter a valid 10-digit phone number</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className="rounded-2xl border p-5"
                         style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                Attachments (Max 3)
                            </label>
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {files.length}/3 files
                            </span>
                        </div>

                        {files.length < 3 && (
                            <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition hover:opacity-80"
                                   style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-background)' }}>
                                <span className="text-2xl mb-1">📎</span>
                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                    Click to upload or drag and drop
                                </span>
                                <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    PNG, JPG or PDF (max. 5MB each)
                                </span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                        )}

                        {files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {files.map((file, i) => (
                                    <div key={i}
                                         className="flex items-center justify-between px-3 py-2 rounded-xl border"
                                         style={{ backgroundColor: 'var(--color-background)', borderColor: '#E8D5C4' }}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">📄</span>
                                            <div>
                                                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                    {file.name}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeFile(i)}
                                                className="text-red-400 hover:text-red-600 text-lg leading-none">
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pb-6">
                        <button type="button" onClick={() => navigate('/tickets')}
                                className="flex-1 py-3 rounded-xl border text-sm font-semibold transition hover:opacity-80"
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    borderColor: '#E8D5C4',
                                    color: 'var(--color-text-secondary)',
                                }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--color-primary)' }}>
                            {loading ? 'Creating...' : 'Create Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTicket;