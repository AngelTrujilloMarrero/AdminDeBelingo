import { useMemo, useState } from 'react';
import { Event } from '../types/event';
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-center">
            <h2 className="text-2xl font-bold text-white">📊 Estadísticas de Eventos</h2>
            <p className="text-white/80 mt-2">No hay datos suficientes para mostrar estadísticas</p>
          </div>
        </div>
      </div>
    );
  }

  const renderStatCard = (title: string, items: StatItem[], icon: React.ReactNode, gradient: string) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} p-4`}>
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded-full ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                )}
              </div>
            </div>
            <span className="font-bold text-gray-700">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const topOrquestasItems: StatItem[] = statistics.topOrquestas.map(([orq, count]) => ({
    label: orq,
    value: `${count} actuaciones`,
    icon: <Music className="h-4 w-4 text-white" />,
    color: 'bg-blue-500'
  }));

  const alAlzaItems: StatItem[] = statistics.alAlza.map(item => ({
    label: item.orquest,
    value: `+${Math.round(item.change)}%`,
    icon: <TrendingUp className="h-4 w-4 text-white" />,
    color: 'bg-green-500',
    subtitle: `Crecimiento: ${item.recent} reciente vs ${item.older} anterior`
  }));

  const aLaBajaItems: StatItem[] = statistics.aLaBaja.map(item => ({
    label: item.orquest,
    value: `${Math.round(item.change)}%`,
    icon: <TrendingDown className="h-4 w-4 text-white" />,
    color: 'bg-red-500',
    subtitle: `Declive: ${item.recent} reciente vs ${item.older} anterior`
  }));

  const sorpresa1: StatItem = {
    label: '🎵 Día más musical',
    value: statistics.sorpresas.diaMasMusical,
    icon: <Calendar className="h-4 w-4 text-white" />,
    color: 'bg-purple-500'
  };

  const sorpresa2: StatItem = {
    label: '⏰ Hora peak',
    value: statistics.sorpresas.horaPopular ?
      `${statistics.sorpresas.horaPopular.hora} (${statistics.sorpresas.horaPopular.count} veces)` :
      'N/A',
    icon: <Clock className="h-4 w-4 text-white" />,
    color: 'bg-yellow-500'
  };

  const sorpresa3: StatItem = {
    label: '🔥 Workaholic',
    value: statistics.sorpresas.workaholicOrquest ?
      `${statistics.sorpresas.workaholicOrquest.orquest} (${statistics.sorpresas.workaholicOrquest.maxConsecutivos} días seguidos)` :
      'N/A',
    icon: <Zap className="h-4 w-4 text-white" />,
    color: 'bg-orange-500'
  };

  const sorpresa4: StatItem = {
    label: '🌍 Más variety',
    value: statistics.sorpresas.municipioVariado ?
      `${statistics.sorpresas.municipioVariado.municipio} (${statistics.sorpresas.municipioVariado.variedad} orquestas)` :
      'N/A',
    icon: <Star className="h-4 w-4 text-white" />,
    color: 'bg-indigo-500'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-white" />
              <h2 className="text-3xl font-bold text-white">📊 Estadísticas de Eventos</h2>
            </div>

            {/* Selector de Año */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedYear('all')}
                className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 shadow-sm ${selectedYear === 'all'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
                  }`}
              >
                Total
              </button>
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 shadow-sm ${selectedYear === year
                    ? 'bg-white text-purple-600'
                    : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <p className="text-white/80 text-sm mt-2">
            Análisis completo de la actividad musical {selectedYear === 'all' ? 'histórica' : `en ${selectedYear}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Orquestas */}
        {renderStatCard(
          '🏆 Top Orquestas',
          topOrquestasItems,
          <Award className="h-5 w-5" />,
          'from-blue-500 to-blue-600'
        )}

        {/* Al Alza */}
        {renderStatCard(
          '📈 Al Alza',
          alAlzaItems,
          <TrendingUp className="h-5 w-5" />,
          'from-green-500 to-green-600'
        )}

        {/* A la Baja */}
        {renderStatCard(
          '📉 A la Baja',
          aLaBajaItems,
          <TrendingDown className="h-5 w-5" />,
          'from-red-500 to-red-600'
        )}

        {/* Sorpresas */}
        {renderStatCard(
          '🎯 Datos Sorprendentes',
          [sorpresa1, sorpresa2, sorpresa3, sorpresa4],
          <Star className="h-5 w-5" />,
          'from-purple-500 to-pink-600'
        )}
      </div>

      {/* Segunda fila con más estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estacionalidad Completa */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sun className="h-5 w-5" />
              <span>🌸☀️🍂❄️ Estacionalidad</span>
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🌸 Top Primavera</h4>
              {statistics.topPrimavera.length > 0 ? (
                statistics.topPrimavera.map(([orq, count], index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-sm text-gray-700">{orq}</span>
                    <span className="text-sm font-medium text-green-600">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs text-gray-500">Sin datos</p>}
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">☀️ Top Verano</h4>
              {statistics.topVerano.length > 0 ? (
                statistics.topVerano.map(([orq, count], index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-sm text-gray-700">{orq}</span>
                    <span className="text-sm font-medium text-yellow-600">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs text-gray-500">Sin datos</p>}
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🍂 Top Otoño</h4>
              {statistics.topOtoño.length > 0 ? (
                statistics.topOtoño.map(([orq, count], index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-sm text-gray-700">{orq}</span>
                    <span className="text-sm font-medium text-orange-600">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs text-gray-500">Sin datos</p>}
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">❄️ Top Invierno</h4>
              {statistics.topInvierno.length > 0 ? (
                statistics.topInvierno.map(([orq, count], index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-sm text-gray-700">{orq}</span>
                    <span className="text-sm font-medium text-blue-600">{count}</span>
                  </div>
                ))
              ) : <p className="text-xs text-gray-500">Sin datos</p>}
            </div>
          </div>
        </div>

        {/* Horarios por Día */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>⏰ Horarios Populares</span>
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {statistics.horariosPopulares.slice(0, 7).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-sm font-medium text-gray-800">{item.dia}</span>
                <span className="text-sm text-indigo-600 font-semibold">{item.hora}</span>
                <span className="text-xs text-gray-500">({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Municipios */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>📍 Top Municipios</span>
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {statistics.topMunicipios.map(([municipio, count], index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-sm font-medium text-gray-800">{municipio}</span>
                <span className="text-sm text-green-600 font-semibold">{count} eventos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tipos de Eventos con Top Orquestas (Top 10) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Percent className="h-6 w-6" />
            <span>💃 Tipos de Eventos con Top Orquestas (Top 10)</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statistics.tiposPorcentaje.slice(0, 10).map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-800 text-lg">{item.tipo}</span>
                  <span className="text-xl font-bold text-pink-600">{item.porcentaje}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${item.porcentaje}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mb-3 font-medium">{item.count} eventos totales</p>

                {/* Top 3 Orquestas para este tipo */}
                <div className="bg-white rounded-lg p-3 border">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    🏆 Top 3 Orquestas en {item.tipo}:
                  </h4>
                  <div className="space-y-2">
                    {item.topOrquestas.length > 0 ? (
                      item.topOrquestas.map((orq, orqIndex) => (
                        <div key={orqIndex} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-xs font-bold text-pink-500 w-6">
                              {orqIndex + 1}.
                            </span>
                            <span className="text-sm font-medium text-gray-800">{orq.orquest}</span>
                          </div>
                          <span className="text-sm font-semibold text-pink-600">
                            {orq.count} eventos
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic">Sin datos de orquestas</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas Adicionales - Primera Fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DJ en Estadísticas - Distribución */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <span>🎧 DJ en Estadísticas</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-purple-600">{statistics.djEvents}</div>
              <p className="text-gray-700 font-medium">Apariciones totales de DJ</p>
            </div>

            {statistics.djDistribution.totalEventosConDJ > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-800 text-center mb-3">Distribución por evento:</h4>

                {/* 1 DJ */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-purple-800">🎵 1 DJ</span>
                    <span className="text-sm font-bold text-purple-600">
                      {statistics.djDistribution.eventosCon1DJ} eventos
                      ({Math.round((statistics.djDistribution.eventosCon1DJ / statistics.djDistribution.totalEventosConDJ) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(statistics.djDistribution.eventosCon1DJ / statistics.djDistribution.totalEventosConDJ) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2 DJs */}
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-indigo-800">🎶 2 DJs</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {statistics.djDistribution.eventosCon2DJ} eventos
                      ({Math.round((statistics.djDistribution.eventosCon2DJ / statistics.djDistribution.totalEventosConDJ) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(statistics.djDistribution.eventosCon2DJ / statistics.djDistribution.totalEventosConDJ) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3+ DJs */}
                <div className="bg-violet-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-violet-800">🎼 3+ DJs</span>
                    <span className="text-sm font-bold text-violet-600">
                      {statistics.djDistribution.eventosCon3OMasDJ} eventos
                      ({Math.round((statistics.djDistribution.eventosCon3OMasDJ / statistics.djDistribution.totalEventosConDJ) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-violet-200 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(statistics.djDistribution.eventosCon3OMasDJ / statistics.djDistribution.totalEventosConDJ) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Total eventos con DJ: {statistics.djDistribution.totalEventosConDJ}
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay eventos con DJs registrados</p>
            )}
          </div>
        </div>

        {/* Récords y Datos Extremos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>🏆 Récords Musicales</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">Día más activo</p>
                <p className="font-bold text-yellow-600">{statistics.metricasCreativas.diaMasActivo[0]}</p>
                <p className="text-sm text-gray-600">{statistics.metricasCreativas.diaMasActivo[1]} eventos</p>
              </div>
              <div className="text-center border-t pt-2">
                <p className="text-xs text-gray-500">Racha más larga</p>
                <p className="font-bold text-orange-600">{statistics.metricasCreativas.rachaMasLarga.orquest}</p>
                <p className="text-sm text-gray-600">{statistics.metricasCreativas.rachaMasLarga.maxConsecutivos} días seguidos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fidelidad Territorial */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>🏠 Fidelidad vs Nómadas</span>
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">🎯 Más Fiel</p>
                <p className="font-bold text-green-600">{statistics.metricasCreativas.masFiel?.orquest}</p>
                <p className="text-sm text-gray-600">{statistics.metricasCreativas.masFiel?.municipios} municipio(s)</p>
              </div>
              <div className="text-center border-t pt-2">
                <p className="text-xs text-gray-500 mb-1">🌍 Más Nómada</p>
                <p className="font-bold text-emerald-600">{statistics.metricasCreativas.masNomada?.orquest}</p>
                <p className="text-sm text-gray-600">{statistics.metricasCreativas.masNomada?.municipios} municipios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Días Saturados */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>🎯 Días Saturados</span>
            </h3>
          </div>
          <div className="p-4">
            {statistics.metricasAdicionales.diasSaturados.length > 0 ? (
              <div className="space-y-2">
                {statistics.metricasAdicionales.diasSaturados.map(([fecha, count], index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-700">{new Date(fecha).toLocaleDateString()}</span>
                    <span className="text-sm font-semibold text-red-600">{count} eventos</span>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">Días con 3+ eventos simultáneos</p>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay días saturados</p>
            )}
          </div>
        </div>
      </div>

      {/* Métricas Adicionales - Segunda Fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orquestas Versátiles */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>🗺️ Orquestas Versátiles</span>
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Orquestas que más municipios visitan</p>
            {statistics.metricasAdicionales.orquestasVersatiles.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium text-gray-800">{item.orquest}</span>
                  <p className="text-xs text-gray-500">{item.totalEventos} eventos</p>
                </div>
                <span className="text-sm font-semibold text-cyan-600">{item.municipios} municipios</span>
              </div>
            ))}
          </div>
        </div>

        {/* Eficiencia Orquestas */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>⚡ Eficiencia Mensual</span>
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Eventos por mes activo</p>
            {statistics.metricasAdicionales.eficienciaOrquestas.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div>
                  <span className="font-medium text-gray-800">{item.orquest}</span>
                  <p className="text-xs text-gray-500">{item.totalEventos} eventos en {item.mesesActivos} meses</p>
                </div>
                <span className="text-sm font-semibold text-green-600">{item.eficiencia}/mes</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Análisis de Competencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competencia por Fechas */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>⚡ Competencia por Fechas</span>
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Fechas con más orquestas tocando</p>
            {statistics.metricasCreativas.competenciaFechas.map((comp, index) => (
              <div key={index} className="bg-red-50 rounded-lg p-3 mb-2">
                <p className="font-medium text-red-800">{new Date(comp.fecha).toLocaleDateString()}</p>
                <p className="text-sm text-red-600">{comp.cantidadOrquestas} orquestas</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {comp.orquestas.slice(0, 3).map((orq, i) => (
                    <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{orq}</span>
                  ))}
                  {comp.orquestas.length > 3 && (
                    <span className="text-xs text-red-500">+{comp.orquestas.length - 3} más</span>
                  )}
                </div>
              </div>
            ))}
            {statistics.metricasCreativas.competenciaFechas.length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay competencia significativa</p>
            )}
          </div>
        </div>

        {/* Competencia por Municipios */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>🗺️ Competencia Territorial</span>
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Municipios con más diversidad</p>
            {statistics.metricasCreativas.competenciaMunicipios.map((comp, index) => (
              <div key={index} className="bg-orange-50 rounded-lg p-3 mb-2">
                <p className="font-medium text-orange-800">{comp.municipio}</p>
                <p className="text-sm text-orange-600">{comp.cantidadOrquestas} orquestas diferentes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {comp.orquestas.slice(0, 3).map((orq, i) => (
                    <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">{orq}</span>
                  ))}
                  {comp.orquestas.length > 3 && (
                    <span className="text-xs text-orange-500">+{comp.orquestas.length - 3} más</span>
                  )}
                </div>
              </div>
            ))}
            {statistics.metricasCreativas.competenciaMunicipios.length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay competencia territorial significativa</p>
            )}
          </div>
        </div>
      </div>

      {/* Análisis de Orquestas Establecidas (9+ actuaciones) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Crown className="h-6 w-6" />
            <span>👑 Orquestas Establecidas (9+ Actuaciones)</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.orquestasEstablecidas.analisis.map((orq, index) => (
              <div key={index} className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border-l-4 border-indigo-500">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-indigo-800">{orq.orquest}</h4>
                  <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                    {orq.totalEventos} eventos
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">📍 Municipio:</span>
                    <span className="font-medium text-indigo-700">{orq.municipioFavorito[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">💃 Tipo:</span>
                    <span className="font-medium text-indigo-700">{orq.tipoFavorito[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">⏰ Horario:</span>
                    <span className="font-medium text-indigo-700">{orq.horarioFavorito[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">📅 Día:</span>
                    <span className="font-medium text-indigo-700">{orq.diaFavorito[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">🌸 Estación:</span>
                    <span className="font-medium text-indigo-700">{orq.estacionFavorita[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rutas Geográficas y Predicciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rutas Geográficas */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Route className="h-5 w-5" />
              <span>🧳 Rutas Geográficas</span>
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Orquestas más viajeras</p>
            {statistics.metricasCreativas.rutasGeograficas.map((ruta, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-3 mb-2">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-blue-800">{ruta.orquest}</span>
                  <span className="text-sm font-semibold text-blue-600">{ruta.movimientos} municipios</span>
                </div>
                <p className="text-xs text-blue-600">{ruta.totalEventos} eventos totales</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {ruta.municipios.slice(0, 4).map((mun, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{mun}</span>
                  ))}
                  {ruta.municipios.length > 4 && (
                    <span className="text-xs text-blue-500">+{ruta.municipios.length - 4} más</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predicciones Emergentes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>🔮 Predicciones Emergentes</span>
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Orquestas con potencial de crecimiento</p>
            {statistics.metricasCreativas.prediccionesEmergentes.map((pred, index) => (
              <div key={index} className="bg-purple-50 rounded-lg p-3 mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-purple-800">{pred.orquest}</span>
                  <span className="text-sm font-semibold text-purple-600">{pred.potencial}</span>
                </div>
                <div className="flex justify-between text-xs text-purple-600">
                  <span>Recientes: {pred.reciente}</span>
                  <span>Anteriores: {pred.anterior}</span>
                </div>
              </div>
            ))}
            {statistics.metricasCreativas.prediccionesEmergentes.length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay predicciones emergentes claras</p>
            )}
          </div>
        </div>
      </div>

      {/* Horarios Preferidos por Tipo (Top 10) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Clock className="h-6 w-6" />
            <span>🕰️ Horarios Preferidos por Tipo (Top 10)</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.metricasAdicionales.horariosPreferidos.slice(0, 10).map((item, index) => (
              <div key={index} className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-4 text-center">
                <h4 className="font-medium text-gray-800 mb-2">{item.tipo}</h4>
                <div className="text-2xl font-bold text-violet-600 mb-1">{item.hora}</div>
                <p className="text-sm text-gray-600">{item.count} veces</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}