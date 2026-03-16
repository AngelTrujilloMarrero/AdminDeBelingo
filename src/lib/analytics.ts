import { ref, push } from 'firebase/database';
import { db } from './firebase';

export interface AnalyticsData {
  page: string;
  referrer: string;
  duration?: number;
  scrollDepth?: number;
  timeOnPage?: number;
  pageViews?: number;
}

const sessionId = sessionStorage.getItem('analyticsSessionId') || 
  Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
sessionStorage.setItem('analyticsSessionId', sessionId);

const isReturning = sessionStorage.getItem('analyticsVisited') === 'true';
sessionStorage.setItem('analyticsVisited', 'true');

function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|playbook|silk|pixel|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  return 'Other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function getConnectionType(): string | undefined {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return conn?.effectiveType;
}

function getDownlink(): number | undefined {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return conn?.downlink;
}

async function getIPInfo(): Promise<{ ip?: string; isp?: string }> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return { ip: data.ip };
  } catch {
    return {};
  }
}

function getGPUInfo(): { gpuVendor?: string; gpuRenderer?: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return {};
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return {};
    
    return {
      gpuVendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      gpuRenderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    };
  } catch {
    return {};
  }
}

async function getBatteryInfo(): Promise<{ batteryLevel?: number; batteryCharging?: boolean }> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<any> };
    if (!nav.getBattery) return {};
    const battery = await nav.getBattery();
    return {
      batteryLevel: Math.round(battery.level * 100),
      batteryCharging: battery.charging
    };
  } catch {
    return {};
  }
}

export async function trackVisit(data: AnalyticsData): Promise<void> {
  const [ipInfo, gpuInfo, batteryInfo] = await Promise.all([
    getIPInfo(),
    getGPUInfo(),
    getBatteryInfo()
  ]);

  const visitData = {
    ...data,
    timestamp: Date.now(),
    sessionId,
    isReturning,
    browser: getBrowser(),
    os: getOS(),
    device: getDeviceType(),
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: getConnectionType(),
    downlink: getDownlink(),
    memory: (navigator as any).deviceMemory,
    cores: navigator.hardwareConcurrency,
    touchPoints: navigator.maxTouchPoints,
    orientation: screen.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
    darkTheme: window.matchMedia('(prefers-color-scheme: dark)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: (navigator as any).saveData,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    platform: navigator.platform,
    vendor: navigator.vendor,
    pdfViewerEnabled: (navigator as any).pdfViewerEnabled,
    maxTouchPoints: navigator.maxTouchPoints,
    screenOrientation: screen.orientation?.type,
    webglVendor: gpuInfo.gpuVendor,
    webglRenderer: gpuInfo.gpuRenderer,
    ...ipInfo,
    ...batteryInfo
  };

  try {
    const visitsRef = ref(db, 'analytics/visits');
    await push(visitsRef, visitData);
  } catch (error) {
    console.error('Error tracking visit:', error);
  }
}

let maxScroll = 0;
let pageStartTime = Date.now();
let pageViewCount = parseInt(sessionStorage.getItem('analyticsPageViews') || '0');
sessionStorage.setItem('analyticsPageViews', String(pageViewCount + 1));

export function initScrollTracking(): void {
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
    }
  }, { passive: true });
}

export function getScrollDepth(): number {
  return maxScroll;
}

export function getTimeOnPage(): number {
  return Date.now() - pageStartTime;
}

export function getPageViews(): number {
  return pageViewCount + 1;
}

export function trackPageView(page: string): void {
  const duration = getTimeOnPage();
  const scrollDepth = getScrollDepth();
  const pageViews = getPageViews();
  
  trackVisit({
    page,
    referrer: document.referrer,
    duration,
    scrollDepth,
    pageViews
  });
}
