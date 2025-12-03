import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, saveLoginTimestamp } from '../lib/firebase';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Guardar el timestamp del login
      saveLoginTimestamp();
    } catch (error: any) {
      setError('Error al iniciar sesión: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-4">
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">De Belingo Con Ángel</h1>
          <p className="text-white/80">Panel de Administración</p>
        </div>

        {/* Formulario */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Iniciar Sesión</h2>

          {/* Email */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-white/60" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl
                         text-white placeholder-white/60 focus:outline-none focus:ring-2 
                         focus:ring-white/50 focus:border-white/50 transition-all duration-300"
            />
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
              placeholder="Contraseña"
              className="w-full pl-10 pr-12 py-3 bg-white/20 border border-white/30 rounded-xl
                         text-white placeholder-white/60 focus:outline-none focus:ring-2 
                         focus:ring-white/50 focus:border-white/50 transition-all duration-300"
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

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-white text-purple-600 font-semibold py-3 px-4 rounded-xl
                         hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/30
                         transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>

          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl">
              <p className="text-red-200 text-sm text-center font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}