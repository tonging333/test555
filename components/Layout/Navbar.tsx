
import React, { useState } from 'react';
import { Menu, X, PieChart, LogOut, User as UserIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { APP_ROUTES } from '../../services/dataService';

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, hasPermission } = useAuth();

    // Generate menu items based on APP_ROUTES and permissions
    const availableNavItems = APP_ROUTES.filter(route => hasPermission(route.path)).map(route => ({
        name: route.label.split(' (')[0], // Simplify name for navbar
        path: route.path
    }));

    const isActive = (path: string) => location.pathname === path;

    const handleNav = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-[98vw] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNav('/')}>
                        <div className="w-11 h-11 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                            <PieChart size={26} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight transition-colors">DNP Budget</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors">ระบบบริหารงบประมาณ</p>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-4">
                        <div className="flex items-center space-x-1">
                            {availableNavItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNav(item.path)}
                                    className={`px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 whitespace-nowrap ${
                                        isActive(item.path)
                                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 shadow-sm'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-base font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wide px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{user.role}</span>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="ออกจากระบบ"
                            >
                                <LogOut size={22} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="lg:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
                        >
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>
            {/* Mobile menu */}
            {isOpen && (
                <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 absolute w-full shadow-lg rounded-b-2xl">
                    <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                                <UserIcon size={18} />
                            </div>
                            <span className="font-bold text-lg text-slate-700 dark:text-slate-300">{user.name}</span>
                         </div>
                         <button 
                            onClick={handleLogout}
                            className="text-sm text-red-500 border border-red-200 dark:border-red-900/50 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 font-bold"
                         >
                            Logout
                         </button>
                    </div>
                    <div className="px-3 pt-2 pb-4 space-y-1">
                        {availableNavItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => handleNav(item.path)}
                                className={`block w-full text-left px-5 py-4 rounded-xl text-lg font-bold ${
                                    isActive(item.path)
                                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
