import api from './api';

const TICKETS_URL = '/tickets';

// Tickets
export const createTicket = (data) => api.post(TICKETS_URL, data);
export const getAllTickets = (status) => api.get(TICKETS_URL, { params: status ? { status } : {} });
export const getTicketById = (id) => api.get(`${TICKETS_URL}/${id}`);
export const updateTicketStatus = (id, status) => api.put(`${TICKETS_URL}/${id}/status`, { status });
export const assignTicket = (id, technicianId) => api.post(`${TICKETS_URL}/${id}/assign`, { technicianId });
export const rejectTicket = (id, reason) => api.patch(`${TICKETS_URL}/${id}/reject`, { reason });
export const addResolutionNotes = (id, resolutionNotes) => api.put(`${TICKETS_URL}/${id}/resolution`, { resolutionNotes });
export const deleteTicket = (id) => api.delete(`${TICKETS_URL}/${id}`);

// Attachments
export const uploadAttachment = (ticketId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${TICKETS_URL}/${ticketId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const getAttachments = (ticketId) => api.get(`${TICKETS_URL}/${ticketId}/attachments`);
export const deleteAttachment = (ticketId, attachmentId) => api.delete(`${TICKETS_URL}/${ticketId}/attachments/${attachmentId}`);

// Comments
export const addComment = (ticketId, content) => api.post(`${TICKETS_URL}/${ticketId}/comments`, { content });
export const getComments = (ticketId) => api.get(`${TICKETS_URL}/${ticketId}/comments`);
export const updateComment = (commentId, content) => api.put(`${TICKETS_URL}/comments/${commentId}`, { content });
export const deleteComment = (commentId) => api.delete(`${TICKETS_URL}/comments/${commentId}`);