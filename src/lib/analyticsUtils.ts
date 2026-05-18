import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, getDay, getWeek, startOfMonth, endOfMonth, subWeeks, subMonths, differenceInDays, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DailyVisitData {
  date: string;
  isoDate: string;
  visits: number;
  dayName: string;
  dayOfWeek: number;
  weekNumber: number;
  month: number;
  year: number;
}

export interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  totalVisits: number;
  avgDaily: number;
  days: number;
}

export interface MonthlyData {
  month: number;
  year: number;
  monthName: string;
  totalVisits: number;
  avgDaily: number;
  days: number;
}

export interface StatsResult {
  totalVisits: number;
  totalDays: number;
  average: number;
  median: number;
  stdDev: number;
  maxVisits: number;
  maxDate: string;
  maxDayName: string;
  minVisits: number;
  minDate: string;
  minDayName: string;
  dayOfWeekStats: { day: string; dayIndex: number; total: number; count: number; avg: number }[];
  mostVisitedDay: string;
  weeklyData: WeeklyData[];
  bestWeek: WeeklyData;
  currentWeek: WeeklyData | null;
  previousWeek: WeeklyData | null;
  weeklyChange: number;
  monthlyData: MonthlyData[];
  bestMonth: MonthlyData;
  currentMonth: MonthlyData | null;
  previousMonth: MonthlyData | null;
  monthlyChange: number;
  trend: 'up' | 'down' | 'stable';
  movingAverage7Days: number;
  movingAverage30Days: number;
  consecutiveGrowthDays: number;
  consecutiveDeclineDays: number;
  longestGrowthStreak: number;
  longestDeclineStreak: number;
  anomalyDays: { date: string; visits: number; expected: number; deviation: number }[];
  yearTotal: number;
}

function parseDateString(dateStr: string): { isoDate: string; dayName: string } {
  const isoDatePart = dateStr.split(' ')[0];
  let isoDate = isoDatePart;
  
  let dayName = '';
  if (dateStr.includes('(')) {
    const match = dateStr.match(/\(([^)]+)\)/);
    if (match) {
      dayName = match[1];
    }
  }
  
  if (!dayName) {
    try {
      const d = parseISO(isoDate);
      dayName = format(d, 'EEEE', { locale: es });
    } catch {
      dayName = 'Desconocido';
    }
  }
  
  return { isoDate, dayName };
}

export function processDailyVisits(dailyVisits: Record<string, number>): DailyVisitData[] {
  const data: DailyVisitData[] = [];
  
  Object.entries(dailyVisits).forEach(([dateStr, visits]) => {
    const { isoDate, dayName } = parseDateString(dateStr);
    
    try {
      const date = parseISO(isoDate);
      data.push({
        date: dateStr,
        isoDate,
        visits,
        dayName,
        dayOfWeek: getDay(date),
        weekNumber: getWeek(date, { weekStartsOn: 1 }),
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });
    } catch {
      // Skip invalid dates
    }
  });
  
  return data.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

export function calculateStats(dailyData: DailyVisitData[]): StatsResult | null {
  if (dailyData.length === 0) return null;
  
  const visits = dailyData.map(d => d.visits).sort((a, b) => a - b);
  const totalVisits = visits.reduce((sum, v) => sum + v, 0);
  const totalDays = visits.length;
  const average = totalVisits / totalDays;
  
  const median = totalDays % 2 === 0
    ? (visits[totalDays / 2 - 1] + visits[totalDays / 2]) / 2
    : visits[Math.floor(totalDays / 2)];
  
  const variance = visits.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / totalDays;
  const stdDev = Math.sqrt(variance);
  
  const maxVisits = Math.max(...visits);
  const maxData = dailyData.find(d => d.visits === maxVisits);
  
  const minVisits = Math.min(...visits);
  const minData = dailyData.find(d => d.visits === minVisits);
  
  const dayOfWeekNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayStats: { [key: number]: { total: number; count: number } } = {};
  
  dailyData.forEach(d => {
    if (!dayStats[d.dayOfWeek]) {
      dayStats[d.dayOfWeek] = { total: 0, count: 0 };
    }
    dayStats[d.dayOfWeek].total += d.visits;
    dayStats[d.dayOfWeek].count += 1;
  });
  
  const dayOfWeekStats = dayOfWeekNames.map((day, idx) => {
    const stats = dayStats[idx] || { total: 0, count: 0 };
    return {
      day,
      dayIndex: idx,
      total: stats.total,
      count: stats.count,
      avg: stats.count > 0 ? stats.total / stats.count : 0
    };
  });
  
  const mostVisitedDay = dayOfWeekStats.reduce((max, d) => d.avg > max.avg ? d : max, dayOfWeekStats[0]);
  
  const weeklyMap: { [key: string]: WeeklyData } = {};
  
  dailyData.forEach(d => {
    const date = parseISO(d.isoDate);
    const weekStart = format(startOfWeek(date, { weekStartsOn  : 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const key = `${d.year}-${d.weekNumber}`;
    
    if (!weeklyMap[key]) {
      weeklyMap[key] = {
        weekStart,
        weekEnd,
        weekNumber: d.weekNumber,
        year: d.year,
        totalVisits: 0,
        avgDaily: 0,
        days: 0
      };
    }
    
    weeklyMap[key].totalVisits += d.visits;
    weeklyMap[key].days += 1;
  });
  
  const weeklyData = Object.values(weeklyMap).map(w => ({
    ...w,
    avgDaily: w.days > 0 ? w.totalVisits / w.days : 0
  })).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.weekNumber - a.weekNumber;
  });
  
  const bestWeek = weeklyData.reduce((max, w) => w.totalVisits > max.totalVisits ? w : max, weeklyData[0]);
  
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekKey = `${now.getFullYear()}-${getWeek(now, { weekStartsOn: 1 })}`;
  const currentWeek = weeklyData.find(w => `${w.year}-${w.weekNumber}` === currentWeekKey) || null;
  
  const prevWeekDate = subWeeks(currentWeekStart, 1);
  const prevWeekKey = `${prevWeekDate.getFullYear()}-${getWeek(prevWeekDate, { weekStartsOn: 1 })}`;
  const previousWeek = weeklyData.find(w => `${w.year}-${w.weekNumber}` === prevWeekKey) || null;
  
  let weeklyChange = 0;
  if (currentWeek && previousWeek) {
    weeklyChange = previousWeek.totalVisits > 0 
      ? ((currentWeek.totalVisits - previousWeek.totalVisits) / previousWeek.totalVisits) * 100
      : 0;
  }
  
  const monthlyMap: { [key: string]: MonthlyData } = {};
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  dailyData.forEach(d => {
    const key = `${d.year}-${d.month}`;
    
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: d.month,
        year: d.year,
        monthName: monthNames[d.month - 1],
        totalVisits: 0,
        avgDaily: 0,
        days: 0
      };
    }
    
    monthlyMap[key].totalVisits += d.visits;
    monthlyMap[key].days += 1;
  });
  
  const monthlyData = Object.values(monthlyMap).map(m => ({
    ...m,
    avgDaily: m.days > 0 ? m.totalVisits / m.days : 0
  })).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  
  const bestMonth = monthlyData.reduce((max, m) => m.totalVisits > max.totalVisits ? m : max, monthlyData[0]);
  
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const currentMonthData = monthlyData.find(m => `${m.year}-${m.month}` === currentMonthKey) || null;
  
  const prevMonthDate = subMonths(now, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth() + 1}`;
  const previousMonthData = monthlyData.find(m => `${m.year}-${m.month}` === prevMonthKey) || null;
  
  let monthlyChange = 0;
  if (currentMonthData && previousMonthData) {
    monthlyChange = previousMonthData.totalVisits > 0
      ? ((currentMonthData.totalVisits - previousMonthData.totalVisits) / previousMonthData.totalVisits) * 100
      : 0;
  }
  
  const last7Days = dailyData.slice(-7);
  const movingAverage7Days = last7Days.length > 0
    ? last7Days.reduce((sum, d) => sum + d.visits, 0) / last7Days.length
    : 0;
  
  const last30Days = dailyData.slice(-30);
  const movingAverage30Days = last30Days.length > 0
    ? last30Days.reduce((sum, d) => sum + d.visits, 0) / last30Days.length
    : 0;
  
  let consecutiveGrowthDays = 0;
  let consecutiveDeclineDays = 0;
  let longestGrowthStreak = 0;
  let longestDeclineStreak = 0;
  let currentGrowthStreak = 0;
  let currentDeclineStreak = 0;
  
  for (let i = 1; i < dailyData.length; i++) {
    const diff = dailyData[i].visits - dailyData[i - 1].visits;
    
    if (diff > 0) {
      currentGrowthStreak++;
      currentDeclineStreak = 0;
      if (currentGrowthStreak > longestGrowthStreak) {
        longestGrowthStreak = currentGrowthStreak;
      }
    } else if (diff < 0) {
      currentDeclineStreak++;
      currentGrowthStreak = 0;
      if (currentDeclineStreak > longestDeclineStreak) {
        longestDeclineStreak = currentDeclineStreak;
      }
    } else {
      currentGrowthStreak = 0;
      currentDeclineStreak = 0;
    }
  }
  
  const lastDiff = dailyData.length > 1 
    ? dailyData[dailyData.length - 1].visits - dailyData[dailyData.length - 2].visits
    : 0;
  consecutiveGrowthDays = lastDiff > 0 ? (dailyData.length > 2 && dailyData[dailyData.length - 2].visits > dailyData[dailyData.length - 3].visits ? 2 : 1) : 0;
  consecutiveDeclineDays = lastDiff < 0 ? (dailyData.length > 2 && dailyData[dailyData.length - 2].visits < dailyData[dailyData.length - 3].visits ? 2 : 1) : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (lastDiff > average * 0.1) trend = 'up';
  else if (lastDiff < -average * 0.1) trend = 'down';
  
  const anomalyDays: { date: string; visits: number; expected: number; deviation: number }[] = [];
  
  dailyData.forEach(d => {
    const deviation = Math.abs(d.visits - average);
    if (deviation > stdDev * 2) {
      anomalyDays.push({
        date: d.isoDate,
        visits: d.visits,
        expected: Math.round(average),
        deviation: Math.round(deviation)
      });
    }
  });
  
  const yearTotal = dailyData.filter(d => d.year === now.getFullYear())
    .reduce((sum, d) => sum + d.visits, 0);
  
  return {
    totalVisits,
    totalDays,
    average: Math.round(average),
    median: Math.round(median),
    stdDev: Math.round(stdDev),
    maxVisits,
    maxDate: maxData?.isoDate || '',
    maxDayName: maxData?.dayName || '',
    minVisits,
    minDate: minData?.isoDate || '',
    minDayName: minData?.dayName || '',
    dayOfWeekStats,
    mostVisitedDay: mostVisitedDay.day,
    weeklyData,
    bestWeek,
    currentWeek,
    previousWeek,
    weeklyChange: Math.round(weeklyChange * 10) / 10,
    monthlyData,
    bestMonth,
    currentMonth: currentMonthData,
    previousMonth: previousMonthData,
    monthlyChange: Math.round(monthlyChange * 10) / 10,
    trend,
    movingAverage7Days: Math.round(movingAverage7Days),
    movingAverage30Days: Math.round(movingAverage30Days),
    consecutiveGrowthDays,
    consecutiveDeclineDays,
    longestGrowthStreak,
    longestDeclineStreak,
    anomalyDays: anomalyDays.slice(0, 10),
    yearTotal
  };
}

export function getCalendarDays(year: number, month: number): { date: Date; isoDate: string; visits: number; isCurrentMonth: boolean }[] {
  const firstDay = startOfMonth(new Date(year, month - 1));
  const lastDay = endOfMonth(new Date(year, month - 1));
  const calendarStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(lastDay, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  return days.map(date => ({
    date,
    isoDate: format(date, 'yyyy-MM-dd'),
    visits: 0,
    isCurrentMonth: date.getMonth() === month - 1
  }));
}

export function getWeekLabel(weekData: WeeklyData): string {
  const start = format(parseISO(weekData.weekStart), 'd MMM', { locale: es });
  const end = format(parseISO(weekData.weekEnd), 'd MMM', { locale: es });
  return `${start} - ${end}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('es-ES');
}

export function formatPercentage(num: number): string {
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}