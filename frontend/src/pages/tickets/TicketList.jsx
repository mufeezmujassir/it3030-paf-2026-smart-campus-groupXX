import { useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTickets, deleteTicket } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
};

const TicketList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await getAllTickets(statusFilter || null);
            setTickets(res.data);
        } catch (err) {
            setError('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [statusFilter]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this ticket?')) return;
        try {
            await deleteTicket(id);
            setTickets(tickets.filter(t => t.id !== id));
        } catch {
            alert('Failed to delete ticket');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Incident Tickets</h1>
                <button
                    onClick={() => navigate('/tickets/create')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    + New Ticket
                </button>
            </div>

            {/* Filter */}
            <div className="mb-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {loading && <p className="text-gray-500">Loading tickets...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && tickets.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-lg">No tickets found</p>
                    <p className="text-sm mt-1">Create a new ticket to get started</p>
                </div>
            )}

            <div className="grid gap-4">
                {tickets.map(ticket => (
                    <div key={ticket.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-gray-800">{ticket.title}</h2>
                                <p className="text-sm text-gray-500 mt-1">{ticket.resourceLocation}</p>
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ticket.description}</p>
                            </div>
                            <div className="flex flex-col gap-2 ml-4 items-end">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                                    {ticket.priority}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-400">
                                {ticket.category.replace('_', ' ')} • By {ticket.createdByName}
                            </span>
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    className="text-xs text-blue-600 hover:underline">
                                    View
                                </button>
                                {(user?.role === 'ADMIN' || ticket.createdById === user?.id) && (
                                    <button
                                        onClick={() => handleDelete(ticket.id)}
                                        className="text-xs text-red-500 hover:underline">
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TicketList;