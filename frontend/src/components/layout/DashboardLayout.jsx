import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-surface overflow-hidden">
            {/* Sidebar with overlay on mobile */}
            <>
                {/* Mobile Backdrop */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
                        onClick={toggleSidebar}
                    />
                )}
                <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
            </>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header toggleSidebar={toggleSidebar} />
                
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
