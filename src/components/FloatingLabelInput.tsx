import React, { useEffect, useRef } from 'react';

const EMPTY_SUGGESTIONS: string[] = [];

interface FloatingLabelInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    icon?: React.ReactNode;
    className?: string;
    placeholder?: string;
    suggestions?: string[] | Array<{ lugar: string; municipio: string }> | Array<{ name: string; hasData: boolean }>;
    onSuggestionClick?: (value: any) => void;
    showSuggestions?: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
}

export default function FloatingLabelInput({
    id,
    label,
    value,
    onChange,
    type = 'text',
    icon,
    className = '',
    placeholder = '',
    suggestions = EMPTY_SUGGESTIONS,
    onSuggestionClick,
    showSuggestions = false,
    inputRef
}: FloatingLabelInputProps) {
    const hasValue = value.length > 0;
    const isDateInput = type === 'date';
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (inputRef as unknown as React.RefObject<HTMLTextAreaElement>) || internalRef;

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.max(60, textarea.scrollHeight);
            textarea.style.height = `${newHeight}px`;
        }
    }, [value, textareaRef]);

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:!text-white pointer-events-none z-10">
                        {icon}
                    </div>
                )}
                {isDateInput ? (
                    <>
                        <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="date"
                            id={id}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className={`
                                w-full px-4 pt-6 pb-2 ${icon ? 'pl-11' : 'pl-4'} border-2 border-input rounded-xl
                                focus:border-indigo-500 focus:outline-none transition-all duration-300
                                bg-background text-foreground min-h-[60px]
                            `}
                        />
                        <label
                            htmlFor={id}
                            className={`
                                absolute ${icon ? 'left-11' : 'left-4'} top-2 text-xs font-medium
                                text-blue-800 dark:text-indigo-400 scale-90 transition-all duration-300 pointer-events-none
                            `}
                        >
                            {label}
                        </label>
                    </>
                ) : (
                    <>
                        <textarea
                            ref={textareaRef}
                            id={id}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder=" "
                            rows={1}
                            className={`
                                w-full px-4 pt-5 pb-3 ${icon ? 'pl-11' : 'pl-4'} border-2 border-input rounded-xl
                                focus:border-indigo-500 focus:outline-none transition-all duration-300
                                bg-background text-foreground peer placeholder-transparent
                                resize-none overflow-hidden min-h-[60px]
                            `}
                        />
                        <label
                            htmlFor={id}
                            className={`
                                absolute ${icon ? 'left-11' : 'left-4'} transition-all duration-300 pointer-events-none
                                text-muted-foreground origin-left
                                top-2 text-xs font-medium text-blue-800 dark:text-indigo-400 scale-90
                            `}
                        >
                            {label}
                        </label>
                    </>
                )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <button
                            key={typeof suggestion === 'object' ? (suggestion as any).id || ('lugar' in suggestion ? `${suggestion.lugar}|${suggestion.municipio}` : suggestion.name) || JSON.stringify(suggestion) : suggestion}
                            type="button"
                            onClick={() => onSuggestionClick?.(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-muted/50 border-b last:border-b-0 
                         border-border transition-colors duration-200 text-popover-foreground"
                        >
                            {typeof suggestion === 'object' && 'lugar' in suggestion ? (
                                <div>
                                    <span className="font-medium">{suggestion.lugar}</span>
                                    <span className="text-muted-foreground ml-2">({suggestion.municipio})</span>
                                </div>
                            ) : typeof suggestion === 'object' && 'name' in suggestion ? (
                                <div className="flex justify-between items-center">
                                    <span>{suggestion.name}</span>
                                    {suggestion.hasData && (
                                        <span className="text-green-600 dark:text-green-400 text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            Datos
                                        </span>
                                    )}
                                </div>
                            ) : (
                                suggestion as string
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
