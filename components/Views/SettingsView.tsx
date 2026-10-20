
import React, { useState, useEffect, useMemo } from 'react';
import { getSettings, saveSettings, dataService, APP_ROUTES, MANAGE_SUB_MENUS, useDataSync } from '../../services/dataService';
import Swal from 'sweetalert2';
import { Database, Link, Save, Wifi, Settings, Shield, CheckSquare, Square, UserCog, CornerDownRight, Users, UserPlus, Trash2, Edit, ChevronDown, FileSpreadsheet, Layers, Network, Briefcase, FileText, Globe, ExternalLink, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { UserRole, User } from '../../types';

type SettingsTab = 'general' | 'permissions' | 'users';

const SettingsView: React.FC = () => {
    useDataSync(); // Force re-render when data changes
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [settings, setSettingsState] = useState(getSettings());
    const [isTesting, setIsTesting] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const sheetsInfo = useMemo(() => [
        {
            name: 'ข้อมูลหลัก (Database)',
            sheetName: settings.databaseSheetName || 'Database',
            gid: settings.databaseGid,
            count: dataService.getRecords().length,
            role: 'เก็บข้อมูลบันทึกและงบประมาณดิบทั้งหมด',
            icon: Database,
            iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
            badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        },
        {
            name: 'โครงสร้างหน่วยงาน (Hierarchy)',
            sheetName: settings.hierarchySheetName || 'Hierarchy',
            gid: settings.hierarchyGid,
            count: dataService.getHierarchy().length,
            role: 'จังหวัดหลักและหน่วยงานหลักต้นสังกัด',
            icon: Network,
            iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
            badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
        },
        {
            name: 'หน่วยงานปฏิบัติ (ResponsibleAgency)',
            sheetName: settings.responsibleAgencySheetName || 'ResponsibleAgency',
            gid: settings.responsibleAgencyGid,
            count: dataService.getResponsibleData().length,
            role: 'จับคู่งานบูรณาการและพื้นที่รับผิดชอบ',
            icon: Layers,
            iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
            badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
        },
        {
            name: 'กิจกรรมงบเปรียบเทียบ (Compare)',
            sheetName: settings.compareSheetName || 'Compare',
            gid: settings.compareGid,
            count: dataService.getCompareData().length,
            role: 'รายการข้อมูลงบอ้างอิงและส่วนเปรียบเทียบ',
            icon: Briefcase,
            iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
            badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        },
        {
            name: 'รายการบูรณาการ (Integration)',
            sheetName: settings.integrationSheetName || 'Integration',
            gid: settings.integrationGid,
            count: dataService.getDropdowns().integration.length,
            role: 'ตัวเลือกชื่อการทำงานบูรณาการภาพรวม',
            icon: FileText,
            iconColor: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40',
            badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
        },
        {
            name: 'รายการหน่วยนับ (Unit)',
            sheetName: settings.unitSheetName || 'Unit',
            gid: settings.unitGid,
            count: dataService.getDropdowns().unit.length,
            role: 'ตัวเลือกหน่วยนับเป้าหมายการทำงาน',
            icon: CheckSquare,
            iconColor: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40',
            badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
        },
        {
            name: 'กลุ่มภูมิภาค (Region)',
            sheetName: 'Region',
            gid: settings.regionGid,
            count: dataService.getRegionData().length,
            role: 'แบ่งจังหวัดตามภูมิภาคประมวลผล',
            icon: Globe,
            iconColor: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40',
            badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
        },
        {
            name: 'โครงสร้างรายงาน (Report Structure)',
            sheetName: 'Report Structure',
            gid: settings.reportStructureGid,
            count: dataService.getReportStructure().length,
            role: 'ผังลำดับรายงานและแผนปฏิบัติการ',
            icon: FileSpreadsheet,
            iconColor: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40',
            badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
        }
    ], [settings, dataService.getRecords().length, dataService.getHierarchy().length, dataService.getResponsibleData().length, dataService.getCompareData().length, dataService.getDropdowns().integration.length, dataService.getDropdowns().unit.length, dataService.getRegionData().length, dataService.getReportStructure().length]);

    // Permissions Tab State
    const [selectedEntityId, setSelectedEntityId] = useState<string>('viewer'); // Default to viewer role

    // Users state
    const [users, setUsers] = useState<User[]>(dataService.getUsers());

    useEffect(() => {
        setUsers(dataService.getUsers());
    }, [refreshTrigger]);

    const handleChange = (key: string, value: string) => {
        setSettingsState(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'กำลังบันทึก...',
            text: 'ระบบกำลังบันทึกการตั้งค่าลงฐานข้อมูลส่วนกลาง',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // Save to Firestore (Global) and Local Storage
            const result = await dataService.saveGlobalSettings(settings);
            
            if (result.success) {
                Swal.fire({
                    title: 'บันทึกสำเร็จ',
                    text: 'การตั้งค่าถูกบันทึกเรียบร้อยแล้ว และจะมีผลกับทุกอุปกรณ์',
                    icon: 'success',
                    confirmButtonColor: '#059669'
                });
            } else {
                 Swal.fire({
                    title: 'บันทึกไม่สำเร็จ',
                    text: `เกิดข้อผิดพลาดในการบันทึกลง Firebase: ${result.message}`,
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error: any) {
             Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    const handleTestConnection = async () => {
        saveSettings(settings);
        setIsTesting(true);
        try {
            const success = await dataService.testConnection();
            if (success) {
                Swal.fire({ title: 'เชื่อมต่อสำเร็จ', text: 'สามารถติดต่อ Google Apps Script ได้', icon: 'success', confirmButtonColor: '#059669' });
            } else {
                Swal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: 'กรุณาตรวจสอบ URL หรือสิทธิ์การเข้าถึง', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch {
             Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setIsTesting(false);
        }
    };

    const togglePermission = (entityId: string, path: string) => {
        setSettingsState(prev => {
            const entityPermissions = prev.permissions[entityId] || [];
            let newPerms: string[];
            if (entityPermissions.includes(path)) {
                newPerms = entityPermissions.filter(p => p !== path);
            } else {
                newPerms = [...entityPermissions, path];
            }
            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [entityId]: newPerms
                }
            };
        });
    };

    const handleAddUser = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'เพิ่มผู้ใช้งานใหม่',
            html:
                '<input id="swal-input-username" class="swal2-input" placeholder="Username">' +
                '<input id="swal-input-password" type="password" class="swal2-input" placeholder="Password">' +
                '<input id="swal-input-name" class="swal2-input" placeholder="ชื่อ-นามสกุล">' +
                '<select id="swal-input-role" class="swal2-input">' +
                '  <option value="viewer">Viewer (ผู้เยี่ยมชม)</option>' +
                '  <option value="staff">Staff (เจ้าหน้าที่)</option>' +
                '  <option value="admin">Admin (ผู้ดูแลระบบ)</option>' +
                '</select>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            confirmButtonColor: '#059669',
            preConfirm: () => {
                const username = (document.getElementById('swal-input-username') as HTMLInputElement).value;
                const password = (document.getElementById('swal-input-password') as HTMLInputElement).value;
                const name = (document.getElementById('swal-input-name') as HTMLInputElement).value;
                const role = (document.getElementById('swal-input-role') as HTMLSelectElement).value as UserRole;
                if (!username || !password || !name) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return false;
                }
                return { username, password, name, role };
            }
        });
        if (formValues) {
            Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
            try {
                const res = await dataService.addUser(formValues);
                if (res.success) {
                    setRefreshTrigger(prev => prev + 1);
                    Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว', 'success');
                } else throw new Error(res.message);
            } catch (error: any) {
                Swal.fire('ล้มเหลว', error.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้', 'error');
            }
        }
    };

    const handleEditUser = async (user: User) => {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขผู้ใช้งาน',
            html:
                `<input id="swal-input-username" class="swal2-input" value="${user.username}" disabled style="background-color: #f3f4f6;">` +
                `<input id="swal-input-password" type="text" class="swal2-input" value="${user.password}" placeholder="Password">` +
                `<input id="swal-input-name" class="swal2-input" value="${user.name}" placeholder="ชื่อ-นามสกุล">` +
                `<select id="swal-input-role" class="swal2-input">` +
                `  <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>` +
                `  <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>` +
                `  <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>` +
                `</select>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            confirmButtonColor: '#059669',
            preConfirm: () => {
                const password = (document.getElementById('swal-input-password') as HTMLInputElement).value;
                const name = (document.getElementById('swal-input-name') as HTMLInputElement).value;
                const role = (document.getElementById('swal-input-role') as HTMLSelectElement).value as UserRole;
                if (!password || !name) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return false;
                }
                return { username: user.username, password, name, role };
            }
        });
        if (formValues) {
             Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
            try {
                const res = await dataService.updateUser(user.username, formValues);
                if (res.success) {
                    setRefreshTrigger(prev => prev + 1);
                    Swal.fire('สำเร็จ', 'แก้ไขผู้ใช้งานเรียบร้อยแล้ว', 'success');
                } else throw new Error(res.message);
            } catch (error: any) {
                Swal.fire('ล้มเหลว', error.message || 'ไม่สามารถแก้ไขผู้ใช้งานได้', 'error');
            }
        }
    };

    const handleDeleteUser = async (username: string) => {
        const result = await Swal.fire({ title: 'ยืนยันการลบ?', text: `ลบผู้ใช้ "${username}" ใช่หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบผู้ใช้', confirmButtonColor: '#ef4444' });
        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
            try {
                const res = await dataService.deleteUser(username);
                if (res.success) {
                    setRefreshTrigger(prev => prev + 1);
                    Swal.fire('สำเร็จ', 'ลบผู้ใช้งานเรียบร้อยแล้ว', 'success');
                } else throw new Error(res.message);
            } catch (error: any) {
                Swal.fire('ล้มเหลว', error.message || 'ไม่สามารถลบผู้ใช้งานได้', 'error');
            }
        }
    };

    const rolesList = [
        { id: 'admin', label: 'Admin (ผู้ดูแลระบบ)' },
        { id: 'staff', label: 'Staff (เจ้าหน้าที่)' },
        { id: 'viewer', label: 'Viewer (ผู้เยี่ยมชม)' }
    ];

    // Get current effective permissions for the selected entity
    const currentEntityPermissions = useMemo(() => {
        const directPerms = settings.permissions[selectedEntityId];
        if (directPerms) return directPerms;
        
        // If it's a user and no individual perms, fallback to role default if they exist in state
        const user = users.find(u => u.username === selectedEntityId);
        if (user) {
            return settings.permissions[user.role] || [];
        }
        
        return [];
    }, [selectedEntityId, settings.permissions, users]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">ตั้งค่าระบบ</h2>
                    <p className="text-slate-500 dark:text-slate-400">จัดการการเชื่อมต่อและสิทธิ์การเข้าถึง (ข้อมูลจะถูกบันทึกลงฐานข้อมูลส่วนกลาง)</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'}`}><Settings size={16} /> ทั่วไป</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'}`}><Users size={16} /> ผู้ใช้งาน</button>
                    <button onClick={() => setActiveTab('permissions')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'permissions' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'}`}><Shield size={16} /> สิทธิ์การใช้งาน</button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 transition-colors">
                <form onSubmit={handleSave} className="space-y-8">
                    {activeTab === 'general' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="pb-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Link size={20} className="text-blue-500" /> การเชื่อมต่อ API</h3>
                                <button type="button" onClick={handleTestConnection} disabled={isTesting} className="text-sm px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 font-medium disabled:opacity-50">{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</button>
                            </div>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Google Apps Script URL</label>
                                    <input type="url" value={settings.gasUrl} onChange={(e) => handleChange('gasUrl', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono text-sm" />
                                </div>
                                <div>
                                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Google Sheets ID</label>
                                    <input type="text" value={settings.sheetsId} onChange={(e) => handleChange('sheetsId', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono text-sm" />
                                </div>
                            </div>

                            {/* Detailed connection status section */}
                            <div className="space-y-4 mt-8 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                    <div>
                                        <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <FileSpreadsheet size={18} className="text-emerald-500" />
                                            รายละเอียดสถานะการเชื่อมต่อชีทแต่ละรายการ
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบการซิงค์ข้อมูล GID, ยอดจำนวนรายการ และเข้าถึงหน้าแผ่นงานของ Google Sheets</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            Swal.fire({
                                                title: 'กำลังซิงค์ข้อมูล...',
                                                text: 'ระบบกำลังดึงข้อมูลแผ่นงานใหม่ล่าสุดจาก Google Sheets',
                                                allowOutsideClick: false,
                                                didOpen: () => { Swal.showLoading(); }
                                            });
                                            const success = await dataService.syncDropdowns();
                                            if (success) {
                                                Swal.fire({
                                                    title: 'อัปเดตข้อมูลสำเร็จ',
                                                    text: 'ซิงค์ข้อมูลรายชีทใหม่ทั้งหมดเรียบร้อยแล้ว',
                                                    icon: 'success',
                                                    timer: 1500,
                                                    confirmButtonColor: '#059669'
                                                });
                                            } else {
                                                Swal.fire({
                                                    title: 'อัปเดตล้มเหลว',
                                                    text: 'ไม่สามารถดึงข้อมูลแบบ Fast-Load ได้ กรุณาตรวจสอบ GID',
                                                    icon: 'error',
                                                    confirmButtonColor: '#ef4444'
                                                });
                                            }
                                        }}
                                        className="text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg transition-all flex items-center gap-1.5 self-start sm:self-center"
                                    >
                                        <RefreshCw size={14} className="animate-spin duration-300 mr-1" /> ซิงค์ข้อมูลทั้งหมดตอนนี้
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sheetsInfo.map((sheet, index) => {
                                        const sheetUrl = settings.sheetsId ? `https://docs.google.com/spreadsheets/d/${settings.sheetsId}/edit#gid=${sheet.gid || '0'}` : '';
                                        const isGidConfigured = sheet.gid !== undefined && sheet.gid !== '';
                                        
                                        return (
                                            <div 
                                                key={index} 
                                                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 transition-all flex flex-col justify-between gap-4"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2.5 rounded-lg ${sheet.iconColor} shrink-0`}>
                                                        <sheet.icon size={20} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">{sheet.name}</h5>
                                                            {isGidConfigured ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                                                                    <CheckCircle2 size={10} /> Fast-Load
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                                                    <AlertCircle size={10} /> ช้าผ่าน GAS
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 mt-1">{sheet.role}</p>
                                                        
                                                        <div className="mt-2.5 space-y-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg text-xs font-mono">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Sheet Name:</span>
                                                                <span className="text-slate-700 dark:text-slate-300 font-medium truncate ml-2 max-w-[150px]">{sheet.sheetName}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">GID:</span>
                                                                <span className="text-slate-700 dark:text-slate-300 font-medium">{isGidConfigured ? sheet.gid : 'ไม่ได้ระบุ GID'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700/50 pt-3">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        <span className="text-slate-500 dark:text-slate-400">
                                                            ดึงแล้ว <strong className="text-slate-800 dark:text-white">{sheet.count}</strong> รายการ
                                                        </span>
                                                    </div>

                                                    {sheetUrl ? (
                                                        <a 
                                                            href={sheetUrl} 
                                                            target="_blank" 
                                                            referrerPolicy="no-referrer" 
                                                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold transition-colors"
                                                        >
                                                            เปิดชีท <ExternalLink size={12} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">ต้องการ Sheets ID</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4 mt-8">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2"><FileSpreadsheet size={20} className="text-blue-500" /> CSV Data Sync (Fast Load)</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">ระบุ GID ของแต่ละชีทเพื่อดึงข้อมูลผ่าน CSV (ช่วยให้โหลดข้อมูลได้เร็วขึ้นมาก)</p>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Database (ข้อมูลหลัก)</label>
                                        <input type="text" value={settings.databaseGid || ''} onChange={(e) => handleChange('databaseGid', e.target.value)} placeholder="0" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Hierarchy (โครงสร้าง)</label>
                                        <input type="text" value={settings.hierarchyGid || ''} onChange={(e) => handleChange('hierarchyGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: ResponsibleAgency (หน่วยงาน)</label>
                                        <input type="text" value={settings.responsibleAgencyGid || ''} onChange={(e) => handleChange('responsibleAgencyGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Compare (กิจกรรม)</label>
                                        <input type="text" value={settings.compareGid || ''} onChange={(e) => handleChange('compareGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Integration (บูรณาการ)</label>
                                        <input type="text" value={settings.integrationGid || ''} onChange={(e) => handleChange('integrationGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Unit (หน่วยนับ)</label>
                                        <input type="text" value={settings.unitGid || ''} onChange={(e) => handleChange('unitGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Permissions (สิทธิ์)</label>
                                        <input type="text" value={settings.permissionsGid || ''} onChange={(e) => handleChange('permissionsGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Region (ภูมิภาค)</label>
                                        <input type="text" value={settings.regionGid || ''} onChange={(e) => handleChange('regionGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">GID: Report Structure (โครงสร้างรายงาน)</label>
                                        <input type="text" value={settings.reportStructureGid || ''} onChange={(e) => handleChange('reportStructureGid', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mt-8">
                                 <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2"><Database size={20} className="text-emerald-500" /> โครงสร้างข้อมูล</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                     <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทข้อมูล (Database)</label>
                                        <input type="text" value={settings.databaseSheetName} onChange={(e) => handleChange('databaseSheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                     <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทตั้งค่า (Data)</label>
                                        <input type="text" value={settings.dataSheetName} onChange={(e) => handleChange('dataSheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทโครงสร้างหน่วยงาน (Hierarchy)</label>
                                        <input type="text" value={settings.hierarchySheetName || 'Hierarchy'} onChange={(e) => handleChange('hierarchySheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทหน่วยปฏิบัติ (ResponsibleAgency)</label>
                                        <input type="text" value={settings.responsibleAgencySheetName || 'ResponsibleAgency'} onChange={(e) => handleChange('responsibleAgencySheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทรายการบูรณาการ (Integration)</label>
                                        <input type="text" value={settings.integrationSheetName || 'Integration'} onChange={(e) => handleChange('integrationSheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทรายการกิจกรรม (Compare)</label>
                                        <input type="text" value={settings.compareSheetName || 'Compare'} onChange={(e) => handleChange('compareSheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ชื่อชีทหน่วยนับ (Unit)</label>
                                        <input type="text" value={settings.unitSheetName || 'Unit'} onChange={(e) => handleChange('unitSheetName', e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                             <div className="pb-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Users size={20} className="text-blue-500" /> จัดการผู้ใช้งาน</h3>
                                <button type="button" onClick={handleAddUser} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium"><UserPlus size={16} /> เพิ่มผู้ใช้</button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">ชื่อผู้ใช้</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">ชื่อ-นามสกุล</th>
                                            <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">สิทธิ์</th>
                                            <th className="px-6 py-4 text-sm font-bold text-right text-slate-700 dark:text-slate-300">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                        {users.map((user) => (
                                            <tr key={user.username} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-medium">{user.username}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{user.name}</td>
                                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : user.role === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-slate-100 text-slate-700 dark:bg-slate-700'}`}>{user.role}</span></td>
                                                <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => handleEditUser(user)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><Edit size={16} /></button><button type="button" onClick={() => handleDeleteUser(user.username)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button></div></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'permissions' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="pb-2 border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2"><UserCog size={20} className="text-purple-500" /> จัดการสิทธิ์รายบุคคล</h3>
                                <p className="text-sm text-slate-500 mt-1">เลือกผู้ใช้งานหรือระดับสิทธิ์เพื่อกำหนดเมนูที่เข้าถึงได้</p>
                            </div>

                            <div className="space-y-4">
                                <div className="max-w-md">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">เลือกเป้าหมายที่ต้องการตั้งค่าสิทธิ์</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedEntityId}
                                            onChange={(e) => setSelectedEntityId(e.target.value)}
                                            className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 pr-10 outline-none text-slate-700 dark:text-slate-100 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/20"
                                        >
                                            <optgroup label="ระดับสิทธิ์ (Role Default)">
                                                {rolesList.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                            </optgroup>
                                            <optgroup label="ผู้ใช้งานรายบุคคล (Individual Override)">
                                                {users.map(u => <option key={u.username} value={u.username}>{u.name} (@{u.username})</option>)}
                                            </optgroup>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        {selectedEntityId === 'admin' || selectedEntityId === 'staff' || selectedEntityId === 'viewer' ? 'สิทธิ์พื้นฐานสำหรับระดับ' : 'กำหนดสิทธิ์เฉพาะสำหรับผู้ใช้'} : 
                                        <span className="text-purple-600 dark:text-purple-400 ml-1">
                                            {rolesList.find(r => r.id === selectedEntityId)?.label || users.find(u => u.username === selectedEntityId)?.name || selectedEntityId}
                                        </span>
                                    </h4>
                                    
                                    <div className="grid gap-2">
                                        {APP_ROUTES.map((route) => (
                                            <div key={route.path} className="space-y-2">
                                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${currentEntityPermissions.includes(route.path) ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}>
                                                            {currentEntityPermissions.includes(route.path) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{route.label}</div>
                                                            <div className="text-xs text-slate-400">{route.path}</div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => togglePermission(selectedEntityId, route.path)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentEntityPermissions.includes(route.path) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}
                                                    >
                                                        {currentEntityPermissions.includes(route.path) ? 'อนุญาต' : 'ไม่อนุญาต'}
                                                    </button>
                                                </div>
                                                
                                                {/* Sub-menus for Manage */}
                                                {route.path === '/manage' && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 pt-1 pb-4">
                                                        {MANAGE_SUB_MENUS.map((sub) => (
                                                            <div key={sub.path} className="flex items-center justify-between p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                                <div className="flex items-center gap-2">
                                                                    <CornerDownRight size={14} className="text-slate-300" />
                                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{sub.label}</span>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    disabled={!currentEntityPermissions.includes('/manage')}
                                                                    onClick={() => togglePermission(selectedEntityId, sub.path)}
                                                                    className={`p-1.5 rounded-lg transition-all ${!currentEntityPermissions.includes('/manage') ? 'opacity-20 cursor-not-allowed' : currentEntityPermissions.includes(sub.path) ? 'text-emerald-600' : 'text-slate-300'}`}
                                                                >
                                                                    {currentEntityPermissions.includes(sub.path) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 pb-4 z-10 flex flex-col md:flex-row gap-4 items-center justify-between">
                         <div className="text-sm text-slate-400 flex items-center gap-2"><Shield size={16} /> การตั้งค่าจะถูกบันทึกลงระบบส่วนกลาง</div>
                        <button type="submit" className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"><Save size={20} /> บันทึกการตั้งค่า</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsView;
