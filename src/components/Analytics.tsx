import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  Activity,
  Eye,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Smartphone,
  Users
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
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Analytics y Tráfico</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[10px] font-bold text-green-700 dark:text-green-400">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                CONECTADO
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sincronizado: {lastUpdate.toLocaleTimeString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total visit counter card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Eye className="w-24 h-24 text-indigo-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Visitas Históricas Totales</p>
              <p className="text-3xl font-black text-foreground mt-1">{visitCount.toLocaleString('es-ES')}</p>
            </div>
          </div>
        </div>

        {/* Google Analytics 4 integration card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Servicio de Analytics</p>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                Google Analytics 4
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold uppercase">Activo</span>
              </p>
            </div>
          </div>
        </div>

        {/* Firebase state card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-24 h-24 text-amber-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Estado Firebase RTDB</p>
              <p className="text-xl font-extrabold text-foreground mt-1 flex items-center gap-1.5">
                Optimizado (0 Bytes)
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold uppercase">Limpio</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Centerpiece Panel */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-lg relative">
        {/* Glowing aura effect */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="p-8 md:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 relative z-10">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-3.5 h-3.5" />
              Migración de Analíticas Completada
            </div>

            <h3 className="text-3xl md:text-4xl font-black text-foreground leading-tight tracking-tight">
              Estadísticas Profesionales <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
                sin límites de rendimiento
              </span>
            </h3>

            <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
              Hemos migrado todo el registro de analíticas al motor profesional de <strong>Google Analytics 4 (GA4)</strong>. 
              Esto evita almacenar miles de filas redundantes en tu base de datos de Firebase, 
              garantizando una velocidad de carga instantánea en el móvil y un consumo de almacenamiento de <strong>cero bytes</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-2.5">
                <Globe className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Mapa e Idiomas en Vivo</h4>
                  <p className="text-xs text-muted-foreground">Localización exacta de tus visitantes por país y ciudad en tiempo real.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Users className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Canales de Adquisición</h4>
                  <p className="text-xs text-muted-foreground">Descubre de dónde vienen (Google, redes sociales, directo...).</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Dispositivos y Pantallas</h4>
                  <p className="text-xs text-muted-foreground">Modelos de móviles, sistemas operativos y navegadores más populares.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Rendimiento y Tiempos</h4>
                  <p className="text-xs text-muted-foreground">Velocidad real de carga de las páginas en el navegador de los usuarios.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Ir a Google Analytics 4
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0 bg-muted/30 border border-border p-6 rounded-2xl text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600/10 dark:bg-indigo-400/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Acceso Directo Profesional</p>
              <p className="text-xs text-muted-foreground mt-1 px-4 leading-normal">
                Puedes consultar todas las métricas de tráfico y comportamiento de forma profesional desde tu cuenta de Google Analytics o su aplicación oficial.
              </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
