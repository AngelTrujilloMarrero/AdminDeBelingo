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
import { hybridOrchestraService } from './services/hybridOrchestraService';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState({
    events: [] as Event[],
    filteredEvents: [] as Event[],
    editingEvent: null as Event | null,
    allOrchestraNames: [] as string[],
    allOrchestras: [] as any[],
    isRestoredEvent: false as boolean,
    deletionIdToRemove: null as string | null
  });

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

  // Session expiration check - runs periodically as backup
  const checkSessionExpiration = () => {
    if (isSessionExpired()) {
      performLogout();
    }
  };

  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(checkSessionExpiration, 60000);

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

          // 3. Get all orchestra names (Hybrid)
          const orchestrasRef = ref(db, 'orchestras');
          const unsubscribeOrchestras = onValue(orchestrasRef, async (snapshot) => {
            const liveData = snapshot.val() || {};
            const liveNames = Object.values(liveData).map((o: any) => o.name).filter(Boolean);

            // Fetch archived names
            const archivedOrchs = await hybridOrchestraService.getArchivedOrchestras();
            const archivedNames = archivedOrchs.map(o => o.name);

            // Combine and unique
            const allNames = [...new Set([...liveNames, ...archivedNames])].sort();
            
            // Map live and archived data for full objects
            const mergedMap = new Map<string, any>();
            archivedOrchs.forEach(o => mergedMap.set(o.name, o));
            Object.values(liveData).forEach((o: any) => mergedMap.set(o.name, o));
            const totalOrchestras = Array.from(mergedMap.values());

            setAppState(prev => ({ 
              ...prev, 
              allOrchestraNames: allNames,
              allOrchestras: totalOrchestras 
            }));
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
        setAppState(prev => ({ ...prev, events: totalEvents }));

        // Actualizar filtrados (solo si no hay filtro activo)
        if (!hasActiveFilter.current) {
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          twoDaysAgo.setHours(0, 0, 0, 0);
          const filtered = totalEvents.filter(event => {
            const eventDate = new Date(event.day);
            return eventDate >= twoDaysAgo;
          });
          setAppState(prev => ({ ...prev, filteredEvents: filtered }));
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
    if (appState.editingEvent) {
      setAppState(prev => ({ ...prev, editingEvent: null }));
    }

    // Disparar evento personalizado para establecer la fecha
    window.dispatchEvent(new CustomEvent('dateSelected', { detail: date }));
  };

  const handleEventAdded = () => {
    setAppState(prev => ({ ...prev, editingEvent: null, isRestoredEvent: false, deletionIdToRemove: null }));
    // Los eventos se actualizan automáticamente por onValue
  };

  const handleEditEvent = (event: Event, isRestored?: boolean, deletionId?: string) => {
    setAppState(prev => ({ ...prev, editingEvent: event, isRestoredEvent: isRestored ?? false, deletionIdToRemove: deletionId }));
    const formContainer = document.getElementById('form-container');
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setAppState(prev => ({ ...prev, editingEvent: null, isRestoredEvent: false, deletionIdToRemove: null }));
  };

  const hasActiveFilter = useRef(false);

  const handleFilterChange = (filtered: Event[]) => {
    hasActiveFilter.current = true;
    setAppState(prev => ({ ...prev, filteredEvents: filtered }));
  };

  const clearFilterFlag = () => {
    hasActiveFilter.current = false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-purple-50 dark:from-indigo-950 dark:via-background dark:to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-xl font-semibold text-foreground">Cargando...</p>
          <p className="text-muted-foreground mt-2">Iniciando aplicación</p>
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-purple-50 dark:from-indigo-950 dark:via-background dark:to-purple-950">
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
                events={appState.events}
                filteredEvents={appState.filteredEvents}
                editingEvent={appState.editingEvent}
                isRestoredEvent={appState.isRestoredEvent}
                deletionIdToRemove={appState.deletionIdToRemove}
                onDateSelect={handleDateSelect}
                onEventAdded={handleEventAdded}
                onEditEvent={handleEditEvent}
                onCancelEdit={handleCancelEdit}
                onFilterChange={handleFilterChange}
                onClearFilter={clearFilterFlag}
                allOrchestraNames={appState.allOrchestraNames}
                allOrchestras={appState.allOrchestras}
              />
            }
          />
          <Route
            path="/agenda"
            element={<AgendaPage events={appState.events} />}
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