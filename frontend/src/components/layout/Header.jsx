import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Menu, User, Settings, LogOut, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();

    return (
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

                {/* Dashboard Search */}
                <div className="hidden md:flex flex-1 max-w-lg ml-4">
                    <div className="relative group w-full">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text"
                            placeholder="Unified campus search..."
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner"
                        />
                    </div>
                </div>
            </div>
            
            {/* Right: Actions & Profile */}
            <div className="flex items-center space-x-2 sm:space-x-6">
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <button className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm ring-2 ring-red-500/10 animate-pulse"></span>
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
    );
};

export default Header;
