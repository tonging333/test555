
import React, { useEffect } from 'react';
import { createHashRouter, RouterProvider, createRoutesFromElements, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { dataService } from './services/dataService';
import Navbar from './components/Layout/Navbar';
import HomeView from './components/Views/HomeView';
import DatabaseView from './components/Views/DatabaseView';
import CompareView from './components/Views/CompareView';
import ContactView from './components/Views/ContactView';
import SettingsView from './components/Views/SettingsView';
import ManageView from './components/Views/ManageView';
import ReportView from './components/Views/ReportView';
import LoginView from './components/Views/LoginView';
import ThemeToggle from './components/Layout/ThemeToggle';
import { Lock } from 'lucide-react';

// Component to handle route protection
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
    const { isAuthenticated, hasPermission } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check permission
    // Note: For /manage/* routes, we should check if user has permission to the specific sub-route OR the parent /manage route
    const hasAccess = hasPermission(location.pathname) || (location.pathname.startsWith('/manage') && hasPermission('/manage'));

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6 bg-slate-50 dark:bg-slate-900">
                <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-900/50 max-w-2xl w-full text-center">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">เข้าถึงไม่ได้</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน</p>
                    <button 
                        onClick={() => window.history.back()} 
                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-bold transition-colors"
                    >
                        ย้อนกลับ
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

const RootLayout: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    // Automatic background sync for authenticated sessions (on refresh/load and periodically)
    useEffect(() => {
        if (!isAuthenticated) return;

        console.log('Session active: Triggering initial background sync...');
        dataService.syncDropdowns().catch(err => console.error('Background sync failed:', err));

        // Set up periodic background sync (every 30 seconds)
        const intervalId = setInterval(() => {
            console.log('Triggering periodic background sync...');
            dataService.syncDropdowns().catch(err => console.error('Periodic background sync failed:', err));
        }, 30000);

        return () => clearInterval(intervalId);
    }, [isAuthenticated]);

    const isLoginPage = location.pathname === '/login';

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
            {isAuthenticated && !isLoginPage && <Navbar />}
            <main className="flex-grow">
                <Outlet />
            </main>
            <ThemeToggle />
            {isAuthenticated && !isLoginPage && (
                <footer className="bg-slate-900 dark:bg-slate-950 text-white py-8 text-center mt-auto border-t border-slate-800">
                    <div className="max-w-[98vw] mx-auto px-4">
                        <p className="text-slate-400 mb-2">&copy; 2025 ฝ่ายแผนปฏิบัติการ ส่วนจัดการงบประมาณ สงวนลิขสิทธิ์.</p>
                        <p className="text-sm text-slate-600 dark:text-slate-500">DNP Budget System v2.0 (React)</p>
                    </div>
                </footer>
            )}
        </div>
    );
};

const router = createHashRouter(
    createRoutesFromElements(
        <Route element={<RootLayout />}>
            <Route path="/login" element={<LoginView />} />
            
            <Route path="/" element={<ProtectedRoute><HomeView /></ProtectedRoute>} />
            <Route path="/database" element={<ProtectedRoute><DatabaseView /></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><CompareView /></ProtectedRoute>} />
            <Route path="/contact" element={<ProtectedRoute><ContactView /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
            {/* Updated route to support sub-paths */}
            <Route path="/manage/*" element={<ProtectedRoute><ManageView /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    ),
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true,
            v7_normalizeFormMethod: true,
            v7_partialHydration: true,
            v7_skipActionErrorRevalidation: true,
        } as any
    }
);

const App: React.FC = () => {
    return (
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    );
};

export default App;
