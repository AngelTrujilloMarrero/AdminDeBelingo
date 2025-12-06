import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, clearLoginTimestamp, getLoginTimestamp } from '../lib/firebase';
import { LogOut, User, Clock } from 'lucide-react';

interface HeaderProps {
  userEmail: string;
}

export default function Header({ userEmail }: HeaderProps) {
  const [sessionTime, setSessionTime] = useState<string>('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = getLoginTimestamp();
      if (start) {
        const now = Date.now();
        const diff = now - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setSessionTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearLoginTimestamp();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Título */}
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 hidden sm:block">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">De Belingo Con Ángel</h1>
              <p className="text-xs text-white/80 hidden sm:block">Panel de Administración</p>
            </div>
          </div>

          {/* User Info & Timer */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Session Timer */}
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="text-sm font-mono text-white font-medium">{sessionTime}</span>
            </div>

            {/* User Profile */}
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-white">{userEmail}</p>
              <p className="text-xs text-white/80">Administrador</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm 
                         transition-all duration-300 ease-in-out rounded-xl px-4 py-2 
                         text-white hover:scale-105 active:scale-95 border border-white/10"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}