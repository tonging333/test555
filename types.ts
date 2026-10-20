
export interface BudgetRecord {
    id: string;
    integration: string;
    mainAgency: string;
    province: string;
    responsibleAgency: string;
    integrationArea: string;
    activity: string;
    target: string;
    unit: string;
    salaryPermanent: number;
    governmentCompensation: number;
    compensationSupplies: number;
    contractEmployees: number;
    utilities: number;
    equipment: number;
    landConstruction: number;
    subsidies: number;
    otherExpenses: number;
    timestamp: string;
}

export interface AppSettings {
    gasUrl: string;
    sheetsId: string;
    dataSheetName: string;
    databaseSheetName: string;
    hierarchySheetName: string;
    responsibleAgencySheetName: string;
    integrationSheetName: string;
    compareSheetName: string;
    unitSheetName: string;
    permissions: Record<string, string[]>; // key can be UserRole or Username
    // GID fields for CSV fetching
    databaseGid?: string;
    hierarchyGid?: string;
    responsibleAgencyGid?: string;
    integrationGid?: string;
    compareGid?: string;
    unitGid?: string;
    permissionsGid?: string;
    regionGid?: string;
    reportStructureGid?: string;
}

export interface DropdownOptions {
    integration: string[];
    mainAgency: string[];
    responsibleAgency: string[];
    integrationArea: string[];
    province: string[];
    activity: string[];
    unit: string[];
}

// Helper to map Main Agency -> Province
export interface HierarchyData {
    mainAgency: string;
    province: string;
}

// Helper to map Main Agency -> Responsible Agency -> Integration Area
export interface ResponsibleAgencyData {
    mainAgency: string;
    responsibleAgency: string;
    integrationArea: string;
}

// Helper for Region -> Provinces
export interface RegionData {
    regionName: string;
    provinces: string[];
}

export interface CompareRecord {
    id: string;
    activity: string;
    referenceBudget: number;
}

export interface FieldVisibility {
    [key: string]: boolean;
}

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
    username: string;
    password?: string; // Added password field for storage/management
    name: string;
    role: UserRole;
    token?: string;
}

// New Interface for Report Structure
export interface ReportNode {
    id: string; // Unique ID for drag and drop
    title: string;
    type: 'plan' | 'output' | 'project' | 'activity' | 'subactivity' | 'group' | 'subgroup'; // Added output/project/subactivity
    activityMatcher?: string; // If this is an activity line, what DB activity name matches it?
    children?: ReportNode[];
    collapsed?: boolean; // For UI state
}