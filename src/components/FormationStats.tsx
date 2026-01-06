import { useMemo, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { Event, MUNICIPIOS } from '../types/event';
import { Orchestra } from '../types/orchestra';
import { estandarizarNombre } from '../lib/utils';
import { format } from 'date-fns';
import {
    BarChart3,
    PieChart,
    Map,
    Calendar,
    Music,
    Users,
    User,
    Info,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FormationStatsProps {
    events: Event[];
    selectedYear?: string | number;
}

interface AnalysisData {
    total: number;
    orquesta: number;
    grupo: number;
    solista: number;
    unknown: number;
    percentages: {
        orquesta: number;
        grupo: number;
        solista: number;
    };
}

export default function FormationStats({ events, selectedYear = 'Total' }: FormationStatsProps) {
    const [orchestras, setOrchestras] = useState<Orchestra[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'global' | 'zona' | 'municipio' | 'dia'>('global');
    const [isExporting, setIsExporting] = useState(false);

    // Fetch live data for types
    useEffect(() => {
        const orchestrasRef = ref(db, 'orchestras');
        const unsubscribe = onValue(orchestrasRef, (snapshot) => {
            const data = snapshot.val();
            const loaded: Orchestra[] = [];
            if (data) {
                Object.entries(data).forEach(([key, value]: [string, any]) => {
                    loaded.push({ id: key, ...value });
                });
            }
            setOrchestras(loaded);
        });
        return () => unsubscribe();
    }, []);

    const orchestraTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        orchestras.forEach(o => {
            map[estandarizarNombre(o.name)] = o.type || 'unknown';
        });
        return map;
    }, [orchestras]);

    const getFormationType = (name: string) => {
        const normalized = estandarizarNombre(name.trim());
        return orchestraTypeMap[normalized] || 'unknown';
    };

    const calculateStats = (filteredEvents: Event[]): AnalysisData => {
        let orquesta = 0;
        let grupo = 0;
        let solista = 0;
        let unknown = 0;

        filteredEvents.forEach(e => {
            const formations = e.orquesta.split(',').map(f => f.trim()).filter(f => f.length > 0);
            formations.forEach(f => {
                const type = getFormationType(f);
                if (type === 'orquesta') orquesta++;
                else if (type === 'grupo') grupo++;
                else if (type === 'solista') solista++;
                else unknown++;
            });
        });

        const total = orquesta + grupo + solista;
        return {
            total,
            orquesta,
            grupo,
            solista,
            unknown,
            percentages: {
                orquesta: total > 0 ? Math.round((orquesta / total) * 100) : 0,
                grupo: total > 0 ? Math.round((grupo / total) * 100) : 0,
                solista: total > 0 ? Math.round((solista / total) * 100) : 0,
            }
        };
    };

    const globalStats = useMemo(() => calculateStats(events), [events, orchestraTypeMap]);

    // Grouping logic for analysis
    const zonalStats = useMemo(() => {
        const zones: Record<string, string[]> = {
            'Norte': ['Buenavista', 'Silos', 'Tanque', 'Garachico', 'Icod', 'Guancha', 'San Juan Rambla', 'Realejos', 'Orotava', 'Puerto', 'Matanza', 'Victoria', 'Santa Úrsula', 'Sauzal', 'Tacoronte'],
            'Sur': ['Adeje', 'Arona', 'San Miguel', 'Vilaflor', 'Granadilla', 'Arico', 'Fasnia', 'Güímar', 'Arafo', 'Candelaria', 'Santiago Teide', 'Guía'],
            'Metropolitana': ['Santa Cruz', 'Laguna', 'Tegueste', 'Rosario']
        };

        const results: Record<string, AnalysisData> = {};
        Object.entries(zones).forEach(([zoneName, municipios]) => {
            const zoneEvents = events.filter(e => municipios.includes(e.municipio));
            results[zoneName] = calculateStats(zoneEvents);
        });
        return results;
    }, [events, orchestraTypeMap]);

    const municipioStats = useMemo(() => {
        const results: Record<string, AnalysisData> = {};
        MUNICIPIOS.forEach(m => {
            const mEvents = events.filter(e => e.municipio === m);
            const stats = calculateStats(mEvents);
            if (stats.total > 0) results[m] = stats;
        });
        return Object.entries(results).sort((a, b) => b[1].total - a[1].total);
    }, [events, orchestraTypeMap]);

    const diaStats = useMemo(() => {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const results: Record<string, AnalysisData> = {};
        dias.forEach((dia, index) => {
            const dEvents = events.filter(e => new Date(e.day).getDay() === index);
            results[dia] = calculateStats(dEvents);
        });
        return results;
    }, [events, orchestraTypeMap]);

    const handleExportPDF = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExporting(true);

        try {
            const element = document.getElementById('pdf-export-content');
            if (!element) return;

            // Hacer visible temporalmente para html2canvas
            element.style.display = 'block';

            // Esperar a que el DOM se actualice
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            element.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Primera página
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Páginas adicionales si es necesario
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const yearStr = selectedYear === 'all' ? 'Historico' : selectedYear;
            pdf.save(`Reporte_Formaciones_${yearStr}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
        } catch (error) {
            console.error('Error generando PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const StatBar = ({ label, count, percentage, color, icon: Icon }: any) => (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
                        <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="font-semibold text-gray-700">{label}</span>
                </div>
                <div className="text-right">
                    <span className="block text-lg font-bold text-gray-900">{percentage}%</span>
                    <span className="text-xs text-gray-500 font-medium">{count} actuaciones</span>
                </div>
            </div>
            <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-100 flex items-center relative shadow-inner">
                <div
                    className={`h-full ${color} transition-all duration-1000 ease-out flex items-center justify-center`}
                    style={{ width: `${percentage}%` }}
                >
                    {percentage > 10 && (
                        <span className="text-[10px] text-white font-black leading-none drop-shadow-sm">{percentage}%</span>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8 transition-all duration-500">
            {/* Header con gradiente Premium */}
            <div
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Análisis de Formaciones</h2>
                            <p className="text-white/80 text-xs font-medium">Orquestas vs Grupos vs Solistas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all text-sm font-bold shadow-lg ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={`Descargar Reporte PDF (${selectedYear})`}
                        >
                            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                            <span className="hidden sm:inline">{isExporting ? 'Procesando...' : 'Exportar PDF'}</span>
                        </button>
                        <div className="hidden sm:flex gap-2">
                            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/20">ORQUESTAS: {globalStats.percentages.orquesta}%</span>
                            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/20">GRUPOS: {globalStats.percentages.grupo}%</span>
                            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/20">SOLISTAS: {globalStats.percentages.solista}%</span>
                        </div>
                        {isExpanded ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                        {/* Panel Global */}
                        <div className="lg:col-span-1 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <PieChart className="w-4 h-4" /> Distribución Global
                            </h3>
                            <div className="space-y-6">
                                <StatBar
                                    label="Orquestas"
                                    count={globalStats.orquesta}
                                    percentage={globalStats.percentages.orquesta}
                                    color="bg-violet-600"
                                    icon={Users}
                                />
                                <StatBar
                                    label="Grupos"
                                    count={globalStats.grupo}
                                    percentage={globalStats.percentages.grupo}
                                    color="bg-indigo-600"
                                    icon={Music}
                                />
                                <StatBar
                                    label="Solistas"
                                    count={globalStats.solista}
                                    percentage={globalStats.percentages.solista}
                                    color="bg-blue-600"
                                    icon={User}
                                />
                            </div>
                            {globalStats.unknown > 0 && (
                                <div className="mt-8 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 leading-tight">
                                        Hay <span className="font-bold">{globalStats.unknown} actuaciones</span> pendientes de clasificar.
                                        Ve a Gestión para completar el análisis.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Análisis Comparativo */}
                        <div className="lg:col-span-2">
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit mb-6">
                                {[
                                    { id: 'zona', label: 'Zonas', icon: Map },
                                    { id: 'dia', label: 'Días', icon: Calendar },
                                    { id: 'municipio', label: 'Top Municipios', icon: Map }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setViewMode(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === tab.id
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-500 hover:text-indigo-600'
                                            }`}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${viewMode === 'municipio' ? 'max-h-[600px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                                {viewMode === 'zona' && Object.entries(zonalStats).map(([zona, data]) => (
                                    <div key={zona} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                        <h4 className="font-black text-gray-800 mb-3 border-b border-gray-50 pb-2">{zona}</h4>
                                        <div className="space-y-3">
                                            {['orquesta', 'grupo', 'solista'].map(type => (
                                                <div key={type} className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 capitalize">{type}s</span>
                                                    <div className="flex items-center gap-3 w-2/3 group">
                                                        <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner flex relative">
                                                            <div
                                                                className={`h-full ${type === 'orquesta' ? 'bg-violet-600' : type === 'grupo' ? 'bg-indigo-600' : 'bg-blue-600'} transition-all duration-700 flex items-center justify-center`}
                                                                style={{ width: `${(data as any).percentages[type]}%` }}
                                                            >
                                                                {(data as any).percentages[type] > 12 && (
                                                                    <span className="text-[10px] text-white font-black leading-none">{(data as any).percentages[type]}%</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="w-10 text-right font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{(data as any).percentages[type]}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {viewMode === 'dia' && Object.entries(diaStats).map(([dia, data]) => (
                                    <div key={dia} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <h4 className="font-black text-gray-800 mb-3 border-b border-gray-50 pb-2 flex justify-between">
                                            {dia}
                                            <span className="text-[10px] text-gray-400 font-normal">{(data as any).total} act.</span>
                                        </h4>
                                        <div className="flex h-10 rounded-xl overflow-hidden border border-gray-100 shadow-inner flex relative">
                                            <div
                                                className="bg-violet-600 h-full transition-all duration-300 flex items-center justify-center"
                                                style={{ width: `${(data as any).percentages.orquesta}%` }}
                                            >
                                                {(data as any).percentages.orquesta > 12 && (
                                                    <span className="text-[11px] text-white font-black">{(data as any).percentages.orquesta}%</span>
                                                )}
                                            </div>
                                            <div
                                                className="bg-indigo-600 h-full transition-all duration-300 flex items-center justify-center"
                                                style={{ width: `${(data as any).percentages.grupo}%` }}
                                            >
                                                {(data as any).percentages.grupo > 12 && (
                                                    <span className="text-[11px] text-white font-black">{(data as any).percentages.grupo}%</span>
                                                )}
                                            </div>
                                            <div
                                                className="bg-blue-600 h-full transition-all duration-300 flex items-center justify-center"
                                                style={{ width: `${(data as any).percentages.solista}%` }}
                                            >
                                                {(data as any).percentages.solista > 12 && (
                                                    <span className="text-[11px] text-white font-black">{(data as any).percentages.solista}%</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-2.5 px-1">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">Orq</span>
                                                <span className="text-xs font-black text-violet-600">{(data as any).percentages.orquesta}%</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">Grp</span>
                                                <span className="text-xs font-black text-indigo-600">{(data as any).percentages.grupo}%</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] uppercase tracking-tighter text-gray-400 font-bold">Sol</span>
                                                <span className="text-xs font-black text-blue-600">{(data as any).percentages.solista}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {viewMode === 'municipio' && municipioStats.map(([mun, data]: [string, any]) => (
                                    <div key={mun} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 group/card hover:shadow-md transition-shadow">
                                        <div className="w-24 shrink-0">
                                            <h4 className="font-bold text-gray-800 text-xs truncate">{mun}</h4>
                                            <span className="text-[10px] text-gray-400">{data.total} actuaciones</span>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-gray-400 uppercase tracking-tight">Predomina: <span className="text-indigo-600 transition-colors">
                                                    {data.orquesta >= data.grupo && data.orquesta >= data.solista ? 'Orquesta' :
                                                        data.grupo >= data.orquesta && data.grupo >= data.solista ? 'Grupo' : 'Solista'}
                                                </span></span>
                                            </div>
                                            <div className="h-6 w-full bg-gray-50 rounded-full flex overflow-hidden border border-gray-100 shadow-inner relative">
                                                <div
                                                    className="bg-violet-600 transition-all duration-300 flex items-center justify-center overflow-hidden"
                                                    style={{ width: `${data.percentages.orquesta}%` }}
                                                >
                                                    {data.percentages.orquesta > 15 && (
                                                        <span className="text-[9px] text-white font-black">{data.percentages.orquesta}%</span>
                                                    )}
                                                </div>
                                                <div
                                                    className="bg-indigo-600 transition-all duration-300 flex items-center justify-center overflow-hidden"
                                                    style={{ width: `${data.percentages.grupo}%` }}
                                                >
                                                    {data.percentages.grupo > 15 && (
                                                        <span className="text-[9px] text-white font-black">{data.percentages.grupo}%</span>
                                                    )}
                                                </div>
                                                <div
                                                    className="bg-blue-600 transition-all duration-300 flex items-center justify-center overflow-hidden"
                                                    style={{ width: `${data.percentages.solista}%` }}
                                                >
                                                    {data.percentages.solista > 15 && (
                                                        <span className="text-[9px] text-white font-black">{data.percentages.solista}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Conclusión Rápida */}
                    <div className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl p-6 text-white overflow-hidden relative">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-lg border border-white/10">
                                <BarChart3 className="w-8 h-8 text-indigo-300" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-1">Tendencia de Contratación</h4>
                                <p className="text-indigo-100/70 text-sm leading-relaxed max-w-2xl">
                                    A nivel global, {
                                        globalStats.orquesta > globalStats.grupo && globalStats.orquesta > globalStats.solista
                                            ? "las orquestas siguen siendo el motor principal de los eventos,"
                                            : globalStats.grupo > globalStats.orquesta && globalStats.grupo > globalStats.solista
                                                ? "los grupos están ganando un terreno impresionante en la escena actual,"
                                                : "los solistas están liderando la demanda de actuaciones,"
                                    } con un <span className="text-white font-bold">{Math.max(globalStats.percentages.orquesta, globalStats.percentages.grupo, globalStats.percentages.solista)}%</span> de cuota.
                                    Se observa {viewMode === 'zona' ? 'una clara diferenciación regional' : 'una variación según el perfil del día'} en las preferencias de los organizadores.
                                </p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    </div>
                </div>
            )}

            {/* Hidden Content for PDF Export */}
            <div id="pdf-export-content" style={{ display: 'none', width: '210mm', padding: '20mm', background: 'white', color: '#1f2937' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '4px solid #4f46e5', paddingBottom: '20px' }}>
                    <h1 style={{ color: '#4f46e5', margin: '0', fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>Balance de Formaciones</h1>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                        <span style={{ backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '20px' }}>Periodo: {selectedYear === 'all' ? 'Histórico' : selectedYear}</span>
                        <span style={{ backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '20px' }}>Generado: {format(new Date(), 'dd/MM/yyyy')}</span>
                    </div>
                </div>

                {/* Section: Zonas (More Illustrative) */}
                <div style={{ marginBottom: '50px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                        <div style={{ width: '8px', height: '24px', backgroundColor: '#4f46e5', borderRadius: '4px' }}></div>
                        <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '0', textTransform: 'uppercase' }}>Análisis Geográfico por Zonas</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        {Object.entries(zonalStats).map(([zona, data]: [string, any]) => (
                            <div key={zona} style={{ backgroundColor: '#f9fafb', border: '2px solid #f3f4f6', padding: '25px', borderRadius: '24px', display: 'flex', gap: '30px', alignItems: 'center' }}>
                                <div style={{ minWidth: '140px' }}>
                                    <h4 style={{ margin: '0', fontSize: '18px', fontWeight: '900', color: '#111827' }}>{zona}</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>{data.total} actuaciones totales</p>
                                </div>

                                <div style={{ flex: 1, display: 'flex', gap: '8px', height: '40px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <div style={{ backgroundColor: '#7c3aed', width: `${data.percentages.orquesta}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900' }}>
                                        {data.percentages.orquesta > 10 && `${data.percentages.orquesta}%`}
                                    </div>
                                    <div style={{ backgroundColor: '#4f46e5', width: `${data.percentages.grupo}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900' }}>
                                        {data.percentages.grupo > 10 && `${data.percentages.grupo}%`}
                                    </div>
                                    <div style={{ backgroundColor: '#2563eb', width: `${data.percentages.solista}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900' }}>
                                        {data.percentages.solista > 10 && `${data.percentages.solista}%`}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#7c3aed' }}></div>
                                        <span>ORQU: {data.percentages.orquesta}%</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#4f46e5' }}></div>
                                        <span>GRUP: {data.percentages.grupo}%</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#2563eb' }}></div>
                                        <span>SOLI: {data.percentages.solista}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Municipios (Larger Charts) */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                        <div style={{ width: '8px', height: '24px', backgroundColor: '#4f46e5', borderRadius: '4px' }}></div>
                        <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '0', textTransform: 'uppercase' }}>Detalle por Municipios</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {municipioStats.map(([mun, data]: [string, any]) => (
                            <div key={mun} style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                    <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '900', color: '#374151' }}>{mun}</h4>
                                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold' }}>{data.total} act.</span>
                                </div>
                                <div style={{ display: 'flex', gap: '3px', height: '16px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                                    <div style={{ background: '#7c3aed', width: `${data.percentages.orquesta}%` }}></div>
                                    <div style={{ background: '#4f46e5', width: `${data.percentages.grupo}%` }}></div>
                                    <div style={{ background: '#2563eb', width: `${data.percentages.solista}%` }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', fontWeight: '800', color: '#6b7280' }}>
                                    <span>O: {data.percentages.orquesta}%</span>
                                    <span>G: {data.percentages.grupo}%</span>
                                    <span>S: {data.percentages.solista}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '10px', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                    Este reporte es propiedad de De Belingo. Los datos reflejan la actividad registrada en la plataforma.
                </div>
            </div>
        </div>
    );
}
