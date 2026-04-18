import React, { useEffect, useState } from 'react';
import resourceService from '../services/resourceService';
import defaultImg from '../assets/default_resource.svg';

const ResourceForm = ({ initialData = null, onSave, onCancel }) => {
    const [types, setTypes] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState({
        name: '',
        type: '',
        subtype: '',
        capacity: '',
        location: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        fetchTypes();
        if (initialData) {
            setForm({
                name: initialData.name || '',
                type: initialData.type || '',
                subtype: initialData.subtype || '',
                capacity: initialData.capacity || '',
                location: initialData.location || '',
                status: initialData.status || 'ACTIVE'
            });
            // Show existing image if editing
            if (initialData.imageUrl) {
                setImagePreview(initialData.imageUrl.startsWith('/api')
                    ? `${import.meta.env.VITE_BACKEND_BASE_URL}${initialData.imageUrl}`
                    : initialData.imageUrl);
            }
        }
        // eslint-disable-next-line
    }, [initialData]);

    const fetchTypes = async () => {
        try {
            const data = await resourceService.getResourceTypes();
            setTypes(data);
        } catch (err) {
            console.error(err);
        }
    };

    const hasInvalidChars = (str) => /[^a-zA-Z\s]/.test(str);

    const onChange = (e) => {
        const { name, value } = e.target;
        if (name === 'name' || name === 'subtype') {
            const sanitized = value.replace(/[^a-zA-Z\s]/g, '');
            setForm(prev => ({ ...prev, [name]: sanitized }));
            if (hasInvalidChars(value)) {
                setErrors(prev => ({ ...prev, [name]: `${name === 'name' ? 'Name' : 'Subtype'} can only contain letters and spaces` }));
            } else {
                setErrors(prev => { const copy = { ...prev }; delete copy[name]; return copy; });
            }
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const onFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        setSelectedFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(initialData?.imageUrl
                ? (initialData.imageUrl.startsWith('/api')
                    ? `${import.meta.env.VITE_BACKEND_BASE_URL}${initialData.imageUrl}`
                    : initialData.imageUrl)
                : null);
        }
    };

    const submit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (hasInvalidChars(form.name)) {
            newErrors.name = 'Name can only contain letters and spaces';
        }
        if (hasInvalidChars(form.subtype)) {
            newErrors.subtype = 'Subtype can only contain letters and spaces';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        const payload = {
            name: form.name,
            type: form.type,
            subtype: form.subtype || null,
            capacity: form.capacity === '' ? null : Number(form.capacity),
            location: form.location,
            status: form.status
        };

        try {
            await onSave(payload, selectedFile);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Image</label>
                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden border border-gray-200 bg-white">
                        <img
                            src={imagePreview || defaultImg}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultImg;
                            }}
                        />
                    </div>
                    <div className="flex-1">
                        <label
                            htmlFor="resource-image-upload"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold cursor-pointer hover:opacity-95"
                        >
                            Choose Image
                        </label>
                        <input
                            id="resource-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Upload a clear image (JPG/PNG). Recommended landscape ratio for best preview.
                        </p>
                        {initialData?.imageUrl && !selectedFile && (
                            <p className="text-xs text-gray-500 mt-1">Current image will be kept if no new file is selected.</p>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                    className={`border p-2.5 w-full rounded-lg outline-none focus:border-primary ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                    <select
                        name="type"
                        value={form.type}
                        onChange={onChange}
                        required
                        className="border border-gray-300 p-2.5 w-full rounded-lg outline-none focus:border-primary"
                    >
                        <option value="">Select type</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Subtype</label>
                    <input
                        name="subtype"
                        value={form.subtype}
                        onChange={onChange}
                        className={`border p-2.5 w-full rounded-lg outline-none focus:border-primary ${errors.subtype ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {errors.subtype && <p className="text-xs text-red-500 mt-1">{errors.subtype}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity</label>
                    <input
                        name="capacity"
                        value={form.capacity}
                        onChange={onChange}
                        type="number"
                        min="0"
                        className="border border-gray-300 p-2.5 w-full rounded-lg outline-none focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                    <input
                        name="location"
                        value={form.location}
                        onChange={onChange}
                        required
                        className="border border-gray-300 p-2.5 w-full rounded-lg outline-none focus:border-primary"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="border border-gray-300 p-2.5 w-full rounded-lg outline-none focus:border-primary"
                >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                </select>
            </div>

            <div className="flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:opacity-95"
                >
                    Save
                </button>
            </div>
        </form>
    );
};

export default ResourceForm;
