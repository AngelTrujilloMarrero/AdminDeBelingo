import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, LogOut, CheckCircle } from 'lucide-react';

// Configuration
const INACTIVITY_WARNING_MS = 14 * 60 * 1000; // 14 minutes
const LOGOUT_COUNTDOWN_MS = 30 * 1000; // 30 seconds
const TOTAL_MAX_IDLE_MS = INACTIVITY_WARNING_MS + LOGOUT_COUNTDOWN_MS;

interface SessionTimeoutProps {
    onLogout: () => void;
    onStayConnected: () => void;
    isActive: boolean;
}

export default function SessionTimeout({ onLogout, onStayConnected, isActive }: SessionTimeoutProps) {
    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(LOGOUT_COUNTDOWN_MS / 1000);

    // Initialize from storage or current time
    const getInitialActivity = () => {
        const stored = sessionStorage.getItem('lastActivityTimestamp');
        return stored ? parseInt(stored, 10) : Date.now();
    };

    const lastActivityRef = useRef(getInitialActivity());
    const lastStorageUpdateRef = useRef(Date.now());

    // Check for inactivity periodically
    useEffect(() => {
        if (!isActive) return;

        const checkInactivity = () => {
            // Si el usuario marcó "Recordarme", deshabilitamos el timeout por inactividad
            // para una experiencia más permisible.
            const isRemembered = localStorage.getItem('rememberMe') === 'true';
            if (isRemembered) return;

            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            if (timeSinceLastActivity > TOTAL_MAX_IDLE_MS) {
                // Time exceeded (e.g. device was sleeping for a long time)
                onLogout();
            } else if (timeSinceLastActivity > INACTIVITY_WARNING_MS) {
                // Warning phase
                if (!showModal) {
                    setShowModal(true);
                }
                const remaining = Math.ceil((TOTAL_MAX_IDLE_MS - timeSinceLastActivity) / 1000);
                setCountdown(remaining > 0 ? remaining : 0);
            }
        };

        const intervalId = setInterval(checkInactivity, 1000);

        return () => clearInterval(intervalId);
    }, [isActive, onLogout, showModal]);

    // Activity listener with throttling
    useEffect(() => {
        if (!isActive || showModal) return;

        const handleActivity = () => {
            const now = Date.now();
            // Update ref immediately for local checks
            lastActivityRef.current = now;

            // Throttle storage writes (every 5 seconds)
            if (now - lastStorageUpdateRef.current > 5000) {
                sessionStorage.setItem('lastActivityTimestamp', now.toString());
                lastStorageUpdateRef.current = now;
            }
        };

        // Added touchmove and other events for better mobile support
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove', 'click'];

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [isActive, showModal]);

    // Handle "Stay Connected"
    const handleStayConnected = useCallback(() => {
        const now = Date.now();
        lastActivityRef.current = now;
        sessionStorage.setItem('lastActivityTimestamp', now.toString());
        setShowModal(false);
        onStayConnected();
    }, [onStayConnected]);

    if (!showModal) return null;

    // Format countdown for display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">

                {/* Header de Alerta */}
                <div className="bg-red-500 p-6 flex justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-600/20 animate-pulse"></div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm relative z-10 shadow-lg">
                        <Clock className="w-10 h-10 text-white" />
                    </div>
                </div>

                <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                        ¿Sigues ahí?
                    </h3>

                    <p className="text-gray-600 mb-6">
                        Hemos detectado inactividad. Para proteger tu seguridad, tu sesión se cerrará automáticamente en:
                    </p>

                    <div className="flex items-center justify-center gap-2 mb-8 bg-gray-50 py-4 rounded-xl border border-gray-100">
                        <span className={`text-4xl font-mono font-bold ${countdown <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                            {formatTime(countdown)}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleStayConnected}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 
                       text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/30
                       transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Continuar en la sesión
                        </button>

                        <button
                            onClick={onLogout}
                            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl
                       border-2 border-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
