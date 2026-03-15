import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, query, limitToLast, get } from 'firebase/database';
import { db } from '../lib/firebase';
import {
  BarChart3,
  Users,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react';

interface Visit {
  id: string;
  timestamp: number;
  page: string;
  country: string;
  city?: string;
  browser: string;
  os: string;
  device: string;
  referrer: string;
  duration?: number;
}

interface AnalyticsData {
  visits: Visit[];
  totalVisits: number;
  uniqueCountries: string[];
  browserStats: { [key: string]: number };
  deviceStats: { [key: string]: number };
  osStats: { [key: string]: number };
  pageStats: { [key: string]: number };
  countryStats: { [key: string]: number };
  todayVisits: number;
  last24hVisits: number;
  visitsByDay: { [key: string]: number };
  visitsByHour: { [key: number]: number };
}

export default function Analytics() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    const visitsRef = query(ref(db, 'analytics/visits'), limitToLast(500));
    
    const unsubscribe = onValue(visitsRef, (snapshot) => {
      const data = snapshot.val();
      const visitsArray: Visit[] = [];
      
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          visitsArray.push({ id: key, ...value as Omit<Visit, 'id'> });
        });
      }
      
      setVisits(visitsArray.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
      setLastUpdate(new Date());
    });

    const fetchVisitCount = async () => {
      try {
        const visitCountRef = ref(db, 'visitCount');
        const unsubscribeVisitCount = onValue(visitCountRef, (snapshot) => {
          if (snapshot.exists()) {
            setVisitCount(snapshot.val());
          }
        });
        return () => unsubscribeVisitCount();
      } catch (error) {
        console.error('Error fetching visitCount:', error);
      }
    };
    fetchVisitCount();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const analytics = useMemo<AnalyticsData>(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const last24h = now - (24 * 60 * 60 * 1000);

    const browserStats: { [key: string]: number } = {};
    const deviceStats: { [key: string]: number } = {};
    const osStats: { [key: string]: number } = {};
    const pageStats: { [key: string]: number } = {};
    const countryStats: { [key: string]: number } = {};

    visits.forEach(visit => {
      browserStats[visit.browser] = (browserStats[visit.browser] || 0) + 1;
      deviceStats[visit.device] = (deviceStats[visit.device] || 0) + 1;
      osStats[visit.os] = (osStats[visit.os] || 0) + 1;
      pageStats[visit.page] = (pageStats[visit.page] || 0) + 1;
      countryStats[visit.country] = (countryStats[visit.country] || 0) + 1;
    });

    const todayVisits = visits.filter(v => v.timestamp >= todayStartMs).length;
    const last24hVisits = visits.filter(v => v.timestamp >= last24h).length;
    const uniqueCountries = Object.keys(countryStats);

    // Visits by day (last 14 days)
    const visitsByDay: { [key: string]: number } = {};
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    visits.forEach(visit => {
      if (visit.timestamp >= fourteenDaysAgo) {
        const date = new Date(visit.timestamp).toISOString().split('T')[0];
        visitsByDay[date] = (visitsByDay[date] || 0) + 1;
      }
    });

    // Visits by hour
    const visitsByHour: { [key: number]: number } = {};
    visits.forEach(visit => {
      const hour = new Date(visit.timestamp).getHours();
      visitsByHour[hour] = (visitsByHour[hour] || 0) + 1;
    });

    return {
      visits,
      totalVisits: visits.length,
      uniqueCountries,
      browserStats,
      deviceStats,
      osStats,
      pageStats,
      countryStats,
      todayVisits,
      last24hVisits,
      visitsByDay,
      visitsByHour
    };
  }, [visits]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    return formatTime(timestamp);
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'Spain': '🇪🇸',
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'France': '🇫🇷',
      'Germany': '🇩🇪',
      'Italy': '🇮🇹',
      'Portugal': '🇵🇹',
      'Netherlands': '🇳🇱',
      'Belgium': '🇧🇪',
      'Argentina': '🇦🇷',
      'Mexico': '🇲🇽',
      'Colombia': '🇨🇴',
      'Chile': '🇨🇱',
      'Peru': '🇵🇪',
      'Brazil': '🇧🇷',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Japan': '🇯🇵',
      'China': '🇨🇳',
      'India': '🇮🇳',
      'Unknown': '🌍'
    };
    return flags[country] || '🌍';
  };

  const topPages = Object.entries(analytics.pageStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topCountries = Object.entries(analytics.countryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const topBrowsers = Object.entries(analytics.browserStats)
    .sort(([, a], [, b]) => b - a);

  const recentVisits = visits.slice(0, 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-muted-foreground">Cargando analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Analytics en Tiempo Real</h2>
            <p className="text-xs text-muted-foreground">
              Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            autoRefresh 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Contador Total</p>
              <p className="text-2xl font-bold text-foreground">{visitCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Sesiones</p>
              <p className="text-2xl font-bold text-foreground">{analytics.totalVisits}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Hoy</p>
              <p className="text-2xl font-bold text-foreground">{analytics.todayVisits}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Últimas 24h</p>
              <p className="text-2xl font-bold text-foreground">{analytics.last24hVisits}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Países</p>
              <p className="text-2xl font-bold text-foreground">{analytics.uniqueCountries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visits by Day Chart */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-foreground">Visitas por Día (Últimos 14 días)</h3>
        </div>
        <div className="p-5">
          <div className="flex items-end justify-between gap-1 h-40">
            {(() => {
              const days = [];
              const today = new Date();
              for (let i = 13; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const count = analytics.visitsByDay[dateStr] || 0;
                const maxCount = Math.max(...Object.values(analytics.visitsByDay), 1);
                const height = count > 0 ? Math.max((count / maxCount) * 100, 10) : 5;
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayNum = date.getDate();
                
                days.push(
                  <div key={dateStr} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md transition-all hover:from-indigo-500 hover:to-indigo-300 cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${count} visitas`}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1">{dayNum}</span>
                    <span className="text-[8px] text-muted-foreground uppercase">{dayName.substring(0, 3)}</span>
                  </div>
                );
              }
              return days;
            })()}
          </div>
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>Hace 14 días</span>
            <span>Hoy</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Países</h3>
          </div>
          <div className="p-5 space-y-3">
            {topCountries.map(([country, count], index) => (
              <div key={country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getCountryFlag(country)}</span>
                  <span className="font-medium text-foreground">{country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
            {topCountries.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No hay datos de países</p>
            )}
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Páginas Más Visitadas</h3>
          </div>
          <div className="p-5 space-y-3">
            {topPages.map(([page, count], index) => (
              <div key={page} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    index < 3 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground text-sm">{page || '/'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
            {topPages.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No hay datos de páginas</p>
            )}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Dispositivos</h3>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(analytics.deviceStats).map(([device, count]) => (
              <div key={device} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(device)}
                  <span className="font-medium text-foreground capitalize">{device}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-12 text-right">
                    {count} ({Math.round((count / analytics.totalVisits) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Browsers */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Navegadores</h3>
          </div>
          <div className="p-5 space-y-3">
            {topBrowsers.slice(0, 5).map(([browser, count]) => (
              <div key={browser} className="flex items-center justify-between">
                <span className="font-medium text-foreground">{browser}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Visits Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-foreground">Visitas Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Hora</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">País</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Ciudad</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Página</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Dispositivo</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Navegador</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.map((visit) => (
                <tr key={visit.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-sm text-muted-foreground">{formatTimeAgo(visit.timestamp)}</td>
                  <td className="p-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span>{getCountryFlag(visit.country)}</span>
                      <span className="text-foreground">{visit.country}</span>
                    </span>
                  </td>
                  <td className="p-3 text-sm text-foreground">{visit.city || '-'}</td>
                  <td className="p-3 text-sm text-foreground font-mono">{visit.page || '/'}</td>
                  <td className="p-3 text-sm">
                    <span className="flex items-center gap-1 text-foreground capitalize">
                      {getDeviceIcon(visit.device)}
                      {visit.device}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-foreground">{visit.browser}</td>
                </tr>
              ))}
              {recentVisits.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No hay visitas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
