
import { BudgetRecord } from '../../types';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService, useDataSync } from '../../services/dataService';
import { formatNumber } from '../../utils';
import { ChevronLeft, ChevronRight, Search, Filter, Users, Settings, Building, FileSpreadsheet, Wallet, ArrowRightLeft, RefreshCw, Edit2, Trash2, X, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import AutocompleteInput from '../Form/AutocompleteInput';

const DatabaseView: React.FC = () => {
    useDataSync(); // Force re-render when data changes
    const records = dataService.getRecords();
    const dropdowns = dataService.getDropdowns();
    const navigate = useNavigate();
    
    // Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterIntegration, setFilterIntegration] = useState('');
    const [filterMainAgency, setFilterMainAgency] = useState('');
    const [filterProvince, setFilterProvince] = useState('');
    const [filterResponsibleAgency, setFilterResponsibleAgency] = useState('');
    const [filterIntegrationArea, setFilterIntegrationArea] = useState('');
    const [filterActivity, setFilterActivity] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [showFilters, setShowFilters] = useState(false);
    const [filterOverflow, setFilterOverflow] = useState(false); // State to control overflow visibility
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Visibility
    const tableVisibility = dataService.getTableColumnVisibility();

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchTerm, 
        filterIntegration, 
        filterMainAgency, 
        filterProvince, 
        filterResponsibleAgency, 
        filterIntegrationArea, 
        filterActivity
    ]);

    // Get Options for Dropdowns (Show only existing data)
    const getOptions = (key: string) => {
        // 1. Get unique values present in records
        const presentValues = new Set(records.map(r => (r as any)[key] as string).filter(val => val && val.trim() !== ''));
        
        // 2. Get predefined order
        const predefined = (dropdowns as any)[key] || [];
        
        // 3. Filter predefined list to include only present values (maintaining order)
        const sortedPresent = predefined.filter((item: string) => presentValues.has(item));
        
        // 4. Get extra values not in predefined list (preserving order of appearance)
        const extras = Array.from(presentValues)
            .filter(val => !predefined.includes(val));

        return [...sortedPresent, ...extras];
    };

    // Prepare Sets for fast lookup of exact matches
    const optionsSets = useMemo(() => ({
        integration: new Set(records.map(r => (r.integration || '').trim())),
        mainAgency: new Set(records.map(r => (r.mainAgency || '').trim())),
        province: new Set(records.map(r => (r.province || '').trim())),
        responsibleAgency: new Set(records.map(r => (r.responsibleAgency || '').trim())),
        integrationArea: new Set(records.map(r => (r.integrationArea || '').trim())),
        activity: new Set(records.map(r => (r.activity || '').trim()))
    }), [records]);

    const filteredRecords = useMemo(() => {
        // 1. Filter
        const filtered = records.filter(record => {
            // General Search (Check against multiple fields)
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                (record.mainAgency || '').toLowerCase().includes(searchLower) ||
                (record.activity || '').toLowerCase().includes(searchLower) ||
                (record.province || '').toLowerCase().includes(searchLower) ||
                (record.integration || '').toLowerCase().includes(searchLower) ||
                (record.responsibleAgency || '').toLowerCase().includes(searchLower);
            
            // Specific Filters with Smart Matching logic
            const checkFilter = (recordVal: string | undefined, filterVal: string, optionsSet: Set<string>) => {
                if (!filterVal) return true;
                const rVal = (recordVal || '').trim();
                const fVal = filterVal.trim();
                
                if (!rVal) return false;

                // Smart Match 1: If the user selected/typed something that exists exactly in the DB, enforce exact match.
                if (optionsSet.has(fVal)) {
                    return rVal === fVal;
                }
                
                // Smart Match 2: Partial match with Number Boundary Check
                // This prevents "Unit 1" from matching "Unit 15" if typed manually
                const lowerR = rVal.toLowerCase();
                const lowerF = fVal.toLowerCase();
                
                if (!lowerR.includes(lowerF)) return false;

                // If filter ends with a digit, check if the match in record is followed by a digit
                // e.g. Filter: "ที่ 1", Record: "ที่ 15" -> "1" is followed by "5" -> Reject
                const lastChar = lowerF.slice(-1);
                if (/[0-9]/.test(lastChar)) {
                    const idx = lowerR.indexOf(lowerF);
                    if (idx !== -1) {
                        const nextChar = lowerR[idx + lowerF.length];
                        if (nextChar && /[0-9]/.test(nextChar)) {
                            return false; 
                        }
                    }
                }
                
                return true;
            };

            const matchesIntegration = checkFilter(record.integration, filterIntegration, optionsSets.integration);
            const matchesMainAgency = checkFilter(record.mainAgency, filterMainAgency, optionsSets.mainAgency);
            const matchesProvince = checkFilter(record.province, filterProvince, optionsSets.province);
            const matchesResponsibleAgency = checkFilter(record.responsibleAgency, filterResponsibleAgency, optionsSets.responsibleAgency);
            const matchesIntegrationArea = checkFilter(record.integrationArea, filterIntegrationArea, optionsSets.integrationArea);
            const matchesActivity = checkFilter(record.activity, filterActivity, optionsSets.activity);

            return matchesSearch && matchesIntegration && matchesMainAgency && matchesProvince && 
                   matchesResponsibleAgency && matchesIntegrationArea && matchesActivity;
        });

        return filtered;

    }, [
        records, searchTerm, refreshTrigger,
        filterIntegration, filterMainAgency, filterProvince, 
        filterResponsibleAgency, filterIntegrationArea, filterActivity,
        optionsSets
    ]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Summary Stats
    const summary = useMemo(() => {
        return filteredRecords.reduce((acc, r) => ({
            personnel: acc.personnel + (r.salaryPermanent || 0) + (r.governmentCompensation || 0),
            operational: acc.operational + (r.compensationSupplies || 0) + (r.contractEmployees || 0) + (r.utilities || 0),
            investment: acc.investment + (r.equipment || 0) + (r.landConstruction || 0),
            other: acc.other + (r.subsidies || 0) + (r.otherExpenses || 0)
        }), { personnel: 0, operational: 0, investment: 0, other: 0 });
    }, [filteredRecords]);

    const totalBudget = summary.personnel + summary.operational + summary.investment + summary.other;

    // Helper for date formatting (DD/MM/YYYY)
    const formatDateThai = (dateString: string) => {
        if (!dateString) return '-';
        const parts = dateString.split(' ');
        const datePart = parts[0];
        const dmy = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmy) {
            return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
        }
        return datePart.replace(',', '');
    };

    const handleSync = async () => {
        setIsLoading(true);
        try {
            const success = await dataService.syncDropdowns();
            if (success) {
                setRefreshTrigger(prev => prev + 1);
                Swal.fire({
                    icon: 'success',
                    title: 'ซิงค์ข้อมูลสำเร็จ',
                    text: 'อัปเดตข้อมูลเรียบร้อยแล้ว',
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

    const handleDownloadExcel = async () => {
        setIsDownloading(true);
        try {
            const exceljsModule = await import('exceljs');
            const ExcelJS = (exceljsModule as any).default || exceljsModule;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Database');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'บูรณาการ', key: 'integration', width: 25 },
                { header: 'หน่วยงานหลัก', key: 'mainAgency', width: 20 },
                { header: 'จังหวัด', key: 'province', width: 15 },
                { header: 'หน่วยปฏิบัติ', key: 'responsibleAgency', width: 25 },
                { header: 'พื้นที่ดำเนินการ', key: 'integrationArea', width: 20 },
                { header: 'กิจกรรม', key: 'activity', width: 30 },
                { header: 'เป้าหมาย', key: 'target', width: 10 },
                { header: 'หน่วยนับ', key: 'unit', width: 10 },
                { header: 'เงินเดือนฯ', key: 'salaryPermanent', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'ค่าตอบแทนพนักงานฯ', key: 'governmentCompensation', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'ค่าตอบแทน/ใช้สอย', key: 'compensationSupplies', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'ค่าจ้างเหมา', key: 'contractEmployees', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'ค่าสาธารณูปโภค', key: 'utilities', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'ค่าครุภัณฑ์', key: 'equipment', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'ที่ดิน/สิ่งก่อสร้าง', key: 'landConstruction', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'เงินอุดหนุน', key: 'subsidies', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'รายจ่ายอื่น', key: 'otherExpenses', width: 15, style: { numFmt: '#,##0.00' } },
                { header: 'วันที่บันทึก', key: 'timestamp', width: 20 },
            ];

            // Add Data
            filteredRecords.forEach((record) => {
                worksheet.addRow(record);
            });

            // Style Header
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            
            // Generate File
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Budget_Database_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถสร้างไฟล์ Excel ได้',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterIntegration('');
        setFilterMainAgency('');
        setFilterProvince('');
        setFilterResponsibleAgency('');
        setFilterIntegrationArea('');
        setFilterActivity('');
        setCurrentPage(1);
    };

    const handleToggleFilters = () => {
        if (showFilters) {
            setFilterOverflow(false);
            setShowFilters(false);
        } else {
            setShowFilters(true);
            setTimeout(() => {
                setFilterOverflow(true);
            }, 300); // Wait for animation to finish
        }
    };

    const handleEdit = async (record: any) => {
        const result = await Swal.fire({
            title: 'ยืนยันการแก้ไข?',
            text: "คุณต้องการแก้ไขข้อมูลรายการนี้ใช่หรือไม่",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'แก้ไขข้อมูล',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#94a3b8'
        });

        if (result.isConfirmed) {
            navigate('/', { state: { editRecord: record } });
        }
    };

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'ยืนยันการลบรายการ?',
            text: "ข้อมูลนี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8'
        });

        if (confirm.isConfirmed) {
            Swal.fire({
                title: 'กำลังลบข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const result = await dataService.deleteRecord(id);
                if (result.success) {
                    setRefreshTrigger(prev => prev + 1);
                    Swal.fire({
                        title: 'ลบสำเร็จ!',
                        text: 'ข้อมูลถูกลบออกจากระบบเรียบร้อยแล้ว',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(result.message || 'ลบข้อมูลไม่สำเร็จ');
                }
            } catch (error: any) {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: error.message || 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    // Helper to generate page numbers with ellipses
    const getPageNumbers = () => {
        const delta = 2; // Neighbors around current page
        const range = [];
        const rangeWithDots = [];

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        let l;
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
        return rangeWithDots;
    };

    // Shared Pagination Component
    const PaginationControls = ({ isTop = false }) => (
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 py-3 px-6 bg-slate-50/50 dark:bg-slate-900/50 transition-colors ${isTop ? 'border-b' : 'border-t'} border-slate-200 dark:border-slate-700`}>
            {/* Page Size Selector */}
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 order-2 sm:order-1">
                <span>แสดง</span>
                <select 
                    value={pageSize} 
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow cursor-pointer"
                >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span>รายการ</span>
                <span className="hidden sm:inline text-slate-400 mx-1">|</span>
                <span className="hidden sm:inline">ทั้งหมด {filteredRecords.length} รายการ</span>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-white dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all bg-transparent"
                >
                    <ChevronLeft size={16} /> <span className="hidden sm:inline">ก่อนหน้า</span>
                </button>

                <div className="flex items-center gap-1 mx-1 overflow-x-auto custom-scrollbar">
                    {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                            <span key={`dots-${index}`} className="px-1 text-slate-400 text-sm">...</span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(Number(page))}
                                className={`min-w-[32px] h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all ${
                                    currentPage === page
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-purple-300 dark:hover:border-purple-500'
                                }`}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>

                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-white dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all bg-transparent"
                >
                    <span className="hidden sm:inline">ถัดไป</span> <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

    // Calculate colSpans for grouped headers
    const colSpanPersonnel = (tableVisibility.salaryPermanent ? 1 : 0) + (tableVisibility.governmentCompensation ? 1 : 0);
    const colSpanOperational = (tableVisibility.compensationSupplies ? 1 : 0) + (tableVisibility.contractEmployees ? 1 : 0) + (tableVisibility.utilities ? 1 : 0);
    const colSpanInvestment = (tableVisibility.equipment ? 1 : 0) + (tableVisibility.landConstruction ? 1 : 0);
    const colSpanOther = (tableVisibility.subsidies ? 1 : 0) + (tableVisibility.otherExpenses ? 1 : 0);

    return (
        <div className="max-w-[98vw] mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">ฐานข้อมูลงบประมาณ</h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 transition-colors">เรียกดูและค้นหาข้อมูลโครงการทั้งหมดจากฐานข้อมูล</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadExcel}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium text-base shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />} 
                        ดาวน์โหลด
                    </button>
                    <button 
                        onClick={handleSync}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-base shadow-sm disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> 
                        {isLoading ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <SummaryCard title="งบบุคลากร" amount={summary.personnel} color="blue" icon={<Users size={20} />} />
                <SummaryCard title="งบดำเนินงาน" amount={summary.operational} color="emerald" icon={<Settings size={20} />} />
                <SummaryCard title="งบลงทุน" amount={summary.investment} color="amber" icon={<Building size={20} />} />
                <SummaryCard title="งบอื่นๆ" amount={summary.other} color="purple" icon={<FileSpreadsheet size={20} />} />
                <SummaryCard title="รวมงบประมาณ" amount={totalBudget} color="slate" icon={<Wallet size={20} />} isTotal />
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 p-4 transition-colors relative z-20">
                <div className="flex justify-between items-center mb-4 cursor-pointer group" onClick={handleToggleFilters}>
                    <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors text-lg">
                        <Filter size={24} /> 
                        <span>ตัวกรองและค้นหา</span>
                    </div>
                    <div className="text-sm text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full">{showFilters ? 'ซ่อน' : 'แสดง'}</div>
                </div>
                
                <div className={`transition-all duration-300 ${showFilters ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} ${filterOverflow ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <div className="space-y-4 pt-2">
                        {/* 1. General Search & Clear Button */}
                        <div className="flex flex-col md:flex-row gap-4 items-end border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ค้นหาทั่วไป</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="ค้นหาจากชื่อหน่วยงาน, กิจกรรม, หรือข้อมูลอื่นๆ..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-500 outline-none text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 text-base"
                                    />
                                    <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                </div>
                            </div>
                            <button 
                                onClick={handleClearFilters}
                                className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 font-medium shrink-0"
                            >
                                <X size={18} /> ล้างตัวกรองข้อมูล
                            </button>
                        </div>

                        {/* 2. Specific Searchable Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2">
                            <AutocompleteInput
                                id="filter-integration"
                                label="บูรณาการ"
                                value={filterIntegration}
                                onChange={setFilterIntegration}
                                options={getOptions('integration')}
                                placeholder="เลือกบูรณาการ..."
                            />
                            <AutocompleteInput
                                id="filter-mainAgency"
                                label="หน่วยงานหลัก"
                                value={filterMainAgency}
                                onChange={setFilterMainAgency}
                                options={getOptions('mainAgency')}
                                placeholder="เลือกหน่วยงานหลัก..."
                            />
                            <AutocompleteInput
                                id="filter-province"
                                label="จังหวัด"
                                value={filterProvince}
                                onChange={setFilterProvince}
                                options={getOptions('province')}
                                placeholder="เลือกจังหวัด..."
                            />
                            <AutocompleteInput
                                id="filter-responsibleAgency"
                                label="หน่วยปฏิบัติ"
                                value={filterResponsibleAgency}
                                onChange={setFilterResponsibleAgency}
                                options={getOptions('responsibleAgency')}
                                placeholder="เลือกหน่วยปฏิบัติ..."
                            />
                            <AutocompleteInput
                                id="filter-integrationArea"
                                label="พื้นที่ดำเนินการ"
                                value={filterIntegrationArea}
                                onChange={setFilterIntegrationArea}
                                options={getOptions('integrationArea')}
                                placeholder="เลือกพื้นที่..."
                            />
                            <AutocompleteInput
                                id="filter-activity"
                                label="กิจกรรม"
                                value={filterActivity}
                                onChange={setFilterActivity}
                                options={getOptions('activity')}
                                placeholder="เลือกกิจกรรม..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors flex flex-col h-[75vh]">
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <ArrowRightLeft size={12} />
                        <span>สามารถลากเส้นแบ่งคอลัมน์เพื่อปรับความกว้างได้</span>
                    </div>
                </div>

                {/* Top Pagination */}
                <PaginationControls isTop={true} />

                {/* Table Scroll Area */}
                <div className="overflow-auto custom-scrollbar flex-1 relative">
                    <table className="min-w-max border-collapse">
                        <thead className="bg-slate-200 dark:bg-slate-950 sticky top-0 z-10 shadow-sm font-semibold text-slate-700 dark:text-slate-200">
                            {/* Row 1 */}
                            <tr>
                                {tableVisibility.integration && <Th rowSpan={2} width="150px" align="center">บูรณาการ</Th>}
                                {tableVisibility.mainAgency && <Th rowSpan={2} width="150px" align="center">หน่วยงานหลัก</Th>}
                                {tableVisibility.province && <Th rowSpan={2} width="120px" align="center">จังหวัด</Th>}
                                {tableVisibility.responsibleAgency && <Th rowSpan={2} width="150px" align="center">หน่วยปฏิบัติ</Th>}
                                {tableVisibility.integrationArea && <Th rowSpan={2} width="150px" align="center">พื้นที่ดำเนินการ</Th>}
                                {tableVisibility.activity && <Th rowSpan={2} width="200px" align="center">กิจกรรม</Th>}
                                {tableVisibility.target && <Th rowSpan={2} width="100px" align="center">เป้าหมาย</Th>}
                                {tableVisibility.unit && <Th rowSpan={2} width="100px" align="center">หน่วยนับ</Th>}
                                
                                {colSpanPersonnel > 0 && <Th colSpan={colSpanPersonnel} align="center" className="border-b-0">งบบุคลากร</Th>}
                                {colSpanOperational > 0 && <Th colSpan={colSpanOperational} align="center" className="border-b-0">งบดำเนินงาน</Th>}
                                {colSpanInvestment > 0 && <Th colSpan={colSpanInvestment} align="center" className="border-b-0">งบลงทุน</Th>}
                                {colSpanOther > 0 && <Th colSpan={colSpanOther} align="center" className="border-b-0">งบอื่นๆ</Th>}

                                {tableVisibility.timestamp && <Th rowSpan={2} width="160px" align="center">วันที่บันทึก</Th>}
                                <Th rowSpan={2} width="100px" align="center" isStickyRight>จัดการ</Th>
                            </tr>
                            {/* Row 2 */}
                            <tr>
                                {/* Personnel */}
                                {tableVisibility.salaryPermanent && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">เงินเดือน/ค่าจ้าง</Th>}
                                {tableVisibility.governmentCompensation && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">ค่าตอบแทนพนง.</Th>}
                                
                                {/* Operational */}
                                {tableVisibility.compensationSupplies && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">ค่าตอบแทน/ใช้สอย</Th>}
                                {tableVisibility.contractEmployees && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">ค่าจ้างเหมา</Th>}
                                {tableVisibility.utilities && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">ค่าสาธารณูปโภค</Th>}

                                {/* Investment */}
                                {tableVisibility.equipment && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">ค่าครุภัณฑ์</Th>}
                                {tableVisibility.landConstruction && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">ที่ดิน/สิ่งก่อสร้าง</Th>}

                                {/* Other */}
                                {tableVisibility.subsidies && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">เงินอุดหนุน</Th>}
                                {tableVisibility.otherExpenses && <Th width="120px" align="center" className="border-t border-slate-300 dark:border-slate-700">รายจ่ายอื่น</Th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedRecords.length > 0 ? paginatedRecords.map((r, index) => (
                                <tr key={`${r.id}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                                    {tableVisibility.integration && <DataCell text={r.integration} />}
                                    {tableVisibility.mainAgency && <DataCell text={r.mainAgency} />}
                                    {tableVisibility.province && <DataCell text={r.province} />}
                                    {tableVisibility.responsibleAgency && <DataCell text={r.responsibleAgency} />}
                                    {tableVisibility.integrationArea && <DataCell text={r.integrationArea} />}
                                    {tableVisibility.activity && <DataCell text={r.activity} />}
                                    {tableVisibility.target && <DataCell text={r.target} align="center" />}
                                    {tableVisibility.unit && <DataCell text={r.unit} align="center" />}
                                    
                                    {/* Sub-columns */}
                                    {tableVisibility.salaryPermanent && <DataCell text={formatNumber(r.salaryPermanent)} align="right" isNumber />}
                                    {tableVisibility.governmentCompensation && <DataCell text={formatNumber(r.governmentCompensation)} align="right" isNumber />}
                                    {tableVisibility.compensationSupplies && <DataCell text={formatNumber(r.compensationSupplies)} align="right" isNumber />}
                                    {tableVisibility.contractEmployees && <DataCell text={formatNumber(r.contractEmployees)} align="right" isNumber />}
                                    {tableVisibility.utilities && <DataCell text={formatNumber(r.utilities)} align="right" isNumber />}
                                    {tableVisibility.equipment && <DataCell text={formatNumber(r.equipment)} align="right" isNumber />}
                                    {tableVisibility.landConstruction && <DataCell text={formatNumber(r.landConstruction)} align="right" isNumber />}
                                    {tableVisibility.subsidies && <DataCell text={formatNumber(r.subsidies)} align="right" isNumber />}
                                    {tableVisibility.otherExpenses && <DataCell text={formatNumber(r.otherExpenses)} align="right" isNumber />}
                                    {tableVisibility.timestamp && <DataCell text={formatDateThai(r.timestamp)} align="center" />}
                                    <td className="px-2 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky right-0 z-5 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.2)]">
                                        <div className="flex justify-center items-center gap-1">
                                            <button 
                                                onClick={() => handleEdit(r)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="แก้ไข"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(r.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={19} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search size={48} className="mb-4 opacity-20" />
                                            <p>ไม่พบข้อมูลที่ค้นหา</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Bottom Pagination */}
                <PaginationControls isTop={false} />
            </div>
        </div>
    );
};

// Resizable Header Component with rowspan/colspan support
const Th = ({ children, align = 'left', width, isStickyRight = false, rowSpan, colSpan, className = '' }: { children?: React.ReactNode, align?: 'left'|'right'|'center', width?: string, isStickyRight?: boolean, rowSpan?: number, colSpan?: number, className?: string }) => (
    <th 
        rowSpan={rowSpan}
        colSpan={colSpan}
        className={`px-4 py-4 text-${align} text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border-b border-r border-slate-300 dark:border-slate-700 last:border-r-0 relative group ${isStickyRight ? 'sticky right-0 z-20 bg-slate-200 dark:bg-slate-950 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.2)]' : ''} ${className}`}
        style={{ width: width, minWidth: isStickyRight ? 'auto' : (colSpan && colSpan > 1 ? 'auto' : '100px'), resize: isStickyRight ? 'none' : 'horizontal', overflow: isStickyRight ? 'visible' : 'auto' }}
    >
        <div className={`flex items-center w-full h-full ${align === 'center' ? 'justify-center' : ''}`}>
            <span className="truncate w-full">{children}</span>
        </div>
    </th>
);

// Data Cell with Tooltip and Truncation
const DataCell = ({ text, align = 'left', isNumber = false }: { text: string | number, align?: 'left'|'right'|'center', isNumber?: boolean }) => {
    return (
        <td className={`px-4 py-3 border-b border-r border-slate-100 dark:border-slate-700 last:border-r-0 text-sm text-${align} text-slate-700 dark:text-slate-200 ${isNumber ? 'font-mono' : ''}`}>
            <div className="w-full truncate" title={String(text)}>
                {text || '-'}
            </div>
        </td>
    );
};

const SummaryCard = ({ title, amount, color, icon, isTotal = false }: any) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/50',
        slate: 'bg-slate-800 dark:bg-slate-700 text-white border-slate-700 shadow-lg',
    };

    return (
        <div className={`rounded-2xl p-5 border ${colorClasses[color]} flex flex-col justify-between h-full transition-transform hover:-translate-y-1 duration-300`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-bold uppercase tracking-wider ${isTotal ? 'text-slate-400' : 'opacity-70'}`}>{title}</span>
                <div className={`p-1.5 rounded-lg ${isTotal ? 'bg-slate-700 text-emerald-400' : 'bg-white/50 dark:bg-black/20'}`}>
                    {icon}
                </div>
            </div>
            <p className={`font-bold ${isTotal ? 'text-3xl' : 'text-2xl'}`}>{formatNumber(amount)}</p>
        </div>
    );
};

export default DatabaseView;
