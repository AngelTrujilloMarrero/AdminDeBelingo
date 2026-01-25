import { useState, useEffect, useRef } from 'react';
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
import MigrationPage from './components/MigrationPanel';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [allOrchestraNames, setAllOrchestraNames] = useState<string[]>([]);

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
      let staticEvents: Event[] = [];
      let firebaseEvents: Event[] = [];
      let staticEventsLoaded = false;

      const loadData = async () => {
        try {
          const { hybridDataService } = await import('./services/hybridDataService');

          // 1. Suscribirse a Firebase primero (esto es inmediato)
          const eventsRef = ref(db, 'events');
          const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            const currentFirebaseEvents: Event[] = [];
            if (data) {
              Object.entries(data).forEach(([key, value]: [string, any]) => {
                currentFirebaseEvents.push({ id: key, ...value });
              });
            }
            firebaseEvents = currentFirebaseEvents;

            // Solo combinamos si ya tenemos los estáticos o si queremos mostrar algo ya
            updateTotalEvents(staticEvents, firebaseEvents);
          });

          // 2. Cargar históricos (puede tardar un poco)
          const historicalEvents = await hybridDataService.getPreviousYearsEventsFromJSON();
          staticEvents = historicalEvents;
          staticEventsLoaded = true;

          // Forzar actualización al terminar de cargar históricos
          updateTotalEvents(staticEvents, firebaseEvents);

          // 3. Suscribirse a orquestas
          const orchestrasRef = ref(db, 'orchestras');
          const unsubscribeOrchestras = onValue(orchestrasRef, (snapshot) => {
            const data = snapshot.val();
            const names: string[] = [];
            if (data) {
              Object.values(data).forEach((orch: any) => {
                if (orch.name) names.push(orch.name);
              });
            }
            setAllOrchestraNames(names);
          });

          return () => {
            unsubscribeEvents();
            unsubscribeOrchestras();
          };
        } catch (error) {
          console.error('Error al configurar listeners de datos:', error);
        }
      };

      const updateTotalEvents = (staticEv: Event[], dynamicEv: Event[]) => {
        const eventsMap = new Map();
        // El orden importa: los dinámicos (Firebase) tienen prioridad si hay IDs repetidos
        // Marcamos los estáticos como archivados
        const archivedEvents = staticEv.map(e => ({ ...e, isArchived: true }));

        [...archivedEvents, ...dynamicEv].forEach(event => {
          if (event.id) eventsMap.set(event.id, event);
        });

        const totalEvents = Array.from(eventsMap.values());
        setEvents(totalEvents);

        // Actualizar filtrados (solo si no hay filtro activo)
        if (!hasActiveFilter.current) {
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          twoDaysAgo.setHours(0, 0, 0, 0);
          const filtered = totalEvents.filter(event => {
            const eventDate = new Date(event.day);
            return eventDate >= twoDaysAgo;
          });
          setFilteredEvents(filtered);
        }
      };

      const cleanupPromise = loadData();
      return () => {
        cleanupPromise.then(cleanup => cleanup && cleanup());
      };
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

  const hasActiveFilter = useRef(false);

  const handleFilterChange = (filtered: Event[]) => {
    hasActiveFilter.current = true;
    setFilteredEvents(filtered);
  };

  const clearFilterFlag = () => {
    hasActiveFilter.current = false;
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
                onClearFilter={clearFilterFlag}
                allOrchestraNames={allOrchestraNames}
              />
            }
          />
          <Route
            path="/agenda"
            element={<AgendaPage events={events} />}
          />
          <Route
            path="/migration"
            element={<MigrationPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;