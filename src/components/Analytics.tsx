import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  Activity,
  Eye,
  ExternalLink,
  Zap,
  Calendar
} from 'lucide-react';

export default function Analytics() {
  const [visitCount, setVisitCount] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<string>('current');
  const [dailyVisits, setDailyVisits] = useState<Record<string, number>>({});
  const [historicalDailyVisits, setHistoricalDailyVisits] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const visitCountRef = ref(db, 'visitCount');
    const unsubscribeVisitCount = onValue(visitCountRef, (snapshot) => {
      if (snapshot.exists()) {
        setVisitCount(snapshot.val());
      }
    });

    const dailyVisitsRef = ref(db, 'dailyVisits');
    const unsubscribeDailyVisits = onValue(dailyVisitsRef, (snapshot) => {
      if (snapshot.exists()) {
        setDailyVisits(snapshot.val());
      } else {
        setDailyVisits({});
      }
    });

    const historicalVisitsRef = ref(db, 'historicalDailyVisits');
    const unsubscribeHistoricalVisits = onValue(historicalVisitsRef, (snapshot) => {
      if (snapshot.exists()) {
        setHistoricalDailyVisits(snapshot.val());
      } else {
        setHistoricalDailyVisits({});
      }
      setLoading(false);
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeVisitCount();
      unsubscribeDailyVisits();
      unsubscribeHistoricalVisits();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Activity className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm text-muted-foreground font-medium">Cargando datos de tráfico...</span>
      </div>
    );
  }

  // Get available historical years sorted
  const availableYears = Object.keys(historicalDailyVisits).sort((a, b) => b.localeCompare(a));

  // Determine displayed list
  const displayedVisits = selectedYear === 'current'
    ? dailyVisits
    : (historicalDailyVisits[selectedYear] || {});

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Analytics y Control de Tráfico</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[10px] font-bold text-green-700 dark:text-green-400">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                CONECTADO
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Counter Centerpiece */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-lg relative p-8 md:p-12 text-center space-y-8">
        {/* Glowing background highlights */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto shadow-inner">
            <Eye className="w-8 h-8" />
          </div>
          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">
            Visitas Históricas Totales
          </p>
          <h3 className="text-5xl md:text-6xl font-black text-foreground tracking-tight select-none">
            {visitCount.toLocaleString('es-ES')}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-normal">
            Contador global acumulado de sesiones únicas en tiempo real en la web pública.
          </p>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto relative z-10 pt-4">
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Activity className="w-5 h-5" />
            Ir a Google Analytics
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>
          
          <a
            href="https://analytics.google.com/analytics/web/#/a306453112p432255455/reports/reportinghub?params=_u..nav%3Dmaui%26_u.dateOption%3Dtoday%26_u.comparisonOption%3Ddisabled"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-6 py-4 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-bold transition-all border border-border hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Zap className="w-5 h-5 text-amber-500" />
            Páginas en Tiempo Real
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>
        </div>
      </div>

      {/* Daily Visits Log */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-lg p-6 md:p-8 space-y-6 relative">
        {/* Title and Year Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-foreground">Registro de Visitas Diarias</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="current">2026 (Activo / En vivo)</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        {Object.keys(displayedVisits).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 relative z-10">
            No hay registros acumulados para la vista seleccionada.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 relative z-10 custom-scrollbar">
            {Object.entries(displayedVisits)
              .sort((a, b) => b[0].localeCompare(a[0])) // Reverse chronological sorting
              .map(([dateString, count]) => {
                // dateString: "2026-05-17 (Domingo 17 de Mayo)"
                const displayName = dateString.includes('(') 
                  ? dateString.split('(')[1].replace(')', '') 
                  : dateString;
                const isoDate = dateString.split(' ')[0];
                
                return (
                  <div 
                    key={dateString} 
                    className="p-4 bg-muted/40 hover:bg-indigo-500/5 hover:border-indigo-500/20 border border-border rounded-2xl flex items-center justify-between transition-all group"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors capitalize">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {isoDate}
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black text-xs rounded-xl shadow-sm border border-indigo-100/30 dark:border-indigo-900/30">
                      {count.toLocaleString('es-ES')}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
