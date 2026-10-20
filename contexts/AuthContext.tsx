import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { dataService, getSettings } from '../services/dataService';
import Swal from 'sweetalert2';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasPermission: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Restore session from localStorage if available and valid
        const savedUser = localStorage.getItem('budgetAppUser');
        const lastActive = localStorage.getItem('lastActive');

        if (savedUser) {
            const now = Date.now();
            // Check if session is expired based on lastActive
            if (lastActive && (now - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT)) {
                logout(); // Session expired
            } else {
                try {
                    setUser(JSON.parse(savedUser));
                    // Update timestamp on valid restore
                    localStorage.setItem('lastActive', now.toString());
                } catch (e) {
                    localStorage.removeItem('budgetAppUser');
                    localStorage.removeItem('lastActive');
                }
            }
        }
    }, []);

    // Activity Monitor Effect
    useEffect(() => {
        if (!user) return;

        const updateActivity = () => {
            // Update the last active timestamp
            localStorage.setItem('lastActive', Date.now().toString());
        };

        const checkInactivity = () => {
            const lastActive = localStorage.getItem('lastActive');
            if (lastActive) {
                const now = Date.now();
                if (now - parseInt(lastActive, 10) > INACTIVITY_TIMEOUT) {
                    logout();
                    Swal.fire({
                        icon: 'info',
                        title: 'หมดเวลาการใช้งาน',
                        text: 'คุณไม่ได้ใช้งานระบบเกิน 10 นาที กรุณาเข้าสู่ระบบใหม่',
                        confirmButtonColor: '#059669',
                        allowOutsideClick: false
                    });
                }
            }
        };

        // Events to listen for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        // Add listeners
        events.forEach(event => window.addEventListener(event, updateActivity));

        // Check inactivity every 10 seconds
        const intervalId = setInterval(checkInactivity, 10000);

        return () => {
            // Cleanup
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(intervalId);
        };
    }, [user]);

    const login = async (username: string, password: string): Promise<boolean> => {
        const foundUser = await dataService.login(username, password);
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('budgetAppUser', JSON.stringify(foundUser));
            localStorage.setItem('lastActive', Date.now().toString()); // Set initial activity time
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('budgetAppUser');
        localStorage.removeItem('lastActive');
    };

    const hasPermission = (path: string): boolean => {
        if (!user) return false;
        const settings = getSettings();
        
        // 1. Check for User-specific permissions first
        const userPerms = settings.permissions[user.username];
        if (userPerms) {
            return userPerms.includes(path);
        }

        // 2. Fallback to Role-based permissions
        const rolePerms = settings.permissions[user.role] || [];
        return rolePerms.includes(path);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};