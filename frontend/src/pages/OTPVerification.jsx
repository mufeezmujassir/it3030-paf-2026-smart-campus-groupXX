import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Shield, Info, RefreshCw, Key, ArrowLeft, Leaf } from 'lucide-react';

const OTPVerification = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const { verifyOtp } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inputRefs = useRef([]);

    // Check URL first, then localStorage
    const [email, setEmail] = useState(searchParams.get('tempEmail') || localStorage.getItem('tempEmail') || '');
    const [qrCodeUrl, setQrCodeUrl] = useState(searchParams.get('qrCodeUrl') || localStorage.getItem('qrCodeUrl') || '');
    const [secretKey, setSecretKey] = useState(searchParams.get('secretKey') || localStorage.getItem('secretKey') || '');
    const [showSetup, setShowSetup] = useState(!!(qrCodeUrl || secretKey));

    useEffect(() => {
        const urlEmail = searchParams.get('tempEmail');
        const urlQr = searchParams.get('qrCodeUrl');
        const urlSecret = searchParams.get('secretKey');

        if (urlEmail) {
            localStorage.setItem('tempEmail', urlEmail);
            setEmail(urlEmail);
        }
        if (urlQr) {
            localStorage.setItem('qrCodeUrl', urlQr);
            setQrCodeUrl(urlQr);
            setShowSetup(true);
        }
        if (urlSecret) {
            localStorage.setItem('secretKey', urlSecret);
            setSecretKey(urlSecret);
            setShowSetup(true);
        }

        // If no email found in either place, redirect to login
        if (!urlEmail && !localStorage.getItem('tempEmail')) {
            navigate('/login');
        }
    }, [searchParams, navigate]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input
        if (value !== '' && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain').slice(0, 6).split('');
        if (pastedData.some(isNaN)) return;

        const newOtp = [...otp];
        pastedData.forEach((val, i) => {
            if (i < 6) newOtp[i] = val;
        });
        setOtp(newOtp);
        if (pastedData.length > 0) {
            const focusIndex = Math.min(pastedData.length, 5);
            inputRefs.current[focusIndex].focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return;

        setLoading(true);
        try {
            await verifyOtp(email, otpCode);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-4">
            {/* Header */}
            <header className="w-full bg-white border-b border-gray-200 py-3 px-6 flex justify-between items-center sm:px-12">
                <div className="flex items-center space-x-2 text-primary">
                    <Leaf className="w-6 h-6" />
                    <span className="text-xl font-bold tracking-tight">MapleLink</span>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="text-sm font-medium border border-gray-200 rounded-md px-4 py-2 hover:bg-gray-50 transition"
                >
                    Sign In
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center -mt-10 p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-12 max-w-md w-full text-center">

                    <div className="w-16 h-16 bg-red-50 text-primary border border-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-8 h-8" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Verification</h2>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">
                        Enter the 6-digit code from your authenticator app or sent to your device.
                    </p>

                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6 flex items-start text-left space-x-3">
                        <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Identity Confirmed via SSO</p>
                            <p className="text-xs text-gray-600 mt-1">Verification required for {email}</p>
                        </div>
                    </div>

                    {showSetup && (
                        <div className="mb-8 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">First Time Setup</h3>
                            <p className="text-xs text-text-secondary mb-4">Scan this QR code with Google Authenticator to link your account.</p>

                            <div className="bg-white p-3 rounded-xl inline-block border border-orange-100 shadow-sm mb-4">
                                <img
                                    src={`${import.meta.env.VITE_QR_API_URL}?size=160x160&data=${encodeURIComponent(qrCodeUrl)}`}
                                    alt="QR Code"
                                    className="w-40 h-40"
                                />
                            </div>

                            <div className="text-left space-y-2">
                                <p className="text-[10px] font-bold text-text-secondary uppercase">Manual Entry Key</p>
                                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-orange-100">
                                    <code className="text-xs font-mono font-bold text-primary tracking-widest">{secretKey}</code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(secretKey);
                                            toast.success('Key copied to clipboard');
                                        }}
                                        className="text-[10px] bg-orange-50 text-primary px-2 py-1 rounded font-bold hover:bg-orange-100 transition"
                                    >
                                        COPY
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSetup(false)}
                                className="mt-4 text-xs font-bold text-primary hover:underline underline-offset-4"
                            >
                                I've scanned the code
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="flex justify-between gap-2 mb-8" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-14 sm:w-14 sm:h-16 border border-gray-300 rounded-lg text-center text-2xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white shadow-sm transition-all"
                                    required
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length !== 6}
                            className="w-full py-3.5 px-4 bg-[#E0A994] hover:bg-[#d4947d] text-white rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center justify-center mb-6"
                        >
                            <span className="flex items-center space-x-2">
                                <Key className="w-5 h-5" />
                                <span>{loading ? 'Verifying...' : 'Verify Identity'}</span>
                            </span>
                        </button>
                    </form>

                    <div className="flex space-x-4 mb-8">
                        <button className="flex-1 py-2.5 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            <RefreshCw className="w-4 h-4 mr-2 text-gray-500" />
                            Resend Code
                        </button>
                        <button className="flex-1 py-2.5 flex items-center justify-center border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            <Key className="w-4 h-4 mr-2 text-gray-500" />
                            Backup Code
                        </button>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center w-full text-sm font-medium text-gray-500 hover:text-gray-800 transition group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to sign in
                    </button>
                </div>

                <p className="mt-8 text-sm text-gray-500 text-center max-w-sm">
                    Having trouble? If you've lost access to your device, please contact the <span className="text-primary font-medium">Campus IT Support Desk.</span>
                </p>
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 py-4 px-6 sm:px-12 flex justify-between items-center text-xs text-gray-500">
                <p>
                    <span className="font-semibold text-primary inline-flex items-center">
                        <Leaf className="w-3 h-3 mr-1" />MapleLink
                    </span> © 2026 MapleLink Systems. All rights reserved.
                </p>
                <div className="flex space-x-4">
                    <a href="#" className="hover:text-primary">Documentation</a>
                    <a href="#" className="hover:text-primary">Privacy Policy</a>
                    <span className="flex items-center text-green-600 font-medium">
                        <Shield className="w-3 h-3 mr-1" /> System Secure
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default OTPVerification;
