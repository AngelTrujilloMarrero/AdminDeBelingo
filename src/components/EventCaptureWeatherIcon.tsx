import React, { useEffect, useState } from 'react';
import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Snowflake, Loader2 } from 'lucide-react';

interface EventCaptureWeatherIconProps {
    date: string;
    municipio: string;
    time?: string;
}

const MUNICIPIO_COORDS: Record<string, { lat: number; lng: number }> = {
    'adeje': { lat: 28.1226, lng: -16.7256 },
    'arafo': { lat: 28.3406, lng: -16.4139 },
    'arico': { lat: 28.1742, lng: -16.4841 },
    'arona': { lat: 28.0999, lng: -16.6809 },
    'buenavista': { lat: 28.3705, lng: -16.8519 },
    'candelaria': { lat: 28.3547, lng: -16.37 },
    'rosario': { lat: 28.4507, lng: -16.369 },
    'el rosario': { lat: 28.4507, lng: -16.369 },
    'sauzal': { lat: 28.4797, lng: -16.4353 },
    'el sauzal': { lat: 28.4797, lng: -16.4353 },
    'tanque': { lat: 28.3558, lng: -16.7789 },
    'el tanque': { lat: 28.3558, lng: -16.7789 },
    'fasnia': { lat: 28.2367, lng: -16.4394 },
    'garachico': { lat: 28.3733, lng: -16.7636 },
    'granadilla': { lat: 28.1171, lng: -16.5764 },
    'granadilla de abona': { lat: 28.1171, lng: -16.5764 },
    'guancha': { lat: 28.3742, lng: -16.6507 },
    'la guancha': { lat: 28.3742, lng: -16.6507 },
    'guia': { lat: 28.2117, lng: -16.7794 },
    'guía': { lat: 28.2117, lng: -16.7794 },
    'guia de isora': { lat: 28.2117, lng: -16.7794 },
    'guía de isora': { lat: 28.2117, lng: -16.7794 },
    'guimar': { lat: 28.3169, lng: -16.4117 },
    'güímar': { lat: 28.3169, lng: -16.4117 },
    'icod': { lat: 28.3544, lng: -16.7182 },
    'icod de los vinos': { lat: 28.3544, lng: -16.7182 },
    'matanza': { lat: 28.4476, lng: -16.4453 },
    'la matanza': { lat: 28.4476, lng: -16.4453 },
    'la matanza de acentejo': { lat: 28.4476, lng: -16.4453 },
    'orotava': { lat: 28.3906, lng: -16.5247 },
    'la orotava': { lat: 28.3906, lng: -16.5247 },
    'puerto': { lat: 28.4163, lng: -16.5488 },
    'el puerto de la cruz': { lat: 28.4163, lng: -16.5488 },
    'realejos': { lat: 28.3753, lng: -16.5826 },
    'los realejos': { lat: 28.3753, lng: -16.5826 },
    'laguna': { lat: 28.4873, lng: -16.3159 },
    'la laguna': { lat: 28.4873, lng: -16.3159 },
    'san cristóbal de la laguna': { lat: 28.4873, lng: -16.3159 },
    'san cristobal de la laguna': { lat: 28.4873, lng: -16.3159 },
    'san juan rambla': { lat: 28.3958, lng: -16.6494 },
    'san juan de la rambla': { lat: 28.3958, lng: -16.6494 },
    'san miguel': { lat: 28.098, lng: -16.6156 },
    'san miguel de abona': { lat: 28.098, lng: -16.6156 },
    'santa cruz': { lat: 28.4682, lng: -16.2546 },
    'santa cruz de tenerife': { lat: 28.4682, lng: -16.2546 },
    'santa ursula': { lat: 28.4471, lng: -16.4927 },
    'santa úrsula': { lat: 28.4471, lng: -16.4927 },
    'santiago teide': { lat: 28.2952, lng: -16.8154 },
    'santiago del teide': { lat: 28.2952, lng: -16.8154 },
    'tacoronte': { lat: 28.4794, lng: -16.4117 },
    'tegueste': { lat: 28.5233, lng: -16.337 },
    'victoria': { lat: 28.4327, lng: -16.469 },
    'la victoria': { lat: 28.4327, lng: -16.469 },
    'la victoria de acentejo': { lat: 28.4327, lng: -16.469 },
    'vilaflor': { lat: 28.1572, lng: -16.6381 },
    'vilaflor de chasna': { lat: 28.1572, lng: -16.6381 },
    'silos': { lat: 28.3655, lng: -16.8178 },
    'los silos': { lat: 28.3655, lng: -16.8178 }
};

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const getCoords = (municipio: string): { lat: number; lng: number } | null => {
    const key = normalize(municipio);
    const direct = MUNICIPIO_COORDS[key];
    if (direct) return direct;
    for (const [name, coords] of Object.entries(MUNICIPIO_COORDS)) {
        if (normalize(name) === key) return coords;
    }
    return null;
};

interface WeatherData {
    weatherCode: number | null;
    temp: number | null;
    isDay: number | null;
}

const EventCaptureWeatherIcon: React.FC<EventCaptureWeatherIconProps> = ({ date, municipio, time }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(date);
        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const shouldFetchWeather = diffDays >= 0 && diffDays <= 14;

        if (!shouldFetchWeather) {
            setLoading(false);
            setWeather(null);
            return;
        }

        const coords = getCoords(municipio);
        if (!coords) {
            setLoading(false);
            setWeather(null);
            return;
        }

        setLoading(true);
        let hour: number | null = null;
        if (time) {
            const match = time.trim().match(/^(\d{1,2})/);
            if (match) hour = parseInt(match[1]);
        }

        let weatherUrl: string;
        if (hour !== null && hour >= 0 && hour <= 23) {
            weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&hourly=weather_code,temperature_2m,is_day&start_date=${date}&end_date=${date}&timezone=Atlantic/Canary`;
        } else {
            weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weather_code,temperature_2m_max&start_date=${date}&end_date=${date}&timezone=Atlantic/Canary`;
        }

        fetch(weatherUrl)
            .then(res => {
                if (res.status === 429) return null;
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                if (!data) {
                    setWeather(null);
                    return;
                }
                let weatherCode: number | null = null;
                let temp: number | null = null;
                let isDay = 1;

                if (hour !== null && data.hourly) {
                    weatherCode = data.hourly.weather_code[hour];
                    temp = data.hourly.temperature_2m[hour];
                    isDay = data.hourly.is_day[hour];
                } else if (data.daily) {
                    weatherCode = data.daily.weather_code[0];
                    temp = data.daily.temperature_2m_max[0];
                }

                setWeather({ weatherCode, temp, isDay });
            })
            .catch(() => {
                if (!cancelled) setWeather(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [date, municipio, time]);

    const weatherCode = weather?.weatherCode ?? null;
    const temp = weather?.temp ?? null;
    const isDay = weather?.isDay ?? null;

    if (weatherCode === null && !loading) return null;

    const getIcon = (code: number) => {
        const isNight = isDay === 0;
        if (code === 0) return isNight ? <Moon className="w-5 h-5 text-blue-200" /> : <Sun className="w-5 h-5 text-yellow-400" />;
        if (code >= 1 && code <= 3) return isNight ? <CloudMoon className="w-5 h-5 text-gray-300" /> : <CloudSun className="w-5 h-5 text-gray-300" />;
        if (code === 45 || code === 48) return <CloudFog className="w-5 h-5 text-gray-400" />;
        if (code >= 51 && code <= 55) return <CloudDrizzle className="w-5 h-5 text-blue-300" />;
        if (code >= 61 && code <= 65) return <CloudRain className="w-5 h-5 text-blue-400" />;
        if (code >= 71 && code <= 77) return <Snowflake className="w-5 h-5 text-blue-100" />;
        if (code >= 80 && code <= 82) return <CloudRain className="w-5 h-5 text-blue-500" />;
        if (code >= 95) return <CloudLightning className="w-5 h-5 text-purple-400" />;
        return <Cloud className="w-5 h-5 text-gray-400" />;
    };

    return (
        <div className="flex items-center gap-1 min-w-[40px] justify-center">
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            ) : weatherCode !== null && (
                <span className="flex items-center gap-1">
                    {getIcon(weatherCode)}
                    {temp !== null && <span className="text-xs font-bold text-gray-300">{Math.round(temp)}°</span>}
                </span>
            )}
        </div>
    );
};

export default EventCaptureWeatherIcon;
