import { useState, useEffect } from 'react';

const SLATimer = ({ slaDeadline, status, compact = false }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    const [breached, setBreached] = useState(false);

    useEffect(() => {
        if (!slaDeadline || ['CLOSED', 'RESOLVED', 'REJECTED'].includes(status)) {
            return;
        }

        const calculate = () => {
            const now = new Date();
            const deadline = new Date(slaDeadline);
            const diff = deadline - now;

            if (diff <= 0) {
                setBreached(true);
                setTimeLeft(null);
                return;
            }

            setBreached(false);
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ hours, minutes, seconds, diff });
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [slaDeadline, status]);

    // Ticket is resolved/closed — show completed
    if (['CLOSED', 'RESOLVED'].includes(status)) {
        return compact ? null : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                <span className="text-xs font-bold text-green-600">✅ SLA Met</span>
            </div>
        );
    }

    // No deadline set
    if (!slaDeadline) return null;

    // SLA breached
    if (breached) {
        return compact ? (
            <span className="text-xs font-bold text-red-600 animate-pulse">
                🔴 BREACHED
            </span>
        ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 animate-pulse">
                <span className="text-xs font-bold text-red-600">🔴 SLA BREACHED</span>
            </div>
        );
    }

    if (!timeLeft) return null;

    // Color based on time remaining
    const isUrgent = timeLeft.diff < 2 * 60 * 60 * 1000;    // under 2 hours
    const isWarning = timeLeft.diff < 8 * 60 * 60 * 1000;   // under 8 hours

    const color = isUrgent ? {
        bg: 'bg-red-50', border: 'border-red-200',
        text: 'text-red-600', icon: '🔴'
    } : isWarning ? {
        bg: 'bg-orange-50', border: 'border-orange-200',
        text: 'text-orange-600', icon: '🟠'
    } : {
        bg: 'bg-green-50', border: 'border-green-200',
        text: 'text-green-600', icon: '🟢'
    };

    if (compact) {
        return (
            <span className={`text-xs font-bold ${color.text}`}>
                {color.icon} {timeLeft.hours}h {timeLeft.minutes}m
            </span>
        );
    }

    return (
        <div className={`rounded-2xl border p-4 ${color.bg} ${color.border}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${color.text}`}>
                ⏱ SLA Resolution Timer
            </p>
            <p className={`text-3xl font-black ${color.text}`}>
                {String(timeLeft.hours).padStart(2, '0')}h{' '}
                {String(timeLeft.minutes).padStart(2, '0')}m{' '}
                {String(timeLeft.seconds).padStart(2, '0')}s
            </p>
            <div className="flex justify-between mt-2">
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Deadline: {new Date(slaDeadline).toLocaleString()}
                </p>
                <p className={`text-xs font-bold ${color.text}`}>
                    {isUrgent ? 'CRITICAL' : isWarning ? 'WARNING' : 'ON TRACK ✅'}
                </p>
            </div>
        </div>
    );
};

export default SLATimer;