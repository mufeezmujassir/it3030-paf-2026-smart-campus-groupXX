import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import resourceService from '../services/resourceService';
import {
    ArrowLeft, MapPin, Users, Tag, Layers,
    CheckCircle2, XCircle, Calendar, Info
} from 'lucide-react';
import defaultImg from '../assets/default_resource.svg';
import catalogImg from '../assets/assets_catalog.svg';
import BookingCalendar from '../components/BookingCalendar';
import {toast} from "react-toastify";

const typeImageMap = {
    LAB: catalogImg,
    LECTURE_HALL: catalogImg,
    MEETING_SPACE: catalogImg,
    STUDY_ROOM: catalogImg,
    EQUIPMENT: defaultImg
};

const prettyType = (value) => {
    if (!value) return '-';
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const ResourceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        fetchResource();
        // eslint-disable-next-line
    }, [id]);

    const fetchResource = async () => {
        setLoading(true);
        try {
            const data = await resourceService.getResource(id);
            setResource(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBookingCreated = () => {
        // Optional: refresh or show message
        toast.success('Booking request submitted!');
    };

    /* ---------- loading skeleton ---------- */
    if (loading) {
        return (
            <div className="p-6 md:p-8 max-w-6xl mx-auto animate-pulse">
                <div className="h-5 w-32 bg-gray-200 rounded-full mb-6" />
                <div className="rounded-3xl overflow-hidden bg-white border border-gray-100">
                    <div className="h-72 md:h-80 bg-gray-200" />
                    <div className="p-6 space-y-4">
                        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-100 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!resource) {
        return (
            <div className="p-6 md:p-8 max-w-6xl mx-auto">
                <div className="text-center py-20">
                    <XCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Resource Not Found</h2>
                    <p className="text-sm text-gray-500 mt-1">This resource may have been removed or doesn't exist.</p>
                    <button
                        onClick={() => navigate('/resources')}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
                    >
                        <ArrowLeft size={16} /> Back to Catalogue
                    </button>
                </div>
            </div>
        );
    }

    const isActive = resource.status === 'ACTIVE';
    const imgSrc = resourceService.getImageUrl(resource.imageUrl) || typeImageMap[resource.type] || defaultImg;

    const infoCards = [
        {
            icon: <Tag size={20} className="text-primary" />,
            label: 'Type',
            value: prettyType(resource.type),
        },
        {
            icon: <Layers size={20} className="text-violet-500" />,
            label: 'Subtype',
            value: resource.subtype || 'General',
        },
        {
            icon: <Users size={20} className="text-sky-500" />,
            label: 'Capacity',
            value: resource.capacity ? `${resource.capacity} people` : '—',
        },
        {
            icon: <MapPin size={20} className="text-rose-500" />,
            label: 'Location',
            value: resource.location || '—',
        },
    ];

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            {/* ── back button ── */}
            <button
                onClick={() => navigate('/resources')}
                className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary font-medium mb-6 transition-colors"
            >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                Back to Catalogue
            </button>

            {/* ── main card ── */}
            <div className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm">

                {/* ── hero image section ── */}
                <div className="relative h-72 md:h-80 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    <img
                        src={imgSrc}
                        alt={resource.name}
                        onLoad={() => setImgLoaded(true)}
                        className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                    />
                    {/* overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* status pill */}
                    <span
                        className={`absolute top-5 right-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg backdrop-blur-md ${
                            isActive
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-rose-500/90 text-white'
                        }`}
                    >
                        {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {isActive ? 'Available' : 'Unavailable'}
                    </span>

                    {/* title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <p className="text-xs font-bold tracking-widest text-white/70 uppercase mb-1">
                            {prettyType(resource.type)}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
                            {resource.name}
                        </h1>
                        <p className="mt-1.5 text-sm text-white/80 flex items-center gap-1.5">
                            <MapPin size={14} /> {resource.location || 'Location not specified'}
                        </p>
                    </div>
                </div>

                {/* ── content area ── */}
                <div className="p-6 md:p-8">

                    {/* ── quick info cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {infoCards.map((card, i) => (
                            <div
                                key={i}
                                className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="p-1.5 rounded-lg bg-white shadow-sm border border-gray-100">
                                        {card.icon}
                                    </span>
                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                        {card.label}
                                    </span>
                                </div>
                                <p className="text-base font-bold text-gray-800 ml-0.5">{card.value}</p>
                            </div>
                        ))}
                    </div>


                    {/* ── description / details section ── */}
                    {resource.description && (
                        <div className="mb-8">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <Info size={16} className="text-gray-400" /> Description
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
                                {resource.description}
                            </p>
                        </div>
                    )}

                    {/* ── action buttons ── */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            type="button"
                            disabled={!isActive}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
                        >
                            <Calendar size={18} />
                            {isActive ? 'Book This Resource' : 'Currently Unavailable'}
                        </button>
                        <Link
                            to="/resources"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            <ArrowLeft size={18} />
                            Browse Catalogue
                        </Link>
                    </div>
                    {/* NEW: Booking Calendar Section */}
                    <div className="mt-12">
                        <BookingCalendar
                            resourceId={resource.id}
                            resourceName={resource.name}
                            isResourceActive={resource.status === 'ACTIVE'}
                            onBookingCreated={handleBookingCreated}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceDetail;
