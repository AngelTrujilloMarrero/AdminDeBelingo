import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarProps {
  onDateSelect: (date: string) => void;
}

const DAYS_ES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const getDayColors = (dayName: string): string => {
  const colors: Record<string, string> = {
    'lunes': 'bg-gradient-to-br from-amber-200 to-amber-300 hover:from-amber-300 hover:to-amber-400 border-amber-400 dark:from-amber-950/60 dark:to-amber-900/60 dark:border-amber-800/60 dark:text-amber-100/90',
    'martes': 'bg-gradient-to-br from-orange-200 to-orange-300 hover:from-orange-300 hover:to-orange-400 border-orange-400 dark:from-orange-950/60 dark:to-orange-900/60 dark:border-orange-800/60 dark:text-orange-100/90',
    'miércoles': 'bg-gradient-to-br from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-400 border-yellow-400 dark:from-yellow-950/60 dark:to-yellow-900/60 dark:border-yellow-800/60 dark:text-yellow-100/90',
    'jueves': 'bg-gradient-to-br from-purple-200 to-purple-300 hover:from-purple-300 hover:to-purple-400 border-purple-400 dark:from-purple-950/60 dark:to-purple-900/60 dark:border-purple-800/60 dark:text-purple-100/90',
    'viernes': 'bg-gradient-to-br from-green-200 to-green-300 hover:from-green-300 hover:to-green-400 border-green-400 dark:from-green-950/60 dark:to-green-900/60 dark:border-green-800/60 dark:text-green-100/90',
    'sabado': 'bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border-blue-300 dark:from-blue-950/60 dark:to-blue-900/60 dark:border-blue-800/60 dark:text-blue-100/90',
    'domingo': 'bg-gradient-to-br from-pink-200 to-pink-300 hover:from-pink-300 hover:to-pink-400 border-pink-400 dark:from-pink-950/60 dark:to-pink-900/60 dark:border-pink-800/60 dark:text-pink-100/90'
  };
  return colors[dayName] || 'bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border-gray-300 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600 dark:text-gray-200';
};

function generateCalendar(year: number, month: number, onDateSelect: (date: string) => void) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  const days = [];
  let date = 1;

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < adjustedFirstDay) {
        days.push(
          <td key={`empty-${year}-${month}-${i}-${j}`} className="p-1">
            <div className="h-16 w-full rounded-lg bg-muted/20 dark:bg-muted/10"></div>
          </td>
        );
      } else if (date > daysInMonth) {
        break;
      } else {
        const currentDate = date;
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${currentDate.toString().padStart(2, '0')}`;
        const fullDate = new Date(year, month, currentDate);
        const dayName = fullDate.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
        const shortDay = DAYS_ES[j];
        const isToday = new Date().toDateString() === fullDate.toDateString();

        days.push(
          <td key={dateString} className="p-1">
            <button
              onClick={() => onDateSelect(dateString)}
              className={`
                w-full h-16 rounded-lg border-2 transition-all duration-300 
                transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md
                flex flex-col items-center justify-center text-sm font-medium
                ${getDayColors(dayName)}
                ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-background' : ''}
              `}
            >
              <span className="text-xs opacity-70 font-semibold uppercase tracking-wide">
                {shortDay}
              </span>
              <span className={`text-lg font-bold ${dayName === 'domingo' || dayName === 'sabado' ? '' : 'text-gray-800 dark:text-white'}`}>
                {currentDate}
              </span>
            </button>
          </td>
        );
        date++;
      }
    }
    if (date > daysInMonth) break;
  }

  return days;
}

export default function Calendar({ onDateSelect }: CalendarProps) {
  const [showMore, setShowMore] = useState(false);
  const currentDate = new Date();

  const calendars = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    calendars.push({
      month: date.getMonth(),
      year: date.getFullYear()
    });
  }

  return (
    <div className="w-full bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold text-white">Calendarios Interactivos</h2>
        </div>
        <p className="text-center text-white/80 text-sm mt-1">
          Selecciona una fecha para agregar un evento
        </p>
      </div>

      {/* Calendarios */}
      <div className="p-6 space-y-6">
        {calendars.map((cal, index) => (
          <div
            key={`${cal.year}-${cal.month}`}
            className={`
              transition-all duration-500 ease-in-out
              ${index >= 2 && !showMore ? 'hidden opacity-0' : 'block opacity-100'}
            `}
          >
            {/* Título del mes */}
            <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-4 mb-4 border border-border">
              <h3 className="text-xl font-bold text-foreground text-center uppercase tracking-wide">
                {MONTHS_ES[cal.month]} {cal.year}
              </h3>
            </div>

            {/* Grid del calendario */}
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <tbody>
                  {Array.from({
                    length: Math.ceil((new Date(cal.year, cal.month + 1, 0).getDate() +
                      (new Date(cal.year, cal.month, 1).getDay() === 0 ? 6 : new Date(cal.year, cal.month, 1).getDay() - 1)) / 7)
                  }).map((_, weekIndex) => (
                    <tr key={`${cal.year}-${cal.month}-week-${weekIndex}`}>
                      {generateCalendar(cal.year, cal.month, onDateSelect)
                        .slice(weekIndex * 7, (weekIndex + 1) * 7)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Botón mostrar más/menos */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 
                       hover:from-indigo-600 hover:to-purple-700 text-white font-semibold 
                       py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 
                       active:scale-95 transition-all duration-300"
          >
            {showMore ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Mostrar Menos</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Mostrar Más</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}