import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getTicketById, updateTicketStatus, assignTicket,
    rejectTicket, addResolutionNotes, deleteTicket,
    uploadAttachment, deleteAttachment,
    addComment, getComments, updateComment, deleteComment
} from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { autoAssignTicket, getAvailableTechnicians } from '../../services/ticketService';

const STATUS_STYLES = {
    OPEN: 'bg-amber-100 text-amber-800 border border-amber-200',
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

const CATEGORY_SPECIALIZATION_MAP = {
    ELECTRICAL: 'electrical',
    PLUMBING: 'plumbing',
    HVAC: 'hvac',
    IT_EQUIPMENT: 'it',
    FURNITURE: 'furniture',
    CLEANING: 'cleaning',
    SECURITY: 'security',
    OTHER: '',
};

const Modal = ({ title, onClose, onConfirm, confirmLabel, confirmColor, children, loading }) => (
    <div className="fixed inset-0 flex items-center justify-center z-50"
         style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <div className="rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
             style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {children}
            <div className="flex gap-3 mt-4">
                <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80"
                        style={{ borderColor: '#E8D5C4', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background)' }}>
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={loading}
                        className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: confirmColor || 'var(--color-primary)' }}>
                    {loading ? 'Processing...' : confirmLabel}
                </button>
            </div>
        </div>
    </div>
);

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [technicians, setTechnicians] = useState([]);
    const [assignMode, setAssignMode] = useState('auto');

    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingContent, setEditingContent] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [technicianId, setTechnicianId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTicket = async () => {
        try {
            const res = await getTicketById(id);
            setTicket(res.data);
        } catch {
            setError('Failed to load ticket');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await getComments(id);
            setComments(res.data);
        } catch {
            console.error('Failed to load comments');
        }
    };

    useEffect(() => {
        fetchTicket();
        fetchComments();
    }, [id]);

    useEffect(() => {
        if (showAssignModal && isAdmin) {
            getAvailableTechnicians()
                .then(res => setTechnicians(res.data))
                .catch(() => console.error('Failed to load technicians'));
        }
    }, [showAssignModal]);



    const handleAssign = async () => {
        setActionLoading(true);
        try {
            let res;
            if (assignMode === 'auto') {
                res = await autoAssignTicket(id);
            } else {
                if (!technicianId.trim()) return;
                res = await assignTicket(id, technicianId.trim());
            }
            setTicket(res.data);
            setShowAssignModal(false);
            setTechnicianId('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            const res = await rejectTicket(id, rejectReason.trim());
            setTicket(res.data);
            setShowRejectModal(false);
            setRejectReason('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!resolutionNotes.trim()) return;
        setActionLoading(true);
        try {
            const res = await addResolutionNotes(id, resolutionNotes.trim());
            setTicket(res.data);
            setShowResolveModal(false);
            setResolutionNotes('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to resolve ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        if (!window.confirm('Close this ticket?')) return;
        setActionLoading(true);
        try {
            const res = await updateTicketStatus(id, 'CLOSED');
            setTicket(res.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to close ticket');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this ticket permanently?')) return;
        try {
            await deleteTicket(id);
            navigate('/tickets');
        } catch {
            alert('Failed to delete ticket');
        }
    };

    const handleAttachmentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await uploadAttachment(id, file);
            fetchTicket();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to upload attachment');
        }
    };

    const handleAttachmentDelete = async (attachmentId) => {
        if (!window.confirm('Delete this attachment?')) return;
        try {
            await deleteAttachment(id, attachmentId);
            fetchTicket();
        } catch {
            alert('Failed to delete attachment');
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setCommentLoading(true);
        try {
            await addComment(id, newComment.trim());
            setNewComment('');
            fetchComments();
        } catch {
            alert('Failed to add comment');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleEditComment = async (commentId) => {
        if (!editingContent.trim()) return;
        try {
            await updateComment(commentId, editingContent.trim());
            setEditingCommentId(null);
            setEditingContent('');
            fetchComments();
        } catch {
            alert('Failed to update comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await deleteComment(commentId);
            fetchComments();
        } catch {
            alert('Failed to delete comment');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
                 style={{ borderColor: '#E8D5C4', borderTopColor: 'var(--color-primary)' }} />
        </div>
    );

    if (error) return (
        <div className="p-6 text-red-500">{error}</div>
    );

    if (!ticket) return null;

    const isAdmin = user?.role === 'ADMIN';
    const isTechnician = user?.role === 'TECHNICIAN';
    const isOwner = ticket.createdById === user?.id;
    const isAssigned = ticket.assignedToId === user?.id;
    const isActive = !['CLOSED', 'REJECTED'].includes(ticket.status);

    const timelineEvents = [
        { label: 'Ticket Created', time: ticket.createdAt, by: ticket.createdByName, icon: '🎫' },
        ticket.assignedToName && { label: `Assigned to ${ticket.assignedToName}`, time: ticket.updatedAt, by: 'Admin', icon: '👤' },
        ticket.status === 'IN_PROGRESS' && { label: 'Work Started', time: ticket.updatedAt, by: ticket.assignedToName, icon: '🔧' },
        ticket.status === 'RESOLVED' && { label: 'Ticket Resolved', time: ticket.updatedAt, by: ticket.assignedToName, icon: '✅' },
        ticket.status === 'CLOSED' && { label: 'Ticket Closed', time: ticket.updatedAt, by: 'Admin', icon: '🔒' },
        ticket.status === 'REJECTED' && { label: 'Ticket Rejected', time: ticket.updatedAt, by: 'Admin', icon: '❌' },
    ].filter(Boolean);

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-3">
                        <button onClick={() => navigate('/tickets')}
                                className="mt-1 w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                                style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4', color: 'var(--color-text-secondary)' }}>
                            ←
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                    My Tickets
                                </span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>›</span>
                                <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                                    #{id?.slice(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {ticket.title}
                            </h1>
                            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                📍 {ticket.resourceLocation}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                            {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${PRIORITY_STYLES[ticket.priority]}`}>
                            {ticket.priority}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Description */}
                        <div className="rounded-2xl border p-5"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <h2 className="text-sm font-bold mb-3 flex items-center gap-2"
                                style={{ color: 'var(--color-text-primary)' }}>
                                🗒️ Ticket Description
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                {ticket.description}
                            </p>
                            {ticket.rejectionReason && (
                                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100">
                                    <p className="text-xs font-bold text-red-600 mb-1">Rejection Reason</p>
                                    <p className="text-sm text-red-700">{ticket.rejectionReason}</p>
                                </div>
                            )}
                            {ticket.resolutionNotes && (
                                <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
                                    <p className="text-xs font-bold text-green-600 mb-1">Resolution Notes</p>
                                    <p className="text-sm text-green-700">{ticket.resolutionNotes}</p>
                                </div>
                            )}
                        </div>

                        {/* Activity Timeline */}
                        <div className="rounded-2xl border p-5"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <h2 className="text-sm font-bold mb-4 flex items-center gap-2"
                                style={{ color: 'var(--color-text-primary)' }}>
                                🕐 Activity Timeline
                            </h2>
                            <div className="space-y-4">
                                {timelineEvents.map((event, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                                                 style={{ backgroundColor: 'var(--color-background)' }}>
                                                {event.icon}
                                            </div>
                                            {i < timelineEvents.length - 1 && (
                                                <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: '#E8D5C4' }} />
                                            )}
                                        </div>
                                        <div className="pb-4 flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                    {event.label}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {event.time ? new Date(event.time).toLocaleString() : ''}
                                                </p>
                                            </div>
                                            {event.by && (
                                                <p className="text-xs mt-0.5 font-medium uppercase tracking-wide"
                                                   style={{ color: 'var(--color-primary)' }}>
                                                    {event.by}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Discussion */}
                        <div className="rounded-2xl border p-5"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <h2 className="text-sm font-bold mb-4 flex items-center gap-2"
                                style={{ color: 'var(--color-text-primary)' }}>
                                💬 Discussion ({comments.length})
                            </h2>

                            <div className="space-y-4 mb-5">
                                {comments.length === 0 && (
                                    <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                                        No comments yet. Be the first to add one.
                                    </p>
                                )}
                                {comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                                             style={{ backgroundColor: 'var(--color-primary)' }}>
                                            {comment.authorName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 rounded-xl p-3 border"
                                             style={{ backgroundColor: 'var(--color-background)', borderColor: '#E8D5C4' }}>
                                            <div className="flex justify-between items-center mb-1">
                                                <div>
                                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                        {comment.authorName}
                                                    </span>
                                                    {comment.authorId === user?.id && (
                                                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium"
                                                              style={{ backgroundColor: '#F0E0D0', color: 'var(--color-primary)' }}>
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {new Date(comment.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {editingCommentId === comment.id ? (
                                                <div>
                                                    <textarea
                                                        value={editingContent}
                                                        onChange={e => setEditingContent(e.target.value)}
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none"
                                                        style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-surface)' }} />
                                                    <div className="flex gap-2 mt-2">
                                                        <button onClick={() => handleEditComment(comment.id)}
                                                                className="text-xs px-3 py-1 rounded-lg text-white"
                                                                style={{ backgroundColor: 'var(--color-primary)' }}>
                                                            Save
                                                        </button>
                                                        <button onClick={() => setEditingCommentId(null)}
                                                                className="text-xs px-3 py-1 rounded-lg"
                                                                style={{ color: 'var(--color-text-secondary)' }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {comment.content}
                                                    </p>
                                                    {comment.authorId === user?.id && (
                                                        <div className="flex gap-3 mt-2">
                                                            <button
                                                                onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); }}
                                                                className="text-xs hover:underline"
                                                                style={{ color: 'var(--color-primary)' }}>
                                                                Edit
                                                            </button>
                                                            <button onClick={() => handleDeleteComment(comment.id)}
                                                                    className="text-xs text-red-400 hover:underline">
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add comment */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                                     style={{ backgroundColor: 'var(--color-primary)' }}>
                                    {user?.fullName?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        rows={2}
                                        placeholder="Type a comment or update..."
                                        className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
                                        style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }} />
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                            Policy: Comments editable by author only
                                        </p>
                                        <button onClick={handleAddComment}
                                                disabled={commentLoading || !newComment.trim()}
                                                className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition hover:opacity-90"
                                                style={{ backgroundColor: 'var(--color-primary)' }}>
                                            {commentLoading ? 'Posting...' : 'Post Comment'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">

                        {/* Actions */}
                        {/* Admin/Technician actions panel */}
                        {isActive && (isAdmin || isTechnician) && (
                            <div className="rounded-2xl border p-5"
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                                <h2 className="text-sm font-bold mb-3 flex items-center gap-2"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    ⚡ Lifecycle Actions
                                </h2>
                                <div className="space-y-2">
                                    {isAdmin && ['OPEN', 'IN_PROGRESS'].includes(ticket.status) && (
                                        <button onClick={() => setShowAssignModal(true)}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80"
                                                style={{ borderColor: '#E8D5C4', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background)' }}>
                                            👤 {ticket.assignedToName ? 'Reassign Technician' : 'Assign Technician'}
                                        </button>
                                    )}
                                    {(isAdmin || (isTechnician && isAssigned)) && ticket.status === 'IN_PROGRESS' && (
                                        <button onClick={() => setShowResolveModal(true)}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80 border-green-200 text-green-700 bg-green-50">
                                            ✅ Mark Resolved
                                        </button>
                                    )}
                                    {isAdmin && ticket.status === 'RESOLVED' && (
                                        <button onClick={handleClose}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80"
                                                style={{ borderColor: '#E8D5C4', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-background)' }}>
                                            🔒 Close Ticket
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => setShowRejectModal(true)}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80 border-red-200 text-red-600 bg-red-50">
                                            ❌ Reject Ticket
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button onClick={handleDelete}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80 border-red-100 text-red-400 bg-white">
                                            🗑️ Delete Ticket
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Owner delete — completely separate, outside admin panel */}
                        {isOwner && !isAdmin && !isTechnician && isActive && (
                            <div className="rounded-2xl border p-5"
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                                <h2 className="text-sm font-bold mb-3"
                                    style={{ color: 'var(--color-text-primary)' }}>
                                    ⚙️ Ticket Actions
                                </h2>
                                <button onClick={handleDelete}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition hover:opacity-80 border-red-100 text-red-400 bg-white">
                                    🗑️ Delete My Ticket
                                </button>
                            </div>
                        )}

                        {/* Assignment Details */}
                        <div className="rounded-2xl border p-5"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                                Assignment Details
                            </h2>
                            <div className="space-y-3">
                                {ticket.assignedToName && (
                                    <div>
                                        <p className="text-xs uppercase tracking-wide font-medium mb-1"
                                           style={{ color: 'var(--color-text-secondary)' }}>Technician</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                 style={{ backgroundColor: 'var(--color-primary)' }}>
                                                {ticket.assignedToName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                    {ticket.assignedToName}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-medium mb-1"
                                       style={{ color: 'var(--color-text-secondary)' }}>Requester</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                             style={{ backgroundColor: '#A67B5C' }}>
                                            {ticket.createdByName?.charAt(0)}
                                        </div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                            {ticket.createdByName}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t space-y-2" style={{ borderColor: '#E8D5C4' }}>
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: 'var(--color-text-secondary)' }}>📍 Location</span>
                                        <span className="font-medium text-right" style={{ color: 'var(--color-text-primary)' }}>
                                            {ticket.resourceLocation}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: 'var(--color-text-secondary)' }}>🕐 Reported</span>
                                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}
                                        </span>
                                    </div>
                                    {ticket.preferredContact && (
                                        <div className="flex justify-between text-sm">
                                            <span style={{ color: 'var(--color-text-secondary)' }}>📞 Contact</span>
                                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                {ticket.preferredContact}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: 'var(--color-text-secondary)' }}>🏷️ Category</span>
                                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                            {ticket.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="rounded-2xl border p-5"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: '#E8D5C4' }}>
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                    📎 Attachments ({ticket.attachments?.length || 0}/3)
                                </h2>
                                {isActive && (ticket.attachments?.length || 0) < 3 && (
                                    <label className="text-xs font-semibold cursor-pointer hover:underline"
                                           style={{ color: 'var(--color-primary)' }}>
                                        + Add
                                        <input type="file" accept="image/*" className="hidden"
                                               onChange={handleAttachmentUpload} />
                                    </label>
                                )}
                            </div>
                            {ticket.attachments?.length === 0 && (
                                <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-secondary)' }}>
                                    No attachments
                                </p>
                            )}
                            <div className="space-y-2">
                                {ticket.attachments?.map(att => (
                                    <div key={att.id}
                                         className="flex items-center justify-between px-3 py-2 rounded-xl border group"
                                         style={{ backgroundColor: 'var(--color-background)', borderColor: '#E8D5C4' }}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">🖼️</span>
                                            <div>
                                                <p className="text-xs font-medium truncate max-w-28"
                                                   style={{ color: 'var(--color-text-primary)' }}>
                                                    {att.fileName}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {(att.fileSize / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        {(isAdmin || isOwner) && (
                                            <button onClick={() => handleAttachmentDelete(att.id)}
                                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-lg leading-none">
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAssignModal && (
                <Modal title="Assign Technician" onClose={() => setShowAssignModal(false)}
                       onConfirm={handleAssign} confirmLabel="Assign" loading={actionLoading}>

                    {/* Mode Toggle */}
                    <div className="flex rounded-xl overflow-hidden border mb-4"
                         style={{ borderColor: '#E8D5C4' }}>
                        {['auto', 'manual'].map(mode => (
                            <button key={mode} type="button"
                                    onClick={() => setAssignMode(mode)}
                                    className="flex-1 py-2 text-sm font-semibold capitalize transition"
                                    style={{
                                        backgroundColor: assignMode === mode ? 'var(--color-primary)' : 'var(--color-background)',
                                        color: assignMode === mode ? 'white' : 'var(--color-text-secondary)',
                                    }}>
                                {mode === 'auto' ? '⚡ Auto Assign' : '👤 Manual'}
                            </button>
                        ))}
                    </div>

                    {assignMode === 'auto' ? (
                        <div>
                            <div className="rounded-xl p-4 mb-3"
                                 style={{ backgroundColor: 'var(--color-background)' }}>
                                <p className="text-sm font-semibold mb-1"
                                   style={{ color: 'var(--color-text-primary)' }}>
                                    🎯 Smart Auto-Assignment
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    The system will automatically find the best technician
                                    based on their specialization matching the ticket category:
                                    <span className="font-bold ml-1"
                                          style={{ color: 'var(--color-primary)' }}>
                            {ticket?.category?.replace('_', ' ')}
                        </span>
                                </p>
                            </div>
                            {/* Available technicians preview */}
                            {technicians.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold mb-2"
                                       style={{ color: 'var(--color-text-secondary)' }}>
                                        Available technicians:
                                    </p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {technicians.map(t => (
                                            <div key={t.id}
                                                 className="flex items-center justify-between px-3 py-2 rounded-lg border"
                                                 style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-background)' }}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                         style={{ backgroundColor: 'var(--color-primary)' }}>
                                                        {t.fullName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold"
                                                           style={{ color: 'var(--color-text-primary)' }}>
                                                            {t.fullName}
                                                        </p>
                                                        <p className="text-xs"
                                                           style={{ color: 'var(--color-text-secondary)' }}>
                                                            {t.technicianSpecialization || 'General'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {t.technicianSpecialization?.toLowerCase().includes(
                                                    CATEGORY_SPECIALIZATION_MAP[ticket?.category] || ''
                                                ) && (
                                                    <span className="text-xs font-bold text-green-600">
                                            ✓ Match
                                        </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                                Select a technician manually:
                            </p>
                            {technicians.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                                    {technicians.map(t => (
                                        <div key={t.id}
                                             onClick={() => setTechnicianId(t.id)}
                                             className="flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition"
                                             style={{
                                                 borderColor: technicianId === t.id ? 'var(--color-primary)' : '#E8D5C4',
                                                 backgroundColor: technicianId === t.id ? '#FFF0EB' : 'var(--color-background)',
                                             }}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                     style={{ backgroundColor: 'var(--color-primary)' }}>
                                                    {t.fullName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold"
                                                       style={{ color: 'var(--color-text-primary)' }}>
                                                        {t.fullName}
                                                    </p>
                                                    <p className="text-xs"
                                                       style={{ color: 'var(--color-text-secondary)' }}>
                                                        {t.technicianSpecialization || 'General'} • {t.email}
                                                    </p>
                                                </div>
                                            </div>
                                            {technicianId === t.id && (
                                                <span className="text-sm" style={{ color: 'var(--color-primary)' }}>✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <input value={technicianId} onChange={e => setTechnicianId(e.target.value)}
                                       placeholder="Technician User ID (UUID)"
                                       className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none mb-3"
                                       style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }} />
                            )}
                        </div>
                    )}
                </Modal>
            )}

            {showRejectModal && (
                <Modal title="Reject Ticket" onClose={() => setShowRejectModal(false)}
                       onConfirm={handleReject} confirmLabel="Reject" confirmColor="#EF4444" loading={actionLoading}>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Please provide a reason for rejection.
                    </p>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                              rows={3} placeholder="Reason for rejection..."
                              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
                              style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }} />
                </Modal>
            )}

            {showResolveModal && (
                <Modal title="Mark as Resolved" onClose={() => setShowResolveModal(false)}
                       onConfirm={handleResolve} confirmLabel="Mark Resolved" confirmColor="#22C55E" loading={actionLoading}>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Describe how the issue was resolved.
                    </p>
                    <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                              rows={3} placeholder="Resolution notes..."
                              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
                              style={{ borderColor: '#E8D5C4', backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)' }} />
                </Modal>
            )}
        </div>
    );
};

export default TicketDetail;