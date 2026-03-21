import { useEffect, useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getTicketById, updateTicketStatus, assignTicket,
    rejectTicket, addResolutionNotes, deleteTicket,
    uploadAttachment, deleteAttachment,
    addComment, getComments, updateComment, deleteComment
} from '../../services/ticketService';
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

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Comment state
    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingContent, setEditingContent] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    // Admin action state
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

    // ── Status actions ────────────────────────────────────────────────────────

    const handleStatusUpdate = async (status) => {
        setActionLoading(true);
        try {
            const res = await updateTicketStatus(id, status);
            setTicket(res.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!technicianId.trim()) return;
        setActionLoading(true);
        try {
            const res = await assignTicket(id, technicianId.trim());
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
        await handleStatusUpdate('CLOSED');
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

    // ── Attachments ───────────────────────────────────────────────────────────

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

    // ── Comments ──────────────────────────────────────────────────────────────

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

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return <div className="p-6 text-gray-500">Loading ticket...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;
    if (!ticket) return null;

    const isAdmin = user?.role === 'ADMIN';
    const isTechnician = user?.role === 'TECHNICIAN';
    const isOwner = ticket.createdById === user?.id;
    const isAssigned = ticket.assignedToId === user?.id;
    const isActive = !['CLOSED', 'REJECTED'].includes(ticket.status);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/tickets')}
                        className="text-gray-400 hover:text-gray-600 text-lg">←</button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{ticket.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">{ticket.resourceLocation}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                    </span>
                </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Category</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">{ticket.category.replace('_', ' ')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Reported By</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">{ticket.createdByName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Assigned To</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">{ticket.assignedToName || 'Unassigned'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Preferred Contact</p>
                        <p className="text-sm font-medium text-gray-700 mt-1">{ticket.preferredContact || '—'}</p>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
                </div>
                {ticket.rejectionReason && (
                    <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-700">{ticket.rejectionReason}</p>
                    </div>
                )}
                {ticket.resolutionNotes && (
                    <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-xs text-green-400 uppercase tracking-wide mb-1">Resolution Notes</p>
                        <p className="text-sm text-green-700">{ticket.resolutionNotes}</p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {isActive && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Actions</p>
                    <div className="flex flex-wrap gap-2">
                        {isAdmin && ticket.status === 'OPEN' && (
                            <button onClick={() => setShowAssignModal(true)}
                                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                Assign Technician
                            </button>
                        )}
                        {(isAdmin || (isTechnician && isAssigned)) && ticket.status === 'IN_PROGRESS' && (
                            <button onClick={() => setShowResolveModal(true)}
                                className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition">
                                Mark Resolved
                            </button>
                        )}
                        {isAdmin && ticket.status === 'RESOLVED' && (
                            <button onClick={handleClose}
                                className="bg-gray-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                                Close Ticket
                            </button>
                        )}
                        {isAdmin && (
                            <button onClick={() => setShowRejectModal(true)}
                                className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-600 transition">
                                Reject
                            </button>
                        )}
                        {(isAdmin || isOwner) && (
                            <button onClick={handleDelete}
                                className="border border-red-300 text-red-500 text-sm px-4 py-2 rounded-lg hover:bg-red-50 transition">
                                Delete Ticket
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Attachments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Attachments ({ticket.attachments?.length || 0}/3)
                    </p>
                    {isActive && (ticket.attachments?.length || 0) < 3 && (
                        <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                            + Add Image
                            <input type="file" accept="image/*" className="hidden"
                                onChange={handleAttachmentUpload} />
                        </label>
                    )}
                </div>
                {ticket.attachments?.length === 0 && (
                    <p className="text-sm text-gray-400">No attachments</p>
                )}
                <div className="flex flex-wrap gap-3">
                    {ticket.attachments?.map(att => (
                        <div key={att.id} className="relative group">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                                <p className="font-medium truncate max-w-32">{att.fileName}</p>
                                <p className="text-gray-400 mt-1">{(att.fileSize / 1024).toFixed(1)} KB</p>
                            </div>
                            {(isAdmin || isOwner) && (
                                <button
                                    onClick={() => handleAttachmentDelete(att.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs hidden group-hover:flex items-center justify-center">
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
                    Comments ({comments.length})
                </p>
                <div className="space-y-4 mb-6">
                    {comments.length === 0 && (
                        <p className="text-sm text-gray-400">No comments yet</p>
                    )}
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
                                {comment.authorName?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-medium text-gray-700">{comment.authorName}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {editingCommentId === comment.id ? (
                                    <div className="mt-2">
                                        <textarea
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            rows={2}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleEditComment(comment.id)}
                                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                                                Save
                                            </button>
                                            <button onClick={() => setEditingCommentId(null)}
                                                className="text-xs text-gray-500 hover:underline">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                                )}
                                {comment.authorId === user?.id && editingCommentId !== comment.id && (
                                    <div className="flex gap-3 mt-1">
                                        <button
                                            onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content); }}
                                            className="text-xs text-blue-500 hover:underline">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteComment(comment.id)}
                                            className="text-xs text-red-400 hover:underline">
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add comment */}
                <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
                        {user?.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={2}
                            placeholder="Add a comment..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}
                            className="mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                            {commentLoading ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Assign Technician</h3>
                        <input value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}
                            placeholder="Enter technician user ID"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowAssignModal(false)}
                                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleAssign} disabled={actionLoading}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                {actionLoading ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Reject Ticket</h3>
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                            rows={3} placeholder="Reason for rejection..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowRejectModal(false)}
                                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleReject} disabled={actionLoading}
                                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">
                                {actionLoading ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showResolveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Mark as Resolved</h3>
                        <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)}
                            rows={3} placeholder="Describe how the issue was resolved..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowResolveModal(false)}
                                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleResolve} disabled={actionLoading}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                                {actionLoading ? 'Resolving...' : 'Mark Resolved'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketDetail;