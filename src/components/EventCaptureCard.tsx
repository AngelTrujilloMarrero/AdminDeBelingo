import React from 'react';
import { Event } from '../types/event';
import { MapPin, Music2, ChevronDown, AlertTriangle, Wind, Waves, CloudRain, Flame, CloudSnow, CloudLightning, CloudFog, Thermometer } from 'lucide-react';
import EventCaptureWeatherIcon from './EventCaptureWeatherIcon';
import { AemetAlert } from '../services/aemetAlerts';

interface EventCaptureCardProps {
    event: Event;
    alerts: AemetAlert[];
    tipoColorHex?: Record<string, string>;
}

const FIXED_TYPE_SET = new Set([
    'Baile Normal', 'Romería', 'Baile Magos', 'Tapas y Vinos', 'Paseo Romero',
    'Tapas', 'Romería Chica', 'Carnaval', 'Taifa', 'Infantil', 'Inclusiva',
    'Vinos', 'Aniversario', 'Solidario', 'Romería Barquera', 'Pamela',
    'Blanco', 'Sombrero', 'Sardinada', 'FIN DE AÑO', 'Cerveza', 'Otro'
]);

const TIPO_COLOR: Record<string, string> = {
    'Baile Normal': 'border-l-blue-400 border-r-blue-400',
    'Romería': 'border-l-amber-500 border-r-amber-500',
    'Baile Magos': 'border-l-purple-500 border-r-purple-500',
    'Tapas y Vinos': 'border-l-rose-400 border-r-rose-400',
    'Paseo Romero': 'border-l-orange-400 border-r-orange-400',
    'Tapas': 'border-l-red-400 border-r-red-400',
    'Romería Chica': 'border-l-amber-400 border-r-amber-400',
    'Carnaval': 'border-l-fuchsia-400 border-r-fuchsia-400',
    'Taifa': 'border-l-yellow-400 border-r-yellow-400',
    'Infantil': 'border-l-emerald-400 border-r-emerald-400',
    'Inclusiva': 'border-l-teal-400 border-r-teal-400',
    'Vinos': 'border-l-pink-500 border-r-pink-500',
    'Aniversario': 'border-l-indigo-400 border-r-indigo-400',
    'Solidario': 'border-l-cyan-400 border-r-cyan-400',
    'Romería Barquera': 'border-l-orange-500 border-r-orange-500',
    'Pamela': 'border-l-pink-300 border-r-pink-300',
    'Blanco': 'border-l-gray-300 border-r-gray-300',
    'Sombrero': 'border-l-amber-300 border-r-amber-300',
    'Sardinada': 'border-l-sky-400 border-r-sky-400',
    'FIN DE AÑO': 'border-l-red-500 border-r-red-500',
    'Cerveza': 'border-l-lime-400 border-r-lime-400',
    'Otro': 'border-l-gray-400 border-r-gray-400'
};

const TIPO_GRADIENT: Record<string, string> = {
    'Baile Normal': 'linear-gradient(to right, rgba(96,165,250,0.15), transparent 50%, rgba(96,165,250,0.15))',
    'Romería': 'linear-gradient(to right, rgba(245,158,11,0.15), transparent 50%, rgba(245,158,11,0.15))',
    'Baile Magos': 'linear-gradient(to right, rgba(168,85,247,0.15), transparent 50%, rgba(168,85,247,0.15))',
    'Tapas y Vinos': 'linear-gradient(to right, rgba(251,113,133,0.15), transparent 50%, rgba(251,113,133,0.15))',
    'Paseo Romero': 'linear-gradient(to right, rgba(249,115,22,0.15), transparent 50%, rgba(249,115,22,0.15))',
    'Tapas': 'linear-gradient(to right, rgba(248,113,113,0.15), transparent 50%, rgba(248,113,113,0.15))',
    'Romería Chica': 'linear-gradient(to right, rgba(251,191,36,0.15), transparent 50%, rgba(251,191,36,0.15))',
    'Carnaval': 'linear-gradient(to right, rgba(232,121,249,0.15), transparent 50%, rgba(232,121,249,0.15))',
    'Taifa': 'linear-gradient(to right, rgba(250,204,21,0.15), transparent 50%, rgba(250,204,21,0.15))',
    'Infantil': 'linear-gradient(to right, rgba(52,211,153,0.15), transparent 50%, rgba(52,211,153,0.15))',
    'Inclusiva': 'linear-gradient(to right, rgba(45,212,191,0.15), transparent 50%, rgba(45,212,191,0.15))',
    'Vinos': 'linear-gradient(to right, rgba(236,72,153,0.15), transparent 50%, rgba(236,72,153,0.15))',
    'Aniversario': 'linear-gradient(to right, rgba(129,140,248,0.15), transparent 50%, rgba(129,140,248,0.15))',
    'Solidario': 'linear-gradient(to right, rgba(34,211,238,0.15), transparent 50%, rgba(34,211,238,0.15))',
    'Romería Barquera': 'linear-gradient(to right, rgba(249,115,22,0.15), transparent 50%, rgba(249,115,22,0.15))',
    'Pamela': 'linear-gradient(to right, rgba(249,168,212,0.15), transparent 50%, rgba(249,168,212,0.15))',
    'Blanco': 'linear-gradient(to right, rgba(209,213,219,0.15), transparent 50%, rgba(209,213,219,0.15))',
    'Sombrero': 'linear-gradient(to right, rgba(252,211,77,0.15), transparent 50%, rgba(252,211,77,0.15))',
    'Sardinada': 'linear-gradient(to right, rgba(56,189,248,0.15), transparent 50%, rgba(56,189,248,0.15))',
    'FIN DE AÑO': 'linear-gradient(to right, rgba(239,68,68,0.15), transparent 50%, rgba(239,68,68,0.15))',
    'Cerveza': 'linear-gradient(to right, rgba(163,230,53,0.15), transparent 50%, rgba(163,230,53,0.15))',
    'Otro': 'linear-gradient(to right, rgba(156,163,175,0.15), transparent 50%, rgba(156,163,175,0.15))'
};

const DEFAULT_HEX = '#9ca3af';

const getAlertColor = (level: string) => {
    if (level === 'red') return 'text-red-500';
    if (level === 'orange') return 'text-orange-500';
    if (level === 'yellow') return 'text-yellow-400';
    return 'text-gray-400';
};

const PhenomenonBadge = ({ phenomenon }: { phenomenon: string }) => {
    const p = phenomenon.toLowerCase();
    if (p.includes('viento')) return <><Wind className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">VI</span></>;
    if (p.includes('costero') || p.includes('mar')) return <><Waves className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">CO</span></>;
    if (p.includes('lluv') || p.includes('chubasc')) return <><CloudRain className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">PR</span></>;
    if (p.includes('calima') || p.includes('polvo') || p.includes('suspensión') || p.includes('suspension')) return <><Flame className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">VS</span></>;
    if (p.includes('nieve') || p.includes('nev')) return <><CloudSnow className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">NE</span></>;
    if (p.includes('torment') || p.includes('rayo')) return <><CloudLightning className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">TO</span></>;
    if (p.includes('niebla') || p.includes('niebl')) return <><CloudFog className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">NI</span></>;
    if (p.includes('galerna') || p.includes('risaga') || p.includes('rissaga')) return <><Waves className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">GA</span></>;
    if (p.includes('alud') || p.includes('avalancha')) return <><CloudSnow className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">AL</span></>;
    if (p.includes('temperatura') && (p.includes('máx') || p.includes('max') || p.includes('alta'))) return <><Thermometer className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">AT</span></>;
    if (p.includes('temperatura') && (p.includes('mín') || p.includes('min') || p.includes('baja'))) return <><Thermometer className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">BT</span></>;
    if (p.includes('deshielo')) return <><CloudRain className="w-3 h-3" /><span className="text-[9px] font-bold leading-none">DH</span></>;
    return <AlertTriangle className="w-3 h-3" />;
};

const EventCaptureCard: React.FC<EventCaptureCardProps> = ({ event, alerts, tipoColorHex }) => {
    const isFixed = FIXED_TYPE_SET.has(event.tipo);
    const hex = isFixed ? null : (tipoColorHex?.[event.tipo] || DEFAULT_HEX);
    const cardBg = isFixed ? (TIPO_GRADIENT[event.tipo] || TIPO_GRADIENT['Otro']) : `linear-gradient(to right, ${hex}26, transparent 50%, ${hex}26)`;
    const borderCls = isFixed ? `border-l-4 border-r-4 ${TIPO_COLOR[event.tipo] || TIPO_COLOR['Otro']}` : 'border-l-4 border-r-4';
    const borderSty = isFixed ? {} : { borderLeftColor: hex, borderRightColor: hex };

    return (
        <div
            style={{ background: cardBg, ...borderSty }}
            className={`relative overflow-hidden p-3 md:p-4 ${borderCls} border border-gray-700/50 select-none`}
        >
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-center min-w-0">
                <div className="flex items-center gap-1.5 text-white font-mono font-bold">
                    <span className="text-xl md:text-xl lg:text-3xl">{event.hora}</span>
                    <span className="text-xs text-gray-400">H</span>
                </div>

                {event.tipo !== 'Baile Normal' && (
                    <div className="px-2.5 py-1 bg-cyan-500/15 text-cyan-300 rounded text-base lg:text-lg font-medium border border-cyan-500/20">
                        {event.tipo}
                    </div>
                )}

                <div className="flex items-center gap-1.5 text-gray-300">
                    <MapPin className="w-5 h-5 text-gray-500" aria-hidden="true" />
                    <span className="text-lg lg:text-xl">
                        {event.lugar ? `${event.lugar}, ` : ''}{event.municipio}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <EventCaptureWeatherIcon
                        date={event.day}
                        municipio={event.municipio}
                        time={event.hora}
                    />
                    {alerts.length > 0 && (
                        <div className="flex items-center gap-0.5">
                            <span className={`flex items-center gap-0.5 ${getAlertColor(alerts[0].level || '')}`}>
                                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                            </span>
                            {alerts.map((a, idx) => (
                                <span key={idx} className={`flex items-center gap-0.5 ${getAlertColor(a.level || '')}`}>
                                    <PhenomenonBadge phenomenon={a.phenomenon} />
                                </span>
                            ))}
                        </div>
                    )}
                    <span className="p-1 text-gray-500">
                        <ChevronDown className="w-4 h-4" />
                    </span>
                </div>

                <div className="w-full flex items-center justify-center gap-3 my-1.5 text-[12px] md:text-sm uppercase tracking-[0.2em] font-bold select-none pointer-events-none" style={{ color: 'rgba(255, 106, 0, 0.90)' }}>
                    <div className="h-[1px] flex-grow" style={{ background: 'linear-gradient(to right, transparent, rgba(255,106,0,0.70), transparent)' }} />
                    <span>debelingoconangel.web.app</span>
                    <div className="h-[1px] flex-grow" style={{ background: 'linear-gradient(to left, transparent, rgba(255,106,0,0.70), transparent)' }} />
                </div>

                <div className="flex items-center gap-2 text-green-400 font-semibold min-w-0 max-w-full">
                    <Music2 className="w-5 h-5 flex-shrink-0 opacity-60" />
                    <span className="text-lg lg:text-xl leading-relaxed min-w-0">
                        {event.orquesta.split(',').map((orquesta, i, arr) => (
                            <span key={`${event.id}-${i}`}>
                                {orquesta.trim()}
                                {i < arr.length - 1 && <span>,</span>}
                            </span>
                        ))}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EventCaptureCard;
