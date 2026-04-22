import React, { useState, useCallback, useRef } from 'react';
import { Globe, Upload, X, Image, Link2 } from 'lucide-react';
import { uploadToImgur, formatFileSize, ImageUploadError } from '../utils/imageUpload';
import { cn } from '../lib/utils';

interface ProgramaInputProps {
    value: string;
    onChange: (value: string) => void;
    suggestions?: Array<{ name: string }>;
    showSuggestions?: boolean;
    onSuggestionClick?: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ProgramaInput({
    value,
    onChange,
    suggestions = [],
    showSuggestions = false,
    onSuggestionClick,
    onFocus,
    onBlur,
    inputRef
}: ProgramaInputProps) {
    const [inputMode, setInputMode] = useState<'text' | 'image'>(() => {
        if (value.includes('imgur.com') || value.includes('ibb.co') || value.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
            return 'image';
        }
        return 'text';
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        const validationError = (() => {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) return 'Solo se permiten archivos JPG, PNG y WEBP';
            if (file.size > 20 * 1024 * 1024) return 'El archivo no puede superar los 20MB';
            return null;
        })();

        if (validationError) {
            setUploadError(validationError);
            return;
        }

        setUploadError(null);
        setIsUploading(true);

        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);

        try {
            const result = await uploadToImgur(file);
            onChange(result.url);
            URL.revokeObjectURL(previewUrl);
            setImagePreview(result.url);
        } catch (err) {
            if (err instanceof ImageUploadError) {
                setUploadError(err.message);
            } else {
                setUploadError('Error al subir la imagen');
            }
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setImagePreview(null);
        } finally {
            setIsUploading(false);
        }
    }, [onChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragActive(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [handleFile]);

    const handleRemoveImage = useCallback(() => {
        if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        onChange('');
    }, [imagePreview, onChange]);

    const handleModeChange = useCallback((mode: 'text' | 'image') => {
        setInputMode(mode);
        if (mode === 'text' && imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    }, [imagePreview]);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => handleModeChange('text')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        inputMode === 'text'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                >
                    <Link2 className="h-4 w-4" />
                    URL / Texto
                </button>
                <button
                    type="button"
                    onClick={() => handleModeChange('image')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        inputMode === 'image'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                >
                    <Image className="h-4 w-4" />
                    Subir Imagen
                </button>
            </div>

            {inputMode === 'text' ? (
                <div className="relative">
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
                            <Globe className="h-5 w-5" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onFocus={onFocus}
                            onBlur={() => setTimeout(onBlur, 200)}
                            placeholder=" "
                            className="w-full px-4 pl-11 pr-4 pt-7 pb-3 border-2 border-input rounded-xl focus:border-indigo-500 focus:outline-none transition-all bg-background text-foreground peer placeholder-transparent"
                            style={{ minHeight: '70px' }}
                        />
                        <label
                            htmlFor="programa-text"
                            className="absolute left-11 transition-all duration-300 pointer-events-none text-muted-foreground origin-left peer-focus:top-3 peer-focus:text-xs peer-focus:font-medium peer-focus:text-blue-800 dark:peer-focus:text-indigo-400 peer-focus:scale-90"
                            style={{
                                top: value ? '12px' : '50%',
                                transform: value ? 'none' : 'translateY(-50%)',
                                fontSize: value ? '12px' : '16px'
                            }}
                        >
                            Programa
                        </label>
                    </div>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute w-full z-[100] bg-popover border border-border rounded-xl shadow-xl max-h-[600px] overflow-y-auto top-full mt-2 flex flex-col p-2 gap-2">
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={`${suggestion.name}-${idx}`}
                                    type="button"
                                    onClick={() => onSuggestionClick?.(suggestion.name)}
                                    className="px-6 py-4 text-left hover:bg-muted/80 transition-all duration-300 text-popover-foreground relative overflow-hidden flex flex-col justify-center rounded-2xl border border-border/50 bg-muted/30 shadow-sm hover:shadow-md"
                                >
                                    <span className="text-lg font-bold tracking-tight py-1">{suggestion.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {imagePreview ? (
                        <div className="relative group">
                            <img
                                src={imagePreview}
                                alt="Programa"
                                className="max-w-full h-auto rounded-xl border border-border max-h-[300px] object-contain"
                            />
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                                dragActive
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                                    : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600',
                                isUploading && 'opacity-50 pointer-events-none'
                            )}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp"
                                onChange={handleFileInput}
                                disabled={isUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />

                            <div className="space-y-2">
                                <div className="text-3xl">
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                </div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    {isUploading ? 'Subiendo imagen...' : 'Arrastra una imagen aquí o haz clic para seleccionar'}
                                </div>
                                <div className="text-xs text-muted-foreground/70">
                                    JPG, PNG, WEBP • Máx 20MB
                                </div>
                            </div>
                        </div>
                    )}

                    {uploadError && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 px-4 py-2 rounded-lg">
                            {uploadError}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}