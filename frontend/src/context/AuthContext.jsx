import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const role = localStorage.getItem('userRole');
        const email = localStorage.getItem('userEmail');
        const fullName = localStorage.getItem('userFullName');
        const id = localStorage.getItem('userId');        // ← add this

        if (token && role && email) {
            setUser({ id, email, role, fullName });       // ← add id here
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const { data } = await api.post('/auth/login', credentials);
            handleAuthResponse(data);
            return true;
        } catch (error) {
            const errorMsg = error.response?.status === 401 
                ? 'Wrong credentials. Please check your email and password.' 
                : (error.response?.data?.message || 'Login failed');
            toast.error(errorMsg);
            return false;
        }
    };

    const googleLogin = async (idToken, email) => {
        try {
            const { data } = await api.post('/auth/oauth-login', { token: idToken, email });
            handleAuthResponse(data);
            return true;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Google Login failed';
            toast.error(errorMsg);
            return false;
        }
    };

    const verifyOtp = async (email, otp) => {
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            handleAuthResponse(data);
            return true;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Invalid OTP';
            toast.error(errorMsg);
            return false;
        }
    };

    const handleAuthResponse = (data) => {
        if (data.requiresOtp) {
            localStorage.setItem('tempEmail', data.email);
            if (data.qrCodeUrl) localStorage.setItem('qrCodeUrl', data.qrCodeUrl);
            if (data.secretKey) localStorage.setItem('secretKey', data.secretKey);
            navigate('/otp');
            return;
        }

        const { id, accessToken, refreshToken, role, email, fullName } = data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userEmail', email);
        if (fullName) localStorage.setItem('userFullName', fullName);
        if (id) localStorage.setItem('userId', id);

        setUser({ id, email, role, fullName: fullName || localStorage.getItem('userFullName') });
        
        toast.success('Login successful!');
        
        switch (role) {
            case 'ADMIN': navigate('/admin'); break;
            case 'STUDENT': navigate('/student'); break;
            case 'STAFF': navigate('/staff'); break;
            case 'TECHNICIAN': navigate('/technician'); break;
            default: navigate('/dashboard');
        }
    };

    const loginFromRedirect = (data) => {
        handleAuthResponse(data);
    };

    const updateUser = (data) => {
        const { role, email, fullName } = data;
        if (role) localStorage.setItem('userRole', role);
        if (email) localStorage.setItem('userEmail', email);
        if (fullName) localStorage.setItem('userFullName', fullName);
        
        setUser(prev => ({ 
            ...prev, 
            ...(role && { role }), 
            ...(email && { email }), 
            ...(fullName && { fullName }) 
        }));
    };

    const logout = () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('tempEmail');
        setUser(null);
        navigate('/login');
        toast.info('Logged out successfully');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, googleLogin, verifyOtp, logout, loginFromRedirect, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
