export type AlertLevel = 'yellow' | 'orange' | 'red' | null;

export interface AemetAlert {
    level: AlertLevel;
    phenomenon: string;
    zone: string;
    description: string;
    link: string;
    date: string;
    onset?: string;
    expires?: string;
}

const ZONE_MAPPING: Record<string, string> = {
    "Santa Cruz": "Metropolitana",
    "Laguna": "Metropolitana",
    "Rosario": "Metropolitana",
    "Tegueste": "Metropolitana",
    "Buenavista": "Norte",
    "Silos": "Norte",
    "Tanque": "Norte",
    "Garachico": "Norte",
    "Icod": "Norte",
    "Guancha": "Norte",
    "San Juan Rambla": "Norte",
    "Realejos": "Norte",
    "Puerto": "Norte",
    "Orotava": "Norte",
    "Santa Úrsula": "Norte",
    "Victoria": "Norte",
    "Matanza": "Norte",
    "Sauzal": "Norte",
    "Tacoronte": "Norte",
    "Candelaria": "Sur",
    "Arafo": "Sur",
    "Güímar": "Sur",
    "Fasnia": "Sur",
    "Arona": "Sur",
    "Adeje": "Sur",
    "Guía": "Sur",
    "Santiago Teide": "Sur",
    "San Miguel": "Sur",
    "Granadilla": "Sur",
    "Vilaflor": "Sur"
};

const API_BASE_URL = import.meta.env.VITE_VERCEL_API_URL || 'https://de-belingo-con-angel-debelingoconangels-projects.vercel.app';
const AEMET_PROXY_URL = `${API_BASE_URL}/api/aemet-proxy`;

let cachedAlerts: AemetAlert[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

export const fetchAemetAlerts = async (force = false): Promise<AemetAlert[]> => {
    if (!force && cachedAlerts && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return cachedAlerts;
    }

    try {
        const response = await fetch(AEMET_PROXY_URL);
        if (!response.ok) {
            console.warn(`[AEMET] Proxy unavailable (${response.status})`);
            return cachedAlerts || [];
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        const parsedAlerts: AemetAlert[] = [];

        items.forEach(item => {
            const title = item.querySelector("title")?.textContent || "";
            const description = item.querySelector("description")?.textContent || "";
            const link = item.querySelector("link")?.textContent || "";

            if (title.toLowerCase().includes("no hay avisos")) return;

            let level: AlertLevel = null;
            if (title.toLowerCase().includes("rojo")) level = 'red';
            else if (title.toLowerCase().includes("naranja")) level = 'orange';
            else if (title.toLowerCase().includes("amarillo")) level = 'yellow';

            if (!level) return;

            let zone = "";
            if (title.toLowerCase().includes("metropolitana")) zone = "Metropolitana";
            else if (title.toLowerCase().includes("norte")) zone = "Norte";
            else if (title.toLowerCase().includes("este, sur y oeste")) zone = "Sur";
            else if (title.toLowerCase().includes("cumbres")) zone = "Cumbres";

            let phenomenon = "Fenómeno adverso";
            if (title.includes(" por ")) {
                phenomenon = title.split(" por ")[1]?.split(".")[0]?.split(" en ")[0]?.trim() || phenomenon;
            } else if (title.includes(".")) {
                const parts = title.split(".").map(p => p.trim()).filter(Boolean);
                if (parts.length >= 3) {
                    phenomenon = parts[2];
                }
            }

            const dateMatch = description.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
            let alertDate = "";
            if (dateMatch) {
                alertDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            } else {
                const pubDate = item.querySelector("pubDate")?.textContent;
                if (pubDate) {
                    const d = new Date(pubDate);
                    alertDate = d.toISOString().split('T')[0];
                }
            }

            let onset: string | undefined;
            let expires: string | undefined;

            const onsetMatch = description.match(/de\s+(\d{2}):(\d{2})/);
            if (onsetMatch) {
                onset = `${onsetMatch[1]}:${onsetMatch[2]}`;
            }

            const expiresMatch = description.match(/a\s+(\d{2}):(\d{2})/);
            if (expiresMatch) {
                expires = `${expiresMatch[1]}:${expiresMatch[2]}`;
            }

            parsedAlerts.push({
                level,
                phenomenon,
                zone,
                description,
                link,
                date: alertDate,
                onset,
                expires
            });
        });

        cachedAlerts = parsedAlerts;
        cacheTimestamp = Date.now();
        return parsedAlerts;
    } catch (error) {
        console.error("[AEMET] Error fetching alerts:", error);
        return cachedAlerts || [];
    }
};

export const getAlertForEvent = (alerts: AemetAlert[], municipio: string, date: string, hora?: string): AemetAlert[] => {
    if (!municipio || !date) return [];

    const eventDate = date.split('T')[0].trim();
    const eventTime = hora ? hora.trim() : null;

    const munSearch = municipio.toLowerCase();

    let eventZone = "";
    for (const [key, zone] of Object.entries(ZONE_MAPPING)) {
        if (munSearch.includes(key.toLowerCase())) {
            eventZone = zone;
            break;
        }
    }

    if (!eventZone) {
        return [];
    }

    return alerts.filter(a => {
        const alertZone = a.zone.trim();
        const alertDate = a.date.trim();
        const zoneMatch = (alertZone === eventZone || alertZone === "Cumbres");
        const dateMatch = (alertDate === eventDate);

        if (!zoneMatch || !dateMatch) return false;

        if (!eventTime || !a.onset) {
            return true;
        }

        const eventMinutes = parseInt(eventTime.split(':')[0]) * 60 + parseInt(eventTime.split(':')[1] || '0');
        const onsetMinutes = parseInt(a.onset.split(':')[0]) * 60 + parseInt(a.onset.split(':')[1]);
        const expiresMinutes = a.expires ? parseInt(a.expires.split(':')[0]) * 60 + parseInt(a.expires.split(':')[1]) : 24 * 60;

        const inRange = eventMinutes >= onsetMinutes && eventMinutes <= expiresMinutes;
        return inRange;
    });
};
