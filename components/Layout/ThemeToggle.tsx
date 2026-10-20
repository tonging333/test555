import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check local storage only. Default to light if not set.
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            // Default to light mode
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    return (
        <div className="fixed bottom-5 left-5 z-50 flex flex-col items-center gap-3">
            
            {/* Sun Icon */}
            <Sun 
                size={18} 
                className={`transition-colors duration-300 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} 
            />
            
            {/* Toggle Switch */}
            <button 
                onClick={toggleTheme}
                className="w-6 h-12 rounded-full relative transition-colors focus:outline-none border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm hover:border-slate-400 dark:hover:border-slate-500"
                aria-label="Toggle Dark Mode"
            >
                {/* Knob */}
                <div 
                    className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full shadow-sm transform transition-all duration-300 ${
                        isDark 
                        ? 'top-[calc(100%-4px-14px)] bg-slate-200' 
                        : 'top-1 bg-slate-400'
                    }`}
                ></div>
            </button>

            {/* Moon Icon */}
            <Moon 
                size={18} 
                className={`transition-colors duration-300 ${isDark ? 'text-blue-500' : 'text-slate-400'}`} 
            />
        </div>
    );
};

export default ThemeToggle;