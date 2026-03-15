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
  Eye,
  Languages,
  Wifi,
  Maximize2,
  Cpu,
  Zap,
  Moon,
  Wind,
  MousePointer2,
  Timer,
  Bot,
  Megaphone
} from 'lucide-react';

interface Visit {
  id: string;
  timestamp: number;
  page: string;
  country: string;
  countryCode?: string;
  city?: string;
  browser: string;
  os: string;
  device: string;
  referrer: string;
  duration?: number;
  // Parámetros técnicos
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  pixelRatio?: number;
  language?: string;
  timezone?: string;
  connection?: string;
  memory?: number;
  cores?: number;
  colorDepth?: number;
  touchPoints?: number;
  orientation?: string;
  darkTheme?: boolean;
  reducedMotion?: boolean;
  saveData?: boolean;
  downlink?: number;
  cookiesEnabled?: boolean;
  doNotTrack?: boolean;
  isBot?: boolean;
  loadTime?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
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
  referrerStats: { [key: string]: number };
  languageStats: { [key: string]: number };
  timezoneStats: { [key: string]: number };
  connectionStats: { [key: string]: number };
  resolutionStats: { [key: string]: number };
  userPrefs: {
    darkTheme: { dark: number, light: number };
    saveData: { active: number, inactive: number };
    downlink: { fast: number, medium: number, slow: number };
  };
  hardwareStats: {
    memory: { [key: string]: number };
    cores: { [key: string]: number };
    touch: { [key: string]: number };
  };
  performanceStats: {
    avgLoadTime: number;
    fastLoads: number;
    slowLoads: number;
    totalMeasured: number;
  };
  botCount: number;
  utmStats: { [key: string]: number };
  retinaCount: number;
  cookiesDisabled: number;
  dntEnabled: number;
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
  const [visibleVisits, setVisibleVisits] = useState(100);

  useEffect(() => {
    const visitsRef = query(ref(db, 'analytics/visits'), limitToLast(5000));
    
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
    }, 5000);

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
    const referrerStats: { [key: string]: number } = {};
    const languageStats: { [key: string]: number } = {};
    const timezoneStats: { [key: string]: number } = {};
    const connectionStats: { [key: string]: number } = {};
    const resolutionStats: { [key: string]: number } = {};
    const userPrefs = {
      darkTheme: { dark: 0, light: 0 },
      saveData: { active: 0, inactive: 0 },
      downlink: { fast: 0, medium: 0, slow: 0 }
    };
    const hardwareStats = {
      memory: {} as { [key: string]: number },
      cores: {} as { [key: string]: number },
      touch: {} as { [key: string]: number }
    };
    const loadTimes: number[] = [];
    const perfStats = { fastLoads: 0, slowLoads: 0 };
    let botCount = 0;
    const utmStats: { [key: string]: number } = {};
    let retinaCount = 0;
    let cookiesDisabled = 0;
    let dntEnabled = 0;

    visits.forEach(visit => {
      browserStats[visit.browser] = (browserStats[visit.browser] || 0) + 1;
      deviceStats[visit.device] = (deviceStats[visit.device] || 0) + 1;
      osStats[visit.os] = (osStats[visit.os] || 0) + 1;
      pageStats[visit.page] = (pageStats[visit.page] || 0) + 1;
      countryStats[visit.country] = (countryStats[visit.country] || 0) + 1;
      const ref = visit.referrer || 'direct';
      referrerStats[ref] = (referrerStats[ref] || 0) + 1;
      if (visit.language) {
        // Simplificar: tomar solo el idioma base (ej: 'es-ES' → 'es')
        const lang = visit.language.split('-')[0].toLowerCase();
        languageStats[lang] = (languageStats[lang] || 0) + 1;
      }
      if (visit.timezone) {
        timezoneStats[visit.timezone] = (timezoneStats[visit.timezone] || 0) + 1;
      }
      if (visit.connection) {
        connectionStats[visit.connection] = (connectionStats[visit.connection] || 0) + 1;
      }
      if (visit.screenWidth && visit.screenHeight) {
        const res = `${visit.screenWidth}×${visit.screenHeight}`;
        resolutionStats[res] = (resolutionStats[res] || 0) + 1;
      }
      
      // Stats de Hardware
      if (visit.memory) {
        const memLabel = `${visit.memory} GB`;
        hardwareStats.memory[memLabel] = (hardwareStats.memory[memLabel] || 0) + 1;
      }
      if (visit.cores) {
        const coresLabel = `${visit.cores} Núcleos`;
        hardwareStats.cores[coresLabel] = (hardwareStats.cores[coresLabel] || 0) + 1;
      }
      if (visit.touchPoints !== undefined) {
        const touchLabel = visit.touchPoints > 0 ? 'Táctil' : 'No Táctil';
        hardwareStats.touch[touchLabel] = (hardwareStats.touch[touchLabel] || 0) + 1;
      }

      // Stats de Preferencias
      if (visit.darkTheme !== undefined) {
        visit.darkTheme ? userPrefs.darkTheme.dark++ : userPrefs.darkTheme.light++;
      }
      if (visit.saveData !== undefined) {
        visit.saveData ? userPrefs.saveData.active++ : userPrefs.saveData.inactive++;
      }
      if (visit.downlink !== undefined) {
        if (visit.downlink >= 5) userPrefs.downlink.fast++;
        else if (visit.downlink >= 1) userPrefs.downlink.medium++;
        else userPrefs.downlink.slow++;
      }

      // Stats de Rendimiento
      if (visit.loadTime && visit.loadTime > 0) {
        loadTimes.push(visit.loadTime);
        if (visit.loadTime < 2000) perfStats.fastLoads++;
        else perfStats.slowLoads++;
      }

      // Bot detection
      if (visit.isBot) botCount++;

      // UTM tracking
      if (visit.utmSource) {
        const key = `${visit.utmSource}${visit.utmMedium ? ' / ' + visit.utmMedium : ''}${visit.utmCampaign ? ' / ' + visit.utmCampaign : ''}`;
        utmStats[key] = (utmStats[key] || 0) + 1;
      }

      // Retina/HiDPI
      if (visit.pixelRatio && visit.pixelRatio > 1) retinaCount++;

      // Privacy
      if (visit.cookiesEnabled === false) cookiesDisabled++;
      if (visit.doNotTrack === true) dntEnabled++;
    });

    const todayVisits = visits.filter(v => v.timestamp >= todayStartMs).length;
    const last24hVisits = visits.filter(v => v.timestamp >= last24h).length;
    const uniqueCountries = Object.keys(countryStats);

    // Visits by day (last 14 days)
    const visitsByDay: { [key: string]: number } = {};
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    visits.forEach(visit => {
      if (visit.timestamp >= fourteenDaysAgo) {
        const date = new Date(visit.timestamp);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        visitsByDay[dateStr] = (visitsByDay[dateStr] || 0) + 1;
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
      referrerStats,
      languageStats,
      timezoneStats,
      connectionStats,
      resolutionStats,
      userPrefs,
      hardwareStats,
      performanceStats: {
        avgLoadTime: loadTimes.length > 0 ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length) : 0,
        fastLoads: perfStats.fastLoads,
        slowLoads: perfStats.slowLoads,
        totalMeasured: loadTimes.length
      },
      botCount,
      utmStats,
      retinaCount,
      cookiesDisabled,
      dntEnabled,
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

  const getCountryFlag = (countryCode?: string, countryName?: string) => {
    if (countryCode && countryCode !== 'UN' && countryCode !== 'Unknown') {
      // Convertir código ISO (ES, US...) a emoji de bandera
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    }
    
    // Fallback para datos antiguos o desconocidos
    const flags: { [key: string]: string } = {
      'Spain': '🇪🇸', 'España': '🇪🇸',
      'United States': '🇺🇸', 'USA': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'France': '🇫🇷', 'Germany': '🇩🇪',
      'Italy': '🇮🇹', 'Portugal': '🇵🇹',
      'Argentina': '🇦🇷', 'Mexico': '🇲🇽',
      'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪',
      'Brazil': '🇧🇷', 'Unknown': '🌍'
    };
    return flags[countryName || ''] || '🌍';
  };

  const topPages = Object.entries(analytics.pageStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topCountries = Object.entries(analytics.countryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  const topBrowsers = Object.entries(analytics.browserStats)
    .sort(([, a], [, b]) => b - a);

  const recentVisits = visits.slice(0, visibleVisits);

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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Analytics en Tiempo Real</h2>
              {autoRefresh && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 dark:text-green-400">EN VIVO</span>
                </span>
              )}
            </div>
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
          {autoRefresh ? 'Auto-refresco ACTIVADO' : 'Auto-refresco DESACTIVADO'}
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
              const maxCount = Math.max(...Object.values(analytics.visitsByDay), 1);
              
              for (let i = 13; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const count = analytics.visitsByDay[dateStr] || 0;
                const barHeight = count > 0 ? Math.max((count / maxCount) * 100, 10) : 5;
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayNum = date.getDate();
                const isToday = i === 0;
                
                days.push(
                  <div key={dateStr} className="flex flex-col items-center flex-1 h-full justify-end">
                    {count > 0 && (
                      <span className="text-[10px] font-medium text-foreground mb-1">{count}</span>
                    )}
                    <div 
                      className={`w-full max-w-[40px] rounded-t-md transition-all hover:opacity-80 cursor-pointer ${isToday ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gradient-to-t from-indigo-600 to-indigo-400'}`}
                      style={{ height: `${barHeight}%`, minHeight: count > 0 ? '4px' : '2px' }}
                      title={`${count} visitas`}
                    />
                    <span className={`text-[10px] mt-1 ${isToday ? 'font-bold text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{dayNum}</span>
                    <span className={`text-[8px] uppercase ${isToday ? 'font-bold text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{dayName.substring(0, 3)}</span>
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
                  <span className="text-lg">
                    {getCountryFlag(visits.find(v => v.country === country)?.countryCode, country)}
                  </span>
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
                  <span className="font-medium text-foreground capitalize">
                    {device === 'mobile' ? 'Móvil' : device === 'tablet' ? 'Tablet' : 'Escritorio'}
                  </span>
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

      {/* Additional Stats - Referrers & Detailed Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Referrers */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Procedencia (Referrers)</h3>
          </div>
          <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
            {Object.entries(analytics.referrerStats)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([referrer, count]) => (
                <div key={referrer} className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-sm truncate max-w-[200px]" title={referrer}>
                    {referrer === 'direct' ? '🟢 Directo' : referrer.length > 30 ? `...${referrer.slice(-30)}` : referrer}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground w-10 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top OS */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Sistemas Operativos</h3>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(analytics.osStats)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([os, count]) => (
                <div key={os} className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{os}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground w-10 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Dispositivos</h3>
          </div>
          <div className="p-5 space-y-4">
            {Object.entries(analytics.deviceStats)
              .sort(([, a], [, b]) => b - a)
              .map(([device, count]) => {
                const percent = Math.round((count / analytics.totalVisits) * 100);
                return (
                  <div key={device} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize flex items-center gap-2">
                        {device === 'mobile' ? '📱 Móvil' : device === 'tablet' ? '📱 Tablet' : '💻 Escritorio'}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">{percent}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${device === 'mobile' ? 'bg-green-500' : device === 'tablet' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Preferencias y Comportamiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Modo Oscuro */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-6">
            <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Preferencia de Tema</h3>
          </div>
          <div className="flex items-center justify-around h-32">
            <div className="text-center group">
              <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🌙</div>
              <p className="text-2xl font-bold text-indigo-600">{analytics.userPrefs.darkTheme.dark}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-bold">Oscuro</p>
            </div>
            <div className="w-px h-16 bg-border" />
            <div className="text-center group">
              <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">☀️</div>
              <p className="text-2xl font-bold text-orange-500">{analytics.userPrefs.darkTheme.light}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-bold">Claro</p>
            </div>
          </div>
        </div>

        {/* Ahorro de Datos y Red */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-6">
            <Wind className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Estado de Conexión</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Ahorro Datos</p>
              <p className="text-lg font-bold text-foreground">
                {analytics.userPrefs.saveData.active > 0 ? '🟢 ACTIVO' : '⚪ INACTIVO'}
              </p>
              <p className="text-[10px] text-muted-foreground">{analytics.userPrefs.saveData.active} usuarios</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Velocidad</p>
              <p className="text-lg font-bold text-foreground">
                {analytics.userPrefs.downlink.fast > analytics.userPrefs.downlink.medium ? '⚡ RÁPIDA' : '📉 MEDIA'}
              </p>
              <p className="text-[10px] text-muted-foreground">Medio: {analytics.userPrefs.downlink.fast} v.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rendimiento, Seguridad y Privacidad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rendimiento */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Rendimiento (Carga)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Carga Media</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                  {analytics.performanceStats.avgLoadTime > 0 ? (analytics.performanceStats.avgLoadTime / 1000).toFixed(2) : '-'}
                </p>
                <span className="text-sm font-bold text-indigo-500">seg</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">⚡ Rápidas (&lt;2s)</span>
                <span className="font-bold text-green-600">{analytics.performanceStats.fastLoads}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${(analytics.performanceStats.fastLoads / (analytics.performanceStats.totalMeasured || 1)) * 100}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-muted-foreground">🐢 Lentas (&gt;2s)</span>
                <span className="font-bold text-orange-500">{analytics.performanceStats.slowLoads}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500" 
                  style={{ width: `${(analytics.performanceStats.slowLoads / (analytics.performanceStats.totalMeasured || 1)) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seguridad y Privacidad */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Seguridad y Privacidad</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
              <Bot className="w-4 h-4 mx-auto mb-1 text-red-500" />
              <p className="text-lg font-bold text-foreground">{analytics.botCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Bots</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
              <Wind className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold text-foreground">{analytics.dntEnabled}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Do Not Track</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-xl border border-border">
              <RefreshCw className="w-4 h-4 mx-auto mb-1 text-orange-500" />
              <p className="text-lg font-bold text-foreground">{analytics.cookiesDisabled}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">No Cookies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing y Pantalla Pro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campañas UTM */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Campañas UTM (Origen)</h3>
          </div>
          <div className="p-5 space-y-3 max-h-48 overflow-y-auto">
            {Object.keys(analytics.utmStats).length > 0 ? (
              Object.entries(analytics.utmStats)
                .sort(([, a], [, b]) => b - a)
                .map(([utm, count]) => (
                  <div key={utm} className="flex items-center justify-between group">
                    <span className="text-xs font-medium text-muted-foreground truncate max-w-[280px]" title={utm}>{utm}</span>
                    <span className="text-sm font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">{count}</span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8 italic">No se han detectado campañas UTM</p>
            )}
          </div>
        </div>

        {/* Pantallas y Viewport */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-6">
            <Maximize2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Visualización Avanzada</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-bold text-foreground">Pantallas Retina / HiDPI</p>
                  <p className="text-[10px] text-muted-foreground">Alta densidad de píxeles (&gt;1x)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                  {Math.round((analytics.retinaCount / (analytics.totalVisits || 1)) * 100)}%
                </p>
                <p className="text-[10px] font-bold text-indigo-500 uppercase">{analytics.retinaCount} v.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 border border-border rounded-xl">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Móvil Horizontal</p>
                <p className="text-lg font-bold text-foreground">
                  {analytics.visits.filter(v => v.device === 'mobile' && v.orientation?.includes('landscape')).length}
                </p>
              </div>
              <div className="p-3 border border-border rounded-xl">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Viewport Medio</p>
                <p className="text-xs font-mono font-bold text-indigo-600">
                  {Math.round(analytics.visits.reduce((acc, v) => acc + (v.viewportWidth || 0), 0) / (analytics.totalVisits || 1))}px
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware y Rendimiento */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-foreground">Perfil de Hardware</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Memoria RAM */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Memoria RAM
            </p>
            <div className="space-y-3">
              {Object.entries(analytics.hardwareStats.memory).length > 0 ? (
                Object.entries(analytics.hardwareStats.memory).sort(([,a], [,b]) => b - a).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs italic text-muted-foreground">Sin datos</p>}
            </div>
          </div>
          {/* CPU */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Cpu className="w-3 h-3" /> Procesador
            </p>
            <div className="space-y-3">
              {Object.entries(analytics.hardwareStats.cores).length > 0 ? (
                Object.entries(analytics.hardwareStats.cores).sort(([,a], [,b]) => b - a).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs italic text-muted-foreground">Sin datos</p>}
            </div>
          </div>
          {/* Pantalla Táctil */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <Smartphone className="w-3 h-3" /> Interfaz
            </p>
            <div className="space-y-3">
              {Object.entries(analytics.hardwareStats.touch).length > 0 ? (
                Object.entries(analytics.hardwareStats.touch).sort(([,a], [,b]) => b - a).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs italic text-muted-foreground">Sin datos</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Nueva fila: Idiomas, Zonas horarias, Resoluciones, Conexión */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Idiomas */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Languages className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Idiomas</h3>
          </div>
          <div className="p-5 space-y-3">
            {Object.keys(analytics.languageStats).length > 0 ? (
              Object.entries(analytics.languageStats)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count]) => (
                  <div key={lang} className="flex items-center justify-between">
                    <span className="font-medium text-foreground uppercase text-sm">{lang}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 italic">Esperando nuevas visitas...</p>
            )}
          </div>
        </div>

        {/* Zonas Horarias */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Zonas Horarias</h3>
          </div>
          <div className="p-5 space-y-3 max-h-60 overflow-y-auto">
            {Object.keys(analytics.timezoneStats).length > 0 ? (
              Object.entries(analytics.timezoneStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([tz, count]) => (
                  <div key={tz} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground text-xs truncate" title={tz}>{tz}</span>
                    <span className="text-sm font-bold text-muted-foreground shrink-0">{count}</span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 italic">Esperando nuevas visitas...</p>
            )}
          </div>
        </div>

        {/* Resoluciones de pantalla */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Maximize2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Resoluciones</h3>
          </div>
          <div className="p-5 space-y-3 max-h-60 overflow-y-auto">
            {Object.keys(analytics.resolutionStats).length > 0 ? (
              Object.entries(analytics.resolutionStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([res, count]) => (
                  <div key={res} className="flex items-center justify-between">
                    <span className="font-medium text-foreground text-sm font-mono">{res}</span>
                    <span className="text-sm font-bold text-muted-foreground">{count}</span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 italic">Esperando nuevas visitas...</p>
            )}
          </div>
        </div>

        {/* Tipo de conexión */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Wifi className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-foreground">Tipo de Red</h3>
          </div>
          <div className="p-5 space-y-3">
            {Object.keys(analytics.connectionStats).length > 0 ? (
              Object.entries(analytics.connectionStats)
                .sort(([, a], [, b]) => b - a)
                .map(([conn, count]) => {
                  const percent = Math.round((count / analytics.totalVisits) * 100);
                  const color = conn === '4g' ? 'bg-green-500' : conn === '3g' ? 'bg-yellow-500' : conn === '2g' ? 'bg-orange-500' : 'bg-blue-500';
                  return (
                    <div key={conn} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground uppercase text-sm">{conn}</span>
                        <span className="text-sm font-bold text-muted-foreground">{percent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 italic">Esperando nuevas visitas...</p>
            )}
          </div>
        </div>
      </div>

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
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">SO</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Navegador</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.map((visit) => (
                <tr key={visit.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-sm text-muted-foreground">{formatTimeAgo(visit.timestamp)}</td>
                  <td className="p-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span>{getCountryFlag(visit.countryCode, visit.country)}</span>
                      <span className="text-foreground">{visit.country}</span>
                    </span>
                  </td>
                  <td className="p-3 text-sm text-foreground">{visit.city || '-'}</td>
                  <td className="p-3 text-sm text-foreground font-mono">{visit.page || '/'}</td>
                  <td className="p-3 text-sm">
                    <span className="flex items-center gap-1 text-foreground capitalize">
                      {getDeviceIcon(visit.device)}
                      {visit.device === 'mobile' ? 'Móvil' : visit.device === 'tablet' ? 'Tablet' : 'Escritorio'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-foreground">{visit.os}</td>
                  <td className="p-3 text-sm text-foreground">{visit.browser}</td>
                </tr>
              ))}
              {recentVisits.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No hay visitas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visibleVisits < visits.length && (
          <div className="p-4 border-t border-border text-center">
            <button
              onClick={() => setVisibleVisits(v => v + 100)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Ver más ({visits.length - visibleVisits} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
