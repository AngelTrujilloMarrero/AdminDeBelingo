import React, { useState, useMemo } from 'react';
import { Event } from '../types/event';
import {
    Calendar,
    CheckCircle2,
    Filter,
    Music,
    AlertTriangle,
    MapPin,
    ArrowRight,
    Clock
} from 'lucide-react';
import { format, differenceInCalendarDays, addDays, subDays, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthComparisonProps {
    events: Event[];
}

const normalize = (str: string) =>
    str?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim() || "";

const parseAsLocal = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const getMartesCarnaval = (year: number): Date => {
    // Algoritmo de Butcher para el Domingo de Pascua
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const L = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * L) / 451);
    const month = Math.floor((h + L - 7 * m + 114) / 31);
    const day = ((h + L - 7 * m + 114) % 31) + 1;

    const easterSunday = new Date(year, month - 1, day);
    return subDays(easterSunday, 47);
};

export default function MonthComparison({ events }: MonthComparisonProps) {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Source events: Same month last year
    const previousYearEvents = useMemo(() => {
        return events.filter(event => {
            if (!event.day) return false;
            const d = parseAsLocal(event.day);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear - 1;
        });
    }, [events, selectedMonth, selectedYear]);

    // Comparison logic - CARNAVAL AWARE + STRICT DAY OF WEEK
    const analysis = useMemo(() => {
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const searchStart = selectedMonth === 0 ? monthStart : subDays(monthStart, 15);
        const searchEnd = addDays(endOfMonth(monthStart), 15);

        const currentYearCandidates = events.filter(event => {
            if (!event.day) return false;
            const d = parseAsLocal(event.day);
            return d.getFullYear() === selectedYear && isWithinInterval(d, { start: searchStart, end: searchEnd });
        });

        const pool = [...currentYearCandidates];

        const sortedPrev = [...previousYearEvents].sort((a, b) =>
            parseAsLocal(a.day).getTime() - parseAsLocal(b.day).getTime()
        );

        // Hitos de Carnaval
        const martesCarnavalPrev = getMartesCarnaval(selectedYear - 1);
        const martesCarnavalCurr = getMartesCarnaval(selectedYear);

        return sortedPrev.map(prevEvent => {
            const pDate = parseAsLocal(prevEvent.day);
            const pDOW = pDate.getDay();
            const pMun = normalize(prevEvent.municipio);
            const pLugar = normalize(prevEvent.lugar);
            const pTipo = normalize(prevEvent.tipo);

            // Identificar si es un evento de Carnaval (mismo municipio y lugar suele ser igual)
            const isCarnaval = pTipo.includes('carnaval') || pLugar.includes('carnaval');

            let bestMatchIdx = -1;
            let minDist = Infinity;

            for (let i = 0; i < pool.length; i++) {
                const curr = pool[i];
                const cDate = parseAsLocal(curr.day);
                const cDOW = cDate.getDay();
                const cMun = normalize(curr.municipio);
                const cLugar = normalize(curr.lugar);

                // REGLA 1: Deben ser del mismo municipio
                if (cMun !== pMun) continue;

                // REGLA 2: Mismo día de la semana (Lunes con Lunes, Sábado con Sábado...)
                if (cDOW !== pDOW) continue;

                // REGLA 3: Lugar coincidente
                if (pLugar !== "" && cLugar !== "" && pLugar !== cLugar) continue;

                let scoreDist: number;

                if (isCarnaval) {
                    // Si es Carnaval, calculamos la distancia relativa al Martes de Carnaval de cada año
                    const offsetPrev = differenceInCalendarDays(pDate, martesCarnavalPrev);
                    const offsetCurr = differenceInCalendarDays(cDate, martesCarnavalCurr);
                    // Si coinciden perfectamente en el calendario lunisolar, scoreDist será 0
                    scoreDist = Math.abs(offsetCurr - offsetPrev);
                } else {
                    // Si no es Carnaval, comparamos por la distancia estándar de 364 días (52 semanas)
                    scoreDist = Math.abs(differenceInCalendarDays(cDate, pDate) - 364);
                }

                if (scoreDist <= 7 && scoreDist < minDist) {
                    minDist = scoreDist;
                    bestMatchIdx = i;
                }
            }

            if (bestMatchIdx !== -1) {
                const found = pool[bestMatchIdx];
                pool.splice(bestMatchIdx, 1);
                return {
                    prevEvent,
                    status: 'found' as const,
                    foundEvent: found,
                    isCarnaval
                };
            }

            return {
                prevEvent,
                status: 'missing' as const,
                isCarnaval
            };
        });
    }, [previousYearEvents, events, selectedMonth, selectedYear]);

    // Separate and sort: Found first, then Missing
    const foundItems = analysis.filter(a => a.status === 'found');
    const missingItems = analysis.filter(a => a.status === 'missing');

    // Carnival Tuesday for UI
    const martesCarnavalCurr = useMemo(() => getMartesCarnaval(selectedYear), [selectedYear]);

    const stats = {
        found: foundItems.length,
        missing: missingItems.length,
        total: analysis.length
    };

    const formatDateFull = (dateStr: string) => {
        const d = parseAsLocal(dateStr);
        return format(d, 'EEEE d MMM', { locale: es });
    };

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-black rounded-[3rem] p-10 shadow-2xl relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-3">
                        <h2 className="text-4xl md:text-5xl font-black text-white flex items-center gap-5 tracking-tight">
                            <Calendar className="w-14 h-14 text-indigo-400" />
                            Escaneo de Continuidad
                        </h2>
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="px-5 py-2 bg-indigo-500/20 text-indigo-300 rounded-full text-lg font-black uppercase tracking-widest border border-indigo-500/30">
                                {selectedYear}
                            </span>
                            <span className="text-slate-600 font-bold text-xl">vs</span>
                            <span className="px-5 py-2 bg-white/5 text-slate-400 rounded-full text-lg font-bold uppercase tracking-widest border border-white/10">
                                {selectedYear - 1}
                            </span>
                            {(selectedMonth === 0 || selectedMonth === 1 || selectedMonth === 2) && (
                                <div className="ml-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-full text-sm font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Martes de Carnaval {selectedYear}: {format(martesCarnavalCurr, 'd MMM', { locale: es })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex bg-black/60 p-2.5 rounded-[2rem] backdrop-blur-3xl border border-white/10 shadow-2xl">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-white px-8 py-4 focus:outline-none font-black text-xl cursor-pointer hover:text-indigo-400 transition-colors uppercase tracking-widest"
                        >
                            {monthNames.map((month, index) => (
                                <option key={index} value={index} className="bg-slate-900 text-white">{month}</option>
                            ))}
                        </select>
                        <div className="w-px h-12 bg-white/10 my-auto mx-3" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-white px-8 py-4 focus:outline-none font-black text-xl cursor-pointer hover:text-indigo-400 transition-colors"
                        >
                            {[currentDate.getFullYear(), currentDate.getFullYear() - 1].map(year => (
                                <option key={year} value={year} className="bg-slate-900 text-white">{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                    <div className="bg-white/5 rounded-[2rem] p-8 border border-white/10">
                        <div className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Base {selectedYear - 1}</div>
                        <div className="text-5xl font-black text-white">{stats.total}</div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-[2rem] p-8 border border-emerald-500/20">
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">Localizadas</div>
                        <div className="text-5xl font-black text-white">{stats.found}</div>
                    </div>
                    <div className="bg-rose-500/10 rounded-[2rem] p-8 border border-rose-500/20">
                        <div className="text-xs font-black text-rose-400 uppercase tracking-[0.3em] mb-3">Pendientes</div>
                        <div className="text-5xl font-black text-white">{stats.missing}</div>
                    </div>
                    <div className="bg-indigo-500/20 rounded-[2rem] p-8 border border-indigo-400/30">
                        <div className="text-xs font-black text-indigo-300 uppercase tracking-[0.3em] mb-3">Cobertura</div>
                        <div className="text-5xl font-black text-white">{Math.round((stats.found / (stats.total || 1)) * 100)}%</div>
                    </div>
                </div>
            </div>

            {/* FOUND Section */}
            {foundItems.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <h3 className="text-2xl font-black text-emerald-700 uppercase tracking-[0.2em]">Localizadas ({stats.found})</h3>
                        <div className="h-px flex-1 bg-emerald-100" />
                    </div>

                    {foundItems.map((item, index) => (
                        <div
                            key={`found-${index}`}
                            className="bg-white rounded-[2.5rem] border-2 border-emerald-100 hover:border-emerald-300 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-50"
                        >
                            <div className="p-8 lg:p-10 flex flex-col xl:flex-row items-stretch gap-8">
                                {/* Left: Reference (Last Year) */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Referencia {selectedYear - 1}
                                        </div>
                                        {item.isCarnaval && (
                                            <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-sm">
                                                CARNAVAL
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                            {item.prevEvent.municipio}
                                        </h4>
                                        <p className="text-xl font-bold text-slate-500 uppercase">
                                            {item.prevEvent.lugar || 'Casco'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 pt-2">
                                        <span className="text-base font-black text-slate-600 uppercase bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-slate-400" />
                                            {formatDateFull(item.prevEvent.day)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-2">
                                            <Music className="w-4 h-4" /> {item.prevEvent.orquesta}
                                        </span>
                                        {item.prevEvent.tipo && (
                                            <span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-3 py-2 rounded-lg">
                                                {item.prevEvent.tipo}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="hidden xl:flex items-center justify-center text-emerald-300">
                                    <ArrowRight className="w-10 h-10 stroke-[3]" />
                                </div>

                                {/* Right: Current Year Match */}
                                <div className="xl:w-[400px] bg-emerald-50 rounded-3xl p-8 border-2 border-emerald-100 space-y-4">
                                    <div className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em]">
                                        Registrada en {selectedYear}
                                    </div>
                                    <div className="text-2xl font-black text-emerald-900 uppercase">
                                        {formatDateFull(item.foundEvent!.day)}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <span className="text-sm font-bold text-indigo-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-2">
                                            <Music className="w-4 h-4" /> {item.foundEvent!.orquesta}
                                        </span>
                                        {item.foundEvent!.tipo && (
                                            <span className="text-xs font-bold text-emerald-600 uppercase bg-emerald-100 px-3 py-2 rounded-lg">
                                                {item.foundEvent!.tipo}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MISSING Section */}
            {missingItems.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-4">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                        <h3 className="text-2xl font-black text-rose-700 uppercase tracking-[0.2em]">Pendientes ({stats.missing})</h3>
                        <div className="h-px flex-1 bg-rose-100" />
                    </div>

                    {missingItems.map((item, index) => (
                        <div
                            key={`missing-${index}`}
                            className="bg-rose-50/50 rounded-[2.5rem] border-2 border-rose-200 hover:border-rose-300 transition-all duration-300"
                        >
                            <div className="p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                                {/* Left: Reference */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs font-black text-rose-400 uppercase tracking-[0.3em]">
                                            No encontrada para {selectedYear}
                                        </div>
                                        {item.isCarnaval && (
                                            <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-sm">
                                                CARNAVAL
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                            {item.prevEvent.municipio}
                                        </h4>
                                        <p className="text-xl font-bold text-slate-500 uppercase">
                                            {item.prevEvent.lugar || 'Casco'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 pt-2">
                                        <span className="text-base font-black text-slate-600 uppercase bg-white px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200">
                                            <Calendar className="w-5 h-5 text-slate-400" />
                                            {formatDateFull(item.prevEvent.day)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-2">
                                            <Music className="w-4 h-4" /> {item.prevEvent.orquesta}
                                        </span>
                                        {item.prevEvent.tipo && (
                                            <span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-3 py-2 rounded-lg">
                                                {item.prevEvent.tipo}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Action Prompt */}
                                <div className="lg:w-[300px] text-center lg:text-right">
                                    <p className="text-sm text-rose-500 font-bold leading-relaxed">
                                        Buscando un <span className="underline uppercase">{formatDateFull(item.prevEvent.day).split(' ')[0]}</span> en <span className="font-black">{item.prevEvent.municipio}</span>{item.prevEvent.lugar ? ` (${item.prevEvent.lugar})` : ''}.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {analysis.length === 0 && (
                <div className="py-24 text-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200">
                    <Calendar className="w-24 h-24 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-3xl font-black text-slate-400 uppercase tracking-[0.2em]">Sin Histórico</h3>
                    <p className="text-slate-400 mt-2 font-bold text-lg">No hay eventos de {monthNames[selectedMonth]} {selectedYear - 1}.</p>
                </div>
            )}

            {/* Footer Legend */}
            <div className="flex flex-wrap justify-center gap-10 pt-8 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" /> Mismo día de la semana + Lugar
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-rose-500 shadow-lg shadow-rose-200" /> Sin equivalente registrado
                </div>
            </div>
        </div>
    );
}