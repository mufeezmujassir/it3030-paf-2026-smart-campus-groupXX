import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTickets, deleteTicket } from '../../services/ticketService';
import SLATimer from '../../components/SLATimer';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
    OPEN: 'bg-amber-100 text-amber-800 border border-amber-200',
    ASSIGNED: 'bg-purple-100 text-purple-800 border border-purple-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border border-blue-200',
    RESOLVED: 'bg-green-100 text-green-800 border border-green-200',
    CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
    REJECTED: 'bg-red-100 text-red-700 border border-red-200',
};

const PRIORITY_STYLES = {
    LOW: 'bg-green-50 text-green-700 border border-green-200',
    MEDIUM: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    HIGH: 'bg-orange-50 text-orange-700 border border-orange-200',
    CRITICAL: 'bg-red-50 text-red-700 border border-red-200',
};

const PRIORITY_DOT = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
};

const TicketList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list');

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await getAllTickets(statusFilter || null);
            setTickets(res.data);
        } catch {
            console.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, [statusFilter]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this ticket?')) return;
        try {
            await deleteTicket(id);
            setTickets(tickets.filter(t => t.id !== id));
        } catch {
            alert('Failed to delete ticket');
        }
    };

    const filtered = tickets.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.resourceLocation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        open: tickets.filter(t => t.status === 'OPEN').length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
        total: tickets.length,
    };

    return (
        <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {user?.role === 'ADMIN' ? 'Ticketing Center' :
                            user?.role === 'TECHNICIAN' ? 'My Jobs' : 'My Tickets'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {user?.role === 'ADMIN'
                            ? 'Manage institutional support requests and facility maintenance.'
                            : user?.role === 'TECHNICIAN'
                                ? 'View and manage tickets assigned to you.'
                                : 'Track and manage your submitted tickets.'}
                    </p>
                </div>
                {/* Only students and staff can create tickets */}
                {(user?.role === 'STUDENT' || user?.role === 'STAFF') && (
                    <button
                        onClick={() => navigate('/tickets/create')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-primary)' }}>
                        + New Ticket
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Open Tickets', value: stats.open, color: '#C45C3C' },
                    { label: 'In Progress', value: stats.inProgress, color: '#3B82F6' },
                    { label: 'Resolved', value: stats.resolved, color: '#22C55E' },
                    { label: 'Total', value: stats.total, color: '#A67B5C' },
                ].map(stat => (
                    <div key={stat.label}
                         className="rounded-2xl p-4 border"
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

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-3 mb-5 items-center">
                <div className="relative flex-1 min-w-48">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by title or location..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            borderColor: '#E8D5C4',
                            color: 'var(--color-text-primary)',
                        }} />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border text-sm focus:outline-none"
                    style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: '#E8D5C4',
                        color: 'var(--color-text-primary)',
                    }}>
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="REJECTED">Rejected</option>
                </select>
                <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C4' }}>
                    {['list', 'board'].map(mode => (
                        <button key={mode}
                                onClick={() => setViewMode(mode)}
                                className="px-3 py-2 text-sm font-medium capitalize transition"
                                style={{
                                    backgroundColor: viewMode === mode ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: viewMode === mode ? 'white' : 'var(--color-text-secondary)',
                                }}>
                            {mode === 'list' ? '☰ List' : '⊞ Board'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin"
                         style={{ borderColor: '#E8D5C4', borderTopColor: 'var(--color-primary)' }} />
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <div className="text-center py-16 rounded-2xl border"
                     style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                    <p className="text-4xl mb-3">🎫</p>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No tickets found</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Create a new ticket to get started
                    </p>
                </div>
            )}

            {/* List View */}
            {!loading && viewMode === 'list' && (
                <div className="space-y-3">
                    {filtered.map(ticket => (
                        <div key={ticket.id}
                             onClick={() => navigate(`/tickets/${ticket.id}`)}
                             className="rounded-2xl border p-5 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[ticket.priority]}`} />
                                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                            {ticket.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-base truncate" style={{ color: 'var(--color-text-primary)' }}>
                                        {ticket.title}
                                    </h3>
                                    <p className="text-sm mt-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                        📍 {ticket.resourceLocation}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 items-end shrink-0">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[ticket.priority]}`}>
                                        {ticket.priority}
                                    </span>
                                    {/* SLA Timer compact */}
                                    {ticket.slaDeadline && (
                                        <SLATimer
                                            slaDeadline={ticket.slaDeadline}
                                            status={ticket.status}
                                            compact={true}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t"
                                 style={{ borderColor: '#F0E0D0' }}>
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    By {ticket.createdByName} •{' '}
                                    {ticket.assignedToName ? `Assigned to ${ticket.assignedToName}` : 'Unassigned'}
                                </span>
                                {(user?.role === 'ADMIN' || ticket.createdById === user?.id) && (
                                    <button
                                        onClick={e => handleDelete(e, ticket.id)}
                                        className="text-xs text-red-400 hover:text-red-600 hover:underline">
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Board View */}
            {!loading && viewMode === 'board' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map(status => (
                        <div key={status} className="rounded-2xl border p-4"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    {status.replace('_', ' ')}
                                </h3>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ backgroundColor: '#F0E0D0', color: 'var(--color-primary)' }}>
                                    {filtered.filter(t => t.status === status).length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {filtered.filter(t => t.status === status).map(ticket => (
                                    <div key={ticket.id}
                                         onClick={() => navigate(`/tickets/${ticket.id}`)}
                                         className="rounded-xl border p-3 cursor-pointer hover:shadow-sm transition"
                                         style={{ backgroundColor: 'var(--color-background)', borderColor: '#E8D5C4' }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                {ticket.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                            {ticket.title}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                            📍 {ticket.resourceLocation}
                                        </p>
                                    </div>
                                ))}
                                {filtered.filter(t => t.status === status).length === 0 && (
                                    <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                                        No tickets
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TicketList;