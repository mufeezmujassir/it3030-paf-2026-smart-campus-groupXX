import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Leaf, Lock, Mail, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import loginBg from '../assets/loginbg.jpg';

const Login = () => {
    const { login } = useAuth();
    const location = useLocation();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        if (error) {
            toast.error(error === 'Access Denied: You are not registered in the system' 
                ? 'Credential failed: You don\'t have access to login' 
                : error);
        }
    }, [location]);

    const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

    const handleLocalSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(credentials);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setLoading(true);
        window.location.href = 'http://localhost:8080/oauth2/authorization/google';
    };

    return (
        <div className="flex min-h-screen bg-surface font-sans">
            {/* Left Side: Branding/Image */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary flex-col justify-between p-12 text-white overflow-hidden">
                <img 
                    src={loginBg} 
                    alt="Campus Background" 
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 z-0"></div>
                <div className="relative z-10 flex items-center space-x-2">
                    <Leaf className="w-8 h-8" />
                    <span className="text-2xl font-bold tracking-tight">MapleLink</span>
                </div>
                
                <div className="relative z-10 max-w-lg mt-16 mb-auto">
                    <h1 className="text-6xl font-extrabold leading-tight mb-6">
                        Cultivating Excellence, Connecting Campus.
                    </h1>
                    <p className="text-xl text-white/80 mb-12">
                        Experience a unified ecosystem for learning management, facility scheduling, and technical support—all under one roof.
                    </p>
                    
                    <div className="flex space-x-12 mt-8">
                        <div>
                            <p className="text-3xl font-bold">12k+</p>
                            <p className="text-sm font-semibold uppercase text-white/70 mt-1">Active Students</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold">98%</p>
                            <p className="text-sm font-semibold uppercase text-white/70 mt-1">System Uptime</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center space-x-2 mt-auto text-sm text-white/80 font-medium pb-4">
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span>Verified Enterprise SSO Enabled</span>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col pt-6 px-4 sm:px-12 lg:px-24 xl:px-32">
                <div className="flex justify-between items-center w-full mb-12">
                     <div className="lg:hidden flex items-center space-x-2 text-primary">
                        <Leaf className="w-6 h-6" />
                        <span className="text-xl font-bold">MapleLink</span>
                     </div>
                     <button className="text-sm font-medium border border-gray-200 rounded-md px-4 py-2 hover:bg-gray-50 transition ml-auto">
                         Sign In
                     </button>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
                    <h2 className="text-3xl font-bold text-text-primary mb-2">Sign in to MapleLink</h2>
                    <p className="text-text-secondary mb-8">Welcome back! Please enter your details or use SSO.</p>

                    <button
                        onClick={() => handleGoogleLogin()}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-3 border border-gray-200 rounded-lg py-3 px-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors mb-6 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="font-semibold text-gray-700">Sign in with Google Workspace</span>
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm font-medium">
                            <span className="px-4 bg-surface text-gray-500 tracking-wider">ADMIN CREDENTIALS</span>
                        </div>
                    </div>

                    <form onSubmit={handleLocalSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-text-primary">Institutional Username</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="e.g. admin@campus.com"
                                    value={credentials.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-text-primary">Security Password</label>
                                <a href="#" className="text-sm font-medium text-primary hover:text-accent">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pb-2">
                            <input type="checkbox" id="stay-signed-in" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary" />
                            <label htmlFor="stay-signed-in" className="text-sm text-text-secondary">Stay signed in for 30 days</label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {loading ? 'Signing in...' : 'Sign In as Administrator'}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100 flex space-x-3 items-start">
                        <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-text-primary">Need technical assistance?</p>
                            <p className="text-sm text-text-secondary mt-1">
                                Contact the IT Help Desk at <a href="mailto:help@maplelink.edu" className="text-primary font-medium hover:underline">help@maplelink.edu</a> or visit the knowledge base.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-center border-t border-gray-100 mt-12">
                    <p className="text-text-secondary mb-4 sm:mb-0">
                        <span className="font-semibold text-primary inline-flex items-center"><Leaf className="w-3 h-3 mr-1"/>MapleLink</span> © 2024 MapleLink Systems. All rights reserved.
                    </p>
                    <div className="flex space-x-6 text-gray-500 font-medium">
                        <a href="#" className="hover:text-primary">Help Center</a>
                        <a href="#" className="hover:text-primary">Privacy Policy</a>
                        <a href="#" className="hover:text-primary">Terms of Use</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
