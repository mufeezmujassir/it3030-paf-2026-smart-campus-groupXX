import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Leaf } from 'lucide-react';

const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginFromRedirect } = useAuth(); // Need to add this to context

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error(decodeURIComponent(error));
            navigate('/login');
            return;
        }

        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const role = searchParams.get('role');
        const email = searchParams.get('email');

        if (token && refreshToken && role && email) {
            loginFromRedirect({ accessToken: token, refreshToken, role, email });
        } else {
            toast.error('Invalid authentication response from server.');
            navigate('/login');
        }
    }, [searchParams, navigate, loginFromRedirect]);

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
            <Leaf className="w-12 h-12 text-primary animate-pulse mb-4" />
            <h2 className="text-xl font-semibold text-text-primary">Authenticating...</h2>
            <p className="text-text-secondary mt-2">Please wait while we log you into MapleLink.</p>
        </div>
    );
};

export default OAuth2RedirectHandler;
