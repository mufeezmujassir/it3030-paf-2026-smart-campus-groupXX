import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTickets } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_COLORS = {
    LOW: { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
    MEDIUM: { bg: '#FEF9C3', text: '#A16207', border: '#FDE68A' },
    HIGH: { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
    CRITICAL: { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
};

const TechnicianDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await getAllTickets();
                setTickets(res.data);
            } catch {
                console.error('Failed to load tickets');
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);

    const filtered = filter === 'ALL'
        ? tickets
        : tickets.filter(t => t.status === filter);

    const stats = {
        active: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        open: tickets.filter(t => t.status === 'OPEN').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
        total: tickets.length,
    };

    return (
        <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    Technician Dashboard
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Good day, {user?.fullName?.split(' ')[0] || 'Technician'}. Here are your assigned tickets.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Active Tickets', value: stats.active, color: '#3B82F6' },
                    { label: 'Open / Unstarted', value: stats.open, color: '#C45C3C' },
                    { label: 'Resolved Today', value: stats.resolved, color: '#22C55E' },
                    { label: 'Total Assigned', value: stats.total, color: '#A67B5C' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-2xl border p-4"
                         style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {stat.label}
                        </p>
                        <p className="text-3xl font-black" style={{ color: stat.color }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(status => (
                    <button key={status}
                            onClick={() => setFilter(status)}
                            className="px-4 py-1.5 rounded-xl text-sm font-semibold border transition"
                            style={{
                                backgroundColor: filter === status ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: filter === status ? 'white' : 'var(--color-text-secondary)',
                                borderColor: filter === status ? 'var(--color-primary)' : '#E8D5C4',
                            }}>
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Ticket Queue */}
            <div className="rounded-2xl border p-5 mb-5"
                 style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold flex items-center gap-2"
                        style={{ color: 'var(--color-text-primary)' }}>
                        🔧 Active Ticket Queue
                    </h2>
                    <button onClick={() => navigate('/tickets')}
                            className="text-xs font-semibold hover:underline"
                            style={{ color: 'var(--color-primary)' }}>
                        View All →
                    </button>
                </div>

                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="w-7 h-7 border-4 rounded-full animate-spin"
                             style={{ borderColor: '#E8D5C4', borderTopColor: 'var(--color-primary)' }} />
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-3xl mb-2">✅</p>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            No tickets in this category
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map(ticket => {
                        const p = PRIORITY_COLORS[ticket.priority];
                        return (
                            <div key={ticket.id}
                                 onClick={() => navigate(`/tickets/${ticket.id}`)}
                                 className="rounded-xl border p-4 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5"
                                 style={{ backgroundColor: 'var(--color-background)', borderColor: '#E8D5C4' }}>

                                {/* Priority + Status */}
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
                                          style={{ backgroundColor: p.bg, color: p.text, borderColor: p.border }}>
                                        {ticket.priority}
                                    </span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                    {ticket.title}
                                </h3>
                                <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                                    {ticket.category.replace('_', ' ')} • 📍 {ticket.resourceLocation}
                                </p>

                                {/* Footer */}
                                <div className="flex justify-between items-center pt-2 border-t"
                                     style={{ borderColor: '#E8D5C4' }}>
                                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                        By {ticket.createdByName}
                                    </span>
                                    <button
                                        onClick={e => { e.stopPropagation(); navigate(`/tickets/${ticket.id}`); }}
                                        className="text-xs font-semibold hover:underline"
                                        style={{ color: 'var(--color-primary)' }}>
                                        Open Ticket →
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Guidelines */}
            <div className="rounded-2xl border p-5"
                 style={{ backgroundColor: '#4A2E2A', borderColor: '#4A2E2A' }}>
                <h2 className="text-sm font-bold mb-3 text-white flex items-center gap-2">
                    📋 Technician Guidelines
                </h2>
                <ul className="space-y-2">
                    {[
                        'Always update ticket status when starting work.',
                        'Add resolution notes before marking a ticket as resolved.',
                        'Upload photo evidence for completed hardware repairs.',
                        'Contact admin if a ticket requires escalation.',
                    ].map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#E8D5C4' }}>
                            <span style={{ color: 'var(--color-secondary)' }}>•</span>
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default TechnicianDashboard;