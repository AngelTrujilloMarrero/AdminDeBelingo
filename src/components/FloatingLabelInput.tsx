import React, { useEffect, useRef } from 'react';

const EMPTY_SUGGESTIONS: any[] = [];

interface FloatingLabelInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    icon?: React.ReactNode;
    className?: string;
    placeholder?: string;
    suggestions?: string[] | Array<{ lugar: string; municipio: string }> | Array<{ name: string; hasData?: boolean; isHistorical?: boolean; extraInfo?: string }>;
    onSuggestionClick?: (value: any) => void;
    showSuggestions?: boolean;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    inputRef?: React.RefObject<HTMLInputElement>;
    gridCols?: 1 | 2 | 3;
    suggestionDirection?: 'up' | 'down';
    suggestionLayout?: 'absolute' | 'relative';
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
    onFocus,
    onBlur,
    inputRef,
    gridCols = 1,
    suggestionDirection = 'down',
    suggestionLayout = 'absolute'
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
                            onFocus={onFocus}
                            onBlur={onBlur}
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
                            onFocus={onFocus}
                            onBlur={onBlur}
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
                                ${hasValue
                                    ? 'top-2 text-xs font-medium text-blue-800 dark:text-indigo-400 scale-90'
                                    : 'top-1/2 -translate-y-1/2 text-base'
                                }
                            `}
                        >
                            {label}
                        </label>
                    </>
                )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    className={`${suggestionLayout} w-full z-[100] bg-popover border border-border rounded-xl shadow-xl max-h-[600px] overflow-y-auto 
                                ${suggestionDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
                                ${gridCols > 1 ? 'grid gap-px p-px' : 'flex flex-col p-2 gap-2'}`} 
                    style={{ gridTemplateColumns: gridCols > 1 ? `repeat(${gridCols}, minmax(0, 1fr))` : undefined }}
                >
                    {suggestions.map((suggestion, idx) => {
                        const isHistorical = typeof suggestion === 'object' && 'isHistorical' in (suggestion as any) && (suggestion as any).isHistorical;
                        return (
                            <button
                                key={typeof suggestion === 'object' ? ((suggestion as any).id || ('lugar' in suggestion ? `${suggestion.lugar}|${suggestion.municipio}` : (suggestion as any).name) || idx) : `${suggestion}-${idx}`}
                                type="button"
                                onClick={() => onSuggestionClick?.(typeof suggestion === 'object' && 'name' in (suggestion as any) ? (suggestion as any).name : suggestion)}
                                className={`px-4 py-3 text-left hover:bg-muted/80 transition-all duration-300 text-popover-foreground relative overflow-hidden flex flex-col justify-center rounded-xl border border-border/50 my-0.5 first:mt-0 last:mb-0
                             ${gridCols > 1 && !isHistorical ? 'items-center text-center' : 'items-start text-left'}
                             ${isHistorical ? (gridCols === 3 ? 'col-span-3 w-full bg-amber-500/10 border-amber-500/30' : gridCols === 2 ? 'col-span-2 w-full bg-amber-500/10 border-amber-500/30' : '') : 'bg-muted/30 shadow-sm hover:shadow-md'} 
                             ${gridCols > 1 && !isHistorical ? 'border-r [&:nth-child(3n)]:border-r-0' : ''}`}
                            >
                             <div className={`flex flex-col ${isHistorical ? 'w-full' : ''}`}>
                             {typeof suggestion === 'object' && 'lugar' in (suggestion as any) ? (
                                 <div className="flex flex-row items-center justify-between w-full h-full">
                                     <span className="font-bold text-indigo-900 dark:text-white text-[15px]">{(suggestion as any).lugar}</span>
                                     <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-indigo-300 bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider ml-3 shrink-0">
                                         {(suggestion as any).municipio}
                                     </span>
                                 </div>
                            ) : typeof suggestion === 'object' && 'name' in (suggestion as any) ? (
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className={(suggestion as any).isHistorical ? 'pl-2 border-l-2 border-amber-500 font-medium' : 'font-medium'}>
                                            {(suggestion as any).name}
                                        </span>
                                        <div className="flex gap-1">
                                            {(suggestion as any).isHistorical && (
                                                <span className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-100 dark:border-amber-800">
                                                    Histórico
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {(suggestion as any).extraInfo && (
                                        <div className="text-[10px] text-muted-foreground italic pl-3">
                                            ({(suggestion as any).extraInfo})
                                        </div>
                                    )}
                                </div>
                            ) : (
                                 <span className="text-lg font-bold tracking-tight py-1">
                                     {suggestion as string}
                                 </span>
                            )}
                             </div>
                        </button>
                      );
                    })}
                </div>
            )}
        </div>
    );
}
