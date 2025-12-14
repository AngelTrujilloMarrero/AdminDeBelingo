import React from 'react';

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
    suggestions = [],
    onSuggestionClick,
    showSuggestions = false,
    inputRef
}: FloatingLabelInputProps) {
    const hasValue = value.length > 0;
    const isDateInput = type === 'date';

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder=" "
                    className={`
            w-full px-4 ${isDateInput ? 'pt-6 pb-2' : 'py-4'} ${icon ? 'pl-11' : 'pl-4'} border-2 border-gray-200 rounded-xl
            focus:border-indigo-500 focus:outline-none transition-all duration-300
            bg-white text-gray-900 peer placeholder-transparent
          `}
                />
                <label
                    htmlFor={id}
                    className={`
            absolute ${icon ? 'left-11' : 'left-4'} transition-all duration-300 pointer-events-none
            text-gray-500 origin-left
            ${isDateInput
                            ? 'top-2 text-xs font-medium text-indigo-600 scale-90'
                            : `peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base
                 peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-indigo-600 peer-focus:scale-90
                 ${hasValue ? 'top-2 text-xs font-medium text-indigo-600 scale-90' : 'top-1/2 -translate-y-1/2 text-base'}`
                        }
          `}
                >
                    {label}
                </label>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onSuggestionClick?.(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 
                         border-gray-100 transition-colors duration-200"
                        >
                            {typeof suggestion === 'object' && 'lugar' in suggestion ? (
                                <div>
                                    <span className="font-medium">{suggestion.lugar}</span>
                                    <span className="text-gray-500 ml-2">({suggestion.municipio})</span>
                                </div>
                            ) : typeof suggestion === 'object' && 'name' in suggestion ? (
                                <div className="flex justify-between items-center">
                                    <span>{suggestion.name}</span>
                                    {suggestion.hasData && (
                                        <span className="text-green-600 text-xs px-2 py-1 bg-green-50 rounded-full border border-green-100 flex items-center gap-1">
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
