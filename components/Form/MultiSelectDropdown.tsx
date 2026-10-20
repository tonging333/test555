import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface MultiSelectDropdownProps {
    id: string;
    label: string;
    values: string[];
    options: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    id,
    label,
    values,
    options,
    onChange,
    placeholder = 'เลือกรายการ...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setFilter('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (values.length === 0) {
            setFilter('');
        }
    }, [values]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filter.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (values.includes(option)) {
            onChange(values.filter(v => v !== option));
        } else {
            onChange([...values, option]);
        }
    };

    const removeOption = (e: React.MouseEvent, option: string) => {
        e.stopPropagation();
        onChange(values.filter(v => v !== option));
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const selectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(options);
    };

    return (
        <div className="relative flex flex-col gap-1.5" ref={wrapperRef}>
            <label htmlFor={id} className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {label}
            </label>
            <div 
                className={`relative flex items-center min-h-[42px] w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-xl transition-all cursor-text
                    ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}
                `}
                onClick={() => setIsOpen(true)}
            >
                <div className="flex flex-wrap gap-1.5 flex-1 items-center overflow-hidden">
                    {values.length > 0 ? (
                        <>
                            {values.slice(0, 2).map(val => (
                                <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
                                    <span className="max-w-[100px] truncate">{val}</span>
                                    <button type="button" onClick={(e) => removeOption(e, val)} className="hover:text-emerald-900 dark:hover:text-emerald-200 p-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            {values.length > 2 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
                                    +{values.length - 2}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm truncate">{placeholder}</span>
                    )}
                    
                    <input
                        type="text"
                        className="flex-1 min-w-[50px] bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                    {values.length > 0 && (
                        <button type="button" onClick={clearAll} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="ล้างทั้งหมด">
                            <X size={14} />
                        </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 p-2 flex justify-between items-center z-10">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">เลือกรายการ ({values.length}/{options.length})</span>
                        <div className="flex gap-2">
                            <button type="button" onClick={selectAll} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">เลือกทั้งหมด</button>
                            <button type="button" onClick={clearAll} className="text-xs text-slate-500 dark:text-slate-400 hover:underline font-medium">ล้าง</button>
                        </div>
                    </div>
                    {filteredOptions.length > 0 ? (
                        <div className="p-1">
                            {filteredOptions.map((opt, index) => {
                                const isSelected = values.includes(opt);
                                return (
                                    <div
                                        key={index}
                                        onClick={() => toggleOption(opt)}
                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors text-sm
                                            ${isSelected 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' 
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }
                                        `}
                                    >
                                        <div className={`flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 transition-colors
                                            ${isSelected 
                                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                            }
                                        `}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <span className="truncate">{opt}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                            ไม่พบรายการที่ค้นหา
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
