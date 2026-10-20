import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import { PieChart, Lock, User, LogIn, Eye, EyeOff, RefreshCw, Zap, DownloadCloud } from 'lucide-react';
import Swal from 'sweetalert2';

const LoginView: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<'idle' | 'logging_in' | 'syncing'>('idle');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณากรอกข้อมูล',
                text: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
                confirmButtonColor: '#fbbf24'
            });
            return;
        }

        setStatus('logging_in');
        try {
            const success = await login(username, password);
            
            if (success) {
                // Login successful, navigate immediately (Stale-While-Revalidate)
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                });
                Toast.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ'
                });
                
                navigate('/');
                
                // Trigger data sync in the background without awaiting
                dataService.syncDropdowns().catch(err => {
                    console.warn('Background sync failed:', err);
                });
            } else {
                setStatus('idle');
                Swal.fire({
                    icon: 'error',
                    title: 'เข้าสู่ระบบไม่สำเร็จ',
                    text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือคุณอาจไม่มีสิทธิ์เข้าใช้งาน',
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error) {
            setStatus('idle');
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ต',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-5 dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500 to-teal-700 opacity-90"></div>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute top-10 -left-10 w-24 h-24 bg-teal-300 opacity-10 rounded-full blur-xl"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-lg mb-4 transform transition-transform hover:scale-105 duration-300">
                            <PieChart size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">DNP Budget System</h1>
                        <p className="text-emerald-100 text-sm font-medium">ระบบบริหารและติดตามงบประมาณ</p>
                    </div>
                </div>
                
                <div className="p-8">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">ลงชื่อเข้าใช้งาน</h2>
                        <div className="flex items-center justify-center gap-1 mt-1">
                             <Zap size={14} className="text-amber-500" fill="currentColor" />
                             <p className="text-slate-500 dark:text-slate-400 text-sm">เข้าสู่ระบบด้วยความเร็วสูง (Firebase)</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">ชื่อผู้ใช้</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={status !== 'idle'}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200 transition-all disabled:opacity-50"
                                    placeholder="Username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">รหัสผ่าน</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={status !== 'idle'}
                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200 transition-all disabled:opacity-50"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={status !== 'idle'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none transition-colors disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status !== 'idle'}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:bg-emerald-800 disabled:cursor-wait"
                        >
                            {status === 'logging_in' ? (
                                <>
                                    <RefreshCw size={20} className="animate-spin" />
                                    กำลังตรวจสอบ...
                                </>
                            ) : status === 'syncing' ? (
                                <>
                                    <DownloadCloud size={20} className="animate-bounce" />
                                    กำลังเตรียมข้อมูล...
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginView;