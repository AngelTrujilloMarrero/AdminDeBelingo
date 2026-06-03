import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { processDailyVisits, calculateStats, formatNumber, formatPercentage, getWeekLabel } from '../lib/analyticsUtils';
import VisitCalendar from './VisitCalendar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  Activity,
  Eye,
  ExternalLink,
  Zap,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Target,
  Flame,
  Crown,
  CalendarDays,
  BarChart3,
  Waves,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Star,
  Download,
  Clock,
  Image
} from 'lucide-react';

export default function Analytics() {
  const [visitCount, setVisitCount] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<string>('current');
  const [dailyVisits, setDailyVisits] = useState<Record<string, number>>({});
  const [historicalDailyVisits, setHistoricalDailyVisits] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Descargas de imágenes
  const [downloadRecords, setDownloadRecords] = useState<Record<string, { timestamp: number, type: 'date' | 'festival' }>>({});
  const [monthlyDownloads, setMonthlyDownloads] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'traffic' | 'downloads'>('traffic');

  interface MonthGroupCardProps {
    year: string;
    monthName: string;
    monthNum: number;
    totalVisits: number;
    days: number;
    details: Record<string, number>;
  }

  function MonthGroupCard({ year, monthName, monthNum, totalVisits, days, details }: MonthGroupCardProps) {
    const [expanded, setExpanded] = useState(false);
    const sortedDays = Object.entries(details).sort((a, b) => b[0].localeCompare(a[0]));
    const avgVisits = Math.round(totalVisits / days);
    const maxDay = sortedDays.reduce((max, [date, count]) => count > max[1] ? [date, count] : max, sortedDays[0]);
    const minDay = sortedDays.reduce((min, [date, count]) => count < min[1] ? [date, count] : min, sortedDays[0]);

    const monthColors: Record<number, string> = {
      1: 'from-slate-500/20 to-slate-600/20',
      2: 'from-rose-500/20 to-rose-600/20',
      3: 'from-green-500/20 to-green-600/20',
      4: 'from-emerald-500/20 to-emerald-600/20',
      5: 'from-teal-500/20 to-teal-600/20',
      6: 'from-cyan-500/20 to-cyan-600/20',
      7: 'from-blue-500/20 to-blue-600/20',
      8: 'from-indigo-500/20 to-indigo-600/20',
      9: 'from-violet-500/20 to-violet-600/20',
      10: 'from-purple-500/20 to-purple-600/20',
      11: 'from-fuchsia-500/20 to-fuchsia-600/20',
      12: 'from-orange-500/20 to-orange-600/20'
    };

    return (
      <div className={`bg-gradient-to-r ${monthColors[monthNum] || 'from-muted to-muted'} rounded-2xl border border-border overflow-hidden`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <div className="text-left">
              <p className="text-lg font-black text-foreground">{monthName} {year}</p>
              <p className="text-xs text-muted-foreground">{days} días registrados</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-foreground">{formatNumber(totalVisits)}</p>
            <p className="text-[10px] text-muted-foreground">~{formatNumber(avgVisits)}/día media</p>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                <span className="text-muted-foreground">Día más Visits:</span>
                <p className="font-bold text-green-600 dark:text-green-400 truncate">
                  {maxDay[0].includes('(') ? maxDay[0].split('(')[1].replace(')', '') : maxDay[0].split(' ')[0]}
                </p>
                <p className="font-black text-foreground">{formatNumber(maxDay[1])}</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                <span className="text-muted-foreground">Día menos Visits:</span>
                <p className="font-bold text-red-600 dark:text-red-400 truncate">
                  {minDay[0].includes('(') ? minDay[0].split('(')[1].replace(')', '') : minDay[0].split(' ')[0]}
                </p>
                <p className="font-black text-foreground">{formatNumber(minDay[1])}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {sortedDays.map(([dateStr, count]) => {
                const displayName = dateStr.includes('(') ? dateStr.split('(')[1].replace(')', '') : dateStr;
                const isoDate = dateStr.split(' ')[0];
                return (
                  <div key={dateStr} className="bg-muted/50 rounded-lg p-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-foreground truncate capitalize">{displayName}</p>
                      <p className="text-[8px] text-muted-foreground font-mono">{isoDate}</p>
                    </div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 ml-1 whitespace-nowrap">
                      {count >= 1000 ? `${(count/1000).toFixed(1)}k` : count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

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

    const downloadRecordsRef = ref(db, 'downloads/records');
    const unsubscribeDownloadRecords = onValue(downloadRecordsRef, (snapshot) => {
      if (snapshot.exists()) {
        setDownloadRecords(snapshot.val());
      } else {
        setDownloadRecords({});
      }
    });

    const monthlyDownloadsRef = ref(db, 'downloads/monthly');
    const unsubscribeMonthlyDownloads = onValue(monthlyDownloadsRef, (snapshot) => {
      if (snapshot.exists()) {
        setMonthlyDownloads(snapshot.val());
      } else {
        setMonthlyDownloads({});
      }
    });

    return () => {
      unsubscribeVisitCount();
      unsubscribeDailyVisits();
      unsubscribeHistoricalVisits();
      unsubscribeDownloadRecords();
      unsubscribeMonthlyDownloads();
    };
  }, []);

  const displayedVisits = useMemo(() => {
    return selectedYear === 'current'
      ? dailyVisits
      : (historicalDailyVisits[selectedYear] || {});
  }, [selectedYear, dailyVisits, historicalDailyVisits]);

  const isCurrentYear = selectedYear === 'current';
  const selectedYearNum = selectedYear === 'current' ? new Date().getFullYear() : parseInt(selectedYear);

  const dailyData = useMemo(() => {
    return processDailyVisits(displayedVisits);
  }, [displayedVisits]);

  const stats = useMemo(() => {
    const result = calculateStats(dailyData);
    if (!result) return null;

    if (!isCurrentYear) {
      const yearData = dailyData.filter(d => d.year === selectedYearNum);
      
      const weekMap: Record<string, { total: number; days: number }> = {};
      yearData.forEach(d => {
        const key = `${d.year}-${d.weekNumber}`;
        if (!weekMap[key]) weekMap[key] = { total: 0, days: 0 };
        weekMap[key].total += d.visits;
        weekMap[key].days += 1;
      });
      const weeks = Object.values(weekMap);
      const sortedWeeks = weeks.sort((a, b) => b.total - a.total);
      
      const monthMap: Record<string, { total: number; days: number }> = {};
      yearData.forEach(d => {
        const key = `${d.year}-${d.month}`;
        if (!monthMap[key]) monthMap[key] = { total: 0, days: 0 };
        monthMap[key].total += d.visits;
        monthMap[key].days += 1;
      });
      const months = Object.values(monthMap);
      const sortedMonths = months.sort((a, b) => b.total - a.total);

      const sortedDays = yearData.sort((a, b) => b.visits - a.visits);
      const sortedDaysAsc = yearData.sort((a, b) => a.visits - b.visits);

      return {
        ...result,
        bestWeek: sortedWeeks[0] ? { 
          ...sortedWeeks[0], 
          totalVisits: sortedWeeks[0].total,
          weekStart: '', 
          weekEnd: '', 
          weekNumber: 0, 
          year: selectedYearNum,
          avgDaily: sortedWeeks[0].days > 0 ? sortedWeeks[0].total / sortedWeeks[0].days : 0
        } : null,
        bestMonth: sortedMonths[0] ? {
          ...sortedMonths[0],
          totalVisits: sortedMonths[0].total,
          month: 0,
          year: selectedYearNum,
          monthName: '',
          avgDaily: sortedMonths[0].days > 0 ? sortedMonths[0].total / sortedMonths[0].days : 0
        } : null,
        maxVisits: sortedDays[0]?.visits || 0,
        maxDate: sortedDays[0]?.isoDate || '',
        maxDayName: sortedDays[0]?.dayName || '',
        minVisits: sortedDaysAsc[0]?.visits || 0,
        minDate: sortedDaysAsc[0]?.isoDate || '',
        minDayName: sortedDaysAsc[0]?.dayName || '',
        weeklyChange: 0,
        monthlyChange: 0,
        currentWeek: null,
        previousWeek: null,
        currentMonth: null,
        previousMonth: null,
        yearTotal: yearData.reduce((sum, d) => sum + d.visits, 0)
      };
    }

    return result;
  }, [dailyData, isCurrentYear, selectedYearNum]);

  const chartData = useMemo(() => {
    return dailyData.slice(-30).map(d => ({
      date: d.isoDate.slice(5),
      visits: d.visits,
      day: d.dayName
    }));
  }, [dailyData]);

  const dayOfWeekChartData = useMemo(() => {
    if (!stats) return [];
    // Reordenar para que empiece en Lunes (índice 1 en dayOfWeekStats)
    const mondayFirst = [
      ...stats.dayOfWeekStats.slice(1),
      stats.dayOfWeekStats[0]
    ];
    return mondayFirst.map(d => ({
      day: d.day.substring(0, 3),
      label: `${d.day.substring(0, 3)}${d.count > 0 ? ` (${d.count})` : ''}`,
      visitas: Math.round(d.avg),
      total: d.total,
      count: d.count
    }));
  }, [stats]);

  const weeklyChartData = useMemo(() => {
    if (!stats) return [];
    return stats.weeklyData.slice(0, 12).map(w => ({
      semana: `S${w.weekNumber}`,
      visitas: w.totalVisits,
      promedio: Math.round(w.avgDaily)
    }));
  }, [stats]);

  const monthlyChartData = useMemo(() => {
    if (!stats) return [];
    return stats.monthlyData.slice(0, 12).map(m => ({
      mes: m.monthName.substring(0, 3),
      nombre: m.monthName,
      año: m.year,
      visitas: m.totalVisits,
      promedio: Math.round(m.avgDaily),
      dias: m.days
    }));
  }, [stats]);

  const downloadStats = useMemo(() => {
    const records = Object.values(downloadRecords || {});
    const totalDownloads = records.length;
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    
    let todayCount = 0;
    let dateRangeCount = 0;
    let festivalCount = 0;
    
    const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      descargas: 0
    }));
    
    const dailyDistributionMap: Record<string, number> = {};
    
    records.forEach(r => {
      if (!r.timestamp) return;
      
      const date = new Date(r.timestamp);
      const hour = date.getHours();
      if (hour >= 0 && hour < 24) {
        hourlyDistribution[hour].descargas += 1;
      }
      
      if (r.timestamp >= startOfTodayMs) {
        todayCount += 1;
      }
      
      if (r.type === 'date') {
        dateRangeCount += 1;
      } else if (r.type === 'festival') {
        festivalCount += 1;
      }
      
      const dayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dailyDistributionMap[dayStr] = (dailyDistributionMap[dayStr] || 0) + 1;
    });
    
    const dailyDistribution = Object.entries(dailyDistributionMap)
      .map(([date, count]) => ({
        date: date.slice(5),
        isoDate: date,
        descargas: count
      }))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
      
    const monthlyHistory = Object.entries(monthlyDownloads || {})
      .map(([yearMonth, count]) => {
        const [year, month] = yearMonth.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return {
          mes: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
          key: yearMonth,
          descargas: count
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
      
    return {
      totalDownloads,
      todayCount,
      dateRangeCount,
      festivalCount,
      hourlyDistribution,
      dailyDistribution,
      monthlyHistory
    };
  }, [downloadRecords, monthlyDownloads]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Activity className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm text-muted-foreground font-medium">Cargando datos de tráfico...</span>
      </div>
    );
  }

  const todayISO = new Date().toISOString().split('T')[0];
  const todayKey = Object.keys(displayedVisits).find(k => k.startsWith(todayISO));
  const todayVisits = todayKey ? displayedVisits[todayKey] : 0;
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const yesterdayKey = Object.keys(displayedVisits).find(k => k.startsWith(yesterdayISO));
  const yesterdayVisits = yesterdayKey ? displayedVisits[yesterdayKey] : 0;
  const todayVsYesterday = yesterdayVisits > 0 ? ((todayVisits - yesterdayVisits) / yesterdayVisits) * 100 : 0;
  const todayVsAvg = stats && stats.average > 0 ? ((todayVisits - stats.average) / stats.average) * 100 : 0;

  const availableYears = Object.keys(historicalDailyVisits).sort((a, b) => b.localeCompare(a));

  const TrendIcon = stats?.trend === 'up' ? TrendingUp : stats?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats?.trend === 'up' ? 'text-green-600' : stats?.trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
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

      {/* Selector de Pestañas Premium */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('traffic')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'traffic'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          Tráfico y Visitas
        </button>
        <button
          onClick={() => setActiveTab('downloads')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'downloads'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Download className="w-4 h-4" />
          Descargas de Fotos
        </button>
      </div>

      {activeTab === 'traffic' ? (
        <>
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-lg relative p-8 md:p-12 text-center space-y-8">
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

      {isCurrentYear && (
        <div className="bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl border-2 border-indigo-500/30 p-6 md:p-8 shadow-lg shadow-indigo-500/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Visitas de Hoy</p>
                <p className="text-4xl md:text-5xl font-black text-foreground">{formatNumber(todayVisits)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {stats && (
                <div className="bg-card/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Media diaria</p>
                  <p className="text-lg font-black text-foreground">{formatNumber(stats.average)}</p>
                </div>
              )}
              <div className={`bg-card/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border text-center ${todayVsYesterday >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vs. Ayer</p>
                <div className="flex items-center justify-center gap-1">
                  {todayVsYesterday >= 0 ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                  <span className={`text-lg font-black ${todayVsYesterday >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(todayVsYesterday)}
                  </span>
                </div>
              </div>
              <div className={`bg-card/80 backdrop-blur-sm rounded-xl px-4 py-2.5 border text-center ${todayVsAvg >= 0 ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vs. Media</p>
                <div className="flex items-center justify-center gap-1">
                  {todayVsAvg >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-amber-500" />}
                  <span className={`text-lg font-black ${todayVsAvg >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {formatPercentage(todayVsAvg)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Días Registrados</span>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.totalDays}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Media Diaria</span>
            </div>
            <p className="text-2xl font-black text-foreground">{formatNumber(stats.average)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Mediana</span>
            </div>
            <p className="text-2xl font-black text-foreground">{formatNumber(stats.median)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Desviación</span>
            </div>
            <p className="text-2xl font-black text-foreground">{formatNumber(stats.stdDev)}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Récord Máximo</span>
            </div>
            <p className="text-2xl font-black text-foreground">{formatNumber(stats.maxVisits)}</p>
            <p className="text-[10px] text-muted-foreground truncate">{stats.maxDayName}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Mínimo</span>
            </div>
            <p className="text-2xl font-black text-foreground">{formatNumber(stats.minVisits)}</p>
            <p className="text-[10px] text-muted-foreground truncate">{stats.minDayName}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VisitCalendar dailyData={dailyData} />
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-foreground">Récord Absoluto</h3>
            </div>
            {stats && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl p-4 border border-yellow-500/30">
                  <p className="text-3xl font-black text-foreground">{formatNumber(stats.maxVisits)}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{stats.maxDate}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">{stats.maxDayName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-foreground">Día Más Visitado</h3>
            </div>
            {stats && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-4 border border-indigo-500/30">
                  <p className="text-2xl font-black text-foreground">{stats.mostVisitedDay}</p>
                  <p className="text-sm text-muted-foreground">
                    Promedio: {formatNumber(Math.round(stats.dayOfWeekStats.find(d => d.day === stats.mostVisitedDay)?.avg || 0))} visitas
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-foreground">Estadísticas de Racha</h3>
            </div>
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                  <p className="text-lg font-black text-green-600 dark:text-green-400">{stats.consecutiveGrowthDays}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Días Creciendo</p>
                </div>
                <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <p className="text-lg font-black text-red-600 dark:text-red-400">{stats.consecutiveDeclineDays}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Días Bajando</p>
                </div>
                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.longestGrowthStreak}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Racha Máx. Crec.</p>
                </div>
                <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400">{stats.longestDeclineStreak}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Racha Máx. Baja</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-foreground">Semana con Más Visitas</h3>
          </div>
          {stats && stats.bestWeek && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-4 border border-green-500/20">
              <p className="text-2xl font-black text-foreground">{formatNumber(stats.bestWeek.totalVisits)}</p>
              <p className="text-sm text-muted-foreground">{getWeekLabel(stats.bestWeek)}</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                {stats.bestWeek.days} días · {formatNumber(Math.round(stats.bestWeek.avgDaily))} media
              </p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-foreground">Mes con Más Visitas</h3>
          </div>
          {stats && stats.bestMonth && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
              <p className="text-2xl font-black text-foreground">{formatNumber(stats.bestMonth.totalVisits)}</p>
              <p className="text-sm text-muted-foreground">{stats.bestMonth.monthName} {stats.bestMonth.year}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                {stats.bestMonth.days} días · {formatNumber(Math.round(stats.bestMonth.avgDaily))} media
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-foreground">Comparación Semanal</h3>
            </div>
            {isCurrentYear && stats && (
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${stats.weeklyChange >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {stats.weeklyChange >= 0 ? <ArrowUpRight className="w-4 h-4 text-green-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                <span className={`text-sm font-bold ${stats.weeklyChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercentage(stats.weeklyChange)}
                </span>
              </div>
            )}
          </div>
          {isCurrentYear && stats && stats.currentWeek && stats.previousWeek ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Semana Actual</p>
                <p className="text-xl font-black text-foreground">{formatNumber(stats.currentWeek.totalVisits)}</p>
                <p className="text-[10px] text-muted-foreground">{getWeekLabel(stats.currentWeek)}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Semana Anterior</p>
                <p className="text-xl font-black text-foreground">{formatNumber(stats.previousWeek.totalVisits)}</p>
                <p className="text-[10px] text-muted-foreground">{getWeekLabel(stats.previousWeek)}</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">Comparación no disponible para años históricos</p>
              <p className="text-xs text-muted-foreground mt-1">Solo disponible para el año en curso</p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-violet-500" />
              <h3 className="text-lg font-bold text-foreground">Comparación Mensual</h3>
            </div>
            {isCurrentYear && stats && (
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${stats.monthlyChange >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {stats.monthlyChange >= 0 ? <ArrowUpRight className="w-4 h-4 text-green-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                <span className={`text-sm font-bold ${stats.monthlyChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercentage(stats.monthlyChange)}
                </span>
              </div>
            )}
          </div>
          {isCurrentYear && stats && stats.currentMonth && stats.previousMonth ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Mes Actual</p>
                <p className="text-xl font-black text-foreground">{formatNumber(stats.currentMonth.totalVisits)}</p>
                <p className="text-[10px] text-muted-foreground">{stats.currentMonth.monthName}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">Mes Anterior</p>
                <p className="text-xl font-black text-foreground">{formatNumber(stats.previousMonth.totalVisits)}</p>
                <p className="text-[10px] text-muted-foreground">{stats.previousMonth.monthName}</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">Comparación no disponible para años históricos</p>
              <p className="text-xs text-muted-foreground mt-1">Solo disponible para el año en curso</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-foreground">Evolución de Visitas (Últimos 30 Días)</h3>
          <div className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-lg ${trendColor === 'text-green-600' ? 'bg-green-100 dark:bg-green-900/30' : trendColor === 'text-red-600' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}`}>
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-xs font-bold ${trendColor}`}>
              {stats?.trend === 'up' ? 'Tendencia Alza' : stats?.trend === 'down' ? 'Tendencia Baja' : 'Estable'}
            </span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVisits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex flex-col mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-foreground">Visitas por Día de la Semana</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-8">Media histórica de visitas según el día</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={65} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
                          <p className="text-xs font-bold text-foreground mb-1 capitalize">{data.day} (Promedio)</p>
                          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatNumber(data.visitas)}
                          </p>
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground">
                              Total: <span className="font-bold text-foreground">{formatNumber(data.total)}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Muestras: <span className="font-bold text-foreground">{data.count} {data.count === 1 ? 'día' : 'días'}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="visitas" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex flex-col mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-bold text-foreground">Visitas por Mes</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-8">Totales mensuales y media diaria</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
                          <p className="text-xs font-bold text-foreground mb-1">{data.nombre} {data.año}</p>
                          <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                            {formatNumber(data.visitas)} <span className="text-[10px] font-normal text-muted-foreground">total</span>
                          </p>
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground">
                              Media diaria: <span className="font-bold text-foreground">{formatNumber(data.promedio)}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Días registrados: <span className="font-bold text-foreground">{data.dias}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="visitas" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Media 7 Días</span>
          </div>
          <p className="text-xl font-black text-foreground">{stats ? formatNumber(stats.movingAverage7Days) : '-'}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Media 30 Días</span>
          </div>
          <p className="text-xl font-black text-foreground">{stats ? formatNumber(stats.movingAverage30Days) : '-'}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Visitas Año Actual</span>
          </div>
          <p className="text-xl font-black text-foreground">{stats ? formatNumber(stats.yearTotal) : '-'}</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Días Anómalos</span>
          </div>
          <p className="text-xl font-black text-foreground">{stats ? stats.anomalyDays.length : '-'}</p>
        </div>
      </div>

      {stats && stats.anomalyDays.length > 0 && (
        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-foreground">Días con Picos Inhabituales</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.anomalyDays.slice(0, 10).map((day, idx) => (
              <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-sm font-bold text-foreground">{day.date}</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{formatNumber(day.visits)}</p>
                <p className="text-[10px] text-muted-foreground">esperado: {formatNumber(day.expected)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-foreground">Registro de Visitas Diarias</h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="ml-auto bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
          >
            <option value="current">2026 (Activo)</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        {Object.keys(displayedVisits).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay registros acumulados para la vista seleccionada.
          </p>
        ) : (
          <div className="space-y-3">
            {(() => {
              const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
              
              const groupedByMonth: Record<string, { total: number; days: number; details: Record<string, number> }> = {};
              
              Object.entries(displayedVisits).forEach(([dateString, count]) => {
                const isoDate = dateString.split(' ')[0];
                const [year, month] = isoDate.split('-');
                const monthKey = `${year}-${month}`;
                
                if (!groupedByMonth[monthKey]) {
                  groupedByMonth[monthKey] = { total: 0, days: 0, details: {} };
                }
                groupedByMonth[monthKey].total += count;
                groupedByMonth[monthKey].days += 1;
                groupedByMonth[monthKey].details[dateString] = count;
              });
              
              const sortedMonths = Object.entries(groupedByMonth).sort((a, b) => b[0].localeCompare(a[0]));
              
              return sortedMonths.map(([monthKey, data]) => {
                const [year, month] = monthKey.split('-');
                const monthName = monthNames[parseInt(month) - 1];
                
                return (
                  <MonthGroupCard
                    key={monthKey}
                    year={year}
                    monthName={monthName}
                    monthNum={parseInt(month)}
                    totalVisits={data.total}
                    days={data.days}
                    details={data.details}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>
      </>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Tarjetas de Resumen / KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden animate-slideUp">
              <div className="absolute top-4 right-4 text-indigo-500/10">
                <Download className="w-12 h-12" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descargas este Mes</p>
              <h4 className="text-3xl font-black text-foreground">{downloadStats.totalDownloads}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Registros individuales activos en BD</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden animate-slideUp">
              <div className="absolute top-4 right-4 text-emerald-500/10">
                <Zap className="w-12 h-12" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descargas de Hoy</p>
              <h4 className="text-3xl font-black text-foreground">{downloadStats.todayCount}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Desde las 00:00 de hoy</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden animate-slideUp">
              <div className="absolute top-4 right-4 text-blue-500/10">
                <Calendar className="w-12 h-12" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Exportar Fechas (Rango)</p>
              <h4 className="text-3xl font-black text-foreground">{downloadStats.dateRangeCount}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Descargas tipo "Exportar Rango"</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden animate-slideUp">
              <div className="absolute top-4 right-4 text-purple-500/10">
                <Image className="w-12 h-12" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Carteles de Fiesta</p>
              <h4 className="text-3xl font-black text-foreground">{downloadStats.festivalCount}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Descargas de carteles individuales</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolución Diaria */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
              <div className="flex flex-col mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-foreground">Evolución de Descargas (Día a Día)</h3>
                </div>
                <p className="text-xs text-muted-foreground ml-8">Descargas diarias del mes actual</p>
              </div>
              <div className="h-64">
                {downloadStats.dailyDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No hay descargas registradas en este mes todavía
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={downloadStats.dailyDistribution}>
                      <defs>
                        <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="descargas"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDownloads)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Distribución Horaria */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
              <div className="flex flex-col mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-foreground">¿A qué hora descarga la gente?</h3>
                </div>
                <p className="text-xs text-muted-foreground ml-8">Distribución de descargas por hora del día</p>
              </div>
              <div className="h-64">
                {downloadStats.totalDownloads === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No hay datos de distribución horaria en este mes
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={downloadStats.hourlyDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="descargas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Histórico Mensual */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-lg">
            <div className="flex flex-col mb-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-foreground">Histórico Acumulado por Mes</h3>
              </div>
              <p className="text-xs text-muted-foreground ml-8">Descargas consolidadas al final de cada mes</p>
            </div>
            <div className="h-72">
              {downloadStats.monthlyHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No hay datos históricos mensuales acumulados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={downloadStats.monthlyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="descargas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}