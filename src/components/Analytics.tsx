import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  Activity,
  Eye,
  ExternalLink,
  Zap
} from 'lucide-react';

export default function Analytics() {
  const [visitCount, setVisitCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const visitCountRef = ref(db, 'visitCount');
    const unsubscribeVisitCount = onValue(visitCountRef, (snapshot) => {
      if (snapshot.exists()) {
        setVisitCount(snapshot.val());
      }
      setLoading(false);
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeVisitCount();
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
            href="https://analytics.google.com/"
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
    </div>
  );
}
