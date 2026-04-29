// src/components/layout/Header.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Menu, User, Settings, LogOut, Leaf, X, AlertCircle, CheckCircle, Loader2, XCircle, PlusCircle, Trash2, Edit3, MessageSquare, Key, ShieldCheck, UserPlus, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';
import notificationService from '../../services/notificationService';

const Header = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const response = await notificationService.getUnreadCount();
            setUnreadCount(response.data);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    const fetchNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const response = await notificationService.getNotifications({ size: 20 });
            setNotifications(response.data.content || response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const openNotifications = () => {
        setShowNotifications(true);
        fetchNotifications();
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'RESOURCE_CREATED':
                return <PlusCircle className="w-5 h-5 text-emerald-500" />;
            case 'RESOURCE_UPDATED':
                return <Edit3 className="w-5 h-5 text-amber-500" />;
            case 'RESOURCE_DELETED':
                return <Trash2 className="w-5 h-5 text-rose-500" />;
            case 'USER_CREATED':
                return <UserPlus className="w-5 h-5 text-emerald-500" />;
            case 'USER_DELETED':
                return <UserMinus className="w-5 h-5 text-rose-500" />;
            case 'TICKET_CREATED':
                return <PlusCircle className="w-5 h-5 text-primary" />;
            case 'TICKET_ASSIGNED':
                return <User className="w-5 h-5 text-amber-500" />;
            case 'TICKET_STATUS_CHANGED':
                return <AlertCircle className="w-5 h-5 text-blue-500" />;
            case 'TICKET_RESOLVED':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'TICKET_REJECTED':
                return <XCircle className="w-5 h-5 text-rose-500" />;
            case 'TICKET_COMMENT':
                return <MessageSquare className="w-5 h-5 text-blue-400" />;
            case 'LOGIN_SUCCESS':
                return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
            case 'PROFILE_UPDATED':
                return <User className="w-5 h-5 text-amber-500" />;
            case 'PASSWORD_CHANGED':
                return <Key className="w-5 h-5 text-amber-500" />;
            case 'MFA_TOGGLED':
                return <ShieldCheck className="w-5 h-5 text-primary" />;
            case 'BOOKING_EXPIRING_SOON':
                return <AlertCircle className="w-5 h-5 text-amber-500" />;
            case 'BOOKING_EXPIRED':
                return <XCircle className="w-5 h-5 text-rose-500" />;
            case 'BOOKING_APPROVED':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'BOOKING_REJECTED':
                return <XCircle className="w-5 h-5 text-rose-500" />;
            case 'BOOKING_CREATED':
                return <Bell className="w-5 h-5 text-primary" />;
            case 'BOOKING_UPDATED':
                return <Bell className="w-5 h-5 text-accent" />;
            default:
                return <Bell className="w-5 h-5 text-primary" />;
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    return (
        <>
            <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md bg-white/80">
                {/* Left: Mobile Menu & Logo */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Mobile-only Branding */}
                    <div className="lg:hidden flex items-center space-x-2 text-primary group">
                        <Leaf className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="text-lg font-black tracking-tighter">MapleLink</span>
                    </div>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center space-x-2 sm:space-x-6">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                            onClick={openNotifications}
                            className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm ring-2 ring-red-500/10 animate-pulse"></span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center group">
                        <div className="h-10 w-px bg-gray-100 mx-2 sm:mx-4 hidden sm:block" />
                        <div className="flex items-center space-x-4 pl-2 sm:pl-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-text-primary leading-tight tracking-tight">
                                    {user?.fullName || 'MapleLink User'}
                                </p>
                                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest px-2 py-0.5 bg-primary/10 rounded-lg mt-0.5 inline-block">
                                    {user?.role || 'Guest'}
                                </span>
                            </div>

                            {/* Profile Dropdown Simulation / Link */}
                            <Link to="/settings" className="relative transition-all hover:scale-105 active:scale-95">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-base overflow-hidden relative group">
                                    {user?.fullName?.charAt(0).toUpperCase() || <User size={18} />}
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm ring-2 ring-green-500/10" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Notification Panel */}
            {showNotifications && (
                <>
                    <div
                        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40"
                        onClick={() => setShowNotifications(false)}
                    />
                    <div className="fixed top-20 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-bold text-text-primary">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-primary hover:text-primary-hover transition"
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowNotifications(false)}
                                        className="p-1 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {loadingNotifications ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-8">
                                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-text-secondary">No notifications</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${
                                            !notification.isRead ? 'bg-primary/5' : ''
                                        }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <h4 className="text-sm font-semibold text-text-primary">
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-text-secondary mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-text-secondary mt-2">
                                                    {formatDate(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;