import React, { useEffect, useMemo, useState } from 'react';
import resourceService from '../services/resourceService';
import { Link } from 'react-router-dom';
import { MapPin, Users, Search, SlidersHorizontal } from 'lucide-react';
import defaultImg from '../assets/default_resource.svg';
import catalogImg from '../assets/assets_catalog.svg';

const typeImageMap = {
    LAB: catalogImg,
    LECTURE_HALL: catalogImg,
    MEETING_SPACE: catalogImg,
    STUDY_ROOM: catalogImg,
    EQUIPMENT: defaultImg
};

const Resources = () => {
    const [resources, setResources] = useState([]);
    const [types, setTypes] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);
    const [filters, setFilters] = useState({ page: 0, size: 12 });
    const [sortBy, setSortBy] = useState('recommended');

    useEffect(() => {
        fetchTypes();
        fetchResources();
        // eslint-disable-next-line
    }, []);

    const fetchTypes = async () => {
        try {
            const data = await resourceService.getResourceTypes();
            setTypes(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchResources = async (params = {}) => {
        setErrorMsg(null);
        try {
            const data = await resourceService.listResources({ ...filters, ...params });
            // backend returns Page object; items under `content`
            setResources(data.content || data);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || err.message || 'Failed to load resources');
        }
    };

    const onFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const onSearch = (e) => {
        e.preventDefault();
        fetchResources();
    };

    const prettyType = (value) => {
        if (!value) return '-';
        return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const statusStyles = (status) => {
        if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700';
        if (status === 'OUT_OF_SERVICE') return 'bg-rose-50 text-rose-700';
        return 'bg-gray-100 text-gray-700';
    };

    const sortedResources = useMemo(() => {
        const list = [...resources];
        if (sortBy === 'capacity') {
            return list.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
        }
        if (sortBy === 'name') {
            return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return list;
    }, [resources, sortBy]);

    return (
        <div className="p-6 md:p-8">
            <div className="mb-5">
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Resource Catalogue</h2>
                <p className="text-sm text-gray-500 mt-1">Explore and reserve campus facilities in real-time.</p>
            </div>

            {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-100 rounded">{errorMsg}</div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-3 bg-white border border-gray-100 rounded-2xl p-4 h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal size={16} className="text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                        </div>
                        <button
                            type="button"
                            className="text-xs text-primary font-semibold hover:underline"
                            onClick={() => {
                                const reset = { page: 0, size: 12, keyword: '', type: '', location: '' };
                                setFilters(reset);
                                fetchResources(reset);
                            }}
                        >
                            Reset All
                        </button>
                    </div>

                    <form className="space-y-3" onSubmit={onSearch}>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Search</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    name="keyword"
                                    value={filters.keyword || ''}
                                    placeholder="Search rooms or labs..."
                                    onChange={onFilterChange}
                                    className="w-full border border-gray-200 pl-9 pr-3 py-2 rounded-xl text-sm outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Resource Type</label>
                            <select
                                name="type"
                                value={filters.type || ''}
                                onChange={onFilterChange}
                                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-primary"
                            >
                                <option value="">All Types</option>
                                {types.map((t) => (
                                    <option key={t} value={t}>{prettyType(t)}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Location</label>
                            <input
                                name="location"
                                value={filters.location || ''}
                                placeholder="Ex: Main Campus"
                                onChange={onFilterChange}
                                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-primary"
                            />
                        </div>

                        <button className="w-full bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-95">
                            Apply Filters
                        </button>
                    </form>
                </div>

                <div className="xl:col-span-9">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-500">Showing {sortedResources.length} resources available</p>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary"
                            >
                                <option value="recommended">Recommended</option>
                                <option value="name">Name</option>
                                <option value="capacity">Capacity</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {sortedResources.length === 0 && (
                            <div className="col-span-1 md:col-span-2 2xl:col-span-3 p-10 text-center text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl">
                                No resources found for your filters.
                            </div>
                        )}

                        {sortedResources.map((r) => (
                            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow">
                                <div className="relative">
                                    <img
                                        src={resourceService.getImageUrl(r.imageUrl) || typeImageMap[r.type] || defaultImg}
                                        alt={r.name}
                                        className="w-full h-40 object-cover"
                                    />
                                    <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles(r.status)}`}>
                                        {r.status === 'ACTIVE' ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <p className="text-[11px] font-semibold tracking-wide text-primary uppercase mb-1">{prettyType(r.type)}</p>
                                    <h3 className="font-semibold text-gray-900 line-clamp-1">{r.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.subtype || 'General purpose resource'}</p>
                                    <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                                        <p className="flex items-center gap-1.5"><MapPin size={13} /> {r.location || '-'}</p>
                                        <p className="flex items-center gap-1.5"><Users size={13} /> Up to {r.capacity || '-'} people</p>
                                    </div>
                                    <div className="mt-4">
                                        <Link
                                            to={`/resources/${r.id}`}
                                            className="block w-full text-center text-sm border border-gray-200 rounded-lg py-2 font-semibold text-gray-700 hover:bg-gray-50"
                                        >
                                            Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Resources;
