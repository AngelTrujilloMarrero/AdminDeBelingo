import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyVisitData } from '../lib/analyticsUtils';

interface VisitCalendarProps {
  dailyData: DailyVisitData[];
}

export default function VisitCalendar({ dailyData }: VisitCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const visitsMap = useMemo(() => {
    const map: Record<string, number> = {};
    dailyData.forEach(d => {
      map[d.isoDate] = d.visits;
    });
    return map;
  }, [dailyData]);

  const rankMap = useMemo(() => {
    const sorted = [...dailyData].sort((a, b) => b.visits - a.visits);
    const map: Record<string, number> = {};
    sorted.forEach((d, idx) => {
      map[d.isoDate] = idx + 1;
    });
    return map;
  }, [dailyData]);

  const maxVisits = useMemo(() => {
    return Math.max(...Object.values(visitsMap), 1);
  }, [visitsMap]);

  const totalDays = dailyData.length;

  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const calendarStart = startOfWeek(firstDay, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(lastDay, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(date => {
      const isoDate = format(date, 'yyyy-MM-dd');
      const visits = visitsMap[isoDate] || 0;
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
      const rank = rankMap[isoDate] || 0;
      
      return {
        date,
        isoDate,
        visits,
        rank,
        isCurrentMonth,
        intensity: visits > 0 ? Math.min(visits / maxVisits, 1) : 0
      };
    });
  }, [currentDate, visitsMap, maxVisits, rankMap]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getIntensityColor = (intensity: number, isCurrentMonth: boolean): string => {
    if (intensity === 0) {
      return isCurrentMonth ? 'bg-muted/30' : 'bg-muted/10';
    }
    
    const colors = [
      'bg-teal-100 dark:bg-teal-900/40',
      'bg-teal-200 dark:bg-teal-800/45',
      'bg-emerald-300 dark:bg-emerald-700/55',
      'bg-green-300 dark:bg-green-600/55',
      'bg-lime-300 dark:bg-lime-600/55',
      'bg-yellow-200 dark:bg-yellow-500/55',
      'bg-amber-300 dark:bg-amber-500/60',
      'bg-orange-300 dark:bg-orange-500/65',
      'bg-orange-400 dark:bg-orange-500/70',
      'bg-red-400 dark:bg-red-500/75',
      'bg-rose-500 dark:bg-rose-500/80',
      'bg-purple-500 dark:bg-purple-500/80'
    ];
    
    const index = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
    return colors[index];
  };

  const totalMonthVisits = calendarDays
    .filter(d => d.isCurrentMonth)
    .reduce((sum, d) => sum + d.visits, 0);

  const avgMonthVisits = totalMonthVisits > 0 
    ? Math.round(totalMonthVisits / calendarDays.filter(d => d.isCurrentMonth && d.visits > 0).length)
    : 0;

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Calendario de Visitas</h3>
            <p className="text-xs text-muted-foreground">
              {totalMonthVisits.toLocaleString('es-ES')} visitas este mes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[140px] text-center">
            {monthNames[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={`
              aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative
              transition-all hover:scale-105 cursor-default
              ${getIntensityColor(day.intensity, day.isCurrentMonth)}
              ${!day.isCurrentMonth ? 'opacity-40' : ''}
            `}
          >
            {day.rank > 0 && (
              <span className="absolute top-0.5 right-1 text-[8px] font-black text-foreground/40 leading-none">
                #{day.rank}
              </span>
            )}
            <span className="font-semibold text-foreground">
              {day.date.getDate()}
            </span>
            {day.visits > 0 && (
              <span className="text-[10px] font-bold text-foreground/70">
                {day.visits >= 1000 ? `${(day.visits / 1000).toFixed(1)}k` : day.visits}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Menos</span>
          <div className="flex gap-0.5">
            {[0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.55, 0.64, 0.73, 0.82, 0.91, 1].map((intensity, i) => (
              <div
                key={i}
                className={`w-2.5 h-3 rounded-sm ${getIntensityColor(intensity, true)}`}
              />
            ))}
          </div>
          <span className="text-[8px] text-muted-foreground ml-1">#ranking</span>
          <span className="text-xs text-muted-foreground">Más</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
          Media: {avgMonthVisits.toLocaleString('es-ES')}
        </span>
      </div>
    </div>
  );
}