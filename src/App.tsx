import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db, isSessionExpired, clearLoginTimestamp, saveLoginTimestamp } from './lib/firebase';
import { Event } from './types/event';
import Header from './components/Header';
import Login from './components/Login';
import Calendar from './components/Calendar';
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import Filters from './components/Filters';
import Stats from './components/Stats';

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
          await signOut(auth);
          clearLoginTimestamp();
          setUser(null);
          setLoading(false);
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

  // Verificar periódicamente si la sesión ha expirado
  useEffect(() => {
    if (!user) return;

    // Verificar cada minuto si la sesión ha expirado
    const intervalId = setInterval(async () => {
      if (isSessionExpired()) {
        await signOut(auth);
        clearLoginTimestamp();
        setUser(null);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header moderno */}
      <Header userEmail={userEmail} />

      {/* Contenido principal */}
      <div className="space-y-8 pb-8">
        {/* Sección de calendarios */}
        <section className="pt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Calendar onDateSelect={handleDateSelect} />
          </div>
        </section>

        {/* Sección del formulario */}
        <section>
          <EventForm
            events={events}
            editingEvent={editingEvent}
            onEventAdded={handleEventAdded}
            onCancelEdit={handleCancelEdit}
          />
        </section>

        {/* Sección de filtros */}
        <section>
          <Filters events={events} onFilterChange={handleFilterChange} />
        </section>

        {/* Sección de eventos */}
        <section>
          <EventList events={filteredEvents} onEditEvent={handleEditEvent} />
        </section>

        {/* Google Calendar Embed */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header del calendario */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
              <div className="flex items-center justify-center space-x-2">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-xl font-bold text-white">Google Calendar</h2>
              </div>
              <p className="text-center text-white/80 text-sm mt-2">
                Calendario público de eventos
              </p>
            </div>

            {/* Iframe del calendario */}
            <div className="relative">
              <iframe
                src="https://calendar.google.com/calendar/embed?height=600&wkst=2&ctz=Atlantic%2FCanary&showPrint=0&showTitle=0&showNav=0&showDate=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA&src=YXRydWppbWFyQGdtYWlsLmNvbQ&color=%23039BE5"
                className="w-full h-[600px] md:h-[500px] sm:h-[400px] border-none"
                scrolling="auto"
                title="Google Calendar de eventos"
              />

              {/* Overlay de carga */}
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-500">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Cargando calendario...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Estadísticas */}
        <section>
          <Stats events={events} />
        </section>
      </div>
    </div>
  );
}

export default App;