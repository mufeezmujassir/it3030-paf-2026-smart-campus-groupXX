import api from './api';

const RESOURCE_BASE = '/resources';

export const listResources = (params) => api.get(RESOURCE_BASE, { params }).then(res => res.data);

export const getResource = (id) => api.get(`${RESOURCE_BASE}/${id}`).then(res => res.data);

export const getResourceTypes = () => api.get(`${RESOURCE_BASE}/types`).then(res => res.data);

export const createResource = (payload) => api.post(RESOURCE_BASE, payload).then(res => res.data);

export const createResourceWithFile = (payload, file) => {
    const form = new FormData();
    form.append('data', JSON.stringify(payload));
    if (file) form.append('file', file);
    return api.post(RESOURCE_BASE, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
}

export const updateResource = (id, payload) => api.put(`${RESOURCE_BASE}/${id}`, payload).then(res => res.data);

export const updateResourceWithFile = (id, payload, file) => {
    const form = new FormData();
    form.append('data', JSON.stringify(payload));
    if (file) form.append('file', file);
    return api.put(`${RESOURCE_BASE}/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
}

export const deleteResource = (id) => api.delete(`${RESOURCE_BASE}/${id}`).then(res => res.data);

export const uploadImage = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`${RESOURCE_BASE}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
}

// Helper: convert relative image path to full backend URL
export const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `http://localhost:8080${imageUrl}`;
};

export default {
    listResources,
    getResource,
    getResourceTypes,
    createResource,
    createResourceWithFile,
    updateResource,
    updateResourceWithFile,
    deleteResource,
    uploadImage,
    getImageUrl
};
