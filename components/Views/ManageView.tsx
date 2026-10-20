import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dataService, MANAGE_SUB_MENUS, FIELD_LABELS, useDataSync } from '../../services/dataService';
import Swal from 'sweetalert2';
import { 
    Plus, Edit2, Trash2, ChevronRight, ChevronDown, Network, 
    Layers, List, FileText, Settings, Database, FileBarChart, CheckSquare, 
    Users, Save, RefreshCw, Folder, Layout, GripVertical, Search, ArrowUp, ArrowDown,
    Eye, ToggleLeft, ToggleRight, Map
} from 'lucide-react';
import { ReportNode } from '../../types';

// Icons mapping
const ICONS: Record<string, React.ReactNode> = {
    hierarchy: <Network size={20} />,
    responsible: <Layers size={20} />,
    integration: <List size={20} />,
    activity: <FileText size={20} />,
    unit: <Database size={20} />,
    report: <FileBarChart size={20} />,
    fields: <CheckSquare size={20} />,
    tableColumns: <Settings size={20} />,
    region: <Map size={20} />
};

// Hierarchy Level Config & Colors
const HIERARCHY_CONFIG = {
    plan: { label: 'แผนงาน', level: 1, color: 'bg-blue-600' },
    output: { label: 'ผลผลิต', level: 2, color: 'bg-indigo-600' },
    project: { label: 'โครงการ', level: 3, color: 'bg-teal-600' },
    group: { label: 'กลุ่มงาน', level: 4, color: 'bg-emerald-600' },
    subgroup: { label: 'กลุ่มงานย่อย', level: 5, color: 'bg-green-600' },
    activity: { label: 'กิจกรรม', level: 6, color: 'bg-slate-600' },
    subactivity: { label: 'กิจกรรมย่อย', level: 7, color: 'bg-slate-500' }
};

const ManageView: React.FC = () => {
    useDataSync(); // Force re-render when data changes
    const location = useLocation();
    const navigate = useNavigate();
    
    // Determine active tab
    const getActiveTab = () => {
        const path = location.pathname;
        const found = MANAGE_SUB_MENUS.find(m => m.path === path);
        if (found) return found.id;
        return MANAGE_SUB_MENUS[0].id;
    };

    const [activeTab, setActiveTab] = useState(getActiveTab());

    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [location]);

    // Data States
    const [hierarchy, setHierarchy] = useState(dataService.getHierarchy());
    const [respData, setRespData] = useState(dataService.getResponsibleData());
    const [dropdowns, setDropdowns] = useState(dataService.getDropdowns());
    const [fieldVisibility, setFieldVisibility] = useState(dataService.getFieldVisibility());
    const [tableColumnVisibility, setTableColumnVisibility] = useState(dataService.getTableColumnVisibility());
    
    // Report Structure State
    const [reportStructure, setReportStructure] = useState<ReportNode[]>([]);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    
    // Region Data State
    const [regionData, setRegionData] = useState(dataService.getRegionData());
    const [selectedRegion, setSelectedRegion] = useState('');

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // UI State for Hierarchy & Responsible
    const [selectedMainAgency, setSelectedMainAgency] = useState('');
    
    // UI State for Report Drag & Drop
    const [draggedActivity, setDraggedActivity] = useState<string | null>(null);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [activitySearch, setActivitySearch] = useState('');

    useEffect(() => {
        setHierarchy(dataService.getHierarchy());
        setRespData(dataService.getResponsibleData());
        setDropdowns(dataService.getDropdowns());
        setFieldVisibility(dataService.getFieldVisibility());
        setTableColumnVisibility(dataService.getTableColumnVisibility());
        setReportStructure(dataService.getReportStructure());
        setRegionData(dataService.getRegionData());
    }, [refreshTrigger]);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    const handleTabChange = (path: string) => {
        setSelectedMainAgency('');
        setSelectedRegion('');
        navigate(path);
    };

    // --- Report Management Logic ---

    // 1. Calculate Used Activities
    const usedActivities = useMemo(() => {
        const used = new Set<string>();
        const traverse = (nodes: ReportNode[]) => {
            nodes.forEach(node => {
                if (node.activityMatcher) used.add(node.activityMatcher);
                if (node.children) traverse(node.children);
            });
        };
        traverse(reportStructure);
        return used;
    }, [reportStructure]);

    // 2. Available Activities (Left Column)
    const availableActivities = useMemo(() => {
        const allActivities = dropdowns.activity || [];
        const compareActivities = dataService.getCompareData().map(c => c.activity);
        const uniqueAll = Array.from(new Set([...allActivities, ...compareActivities])).sort();
        
        return uniqueAll.filter(act => 
            !usedActivities.has(act) && 
            act.toLowerCase().includes(activitySearch.toLowerCase())
        );
    }, [dropdowns.activity, usedActivities, activitySearch, refreshTrigger]);

    // 3. Tree Manipulation
    const toggleCollapse = (nodeId: string) => {
        setCollapsedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    };

    const addNode = (parentId: string | null, type: ReportNode['type'], title: string, activityMatcher?: string) => {
        const newNode: ReportNode = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            title,
            type,
            activityMatcher,
            children: []
        };

        if (parentId === null) {
            setReportStructure(prev => [...prev, newNode]);
        } else {
            const updateTree = (nodes: ReportNode[]): ReportNode[] => {
                return nodes.map(node => {
                    if (node.id === parentId) {
                        return { ...node, children: [...(node.children || []), newNode] };
                    }
                    if (node.children) {
                        return { ...node, children: updateTree(node.children) };
                    }
                    return node;
                });
            };
            setReportStructure(prev => updateTree(prev));
            setCollapsedNodes(prev => {
                const next = new Set(prev);
                next.delete(parentId);
                return next;
            });
        }
    };

    const handleAddChildNode = async (parentId: string | null, parentType?: string) => {
        const parentLevel = parentType ? (HIERARCHY_CONFIG as any)[parentType]?.level || 0 : 0;
        
        const options = Object.entries(HIERARCHY_CONFIG)
            .filter(([_, config]) => config.level > parentLevel)
            .sort((a, b) => a[1].level - b[1].level);

        if (options.length === 0) {
            Swal.fire('ไม่สามารถเพิ่มได้', 'รายการนี้เป็นระดับต่ำสุดแล้ว', 'info');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: parentId ? 'เพิ่มรายการย่อย' : 'เพิ่มรายการหลัก',
            html: `
                <div class="text-left mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select id="swal-node-type" class="swal2-select" style="margin: 0; width: 100%;">
                        ${options.map(([key, config]) => `<option value="${key}">${config.label}</option>`).join('')}
                    </select>
                </div>
                <div class="text-left">
                    <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อรายการ</label>
                    <input id="swal-node-title" class="swal2-input" placeholder="ระบุชื่อ..." style="margin: 0; width: 100%;">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'เพิ่ม',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
            preConfirm: () => {
                return {
                    type: (document.getElementById('swal-node-type') as HTMLSelectElement).value,
                    title: (document.getElementById('swal-node-title') as HTMLInputElement).value
                };
            }
        });

        if (formValues && formValues.title) {
            addNode(parentId, formValues.type as any, formValues.title);
        }
    };

    const updateNodeDetails = (nodeId: string, updates: Partial<ReportNode>) => {
        const updateTree = (nodes: ReportNode[]): ReportNode[] => {
            return nodes.map(node => {
                if (node.id === nodeId) return { ...node, ...updates };
                if (node.children) return { ...node, children: updateTree(node.children) };
                return node;
            });
        };
        setReportStructure(prev => updateTree(prev));
    };

    const updateNodeTitle = (nodeId: string, newTitle: string) => {
        updateNodeDetails(nodeId, { title: newTitle });
    };

    const handleEditNodeProperties = async (node: ReportNode) => {
        const options = Object.entries(HIERARCHY_CONFIG).sort((a, b) => a[1].level - b[1].level);
        
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขรายละเอียด',
            html: `
                <div class="text-left mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">ประเภท (Level)</label>
                    <select id="swal-edit-type" class="swal2-select" style="margin: 0; width: 100%;">
                        ${options.map(([key, config]) => `<option value="${key}" ${key === node.type ? 'selected' : ''}>${config.label}</option>`).join('')}
                    </select>
                </div>
                <div class="text-left mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อรายการ</label>
                    <input id="swal-edit-title" class="swal2-input" value="${node.title}" placeholder="ระบุชื่อ..." style="margin: 0; width: 100%;">
                </div>
                <div class="text-left">
                    <label class="block text-sm font-medium text-gray-700 mb-1">กิจกรรมที่เชื่อมโยง (ถ้ามี)</label>
                    <input id="swal-edit-matcher" class="swal2-input" value="${node.activityMatcher || ''}" placeholder="ชื่อกิจกรรมในฐานข้อมูล" style="margin: 0; width: 100%;">
                    <p class="text-xs text-gray-500 mt-1">* ระบุเฉพาะเมื่อรายการนี้เป็นกิจกรรมที่ต้องการดึงงบประมาณ</p>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#059669',
            preConfirm: () => {
                return {
                    type: (document.getElementById('swal-edit-type') as HTMLSelectElement).value,
                    title: (document.getElementById('swal-edit-title') as HTMLInputElement).value,
                    activityMatcher: (document.getElementById('swal-edit-matcher') as HTMLInputElement).value
                };
            }
        });

        if (formValues) {
            updateNodeDetails(node.id, {
                type: formValues.type as any,
                title: formValues.title,
                activityMatcher: formValues.activityMatcher || undefined
            });
        }
    };

    const deleteNode = (nodeId: string) => {
        const removeNode = (nodes: ReportNode[]): ReportNode[] => {
            return nodes.filter(node => node.id !== nodeId).map(node => {
                if (node.children) return { ...node, children: removeNode(node.children) };
                return node;
            });
        };
        
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "หากลบรายการแม่ รายการลูกทั้งหมดจะถูกลบด้วย",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            confirmButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                setReportStructure(prev => removeNode(prev));
            }
        });
    };

    const moveNode = (nodeId: string, direction: 'up' | 'down') => {
        const moveInList = (nodes: ReportNode[]): ReportNode[] => {
            const idx = nodes.findIndex(n => n.id === nodeId);
            if (idx !== -1) {
                const newNodes = [...nodes];
                if (direction === 'up' && idx > 0) {
                    [newNodes[idx], newNodes[idx - 1]] = [newNodes[idx - 1], newNodes[idx]];
                } else if (direction === 'down' && idx < newNodes.length - 1) {
                    [newNodes[idx], newNodes[idx + 1]] = [newNodes[idx + 1], newNodes[idx]];
                }
                return newNodes;
            }
            return nodes.map(node => {
                if (node.children) return { ...node, children: moveInList(node.children) };
                return node;
            });
        };
        setReportStructure(prev => moveInList(prev));
    };

    const moveNodeToParent = (draggedId: string, targetId: string) => {
        setReportStructure(prev => {
            let nodeToMove: ReportNode | null = null;
            
            // 1. Remove node from current position
            const removeNode = (nodes: ReportNode[]): ReportNode[] => {
                return nodes.reduce((acc: ReportNode[], node) => {
                    if (node.id === draggedId) {
                        nodeToMove = node;
                        return acc;
                    }
                    if (node.children) {
                        return [...acc, { ...node, children: removeNode(node.children) }];
                    }
                    return [...acc, node];
                }, []);
            };

            const structureWithoutNode = removeNode(prev);
            
            if (!nodeToMove) return prev;

            // 2. Check circular dependency (target cannot be a child of dragged node)
            const isChild = (parent: ReportNode, childId: string): boolean => {
                if (!parent.children) return false;
                return parent.children.some(c => c.id === childId || isChild(c, childId));
            };

            if (isChild(nodeToMove!, targetId)) {
                Swal.fire('ทำไม่ได้', 'ไม่สามารถย้ายรายการไปไว้ในรายการย่อยของตัวเองได้', 'error');
                return prev; // Revert
            }

            // 3. Insert node into target's children
            const insertNode = (nodes: ReportNode[]): ReportNode[] => {
                return nodes.map(node => {
                    if (node.id === targetId) {
                        // Open the target folder
                        setCollapsedNodes(prev => {
                            const next = new Set(prev);
                            next.delete(targetId);
                            return next;
                        });
                        return { ...node, children: [...(node.children || []), nodeToMove!] };
                    }
                    if (node.children) {
                        return { ...node, children: insertNode(node.children) };
                    }
                    return node;
                });
            };

            return insertNode(structureWithoutNode);
        });
    };

    const handleSaveStructure = async () => {
        Swal.fire({
            title: 'กำลังบันทึก...',
            didOpen: () => Swal.showLoading()
        });
        
        dataService.setReportStructure(reportStructure);
        const res = await dataService.saveReportStructureToCloud(reportStructure);
        
        if (res.success) {
            Swal.fire('สำเร็จ', 'บันทึกโครงสร้างรายงานเรียบร้อย', 'success');
        } else {
            Swal.fire('ผิดพลาด', res.message, 'error');
        }
    };

    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent, activity: string) => {
        e.dataTransfer.setData('activity', activity);
        e.dataTransfer.effectAllowed = 'copy';
        setDraggedActivity(activity);
    };

    const handleNodeDragStart = (e: React.DragEvent, nodeId: string) => {
        e.dataTransfer.setData('nodeId', nodeId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedNodeId(nodeId);
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent, targetNodeId: string, targetNodeType: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const activity = e.dataTransfer.getData('activity');
        const nodeId = e.dataTransfer.getData('nodeId');

        if (activity) {
            // Determine type based on parent logic
            let newType: any = 'activity';
            const parentConfig = (HIERARCHY_CONFIG as any)[targetNodeType];
            if (parentConfig) {
                const childLevel = parentConfig.level + 1;
                // Find config for next level
                const childEntry = Object.entries(HIERARCHY_CONFIG).find(([_, c]) => c.level === childLevel);
                if (childEntry) {
                    newType = childEntry[0];
                }
            }

            addNode(targetNodeId, newType, activity, activity);
            setDraggedActivity(null);
        } else if (nodeId) {
            if (nodeId !== targetNodeId) {
                moveNodeToParent(nodeId, targetNodeId);
            }
            setDraggedNodeId(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        // Ensure dropEffect matches allowed effect to allow dropping
        if (draggedActivity) {
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'move';
        }
    };

    // Render Recursive Tree
    const renderTreeNode = (node: ReportNode, level: number = 0) => {
        const isCollapsed = collapsedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isBeingDragged = draggedNodeId === node.id;
        
        // Define Type Styles
        let typeLabel = '';
        let typeColor = 'text-slate-500';
        let bgColor = 'bg-white dark:bg-slate-800';
        
        const config = (HIERARCHY_CONFIG as any)[node.type];
        if (config) {
            typeLabel = config.label;
            
            // Background Colors by Level
            if (node.type === 'plan') bgColor = 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500';
            else if (node.type === 'output') bgColor = 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500';
            else if (node.type === 'project') bgColor = 'bg-teal-50/50 dark:bg-teal-900/10 border-l-4 border-l-teal-500';
            else if (node.type === 'group') bgColor = 'bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-l-emerald-500';
            else if (node.type === 'subgroup') bgColor = 'bg-green-50/50 dark:bg-green-900/10 border-l-4 border-l-green-500';
            else if (node.type === 'activity') typeColor = 'text-slate-600';
            else if (node.type === 'subactivity') typeColor = 'text-slate-500';
        } else {
            typeLabel = node.type;
        }

        // Only allow dropping on nodes that aren't the lowest level
        const canHaveChildren = node.type !== 'subactivity';

        return (
            <div key={node.id} className={`select-none min-w-fit ${isBeingDragged ? 'opacity-40' : ''}`}>
                <div 
                    draggable
                    onDragStart={(e) => handleNodeDragStart(e, node.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 cursor-move ${bgColor} group transition-all`}
                    style={{ marginLeft: `${level * 24}px` }}
                    onDragOver={canHaveChildren ? handleDragOver : undefined}
                    onDrop={canHaveChildren ? (e) => handleDrop(e, node.id, node.type) : undefined}
                >
                    <div className="flex items-center gap-1 shrink-0">
                         <button 
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${hasChildren ? 'visible' : 'invisible'}`}
                        >
                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" />
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-3">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-white whitespace-nowrap ${config?.color || 'bg-slate-400'}`}>
                            {typeLabel}
                        </span>
                        
                        {node.activityMatcher ? (
                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{node.title}</span>
                        ) : (
                             <input 
                                type="text" 
                                value={node.title}
                                onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()} // Prevent dragging when clicking input
                                className="flex-1 bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 min-w-[150px]"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                         <button onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'up'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="ย้ายขึ้น"><ArrowUp size={14}/></button>
                         <button onClick={(e) => { e.stopPropagation(); moveNode(node.id, 'down'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="ย้ายลง"><ArrowDown size={14}/></button>
                         
                         {canHaveChildren && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleAddChildNode(node.id, node.type); }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded flex items-center gap-1"
                                title="เพิ่มรายการย่อย"
                            >
                                <Plus size={14} />
                            </button>
                         )}

                         <button 
                            onClick={(e) => { e.stopPropagation(); handleEditNodeProperties(node); }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="ตั้งค่า"
                         >
                            <Settings size={14} />
                         </button>
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="ลบ"
                         >
                            <Trash2 size={14} />
                         </button>
                    </div>
                </div>

                {!isCollapsed && node.children && (
                    <div className="relative">
                        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" style={{ marginLeft: `${level * 24}px` }}></div>
                        {node.children.map(child => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    // --- End Report Logic ---

    // Handlers for Standard CRUD (Hierarchy, Responsible, etc.)
    const handleAddHierarchy = async (defaultMain: string) => {
        const { value: formValues } = await Swal.fire({
            title: 'เพิ่มโครงสร้างหน่วยงาน',
            html:
                `<input id="swal-main" class="swal2-input" placeholder="หน่วยงานหลัก" value="${defaultMain || ''}">` +
                '<input id="swal-prov" class="swal2-input" placeholder="จังหวัด">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            preConfirm: () => {
                return [
                    (document.getElementById('swal-main') as HTMLInputElement).value,
                    (document.getElementById('swal-prov') as HTMLInputElement).value
                ];
            }
        });

        if (formValues) {
            const [main, prov] = formValues;
            if(!main || !prov) return;
            Swal.showLoading();
            const res = await dataService.addHierarchyItem(main, prov);
            if(res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'เพิ่มข้อมูลเรียบร้อย', 'success');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }
    };

    const handleEditHierarchy = async (oldMain: string, oldProv: string) => {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขโครงสร้างหน่วยงาน',
            html:
                `<input id="swal-main" class="swal2-input" placeholder="หน่วยงานหลัก" value="${oldMain}">` +
                `<input id="swal-prov" class="swal2-input" placeholder="จังหวัด" value="${oldProv}">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            preConfirm: () => {
                return [
                    (document.getElementById('swal-main') as HTMLInputElement).value,
                    (document.getElementById('swal-prov') as HTMLInputElement).value
                ];
            }
        });

        if (formValues) {
            const [newMain, newProv] = formValues;
            if(!newMain || !newProv) return;
            Swal.showLoading();
            const res = await dataService.updateHierarchyItem(oldMain, oldProv, newMain, newProv);
            if(res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', 'success');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }
    };

    const handleDeleteHierarchy = async (main: string, prov: string) => {
        const confirm = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: `ต้องการลบ ${main} - ${prov} ใช่หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ'
        });

        if (confirm.isConfirmed) {
            Swal.showLoading();
            const res = await dataService.deleteHierarchyItem(main, prov);
            if(res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'ลบข้อมูลเรียบร้อย', 'success');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }
    };

    const handleAddResponsible = async (defaultMain: string) => {
        const { value: formValues } = await Swal.fire({
            title: 'เพิ่มหน่วยปฏิบัติ',
            html:
                `<input id="swal-main" class="swal2-input" placeholder="หน่วยงานหลัก" value="${defaultMain || ''}">` +
                '<input id="swal-resp" class="swal2-input" placeholder="หน่วยปฏิบัติ">' +
                '<input id="swal-area" class="swal2-input" placeholder="พื้นที่ดำเนินการ">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            preConfirm: () => {
                return [
                    (document.getElementById('swal-main') as HTMLInputElement).value,
                    (document.getElementById('swal-resp') as HTMLInputElement).value,
                    (document.getElementById('swal-area') as HTMLInputElement).value
                ];
            }
        });

        if (formValues) {
            const [main, resp, area] = formValues;
            if(!main || !resp || !area) {
                 Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                 return;
            }
            Swal.showLoading();
            const res = await dataService.addResponsibleAgency(main, resp, area);
            if(res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'เพิ่มข้อมูลเรียบร้อย', 'success');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }
    };

    const handleEditResponsible = async (item: any) => {
        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขหน่วยปฏิบัติ',
            html:
                `<div class="mb-2 text-left text-sm text-gray-500">หน่วยงานหลัก: ${item.mainAgency}</div>` +
                `<input id="swal-resp" class="swal2-input" placeholder="หน่วยปฏิบัติ" value="${item.responsibleAgency}">` +
                `<input id="swal-area" class="swal2-input" placeholder="พื้นที่ดำเนินการ" value="${item.integrationArea}">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            preConfirm: () => {
                return [
                    (document.getElementById('swal-resp') as HTMLInputElement).value,
                    (document.getElementById('swal-area') as HTMLInputElement).value
                ];
            }
        });

        if (formValues) {
            const [newResp, newArea] = formValues;
            if(!newResp || !newArea) return;
            Swal.showLoading();
            const res = await dataService.updateResponsibleAgency(item.mainAgency, item.responsibleAgency, item.integrationArea, newResp, newArea);
            if(res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', 'success');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }
    };

    const handleDeleteResponsible = async (item: any) => {
        const confirm = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: `ต้องการลบ ${item.responsibleAgency} (${item.integrationArea}) ใช่หรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ'
        });

        if (confirm.isConfirmed) {
            Swal.showLoading();
            const res = await dataService.deleteResponsibleAgency(item.mainAgency, item.responsibleAgency, item.integrationArea);
            if(res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'ลบข้อมูลเรียบร้อย', 'success');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }
    };

    const handleManageSingleField = async (
        type: 'integration' | 'activity' | 'unit', 
        action: 'add' | 'edit' | 'delete', 
        currentValue?: string
    ) => {
        const titleMap = { integration: 'รายการบูรณาการ', activity: 'กิจกรรม', unit: 'หน่วยนับ' };
        const label = titleMap[type];

        if (action === 'delete') {
             const confirm = await Swal.fire({
                title: 'ยืนยันการลบ',
                text: `ต้องการลบ ${label}: "${currentValue}" ใช่หรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'ลบ'
            });
            if (confirm.isConfirmed) {
                Swal.showLoading();
                let res;
                if(type === 'integration') res = await dataService.deleteIntegration(currentValue!);
                else if(type === 'activity') res = await dataService.deleteActivity(currentValue!);
                else res = await dataService.deleteUnit(currentValue!);

                if(res.success) { triggerRefresh(); Swal.fire('สำเร็จ', 'ลบข้อมูลเรียบร้อย', 'success'); }
                else Swal.fire('ผิดพลาด', res.message, 'error');
            }
            return;
        }

        const { value: newValue } = await Swal.fire({
            title: action === 'add' ? `เพิ่ม${label}` : `แก้ไข${label}`,
            input: 'text',
            inputValue: action === 'edit' ? currentValue : '',
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            inputValidator: (value) => {
                if (!value) return 'กรุณาระบุข้อมูล';
            }
        });

        if (newValue) {
            Swal.showLoading();
            let res;
            if (action === 'add') {
                if(type === 'integration') res = await dataService.addIntegration(newValue);
                else if(type === 'activity') res = await dataService.addActivity(newValue);
                else res = await dataService.addUnit(newValue);
            } else {
                if(type === 'integration') res = await dataService.updateIntegration(currentValue!, newValue);
                else if(type === 'activity') res = await dataService.updateActivity(currentValue!, newValue);
                else res = await dataService.updateUnit(currentValue!, newValue);
            }

            if(res.success) { triggerRefresh(); Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success'); }
            else Swal.fire('ผิดพลาด', res.message, 'error');
        }
    };

    // Region Management Handlers
    const handleManageRegion = async (action: 'add' | 'edit' | 'delete', currentName?: string) => {
        if (action === 'delete') {
            const confirm = await Swal.fire({
                title: 'ยืนยันการลบ',
                text: `ต้องการลบภูมิภาค "${currentName}" และข้อมูลจังหวัดทั้งหมดในภูมิภาคนี้ใช่หรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'ลบ'
            });
            if (confirm.isConfirmed) {
                Swal.showLoading();
                const res = await dataService.deleteRegion(currentName!);
                if (res.success) {
                    if (selectedRegion === currentName) setSelectedRegion('');
                    triggerRefresh();
                    Swal.fire('สำเร็จ', 'ลบภูมิภาคเรียบร้อย', 'success');
                } else Swal.fire('ผิดพลาด', res.message, 'error');
            }
            return;
        }

        const { value: newName } = await Swal.fire({
            title: action === 'add' ? 'เพิ่มภูมิภาค' : 'แก้ไขชื่อภูมิภาค',
            input: 'text',
            inputValue: action === 'edit' ? currentName : '',
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            inputValidator: (value) => {
                if (!value) return 'กรุณาระบุชื่อภูมิภาค';
            }
        });

        if (newName) {
            Swal.showLoading();
            let res;
            if (action === 'add') res = await dataService.addRegion(newName);
            else res = await dataService.updateRegion(currentName!, newName);

            if (res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
            } else Swal.fire('ผิดพลาด', res.message, 'error');
        }
    };

    const handleManageProvinceInRegion = async (action: 'add' | 'delete', province?: string) => {
        if (action === 'delete') {
            const confirm = await Swal.fire({
                title: 'ยืนยันการลบ',
                text: `ต้องการลบจังหวัด "${province}" ออกจากภูมิภาคนี้ใช่หรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'ลบ'
            });
            if (confirm.isConfirmed) {
                Swal.showLoading();
                const res = await dataService.removeProvinceFromRegion(selectedRegion, province!);
                if (res.success) {
                    triggerRefresh();
                    Swal.fire('สำเร็จ', 'ลบจังหวัดเรียบร้อย', 'success');
                } else Swal.fire('ผิดพลาด', res.message, 'error');
            }
            return;
        }

        const { value: newProvince } = await Swal.fire({
            title: 'เพิ่มจังหวัด',
            input: 'text',
            showCancelButton: true,
            confirmButtonText: 'เพิ่ม',
            inputValidator: (value) => {
                if (!value) return 'กรุณาระบุชื่อจังหวัด';
            }
        });

        if (newProvince) {
            Swal.showLoading();
            const res = await dataService.addProvinceToRegion(selectedRegion, newProvince);
            if (res.success) {
                triggerRefresh();
                Swal.fire('สำเร็จ', 'เพิ่มจังหวัดเรียบร้อย', 'success');
            } else Swal.fire('ผิดพลาด', res.message, 'error');
        }
    };

    // --- Render Content Logic ---
    const renderContent = () => {
        switch (activeTab) {
            case 'region': {
                const currentRegion = regionData.find(r => r.regionName === selectedRegion);
                return (
                    <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                             <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span className="w-6 h-6 inline-flex items-center justify-center bg-emerald-600 text-white rounded-full text-xs mr-2">1</span>
                                    เลือกภูมิภาค (Region)
                                </label>
                                
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <select 
                                            value={selectedRegion} 
                                            onChange={(e) => setSelectedRegion(e.target.value)} 
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-200 appearance-none"
                                        >
                                            <option value="">-- กรุณาเลือกภูมิภาค --</option>
                                            {regionData.map(r => <option key={r.regionName} value={r.regionName}>{r.regionName}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <ChevronRight size={18} className="rotate-90" />
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleManageRegion('add')} 
                                        className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm font-bold whitespace-nowrap"
                                    >
                                        <Plus size={18} /> เพิ่มภูมิภาคใหม่
                                    </button>
                                </div>
                                {selectedRegion && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleManageRegion('edit', selectedRegion)} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"><Edit2 size={14}/> แก้ไขชื่อภูมิภาค</button>
                                        <button onClick={() => handleManageRegion('delete', selectedRegion)} className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1"><Trash2 size={14}/> ลบภูมิภาคนี้</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedRegion && currentRegion ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="w-6 h-6 inline-flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">2</span>
                                        จังหวัดในภาคนี้ ({currentRegion.provinces.length})
                                    </h4>
                                    <button 
                                        onClick={() => handleManageProvinceInRegion('add')} 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium"
                                    >
                                        <Plus size={16} /> เพิ่มจังหวัด
                                    </button>
                                </div>
                                <Table 
                                    headers={['ลำดับ', 'จังหวัด', 'จัดการ']}
                                    data={currentRegion.provinces.map((prov, idx) => ({
                                        columns: [idx + 1, prov],
                                        onDelete: () => handleManageProvinceInRegion('delete', prov)
                                    }))}
                                    hasActions
                                />
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <Map size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600 opacity-50"/>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">ยังไม่ได้เลือกภูมิภาค</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">กรุณาเลือกภูมิภาคจากตัวเลือกด้านบน เพื่อจัดการจังหวัด</p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'hierarchy': {
                const uniqueMainAgencies = Array.from(new Set(hierarchy.map(h => h.mainAgency)));
                const filteredHierarchy = selectedMainAgency 
                    ? hierarchy.filter(h => h.mainAgency === selectedMainAgency)
                    : [];

                return (
                    <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                             <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span className="w-6 h-6 inline-flex items-center justify-center bg-emerald-600 text-white rounded-full text-xs mr-2">1</span>
                                    เลือกหน่วยงานหลัก (Main Agency)
                                </label>
                                
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <select 
                                            value={selectedMainAgency} 
                                            onChange={(e) => setSelectedMainAgency(e.target.value)} 
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-200 appearance-none"
                                        >
                                            <option value="">-- กรุณาเลือกหน่วยงาน --</option>
                                            {uniqueMainAgencies.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <ChevronRight size={18} className="rotate-90" />
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleAddHierarchy('')} 
                                        className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm font-bold whitespace-nowrap"
                                    >
                                        <Plus size={18} /> เพิ่มหน่วยงานใหม่
                                    </button>
                                </div>
                            </div>
                        </div>

                        {selectedMainAgency ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <span className="w-6 h-6 inline-flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">2</span>
                                        จังหวัดในสังกัด ({filteredHierarchy.length})
                                    </h4>
                                    <button 
                                        onClick={() => handleAddHierarchy(selectedMainAgency)} 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium"
                                    >
                                        <Plus size={16} /> เพิ่มจังหวัดในสังกัดนี้
                                    </button>
                                </div>
                                <Table 
                                    headers={['ลำดับ', 'จังหวัด', 'จัดการ']}
                                    data={filteredHierarchy.map((item, idx) => ({
                                        columns: [idx + 1, item.province],
                                        onEdit: () => handleEditHierarchy(item.mainAgency, item.province),
                                        onDelete: () => handleDeleteHierarchy(item.mainAgency, item.province)
                                    }))}
                                    hasActions
                                />
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <Network size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600 opacity-50"/>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">ยังไม่ได้เลือกหน่วยงานหลัก</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">กรุณาเลือกหน่วยงานหลักจากตัวเลือกด้านบน (Step 1) เพื่อดำเนินการต่อ</p>
                            </div>
                        )}
                    </div>
                );
            }
            case 'responsible': {
                const uniqueMainAgencies = Array.from(new Set(respData.map(h => h.mainAgency)));
                const filteredResp = selectedMainAgency 
                    ? respData.filter(h => h.mainAgency === selectedMainAgency)
                    : [];

                return (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                                <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    เลือกหน่วยงานหลักเพื่อดูข้อมูล
                                </label>
                                
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <select 
                                            value={selectedMainAgency} 
                                            onChange={(e) => setSelectedMainAgency(e.target.value)} 
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 dark:text-slate-200 appearance-none"
                                        >
                                            <option value="">-- กรุณาเลือกหน่วยงาน --</option>
                                            {uniqueMainAgencies.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <ChevronRight size={18} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedMainAgency ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        หน่วยปฏิบัติในสังกัด ({filteredResp.length})
                                    </h4>
                                    <button 
                                        onClick={() => handleAddResponsible(selectedMainAgency)} 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors text-sm font-medium"
                                    >
                                        <Plus size={16} /> เพิ่มหน่วยปฏิบัติ
                                    </button>
                                </div>
                                <Table 
                                    headers={['ลำดับ', 'หน่วยปฏิบัติ', 'พื้นที่ดำเนินการ', 'จัดการ']}
                                    data={filteredResp.map((item, idx) => ({
                                        columns: [idx + 1, item.responsibleAgency, item.integrationArea],
                                        onEdit: () => handleEditResponsible(item),
                                        onDelete: () => handleDeleteResponsible(item)
                                    }))}
                                    hasActions
                                />
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Users size={32} />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">กรุณาเลือกหน่วยงานหลักด้านบน</p>
                            </div>
                        )}
                    </div>
                );
            }
            
            case 'integration':
            case 'activity':
            case 'unit': {
                const type = activeTab as 'integration' | 'activity' | 'unit';
                const labelMap = { integration: 'รายการบูรณาการ', activity: 'รายการกิจกรรม', unit: 'รายการหน่วยนับ' };
                const dataMap = { integration: dropdowns.integration, activity: dropdowns.activity, unit: dropdowns.unit };
                
                return (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{labelMap[type]}</h3>
                            <button onClick={() => handleManageSingleField(type, 'add')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"><Plus size={16}/> เพิ่มรายการ</button>
                        </div>
                        <Table 
                            headers={['ลำดับ', 'ชื่อรายการ', 'จัดการ']}
                            data={dataMap[type].map((item, idx) => ({
                                columns: [idx + 1, item],
                                onEdit: () => handleManageSingleField(type, 'edit', item),
                                onDelete: () => handleManageSingleField(type, 'delete', item)
                            }))}
                            hasActions
                        />
                    </div>
                );
            }
            
            case 'fields':
            case 'tableColumns': {
                const isTable = activeTab === 'tableColumns';
                const visibility = isTable ? tableColumnVisibility : fieldVisibility;
                const toggle = isTable ? dataService.toggleTableColumnVisibility.bind(dataService) : dataService.toggleFieldVisibility.bind(dataService);
                const setAll = isTable ? dataService.setAllTableColumnsVisibility.bind(dataService) : dataService.setAllFieldsVisibility.bind(dataService);

                // Banner Text
                const bannerText = isTable 
                    ? 'คอลัมน์ที่ปิดจะถูกซ่อนในหน้าตารางฐานข้อมูล' 
                    : 'ฟิลด์ที่ปิดจะถูกซ่อนในหน้าบันทึกข้อมูล (แบบฟอร์ม)';

                return (
                    <div className="space-y-6">
                        {/* Info Banner */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3 text-blue-700 dark:text-blue-300">
                                <Eye size={20} />
                                <span className="font-medium">{bannerText}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setAll(true); triggerRefresh(); }} 
                                    className="px-4 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-colors"
                                >
                                    แสดงทั้งหมด
                                </button>
                                <button 
                                    onClick={() => { setAll(false); triggerRefresh(); }} 
                                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-sm font-bold transition-colors"
                                >
                                    ซ่อนทั้งหมด
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(FIELD_LABELS).map(([key, label]) => {
                                if (visibility[key] === undefined) return null;
                                const isVisible = visibility[key];
                                return (
                                    <div 
                                        key={key} 
                                        onClick={() => { toggle(key); triggerRefresh(); }}
                                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group select-none"
                                    >
                                        <span className="text-slate-700 dark:text-slate-200 font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {label}
                                        </span>
                                        
                                        {/* Custom Toggle Pill */}
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                                            isVisible 
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {isVisible ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            <span className="text-sm font-bold">{isVisible ? 'เปิด' : 'ปิด'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }
            
            case 'report':
                 return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">จัดการโครงสร้างรายงาน</h3>
                                <p className="text-sm text-slate-500">ลากกิจกรรมจากฝั่งซ้ายไปวางในโครงสร้างทางฝั่งขวา หรือลากรายการในโครงสร้างเพื่อจัดเรียง</p>
                            </div>
                             <button onClick={handleSaveStructure} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-emerald-700">
                                <Save size={18} /> บันทึกโครงสร้าง
                             </button>
                        </div>

                        <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)] min-h-[500px]">
                            {/* Left Column: Available Activities */}
                            <div className="w-full xl:w-1/3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col shadow-sm h-full">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                                        <List size={18} /> รายการกิจกรรมที่ยังไม่จัดกลุ่ม
                                        <span className="ml-auto bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">{availableActivities.length}</span>
                                    </h4>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="ค้นหากิจกรรม..." 
                                            value={activitySearch}
                                            onChange={(e) => setActivitySearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-0">
                                    {availableActivities.length > 0 ? availableActivities.map((act) => (
                                        <div
                                            key={act}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, act)}
                                            className={`p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm cursor-grab hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-3 group ${draggedActivity === act ? 'opacity-50' : ''}`}
                                        >
                                            <GripVertical size={16} className="text-slate-300 group-hover:text-emerald-500" />
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{act}</span>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 text-slate-400 text-sm">
                                            {activitySearch ? 'ไม่พบกิจกรรมที่ค้นหา' : 'กิจกรรมทั้งหมดถูกจัดกลุ่มแล้ว'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Structure Tree */}
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col shadow-sm h-full">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                        <Layout size={18} /> โครงสร้างรายงาน (Tree View)
                                    </h4>
                                    <button 
                                        onClick={() => handleAddChildNode(null)} 
                                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus size={14} /> เพิ่มรายการใหม่
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/20 min-h-0">
                                    {reportStructure.length > 0 ? (
                                        <div className="space-y-1 min-w-fit">
                                            {reportStructure.map(node => renderTreeNode(node))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                            <Layout size={48} className="mb-4 opacity-20" />
                                            <p>ยังไม่มีโครงสร้างรายงาน</p>
                                            <button 
                                                onClick={() => handleAddChildNode(null)}
                                                className="mt-4 text-blue-500 font-bold hover:underline"
                                            >
                                                สร้างแผนงานแรก
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex gap-4 overflow-x-auto">
                                    {Object.entries(HIERARCHY_CONFIG).map(([key, val]) => (
                                        <div key={key} className="flex items-center gap-1.5 whitespace-nowrap">
                                            <div className={`w-2 h-2 rounded-full ${val.color}`}></div>
                                            <span>{val.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return <div className="p-8 text-center text-slate-500">กรุณาเลือกเมนูทางด้านซ้าย</div>;
        }
    };

    return (
        <div className="max-w-[98vw] mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">จัดการข้อมูลตัวเลือก</h2>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full lg:w-64 shrink-0 space-y-2">
                    {MANAGE_SUB_MENUS.map(menu => (
                        <button
                            key={menu.id}
                            onClick={() => handleTabChange(menu.path)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl font-medium transition-all flex items-center gap-3 ${
                                activeTab === menu.id 
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 border border-slate-100 dark:border-slate-700'
                            }`}
                        >
                            <span className={activeTab === menu.id ? 'text-white' : 'text-slate-400'}>
                                {ICONS[menu.id] || <Settings size={20} />}
                            </span>
                            {menu.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

// Reusable Table Component (Unchanged)
const Table = ({ headers, data, hasActions }: { headers: string[], data: { columns: any[], onEdit?: () => void, onDelete?: () => void }[], hasActions?: boolean }) => {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-left">
                        {headers.map((h, i) => (
                            <th key={i} className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                    {data.length > 0 ? data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            {row.columns.map((col, cIdx) => (
                                <td key={cIdx} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{col}</td>
                            ))}
                            {hasActions && (
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        {row.onEdit && (
                                            <button onClick={row.onEdit} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        {row.onDelete && (
                                            <button onClick={row.onDelete} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={headers.length} className="px-6 py-12 text-center text-slate-400">ไม่พบข้อมูล</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ManageView;