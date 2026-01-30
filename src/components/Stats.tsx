import { useMemo, useState } from 'react';
import { Event } from '../types/event';
import FormationStats from './FormationStats';
import { normalizeString } from '../lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Music,
  Calendar,
  MapPin,
  Clock,
  Sun,
  Snowflake,
  Award,
  Target,
  Timer,
  Percent,
  Star,
  Zap,
  AlertCircle,
  Activity,
  Route,
  Home,
  Trophy,
  Flame,
  Crown,
  Shield,
  Eye,
  Brain,
  Lightbulb
} from 'lucide-react';

interface StatsProps {
  events: Event[];
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

export default function Stats({ events }: StatsProps) {
  const years = useMemo(() => {
    const allYears = events.map(e => new Date(e.day).getFullYear());
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  }, [events]);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    const currentYear = new Date().getFullYear();
    return years.includes(currentYear) ? currentYear : (years[0] || 'all');
  });

  const filteredEvents = useMemo(() => {
    if (selectedYear === 'all') return events;
    return events.filter(e => new Date(e.day).getFullYear() === selectedYear);
  }, [events, selectedYear]);

  const statistics = useMemo(() => {
    if (filteredEvents.length === 0) return null;

    // Use filteredEvents for all calculations
    const currentEvents = filteredEvents;

    // 1. ORQUESTAS CON MÁS ACTUACIONES (excluyendo DJ)
    const orquestaCounts: { [key: string]: number } = {};
    let djEvents = 0;

    // Análisis de distribución de DJs
    let eventosCon1DJ = 0;
    let eventosCon2DJ = 0;
    let eventosCon3OMasDJ = 0;

    currentEvents.forEach(event => {
      const orquestas = event.orquesta.split(',').map(o => o.trim());
      let djCount = 0;

      orquestas.forEach(orq => {
        if (orq) {
          // Contar DJ por separado
          if (normalizeString(orq).includes('dj')) {
            djEvents++;
            djCount++;
          } else {
            orquestaCounts[orq] = (orquestaCounts[orq] || 0) + 1;
          }
        }
      });

      // Clasificar eventos por número de DJs
      if (djCount === 1) {
        eventosCon1DJ++;
      } else if (djCount === 2) {
        eventosCon2DJ++;
      } else if (djCount >= 3) {
        eventosCon3OMasDJ++;
      }
    });

    const topOrquestas = Object.entries(orquestaCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // 2. ORQUESTAS AL ALZA Y A LA BAJA (últimos 3 meses vs anteriores 6 meses)
    // Nota: Estas tendencias pueden estar limitadas si el año seleccionado no tiene suficientes datos previos
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    const nineMonthsAgo = new Date(now.getTime() - (270 * 24 * 60 * 60 * 1000));

    const recentEventsTrend = currentEvents.filter(e => new Date(e.day) >= threeMonthsAgo);
    const olderEventsTrend = currentEvents.filter(e => {
      const date = new Date(e.day);
      return date >= nineMonthsAgo && date < threeMonthsAgo;
    });

    const recentCounts: { [key: string]: number } = {};
    const olderCounts: { [key: string]: number } = {};

    recentEventsTrend.forEach(event => {
      const orquestas = event.orquesta.split(',').map(o => o.trim());
      orquestas.forEach(orq => {
        if (orq) recentCounts[orq] = (recentCounts[orq] || 0) + 1;
      });
    });

    olderEventsTrend.forEach(event => {
      const orquestas = event.orquesta.split(',').map(o => o.trim());
      orquestas.forEach(orq => {
        if (orq) olderCounts[orq] = (olderCounts[orq] || 0) + 1;
      });
    });

    const trendData = Object.keys({ ...recentCounts, ...olderCounts }).map(orq => {
      const recent = recentCounts[orq] || 0;
      const older = olderCounts[orq] || 0;
      const change = older > 0 ? ((recent - older) / older) * 100 : (recent > 0 ? 100 : 0);
      return { orquest: orq, recent, older, change };
    }).filter(item => (item.recent + item.older) >= (selectedYear === 'all' ? 9 : 3)); // Ajuste de threshold para vista por año

    const alAlza = trendData
      .filter(item => item.change > 10)
      .sort((a, b) => b.change - a.change)
      .slice(0, 8);

    const aLaBaja = trendData
      .filter(item => item.change < -10)
      .sort((a, b) => a.change - b.change)
      .slice(0, 8);

    // 3. ESTACIONALIDAD
    const veranoCounts: { [key: string]: number } = {};
    const inviernoCounts: { [key: string]: number } = {};
    const primaveraCounts: { [key: string]: number } = {};
    const otoñoCounts: { [key: string]: number } = {};

    currentEvents.forEach(event => {
      const month = new Date(event.day).getMonth() + 1;
      const orquestas = event.orquesta.split(',').map(o => o.trim());

      let season: string;
      if (month >= 6 && month <= 8) season = 'summer';
      else if (month >= 3 && month <= 5) season = 'spring';
      else if (month >= 9 && month <= 11) season = 'autumn';
      else season = 'winter';

      orquestas.forEach(orq => {
        if (orq && !normalizeString(orq).includes('dj')) {
          if (season === 'summer') veranoCounts[orq] = (veranoCounts[orq] || 0) + 1;
          else if (season === 'winter') inviernoCounts[orq] = (inviernoCounts[orq] || 0) + 1;
          else if (season === 'spring') primaveraCounts[orq] = (primaveraCounts[orq] || 0) + 1;
          else if (season === 'autumn') otoñoCounts[orq] = (otoñoCounts[orq] || 0) + 1;
        }
      });
    });

    const topVerano = Object.entries(veranoCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    const topInvierno = Object.entries(inviernoCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    const topPrimavera = Object.entries(primaveraCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    const topOtoño = Object.entries(otoñoCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

    // 4. MUNICIPIOS MÁS POPULARES
    const municipioCounts: { [key: string]: number } = {};
    currentEvents.forEach(event => {
      if (event.municipio) {
        municipioCounts[event.municipio] = (municipioCounts[event.municipio] || 0) + 1;
      }
    });
    const topMunicipios = Object.entries(municipioCounts).sort(([, a], [, b]) => b - a).slice(0, 10);

    // 5. HORARIOS POR DÍA DE LA SEMANA
    const horariosPorDia: { [key: string]: { [time: string]: number } } = {};
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    diasSemana.forEach(dia => horariosPorDia[dia] = {});

    currentEvents.forEach(event => {
      const diaIndex = new Date(event.day).getDay();
      const dia = diasSemana[diaIndex];
      if (horariosPorDia[dia]) {
        horariosPorDia[dia][event.hora] = (horariosPorDia[dia][event.hora] || 0) + 1;
      }
    });

    const horariosPopulares = Object.entries(horariosPorDia).map(([dia, horarios]) => {
      const topHora = Object.entries(horarios).sort(([, a], [, b]) => b - a)[0];
      return { dia, hora: topHora ? topHora[0] : 'N/A', count: topHora ? topHora[1] : 0 };
    });

    // 6. TIPOS DE EVENTOS
    const tipoCounts: { [key: string]: number } = {};
    const orquestasPorTipo: { [key: string]: { [orq: string]: number } } = {};
    currentEvents.forEach(event => {
      const tipo = event.tipo || 'Otro';
      tipoCounts[tipo] = (tipoCounts[tipo] || 0) + 1;
      const orquestas = event.orquesta.split(',').map(o => o.trim()).filter(orq => !normalizeString(orq).includes('dj'));
      orquestas.forEach(orq => {
        if (!orquestasPorTipo[tipo]) orquestasPorTipo[tipo] = {};
        orquestasPorTipo[tipo][orq] = (orquestasPorTipo[tipo][orq] || 0) + 1;
      });
    });

    const totalEventosCalc = currentEvents.length;
    const tiposPorcentaje = Object.entries(tipoCounts).map(([tipo, count]) => {
      const topOrqs = Object.entries(orquestasPorTipo[tipo] || {}).sort(([, a], [, b]) => b - a).slice(0, 3).map(([orq, count]) => ({ orquest: orq, count }));
      return { tipo, count, porcentaje: Math.round((count / totalEventosCalc) * 100), topOrquestas: topOrqs };
    }).sort((a, b) => b.count - a.count);

    // 7. SORPRESAS
    const eventosPorDia = new Array(7).fill(0);
    const horaGeneralCounts: { [key: string]: number } = {};
    const fechasOrquesta: { [key: string]: Set<string> } = {};
    const orquestasPorMunicipio: { [key: string]: Set<string> } = {};

    currentEvents.forEach(event => {
      const orquestas = event.orquesta.split(',').map(o => o.trim());
      const tieneDJ = orquestas.some(orq => normalizeString(orq).includes('dj'));
      if (!tieneDJ) {
        eventosPorDia[new Date(event.day).getDay()]++;
        horaGeneralCounts[event.hora] = (horaGeneralCounts[event.hora] || 0) + 1;
      }
      orquestas.forEach(orq => {
        if (orq && !normalizeString(orq).includes('dj')) {
          if (!fechasOrquesta[orq]) fechasOrquesta[orq] = new Set();
          fechasOrquesta[orq].add(event.day);
          if (event.municipio) {
            if (!orquestasPorMunicipio[event.municipio]) orquestasPorMunicipio[event.municipio] = new Set();
            orquestasPorMunicipio[event.municipio].add(orq);
          }
        }
      });
    });

    const diaMasMusical = diasSemana[eventosPorDia.indexOf(Math.max(...eventosPorDia))];
    const horaPopularArr = Object.entries(horaGeneralCounts).sort(([, a], [, b]) => b - a)[0];
    const horaPopular = horaPopularArr ? { hora: horaPopularArr[0], count: horaPopularArr[1] } : null;

    const workaholicOrquest = Object.entries(fechasOrquesta).map(([orq, fechas]) => {
      const sorted = Array.from(fechas).sort();
      let max = 1, curr = 1;
      for (let i = 1; i < sorted.length; i++) {
        if ((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) === 86400000) { curr++; max = Math.max(max, curr); }
        else curr = 1;
      }
      return { orquest: orq, maxConsecutivos: max };
    }).sort((a, b) => b.maxConsecutivos - a.maxConsecutivos)[0];

    const municipioVariado = Object.entries(orquestasPorMunicipio).map(([m, s]) => ({ municipio: m, variedad: s.size })).sort((a, b) => b.variedad - a.variedad)[0];

    // 8. MÉTRICAS ADICIONALES
    const eventosPorFecha: { [key: string]: number } = {};
    const municipiosPorOrquesta: { [key: string]: Set<string> } = {};
    currentEvents.forEach(e => {
      eventosPorFecha[e.day] = (eventosPorFecha[e.day] || 0) + 1;
      e.orquesta.split(',').map(o => o.trim()).forEach(orq => {
        if (orq && !normalizeString(orq).includes('dj')) {
          if (!municipiosPorOrquesta[orq]) municipiosPorOrquesta[orq] = new Set();
          municipiosPorOrquesta[orq].add(e.municipio);
        }
      });
    });

    const diasSaturados = Object.entries(eventosPorFecha).filter(([, c]) => c >= 3).sort(([, a], [, b]) => b - a).slice(0, 5);
    const orquestasVersatiles = Object.entries(municipiosPorOrquesta).map(([orq, muns]) => ({ orquest: orq, municipios: muns.size, totalEventos: orquestaCounts[orq] || 0 })).filter(i => i.totalEventos >= 3).sort((a, b) => b.municipios - a.municipios).slice(0, 5);

    const eficienciaOrquestas = Object.keys(orquestaCounts).map(orq => {
      const evs = currentEvents.filter(e => e.orquesta.includes(orq));
      const meses = new Set(evs.map(e => `${new Date(e.day).getFullYear()}-${new Date(e.day).getMonth() + 1}`)).size;
      return { orquest: orq, eficiencia: Math.round((evs.length / Math.max(1, meses)) * 100) / 100, totalEventos: evs.length, mesesActivos: meses };
    }).sort((a, b) => b.eficiencia - a.eficiencia).slice(0, 5);

    const horariosPorTipoMap: { [key: string]: { [t: string]: number } } = {};
    currentEvents.forEach(e => {
      const t = e.tipo || 'Otro';
      if (!horariosPorTipoMap[t]) horariosPorTipoMap[t] = {};
      horariosPorTipoMap[t][e.hora] = (horariosPorTipoMap[t][e.hora] || 0) + 1;
    });
    const horariosPreferidos = Object.entries(horariosPorTipoMap).map(([t, h]) => {
      const top = Object.entries(h).sort(([, a], [, b]) => b - a)[0];
      return { tipo: t, hora: top ? top[0] : 'N/A', count: top ? top[1] : 0 };
    }).sort((a, b) => b.count - a.count).slice(0, 10);

    // 9. MÉTRICAS CREATIVAS
    const compFecha: { [f: string]: string[] } = {}, compMun: { [m: string]: string[] } = {}, movOrq: { [o: string]: string[] } = {};
    currentEvents.forEach(e => {
      const orqs = e.orquesta.split(',').map(o => o.trim()).filter(o => !normalizeString(o).includes('dj'));
      if (!compFecha[e.day]) compFecha[e.day] = []; compFecha[e.day].push(...orqs);
      if (!compMun[e.municipio]) compMun[e.municipio] = []; compMun[e.municipio].push(...orqs);
      orqs.forEach(o => { if (!movOrq[o]) movOrq[o] = []; movOrq[o].push(e.municipio); });
    });

    const competenciaFechas = Object.entries(compFecha).map(([f, o]) => ({ fecha: f, cantidadOrquestas: new Set(o).size, orquestas: [...new Set(o)] })).filter(i => i.cantidadOrquestas > 1).sort((a, b) => b.cantidadOrquestas - a.cantidadOrquestas).slice(0, 3);
    const competenciaMunicipios = Object.entries(compMun).map(([m, o]) => ({ municipio: m, cantidadOrquestas: new Set(o).size, orquestas: [...new Set(o)] })).filter(i => i.cantidadOrquestas > 1).sort((a, b) => b.cantidadOrquestas - a.cantidadOrquestas).slice(0, 3);
    const rutasGeograficas = Object.entries(movOrq).map(([o, m]) => ({ orquest: o, movimientos: new Set(m).size, municipios: [...new Set(m)], totalEventos: orquestaCounts[o] || 0 })).filter(i => i.totalEventos >= 4).sort((a, b) => b.movimientos - a.movimientos).slice(0, 5);
    const fidelidadTerritorial = Object.entries(municipiosPorOrquesta).map(([o, m]) => ({ orquest: o, municipios: m.size, totalEventos: orquestaCounts[o] || 0, fidelidad: Math.round((m.size / Math.max(1, orquestaCounts[o])) * 100) })).filter(i => i.totalEventos >= 3).sort((a, b) => a.fidelidad - b.fidelidad);
    const masFiel = fidelidadTerritorial[0], masNomada = fidelidadTerritorial[fidelidadTerritorial.length - 1];
    const diaMasActivo = Object.entries(eventosPorFecha).sort(([, a], [, b]) => b - a)[0];
    const rachaMasLarga = workaholicOrquest;
    const prediccionesEmergentes = Object.entries(recentCounts).filter(([o, c]) => c >= 2 && c <= 6 && (olderCounts[o] || 0) < c && o !== 'dj').map(([o, c]) => ({ orquest: o, reciente: c, anterior: olderCounts[o] || 0, potencial: 'En Crecimiento' })).slice(0, 3);

    const orquestasEstablecidasNames = Object.keys(orquestaCounts).filter(o => orquestaCounts[o] >= (selectedYear === 'all' ? 9 : 3)).sort((a, b) => orquestaCounts[b] - orquestaCounts[a]).slice(0, 8);
    const analisisEstablecidas = orquestasEstablecidasNames.map(orq => {
      const evs = currentEvents.filter(e => e.orquesta.includes(orq));
      const mCount: any = {}, tCount: any = {}, hCount: any = {}, dCount: any = {}, sCount: any = { Primavera: 0, Verano: 0, Otoño: 0, Invierno: 0 };
      evs.forEach(e => {
        mCount[e.municipio] = (mCount[e.municipio] || 0) + 1;
        tCount[e.tipo || 'Otro'] = (tCount[e.tipo || 'Otro'] || 0) + 1;
        hCount[e.hora] = (hCount[e.hora] || 0) + 1;
        dCount[diasSemana[new Date(e.day).getDay()]] = (dCount[diasSemana[new Date(e.day).getDay()]] || 0) + 1;
        const m = new Date(e.day).getMonth() + 1;
        if (m >= 3 && m <= 5) sCount.Primavera++; else if (m >= 6 && m <= 8) sCount.Verano++; else if (m >= 9 && m <= 11) sCount.Otoño++; else sCount.Invierno++;
      });
      return {
        orquest: orq, totalEventos: orquestaCounts[orq],
        municipioFavorito: Object.entries(mCount).sort(([, a], [, b]) => b as number - (a as number))[0],
        tipoFavorito: Object.entries(tCount).sort(([, a], [, b]) => b as number - (a as number))[0],
        horarioFavorito: Object.entries(hCount).sort(([, a], [, b]) => b as number - (a as number))[0],
        diaFavorito: Object.entries(dCount).sort(([, a], [, b]) => b as number - (a as number))[0],
        estacionFavorita: Object.entries(sCount).sort(([, a], [, b]) => b as number - (a as number))[0]
      };
    });

    return {
      topOrquestas, alAlza, aLaBaja, topVerano, topInvierno, topPrimavera, topOtoño, topMunicipios, horariosPopulares, tiposPorcentaje, djEvents,
      djDistribution: { eventosCon1DJ, eventosCon2DJ, eventosCon3OMasDJ, totalEventosConDJ: eventosCon1DJ + eventosCon2DJ + eventosCon3OMasDJ },
      sorpresas: { diaMasMusical, horaPopular, workaholicOrquest, municipioVariado },
      metricasAdicionales: { diasSaturados, orquestasVersatiles, eficienciaOrquestas, horariosPreferidos },
      metricasCreativas: { competenciaFechas, competenciaMunicipios, rutasGeograficas, fidelidadTerritorial, masFiel, masNomada, diaMasActivo, rachaMasLarga, prediccionesEmergentes },
      orquestasEstablecidas: { analisis: analisisEstablecidas, orquestas: orquestasEstablecidasNames.map(o => ({ orquest: o, count: orquestaCounts[o] })) }
    };
  }, [filteredEvents, selectedYear]);

  if (!statistics) {
    return (
      <div className="w-full p-6 text-center">
        <div className="bg-muted/30 rounded-2xl border border-border p-10 flex flex-col items-center justify-center space-y-4">
          <div className="bg-muted p-4 rounded-full">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sin datos suficientes</h2>
          <p className="text-muted-foreground max-w-md">No hay suficientes eventos registrados en este período para generar estadísticas fiables.</p>
        </div>
      </div>
    );
  }

  // Helper Components for the new Layout
  const StatCard = ({ title, icon: Icon, children, className = "" }: any) => (
    <div className={`bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col ${className}`}>
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">{title}</h3>
      </div>
      <div className="p-5 flex-1 relative">
        {children}
      </div>
    </div>
  );

  const MiniStat = ({ label, value, subtext, icon: Icon, colorClass = "text-indigo-600", bgClass = "bg-indigo-50" }: any) => (
    <div className="bg-card rounded-xl border border-border p-4 flex items-start justify-between shadow-sm hover:translate-y-[-2px] transition-transform">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1 font-medium">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${bgClass} dark:bg-opacity-20`}>
        <Icon className={`h-5 w-5 ${colorClass} dark:text-opacity-90`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-indigo-200 dark:shadow-indigo-900/20 shadow-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Resumen Estadístico</h2>
            <p className="text-xs text-muted-foreground">Mostrando datos de: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedYear === 'all' ? 'Histórico Completo' : selectedYear}</span></p>
          </div>
        </div>

        <div className="flex bg-muted p-1 rounded-xl">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedYear === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Todo
          </button>
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedYear === year
                ? 'bg-background text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      {/* 2. Key Metrics - Bento Grid Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat
          label="Total Actuaciones"
          value={statistics.topOrquestas.reduce((acc: number, curr: any) => acc + curr[1], 0)}
          subtext="Eventos registrados"
          icon={Music}
          colorClass="text-violet-600"
          bgClass="bg-violet-50"
        />
        <MiniStat
          label="Día Récord"
          value={statistics.sorpresas.diaMasMusical}
          subtext="Mayor actividad"
          icon={Calendar}
          colorClass="text-pink-600"
          bgClass="bg-pink-50"
        />
        <MiniStat
          label="Hora Punta"
          value={statistics.sorpresas.horaPopular?.hora || 'N/A'}
          subtext={`${statistics.sorpresas.horaPopular?.count || 0} eventos`}
          icon={Clock}
          colorClass="text-orange-600"
          bgClass="bg-orange-50"
        />
        <MiniStat
          label="Presencia DJ"
          value={statistics.djEvents}
          subtext="Actuaciones totales"
          icon={Zap}
          colorClass="text-yellow-600"
          bgClass="bg-yellow-50"
        />
      </div>

      {/* Formation Stats Integration */}
      <FormationStats events={filteredEvents} selectedYear={selectedYear} />

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Rankings (Width 8/12) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Top Orquestas Table */}
          <StatCard title="🏆 Top 10 Orquestas" icon={Trophy}>
            <div className="space-y-4">
              {statistics.topOrquestas.map(([orq, count]: any, index: number) => (
                <div key={index} className="flex items-center justify-between group p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-default">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${index < 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md' : 'bg-muted text-muted-foreground'}`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{orq}</p>
                      <div className="w-32 md:w-64 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(count / statistics.topOrquestas[0][1]) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-foreground text-lg">{count}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Eventos</span>
                  </div>
                </div>
              ))}
            </div>
          </StatCard>

          {/* Trends Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="📈 Tendencia Al Alza" icon={TrendingUp}>
              <div className="space-y-3">
                {statistics.alAlza.length > 0 ? statistics.alAlza.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                    <span className="font-semibold text-foreground">{item.orquest}</span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-lg text-xs font-bold">+{Math.round(item.change)}%</span>
                  </div>
                )) : <p className="text-muted-foreground text-sm text-center py-4">Sin cambios significativos</p>}
              </div>
            </StatCard>

            <StatCard title="📉 Tendencia A La Baja" icon={TrendingDown}>
              <div className="space-y-3">
                {statistics.aLaBaja.length > 0 ? statistics.aLaBaja.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    <span className="font-semibold text-foreground">{item.orquest}</span>
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-lg text-xs font-bold">{Math.round(item.change)}%</span>
                  </div>
                )) : <p className="text-muted-foreground text-sm text-center py-4">Sin cambios significativos</p>}
              </div>
            </StatCard>
          </div>

          {/* Seasonality */}
          <StatCard title="☀️ Estacionalidad" icon={Sun}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Primavera', data: statistics.topPrimavera, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
                { label: 'Verano', data: statistics.topVerano, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
                { label: 'Otoño', data: statistics.topOtoño, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
                { label: 'Invierno', data: statistics.topInvierno, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' }
              ].map((season, idx) => (
                <div key={idx} className="space-y-3">
                  <h4 className={`font-bold ${season.color} flex items-center gap-2`}>
                    <div className={`w-2 h-2 rounded-full ${season.bg}`}></div>
                    {season.label}
                  </h4>
                  <div className="space-y-2">
                    {season.data.length > 0 ? season.data.slice(0, 3).map(([orq, count]: any, ii: number) => (
                      <div key={ii} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">{orq}</span>
                        <span className="font-semibold text-foreground">{count}</span>
                      </div>
                    )) : <span className="text-xs text-muted-foreground italic">No Data</span>}
                  </div>
                </div>
              ))}
            </div>
          </StatCard>

        </div>

        {/* Right Column: Details & Insights (Width 4/12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Municipios */}
          <StatCard title="📍 Top Municipios" icon={MapPin}>
            <div className="space-y-1">
              {statistics.topMunicipios.map(([mun, count]: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 px-2 rounded-lg transition-colors">
                  <span className="text-sm font-medium text-foreground">{mun}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(count / statistics.topMunicipios[0][1]) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </StatCard>

          {/* Insights / Sorpresas */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-6 h-6 text-yellow-300" />
              <h3 className="font-bold text-lg">Insights Curiosos</h3>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold mb-1">Workaholic Award</p>
                <div className="flex justify-between items-end">
                  <p className="font-bold text-xl">{statistics.sorpresas.workaholicOrquest?.orquest || 'N/A'}</p>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded text-white">{statistics.sorpresas.workaholicOrquest?.maxConsecutivos} días seguidos</span>
                </div>
              </div>

              <div className="h-px bg-white/10"></div>

              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold mb-1">Más Variedad</p>
                <div className="flex justify-between items-end">
                  <p className="font-bold text-xl truncate pr-2">{statistics.sorpresas.municipioVariado?.municipio || 'N/A'}</p>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded text-white">{statistics.sorpresas.municipioVariado?.variedad} orquestas</span>
                </div>
              </div>

              <div className="h-px bg-white/10"></div>

              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold mb-1">Más Viajera</p>
                <div className="flex justify-between items-end">
                  <p className="font-bold text-xl">{statistics.metricasCreativas.rutasGeograficas[0]?.orquest || 'N/A'}</p>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded text-white">{statistics.metricasCreativas.rutasGeograficas[0]?.movimientos} municipios</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Distribution */}
          <StatCard title="⏰ Distribución Horaria" icon={Clock}>
            <div className="space-y-2">
              {statistics.horariosPopulares.slice(0, 5).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-muted/50 rounded-lg p-2.5">
                  <span className="text-sm font-medium text-muted-foreground">{item.dia}</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.hora}</span>
                </div>
              ))}
            </div>
          </StatCard>
        </div>

      </div>

      {/* 4. Footer Section - Detailed Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="⚡ Eficiencia" icon={Zap} className="h-full">
          <p className="text-xs text-muted-foreground mb-4">Eventos por mes activo (Top 5)</p>
          {statistics.metricasAdicionales.eficienciaOrquestas.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
              <span className="text-sm font-medium text-foreground">{item.orquest}</span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{item.eficiencia} / mes</span>
            </div>
          ))}
        </StatCard>

        <StatCard title="👑 Orquestas Establecidas" icon={Crown} className="h-full">
          <p className="text-xs text-muted-foreground mb-4">Líderes de la temporada</p>
          <div className="flex flex-wrap gap-2">
            {statistics.orquestasEstablecidas.orquestas.map((item: any, i: number) => (
              <div key={i} className="bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-500/20 flex items-center gap-2">
                {item.orquest}
                <span className="bg-background px-1.5 rounded text-indigo-600 dark:text-indigo-400">{item.count}</span>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard title="🎧 Distribución DJs" icon={Music} className="h-full">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl font-black text-foreground mb-2">{statistics.djEvents}</div>
              <p className="text-muted-foreground text-sm">Total Actuaciones DJ</p>
              <div className="mt-4 flex gap-2 justify-center">
                <span className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">1 DJ: {statistics.djDistribution.eventosCon1DJ}</span>
                <span className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">2 DJs: {statistics.djDistribution.eventosCon2DJ}</span>
              </div>
            </div>
          </div>
        </StatCard>
      </div>

    </div>
  );
}