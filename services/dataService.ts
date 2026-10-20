
import React, { useState, useEffect } from 'react';
import { BudgetRecord, AppSettings, DropdownOptions, HierarchyData, ResponsibleAgencyData, CompareRecord, FieldVisibility, User, UserRole, ReportNode, RegionData } from '../types';
import { INITIAL_BUDGET_RECORDS, INITIAL_DROPDOWN_DATA, INITIAL_HIERARCHY, INITIAL_RESP_DATA, INITIAL_COMPARE_DATA, INITIAL_USERS, INITIAL_REGION_DATA } from './mockData';
import { parseNumber } from '../utils';
import { db } from './firebaseConfig';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import Papa from 'papaparse';

const SETTINGS_KEY = 'budgetPlanSettings';
const CACHE_KEY = 'budgetPlanCache';

// Define available routes/menus in the application
export const APP_ROUTES = [
    { path: '/', label: 'หน้าแรก (บันทึกข้อมูล)' },
    { path: '/database', label: 'ฐานข้อมูล' },
    { path: '/compare', label: 'ข้อมูลงบประมาณ' },
    { path: '/report', label: 'รายงาน' },
    { path: '/manage', label: 'จัดการข้อมูล' },
    { path: '/settings', label: 'ตั้งค่าระบบ' },
    { path: '/contact', label: 'ติดต่อเรา' },
];

// Define sub-menus for Manage View (Granular permissions)
export const MANAGE_SUB_MENUS = [
    { id: 'hierarchy', label: 'โครงสร้างหน่วยงาน (Hierarchy)', path: '/manage/hierarchy' },
    { id: 'responsible', label: 'หน่วยงาน', path: '/manage/responsible' },
    { id: 'integration', label: 'รายการบูรณาการ', path: '/manage/integration' },
    { id: 'activity', label: 'รายการกิจกรรม', path: '/manage/activity' },
    { id: 'unit', label: 'รายการหน่วยนับ', path: '/manage/unit' },
    { id: 'report', label: 'จัดการรายงาน', path: '/manage/report' },
    { id: 'region', label: 'จัดการภูมิภาค', path: '/manage/region' }, // New Menu Item
    { id: 'fields', label: 'จัดการฟิลด์แบบฟอร์ม', path: '/manage/fields' },
    { id: 'tableColumns', label: 'จัดการตารางฐานข้อมูล', path: '/manage/tableColumns' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    'admin': [
        '/', '/database', '/compare', '/manage', '/report', '/settings', '/contact',
        '/manage/hierarchy', '/manage/responsible', '/manage/integration', 
        '/manage/activity', '/manage/unit', '/manage/fields', '/manage/tableColumns', '/manage/report', '/manage/region'
    ],
    'staff': ['/', '/database', '/compare', '/report', '/contact'],
    'viewer': ['/', '/database', '/compare', '/report', '/contact']
};

// Initial Hierarchy Data (Moved from ReportView)
const INITIAL_REPORT_STRUCTURE: ReportNode[] = [
    {
        id: '1', title: "1. แผนงานบุคลากรภาครัฐ", type: 'plan', children: [
            { id: '1-1', title: "แผนงานบุคลากรภาครัฐ", type: 'activity', activityMatcher: "แผนงานบุคลากรภาครัฐ" }
        ]
    },
    {
        id: '2', title: "2. แผนงานพื้นฐานด้านการสร้างการเติบโตบนคุณภาพชีวิตที่เป็นมิตรต่อสิ่งแวดล้อม", type: 'plan', children: [
            {
                id: '2-1', title: "ผลผลิตที่ 1 : พื้นที่ป่าอนุรักษ์ได้รับการบริหารจัดการ", type: 'project', children: [
                    {
                        id: '2-1-1', title: "1) กิจกรรมอนุรักษ์ ฟื้นฟู และพัฒนาป่าไม้", type: 'group', children: [
                            {
                                id: '2-1-1-1', title: "1.1 ด้านการอุทยานแห่งชาติ", type: 'subgroup', children: [
                                    { id: '2-1-1-1-1', title: "กิจกรรมงานอุทยานแห่งชาติ", type: 'activity', activityMatcher: "กิจกรรมงานอุทยานแห่งชาติ" }
                                ]
                            },
                            {
                                id: '2-1-1-2', title: "1.2 ด้านสัตว์ป่า", type: 'subgroup', children: [
                                    { id: '2-1-1-2-1', title: "กิจกรรมงานสงวนและคุ้มครองสัตว์ป่า", type: 'activity', activityMatcher: "กิจกรรมงานสงวนและคุ้มครองสัตว์ป่า" },
                                    { id: '2-1-1-2-2', title: "กิจกรรมเพาะพันธุ์และปล่อยสัตว์ป่าคืนสู่ธรรมชาติ", type: 'activity', activityMatcher: "กิจกรรมเพาะพันธุ์และปล่อยสัตว์ป่าคืนสู่ธรรมชาติ" },
                                    { id: '2-1-1-2-3', title: "กิจกรรมโครงการดูแลสัตว์ป่าของกลาง", type: 'activity', activityMatcher: "กิจกรรมโครงการดูแลสัตว์ป่าของกลาง" }
                                ]
                            },
                        ]
                    }
                ]
            }
        ]
    }
];

// ลำดับความสำคัญสำหรับรายการบูรณาการ
const INTEGRATION_PRIORITY = [
    'ไม่เป็นหน่วยงานบูรณาการ',
    'หน่วยปฏิบัติ (ด้านอุทยานแห่งชาติ)',
    'หน่วยปฏิบัติ (ด้านสัตว์ป่า)'
];

export const FIELD_LABELS: Record<string, string> = {
    id: 'ID',
    integration: 'บูรณาการ', 
    mainAgency: 'หน่วยงานหลัก',
    province: 'จังหวัด',
    responsibleAgency: 'หน่วยปฏิบัติ',
    integrationArea: 'พื้นที่ดำเนินการ',
    activity: 'กิจกรรม',
    target: 'เป้าหมาย',
    unit: 'หน่วยนับ',
    salaryPermanent: 'เงินเดือนและค่าจ้างประจำ',
    governmentCompensation: 'ค่าตอบแทนพนักงานราชการ',
    compensationSupplies: 'ค่าตอบแทน ใช้สอย และวัสดุ',
    contractEmployees: 'ค่าจ้างเหมาพนักงาน',
    utilities: 'ค่าสาธารณูปโภค',
    equipment: 'ค่าครุภัณฑ์',
    landConstruction: 'ค่าที่ดินและสิ่งก่อสร้าง',
    subsidies: 'งบเงินอุดหนุน',
    otherExpenses: 'งบรายจ่ายอื่น',
    referenceBudget: 'งบอ้างอิง',
    timestamp: 'วันที่บันทึก'
};

export const getSettings = (): AppSettings => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    
    // Default Fallback
    const defaults = {
        gasUrl: 'https://script.google.com/macros/s/AKfycbyO8CHcS4sm6KLvvSlfpE3t84YV9sSE6neBnO8SeFsd8Oh9DpEqZ6MDn6r_IyHZbi8m/exec',
        sheetsId: '1FwNLhxzWwHKAjKWd2hxkrPHyhO9vhHJ1KqoRtGlTGMw',
        dataSheetName: 'Database',
        databaseSheetName: 'Database',
        hierarchySheetName: 'Hierarchy',
        responsibleAgencySheetName: 'ResponsibleAgency',
        integrationSheetName: 'Integration',
        compareSheetName: 'Compare',
        unitSheetName: 'Unit',
        permissions: DEFAULT_ROLE_PERMISSIONS,
        databaseGid: '0',
        hierarchyGid: '',
        responsibleAgencyGid: '',
        integrationGid: '',
        compareGid: '',
        unitGid: '',
        permissionsGid: '',
        regionGid: '',
        reportStructureGid: ''
    };

    if (stored) {
        const parsed = JSON.parse(stored);
        let permissions = parsed.permissions || parsed.rolePermissions || defaults.permissions;
        
        if (!permissions || Object.keys(permissions).length === 0) {
            permissions = defaults.permissions;
        } else {
            if (!permissions['admin']) {
                permissions = { ...permissions, 'admin': defaults.permissions['admin'] };
            }
        }

        return { ...defaults, ...parsed, permissions };
    }
    return defaults;
};

export const saveSettings = (settings: AppSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export class DataService {
    private records: BudgetRecord[] = [];
    private dropdowns: DropdownOptions = INITIAL_DROPDOWN_DATA;
    private hierarchy: HierarchyData[] = INITIAL_HIERARCHY;
    private respData: ResponsibleAgencyData[] = INITIAL_RESP_DATA;
    private compareData: CompareRecord[] = INITIAL_COMPARE_DATA;
    private users: User[] = INITIAL_USERS;
    private reportStructure: ReportNode[] = [];
    private regionData: RegionData[] = INITIAL_REGION_DATA;
    
    private listeners: (() => void)[] = [];

    public subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }

    private fieldVisibility: FieldVisibility = {
        integration: true, mainAgency: true, province: true, responsibleAgency: true,
        integrationArea: true, activity: true, target: true, unit: true,
        salaryPermanent: true, governmentCompensation: true, compensationSupplies: true,
        contractEmployees: true, utilities: true, equipment: true, landConstruction: true,
        subsidies: true, otherExpenses: true
    };

    private tableColumnVisibility: FieldVisibility = {
        integration: true, mainAgency: true, province: true, responsibleAgency: true,
        integrationArea: true, activity: true, target: true, unit: true,
        salaryPermanent: true, governmentCompensation: true, compensationSupplies: true,
        contractEmployees: true, utilities: true, equipment: true, landConstruction: true,
        subsidies: true, otherExpenses: true, timestamp: true
    };

    private syncPromise: Promise<boolean> | null = null;

    constructor() {
        this.loadFromCache();
        this.fetchUsersFromFirestore();
    }

    private sortIntegrationData(list: string[]): string[] {
        return [...list].sort((a, b) => {
            const idxA = INTEGRATION_PRIORITY.indexOf(a);
            const idxB = INTEGRATION_PRIORITY.indexOf(b);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b, 'th');
        });
    }

    private loadFromCache() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            this.records = parsed.records || INITIAL_BUDGET_RECORDS;
            this.dropdowns = parsed.dropdowns || INITIAL_DROPDOWN_DATA;
            this.dropdowns.integration = this.sortIntegrationData(this.dropdowns.integration);
            
            this.hierarchy = parsed.hierarchy || INITIAL_HIERARCHY;
            this.respData = parsed.respData || INITIAL_RESP_DATA;
            this.compareData = parsed.compareData || INITIAL_COMPARE_DATA;
            this.users = parsed.users || INITIAL_USERS;
            this.fieldVisibility = parsed.fieldVisibility || this.fieldVisibility;
            this.tableColumnVisibility = parsed.tableColumnVisibility || this.tableColumnVisibility;
            this.reportStructure = parsed.reportStructure || [];
            this.regionData = parsed.regionData || INITIAL_REGION_DATA;
        }
    }

    private saveToCache() {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            records: this.records,
            dropdowns: this.dropdowns,
            hierarchy: this.hierarchy,
            respData: this.respData,
            compareData: this.compareData,
            users: this.users,
            fieldVisibility: this.fieldVisibility,
            tableColumnVisibility: this.tableColumnVisibility,
            reportStructure: this.reportStructure,
            regionData: this.regionData
        }));
        this.notifyListeners();
    }

    private getValueByAliases(obj: any, aliases: string[]): any {
        if (!obj) return undefined;
        
        // Build a normalized lookup map for the object's keys
        const normalizedObj: any = {};
        for (const key of Object.keys(obj)) {
            // Remove BOM, trim whitespace, and lowercase for robust matching
            const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase();
            normalizedObj[cleanKey] = obj[key];
        }
        
        for (const alias of aliases) {
            const cleanAlias = alias.replace(/^\uFEFF/, '').trim().toLowerCase();
            if (normalizedObj[cleanAlias] !== undefined && normalizedObj[cleanAlias] !== null) {
                return normalizedObj[cleanAlias];
            }
        }
        
        // Direct fallback matches in case key mapping has unexpected behavior
        for (const alias of aliases) {
            if (obj[alias] !== undefined && obj[alias] !== null) return obj[alias];
        }
        return undefined;
    }

    private normalizeRecord(raw: any): BudgetRecord {
        const getStr = (aliases: string[]) => String(this.getValueByAliases(raw, aliases) || '');
        const getNum = (aliases: string[]) => {
            const val = this.getValueByAliases(raw, aliases);
            return typeof val === 'number' ? val : parseNumber(String(val || 0));
        };

        return {
            id: getStr(['id', 'ID', 'ลำดับ', 'รหัส']),
            integration: getStr(['integration', 'บูรณาการ', 'ประเภทหน่วยงาน', 'ประเภท']),
            mainAgency: getStr(['mainAgency', 'หน่วยงานหลัก', 'สังกัด']),
            province: getStr(['province', 'จังหวัด']),
            responsibleAgency: getStr(['responsibleAgency', 'หน่วยปฏิบัติ', 'หน่วยงานบูรณาการ', 'หน่วยงานรับผิดชอบ']),
            integrationArea: getStr(['integrationArea', 'พื้นที่ดำเนินการ', 'พื้นที่บูรณาการ', 'พื้นที่']),
            activity: getStr(['activity', 'กิจกรรม', 'ชื่อกิจกรรม']),
            target: getStr(['target', 'เป้าหมาย']),
            unit: getStr(['unit', 'หน่วยนับ']),
            salaryPermanent: getNum(['salaryPermanent', 'เงินเดือนและค่าจ้างประจำ', 'เงินเดือน']),
            governmentCompensation: getNum(['governmentCompensation', 'ค่าตอบแทนพนักงานราชการ', 'ค่าตอบแทน']),
            compensationSupplies: getNum(['compensationSupplies', 'ค่าตอบแทน ใช้สอย และวัสดุ', 'ค่าใช้สอย']),
            contractEmployees: getNum(['contractEmployees', 'ค่าจ้างเหมาพนักงาน', 'จ้างเหมา']),
            utilities: getNum(['utilities', 'ค่าสาธารณูปโภค']),
            equipment: getNum(['equipment', 'ค่าครุภัณฑ์']),
            landConstruction: getNum(['landConstruction', 'ค่าที่ดินและสิ่งก่อสร้าง', 'สิ่งก่อสร้าง']),
            subsidies: getNum(['subsidies', 'งบเงินอุดหนุน', 'เงินอุดหนุน']),
            otherExpenses: getNum(['otherExpenses', 'งบรายจ่ายอื่น', 'รายจ่ายอื่น']),
            timestamp: getStr(['timestamp', 'วันที่บันทึก', 'เวลา'])
        };
    }

    private async sendToGas(action: string, payload: any): Promise<{ success: boolean; message?: string }> {
        const settings = getSettings();
        if (!settings.gasUrl) return { success: false, message: 'กรุณาตั้งค่า URL ของ Google Apps Script' };

        const mappedData: any = { ...payload.data };
        
        if (payload.data) {
            Object.keys(FIELD_LABELS).forEach(key => {
                const label = FIELD_LABELS[key];
                const value = payload.data[key];
                if (value !== undefined) {
                    mappedData[label] = value;
                }
            });

            if (payload.data.integration) {
                mappedData['บูรณาการ'] = payload.data.integration;
                mappedData['บูรณาการ (ประเภทหน่วยงาน)'] = payload.data.integration;
                mappedData['ประเภทหน่วยงาน'] = payload.data.integration;
            }

            if (payload.data.responsibleAgency) {
                mappedData['หน่วยงานบูรณาการ'] = payload.data.responsibleAgency;
                mappedData['หน่วยงานรับผิดชอบ'] = payload.data.responsibleAgency;
            }

            if (payload.data.integrationArea) {
                mappedData['พื้นที่บูรณาการ'] = payload.data.integrationArea;
                mappedData['พื้นที่'] = payload.data.integrationArea;
            }

            if (payload.data.id) {
                mappedData['ID'] = payload.data.id;
                mappedData['id'] = payload.data.id;
                mappedData['ลำดับ'] = payload.data.id;
            }

            if (payload.data.oldActivity) {
                mappedData['oldActivity'] = payload.data.oldActivity;
                mappedData['กิจกรรมเดิม'] = payload.data.oldActivity;
                mappedData['ชื่อกิจกรรมเดิม'] = payload.data.oldActivity;
            }
        }

        const finalPayload = {
            action,
            sheetsId: settings.sheetsId,
            databaseSheetName: settings.databaseSheetName,
            dataSheetName: settings.dataSheetName,
            hierarchySheetName: settings.hierarchySheetName,
            responsibleAgencySheetName: settings.responsibleAgencySheetName,
            integrationSheetName: settings.integrationSheetName,
            compareSheetName: settings.compareSheetName,
            unitSheetName: settings.unitSheetName,
            ...payload,
            data: mappedData,
            id: payload.id || payload.data?.id
        };

        try {
            const response = await fetch(settings.gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(finalPayload)
            });
            
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') return { success: true };
            return { success: false, message: result.message || 'Unknown error' };
        } catch (e: any) {
            console.error('[GAS Connection Failed]', e);
            return { success: false, message: e.message };
        }
    }

    getRecords() { return this.records; }
    getDropdowns() { return this.dropdowns; }
    getHierarchy() { return this.hierarchy; }
    getResponsibleData() { return this.respData; }
    getCompareData() { return this.compareData; }
    getUsers() { return this.users; }
    getFieldVisibility() { return this.fieldVisibility; }
    getTableColumnVisibility() { return this.tableColumnVisibility; }
    getRegionData() { return this.regionData; }

    // --- Report Structure Management ---
    getReportStructure(): ReportNode[] {
        if (this.reportStructure.length === 0) {
            return this.reportStructure;
        }
        return this.reportStructure;
    }

    setReportStructure(structure: ReportNode[]) {
        this.reportStructure = structure;
        this.saveToCache();
    }
    
    async saveReportStructureToCloud(structure: ReportNode[]): Promise<{ success: boolean; message?: string }> {
        return await this.sendToGas('SAVE_REPORT_STRUCTURE', { structure: structure });
    }

    async addRecord(record: BudgetRecord): Promise<{ success: boolean; message?: string }> {
        // Optimistic UI: Update local state immediately
        const previousRecords = [...this.records];
        this.records = [...this.records, record];
        this.saveToCache();

        try {
            const result = await this.sendToGas('MANAGE_RECORD', { type: 'add', data: record });
            if (!result.success) {
                // Revert on failure
                this.records = previousRecords;
                this.saveToCache();
            }
            return result;
        } catch (error) {
            // Revert on error
            this.records = previousRecords;
            this.saveToCache();
            return { success: false, message: 'Failed to add record' };
        }
    }

    async updateRecord(updated: BudgetRecord): Promise<{ success: boolean; message?: string }> {
        // Optimistic UI: Update local state immediately
        const previousRecords = [...this.records];
        this.records = this.records.map(r => r.id === updated.id ? updated : r);
        this.saveToCache();

        try {
            const result = await this.sendToGas('MANAGE_RECORD', { type: 'update', data: updated, id: updated.id });
            if (!result.success) {
                // Revert on failure
                this.records = previousRecords;
                this.saveToCache();
            }
            return result;
        } catch (error) {
            // Revert on error
            this.records = previousRecords;
            this.saveToCache();
            return { success: false, message: 'Failed to update record' };
        }
    }

    async deleteRecord(id: string): Promise<{ success: boolean; message?: string }> {
        // Optimistic UI: Update local state immediately
        const previousRecords = [...this.records];
        this.records = this.records.filter(r => r.id !== id);
        this.saveToCache();

        try {
            const result = await this.sendToGas('MANAGE_RECORD', { type: 'delete', id: id });
            if (!result.success) {
                // Revert on failure
                this.records = previousRecords;
                this.saveToCache();
            }
            return result;
        } catch (error) {
            // Revert on error
            this.records = previousRecords;
            this.saveToCache();
            return { success: false, message: 'Failed to delete record' };
        }
    }

    checkDuplicate(record: Partial<BudgetRecord>): boolean {
        return this.records.some(existing => {
            if (record.id && existing.id === record.id) return false;
            
            // 1. Base Check (Required Fields *)
            const baseMatch = 
                (existing.integration || '').trim() === (record.integration || '').trim() &&
                (existing.mainAgency || '').trim() === (record.mainAgency || '').trim() &&
                (existing.province || '').trim() === (record.province || '').trim() &&
                (existing.activity || '').trim() === (record.activity || '').trim();

            if (!baseMatch) return false;

            // 2. Conditional Checks
            // If the new record has a value for responsibleAgency, it must match the existing record
            if ((record.responsibleAgency || '').trim() !== '') {
                if ((existing.responsibleAgency || '').trim() !== (record.responsibleAgency || '').trim()) {
                    return false;
                }
            }

            // If the new record has a value for integrationArea, it must match the existing record
            if ((record.integrationArea || '').trim() !== '') {
                if ((existing.integrationArea || '').trim() !== (record.integrationArea || '').trim()) {
                    return false;
                }
            }

            return true;
        });
    }

    toggleFieldVisibility(field: string) {
        this.fieldVisibility = { ...this.fieldVisibility, [field]: !this.fieldVisibility[field] };
        this.saveToCache();
    }

    setAllFieldsVisibility(visible: boolean) {
        const newVisibility: FieldVisibility = {};
        Object.keys(this.fieldVisibility).forEach(key => {
            newVisibility[key] = visible;
        });
        this.fieldVisibility = newVisibility;
        this.saveToCache();
    }

    toggleTableColumnVisibility(field: string) {
        this.tableColumnVisibility = { ...this.tableColumnVisibility, [field]: !this.tableColumnVisibility[field] };
        this.saveToCache();
    }

    setAllTableColumnsVisibility(visible: boolean) {
        const newVisibility: FieldVisibility = {};
        Object.keys(this.tableColumnVisibility).forEach(key => {
            newVisibility[key] = visible;
        });
        this.tableColumnVisibility = newVisibility;
        this.saveToCache();
    }

    private updateDerivedDropdowns() {
        const unique = (arr: any[]) => Array.from(new Set(arr.filter(item => item && item.trim() !== '')));
        
        // 1. Get initial order from hierarchy
        const hierarchyMainAgencies = unique(this.hierarchy.map(h => h.mainAgency));
        const hierarchyProvinces = unique(this.hierarchy.map(h => h.province));
        
        // 2. Supplement with values from records (preserving order of appearance)
        const recordsMainAgencies = unique(this.records.map(r => r.mainAgency));
        const recordsProvinces = unique(this.records.map(r => r.province));
        
        // 3. Combine: Hierarchy first, then records (only those not in hierarchy)
        this.dropdowns.mainAgency = unique([...hierarchyMainAgencies, ...recordsMainAgencies]);
        this.dropdowns.province = unique([...hierarchyProvinces, ...recordsProvinces]);
        
        // 4. Responsible Agency and Integration Area from respData
        const respAgencies = unique(this.respData.map(r => r.responsibleAgency));
        const recordRespAgencies = unique(this.records.map(r => r.responsibleAgency));
        this.dropdowns.responsibleAgency = unique([...respAgencies, ...recordRespAgencies]);
        
        const intAreas = unique(this.respData.map(r => r.integrationArea));
        const recordIntAreas = unique(this.records.map(r => r.integrationArea));
        this.dropdowns.integrationArea = unique([...intAreas, ...recordIntAreas]);
        
        this.dropdowns.activity = unique(this.compareData.map(c => c.activity));
        
        // Supplement integration and unit from records to ensure they are never empty if data exists
        const integrationFromRecords = unique(this.records.map(r => r.integration));
        // Note: sortIntegrationData handles its own priority list
        this.dropdowns.integration = this.sortIntegrationData(unique([...this.dropdowns.integration, ...integrationFromRecords]));
        
        const unitsFromRecords = unique(this.records.map(r => r.unit));
        // Remove .sort() to preserve order of appearance if not in predefined list
        this.dropdowns.unit = unique([...this.dropdowns.unit, ...unitsFromRecords]);
    }

    async addHierarchyItem(mainAgency: string, province: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Hierarchy', type: 'add', data: { mainAgency, province } });
        if (result.success) {
            this.hierarchy.push({ mainAgency, province });
            this.updateDerivedDropdowns();
            this.saveToCache();
        }
        return result;
    }

    async updateHierarchyItem(oldMain: string, oldProv: string, newMain: string, newProv: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Hierarchy', type: 'update', data: { mainAgency: newMain, province: newProv, oldMainAgency: oldMain, oldProvince: oldProv } });
        if (result.success) {
            const idx = this.hierarchy.findIndex(h => h.mainAgency === oldMain && h.province === oldProv);
            if (idx !== -1) {
                this.hierarchy[idx] = { mainAgency: newMain, province: newProv };
                this.updateDerivedDropdowns();
                this.saveToCache();
            }
        }
        return result;
    }

    async deleteHierarchyItem(main: string, prov: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Hierarchy', type: 'delete', data: { mainAgency: main, province: prov } });
        if (result.success) {
            this.hierarchy = this.hierarchy.filter(h => !(h.mainAgency === main && h.province === prov));
            this.updateDerivedDropdowns();
            this.saveToCache();
        }
        return result;
    }

    async addResponsibleAgency(mainAgency: string, responsibleAgency: string, integrationArea: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'ResponsibleAgency', type: 'add', data: { mainAgency, responsibleAgency, integrationArea } });
        if (result.success) {
            this.respData.push({ mainAgency, responsibleAgency, integrationArea });
            this.updateDerivedDropdowns();
            this.saveToCache();
        }
        return result;
    }

    async updateResponsibleAgency(main: string, oldResp: string, oldArea: string, newResp: string, newArea: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'ResponsibleAgency', type: 'update', data: { mainAgency: main, responsibleAgency: newResp, integrationArea: newArea, oldResponsibleAgency: oldResp, oldIntegrationArea: oldArea } });
        if (result.success) {
            const idx = this.respData.findIndex(r => r.mainAgency === main && r.responsibleAgency === oldResp && r.integrationArea === oldArea);
            if (idx !== -1) {
                this.respData[idx] = { mainAgency: main, responsibleAgency: newResp, integrationArea: newArea };
                this.updateDerivedDropdowns();
                this.saveToCache();
            }
        }
        return result;
    }

    async deleteResponsibleAgency(main: string, resp: string, area: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'ResponsibleAgency', type: 'delete', data: { mainAgency: main, responsibleAgency: resp, integrationArea: area } });
        if (result.success) {
            this.respData = this.respData.filter(r => !(r.mainAgency === main && r.responsibleAgency === resp && r.integrationArea === area));
            this.updateDerivedDropdowns();
            this.saveToCache();
        }
        return result;
    }

    async addActivity(name: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { 
            target: 'Compare', 
            type: 'add', 
            data: { activity: name, referenceBudget: 0, 'กิจกรรม': name, 'งบอ้างอิง': 0 } 
        });
        if (result.success) {
            this.compareData.push({ id: name, activity: name, referenceBudget: 0 });
            this.updateDerivedDropdowns();
            this.saveToCache();
        }
        return result;
    }

    async updateActivity(old: string, newName: string) {
        const record = this.compareData.find(c => c.activity === old);
        if (record) {
            const result = await this.sendToGas('MANAGE_MASTER', { 
                target: 'Compare', 
                type: 'update', 
                data: { activity: newName, oldActivity: old, referenceBudget: record.referenceBudget, 'กิจกรรม': newName, 'กิจกรรมเดิม': old, 'งบอ้างอิง': record.referenceBudget } 
            });
            if (result.success) {
                record.activity = newName;
                this.records = this.records.map(r => r.activity === old ? { ...r, activity: newName } : r);
                this.updateDerivedDropdowns();
                this.saveToCache();
            }
            return result;
        }
        return { success: false, message: 'Activity not found' };
    }

    async updateCompareData(id: string, newActivity: string, newBudget: number) {
        const idx = this.compareData.findIndex(c => c.id === id || c.activity === id);
        if (idx !== -1) {
            const old = this.compareData[idx].activity;
            const result = await this.sendToGas('MANAGE_MASTER', { 
                target: 'Compare', 
                type: 'update', 
                data: { activity: newActivity, oldActivity: old, referenceBudget: newBudget, 'กิจกรรม': newActivity, 'กิจกรรมเดิม': old, 'งบอ้างอิง': newBudget } 
            });
            if (result.success) {
                this.compareData[idx].activity = newActivity;
                this.compareData[idx].referenceBudget = newBudget;
                if (old !== newActivity) {
                    this.records = this.records.map(r => r.activity === old ? { ...r, activity: newActivity } : r);
                }
                this.updateDerivedDropdowns();
                this.saveToCache();
            }
            return result;
        }
        return { success: false, message: 'Data not found' };
    }

    async deleteActivity(name: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { 
            target: 'Compare', 
            type: 'delete', 
            data: { activity: name, 'กิจกรรม': name } 
        });
        if (result.success) {
            this.compareData = this.compareData.filter(c => c.activity !== name);
            this.updateDerivedDropdowns();
            this.saveToCache();
        }
        return result;
    }

    async addUnit(name: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Unit', type: 'add', data: { name, 'ชื่อ': name, 'หน่วยนับ': name } });
        if (result.success) {
            this.dropdowns.unit = Array.from(new Set([...this.dropdowns.unit, name]));
            this.saveToCache();
        }
        return result;
    }

    async updateUnit(old: string, newName: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Unit', type: 'update', data: { name: newName, oldName: old, 'ชื่อ': newName, 'ชื่อเดิม': old, 'หน่วยนับ': newName } });
        if (result.success) {
            this.dropdowns.unit = this.dropdowns.unit.map(u => u === old ? newName : u);
            this.saveToCache();
        }
        return result;
    }

    async deleteUnit(name: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Unit', type: 'delete', data: { name, 'ชื่อ': name, 'หน่วยนับ': name } });
        if (result.success) {
            this.dropdowns.unit = this.dropdowns.unit.filter(u => u !== name);
            this.saveToCache();
        }
        return result;
    }

    async addIntegration(name: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Integration', type: 'add', data: { name, 'ชื่อ': name, 'รายการบูรณาการ': name } });
        if (result.success) {
            const newList = Array.from(new Set([...this.dropdowns.integration, name]));
            this.dropdowns.integration = this.sortIntegrationData(newList);
            this.saveToCache();
        }
        return result;
    }

    async updateIntegration(old: string, newName: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Integration', type: 'update', data: { name: newName, oldName: old, 'ชื่อ': newName, 'ชื่อเดิม': old, 'รายการบูรณาการ': newName } });
        if (result.success) {
            const newList = this.dropdowns.integration.map(i => i === old ? newName : i);
            this.dropdowns.integration = this.sortIntegrationData(newList);
            this.saveToCache();
        }
        return result;
    }

    async deleteIntegration(name: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Integration', type: 'delete', data: { name, 'ชื่อ': name, 'รายการบูรณาการ': name } });
        if (result.success) {
            const newList = this.dropdowns.integration.filter(i => i !== name);
            this.dropdowns.integration = this.sortIntegrationData(newList);
            this.saveToCache();
        }
        return result;
    }

    // --- Region Management ---
    async addRegion(regionName: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Region', type: 'add', data: { regionName, provinces: [] } });
        // Always persist locally for now, assuming backend sync might be optional or eventual
        if (result.success || true) { 
            this.regionData.push({ regionName, provinces: [] });
            this.saveToCache();
            return { success: true };
        }
        return result;
    }

    async updateRegion(oldName: string, newName: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Region', type: 'update', data: { regionName: newName, oldRegionName: oldName } });
        if (result.success || true) {
            const idx = this.regionData.findIndex(r => r.regionName === oldName);
            if (idx !== -1) {
                this.regionData[idx].regionName = newName;
                this.saveToCache();
            }
            return { success: true };
        }
        return result;
    }

    async deleteRegion(regionName: string) {
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Region', type: 'delete', data: { regionName } });
        if (result.success || true) {
            this.regionData = this.regionData.filter(r => r.regionName !== regionName);
            this.saveToCache();
            return { success: true };
        }
        return result;
    }

    async addProvinceToRegion(regionName: string, province: string) {
        const region = this.regionData.find(r => r.regionName === regionName);
        if (!region) return { success: false, message: 'Region not found' };
        
        if (region.provinces.includes(province)) return { success: false, message: 'Province already exists in this region' };

        const newProvinces = [...region.provinces, province];
        // Note: For complex nested updates, we might send the whole array to GAS or a specific add-item action
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Region', type: 'updateProvinces', data: { regionName, provinces: newProvinces } });
        
        if (result.success || true) {
            region.provinces = newProvinces;
            this.saveToCache();
            return { success: true };
        }
        return result;
    }

    async removeProvinceFromRegion(regionName: string, province: string) {
        const region = this.regionData.find(r => r.regionName === regionName);
        if (!region) return { success: false, message: 'Region not found' };

        const newProvinces = region.provinces.filter(p => p !== province);
        const result = await this.sendToGas('MANAGE_MASTER', { target: 'Region', type: 'updateProvinces', data: { regionName, provinces: newProvinces } });
        
        if (result.success || true) {
            region.provinces = newProvinces;
            this.saveToCache();
            return { success: true };
        }
        return result;
    }

    async fetchUsersFromFirestore(): Promise<void> {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const fetchedUsers: User[] = [];
            querySnapshot.forEach((doc) => {
                const u = doc.data() as User;
                fetchedUsers.push({ ...u, username: doc.id });
            });
            
            if (fetchedUsers.length === 0) {
                console.log('No users found in Firestore. Seeding initial users...');
                for (const u of INITIAL_USERS) {
                    await setDoc(doc(db, "users", u.username), u);
                }
                this.users = INITIAL_USERS;
            } else {
                this.users = fetchedUsers;
            }
            this.saveToCache();
        } catch (error) {
            console.error("Error fetching users from Firestore: ", error);
        }
    }

    async addUser(user: User): Promise<{ success: boolean; message?: string }> {
        try {
            const docRef = doc(db, "users", user.username);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
            }
            await setDoc(docRef, user);
            this.users.push(user);
            this.saveToCache();
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    async updateUser(oldUsername: string, updatedUser: User): Promise<{ success: boolean; message?: string }> {
        try {
            if (oldUsername !== updatedUser.username) {
                 const newDocRef = doc(db, "users", updatedUser.username);
                 const newDocSnap = await getDoc(newDocRef);
                 if (newDocSnap.exists()) {
                     return { success: false, message: 'ชื่อผู้ใช้ใหม่ซ้ำกับที่มีอยู่แล้ว' };
                 }
                 await setDoc(newDocRef, updatedUser);
                 await deleteDoc(doc(db, "users", oldUsername));
            } else {
                await updateDoc(doc(db, "users", oldUsername), { ...updatedUser });
            }

            const idx = this.users.findIndex(u => u.username === oldUsername);
            if (idx !== -1) {
                this.users[idx] = updatedUser;
                this.saveToCache();
            }
            return { success: true };
        } catch (e: any) {
             return { success: false, message: e.message };
        }
    }

    async deleteUser(username: string): Promise<{ success: boolean; message?: string }> {
        try {
            await deleteDoc(doc(db, "users", username));
            this.users = this.users.filter(u => u.username !== username);
            this.saveToCache();
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    async savePermissionsToCloud(): Promise<{ success: boolean; message?: string }> {
        const settings = getSettings();
        return await this.sendToGas('SAVE_PERMISSIONS', { rolePermissions: settings.permissions });
    }

    // --- GLOBAL SETTINGS MANAGEMENT (FIRESTORE) ---
    async fetchGlobalSettings(): Promise<void> {
        try {
            const docRef = doc(db, "settings", "config");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                const current = getSettings();
                // Merge: Cloud takes precedence over Local/Defaults for shared configs
                const newSettings = { ...current, ...cloudData };
                saveSettings(newSettings);
                console.log('Global settings synced from Firestore');
            } else {
                console.log('No global settings found in Firestore, using defaults.');
            }
        } catch (e: any) {
            if (e.message && e.message.includes('the client is offline')) {
                console.warn('Firestore is offline, using local settings.');
            } else {
                console.error('Error fetching global settings:', e);
            }
        }
    }

    async saveGlobalSettings(settings: AppSettings): Promise<{ success: boolean; message?: string }> {
        try {
            // Save to Firestore
            await setDoc(doc(db, "settings", "config"), settings);
            // Save locally
            saveSettings(settings);
            
            // Optionally sync permissions to GAS if configured
            if (settings.gasUrl) {
                this.sendToGas('SAVE_PERMISSIONS', { rolePermissions: settings.permissions }).catch(err => 
                    console.warn('Failed to sync permissions to GAS, but saved to Firestore:', err)
                );
            }
            
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    async syncDropdowns(): Promise<boolean> {
        if (this.syncPromise) {
            return this.syncPromise;
        }

        const settings = getSettings();
        const getCsvUrl = (gid: string) => `https://docs.google.com/spreadsheets/d/${settings.sheetsId}/export?format=csv&gid=${gid}&t=${Date.now()}`;

        this.syncPromise = (async () => {
            try {
                // 1. Prepare CSV Promises
                const csvPromises: Record<string, Promise<string | null>> = {};
                if (settings.databaseGid) csvPromises.database = fetch(getCsvUrl(settings.databaseGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.hierarchyGid) csvPromises.hierarchy = fetch(getCsvUrl(settings.hierarchyGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.responsibleAgencyGid) csvPromises.respData = fetch(getCsvUrl(settings.responsibleAgencyGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.compareGid) csvPromises.compareData = fetch(getCsvUrl(settings.compareGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.integrationGid) csvPromises.integration = fetch(getCsvUrl(settings.integrationGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.unitGid) csvPromises.unit = fetch(getCsvUrl(settings.unitGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.permissionsGid) csvPromises.permissions = fetch(getCsvUrl(settings.permissionsGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.regionGid) csvPromises.regionData = fetch(getCsvUrl(settings.regionGid)).then(r => r.ok ? r.text() : null).catch(() => null);
                if (settings.reportStructureGid) csvPromises.reportStructure = fetch(getCsvUrl(settings.reportStructureGid)).then(r => r.ok ? r.text() : null).catch(() => null);

                const gasPromise = settings.gasUrl ? fetch(settings.gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ 
                        action: 'GET_DATA',
                        sheetsId: settings.sheetsId,
                        databaseSheetName: settings.databaseSheetName,
                        dataSheetName: settings.dataSheetName,
                        hierarchySheetName: settings.hierarchySheetName,
                        responsibleAgencySheetName: settings.responsibleAgencySheetName,
                        integrationSheetName: settings.integrationSheetName,
                        compareSheetName: settings.compareSheetName,
                        unitSheetName: settings.unitSheetName
                    })
                }).then(r => r.ok ? r.json() : null).catch(err => {
                    console.warn('GAS Sync failed:', err);
                    return null;
                }) : Promise.resolve(null);

                // 2. Process CSV results as they come in
                const csvResults = await Promise.all(Object.entries(csvPromises).map(async ([key, promise]) => {
                    const csv = await promise;
                    if (!csv) return { key, data: null };
                    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true, dynamicTyping: false });
                    return { key, data: parsed.data };
                }));

                const csvSucceeded: Record<string, boolean> = {};
                let csvLoadedCount = 0;
                for (const res of csvResults) {
                    if (!res.data || res.data.length === 0) continue;
                    const data = res.data;
                    csvLoadedCount++;
                    csvSucceeded[res.key] = true;

                    switch (res.key) {
                        case 'database':
                            console.log(`[Fast Load] Loaded ${data.length} records from CSV`);
                            this.records = data.map((r: any) => this.normalizeRecord(r));
                            break;
                        case 'hierarchy':
                            this.hierarchy = data.map((r: any) => ({
                                mainAgency: String(this.getValueByAliases(r, ['mainAgency', 'หน่วยงานหลัก']) || ''),
                                province: String(this.getValueByAliases(r, ['province', 'จังหวัด']) || '')
                            }));
                            break;
                        case 'respData':
                            this.respData = data.map((r: any) => ({
                                mainAgency: String(this.getValueByAliases(r, ['mainAgency', 'หน่วยงานหลัก']) || ''),
                                responsibleAgency: String(this.getValueByAliases(r, ['responsibleAgency', 'หน่วยงานบูรณาการ']) || ''),
                                integrationArea: String(this.getValueByAliases(r, ['integrationArea', 'พื้นที่บูรณาการ']) || '')
                            }));
                            break;
                        case 'compareData':
                            this.compareData = data.map((r: any) => {
                                const activity = String(this.getValueByAliases(r, ['activity', 'กิจกรรม']) || '');
                                return {
                                    id: String(this.getValueByAliases(r, ['id', 'ID']) || activity),
                                    activity,
                                    referenceBudget: parseNumber(String(this.getValueByAliases(r, ['referenceBudget', 'งบอ้างอิง', 'งบประมาณ']) || 0))
                                };
                            });
                            break;
                        case 'integration': {
                            const items = data.map((r: any) => {
                                let val = this.getValueByAliases(r, ['name', 'ชื่อ', 'รายการบูรณาการ', 'บูรณาการ', 'ประเภทหน่วยงาน', 'ประเภท']);
                                if (!val) {
                                    const keys = Object.keys(r);
                                    if (keys.length > 0) {
                                        val = r[keys[0]];
                                    }
                                }
                                return String(val || '').trim();
                            }).filter(item => item !== '');

                            // Fallback: If no header was present, the first item might be inside the header key itself
                            const firstRow = data[0];
                            if (firstRow) {
                                const keys = Object.keys(firstRow);
                                if (keys.length > 0) {
                                    const cleanHeader = keys[0].replace(/^\uFEFF/, '').trim();
                                    if (cleanHeader && cleanHeader.length > 2 && !['name', 'ชื่อ', 'ประเภท', 'unit', 'หน่วยนับ', 'integration', 'บูรณาการ'].includes(cleanHeader.toLowerCase())) {
                                        items.push(cleanHeader);
                                    }
                                }
                            }

                            this.dropdowns.integration = this.sortIntegrationData(Array.from(new Set(items)));
                            break;
                        }
                        case 'unit': {
                            const uItems = data.map((r: any) => {
                                let val = this.getValueByAliases(r, ['name', 'ชื่อ', 'หน่วยนับ', 'Unit']);
                                if (!val) {
                                    const keys = Object.keys(r);
                                    if (keys.length > 0) {
                                        val = r[keys[0]];
                                    }
                                }
                                return String(val || '').trim();
                            }).filter(item => item !== '');

                            // Fallback: If no header was present, the first item might be inside the header key itself
                            const firstRow = data[0];
                            if (firstRow) {
                                const keys = Object.keys(firstRow);
                                if (keys.length > 0) {
                                    const cleanHeader = keys[0].replace(/^\uFEFF/, '').trim();
                                    if (cleanHeader && cleanHeader.length >= 1 && !['name', 'ชื่อ', 'ประเภท', 'unit', 'หน่วยนับ'].includes(cleanHeader.toLowerCase())) {
                                        uItems.push(cleanHeader);
                                    }
                                }
                            }

                            this.dropdowns.unit = Array.from(new Set(uItems)).sort();
                            break;
                        }
                        case 'permissions':
                            const perms: Record<string, string[]> = {};
                            data.forEach((r: any) => {
                                const role = String(this.getValueByAliases(r, ['role', 'Role', 'บทบาท']) || '');
                                const path = String(this.getValueByAliases(r, ['path', 'Path', 'เส้นทาง']) || '');
                                if (role && path) {
                                    if (!perms[role]) perms[role] = [];
                                    if (!perms[role].includes(path)) perms[role].push(path);
                                }
                            });
                            if (Object.keys(perms).length > 0) {
                                const current = getSettings();
                                saveSettings({ ...current, permissions: perms });
                            }
                            break;
                        case 'regionData':
                            try {
                                // Assuming regionData is stored as JSON in the first cell of the first row
                                // or as a flat list that we need to group. 
                                // For now, let's assume it's JSON in a column named 'data' or similar
                                const firstRow = data[0];
                                const rawData = this.getValueByAliases(firstRow, ['data', 'json', 'value', 'RegionData']);
                                if (rawData) {
                                    this.regionData = JSON.parse(rawData);
                                } else {
                                    // Fallback: Try to parse as flat list of Region, Province
                                    const regions: Record<string, string[]> = {};
                                    data.forEach((r: any) => {
                                        const reg = String(this.getValueByAliases(r, ['region', 'Region', 'ภูมิภาค']) || '');
                                        const prov = String(this.getValueByAliases(r, ['province', 'Province', 'จังหวัด']) || '');
                                        if (reg && prov) {
                                            if (!regions[reg]) regions[reg] = [];
                                            if (!regions[reg].includes(prov)) regions[reg].push(prov);
                                        }
                                    });
                                    if (Object.keys(regions).length > 0) {
                                        this.regionData = Object.entries(regions).map(([regionName, provinces]) => ({ regionName, provinces }));
                                    }
                                }
                            } catch (e) {
                                console.error('Failed to parse regionData from CSV', e);
                            }
                            break;
                        case 'reportStructure':
                            try {
                                const firstRow = data[0];
                                const rawData = this.getValueByAliases(firstRow, ['data', 'json', 'value', 'Structure']);
                                if (rawData) {
                                    this.reportStructure = JSON.parse(rawData);
                                }
                            } catch (e) {
                                console.error('Failed to parse reportStructure from CSV', e);
                            }
                            break;
                    }
                }

                if (csvLoadedCount > 0) {
                    this.updateDerivedDropdowns();
                    this.saveToCache();
                }

                // 3. Wait for GAS (Slow part, but provides full data and updates)
                const gasRes = await gasPromise;
                if (gasRes && gasRes.status === 'success' && gasRes.data) {
                    const s = gasRes.data;
                    
                    const normalizeH = (raw: any): HierarchyData => ({
                        mainAgency: String(this.getValueByAliases(raw, ['mainAgency', 'หน่วยงานหลัก']) || ''),
                        province: String(this.getValueByAliases(raw, ['province', 'จังหวัด']) || '')
                    });
                    
                    const normalizeR = (raw: any): ResponsibleAgencyData => ({
                        mainAgency: String(this.getValueByAliases(raw, ['mainAgency', 'หน่วยงานหลัก']) || ''),
                        responsibleAgency: String(this.getValueByAliases(raw, ['responsibleAgency', 'หน่วยงานบูรณาการ']) || ''),
                        integrationArea: String(this.getValueByAliases(raw, ['integrationArea', 'พื้นที่บูรณาการ']) || '')
                    });
                    
                    const normalizeC = (raw: any): CompareRecord => {
                        const activity = String(this.getValueByAliases(raw, ['activity', 'กิจกรรม']) || '');
                        return {
                            id: String(this.getValueByAliases(raw, ['id', 'ID']) || activity),
                            activity: activity,
                            referenceBudget: parseNumber(String(this.getValueByAliases(raw, ['referenceBudget', 'งบอ้างอิง', 'งบประมาณ']) || 0))
                        };
                    };
                    
                    // Only overwrite if CSV didn't load these or if GAS is considered more authoritative
                    if (!settings.hierarchyGid || !csvSucceeded['hierarchy']) {
                        if (s.hierarchy && s.hierarchy.length > 0) this.hierarchy = (s.hierarchy || []).map(normalizeH);
                    }
                    if (!settings.responsibleAgencyGid || !csvSucceeded['respData']) {
                        if (s.respData && s.respData.length > 0) this.respData = (s.respData || []).map(normalizeR);
                    }
                    if (!settings.compareGid || !csvSucceeded['compareData']) {
                        if (s.compareData && s.compareData.length > 0) this.compareData = (s.compareData || []).map(normalizeC);
                    }
                    
                    if (!settings.databaseGid || !csvSucceeded['database']) {
                        if (s.records && s.records.length > 0) {
                            this.records = (s.records || []).map((r: any) => this.normalizeRecord(r));
                        }
                    }
                    
                    if (!settings.permissionsGid || !csvSucceeded['permissions']) {
                        if (s.rolePermissions) {
                            const currentSettings = getSettings();
                            saveSettings({ ...currentSettings, permissions: s.rolePermissions });
                        }
                    }
                    
                    if (!settings.reportStructureGid || !csvSucceeded['reportStructure']) {
                        if (s.reportStructure) {
                            try {
                                const parsedStructure = typeof s.reportStructure === 'string' 
                                    ? JSON.parse(s.reportStructure) 
                                    : s.reportStructure;
                                this.reportStructure = parsedStructure;
                            } catch (e) {
                                console.error('Failed to parse report structure from GAS', e);
                            }
                        }
                    }

                    if (!settings.regionGid || !csvSucceeded['regionData']) {
                        if (s.regionData) {
                            try {
                                const parsedRegion = typeof s.regionData === 'string'
                                    ? JSON.parse(s.regionData)
                                    : s.regionData;
                                this.regionData = parsedRegion;
                            } catch (e) {
                                console.error('Failed to parse region data from GAS', e);
                            }
                        }
                    }
                    
                    if (!settings.integrationGid || !csvSucceeded['integration']) {
                        if (s.dropdowns?.integration) {
                            this.dropdowns.integration = this.sortIntegrationData(s.dropdowns.integration);
                        }
                    }
                    if (!settings.unitGid || !csvSucceeded['unit']) {
                        if (s.dropdowns?.unit) {
                            this.dropdowns.unit = s.dropdowns.unit;
                        }
                    }
                }

                this.updateDerivedDropdowns();
                this.saveToCache();
                return true;
            } catch (e: any) { 
                console.warn('Sync Error:', e.message); 
                return false;
            } finally {
                this.syncPromise = null;
            }
        })();

        return this.syncPromise;
    }

    async testConnection(): Promise<boolean> {
        const settings = getSettings();
        if (!settings.gasUrl) return false;
        try {
            const res = await fetch(settings.gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ 
                    action: 'TEST_CONNECTION',
                    sheetsId: settings.sheetsId 
                })
            });
            const json = await res.json();
            return json.status === 'success';
        } catch { return false; }
    }

    async login(username: string, password: string): Promise<User | null> {
        try {
            if (this.users.length === 0) {
                await this.fetchUsersFromFirestore();
            }
            let user = this.users.find(u => u.username === username && u.password === password);
            if (!user) {
                const docRef = doc(db, "users", username);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data() as User;
                    if (userData.password === password) {
                        user = { ...userData, username: docSnap.id };
                        const idx = this.users.findIndex(u => u.username === username);
                        if (idx === -1) this.users.push(user);
                        else this.users[idx] = user;
                        this.saveToCache();
                    }
                }
            }

            // Sync global settings on successful login
            if (user) {
                await this.fetchGlobalSettings();
            }

            return user ? { ...user } : null;
        } catch (e) {
            console.error('Login Error:', e);
            return null;
        }
    }
}

export function useDataSync() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const unsubscribe = dataService.subscribe(() => {
            setTick(t => t + 1);
        });
        return unsubscribe;
    }, []);
    return tick;
}

export const dataService = new DataService();
