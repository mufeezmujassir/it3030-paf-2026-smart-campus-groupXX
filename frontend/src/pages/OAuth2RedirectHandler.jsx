import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Leaf, AlertCircle, ArrowLeft } from 'lucide-react';

const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginFromRedirect } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            setError(errorParam);
            toast.error(errorParam);
            return;
        }

        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const role = searchParams.get('role');
        const email = searchParams.get('email');

        if (token && refreshToken && role && email) {
            loginFromRedirect({ accessToken: token, refreshToken, role, email });
        } else {
            const msg = 'Invalid authentication response from server.';
            setError(msg);
            toast.error(msg);
        }
    }, [searchParams, loginFromRedirect]);

    if (error) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-sm animate-in zoom-in duration-300">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-text-primary tracking-tight">Access Restricted</h2>
                <p className="text-text-secondary mt-3 max-w-md leading-relaxed font-medium">
                    {error}
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Login</span>
                    </button>
                    <a
                        href="mailto:[EMAIL_ADDRESS]"
                        className="px-8 py-3 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
            <Leaf className="w-12 h-12 text-primary animate-pulse mb-4" />
            <h2 className="text-xl font-semibold text-text-primary">Authenticating...</h2>
            <p className="text-text-secondary mt-2">Please wait while we log you into MapleLink.</p>
        </div>
    );
};

export default OAuth2RedirectHandler;
