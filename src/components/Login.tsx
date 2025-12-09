import { useState, useEffect, useRef } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, saveLoginTimestamp, updateSocialFollowers } from '../lib/firebase';
import { Mail, Lock, User, Eye, EyeOff, AlertTriangle, Shield, ShieldCheck } from 'lucide-react';

// Security configuration
const SECURITY_CONFIG = {
  maxAttempts: 3,
  baseLockoutMinutes: 5,
  lockoutMultiplier: 2, // Progressive lockout
  minTimeBetweenAttempts: 1000, // 1 second minimum between attempts
  maxLockoutMinutes: 60,
  minInteractionTime: 2000, // Minimum time (ms) a user must be on page before login (anti-bot)
};

interface SecurityState {
  attempts: number;
  lockoutUntil: number;
  lockoutCount: number; // How many times user has been locked out
  lastAttemptTime: number;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mountTime] = useState(Date.now());

  // Honeypot field - bots will fill this
  const [honeypot, setHoneypot] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Security States
  const [securityState, setSecurityState] = useState<SecurityState>(() => {
    const stored = localStorage.getItem('loginSecurity');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { attempts: 0, lockoutUntil: 0, lockoutCount: 0, lastAttemptTime: 0 };
      }
    }
    return { attempts: 0, lockoutUntil: 0, lockoutCount: 0, lastAttemptTime: 0 };
  });

  const [timeLeft, setTimeLeft] = useState(0);
  const [emailError, setEmailError] = useState('');

  // Persist security state
  useEffect(() => {
    localStorage.setItem('loginSecurity', JSON.stringify(securityState));
  }, [securityState]);

  // Check lockout status
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (securityState.lockoutUntil > now) {
        setTimeLeft(Math.ceil((securityState.lockoutUntil - now) / 1000));
      } else {
        setTimeLeft(0);
        if (securityState.lockoutUntil !== 0) {
          // Lockout expired - reset attempts but keep lockoutCount
          setSecurityState(prev => ({
            ...prev,
            lockoutUntil: 0,
            attempts: 0,
          }));
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [securityState.lockoutUntil]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      setEmailError('El correo es requerido');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Formato de correo inválido');
      return false;
    }
    // Check for suspicious patterns
    if (email.includes('..') || email.startsWith('.') || email.includes(' ')) {
      setEmailError('Formato de correo inválido');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Calculate progressive lockout time
  const calculateLockoutTime = (lockoutCount: number): number => {
    const minutes = Math.min(
      SECURITY_CONFIG.baseLockoutMinutes * Math.pow(SECURITY_CONFIG.lockoutMultiplier, lockoutCount),
      SECURITY_CONFIG.maxLockoutMinutes
    );
    return minutes * 60 * 1000;
  };

  const handleLogin = async () => {
    const now = Date.now();

    // Check if locked out
    if (timeLeft > 0) return;

    // Check honeypot - if filled, it's likely a bot
    if (honeypot) {
      // Silently fail for bots - don't give them information
      setError('Error de autenticación. Intente de nuevo.');
      return;
    }

    // Rate limiting - prevent rapid attempts
    if (now - securityState.lastAttemptTime < SECURITY_CONFIG.minTimeBetweenAttempts) {
      setError('Por favor espere antes de intentar de nuevo.');
      return;
    }

    // Anti-bot: Check if form was submitted too quickly
    if (now - mountTime < SECURITY_CONFIG.minInteractionTime) {
      setError('Verificando seguridad browser... Intente nuevamente en unos segundos.');
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      return;
    }

    // Validate password is not empty
    if (!password) {
      setError('La contraseña es requerida.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Update last attempt time
    setSecurityState(prev => ({ ...prev, lastAttemptTime: now }));

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Success: Clear all security counters
      setSecurityState({
        attempts: 0,
        lockoutUntil: 0,
        lockoutCount: 0,
        lastAttemptTime: 0,
      });
      localStorage.removeItem('loginSecurity');

      saveLoginTimestamp();

      // Actualizar datos de seguidores de redes sociales
      await updateSocialFollowers();
    } catch (error: any) {
      // Failed attempt
      const newAttempts = securityState.attempts + 1;

      if (newAttempts >= SECURITY_CONFIG.maxAttempts) {
        const newLockoutCount = securityState.lockoutCount + 1;
        const lockoutDuration = calculateLockoutTime(securityState.lockoutCount);
        const lockoutTime = now + lockoutDuration;

        setSecurityState({
          attempts: newAttempts,
          lockoutUntil: lockoutTime,
          lockoutCount: newLockoutCount,
          lastAttemptTime: now,
        });

        const lockoutMinutes = Math.ceil(lockoutDuration / 60000);
        setError(`Límite de intentos excedido. Bloqueado por ${lockoutMinutes} minuto${lockoutMinutes > 1 ? 's' : ''}.`);
      } else {
        setSecurityState(prev => ({
          ...prev,
          attempts: newAttempts,
          lastAttemptTime: now,
        }));
        setError(`Credenciales incorrectas. Intentos restantes: ${SECURITY_CONFIG.maxAttempts - newAttempts}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  const isLocked = timeLeft > 0;
  const attemptsRemaining = SECURITY_CONFIG.maxAttempts - securityState.attempts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-4 shadow-2xl">
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">De Belingo Con Ángel</h1>
          <p className="text-white/80">Panel de Administración</p>
        </div>

        {/* Security Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full border border-white/20">
            {isLocked ? (
              <>
                <Shield className="h-4 w-4 text-red-300" />
                <span className="text-xs text-red-200 font-medium">Acceso Bloqueado</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/60 font-medium">Conexión Segura</span>
              </>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Iniciar Sesión</h2>

          {isLocked ? (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-6 text-center mb-6">
              <div className="relative">
                <AlertTriangle className="h-12 w-12 text-red-200 mx-auto mb-3 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Acceso Temporalmente Bloqueado</h3>
              <p className="text-red-100 mb-4">Se han detectado múltiples intentos fallidos.</p>
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-4xl font-mono text-white mb-1">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-white/60 text-xs">Tiempo restante de bloqueo</p>
              </div>
              {securityState.lockoutCount > 1 && (
                <p className="text-yellow-200/80 text-xs mt-3">
                  ⚠️ Bloqueos repetidos: {securityState.lockoutCount}. El tiempo de bloqueo aumenta progresivamente.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Attempts Warning */}
              {securityState.attempts > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-200 flex-shrink-0" />
                  <p className="text-yellow-100 text-sm">
                    {attemptsRemaining === 1
                      ? '¡Último intento! Su cuenta será bloqueada temporalmente.'
                      : `Intentos restantes: ${attemptsRemaining}`}
                  </p>
                </div>
              )}

              {/* Honeypot - Hidden from users, visible to bots */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <input
                  ref={honeypotRef}
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Email */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/60" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  onKeyPress={handleKeyPress}
                  placeholder="Correo electrónico"
                  className={`w-full pl-10 pr-4 py-3 bg-white/20 border rounded-xl
                             text-white placeholder-white/60 focus:outline-none focus:ring-2 
                             transition-all duration-300
                             ${emailError
                      ? 'border-red-400/50 focus:ring-red-400/50'
                      : 'border-white/30 focus:ring-white/50 focus:border-white/50'
                    }`}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-red-300 text-xs mt-1 ml-1">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/60" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Contraseña"
                  className="w-full pl-10 pr-12 py-3 bg-white/20 border border-white/30 rounded-xl
                             text-white placeholder-white/60 focus:outline-none focus:ring-2 
                             focus:ring-white/50 focus:border-white/50 transition-all duration-300"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-white/60 hover:text-white transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-white/60 hover:text-white transition-colors" />
                  )}
                </button>
              </div>

              {/* Login Button */}
              <div className="space-y-3">
                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full bg-white text-purple-600 font-semibold py-3 px-4 rounded-xl
                             hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/30
                             transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                             shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      <span>Iniciar Sesión Seguro</span>
                    </div>
                  )}
                </button>
              </div>
            </>
          )}

          {error && !isLocked && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl animate-shake">
              <p className="text-red-200 text-sm text-center font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Security Footer */}
        <p className="text-center text-white/50 text-xs mt-6">
          🔒 Protegido con autenticación segura
        </p>
      </div>
    </div>
  );
}