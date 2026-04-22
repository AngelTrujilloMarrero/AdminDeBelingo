/**
 * Image Upload Service for AdminDeBelingo
 * Reutiliza la API del front-end WebDebelingo
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

const API_BASE_URL = import.meta.env.VITE_VERCEL_API_URL || 'https://de-belingo-con-angel.vercel.app';

export interface ImageInfo {
    name: string;
    size: number;
    type: string;
    width?: number;
    height?: number;
}

export class ImageUploadError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = 'ImageUploadError';
    }
}

async function getSecurityHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    const internalKey = import.meta.env.VITE_APP_INTERNAL_KEY;
    if (internalKey) {
        headers['X-App-Internal-Key'] = internalKey;
    }

    if (typeof window !== 'undefined' && (window as any)._turnstileToken) {
        headers['X-Turnstile-Token'] = (window as any)._turnstileToken;
    }

    return headers;
}

function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function uploadToImgur(file: File): Promise<{ url: string; info: ImageInfo }> {
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new ImageUploadError('Solo se permiten archivos JPG, PNG y WEBP');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new ImageUploadError('El archivo no puede superar los 20MB');
    }

    const base64 = await readFileAsBase64(file);
    const headers = await getSecurityHeaders();

    const response = await fetch(`${API_BASE_URL}/api/upload-imgur`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: base64 })
    });

    const result = await response.json();

    if (result.success) {
        return {
            url: result.url,
            info: {
                name: file.name,
                size: file.size,
                type: file.type,
                width: result.data?.width,
                height: result.data?.height
            }
        };
    } else {
        throw new ImageUploadError(result.error || 'Upload failed', response.status);
    }
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}