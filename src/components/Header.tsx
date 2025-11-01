import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  userEmail: string;
}

export default function Header({ userEmail }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
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
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">De Belingo Con Ángel</h1>
              <p className="text-xs text-white/80">Panel de Administración</p>
            </div>
          </div>

          {/* Usuario y Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{userEmail}</p>
              <p className="text-xs text-white/80">Administrador</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm 
                         transition-all duration-300 ease-in-out rounded-xl px-4 py-2 
                         text-white hover:scale-105 active:scale-95"
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