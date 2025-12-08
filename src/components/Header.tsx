import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { NavLink, useLocation } from 'react-router-dom';
import { auth, clearLoginTimestamp, getLoginTimestamp } from '../lib/firebase';
import { LogOut, User, Clock, CalendarDays, BarChart3, ListTodo, Menu, X } from 'lucide-react';

interface HeaderProps {
  userEmail: string;
}

export default function Header({ userEmail }: HeaderProps) {
  const [sessionTime, setSessionTime] = useState<string>('00:00:00');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

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

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo/Título */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 hidden sm:block">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">De Belingo</h1>
                <p className="text-xs text-white/80 hidden sm:block">Panel Admin</p>
              </div>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <ListTodo className="w-4 h-4" />
                Gestión
              </NavLink>
              <NavLink
                to="/agenda"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <BarChart3 className="w-4 h-4" />
                Estadísticas
              </NavLink>
            </nav>
          </div>

          {/* User Info & Timer */}
          <div className="flex items-center gap-2 md:gap-6">
            {/* Session Timer */}
            <div className="hidden lg:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="text-sm font-mono text-white font-medium">{sessionTime}</span>
            </div>

            {/* User Profile */}
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-white">{userEmail}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm 
                         transition-all duration-300 ease-in-out rounded-xl px-3 py-2 
                         text-white hover:scale-105 active:scale-95 border border-white/10"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-indigo-700/95 backdrop-blur-lg border-t border-white/10 absolute w-full z-40 animate-slide-down shadow-xl">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <NavLink
              to="/"
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${isActive
                  ? 'bg-white text-indigo-600 shadow-lg translate-x-1'
                  : 'text-white/90 hover:bg-white/10 hover:translate-x-1'
                }`
              }
            >
              <div className={`p-2 rounded-lg ${location.pathname === '/' ? 'bg-indigo-100/50' : 'bg-white/5'}`}>
                <ListTodo className={`w-5 h-5 ${location.pathname === '/' ? 'text-indigo-600' : 'text-white'}`} />
              </div>
              Gestión de Eventos
            </NavLink>

            <NavLink
              to="/agenda"
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${isActive
                  ? 'bg-white text-indigo-600 shadow-lg translate-x-1'
                  : 'text-white/90 hover:bg-white/10 hover:translate-x-1'
                }`
              }
            >
              <div className={`p-2 rounded-lg ${location.pathname === '/agenda' ? 'bg-indigo-100/50' : 'bg-white/5'}`}>
                <BarChart3 className={`w-5 h-5 ${location.pathname === '/agenda' ? 'text-indigo-600' : 'text-white'}`} />
              </div>
              Estadísticas
            </NavLink>

            <div className="pt-4 mt-2 border-t border-white/10">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <p className="text-white font-medium">{userEmail}</p>
                    <p className="text-white/60 text-xs">Sesión: {sessionTime}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}