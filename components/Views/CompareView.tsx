import React, { useState, useEffect, useMemo } from 'react';
import { dataService, useDataSync } from '../../services/dataService';
import { formatNumber } from '../../utils';
import { TrendingUp, Target, Scale, Edit2, RefreshCw, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import Swal from 'sweetalert2';
import { CompareRecord } from '../../types';

const CompareView: React.FC = () => {
    useDataSync(); // Force re-render when data changes
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    
    // Get Data
    const records = dataService.getRecords();
    const compareTargets = dataService.getCompareData();

    // Aggregate actual budget by activity
    const actualsByActivity = useMemo(() => {
        return records.reduce((acc, r) => {
            const total = (r.salaryPermanent || 0) + (r.governmentCompensation || 0) + 
                          (r.compensationSupplies || 0) + (r.contractEmployees || 0) + (r.utilities || 0) +
                          (r.equipment || 0) + (r.landConstruction || 0) +
                          (r.subsidies || 0) + (r.otherExpenses || 0);
            const activityName = (r.activity || '').trim();
            acc[activityName] = (acc[activityName] || 0) + total;
            return acc;
        }, {} as Record<string, number>);
    }, [records, refreshTrigger]);

    const comparisonResults = useMemo(() => {
        return compareTargets.map(target => {
            const activityName = (target.activity || '').trim();
            const actual = actualsByActivity[activityName] || 0;
            const refBudget = Number(target.referenceBudget || 0);
            const variance = actual - refBudget;
            
            let status = 'match';
            if (actual === 0 && refBudget > 0) status = 'nodata';
            else if (actual === 0 && refBudget === 0) status = 'nodata';
            else if (variance > 0) status = 'over';
            else if (variance < 0) status = 'under';

            return { ...target, actual, variance, status };
        });
    }, [compareTargets, actualsByActivity, refreshTrigger]);

    const totalRef = useMemo(() => comparisonResults.reduce((sum, r) => sum + (r.referenceBudget || 0), 0), [comparisonResults]);
    const totalAct = useMemo(() => comparisonResults.reduce((sum, r) => sum + (r.actual || 0), 0), [comparisonResults]);
    const totalVar = totalAct - totalRef;

    const handleSync = async () => {
        setIsLoading(true);
        try {
            const success = await dataService.syncDropdowns();
            if (success) {
                setRefreshTrigger(prev => prev + 1);
                Swal.fire({
                    icon: 'success',
                    title: 'ซิงค์ข้อมูลสำเร็จ',
                    text: 'อัปเดตข้อมูลล่าสุดเรียบร้อยแล้ว',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                 Swal.fire({
                    icon: 'warning',
                    title: 'ซิงค์ไม่สำเร็จ',
                    text: 'ไม่สามารถติดต่อ Google Sheets ได้ (กำลังใช้งานข้อมูลออฟไลน์)',
                    confirmButtonColor: '#f59e0b'
                });
            }
        } catch (error: any) {
             // Kept for safety
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถดึงข้อมูลได้',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditRecord = async (record: CompareRecord) => {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขข้อมูล',
            html:
                '<div style="text-align: left; margin-bottom: 5px; font-weight: 500; color: #475569;">ชื่อกิจกรรม</div>' +
                `<input id="swal-input-activity" class="swal2-input" value="${record.activity}" placeholder="ชื่อกิจกรรม" style="margin: 0 0 1.25rem 0; width: 100%; box-sizing: border-box;">` +
                '<div style="text-align: left; margin-bottom: 5px; font-weight: 500; color: #475569;">งบอ้างอิง (บาท)</div>' +
                `<input id="swal-input-budget" type="text" class="swal2-input" value="${formatNumber(record.referenceBudget)}" placeholder="ระบุงบประมาณ" style="margin: 0; width: 100%; box-sizing: border-box;">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#94a3b8',
            didOpen: () => {
                const input = document.getElementById('swal-input-budget') as HTMLInputElement;
                input.addEventListener('input', (e) => {
                    const value = input.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
                    if (value) {
                         const parts = value.split('.');
                         parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                         input.value = parts.join('.');
                    } else {
                        input.value = '';
                    }
                });
            },
            preConfirm: () => {
                const activity = (document.getElementById('swal-input-activity') as HTMLInputElement).value;
                const budgetStr = (document.getElementById('swal-input-budget') as HTMLInputElement).value;
                
                if (!activity) {
                    Swal.showValidationMessage('กรุณาระบุชื่อกิจกรรม');
                    return false;
                }
                const budget = parseFloat(budgetStr.replace(/,/g, '')) || 0;
                return { activity, budget };
            }
        });

        if (formValues) {
            if (formValues.activity === record.activity && formValues.budget === record.referenceBudget) return;

             Swal.fire({
                title: 'กำลังบันทึก...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const result = await dataService.updateCompareData(record.id, formValues.activity, formValues.budget);
                
                if (result.success) {
                    setRefreshTrigger(prev => prev + 1);
                    Swal.fire({
                        title: 'สำเร็จ',
                        text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(result.message || 'บันทึกไม่สำเร็จ');
                }
            } catch (error: any) {
                Swal.fire({
                    title: 'บันทึกล้มเหลว',
                    text: error.message || 'ไม่สามารถติดต่อ Google Sheets ได้',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    return (
        <div className="max-w-[98vw] mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">เปรียบเทียบงบประมาณ</h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 transition-colors">วิเคราะห์ความแตกต่างระหว่างงบประมาณที่ตั้งไว้และงบที่ใช้จริงตามกิจกรรม</p>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all font-medium text-base shadow-sm disabled:opacity-70 disabled:cursor-not-allowed active:scale-95`}
                >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> 
                    {isLoading ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}
                </button>
            </div>

            {/* Summary Cards */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors hover:shadow-md">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">งบอ้างอิงรวม</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(totalRef)} <span className="text-base font-normal opacity-70">บาท</span></p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner">
                        <Target size={24} />
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors hover:shadow-md">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">งบที่บันทึกรวม</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(totalAct)} <span className="text-base font-normal opacity-70">บาท</span></p>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner">
                        <TrendingUp size={24} />
                    </div>
                </div>
                 <div className={`p-6 rounded-2xl shadow-sm border flex items-center justify-between transition-colors hover:shadow-md ${
                     totalVar > 0 
                     ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50' 
                     : totalVar < 0 
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50'
                 }`}>
                    <div>
                        <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${
                            totalVar > 0 ? 'text-amber-700 dark:text-amber-400' 
                            : totalVar < 0 ? 'text-rose-700 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}>ส่วนต่างรวม</p>
                        <p className={`text-3xl font-bold ${
                            totalVar > 0 ? 'text-amber-700 dark:text-amber-400' 
                            : totalVar < 0 ? 'text-rose-700 dark:text-rose-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}>
                            {totalVar > 0 ? '+' : ''}{formatNumber(totalVar)} <span className="text-base font-normal opacity-70">บาท</span>
                        </p>
                    </div>
                    <div className={`p-4 rounded-2xl shadow-inner ${
                        totalVar > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' 
                        : totalVar < 0 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'
                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    }`}>
                        <Scale size={24} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">กิจกรรม</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight w-40">
                                    งบอ้างอิง
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight w-40">งบที่บันทึก</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight w-40">ส่วนต่าง</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight w-32">สถานะ</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight w-20">แก้ไข</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {comparisonResults.length > 0 ? comparisonResults.map(res => {
                                return (
                                    <tr key={res.id || res.activity} className={`transition-all group ${
                                        res.status === 'over' 
                                            ? 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20' 
                                            : res.status === 'under' 
                                                ? 'bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-100/50 dark:hover:bg-rose-900/20'
                                                : res.status === 'match'
                                                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20'
                                                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/30'
                                    }`}>
                                        <td className="px-6 py-4 text-base font-medium text-slate-800 dark:text-slate-100">{res.activity || '-'}</td>
                                        
                                        <td className="px-6 py-4 text-base text-right text-slate-600 dark:text-slate-400">
                                            {formatNumber(res.referenceBudget)}
                                        </td>

                                        <td className="px-6 py-4 text-base text-slate-900 dark:text-slate-100 text-right font-bold">{formatNumber(res.actual)}</td>
                                        <td className={`px-6 py-4 text-base text-right font-bold ${
                                            res.variance > 0 ? 'text-amber-700 dark:text-amber-400' 
                                            : res.variance < 0 ? 'text-rose-700 dark:text-rose-400' 
                                            : 'text-slate-400'
                                        }`}>
                                            {res.variance > 0 ? '+' : ''}{formatNumber(res.variance)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                {res.status === 'nodata' && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-600">
                                                        <AlertCircle size={14} /> ไม่มีข้อมูล
                                                    </span>
                                                )}
                                                {res.status === 'over' && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-300 dark:border-amber-700">
                                                        <TrendingUp size={14} /> เกินงบ
                                                    </span>
                                                )}
                                                {res.status === 'under' && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 rounded-full text-xs font-bold border border-rose-300 dark:border-rose-700">
                                                        <TrendingDown size={14} /> ต่ำกว่างบ
                                                    </span>
                                                )}
                                                {res.status === 'match' && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-300 dark:border-emerald-700">
                                                        <CheckCircle2 size={14} /> ตรงตามงบ
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleEditRecord(res)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-all shadow-sm bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 active:scale-90 cursor-pointer"
                                                title="แก้ไขกิจกรรมและงบประมาณ"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                            <Target size={64} className="mb-4 opacity-10" />
                                            <p className="text-xl font-medium">ไม่พบข้อมูลกิจกรรมเพื่อเปรียบเทียบ</p>
                                            <p className="text-base mt-1">กรุณากด "ซิงค์ข้อมูล" หรือเพิ่มกิจกรรมในหน้าจัดการข้อมูล</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-500 text-white rounded-lg shadow-md shrink-0">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">คำแนะนำการใช้งาน</h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc ml-4">
                            <li><strong>การแก้ไขข้อมูล:</strong> คลิกที่ปุ่มปากกาในคอลัมน์ "แก้ไข" เพื่อเปลี่ยนชื่อกิจกรรมและกำหนดงบอ้างอิงในหน้าต่างเดียวกัน</li>
                            <li><strong>สถานะ:</strong> ระบบจะคำนวณส่วนต่างและแสดงสถานะ (เกินงบ/ต่ำกว่างบ/ตรงตามงบ) โดยอัตโนมัติ</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompareView;