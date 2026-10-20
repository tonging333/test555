import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Lock, Unlock } from 'lucide-react';

interface AutocompleteInputProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    locked?: boolean;
    onLockToggle?: () => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    id,
    label,
    value,
    options,
    onChange,
    placeholder = 'เลือกรายการ...',
    required = false,
    disabled = false,
    locked = false,
    onLockToggle
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset highlight when filter changes or menu opens
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filter, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
            (listRef.current.children[highlightedIndex] as HTMLElement).scrollIntoView({
                block: 'nearest',
            });
        }
    }, [highlightedIndex, isOpen]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filter.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setFilter(''); // Reset filter internal state, though value drives the input
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled || locked) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else {
                setHighlightedIndex(prev => 
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else {
                setHighlightedIndex(prev => 
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
            }
        } else if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            if (isOpen && filteredOptions.length > 0) {
                handleSelect(filteredOptions[highlightedIndex]);
            }
        } else if (e.key === 'Tab') {
            if (isOpen && filteredOptions.length > 0) {
                // If menu is open, Tab selects the item first (prevent default move)
                e.preventDefault();
                handleSelect(filteredOptions[highlightedIndex]);
            } else {
                // If menu is closed, Tab moves to next field (default behavior)
                setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full group">
            <div className="flex justify-between items-center mb-2">
                <label htmlFor={id} className="block text-base font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {onLockToggle && (
                    <button
                        type="button"
                        onClick={onLockToggle}
                        className={`focus:outline-none transition-colors p-1 rounded-full ${locked ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        tabIndex={-1} // Skip tab index for lock button to keep flow smooth
                    >
                        {locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                )}
            </div>
            <div className="relative">
                <input
                    type="text"
                    id={id}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setFilter(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (!locked) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled || locked}
                    className={`w-full px-4 py-3 pr-10 border rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 transition-all outline-none text-lg ${
                        locked 
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:border-emerald-300 dark:hover:border-emerald-700'
                    } placeholder-slate-400`}
                    autoComplete="off"
                />
                
                {!locked && value ? (
                    <button
                        type="button"
                        onClick={() => {
                            onChange('');
                            setFilter('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-900 rounded-full p-0.5"
                        tabIndex={-1}
                    >
                        <X size={20} />
                    </button>
                ) : !locked && (
                     <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none">
                        <ChevronDown size={20} />
                    </div>
                )}

                {isOpen && !locked && filteredOptions.length > 0 && (
                    <div ref={listRef} className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl mt-2 max-h-60 overflow-y-auto shadow-xl ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                        {filteredOptions.map((option, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelect(option)}
                                className={`px-4 py-3 cursor-pointer text-base transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0 ${
                                    idx === highlightedIndex 
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium' 
                                    : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutocompleteInput;