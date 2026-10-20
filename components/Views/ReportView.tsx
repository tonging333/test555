import React, { useState, useMemo, useEffect, useRef } from 'react';
import { dataService, useDataSync } from '../../services/dataService';
import { formatNumber, parseNumber } from '../../utils';
import { Printer, Filter, CheckCircle2, Circle, AlertCircle, Edit2, Download, FileSpreadsheet, FileText, ChevronDown, RefreshCw, ArrowRightLeft, LayoutList, LayoutGrid, X } from 'lucide-react';
import { BudgetRecord, ReportNode } from '../../types';
import AutocompleteInput from '../Form/AutocompleteInput';
import MultiSelectDropdown from '../Form/MultiSelectDropdown';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportMode = 'full' | 'summary' | 'province' | 'agency' | 'integration' | 'integration-detailed';

const ReportView: React.FC = () => {
    useDataSync(); // Force re-render when data changes
    const records = dataService.getRecords();
    const dropdowns = dataService.getDropdowns();
    const regionData = dataService.getRegionData();
    const respData = dataService.getResponsibleData();
    
    // UI States
    const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false); // Default hidden
    const [filterOverflow, setFilterOverflow] = useState(false);
    
    // Structure State
    const [reportHierarchy, setReportHierarchy] = useState<ReportNode[]>([]);
    
    // Custom Report Title State
    const [reportTitle, setReportTitle] = useState(() => {
        return localStorage.getItem('customReportTitle') || 'การจัดสรรงบประมาณกระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม ประจำปี พ.ศ. 2569';
    });

    // Extract year from title
    const budgetYear = useMemo(() => {
        const match = reportTitle.match(/พ\.ศ\.\s*(\d{4})/) || reportTitle.match(/(\d{4})/);
        return match ? match[1] : '2569';
    }, [reportTitle]);
    
    useEffect(() => {
        const structure = dataService.getReportStructure();
        if (structure && structure.length > 0) {
             setReportHierarchy(structure);
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDownloadDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter State
    const [selectedMainAgencies, setSelectedMainAgencies] = useState<string[]>([]);
    const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedResponsibleAgencies, setSelectedResponsibleAgencies] = useState<string[]>([]);
    const [selectedIntegrationAreas, setSelectedIntegrationAreas] = useState<string[]>([]);
    
    const [reportMode, setReportMode] = useState<ReportMode>('full');

    // Reset province when region changes
    useEffect(() => {
        if (selectedRegions.length > 0) setSelectedProvinces([]);
    }, [selectedRegions]);

    // Reset Responsible Agency and Integration Area when Main Agency changes
    useEffect(() => {
        if (selectedMainAgencies.length > 0) {
            setSelectedResponsibleAgencies([]);
            setSelectedIntegrationAreas([]);
        }
    }, [selectedMainAgencies]);

    // Reset Integration Area when Responsible Agency changes
    useEffect(() => {
        if (selectedResponsibleAgencies.length > 0) {
            setSelectedIntegrationAreas([]);
        }
    }, [selectedResponsibleAgencies]);

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

    const handleClearFilters = () => {
        setSelectedMainAgencies([]);
        setSelectedIntegrations([]);
        setSelectedActivities([]);
        setSelectedRegions([]);
        setSelectedProvinces([]);
        setSelectedResponsibleAgencies([]);
        setSelectedIntegrationAreas([]);
    };

    // --- Dynamic Filter Options Logic (Show only existing data) ---

    // Helper: Get unique values from records that exist in database
    const getRecordValues = (key: keyof BudgetRecord, filter?: (r: BudgetRecord) => boolean) => {
        const source = filter ? records.filter(filter) : records;
        return new Set(source.map(r => r[key] as string).filter(v => v && v.trim() !== ''));
    };

    // Helper: Sort based on predefined list + extras
    const getSortedOptions = (presentValues: Set<string>, predefinedList: string[]) => {
        const fromPredefined = predefinedList.filter(item => presentValues.has(item));
        const extras = Array.from(presentValues).filter(item => !predefinedList.includes(item));
        return [...fromPredefined, ...extras];
    };

    const mainAgencyOptions = useMemo(() => {
        return getSortedOptions(getRecordValues('mainAgency'), dropdowns.mainAgency);
    }, [records, dropdowns.mainAgency]);

    const integrationOptions = useMemo(() => {
        return getSortedOptions(getRecordValues('integration'), dropdowns.integration);
    }, [records, dropdowns.integration]);

    const activityOptions = useMemo(() => {
        return getSortedOptions(getRecordValues('activity'), dropdowns.activity);
    }, [records, dropdowns.activity]);

    const regionOptions = useMemo(() => {
        const presentProvinces = getRecordValues('province');
        return regionData
            .filter(r => r.provinces.some(p => presentProvinces.has(p)))
            .map(r => r.regionName);
    }, [records, regionData]);

    const provinceOptions = useMemo(() => {
        let present: Set<string>;
        if (selectedRegions.length > 0) {
            const regionProvinces = regionData
                .filter(r => selectedRegions.includes(r.regionName))
                .flatMap(r => r.provinces);
            present = getRecordValues('province', r => regionProvinces.includes(r.province));
        } else {
            present = getRecordValues('province');
        }
        return getSortedOptions(present, dropdowns.province);
    }, [records, selectedRegions, regionData, dropdowns.province]);

    const responsibleAgencyOptions = useMemo(() => {
        let present: Set<string>;
        if (selectedMainAgencies.length > 0) {
            present = getRecordValues('responsibleAgency', r => selectedMainAgencies.includes(r.mainAgency));
        } else {
            present = getRecordValues('responsibleAgency');
        }
        return getSortedOptions(present, dropdowns.responsibleAgency);
    }, [records, selectedMainAgencies, dropdowns.responsibleAgency]);

    const integrationAreaOptions = useMemo(() => {
        let present: Set<string>;
        if (selectedResponsibleAgencies.length > 0) {
            present = getRecordValues('integrationArea', r => selectedResponsibleAgencies.includes(r.responsibleAgency));
        } else if (selectedMainAgencies.length > 0) {
            present = getRecordValues('integrationArea', r => selectedMainAgencies.includes(r.mainAgency));
        } else {
            present = getRecordValues('integrationArea');
        }
        return getSortedOptions(present, dropdowns.integrationArea);
    }, [records, selectedResponsibleAgencies, selectedMainAgencies, dropdowns.integrationArea]);

    // --- End Filter Options Logic ---

    const filteredRecords = useMemo(() => {
        const regionProvinces = selectedRegions.length > 0 
            ? regionData.filter(r => selectedRegions.includes(r.regionName)).flatMap(r => r.provinces)
            : null;

        return records.filter(r => {
            const rMain = (r.mainAgency || '').trim();
            const rInteg = (r.integration || '').trim();
            const rActivity = (r.activity || '').trim();
            const rProv = (r.province || '').trim();
            const rResp = (r.responsibleAgency || '').trim();
            const rArea = (r.integrationArea || '').trim();
            
            const matchesMain = selectedMainAgencies.length > 0 ? selectedMainAgencies.includes(rMain) : true;
            const matchesInteg = selectedIntegrations.length > 0 ? selectedIntegrations.some(integ => rInteg === integ || rInteg.includes(integ)) : true;
            const matchesActivity = selectedActivities.length > 0 ? selectedActivities.includes(rActivity) : true;
            const matchesRegion = regionProvinces ? regionProvinces.includes(rProv) : true;
            const matchesProv = selectedProvinces.length > 0 ? selectedProvinces.includes(rProv) : true;
            const matchesResp = selectedResponsibleAgencies.length > 0 ? selectedResponsibleAgencies.includes(rResp) : true;
            const matchesArea = selectedIntegrationAreas.length > 0 ? selectedIntegrationAreas.includes(rArea) : true;
            
            return matchesMain && matchesInteg && matchesActivity && matchesRegion && matchesProv && matchesResp && matchesArea;
        });
    }, [records, selectedMainAgencies, selectedIntegrations, selectedActivities, selectedProvinces, selectedRegions, selectedResponsibleAgencies, selectedIntegrationAreas, regionData]);

    const initialAggregatedData = {
        salaryPermanent: 0, governmentCompensation: 0, compensationSupplies: 0, contractEmployees: 0,
        utilities: 0, equipment: 0, landConstruction: 0, subsidies: 0, otherExpenses: 0,
        target: '0', unit: '', total: 0
    };

    // --- Helper Functions ---

    const formatMoney = (val: number) => {
        return (val && val > 0) ? formatNumber(val) : '-';
    };

    const getRowTotal = (r: BudgetRecord) => {
        return (r.salaryPermanent || 0) + (r.governmentCompensation || 0) + 
               (r.compensationSupplies || 0) + (r.contractEmployees || 0) + (r.utilities || 0) +
               (r.equipment || 0) + (r.landConstruction || 0) +
               (r.subsidies || 0) + (r.otherExpenses || 0);
    };

    const sumAggregatedData = (a: typeof initialAggregatedData, b: typeof initialAggregatedData) => {
        return {
            ...a,
            salaryPermanent: a.salaryPermanent + b.salaryPermanent,
            governmentCompensation: a.governmentCompensation + b.governmentCompensation,
            compensationSupplies: a.compensationSupplies + b.compensationSupplies,
            contractEmployees: a.contractEmployees + b.contractEmployees,
            utilities: a.utilities + b.utilities,
            equipment: a.equipment + b.equipment,
            landConstruction: a.landConstruction + b.landConstruction,
            subsidies: a.subsidies + b.subsidies,
            otherExpenses: a.otherExpenses + b.otherExpenses,
            total: a.total + b.total,
            target: a.target, 
            unit: a.unit
        };
    };

    const aggregatedDataByActivity = useMemo(() => {
        const map = new Map<string, typeof initialAggregatedData>();
        
        filteredRecords.forEach(r => {
            const activityTrimmed = (r.activity || '').trim();
            if (!activityTrimmed) return;
            
            if (!map.has(activityTrimmed)) {
                map.set(activityTrimmed, { ...initialAggregatedData });
            }
            
            const acc = map.get(activityTrimmed)!;
            
            let nextTarget = acc.target;
            const val = r.target ? r.target.trim() : '0';
            
            if (val !== '0') {
                if (acc.target === '0') {
                    nextTarget = val;
                } else {
                    const nAcc = parseNumber(acc.target);
                    const nVal = parseNumber(val);
                    
                    const accIsText = nAcc === 0 && acc.target !== '0' && acc.target !== '0.00';
                    const valIsText = nVal === 0 && val !== '0' && val !== '0.00';

                    if (accIsText || valIsText) {
                        if (valIsText) nextTarget = val;
                    } else {
                        const maxVal = Math.max(nAcc, nVal);
                        nextTarget = maxVal.toLocaleString('en-US', { maximumFractionDigits: 2 });
                    }
                }
            }

            acc.salaryPermanent += (r.salaryPermanent || 0);
            acc.governmentCompensation += (r.governmentCompensation || 0);
            acc.compensationSupplies += (r.compensationSupplies || 0);
            acc.contractEmployees += (r.contractEmployees || 0);
            acc.utilities += (r.utilities || 0);
            acc.equipment += (r.equipment || 0);
            acc.landConstruction += (r.landConstruction || 0);
            acc.subsidies += (r.subsidies || 0);
            acc.otherExpenses += (r.otherExpenses || 0);
            acc.target = nextTarget;
            acc.unit = r.unit || acc.unit;
            acc.total += getRowTotal(r);
        });
        
        return map;
    }, [filteredRecords]);

    const nodeDataMap = useMemo(() => {
        const map = new Map<ReportNode, typeof initialAggregatedData>();

        const calculate = (node: ReportNode): typeof initialAggregatedData => {
            if (map.has(node)) return map.get(node)!;

            let currentTotal = { ...initialAggregatedData };
            if (node.activityMatcher) {
                const directData = aggregatedDataByActivity.get(node.activityMatcher.trim());
                if (directData) {
                    currentTotal = sumAggregatedData(currentTotal, directData);
                    currentTotal.target = directData.target;
                    currentTotal.unit = directData.unit;
                }
            }
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    const childTotal = calculate(child);
                    currentTotal = sumAggregatedData(currentTotal, childTotal);
                });
            }
            map.set(node, currentTotal);
            return currentTotal;
        };

        reportHierarchy.forEach(node => calculate(node));
        return map;
    }, [reportHierarchy, aggregatedDataByActivity]);

    const calculateNodeData = (node: ReportNode): typeof initialAggregatedData => {
        return nodeDataMap.get(node) || { ...initialAggregatedData };
    };

    const getRegularBudget = (data: any) => {
        return (data.salaryPermanent || 0) + (data.governmentCompensation || 0) + (data.compensationSupplies || 0) + 
               (data.contractEmployees || 0) + (data.utilities || 0) + (data.subsidies || 0) + (data.otherExpenses || 0);
    };

    const getInvestmentBudget = (data: any) => {
        return (data.equipment || 0) + (data.landConstruction || 0);
    };

    // --- New Data Views ---

    const agencyOrderMap = useMemo(() => {
        const map = new Map<string, number>();
        dropdowns.mainAgency.forEach((agency, index) => {
            map.set(agency.trim(), index);
        });
        return map;
    }, [dropdowns.mainAgency]);

    const provinceOrderMap = useMemo(() => {
        const map = new Map<string, number>();
        dropdowns.province.forEach((prov, index) => {
            map.set(prov.trim(), index);
        });
        return map;
    }, [dropdowns.province]);

    const respAgencyOrderMap = useMemo(() => {
        const map = new Map<string, number>();
        dropdowns.responsibleAgency.forEach((agency, index) => {
            map.set(agency.trim(), index);
        });
        return map;
    }, [dropdowns.responsibleAgency]);

    const areaOrderMap = useMemo(() => {
        const map = new Map<string, number>();
        dropdowns.integrationArea.forEach((area, index) => {
            map.set(area.trim(), index);
        });
        return map;
    }, [dropdowns.integrationArea]);

    // Data for 'agency' mode
    const agencySummaryData = useMemo(() => {
        const groups: Record<string, typeof initialAggregatedData & { 
            totalPersonnel: number, 
            totalOperational: number, 
            totalInvestment: number 
        }> = {};
        
        filteredRecords.forEach(r => {
            const agency = r.mainAgency || 'ไม่ระบุหน่วยงาน';
            if (!groups[agency]) {
                groups[agency] = { 
                    ...initialAggregatedData,
                    totalPersonnel: 0,
                    totalOperational: 0,
                    totalInvestment: 0
                };
            }
            
            groups[agency].salaryPermanent += (r.salaryPermanent || 0);
            groups[agency].governmentCompensation += (r.governmentCompensation || 0);
            groups[agency].compensationSupplies += (r.compensationSupplies || 0);
            groups[agency].contractEmployees += (r.contractEmployees || 0);
            groups[agency].utilities += (r.utilities || 0);
            groups[agency].equipment += (r.equipment || 0);
            groups[agency].landConstruction += (r.landConstruction || 0);
            groups[agency].subsidies += (r.subsidies || 0);
            groups[agency].otherExpenses += (r.otherExpenses || 0);
            groups[agency].total += getRowTotal(r);

            groups[agency].totalPersonnel += (r.salaryPermanent || 0) + (r.governmentCompensation || 0);
            groups[agency].totalOperational += (r.compensationSupplies || 0) + (r.contractEmployees || 0) + (r.utilities || 0);
            groups[agency].totalInvestment += (r.equipment || 0) + (r.landConstruction || 0);
        });

        return Object.entries(groups).map(([agency, data]) => ({
            title: agency,
            ...data
        })).sort((a, b) => {
            const indexA = agencyOrderMap.get(a.title.trim()) ?? 9999;
            const indexB = agencyOrderMap.get(b.title.trim()) ?? 9999;
            if (indexA !== indexB) return indexA - indexB;
            return a.title.localeCompare(b.title, 'th');
        });
    }, [filteredRecords, agencyOrderMap]);

    // Data for 'integration' mode (Simple view)
    const integrationSummaryData = useMemo(() => {
        const groups: Record<string, { title: string, total: number, [key: string]: any }> = {};
        const integrationTypes = dropdowns.integration;

        filteredRecords.forEach(r => {
            const agency = r.mainAgency || 'ไม่ระบุหน่วยงาน';
            if (!groups[agency]) {
                groups[agency] = { title: agency, total: 0 };
                integrationTypes.forEach(t => groups[agency][t] = 0);
                groups[agency]['other'] = 0;
            }

            const total = getRowTotal(r);
            const recordInteg = (r.integration || '').trim();
            const matchedKey = integrationTypes.find(t => t.trim() === recordInteg);
            const integType = matchedKey || 'other';
            
            if (groups[agency][integType] === undefined) {
                 groups[agency][integType] = 0;
            }
            
            groups[agency][integType] += total;
            groups[agency].total += total;
        });

        return Object.values(groups).sort((a, b) => {
            const indexA = agencyOrderMap.has(a.title.trim()) ? agencyOrderMap.get(a.title.trim())! : 9999;
            const indexB = agencyOrderMap.has(b.title.trim()) ? agencyOrderMap.get(b.title.trim())! : 9999;
            
            if (indexA !== 9999 && indexB !== 9999) return indexA - indexB;
            if (indexA !== 9999) return -1;
            if (indexB !== 9999) return 1;
            return a.title.localeCompare(b.title, 'th');
        });
    }, [filteredRecords, dropdowns.integration, agencyOrderMap]);

    // Data for 'integration-detailed' mode (Hierarchical view)
    const integrationDetailedData = useMemo(() => {
        // Structure: MainAgency -> Province -> ResponsibleAgency -> IntegrationArea
        type HierarchyItem = typeof initialAggregatedData & { 
            name: string, 
            children: Record<string, HierarchyItem>, 
            sortedChildren?: HierarchyItem[] 
        };
        
        const root: Record<string, HierarchyItem> = {};

        filteredRecords.forEach(r => {
            const mainName = r.mainAgency || 'ไม่ระบุหน่วยงานหลัก';
            const provName = r.province || 'ไม่ระบุจังหวัด';
            const respName = (r.responsibleAgency || '').trim();
            const areaName = (r.integrationArea || '').trim();

            // 1. Level 1: Main Agency
            if (!root[mainName]) root[mainName] = { ...initialAggregatedData, name: mainName, children: {} };
            const mainNode = root[mainName];

            // 2. Level 2: Province
            if (!mainNode.children[provName]) mainNode.children[provName] = { ...initialAggregatedData, name: provName, children: {} };
            const provNode = mainNode.children[provName];

            // Helper to add budget
            const addToNode = (node: HierarchyItem) => {
                node.salaryPermanent += (r.salaryPermanent || 0);
                node.governmentCompensation += (r.governmentCompensation || 0);
                node.compensationSupplies += (r.compensationSupplies || 0);
                node.contractEmployees += (r.contractEmployees || 0);
                node.utilities += (r.utilities || 0);
                node.equipment += (r.equipment || 0);
                node.landConstruction += (r.landConstruction || 0);
                node.subsidies += (r.subsidies || 0);
                node.otherExpenses += (r.otherExpenses || 0);
                node.total += getRowTotal(r);
            };

            addToNode(mainNode);
            addToNode(provNode);

            if (respName) {
                // 3. Level 3: Responsible Agency
                if (!provNode.children[respName]) provNode.children[respName] = { ...initialAggregatedData, name: respName, children: {} };
                const respNode = provNode.children[respName];
                addToNode(respNode);

                if (areaName) {
                    // 4. Level 4: Integration Area
                    if (!respNode.children[areaName]) respNode.children[areaName] = { ...initialAggregatedData, name: areaName, children: {} };
                    const areaNode = respNode.children[areaName];
                    addToNode(areaNode);
                }
            }
        });

        // Convert to Arrays and Sort
        const result = Object.values(root).map(main => {
            main.sortedChildren = Object.values(main.children).map(prov => {
                prov.sortedChildren = Object.values(prov.children).map(resp => {
                    resp.sortedChildren = Object.values(resp.children).sort((a, b) => {
                        const idxA = areaOrderMap.get(a.name.trim()) ?? 9999;
                        const idxB = areaOrderMap.get(b.name.trim()) ?? 9999;
                        if (idxA !== idxB) return idxA - idxB;
                        return a.name.localeCompare(b.name, 'th');
                    });
                    return resp;
                }).sort((a, b) => {
                    const idxA = respAgencyOrderMap.get(a.name.trim()) ?? 9999;
                    const idxB = respAgencyOrderMap.get(b.name.trim()) ?? 9999;
                    if (idxA !== idxB) return idxA - idxB;
                    return a.name.localeCompare(b.name, 'th');
                });
                return prov;
            }).sort((a, b) => {
                const idxA = provinceOrderMap.get(a.name.trim()) ?? 9999;
                const idxB = provinceOrderMap.get(b.name.trim()) ?? 9999;
                if (idxA !== idxB) return idxA - idxB;
                return a.name.localeCompare(b.name, 'th');
            });
            return main;
        }).sort((a, b) => {
            const indexA = agencyOrderMap.get(a.name.trim()) ?? 9999;
            const indexB = agencyOrderMap.get(b.name.trim()) ?? 9999;
            if (indexA !== indexB) return indexA - indexB;
            return a.name.localeCompare(b.name, 'th');
        });

        return result;
    }, [filteredRecords, agencyOrderMap]);

    const usedActivities = useMemo(() => {
        const set = new Set<string>();
        const traverse = (nodes: ReportNode[]) => {
            nodes.forEach(node => {
                if (node.activityMatcher) set.add(node.activityMatcher.trim());
                if (node.children) traverse(node.children);
            });
        };
        traverse(reportHierarchy);
        return set;
    }, [reportHierarchy]);

    const uncategorizedRecords = useMemo(() => {
        const groups: Record<string, BudgetRecord[]> = {};
        filteredRecords.forEach(r => {
            const name = (r.activity || '').trim();
            if (name && !usedActivities.has(name)) {
                if (!groups[name]) groups[name] = [];
                groups[name].push(r);
            }
        });
        return Object.keys(groups).map(name => {
            const matches = groups[name];
            const agg = matches.reduce((acc, r) => {
                let nextTarget = acc.target;
                const val = r.target ? r.target.trim() : '0';
                if (val !== '0') {
                    if (acc.target === '0') {
                        nextTarget = val;
                    } else {
                        const nAcc = parseNumber(acc.target);
                        const nVal = parseNumber(val);
                        const accIsText = nAcc === 0 && acc.target !== '0' && acc.target !== '0.00';
                        const valIsText = nVal === 0 && val !== '0' && val !== '0.00';
                        if (accIsText || valIsText) {
                            if (valIsText) nextTarget = val;
                        } else {
                            const maxVal = Math.max(nAcc, nVal);
                            nextTarget = maxVal.toLocaleString('en-US', { maximumFractionDigits: 2 });
                        }
                    }
                }

                return {
                    ...acc,
                    salaryPermanent: acc.salaryPermanent + (r.salaryPermanent || 0),
                    governmentCompensation: acc.governmentCompensation + (r.governmentCompensation || 0),
                    compensationSupplies: acc.compensationSupplies + (r.compensationSupplies || 0),
                    contractEmployees: acc.contractEmployees + (r.contractEmployees || 0),
                    utilities: acc.utilities + (r.utilities || 0),
                    equipment: acc.equipment + (r.equipment || 0),
                    landConstruction: acc.landConstruction + (r.landConstruction || 0),
                    subsidies: acc.subsidies + (r.subsidies || 0),
                    otherExpenses: acc.otherExpenses + (r.otherExpenses || 0),
                    target: nextTarget,
                    unit: r.unit || acc.unit
                };
            }, { ...initialAggregatedData });
            const total = agg.salaryPermanent + agg.governmentCompensation + agg.compensationSupplies + 
                          agg.contractEmployees + agg.utilities + agg.equipment + agg.landConstruction + 
                          agg.subsidies + agg.otherExpenses;
            return { activity: name, ...agg, total };
        });
    }, [filteredRecords, usedActivities]);

    const grandTotal = useMemo(() => {
        return filteredRecords.reduce((acc, r) => {
            const rowTotal = getRowTotal(r);
            return {
                ...acc,
                salaryPermanent: acc.salaryPermanent + (r.salaryPermanent || 0),
                governmentCompensation: acc.governmentCompensation + (r.governmentCompensation || 0),
                compensationSupplies: acc.compensationSupplies + (r.compensationSupplies || 0),
                contractEmployees: acc.contractEmployees + (r.contractEmployees || 0),
                utilities: acc.utilities + (r.utilities || 0),
                equipment: acc.equipment + (r.equipment || 0),
                landConstruction: acc.landConstruction + (r.landConstruction || 0),
                subsidies: acc.subsidies + (r.subsidies || 0),
                otherExpenses: acc.otherExpenses + (r.otherExpenses || 0),
                total: acc.total + rowTotal,
                totalPersonnel: (acc as any).totalPersonnel + (r.salaryPermanent || 0) + (r.governmentCompensation || 0),
                totalOperational: (acc as any).totalOperational + (r.compensationSupplies || 0) + (r.contractEmployees || 0) + (r.utilities || 0),
                totalInvestment: (acc as any).totalInvestment + (r.equipment || 0) + (r.landConstruction || 0)
            };
        }, { ...initialAggregatedData, totalPersonnel: 0, totalOperational: 0, totalInvestment: 0 });
    }, [filteredRecords]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadExcel = async () => {
        setIsLoading(true);
        setDownloadDropdownOpen(false);
        try {
            const exceljsModule = await import('exceljs');
            const ExcelJS = (exceljsModule as any).default || exceljsModule;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report');

            let columns: any[] = [];
            
            if (reportMode === 'agency') {
                columns = [
                    { header: 'หน่วยงาน', key: 'title', width: 40 },
                    { header: 'รวมงบบุคลากร', key: 'totalPersonnel', width: 20 },
                    { header: 'เงินเดือนฯ', key: 'salaryPermanent', width: 18 },
                    { header: 'พนง.ราชการ', key: 'governmentCompensation', width: 18 },
                    { header: 'รวมงบดำเนินงาน', key: 'totalOperational', width: 20 },
                    { header: 'ใช้สอย/วัสดุ', key: 'compensationSupplies', width: 18 },
                    { header: 'จ้างเหมาฯ', key: 'contractEmployees', width: 18 },
                    { header: 'สาธารณูปโภค', key: 'utilities', width: 18 },
                    { header: 'รวมงบลงทุน', key: 'totalInvestment', width: 20 },
                    { header: 'ค่าครุภัณฑ์', key: 'equipment', width: 18 },
                    { header: 'ที่ดินฯ', key: 'landConstruction', width: 18 },
                    { header: 'เงินอุดหนุน', key: 'subsidies', width: 18 },
                    { header: 'รายจ่ายอื่น', key: 'otherExpenses', width: 18 },
                    { header: 'รวมทั้งสิ้น', key: 'total', width: 22 }
                ];
            } else if (reportMode === 'integration') {
                columns = [{ header: 'หน่วยงาน', key: 'title', width: 40 }];
                dropdowns.integration.forEach(type => {
                    columns.push({ header: type, key: type, width: 20 });
                });
                columns.push({ header: 'รวมทั้งสิ้น', key: 'total', width: 22 });
            } else if (reportMode === 'integration-detailed') {
                columns = [
                    { header: 'หน่วยงาน / จังหวัด / พื้นที่', key: 'title', width: 60 },
                    { header: 'รวมงบบุคลากร', key: 'totalPersonnel', width: 20 },
                    { header: 'เงินเดือนฯ', key: 'salaryPermanent', width: 18 },
                    { header: 'พนง.ราชการ', key: 'governmentCompensation', width: 18 },
                    { header: 'รวมงบดำเนินงาน', key: 'totalOperational', width: 20 },
                    { header: 'ใช้สอย/วัสดุ', key: 'compensationSupplies', width: 18 },
                    { header: 'จ้างเหมาฯ', key: 'contractEmployees', width: 18 },
                    { header: 'สาธารณูปโภค', key: 'utilities', width: 18 },
                    { header: 'รวมงบลงทุน', key: 'totalInvestment', width: 20 },
                    { header: 'ค่าครุภัณฑ์', key: 'equipment', width: 18 },
                    { header: 'ที่ดินฯ', key: 'landConstruction', width: 18 },
                    { header: 'เงินอุดหนุน', key: 'subsidies', width: 18 },
                    { header: 'รายจ่ายอื่น', key: 'otherExpenses', width: 18 },
                    { header: 'รวมทั้งสิ้น', key: 'total', width: 22 }
                ];
            } else {
                columns = [{ header: 'แผนงาน - ผลผลิต - กิจกรรม/โครงการ', key: 'title', width: 60 }];
                if (reportMode !== 'summary') {
                    columns.push({ header: 'เป้าหมาย', key: 'target', width: 10 });
                    columns.push({ header: 'หน่วยนับ', key: 'unit', width: 10 });
                }

                if (reportMode === 'full') {
                    const bCols = [
                        { header: 'เงินเดือนฯ', key: 'salaryPermanent', width: 18 },
                        { header: 'พนง.ราชการ', key: 'governmentCompensation', width: 18 },
                        { header: 'ใช้สอย/วัสดุ', key: 'compensationSupplies', width: 18 },
                        { header: 'จ้างเหมาฯ', key: 'contractEmployees', width: 18 },
                        { header: 'สาธารณูปโภค', key: 'utilities', width: 18 },
                        { header: 'ค่าครุภัณฑ์', key: 'equipment', width: 18 },
                        { header: 'ที่ดินฯ', key: 'landConstruction', width: 18 },
                        { header: 'เงินอุดหนุน', key: 'subsidies', width: 18 },
                        { header: 'รายจ่ายอื่น', key: 'otherExpenses', width: 18 }
                    ];
                    columns = [...columns, ...bCols];
                } else if (reportMode === 'province') {
                    columns.push({ header: 'งบประจำ', key: 'regular', width: 20 });
                    columns.push({ header: 'งบลงทุน', key: 'investment', width: 20 });
                    columns.push({ header: 'เงินนอกงบประมาณ', key: 'nonBudget', width: 15 });
                    columns.push({ header: `งบกลาง ปี ${budgetYear}`, key: 'centralBudget', width: 15 });
                }
                columns.push({ header: 'รวมทั้งสิ้น', key: 'total', width: 22 });
            }
            
            worksheet.columns = columns;

            worksheet.insertRow(1, [reportTitle]);
            worksheet.mergeCells(1, 1, 1, columns.length);
            worksheet.getRow(1).height = 30;
            worksheet.getCell('A1').font = { name: 'Sarabun', size: 16, bold: true };
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

            const subTitleStr = [
                (reportMode === 'agency' || reportMode === 'integration-detailed') ? 'สรุปตามหน่วยงานหลัก' : (reportMode === 'integration' ? 'สรุปตามแผนงานบูรณาการ' : ''),
                selectedMainAgencies.length > 0 ? `หน่วยงานหลัก: ${selectedMainAgencies.join(', ')}` : '',
                selectedIntegrations.length > 0 ? `บูรณาการ: ${selectedIntegrations.join(', ')}` : '',
                selectedActivities.length > 0 ? `กิจกรรม: ${selectedActivities.join(', ')}` : '',
                selectedRegions.length > 0 ? `ภูมิภาค: ${selectedRegions.join(', ')}` : '',
                selectedProvinces.length > 0 ? `จังหวัด: ${selectedProvinces.join(', ')}` : ''
            ].filter(Boolean).join(' | ') || 'ภาพรวมทุกหน่วยงาน';
            
            worksheet.insertRow(2, [subTitleStr]);
            worksheet.mergeCells(2, 1, 2, columns.length);
            worksheet.getRow(2).height = 20;
            worksheet.getCell('A2').font = { name: 'Sarabun', size: 12, bold: true };
            worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

            let headerRowIndex = 4;
            
            const styleHeaderRow = (row: any) => {
                row.eachCell((cell: any) => {
                    cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFF1F5F9'} };
                    cell.font = { bold: true };
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                });
            };

            if (reportMode === 'agency' || reportMode === 'integration-detailed') {
                const topHeader = ['หน่วยงาน', 'งบบุคลากร', '', '', 'งบดำเนินงาน', '', '', '', 'งบลงทุน', '', '', 'เงินอุดหนุน', 'รายจ่ายอื่น', 'รวมทั้งสิ้น'];
                const rowH1 = worksheet.insertRow(headerRowIndex, topHeader);
                const rowH2 = worksheet.addRow(['', 'รวมงบบุคลากร', 'เงินเดือนฯ', 'พนง.ราชการ', 'รวมงบดำเนินงาน', 'ใช้สอย/วัสดุ', 'จ้างเหมาฯ', 'สาธารณูปโภค', 'รวมงบลงทุน', 'ค่าครุภัณฑ์', 'ที่ดินฯ', '', '', '']);
                styleHeaderRow(rowH1);
                styleHeaderRow(rowH2);
                
                worksheet.mergeCells(headerRowIndex, 1, headerRowIndex + 1, 1);
                worksheet.mergeCells(headerRowIndex, 2, headerRowIndex, 4);
                worksheet.mergeCells(headerRowIndex, 5, headerRowIndex, 8);
                worksheet.mergeCells(headerRowIndex, 9, headerRowIndex, 11);
                worksheet.mergeCells(headerRowIndex, 12, headerRowIndex + 1, 12);
                worksheet.mergeCells(headerRowIndex, 13, headerRowIndex + 1, 13);
                worksheet.mergeCells(headerRowIndex, 14, headerRowIndex + 1, 14);
                headerRowIndex += 2;

            } else if (reportMode === 'integration') {
                const header = ['หน่วยงาน', ...dropdowns.integration, 'รวมทั้งสิ้น'];
                const rowH1 = worksheet.insertRow(headerRowIndex, header);
                styleHeaderRow(rowH1);
                headerRowIndex += 1;

            } else if (reportMode === 'full') {
                const topHeader = ['แผนงาน - ผลผลิต - กิจกรรม/โครงการ', 'เป้าหมาย', 'หน่วยนับ', 'งบบุคลากร', '', 'งบดำเนินงาน', '', '', 'งบลงทุน', '', 'เงินอุดหนุน', 'รายจ่ายอื่น', 'รวมทั้งสิ้น'];
                const rowH1 = worksheet.insertRow(headerRowIndex, topHeader);
                const rowH2 = worksheet.addRow(['', '', '', 'เงินเดือนฯ', 'พนง.ราชการ', 'ใช้สอย/วัสดุ', 'จ้างเหมาฯ', 'สาธารณูปโภค', 'ค่าครุภัณฑ์', 'ที่ดินฯ', '', '', '']);
                styleHeaderRow(rowH1);
                styleHeaderRow(rowH2);

                worksheet.mergeCells(headerRowIndex, 1, headerRowIndex + 1, 1);
                worksheet.mergeCells(headerRowIndex, 2, headerRowIndex + 1, 2);
                worksheet.mergeCells(headerRowIndex, 3, headerRowIndex + 1, 3);
                worksheet.mergeCells(headerRowIndex, 4, headerRowIndex, 5);
                worksheet.mergeCells(headerRowIndex, 6, headerRowIndex, 8);
                worksheet.mergeCells(headerRowIndex, 9, headerRowIndex, 10);
                worksheet.mergeCells(headerRowIndex, 11, headerRowIndex + 1, 11);
                worksheet.mergeCells(headerRowIndex, 12, headerRowIndex + 1, 12);
                worksheet.mergeCells(headerRowIndex, 13, headerRowIndex + 1, 13);
                headerRowIndex += 2;
            } else if (reportMode === 'province') {
                const topHeader = ['แผนงาน - ผลผลิต - กิจกรรม/โครงการ', 'เป้าหมาย', 'หน่วยนับ', `งบประมาณตาม พ.ร.บ. ปี ${budgetYear}`, '', 'เงินนอกงบประมาณ', `งบกลาง ปี ${budgetYear}`, 'รวมทั้งสิ้น (บาท)'];
                const rowH1 = worksheet.insertRow(headerRowIndex, topHeader);
                const rowH2 = worksheet.addRow(['', '', '', 'งบประจำ', 'งบลงทุน', '', '', '']);
                styleHeaderRow(rowH1);
                styleHeaderRow(rowH2);

                worksheet.mergeCells(headerRowIndex, 1, headerRowIndex + 1, 1);
                worksheet.mergeCells(headerRowIndex, 2, headerRowIndex + 1, 2);
                worksheet.mergeCells(headerRowIndex, 3, headerRowIndex + 1, 3);
                worksheet.mergeCells(headerRowIndex, 4, headerRowIndex, 5);
                worksheet.mergeCells(headerRowIndex, 6, headerRowIndex + 1, 6);
                worksheet.mergeCells(headerRowIndex, 7, headerRowIndex + 1, 7);
                worksheet.mergeCells(headerRowIndex, 8, headerRowIndex + 1, 8);
                headerRowIndex += 2;
            } else {
                const rowH = worksheet.getRow(headerRowIndex);
                rowH.eachCell((cell: any) => {
                    cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFF1F5F9'} };
                    cell.font = { bold: true };
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
                headerRowIndex += 1;
            }

            const addRow = (values: any[], isBold: boolean = false, indent: number = 0, bgColor: string | null = null) => {
                const row = worksheet.addRow(values);
                row.eachCell((cell: any, colNumber: number) => {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0.00';
                        cell.alignment = { horizontal: 'right' };
                        if ((reportMode === 'agency' || reportMode === 'integration' || reportMode === 'integration-detailed') && cell.value === 0) {
                            cell.value = '-';
                            cell.alignment = { horizontal: 'right' };
                        }
                    }
                    if (isBold) cell.font = { bold: true };
                    if (bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    
                    if (colNumber === 1 && indent > 0) {
                        cell.alignment = { indent: indent, horizontal: 'left' };
                    }
                });
            };

            if (reportMode === 'agency') {
                agencySummaryData.forEach(item => {
                    addRow([
                        item.title, 
                        item.totalPersonnel, item.salaryPermanent, item.governmentCompensation,
                        item.totalOperational, item.compensationSupplies, item.contractEmployees, item.utilities,
                        item.totalInvestment, item.equipment, item.landConstruction, 
                        item.subsidies, item.otherExpenses, item.total
                    ]);
                });
                const grand = grandTotal as any;
                addRow([
                    'รวมทั้งสิ้น', 
                    grand.totalPersonnel, grand.salaryPermanent, grand.governmentCompensation,
                    grand.totalOperational, grand.compensationSupplies, grand.contractEmployees, grand.utilities,
                    grand.totalInvestment, grand.equipment, grand.landConstruction, 
                    grand.subsidies, grand.otherExpenses, grand.total
                ], true, 0, 'FFD1FAE5');
            } 
            else if (reportMode === 'integration-detailed') {
                integrationDetailedData.forEach(main => {
                    // Level 1: Main Agency
                    const totalMainPersonnel = main.salaryPermanent + main.governmentCompensation;
                    const totalMainOp = main.compensationSupplies + main.contractEmployees + main.utilities;
                    const totalMainInv = main.equipment + main.landConstruction;
                    
                    addRow([
                        main.name,
                        totalMainPersonnel, main.salaryPermanent, main.governmentCompensation,
                        totalMainOp, main.compensationSupplies, main.contractEmployees, main.utilities,
                        totalMainInv, main.equipment, main.landConstruction,
                        main.subsidies, main.otherExpenses, main.total
                    ], true, 0, 'FFE2E8F0'); // slate-200

                    main.sortedChildren?.forEach(prov => {
                        // Level 2: Province
                        const totalProvPersonnel = prov.salaryPermanent + prov.governmentCompensation;
                        const totalProvOp = prov.compensationSupplies + prov.contractEmployees + prov.utilities;
                        const totalProvInv = prov.equipment + prov.landConstruction;

                        addRow([
                            prov.name,
                            totalProvPersonnel, prov.salaryPermanent, prov.governmentCompensation,
                            totalProvOp, prov.compensationSupplies, prov.contractEmployees, prov.utilities,
                            totalProvInv, prov.equipment, prov.landConstruction,
                            prov.subsidies, prov.otherExpenses, prov.total
                        ], true, 2, 'FFF1F5F9'); // slate-100

                        prov.sortedChildren?.forEach(resp => {
                            // Level 3: Responsible Agency
                            const totalRespPersonnel = resp.salaryPermanent + resp.governmentCompensation;
                            const totalRespOp = resp.compensationSupplies + resp.contractEmployees + resp.utilities;
                            const totalRespInv = resp.equipment + resp.landConstruction;

                            addRow([
                                resp.name,
                                totalRespPersonnel, resp.salaryPermanent, resp.governmentCompensation,
                                totalRespOp, resp.compensationSupplies, resp.contractEmployees, resp.utilities,
                                totalRespInv, resp.equipment, resp.landConstruction,
                                resp.subsidies, resp.otherExpenses, resp.total
                            ], true, 4, 'FFF8FAFC'); // slate-50

                            resp.sortedChildren?.forEach(area => {
                                // Level 4: Integration Area
                                const totalAreaPersonnel = area.salaryPermanent + area.governmentCompensation;
                                const totalAreaOp = area.compensationSupplies + area.contractEmployees + area.utilities;
                                const totalAreaInv = area.equipment + area.landConstruction;

                                addRow([
                                    area.name,
                                    totalAreaPersonnel, area.salaryPermanent, area.governmentCompensation,
                                    totalAreaOp, area.compensationSupplies, area.contractEmployees, area.utilities,
                                    totalAreaInv, area.equipment, area.landConstruction,
                                    area.subsidies, area.otherExpenses, area.total
                                ], false, 6);
                            });
                        });
                    });
                });
                
                const grand = grandTotal as any;
                addRow([
                    'รวมทั้งสิ้น',
                    grand.totalPersonnel, grand.salaryPermanent, grand.governmentCompensation,
                    grand.totalOperational, grand.compensationSupplies, grand.contractEmployees, grand.utilities,
                    grand.totalInvestment, grand.equipment, grand.landConstruction,
                    grand.subsidies, grand.otherExpenses, grand.total
                ], true, 0, 'FFD1FAE5');
            }
            else if (reportMode === 'integration') {
                integrationSummaryData.forEach(item => {
                    const rowValues: any[] = [item.title];
                    dropdowns.integration.forEach(type => rowValues.push(item[type] || 0));
                    rowValues.push(item.total);
                    addRow(rowValues);
                });
                const footerRow: any[] = ['รวมทั้งสิ้น'];
                dropdowns.integration.forEach(type => {
                    const sum = integrationSummaryData.reduce((acc, curr) => acc + (curr[type] || 0), 0);
                    footerRow.push(sum as any);
                });
                const grandSum = integrationSummaryData.reduce((acc, curr) => acc + curr.total, 0);
                footerRow.push(grandSum as any);
                addRow(footerRow, true, 0, 'FFD1FAE5');
            } 
            else {
                let totalRow: any[] = ['รวมทั้งสิ้น'];
                if (reportMode !== 'summary') totalRow.push('', '');
                if (reportMode === 'full') {
                    totalRow.push(grandTotal.salaryPermanent as any, grandTotal.governmentCompensation as any, grandTotal.compensationSupplies as any, grandTotal.contractEmployees as any, grandTotal.utilities as any, grandTotal.equipment as any, grandTotal.landConstruction as any, grandTotal.subsidies as any, grandTotal.otherExpenses as any);
                } else if (reportMode === 'province') {
                    totalRow.push(getRegularBudget(grandTotal) as any, getInvestmentBudget(grandTotal) as any, 0, 0);
                }
                totalRow.push(grandTotal.total as any);
                
                addRow(totalRow, true, 0, 'FFD1FAE5');

                const traverseTree = (nodes: ReportNode[], level: number = 0) => {
                    nodes.forEach(node => {
                        const data = calculateNodeData(node);
                        if (data.total > 0 || !(selectedMainAgencies.length > 0 || selectedIntegrations.length > 0 || selectedActivities.length > 0 || selectedProvinces.length > 0 || selectedRegions.length > 0)) {
                            let rowValues: any[] = [node.title];
                            
                            if (reportMode !== 'summary') {
                                rowValues.push(data.target !== '0' ? data.target : '');
                                rowValues.push(data.unit || '');
                            }

                            if (reportMode === 'full') {
                                rowValues.push(data.salaryPermanent, data.governmentCompensation, data.compensationSupplies, data.contractEmployees, data.utilities, data.equipment, data.landConstruction, data.subsidies, data.otherExpenses);
                            } else if (reportMode === 'province') {
                                rowValues.push(getRegularBudget(data), getInvestmentBudget(data), 0, 0);
                            }
                            rowValues.push(data.total);

                            // Determine Colors
                            let bgColor = null;
                            let isBold = false;
                            switch (node.type) {
                                case 'plan': bgColor = 'FFF1F5F9'; isBold = true; break;
                                case 'output': bgColor = 'FFF8FAFC'; isBold = true; break;
                                case 'project': bgColor = 'FFF0FDFA'; isBold = true; break;
                                case 'group': isBold = true; break;
                                case 'subgroup': isBold = true; break;
                            }

                            addRow(rowValues, isBold, level * 2, bgColor);
                            
                            if (node.children) traverseTree(node.children, level + 1);
                        }
                    });
                };
                traverseTree(reportHierarchy);

                if (uncategorizedRecords.length > 0) {
                    const row = worksheet.addRow(['*** รายการอื่นๆ (อยู่นอกโครงสร้างหลัก) ***']);
                    row.getCell(1).font = { bold: true, color: { argb: 'FF991B1B' } };
                    
                    uncategorizedRecords.forEach(r => {
                        let rowValues: any[] = ['- ' + r.activity];
                        if (reportMode !== 'summary') {
                            rowValues.push(r.target, r.unit);
                        }
                        if (reportMode === 'full') {
                            rowValues.push(r.salaryPermanent, r.governmentCompensation, r.compensationSupplies, r.contractEmployees, r.utilities, r.equipment, r.landConstruction, r.subsidies, r.otherExpenses);
                        } else if (reportMode === 'province') {
                            rowValues.push(getRegularBudget(r as any), getInvestmentBudget(r as any), 0, 0);
                        }
                        rowValues.push(r.total);
                        
                        addRow(rowValues, false, 4);
                    });
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportTitle}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Excel Export Error:', error);
            Swal.fire('ผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        setIsLoading(true);
        setDownloadDropdownOpen(false);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = autoTableModule.default;

            const doc = new jsPDF('l', 'mm', 'a4');

            const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error('Failed to load font');
            const blob = await response.blob();
            
            const base64Font = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
            });

            doc.addFileToVFS('Sarabun-Regular.ttf', base64Font);
            doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
            doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'bold');
            doc.setFont('Sarabun');

            doc.setFontSize(16);
            doc.text(reportTitle, 14, 15);

            doc.setFontSize(11);
            const subTitle = [
                (reportMode === 'agency' || reportMode === 'integration-detailed') ? 'สรุปตามหน่วยงานหลัก' : (reportMode === 'integration' ? 'สรุปตามแผนงานบูรณาการ' : ''),
                selectedMainAgencies.length > 0 ? `หน่วยงานหลัก: ${selectedMainAgencies.join(', ')}` : '',
                selectedIntegrations.length > 0 ? `บูรณาการ: ${selectedIntegrations.join(', ')}` : '',
                selectedActivities.length > 0 ? `กิจกรรม: ${selectedActivities.join(', ')}` : '',
                selectedRegions.length > 0 ? `ภูมิภาค: ${selectedRegions.join(', ')}` : '',
                selectedProvinces.length > 0 ? `จังหวัด: ${selectedProvinces.join(', ')}` : ''
            ].filter(Boolean).join(' | ') || 'ภาพรวมทุกหน่วยงาน';
            doc.text(subTitle, 14, 22);

            const colStyles: any = { 0: { halign: 'left' } };
            
            if (reportMode === 'agency' || reportMode === 'integration-detailed') {
                for (let i = 1; i <= 13; i++) colStyles[i] = { halign: 'right' };
            } else if (reportMode === 'integration') {
                dropdowns.integration.forEach((_, idx) => colStyles[idx + 1] = { halign: 'right' });
                colStyles[dropdowns.integration.length + 1] = { halign: 'right' };
            } else if (reportMode === 'summary') {
                colStyles[1] = { halign: 'right' };
            } else {
                colStyles[1] = { halign: 'center' };
                colStyles[2] = { halign: 'center' };
                const startBudgetCol = 3;
                const endCol = reportMode === 'province' ? 7 : 12;
                for (let i = startBudgetCol; i <= endCol; i++) {
                    colStyles[i] = { halign: 'right' };
                }
            }

            autoTable(doc, {
                html: '#report-view-container table',
                startY: 28,
                theme: 'grid',
                styles: { font: 'Sarabun', fontSize: 10, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1, textColor: [40, 40, 40], valign: 'middle' },
                headStyles: { fillColor: [240, 245, 250], textColor: [30, 40, 50], fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200], halign: 'center', valign: 'middle' },
                columnStyles: colStyles,
                didParseCell: (data: any) => {
                    if (data.section === 'head') data.cell.styles.fontStyle = 'bold';
                    if (data.section === 'body') {
                        // Indentation Logic for first column
                        if (data.column.index === 0 && data.cell.raw instanceof HTMLElement) {
                            const rawEl = data.cell.raw;
                            try {
                                const style = window.getComputedStyle(rawEl);
                                const paddingLeft = parseFloat(style.paddingLeft);
                                if (!isNaN(paddingLeft) && paddingLeft > 5) {
                                    const indent = (paddingLeft * 0.2645833333) + 1; 
                                    data.cell.styles.cellPadding = { top: 1.5, bottom: 1.5, right: 1.5, left: indent };
                                }
                            } catch (e) { console.warn('Error applying PDF indentation', e); }

                            // Color Logic based on data-type attribute
                            const nodeType = rawEl.getAttribute('data-type');
                            if (nodeType) {
                                switch (nodeType) {
                                    case 'plan':
                                        data.cell.styles.fillColor = [241, 245, 249]; // slate-100
                                        data.cell.styles.textColor = [30, 58, 138]; // blue-900
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                    case 'output':
                                        data.cell.styles.fillColor = [248, 250, 252]; // slate-50
                                        data.cell.styles.textColor = [49, 46, 129]; // indigo-900
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                    case 'project':
                                        data.cell.styles.fillColor = [240, 253, 250]; // teal-50
                                        data.cell.styles.textColor = [19, 78, 74]; // teal-900
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                    case 'group':
                                        data.cell.styles.textColor = [6, 95, 70]; // emerald-800
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                    case 'subgroup':
                                        data.cell.styles.textColor = [51, 65, 85]; // slate-700
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                    case 'main':
                                        data.cell.styles.fillColor = [241, 245, 249];
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                    case 'resp':
                                        data.cell.styles.fillColor = [248, 250, 252];
                                        data.cell.styles.fontStyle = 'bold';
                                        break;
                                }
                            }
                        }
                        
                        // Apply background color to the whole row if the first cell has it
                        const firstCellStyles = data.row.cells[0]?.styles;
                        if (firstCellStyles && firstCellStyles.fillColor && data.column.index > 0) {
                             data.cell.styles.fillColor = firstCellStyles.fillColor;
                             data.cell.styles.textColor = firstCellStyles.textColor;
                             if (firstCellStyles.fontStyle === 'bold') data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            doc.save(`${reportTitle}.pdf`);

        } catch (error) {
            console.error('PDF Export Error:', error);
            Swal.fire('ผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้ (ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดฟอนต์)', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditTitle = async () => {
        const { value: newTitle } = await Swal.fire({
            title: 'แก้ไขหัวข้อรายงาน',
            input: 'text',
            inputValue: reportTitle,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#94a3b8',
            inputValidator: (value) => { if (!value) return 'กรุณาระบุหัวข้อรายงาน'; }
        });
        if (newTitle) {
            setReportTitle(newTitle);
            localStorage.setItem('customReportTitle', newTitle);
        }
    };

    const fontStyle = { fontFamily: '"TH SarabunPSK", "TH Sarabun New", "Sarabun", sans-serif' };
    const headerBorder = "border border-slate-300 dark:border-slate-700";
    const cellBorder = "border border-slate-200 dark:border-slate-800";
    
    const verticalTextStyle: React.CSSProperties = {
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        height: '100px',
    };

    const ResizableTh = ({ children, className, style, offset, ...props }: any) => (
        <th 
            {...props}
            className={`${headerBorder} p-1 relative hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bg-slate-100 dark:bg-slate-800 z-30 font-bold ${className || ''}`}
            style={{ 
                resize: 'horizontal', 
                overflow: 'hidden',
                position: 'sticky',
                top: offset,
                backgroundClip: 'padding-box', // Helps borders stay flush when sticky
                ...style 
            }}
        >
            <div className="w-full h-full flex items-center justify-center min-h-[inherit]">
                {children}
            </div>
        </th>
    );

    const renderHierarchy = (nodes: ReportNode[]) => {
        return nodes.map((node) => {
            const data = calculateNodeData(node);
            if (data.total === 0 && (selectedMainAgencies.length > 0 || selectedIntegrations.length > 0 || selectedActivities.length > 0 || selectedProvinces.length > 0 || selectedRegions.length > 0)) return null;
            const isLeafActivity = (node.type === 'activity' || node.type === 'subactivity') && node.activityMatcher;
            const showTargetUnit = isLeafActivity && (data.target !== '0' || data.unit !== '');
            let rowClass = "";
            let plClass = "pl-2";
            let fontClass = "font-normal text-slate-800 dark:text-slate-200";
            
            switch (node.type) {
                case 'plan':
                    rowClass = "bg-slate-100 dark:bg-slate-800/80 text-blue-900 dark:text-blue-300";
                    fontClass = "font-bold text-[18px]";
                    plClass = "pl-2";
                    break;
                case 'output':
                    rowClass = "bg-slate-50 dark:bg-slate-900/50 text-indigo-900 dark:text-indigo-300";
                    fontClass = "font-bold text-[18px]";
                    plClass = "pl-6";
                    break;
                case 'project':
                    rowClass = "bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-300";
                    fontClass = "font-bold text-[18px]";
                    plClass = "pl-10";
                    break;
                case 'group':
                    fontClass = "font-bold text-emerald-800 dark:text-emerald-300 text-[18px]";
                    plClass = "pl-16";
                    break;
                case 'subgroup':
                    fontClass = "font-bold text-slate-700 dark:text-slate-300 text-[18px]";
                    plClass = "pl-24";
                    break;
                case 'activity':
                    rowClass = "hover:bg-slate-50 dark:hover:bg-slate-800/50";
                    fontClass = "font-normal text-slate-800 dark:text-slate-200 text-[18px]";
                    plClass = "pl-32";
                    break;
                case 'subactivity':
                    rowClass = "hover:bg-slate-50 dark:hover:bg-slate-800/50";
                    fontClass = "font-normal text-slate-800 dark:text-slate-200 text-[18px]";
                    plClass = "pl-40";
                    break;
                default:
                    plClass = "pl-4";
            }

            return (
                <React.Fragment key={node.id}>
                    <tr className={`${rowClass} transition-colors`} data-type={node.type}>
                        <td className={`${cellBorder} px-2 py-1.5 text-left ${plClass} ${fontClass}`}>{node.title}</td>
                        {reportMode !== 'summary' && (
                            <>
                                <td className={`${cellBorder} px-1 py-1 text-center font-normal`}>{showTargetUnit ? data.target : ''}</td>
                                <td className={`${cellBorder} px-1 py-1 text-center font-normal`}>{showTargetUnit ? data.unit : ''}</td>
                            </>
                        )}
                        {reportMode === 'full' && (
                            <>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.salaryPermanent > 0 ? formatNumber(data.salaryPermanent) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.governmentCompensation > 0 ? formatNumber(data.governmentCompensation) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.compensationSupplies > 0 ? formatNumber(data.compensationSupplies) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.contractEmployees > 0 ? formatNumber(data.contractEmployees) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.utilities > 0 ? formatNumber(data.utilities) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.equipment > 0 ? formatNumber(data.equipment) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.landConstruction > 0 ? formatNumber(data.landConstruction) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.subsidies > 0 ? formatNumber(data.subsidies) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{data.otherExpenses > 0 ? formatNumber(data.otherExpenses) : '-'}</td>
                            </>
                        )}
                        {reportMode === 'province' && (
                            <>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{getRegularBudget(data) > 0 ? formatNumber(getRegularBudget(data)) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>{getInvestmentBudget(data) > 0 ? formatNumber(getInvestmentBudget(data)) : '-'}</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>-</td>
                                <td className={`${cellBorder} px-1 py-1 text-right ${fontClass}`}>-</td>
                            </>
                        )}
                        <td className={`${cellBorder} px-1 py-1 text-right font-bold ${node.type === 'plan' ? 'text-blue-900 dark:text-blue-300' : ''}`}>
                            {data.total > 0 ? formatNumber(data.total) : '-'}
                        </td>
                    </tr>
                    {node.children && renderHierarchy(node.children)}
                </React.Fragment>
            );
        });
    };

    return (
        <div className="max-w-[98vw] mx-auto px-4 py-8 print:w-full print:max-w-none print:p-0 print:m-0">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    nav, footer, .print\\:hidden, .swal2-container { display: none !important; }
                    #root > div { min-height: auto; }
                    .bg-slate-50, .dark .bg-slate-900 { background: white !important; }
                    #report-view-container { 
                        display: block !important; 
                        width: 100% !important; 
                        max-width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow: visible !important;
                        max-height: none !important;
                    }
                    table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; }
                    th, td { border: 1px solid #94a3b8 !important; }
                    thead, thead th { position: static !important; }
                }
                /* Removal of gaps in sticky header */
                th.sticky {
                    background-clip: padding-box;
                    z-index: 40;
                }
                thead tr:first-child th.sticky {
                    top: 0;
                }
            `}</style>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">รายงานสรุปงบประมาณ</h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 transition-colors">ระบบประมวลผลการจัดสรรงบประมาณ</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all font-medium text-base shadow-lg disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />} 
                            ดาวน์โหลด <ChevronDown size={16} className={`transition-transform duration-200 ${downloadDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {downloadDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                <button onClick={handleDownloadExcel} className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50">
                                    <div className="p-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><FileSpreadsheet size={18} /></div>
                                    <div className="flex flex-col"><span className="font-bold text-sm">Excel (.xlsx)</span><span className="text-[11px] text-slate-400">สไตล์และรูปแบบเดียวกับเว็บ</span></div>
                                </button>
                                <button onClick={handleDownloadPdf} className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg"><FileText size={18} /></div>
                                    <div className="flex flex-col"><span className="font-bold text-sm">PDF (.pdf)</span><span className="text-[11px] text-slate-400">ไฟล์เอกสารจริง (คัดลอกได้)</span></div>
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-200 rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all font-medium text-base shadow-lg">
                        <Printer size={18} /> พิมพ์รายงาน
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 print:hidden">
                <div 
                    className="flex justify-between items-center mb-4 cursor-pointer group pb-2 border-b border-slate-100 dark:border-slate-700" 
                    onClick={handleToggleFilters}
                >
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-lg">
                        <Filter size={20} /> ตัวกรองและตั้งค่ารายงาน
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full group-hover:text-emerald-600 transition-colors">
                        {showFilters ? 'ซ่อน' : 'แสดง'}
                        <ChevronDown size={16} className={`transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                    </div>
                </div>
                
                <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} ${filterOverflow ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <div className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                            <MultiSelectDropdown id="filter-main" label="หน่วยงานหลัก" values={selectedMainAgencies} onChange={setSelectedMainAgencies} options={mainAgencyOptions} placeholder="เลือกหน่วยงานหลัก..." />
                            <MultiSelectDropdown id="filter-integ" label="รายการบูรณาการ" values={selectedIntegrations} onChange={setSelectedIntegrations} options={integrationOptions} placeholder="เลือกรายการบูรณาการ..." />
                            <MultiSelectDropdown id="filter-activity" label="กิจกรรม" values={selectedActivities} onChange={setSelectedActivities} options={activityOptions} placeholder="เลือกกิจกรรม..." />
                            <MultiSelectDropdown id="filter-region" label="ภูมิภาค" values={selectedRegions} onChange={setSelectedRegions} options={regionOptions} placeholder="เลือกภูมิภาค..." />
                            <MultiSelectDropdown id="filter-prov" label="จังหวัด" values={selectedProvinces} onChange={setSelectedProvinces} options={provinceOptions} placeholder="เลือกจังหวัด..." />
                            <MultiSelectDropdown id="filter-resp" label="หน่วยปฏิบัติ" values={selectedResponsibleAgencies} onChange={setSelectedResponsibleAgencies} options={responsibleAgencyOptions} placeholder="เลือกหน่วยปฏิบัติ..." />
                            <MultiSelectDropdown id="filter-area" label="พื้นที่ดำเนินการ" values={selectedIntegrationAreas} onChange={setSelectedIntegrationAreas} options={integrationAreaOptions} placeholder="เลือกพื้นที่ดำเนินการ..." />
                            
                            <div className="flex items-end">
                                <button 
                                    onClick={handleClearFilters}
                                    className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 font-medium border border-red-100 dark:border-red-900/30"
                                >
                                    <X size={18} /> ล้างตัวกรองข้อมูล
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider"><LayoutList size={16} /> รูปแบบรายงานมาตรฐาน</div>
                                <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`transition-all duration-200 ${reportMode === 'full' ? 'text-emerald-600' : 'text-slate-300'}`}>{reportMode === 'full' ? <CheckCircle2 size={22} className="fill-emerald-50 dark:fill-emerald-950" /> : <Circle size={22} />}</div>
                                        <input type="radio" name="reportMode" className="hidden" checked={reportMode === 'full'} onChange={() => setReportMode('full')} />
                                        <span className={`font-medium text-base transition-colors ${reportMode === 'full' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>แสดงรายละเอียดครบถ้วน (ตามโครงสร้าง)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`transition-all duration-200 ${reportMode === 'summary' ? 'text-emerald-600' : 'text-slate-300'}`}>{reportMode === 'summary' ? <CheckCircle2 size={22} className="fill-emerald-50 dark:fill-emerald-950" /> : <Circle size={22} />}</div>
                                        <input type="radio" name="reportMode" className="hidden" checked={reportMode === 'summary'} onChange={() => setReportMode('summary')} />
                                        <span className={`font-medium text-base transition-colors ${reportMode === 'summary' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>สรุปงบประมาณ (ยอดรวมตามโครงสร้าง)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`transition-all duration-200 ${reportMode === 'province' ? 'text-emerald-600' : 'text-slate-300'}`}>{reportMode === 'province' ? <CheckCircle2 size={22} className="fill-emerald-50 dark:fill-emerald-950" /> : <Circle size={22} />}</div>
                                        <input type="radio" name="reportMode" className="hidden" checked={reportMode === 'province'} onChange={() => setReportMode('province')} />
                                        <span className={`font-medium text-base transition-colors ${reportMode === 'province' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>จำแนกรายจังหวัด (งบประจำ/ลงทุน)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="p-5 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                                <div className="flex items-center gap-2 mb-3 text-blue-500 dark:text-blue-400 text-sm font-bold uppercase tracking-wider"><LayoutGrid size={16} /> สรุปข้อมูลเพิ่มเติม</div>
                                <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`transition-all duration-200 ${reportMode === 'agency' ? 'text-blue-600' : 'text-slate-300'}`}>{reportMode === 'agency' ? <CheckCircle2 size={22} className="fill-blue-50 dark:fill-blue-950" /> : <Circle size={22} />}</div>
                                        <input type="radio" name="reportMode" className="hidden" checked={reportMode === 'agency'} onChange={() => setReportMode('agency')} />
                                        <span className={`font-medium text-base transition-colors ${reportMode === 'agency' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>สรุปงบประมาณตามหน่วยงานหลัก</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`transition-all duration-200 ${reportMode === 'integration' ? 'text-blue-600' : 'text-slate-300'}`}>{reportMode === 'integration' ? <CheckCircle2 size={22} className="fill-blue-50 dark:fill-blue-950" /> : <Circle size={22} />}</div>
                                        <input type="radio" name="reportMode" className="hidden" checked={reportMode === 'integration'} onChange={() => setReportMode('integration')} />
                                        <span className={`font-medium text-base transition-colors ${reportMode === 'integration' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>สรุปงบประมาณตามแผนงานบูรณาการ</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`transition-all duration-200 ${reportMode === 'integration-detailed' ? 'text-blue-600' : 'text-slate-300'}`}>{reportMode === 'integration-detailed' ? <CheckCircle2 size={22} className="fill-blue-50 dark:fill-blue-950" /> : <Circle size={22} />}</div>
                                        <input type="radio" name="reportMode" className="hidden" checked={reportMode === 'integration-detailed'} onChange={() => setReportMode('integration-detailed')} />
                                        <span className={`font-medium text-base transition-colors ${reportMode === 'integration-detailed' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>สรุปงบประมาณตามแผนงานบูรณาการ (ละเอียด)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="report-view-container" className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 w-full text-slate-900 dark:text-slate-100 transition-colors print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:overflow-visible flex flex-col h-[80vh]">
                <div className="p-4 md:p-10 pb-4 print:hidden border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex items-center gap-3 group relative cursor-pointer" onClick={handleEditTitle}>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors" style={fontStyle}>{reportTitle}</h3>
                            <div className="p-1.5 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 rounded-lg transition-all opacity-40 group-hover:opacity-100 print:hidden"><Edit2 size={18} /></div>
                        </div>
                        <p className="text-lg font-bold mt-2 text-slate-700 dark:text-slate-300" style={fontStyle}>
                            {(reportMode === 'agency' || reportMode === 'integration-detailed') ? 'สรุปตามหน่วยงานหลัก' : (reportMode === 'integration' ? 'สรุปตามแผนงานบูรณาการ' : '')}
                            {(reportMode === 'agency' || reportMode === 'integration' || reportMode === 'integration-detailed') && ' - '}
                            {[
                                selectedMainAgencies.length > 0 ? `หน่วยงานหลัก: ${selectedMainAgencies.join(', ')}` : '',
                                selectedIntegrations.length > 0 ? `บูรณาการ: ${selectedIntegrations.join(', ')}` : '',
                                selectedActivities.length > 0 ? `กิจกรรม: ${selectedActivities.join(', ')}` : '',
                                selectedRegions.length > 0 ? `ภูมิภาค: ${selectedRegions.join(', ')}` : '',
                                selectedProvinces.length > 0 ? `จังหวัด: ${selectedProvinces.join(', ')}` : ''
                            ].filter(Boolean).join(' | ') || 'ภาพรวมทุกหน่วยงาน'}
                        </p>
                    </div>
                    <div className="flex justify-end mt-4">
                        <div className="text-xs text-slate-400 flex items-center gap-1"><ArrowRightLeft size={12} /><span>สามารถลากเส้นขอบหัวตารางเพื่อปรับความกว้างได้</span></div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-[18px] leading-tight" style={fontStyle}>
                        <thead className="bg-white dark:bg-slate-900">
                            {reportMode === 'agency' || reportMode === 'integration-detailed' ? (
                                <>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-center text-slate-900 dark:text-slate-100">
                                        <ResizableTh className="p-2 min-w-[250px]" rowSpan={2} offset={0}>{reportMode === 'integration-detailed' ? 'หน่วยงาน / จังหวัด / พื้นที่' : 'หน่วยงาน'}</ResizableTh>
                                        <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={3}>งบบุคลากร</th>
                                        <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={4}>งบดำเนินงาน</th>
                                        <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={3}>งบลงทุน</th>
                                        <ResizableTh className="w-24 min-w-[80px]" rowSpan={2} offset={0}>เงินอุดหนุน</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px]" rowSpan={2} offset={0}>รายจ่ายอื่น</ResizableTh>
                                        <ResizableTh className="w-32 min-w-[120px]" rowSpan={2} offset={0}>รวมทั้งสิ้น (บาท)</ResizableTh>
                                    </tr>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-center text-slate-800 dark:text-slate-200">
                                        <ResizableTh className="w-24 min-w-[100px] text-[14px] bg-slate-200 dark:bg-slate-700" offset={31}>รวมงบบุคลากร</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>เงินเดือนฯ</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>พนง.ราชการ</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[100px] text-[14px] bg-slate-200 dark:bg-slate-700" offset={31}>รวมงบดำเนินงาน</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>ใช้สอย/วัสดุ</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>จ้างเหมาฯ</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>สาธารณูปโภค</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[100px] text-[14px] bg-slate-200 dark:bg-slate-700" offset={31}>รวมงบลงทุน</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>ค่าครุภัณฑ์</ResizableTh>
                                        <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>ที่ดินฯ</ResizableTh>
                                    </tr>
                                </>
                            ) : reportMode === 'integration' ? (
                                <tr className="bg-slate-100 dark:bg-slate-800 text-center text-slate-900 dark:text-slate-100">
                                    <ResizableTh className="p-2 min-w-[250px]" offset={0}>หน่วยงาน</ResizableTh>
                                    {dropdowns.integration.map(type => (
                                        <ResizableTh key={type} className="min-w-[120px]" offset={0}>{type}</ResizableTh>
                                    ))}
                                    <ResizableTh className="w-32 min-w-[120px]" offset={0}>รวมทั้งสิ้น (บาท)</ResizableTh>
                                </tr>
                            ) : (
                                <>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-center text-slate-900 dark:text-slate-100">
                                        <ResizableTh className={`p-2 ${reportMode === 'summary' ? 'min-w-[600px]' : 'min-w-[300px]'}`} rowSpan={2} offset={0}>แผนงาน - ผลผลิต - กิจกรรม/โครงการ</ResizableTh>
                                        {reportMode !== 'summary' && (
                                            <>
                                                <ResizableTh className="w-12 min-w-[40px]" rowSpan={2} offset={0}><div style={verticalTextStyle}>เป้าหมาย</div></ResizableTh>
                                                <ResizableTh className="w-12 min-w-[40px]" rowSpan={2} offset={0}><div style={verticalTextStyle}>หน่วยนับ</div></ResizableTh>
                                            </>
                                        )}
                                        {reportMode === 'full' && (
                                            <>
                                                <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={2}>งบบุคลากร</th>
                                                <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={3}>งบดำเนินงาน</th>
                                                <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={2}>งบลงทุน</th>
                                                <ResizableTh className="w-24 min-w-[80px]" rowSpan={2} offset={0}>เงินอุดหนุน</ResizableTh>
                                                <ResizableTh className="w-24 min-w-[80px]" rowSpan={2} offset={0}>รายจ่ายอื่น</ResizableTh>
                                            </>
                                        )}
                                        {reportMode === 'province' && (
                                            <>
                                                <th className={`${headerBorder} p-1 bg-slate-100 dark:bg-slate-800 font-bold sticky top-0 z-30`} style={{ backgroundClip: 'padding-box' }} colSpan={2}>งบประมาณตาม พ.ร.บ. ปี {budgetYear}</th>
                                                <ResizableTh className="w-24 min-w-[80px]" rowSpan={2} offset={0}>เงินนอก<br/>งบประมาณ</ResizableTh>
                                                <ResizableTh className="w-24 min-w-[80px]" rowSpan={2} offset={0}>งบกลาง<br/>ปี {budgetYear}</ResizableTh>
                                            </>
                                        )}
                                        <ResizableTh className={`${reportMode === 'summary' ? 'w-1/3 min-w-[200px]' : 'w-32 min-w-[120px]'}`} rowSpan={2} offset={0}>รวมทั้งสิ้น (บาท)</ResizableTh>
                                    </tr>
                                    {reportMode === 'full' && (
                                        <tr className="bg-slate-100 dark:bg-slate-800 text-center text-slate-800 dark:text-slate-200">
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>เงินเดือนฯ</ResizableTh>
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>พนง.ราชการ</ResizableTh>
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>ใช้สอย/วัสดุ</ResizableTh>
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>จ้างเหมาฯ</ResizableTh>
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>สาธารณูปโภค</ResizableTh>
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>ค่าครุภัณฑ์</ResizableTh>
                                            <ResizableTh className="w-24 min-w-[80px] text-[14px]" offset={31}>ที่ดินฯ</ResizableTh>
                                        </tr>
                                    )}
                                    {reportMode === 'province' && (
                                        <tr className="bg-slate-100 dark:bg-slate-800 text-center text-slate-800 dark:text-slate-200">
                                            <ResizableTh className="w-32 min-w-[100px]" offset={31}>งบประจำ</ResizableTh>
                                            <ResizableTh className="w-32 min-w-[100px]" offset={31}>งบลงทุน</ResizableTh>
                                        </tr>
                                    )}
                                </>
                            )}
                        </thead>
                        <tbody>
                            {reportMode === 'agency' ? (
                                <>
                                    <tr className="bg-emerald-50/50 dark:bg-emerald-900/30 text-slate-900 dark:text-slate-100 font-bold">
                                        <td className={`${headerBorder} px-3 py-2 text-left font-bold`}>รวมทั้งสิ้น</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right bg-emerald-100/50 dark:bg-emerald-800/30 font-bold`}>{formatMoney((grandTotal as any).totalPersonnel)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.salaryPermanent)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.governmentCompensation)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right bg-emerald-100/50 dark:bg-emerald-800/30 font-bold`}>{formatMoney((grandTotal as any).totalOperational)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.compensationSupplies)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.contractEmployees)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.utilities)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right bg-emerald-100/50 dark:bg-emerald-800/30 font-bold`}>{formatMoney((grandTotal as any).totalInvestment)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.equipment)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.landConstruction)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.subsidies)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.otherExpenses)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.total)}</td>
                                    </tr>
                                    {agencySummaryData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-300">
                                            <td className={`${cellBorder} px-2 py-1.5 text-left pl-4 font-normal text-[18px]`}>{item.title}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right bg-slate-50 dark:bg-slate-800/80 font-normal text-[18px]`}>{formatMoney(item.totalPersonnel)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.salaryPermanent)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.governmentCompensation)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right bg-slate-50 dark:bg-slate-800/80 font-normal text-[18px]`}>{formatMoney(item.totalOperational)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.compensationSupplies)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.contractEmployees)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.utilities)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right bg-slate-50 dark:bg-slate-800/80 font-normal text-[18px]`}>{formatMoney(item.totalInvestment)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.equipment)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.landConstruction)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.subsidies)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item.otherExpenses)}</td>
                                            <td className={`${cellBorder} px-1 py-1 text-right font-bold text-[18px]`}>{formatMoney(item.total)}</td>
                                        </tr>
                                    ))}
                                </>
                            ) : reportMode === 'integration-detailed' ? (
                                <>
                                    <tr className="bg-emerald-50/50 dark:bg-emerald-900/30 text-slate-900 dark:text-slate-100 font-bold">
                                        <td className={`${headerBorder} px-3 py-2 text-left font-bold`}>รวมทั้งสิ้น</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right bg-emerald-100/50 dark:bg-emerald-800/30 font-bold`}>{formatMoney((grandTotal as any).totalPersonnel)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.salaryPermanent)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.governmentCompensation)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right bg-emerald-100/50 dark:bg-emerald-800/30 font-bold`}>{formatMoney((grandTotal as any).totalOperational)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.compensationSupplies)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.contractEmployees)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.utilities)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right bg-emerald-100/50 dark:bg-emerald-800/30 font-bold`}>{formatMoney((grandTotal as any).totalInvestment)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.equipment)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.landConstruction)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.subsidies)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.otherExpenses)}</td>
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.total)}</td>
                                    </tr>
                                    {integrationDetailedData.map((main, idx) => {
                                        const totalMainPersonnel = main.salaryPermanent + main.governmentCompensation;
                                        const totalMainOp = main.compensationSupplies + main.contractEmployees + main.utilities;
                                        const totalMainInv = main.equipment + main.landConstruction;
                                        return (
                                            <React.Fragment key={`main-${idx}`}>
                                                {/* Level 1: Main Agency */}
                                                <tr className="bg-slate-200 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 font-bold border-b-2 border-slate-300 dark:border-slate-600">
                                                    <td className={`${cellBorder} px-2 py-1.5 text-left pl-2 text-[18px]`}>{main.name}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right bg-slate-300/50 dark:bg-slate-600/50 text-[18px]`}>{formatMoney(totalMainPersonnel)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.salaryPermanent)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.governmentCompensation)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right bg-slate-300/50 dark:bg-slate-600/50 text-[18px]`}>{formatMoney(totalMainOp)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.compensationSupplies)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.contractEmployees)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.utilities)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right bg-slate-300/50 dark:bg-slate-600/50 text-[18px]`}>{formatMoney(totalMainInv)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.equipment)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.landConstruction)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.subsidies)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.otherExpenses)}</td>
                                                    <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(main.total)}</td>
                                                </tr>
                                                {main.sortedChildren?.map((prov, pIdx) => {
                                                    const totalProvPersonnel = prov.salaryPermanent + prov.governmentCompensation;
                                                    const totalProvOp = prov.compensationSupplies + prov.contractEmployees + prov.utilities;
                                                    const totalProvInv = prov.equipment + prov.landConstruction;
                                                    return (
                                                        <React.Fragment key={`prov-${pIdx}`}>
                                                            {/* Level 2: Province */}
                                                            <tr className="bg-slate-100 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 font-bold">
                                                                <td className={`${cellBorder} px-2 py-1.5 text-left pl-6 text-[18px]`}>{prov.name}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right bg-slate-200/50 dark:bg-slate-700/50 text-[18px]`}>{formatMoney(totalProvPersonnel)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.salaryPermanent)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.governmentCompensation)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right bg-slate-200/50 dark:bg-slate-700/50 text-[18px]`}>{formatMoney(totalProvOp)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.compensationSupplies)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.contractEmployees)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.utilities)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right bg-slate-200/50 dark:bg-slate-700/50 text-[18px]`}>{formatMoney(totalProvInv)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.equipment)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.landConstruction)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.subsidies)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.otherExpenses)}</td>
                                                                <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(prov.total)}</td>
                                                            </tr>
                                                            {prov.sortedChildren?.map((resp, rIdx) => {
                                                                const totalRespPersonnel = resp.salaryPermanent + resp.governmentCompensation;
                                                                const totalRespOp = resp.compensationSupplies + resp.contractEmployees + resp.utilities;
                                                                const totalRespInv = resp.equipment + resp.landConstruction;
                                                                return (
                                                                    <React.Fragment key={`resp-${rIdx}`}>
                                                                        {/* Level 3: Responsible Agency */}
                                                                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-semibold">
                                                                            <td className={`${cellBorder} px-2 py-1.5 text-left pl-10 text-[18px]`}>{resp.name}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right bg-slate-100/50 dark:bg-slate-800/50 text-[18px]`}>{formatMoney(totalRespPersonnel)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.salaryPermanent)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.governmentCompensation)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right bg-slate-100/50 dark:bg-slate-800/50 text-[18px]`}>{formatMoney(totalRespOp)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.compensationSupplies)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.contractEmployees)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.utilities)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right bg-slate-100/50 dark:bg-slate-800/50 text-[18px]`}>{formatMoney(totalRespInv)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.equipment)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.landConstruction)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.subsidies)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.otherExpenses)}</td>
                                                                            <td className={`${cellBorder} px-1 py-1 text-right text-[18px]`}>{formatMoney(resp.total)}</td>
                                                                        </tr>
                                                                        {resp.sortedChildren?.map((area, aIdx) => {
                                                                            const totalAreaPersonnel = area.salaryPermanent + area.governmentCompensation;
                                                                            const totalAreaOp = area.compensationSupplies + area.contractEmployees + area.utilities;
                                                                            const totalAreaInv = area.equipment + area.landConstruction;
                                                                            return (
                                                                                // Level 4: Integration Area
                                                                                <tr key={`area-${aIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400">
                                                                                    <td className={`${cellBorder} px-2 py-1.5 text-left pl-14 font-normal text-[18px]`}>{area.name}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right bg-slate-50/50 dark:bg-slate-900/30 font-normal text-[18px]`}>{formatMoney(totalAreaPersonnel)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.salaryPermanent)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.governmentCompensation)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right bg-slate-50/50 dark:bg-slate-900/30 font-normal text-[18px]`}>{formatMoney(totalAreaOp)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.compensationSupplies)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.contractEmployees)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.utilities)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right bg-slate-50/50 dark:bg-slate-900/30 font-normal text-[18px]`}>{formatMoney(totalAreaInv)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.equipment)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.landConstruction)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.subsidies)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.otherExpenses)}</td>
                                                                                    <td className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(area.total)}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            ) : reportMode === 'integration' ? (
                                <>
                                    <tr className="bg-emerald-50/50 dark:bg-emerald-900/30 text-slate-900 dark:text-slate-100 font-bold">
                                        <td className={`${headerBorder} px-3 py-2 text-left font-bold`}>รวมทั้งสิ้น</td>
                                        {dropdowns.integration.map(type => {
                                            const sum = integrationSummaryData.reduce((acc, curr) => acc + (curr[type] || 0), 0);
                                            return <td key={type} className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(sum)}</td>;
                                        })}
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatMoney(grandTotal.total)}</td>
                                    </tr>
                                    {integrationSummaryData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-300">
                                            <td className={`${cellBorder} px-2 py-1.5 text-left pl-4 font-normal text-[18px]`}>{item.title}</td>
                                            {dropdowns.integration.map(type => (<td key={type} className={`${cellBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatMoney(item[type] || 0)}</td>))}
                                            <td className={`${cellBorder} px-1 py-1 text-right font-bold text-[18px]`}>{formatMoney(item.total)}</td>
                                        </tr>
                                    ))}
                                </>
                            ) : (
                                <>
                                    <tr className="bg-emerald-50/50 dark:bg-emerald-900/30 text-slate-900 dark:text-slate-100 font-bold">
                                        <td className={`${headerBorder} px-3 py-2 text-left font-bold`}>รวมทั้งสิ้น</td>
                                        {reportMode !== 'summary' && (<><td className={`${headerBorder} px-1 py-1 text-center font-bold`}></td><td className={`${headerBorder} px-1 py-1 text-center font-bold`}></td></>)}
                                        {reportMode === 'full' && (
                                            <>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.salaryPermanent)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.governmentCompensation)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.compensationSupplies)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.contractEmployees)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.utilities)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.equipment)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.landConstruction)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.subsidies)}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.otherExpenses)}</td>
                                            </>
                                        )}
                                        {reportMode === 'province' && (
                                            <>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(getRegularBudget(grandTotal))}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(getInvestmentBudget(grandTotal))}</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>-</td>
                                                <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>-</td>
                                            </>
                                        )}
                                        <td className={`${headerBorder} px-1 py-1 text-right font-bold`}>{formatNumber(grandTotal.total)}</td>
                                    </tr>
                                    {renderHierarchy(reportHierarchy)}
                                    {uncategorizedRecords.length > 0 && (
                                        <>
                                            <tr className="bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 font-bold">
                                                <td className={`${headerBorder} px-3 py-2 text-left font-bold`} colSpan={reportMode === 'full' ? 13 : reportMode === 'province' ? 8 : 2}>*** รายการอื่นๆ (อยู่นอกโครงสร้างหลัก) ***</td>
                                            </tr>
                                            {uncategorizedRecords.map((r, idx) => (
                                                <tr key={`uncat-${idx}`} className="hover:bg-rose-100/30 dark:hover:bg-rose-900/10 text-slate-800 dark:text-slate-300">
                                                    <td className={`${headerBorder} px-3 py-1.5 text-left pl-8 font-normal text-[18px]`}>- {r.activity}</td>
                                                    {reportMode !== 'summary' && (<><td className={`${headerBorder} px-1 py-1 text-center font-normal text-[18px]`}>{r.target}</td><td className={`${headerBorder} px-1 py-1 text-center font-normal text-[18px]`}>{r.unit}</td></>)}
                                                    {reportMode === 'full' && (
                                                        <>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.salaryPermanent)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.governmentCompensation)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.compensationSupplies)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.contractEmployees)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.utilities)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.equipment)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.landConstruction)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.subsidies)}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(r.otherExpenses)}</td>
                                                        </>
                                                    )}
                                                    {reportMode === 'province' && (
                                                        <>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(getRegularBudget(r as any))}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>{formatNumber(getInvestmentBudget(r as any))}</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>-</td>
                                                            <td className={`${headerBorder} px-1 py-1 text-right font-normal text-[18px]`}>-</td>
                                                        </>
                                                    )}
                                                    <td className={`${headerBorder} px-1 py-1 text-right font-bold text-[18px]`}>{formatNumber(r.total)}</td>
                                                </tr>
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={reportMode === 'full' ? 13 : reportMode === 'province' ? 8 : (reportMode === 'agency' || reportMode === 'integration-detailed' ? 14 : dropdowns.integration.length + 2)} className={`${headerBorder} px-4 py-16 text-center text-slate-400 dark:text-slate-600`}>
                                        <div className="flex flex-col items-center gap-3"><AlertCircle size={40} className="opacity-20" /><span className="text-xl">ไม่พบข้อมูลตามเงื่อนไขที่ระบุ</span></div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportView;