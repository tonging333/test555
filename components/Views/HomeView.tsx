
import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import { dataService, useDataSync } from '../../services/dataService';
import AutocompleteInput from '../Form/AutocompleteInput';
import { formatNumber, parseNumber, getCurrentTimestamp } from '../../utils';
import { BudgetRecord } from '../../types';
import { Save, RefreshCw, Briefcase, MapPin, Calculator, Wallet, Building2, FileText, CheckCircle2, Lock, Unlock } from 'lucide-react';

const DEFAULT_FORM_DATA: Partial<BudgetRecord> = {
    integration: 'ไม่เป็นหน่วยงานบูรณาการ',
    mainAgency: '',
    province: '',
    responsibleAgency: '',
    integrationArea: '',
    activity: '',
    target: '',
    unit: '',
    salaryPermanent: 0,
    governmentCompensation: 0,
    compensationSupplies: 0,
    contractEmployees: 0,
    utilities: 0,
    equipment: 0,
    landConstruction: 0,
    subsidies: 0,
    otherExpenses: 0,
};

const HomeView: React.FC = () => {
    useDataSync(); // Force re-render when data changes
    const location = useLocation();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<BudgetRecord>>(DEFAULT_FORM_DATA);
    const [initialFormData, setInitialFormData] = useState<Partial<BudgetRecord>>(DEFAULT_FORM_DATA);

    const [locks, setLocks] = useState<Record<string, boolean>>({});
    const [integrationType, setIntegrationType] = useState<'none' | 'park' | 'wildlife'>('none');

    // Data Sources
    const dropdowns = dataService.getDropdowns();
    const hierarchy = dataService.getHierarchy();
    const respData = dataService.getResponsibleData();
    const fieldVisibility = dataService.getFieldVisibility();

    // Visibility Logic
    const showAgencySection = useMemo(() => 
        fieldVisibility.mainAgency || fieldVisibility.province || fieldVisibility.responsibleAgency || fieldVisibility.integrationArea
    , [fieldVisibility]);

    const showActivitySection = useMemo(() => 
        fieldVisibility.activity || fieldVisibility.target || fieldVisibility.unit
    , [fieldVisibility]);

    const showBudgetPersonnel = useMemo(() => fieldVisibility.salaryPermanent || fieldVisibility.governmentCompensation, [fieldVisibility]);
    const showBudgetOperational = useMemo(() => fieldVisibility.compensationSupplies || fieldVisibility.contractEmployees || fieldVisibility.utilities, [fieldVisibility]);
    const showBudgetInvestment = useMemo(() => fieldVisibility.equipment || fieldVisibility.landConstruction, [fieldVisibility]);
    const showBudgetOther = useMemo(() => fieldVisibility.subsidies || fieldVisibility.otherExpenses, [fieldVisibility]);
    const showBudgetSection = useMemo(() => showBudgetPersonnel || showBudgetOperational || showBudgetInvestment || showBudgetOther, [showBudgetPersonnel, showBudgetOperational, showBudgetInvestment, showBudgetOther]);

    useEffect(() => {
        if (location.state?.editRecord) {
            const record = location.state.editRecord;
            setFormData(record);
            setInitialFormData(record);
            if (record.integration?.includes('ด้านอุทยานแห่งชาติ')) setIntegrationType('park');
            else if (record.integration?.includes('ด้านสัตว์ป่า')) setIntegrationType('wildlife');
            else setIntegrationType('none');
        } else {
            // Reset to default if not editing (and not just returning from a blocked navigation)
            // But we need to be careful not to overwrite if we want to preserve state? 
            // The user requirement is "When going to another page, data should not disappear".
            // This implies *prevention* of leaving, not auto-saving to local storage.
            // So standard initialization is fine.
            setInitialFormData(DEFAULT_FORM_DATA);
        }
    }, [location]);

    // Check if form is dirty
    const isDirty = useMemo(() => {
        return JSON.stringify(formData) !== JSON.stringify(initialFormData);
    }, [formData, initialFormData]);

    // Block navigation if dirty
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            Swal.fire({
                title: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
                text: 'คุณต้องการออกจากหน้านี้โดยไม่บันทึกหรือไม่?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ใช่, ออกจากหน้านี้',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#94a3b8',
            }).then((result) => {
                if (result.isConfirmed) {
                    blocker.proceed();
                } else {
                    blocker.reset();
                }
            });
        }
    }, [blocker]);

    // Block browser refresh/close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const provinceOptions = useMemo(() => {
        if (!formData.mainAgency) return dropdowns.province;
        return hierarchy.filter(h => h.mainAgency === formData.mainAgency).map(h => h.province);
    }, [formData.mainAgency, dropdowns.province, hierarchy]);

    const responsibleAgencyOptions = useMemo(() => {
        if (!formData.mainAgency) return dropdowns.responsibleAgency;
        return respData.filter(r => r.mainAgency === formData.mainAgency).map(r => r.responsibleAgency).filter((v, i, a) => a.indexOf(v) === i);
    }, [formData.mainAgency, dropdowns.responsibleAgency, respData]);

    const integrationAreaOptions = useMemo(() => {
        if (!formData.responsibleAgency) return dropdowns.integrationArea;
        return respData.filter(r => r.responsibleAgency === formData.responsibleAgency).map(r => r.integrationArea).filter((v, i, a) => a.indexOf(v) === i);
    }, [formData.responsibleAgency, dropdowns.integrationArea, respData]);

    const handleChange = (key: keyof BudgetRecord, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (key === 'mainAgency') setFormData(prev => ({ ...prev, province: '', responsibleAgency: '', integrationArea: '' }));
        if (key === 'responsibleAgency') setFormData(prev => ({ ...prev, integrationArea: '' }));
        if (key === 'integration') {
           if (value?.includes('ด้านอุทยานแห่งชาติ')) setIntegrationType('park');
           else if (value?.includes('ด้านสัตว์ป่า')) setIntegrationType('wildlife');
           else setIntegrationType('none');
        }
    };

    const handleBudgetChange = (key: keyof BudgetRecord, value: string) => {
        const num = parseNumber(value);
        handleChange(key, num);
    };

    const toggleLock = (key: string) => setLocks(prev => ({ ...prev, [key]: !prev[key] }));

    const totalBudget = useMemo(() => {
        return (formData.salaryPermanent || 0) + (formData.governmentCompensation || 0) + (formData.compensationSupplies || 0) +
            (formData.contractEmployees || 0) + (formData.utilities || 0) + (formData.equipment || 0) +
            (formData.landConstruction || 0) + (formData.subsidies || 0) + (formData.otherExpenses || 0);
    }, [formData]);

    const clearForm = () => {
        const newForm = { ...formData };
        if ('id' in newForm) delete (newForm as any).id;
        Object.keys(newForm).forEach(key => {
            const k = key as keyof BudgetRecord;
            if (!locks[k]) {
                if (typeof newForm[k] === 'number') (newForm as any)[k] = 0;
                else if (k === 'integration') (newForm as any)[k] = 'ไม่เป็นหน่วยงานบูรณาการ';
                else (newForm as any)[k] = '';
            }
        });
        setFormData(newForm);
        // After clearing, we update initialFormData to the new cleared state (with locks applied)
        // so that isDirty becomes false.
        setInitialFormData(newForm);
        
        if (!locks['integration']) setIntegrationType('none');
        navigate('/', { replace: true, state: {} });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((fieldVisibility.mainAgency && !formData.mainAgency) || (fieldVisibility.province && !formData.province) || (fieldVisibility.activity && !formData.activity)) {
            Swal.fire({ title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกข้อมูลที่จำเป็น (*)', icon: 'warning', confirmButtonColor: '#fbbf24' });
            return;
        }

        const sanitizedData = { ...formData };
        Object.keys(fieldVisibility).forEach((key) => {
            if (!fieldVisibility[key]) {
                 const k = key as keyof BudgetRecord;
                 if (typeof sanitizedData[k] === 'number') (sanitizedData as any)[k] = 0;
                 else (sanitizedData as any)[k] = '';
            }
        });

        if (dataService.checkDuplicate(sanitizedData)) {
            Swal.fire({ title: 'ข้อมูลซ้ำ!', text: 'พบข้อมูลหน่วยงาน, จังหวัด และกิจกรรมนี้ในฐานข้อมูลแล้ว', icon: 'warning', confirmButtonColor: '#fbbf24' });
            return;
        }

        const isEditMode = !!formData.id;
        const confirmResult = await Swal.fire({
            title: isEditMode ? 'ยืนยันการแก้ไข?' : 'ยืนยันการบันทึก?',
            html: `<div class="text-slate-600">ยอดรวมงบประมาณ</div><div class="text-3xl font-bold text-emerald-600 mt-2">${formatNumber(totalBudget)} บาท</div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล',
            cancelButtonText: 'ตรวจสอบอีกครั้ง',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#94a3b8',
        });

        if (confirmResult.isConfirmed) {
            setIsSubmitting(true);
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                text: 'กรุณารอสักครู่ ระบบกำลังส่งข้อมูลไปที่ Google Sheets',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                let result: { success: boolean; message?: string };
                if (isEditMode) {
                    const updatedRecord: BudgetRecord = { ...sanitizedData as BudgetRecord, timestamp: getCurrentTimestamp() };
                    result = await dataService.updateRecord(updatedRecord);
                } else {
                    const newRecord: BudgetRecord = { ...sanitizedData as BudgetRecord, id: Date.now().toString(), timestamp: getCurrentTimestamp() };
                    result = await dataService.addRecord(newRecord);
                }

                if (result.success) {
                    Swal.fire({ title: 'สำเร็จ!', text: 'บันทึกข้อมูลลง Google Sheets เรียบร้อยแล้ว', icon: 'success', confirmButtonColor: '#059669', timer: 2000 });
                    
                    // Manually clear form and reset initialFormData to avoid blocker
                    const newForm = { ...formData };
                    if ('id' in newForm) delete (newForm as any).id;
                    Object.keys(newForm).forEach(key => {
                        const k = key as keyof BudgetRecord;
                        if (!locks[k]) {
                            if (typeof newForm[k] === 'number') (newForm as any)[k] = 0;
                            else if (k === 'integration') (newForm as any)[k] = 'ไม่เป็นหน่วยงานบูรณาการ';
                            else (newForm as any)[k] = '';
                        }
                    });
                    setFormData(newForm);
                    setInitialFormData(newForm); // Reset baseline
                    if (!locks['integration']) setIntegrationType('none');
                    navigate('/', { replace: true, state: {} });

                } else {
                    // จัดการกรณี Error พิเศษที่เกี่ยวกับ ID
                    if (result.message?.includes('ID column not found')) {
                        Swal.fire({
                            title: 'ชื่อคอลัมน์ไม่ถูกต้อง',
                            html: '<div class="text-left text-sm">ไม่พบคอลัมน์ชื่อ <b>ID</b> ในแถวแรกของไฟล์ Google Sheets<br><br><b>วิธีแก้ไข:</b><br>1. เปิดไฟล์ Google Sheets ของคุณ<br>2. เปลี่ยนชื่อคอลัมน์แรกให้เป็นคำว่า <b>ID</b> (ตัวใหญ่ทั้งหมด)<br>3. ลองบันทึกข้อมูลใหม่อีกครั้ง</div>',
                            icon: 'error',
                            confirmButtonColor: '#ef4444'
                        });
                    } else {
                        throw new Error(result.message || 'บันทึกไม่สำเร็จ');
                    }
                }
            } catch (error: any) {
                Swal.fire({
                    title: 'บันทึกล้มเหลว',
                    text: error.message || 'ไม่สามารถติดต่อ Google Sheets ได้ กรุณาตรวจสอบการตั้งค่า',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Styling Helpers
    const getCardStyle = (type: 'none' | 'park' | 'wildlife') => {
        if (type === 'park') return 'bg-emerald-50/20 dark:bg-emerald-900/10 border-emerald-400 ring-2 ring-emerald-400/80 shadow-emerald-100 dark:shadow-emerald-900/10';
        if (type === 'wildlife') return 'bg-pink-50/20 dark:bg-pink-900/10 border-pink-400 ring-2 ring-pink-400/80 shadow-pink-100 dark:shadow-pink-900/10';
        return 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700';
    };

    const getFooterContainerStyle = () => {
        if (integrationType === 'park') return 'bg-emerald-600/95 dark:bg-emerald-800/95 border-emerald-500/50 shadow-emerald-900/20';
        if (integrationType === 'wildlife') return 'bg-pink-600/95 dark:bg-pink-800/95 border-pink-500/50 shadow-pink-900/20';
        return 'bg-slate-900/90 dark:bg-slate-950/90 border-slate-700/50 shadow-slate-900/20';
    };

    const getSubmitButtonStyle = () => {
        if (integrationType === 'park') return 'bg-white text-emerald-600 hover:bg-emerald-50 shadow-emerald-900/20';
        if (integrationType === 'wildlife') return 'bg-white text-pink-600 hover:bg-pink-50 shadow-pink-900/20';
        return 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/20 hover:shadow-emerald-900/40';
    };

    return (
        <div className="max-w-[95vw] mx-auto px-4 py-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-3">{formData.id ? 'แก้ไขข้อมูลงบประมาณ' : 'แบบฟอร์มบันทึกงบประมาณ'}</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400">{formData.id ? 'แก้ไขรายละเอียดโครงการและงบประมาณ' : 'กรอกรายละเอียดโครงการและงบประมาณประจำปี'}</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {fieldVisibility.integration && (
                    <div className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${integrationType !== 'none' ? 'ring-2 border-opacity-100' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'} ${integrationType === 'park' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 ring-emerald-400 border-emerald-400' : integrationType === 'wildlife' ? 'bg-pink-50/50 dark:bg-pink-900/10 ring-pink-400 border-pink-400' : ''}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${integrationType === 'wildlife' ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}><Briefcase size={28} /></div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white">สถานะบูรณาการ</h2>
                                    <p className="text-base text-slate-500 dark:text-slate-400">ระบุประเภทหน่วยงานและการบูรณาการ</p>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 lg:w-1/3">
                                <AutocompleteInput 
                                    id="integration" 
                                    label="ประเภทหน่วยงาน" 
                                    required 
                                    value={formData.integration || ''} 
                                    options={dropdowns.integration} 
                                    onChange={(val) => handleChange('integration', val)} 
                                    placeholder="เลือกสถานะบูรณาการ..." 
                                    locked={locks['integration']} 
                                    onLockToggle={() => toggleLock('integration')} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {(showAgencySection || showActivitySection) && (
                    <div className={`grid grid-cols-1 ${showAgencySection && showActivitySection ? 'xl:grid-cols-2' : ''} gap-6`}>
                        {showAgencySection && (
                            <div className={`rounded-2xl shadow-sm border p-6 md:p-8 transition-all duration-300 ${getCardStyle(integrationType)}`}>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl"><Building2 size={24} /></div>
                                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white">ข้อมูลหน่วยงานและพื้นที่</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                    {fieldVisibility.mainAgency && <AutocompleteInput id="mainAgency" label="หน่วยงานหลัก" required value={formData.mainAgency || ''} options={dropdowns.mainAgency} onChange={(val) => handleChange('mainAgency', val)} locked={locks['mainAgency']} onLockToggle={() => toggleLock('mainAgency')} />}
                                    {fieldVisibility.province && <AutocompleteInput id="province" label="จังหวัด" required value={formData.province || ''} options={provinceOptions} onChange={(val) => handleChange('province', val)} locked={locks['province']} onLockToggle={() => toggleLock('province')} />}
                                    {fieldVisibility.responsibleAgency && <AutocompleteInput id="responsibleAgency" label="หน่วยปฏิบัติ" value={formData.responsibleAgency || ''} options={responsibleAgencyOptions} onChange={(val) => handleChange('responsibleAgency', val)} locked={locks['responsibleAgency']} onLockToggle={() => toggleLock('responsibleAgency')} />}
                                    {fieldVisibility.integrationArea && <AutocompleteInput id="integrationArea" label="พื้นที่ดำเนินการ" value={formData.integrationArea || ''} options={integrationAreaOptions} onChange={(val) => handleChange('integrationArea', val)} locked={locks['integrationArea']} onLockToggle={() => toggleLock('integrationArea')} />}
                                </div>
                            </div>
                        )}
                        {showActivitySection && (
                            <div className={`rounded-2xl shadow-sm border p-6 md:p-8 transition-all duration-300 ${getCardStyle(integrationType)}`}>
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl"><FileText size={24} /></div>
                                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white">รายละเอียดกิจกรรม</h2>
                                </div>
                                <div className="space-y-6">
                                    {fieldVisibility.activity && <AutocompleteInput id="activity" label="กิจกรรม" required value={formData.activity || ''} options={dropdowns.activity} onChange={(val) => handleChange('activity', val)} locked={locks['activity']} onLockToggle={() => toggleLock('activity')} />}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {fieldVisibility.target && (
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-base font-medium text-slate-700 dark:text-slate-300">เป้าหมาย</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleLock('target')}
                                                        className={`focus:outline-none transition-colors p-1 rounded-full ${locks['target'] ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                        tabIndex={-1}
                                                    >
                                                        {locks['target'] ? <Lock size={16} /> : <Unlock size={16} />}
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={formData.target || ''} 
                                                    onChange={(e) => handleChange('target', e.target.value)} 
                                                    disabled={locks['target']}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 transition-all outline-none text-lg ${
                                                        locks['target'] 
                                                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed' 
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                                                    }`}
                                                    placeholder="ระบุตัวเลขเป้าหมาย" 
                                                />
                                            </div>
                                        )}
                                        {fieldVisibility.unit && <AutocompleteInput id="unit" label="หน่วยนับ" value={formData.unit || ''} options={dropdowns.unit} onChange={(val) => handleChange('unit', val)} locked={locks['unit']} onLockToggle={() => toggleLock('unit')} />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {showBudgetSection && (
                    <div className={`rounded-2xl shadow-sm border p-6 md:p-8 transition-all duration-300 ${getCardStyle(integrationType)}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl"><Calculator size={28} /></div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">รายละเอียดงบประมาณ</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-base">ระบุจำนวนเงินในแต่ละหมวดรายจ่าย (หน่วย: บาท)</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {showBudgetPersonnel && (
                                <div className="bg-blue-50/70 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                    <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-blue-500 rounded-full"></div>งบบุคลากร</h3>
                                    <div className="space-y-4">
                                        {fieldVisibility.salaryPermanent && <BudgetField label="เงินเดือนและค่าจ้างประจำ" val={formData.salaryPermanent} onChange={(v) => handleBudgetChange('salaryPermanent', v)} />}
                                        {fieldVisibility.governmentCompensation && <BudgetField label="ค่าตอบแทนพนักงานราชการ" val={formData.governmentCompensation} onChange={(v) => handleBudgetChange('governmentCompensation', v)} />}
                                    </div>
                                </div>
                            )}
                            {showBudgetOperational && (
                                <div className="bg-emerald-50/70 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                                    <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-emerald-500 rounded-full"></div>งบดำเนินงาน</h3>
                                    <div className="space-y-4">
                                        {fieldVisibility.compensationSupplies && <BudgetField label="ค่าตอบแทน ใช้สอย และวัสดุ" val={formData.compensationSupplies} onChange={(v) => handleBudgetChange('compensationSupplies', v)} />}
                                        {fieldVisibility.contractEmployees && <BudgetField label="ค่าจ้างเหมาพนักงาน" val={formData.contractEmployees} onChange={(v) => handleBudgetChange('contractEmployees', v)} />}
                                        {fieldVisibility.utilities && <BudgetField label="ค่าสาธารณูปโภค" val={formData.utilities} onChange={(v) => handleBudgetChange('utilities', v)} />}
                                    </div>
                                </div>
                            )}
                            {showBudgetInvestment && (
                                <div className="bg-amber-50/70 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-sm">
                                    <h3 className="text-xl font-semibold text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-amber-500 rounded-full"></div>งบลงทุน</h3>
                                    <div className="space-y-4">
                                        {fieldVisibility.equipment && <BudgetField label="ค่าครุภัณฑ์" val={formData.equipment} onChange={(v) => handleBudgetChange('equipment', v)} />}
                                        {fieldVisibility.landConstruction && <BudgetField label="ค่าที่ดินและสิ่งก่อสร้าง" val={formData.landConstruction} onChange={(v) => handleBudgetChange('landConstruction', v)} />}
                                    </div>
                                </div>
                            )}
                            {showBudgetOther && (
                                <div className="bg-purple-50/70 dark:bg-purple-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/50 shadow-sm">
                                    <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-purple-500 rounded-full"></div>งบอื่นๆ</h3>
                                    <div className="space-y-4">
                                        {fieldVisibility.subsidies && <BudgetField label="งบเงินอุดหนุน" val={formData.subsidies} onChange={(v) => handleBudgetChange('subsidies', v)} />}
                                        {fieldVisibility.otherExpenses && <BudgetField label="งบรายจ่ายอื่น" val={formData.otherExpenses} onChange={(v) => handleBudgetChange('otherExpenses', v)} />}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="sticky bottom-4 z-20">
                     <div className={`backdrop-blur-md p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 border transition-all duration-300 ${getFooterContainerStyle()}`}>
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                            <div className="text-base font-medium text-white/80">รวมงบประมาณสุทธิ</div>
                            <div className="text-3xl font-bold text-white">{formatNumber(totalBudget)} <span className="text-xl font-normal opacity-80">บาท</span></div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button type="button" onClick={clearForm} className="flex-1 md:flex-none px-8 py-3 rounded-xl font-semibold transition-all border bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700 flex items-center justify-center gap-2 text-base"><RefreshCw size={20} /> ล้างค่า</button>
                            <button type="submit" disabled={isSubmitting} className={`flex-1 md:flex-none px-10 py-3 rounded-xl font-semibold transition-all shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed ${getSubmitButtonStyle()}`}>
                                {isSubmitting ? <RefreshCw size={22} className="animate-spin" /> : <CheckCircle2 size={22} />}
                                {formData.id ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
            <div className="h-8"></div>
        </div>
    );
};

const BudgetField = ({ label, val, onChange }: { label: string, val: number | undefined, onChange: (v: string) => void }) => (
    <div className="group">
        <label className="block text-base font-medium text-slate-600 dark:text-slate-300 mb-2 group-hover:text-slate-800 transition-colors">{label}</label>
        <div className="relative">
            <input type="text" value={val ? formatNumber(val) : ''} onChange={(e) => onChange(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-right font-medium text-slate-800 dark:text-slate-100 text-lg" placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">฿</span>
        </div>
    </div>
);

export default HomeView;
