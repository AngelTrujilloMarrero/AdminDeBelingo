import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db, isSessionExpired, clearLoginTimestamp, saveLoginTimestamp } from './lib/firebase';
import { Event } from './types/event';
import Header from './components/Header';
import Login from './components/Login';
import SessionTimeout from './components/SessionTimeout';
import MainPage from './components/MainPage';
import AgendaPage from './components/AgendaPage';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verificar si la sesión ha expirado
        if (isSessionExpired()) {
          // Cerrar sesión si ha expirado
          await performLogout();
          return;
        }

        // Si el usuario está autenticado y la sesión no ha expirado, actualizar el timestamp
        // Esto permite que la sesión se extienda si el usuario sigue activo
        saveLoginTimestamp();
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Verificar periódicamente si la sesión ha expirado (backup check)
  useEffect(() => {
    if (!user) return;

    // Verificar cada minuto si la sesión ha expirado
    const intervalId = setInterval(async () => {
      if (isSessionExpired()) {
        await performLogout();
      }
    }, 60000); // 60000ms = 1 minuto

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (user) {
      const eventsRef = ref(db, 'events');
      const unsubscribe = onValue(eventsRef, snapshot => {
        const loadedEvents: Event[] = [];
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            loadedEvents.push({ id: key, ...value });
          });
        }
        setEvents(loadedEvents);

        // Aplicar filtro inicial de 2 días
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const filtered = loadedEvents.filter(event => {
          const eventDate = new Date(event.day);
          return eventDate >= twoDaysAgo;
        });
        setFilteredEvents(filtered);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const performLogout = async () => {
    try {
      await signOut(auth);
      clearLoginTimestamp();
      sessionStorage.removeItem('lastActivityTimestamp');
      setUser(null);
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const handleDateSelect = (date: string) => {
    // Establecer la fecha en el formulario
    const formContainer = document.getElementById('form-container');
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Si hay un evento siendo editado, cancelar la edición
    if (editingEvent) {
      setEditingEvent(null);
    }

    // Disparar evento personalizado para establecer la fecha
    window.dispatchEvent(new CustomEvent('dateSelected', { detail: date }));
  };

  const handleEventAdded = () => {
    setEditingEvent(null);
    // Los eventos se actualizan automáticamente por onValue
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    const formContainer = document.getElementById('form-container');
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
  };

  const handleFilterChange = (filtered: Event[]) => {
    setFilteredEvents(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-xl font-semibold text-gray-700">Cargando...</p>
          <p className="text-gray-500 mt-2">Iniciando aplicación</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const userEmail = user.email || 'Usuario';

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header moderno */}
        <Header userEmail={userEmail} />

        {/* Monitor de inactividad */}
        <SessionTimeout
          isActive={!!user}
          onLogout={performLogout}
          onStayConnected={saveLoginTimestamp}
        />

        {/* Contenido principal con Rutas */}
        <Routes>
          <Route
            path="/"
            element={
              <MainPage
                events={events}
                filteredEvents={filteredEvents}
                editingEvent={editingEvent}
                onDateSelect={handleDateSelect}
                onEventAdded={handleEventAdded}
                onEditEvent={handleEditEvent}
                onCancelEdit={handleCancelEdit}
                onFilterChange={handleFilterChange}
              />
            }
          />
          <Route
            path="/agenda"
            element={<AgendaPage events={events} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;