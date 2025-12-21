// Last Updated: 2025-12-21 10:13:28
import React, { useState, useRef, useEffect } from 'react';
import {
    Briefcase, BookOpen, Wrench, AlertTriangle, ChevronRight, Plus, Edit3, Trash2,
    ChevronLeft, FileText, Image, ArrowRight, Menu, History, Bot, Lock, Zap,
    AlertCircle, X, Download, Upload, PanelRightClose, PanelRightOpen, GripVertical,
    Check, Folder, Layers, LayoutGrid, FileCode, ChevronDown, Filter
} from 'lucide-react';
import PanZoomViewer from '../components/ui/PanZoomViewer';

const { ipcRenderer } = window.require('electron');

const WorkDetailView = ({
    work,
    setWork,
    equipment,       // 🌟 App.jsx에서 보내준 equipment를 직접 받음
    setEquipment,    // 🌟 App.jsx에서 보내준 setEquipment를 직접 받음
    viewMode = 'HOME', // 🌟 이름을 viewMode로 통일하고 기본값 설정
    setViewMode,     // 🌟 이름을 setViewMode로 통일
    handleSendMessage // 🌟 채팅 기능을 위해 필요하다면 추가
}) => {

    const [loading, setLoading] = useState(!work || !work.manuals);

    useEffect(() => {
        const refreshData = async () => {
            // 데이터가 비어있으면 다시 불러오기 시도
            if (!work || !work.manuals || work.manuals.length === 0) {
                setLoading(true);
                try {
                    const data = await window.require('electron').ipcRenderer.invoke('get-work-data');
                    if (data) {
                        setWork(data);
                    }
                } catch (err) {
                    console.error("Work data fetch error:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        refreshData();
    }, [viewMode]); // 의존성 배열

    if (loading) {
        return <div className="flex items-center justify-center h-full text-zinc-400">데이터를 불러오는 중...</div>;
    }

    if (!work || !work.manuals || !work.categories) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
                <p>직무 교육 데이터를 불러올 수 없습니다.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                    새로고침
                </button>
            </div>
        );
    }

    // --- 🏗️ 설비 마스터 전용 State ---
    const [activeEquipId, setActiveEquipId] = useState(null);
    const [activeEquipDocId, setActiveEquipDocId] = useState(null);
    const [isEquipTocOpen, setIsEquipTocOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [equipAiQuery, setEquipAiQuery] = useState('');
    const [equipTab, setEquipTab] = useState('SYSTEM');
    const [rightPanelTab, setRightPanelTab] = useState('INFO');

    // 모달 State
    const [logModal, setLogModal] = useState({ isOpen: false, content: '', targetPart: '' });
    const [partModal, setPartModal] = useState({ isOpen: false, name: '', spec: '' });
    const [specModal, setSpecModal] = useState({ isOpen: false, key: '', value: '' });

    // 현장 가이드 State
    const [activeFieldGuideId, setActiveFieldGuideId] = useState(null);
    const [currentStepId, setCurrentStepId] = useState(null);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

    // 기본 State
    const lastScrollTime = useRef(0);
    const [activeId, setActiveId] = useState(null);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [showFileList, setShowFileList] = useState(false);

    const [manualCategory, setManualCategory] = useState('ALL');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', title: '' });
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });

    // 입력 폼 State
    const [inputTitle, setInputTitle] = useState('');
    const [inputDesc, setInputDesc] = useState('');
    const [inputCategory, setInputCategory] = useState('FIELD');
    const [inputSteps, setInputSteps] = useState([{ text: '' }]);

    const [equipTitle, setEquipTitle] = useState('');
    const [equipCode, setEquipCode] = useState('');
    const [equipDesc, setEquipDesc] = useState('');
    const [equipSystem, setEquipSystem] = useState('');
    const [equipMaker, setEquipMaker] = useState('');
    const [originalSystemName, setOriginalSystemName] = useState('');

    const [isDirectSystem, setIsDirectSystem] = useState(false);
    const [systemFilter, setSystemFilter] = useState('ALL');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const currentEquip = activeEquipId ? (equipment.list || []).find(e => e.id === activeEquipId) : null;

    const [docType, setDocType] = useState('MANUAL');

    const [manualAttachments, setManualAttachments] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatId, setNewCatId] = useState('');
    const [newCatColor, setNewCatColor] = useState('zinc');
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [newStepForm, setNewStepForm] = useState({ imagePath: '', title: '', content: '' });
    const [editStepData, setEditStepData] = useState(null);
    const [editingManualId, setEditingManualId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // 스타일 유틸리티
    const getDocTypeStyle = (type) => {
        switch (type) {
            case 'PID': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FileText, label: 'P&ID' };
            case 'MANUAL': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: BookOpen, label: 'Manual' };
            case 'DESIGN': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Wrench, label: 'Design' };
            default: return { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: FileText, label: 'Doc' };
        }
    };

    const getColorStyles = (colorName) => {
        const map = {
            zinc: 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900/30 dark:border-zinc-700 dark:text-zinc-400',
            indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400',
            emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400',
            amber: 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400',
            rose: 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400'
        };
        return map[colorName] || map['zinc'];
    };

    // --- Helper Functions ---
    const safeAlert = (message) => { setDialogConfig({ isOpen: true, type: 'alert', message, onConfirm: null }); };
    const safeConfirm = (message, onConfirmAction) => { setDialogConfig({ isOpen: true, type: 'confirm', message, onConfirm: onConfirmAction }); };
    const closeDialog = () => { setDialogConfig({ ...dialogConfig, isOpen: false }); };
    const getActiveItem = (listName) => (work[listName] || []).find(i => i.id === activeId);

    // --- 파일/이미지 핸들러 ---
    const handleSelectFile = async (type) => {
        try {
            const result = await ipcRenderer.invoke('select-any-file');
            if (!result) return;
            const { filePath, fileName } = result;
            if (type === 'attachment') {
                setManualAttachments(prev => [...prev, { name: fileName, path: filePath }]);
            }
        } catch (error) { console.error("파일 선택 오류:", error); }
    };

    const handleSelectImage = async (target, stepId = null) => {
        try {
            const filePath = await ipcRenderer.invoke('select-image');
            if (!filePath) return;
            const fs = window.require('fs');
            const fileData = fs.readFileSync(filePath);
            const ext = filePath.split('.').pop().toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const base64Url = `data:${mimeType};base64,${fileData.toString('base64')}`;
            if (target === 'step') setNewStepForm(prev => ({ ...prev, imagePath: base64Url }));
            else if (target === 'edit' && stepId) setEditStepData(prev => ({ ...prev, image: base64Url }));
        } catch (error) { console.error(error); }
    };

    const handleOpenFile = (path) => { ipcRenderer.send('open-local-file', path); };
    const handleAddFileToDetail = async () => { handleSelectFile('attachment'); };
    const handleDeleteFileFromDetail = (e, fileIndex) => {
        e.stopPropagation();
        if (viewMode === 'BASIC_DETAIL' && activeId) {
            setWork(prev => ({ ...prev, manuals: prev.manuals.map(m => m.id === activeId ? { ...m, attachments: (m.attachments || []).filter((_, i) => i !== fileIndex) } : m) }));
        } else if (viewMode === 'FIELD_DETAIL' && activeFieldGuideId) {
            setEquipment(prev => ({ ...prev, fieldGuides: prev.fieldGuides.map(g => g.id === activeFieldGuideId ? { ...g, attachments: (g.attachments || []).filter((_, i) => i !== fileIndex) } : g) }));
        }
    };

    // --- 데이터 저장/수정/삭제 핸들러 ---
    const handleDeleteCategory = (e, catId, catLabel) => {
        e.stopPropagation();
        safeConfirm(`'${catLabel}' 카테고리를 삭제하시겠습니까?`, () => {
            setWork(prev => ({
                ...prev,
                categories: (prev.categories || []).filter(c => c.id !== catId),
                manuals: (prev.manuals || []).map(m => m.category === catId ? { ...m, category: '' } : m)
            }));
        });
    };

    const handleOpenEditEquip = () => {
        const equip = (equipment.list || []).find(e => e.id === activeEquipId);
        if (!equip) return;

        setEquipTitle(equip.title);
        setEquipCode(equip.meta?.code || '');
        setEquipSystem(equip.meta?.system || '');
        setEquipMaker(equip.meta?.maker || '');
        setEquipDesc(equip.desc || '');
        setModalConfig({ isOpen: true, type: 'EDIT_EQUIPMENT', title: '설비 정보 수정' });
    };

    // 🌟 [추가] 목록에서 설비 수정 버튼 클릭 시 호출
    const handleEditEquipItem = (e, equip) => {
        e.stopPropagation(); // 카드가 클릭되어 상세화면으로 넘어가는 것을 방지
        setActiveEquipId(equip.id); // 현재 설비로 지정

        setEquipTitle(equip.title);
        setEquipCode(equip.meta?.code || '');
        setEquipSystem(equip.meta?.system || '');
        setEquipMaker(equip.meta?.maker || '');
        setEquipDesc(equip.desc || '');

        setModalConfig({ isOpen: true, type: 'EDIT_EQUIPMENT', title: '설비 정보 수정' });
    };

    // 🌟 [추가] 계통명 일괄 변경 핸들러
    const handleRenameSystem = () => {
        if (!equipSystem.trim()) {
            safeAlert("변경할 계통 이름을 입력해주세요.");
            return;
        }
        if (equipSystem === originalSystemName) {
            setIsDirectSystem(false);
            setOriginalSystemName('');
            return;
        }

        safeConfirm(`'${originalSystemName}' 계통을 '${equipSystem}'(으)로 변경하시겠습니까?\n이 계통으로 등록된 모든 설비의 정보가 함께 수정됩니다.`, () => {
            setEquipment(prev => ({
                ...prev,
                list: prev.list.map(e => {
                    // 기존 계통명을 가진 모든 설비를 찾아서 새 이름으로 업데이트
                    if (e.meta?.system === originalSystemName) {
                        return { ...e, meta: { ...e.meta, system: equipSystem } };
                    }
                    return e;
                })
            }));
            setOriginalSystemName('');
            setIsDirectSystem(false);
        });
    };

    // 🌟 [추가] 계통 입력 취소 핸들러
    const handleCancelSystemInput = () => {
        setIsDirectSystem(false);
        if (originalSystemName) {
            setEquipSystem(originalSystemName); // 원래 값으로 복구
            setOriginalSystemName('');
        } else {
            setEquipSystem(''); // 신규 입력이었으면 초기화
        }
    };

    const handleSaveData = () => {
        // 1. 설비 등록 및 수정 로직 통합
        if (modalConfig.type === 'ADD_EQUIPMENT' || modalConfig.type === 'EDIT_EQUIPMENT') {
            if (!equipTitle.trim()) return;

            // 공통 메타 데이터
            const metaData = {
                code: equipCode || 'EQ-000',
                maker: equipMaker || '미지정',
                system: equipSystem || '공통 계통',
                location: '현장',
                installDate: new Date().toISOString().split('T')[0] // 기존 날짜 유지 로직이 필요하다면 수정 필요
            };

            if (modalConfig.type === 'ADD_EQUIPMENT') {
                // 신규 등록
                const newEquip = {
                    id: Date.now(),
                    title: equipTitle,
                    desc: equipDesc,
                    chapters: [], documents: [], logs: [], parts: [], specs: [], // specs 초기화 추가
                    meta: metaData
                };
                setEquipment(prev => ({ ...prev, list: [...(prev.list || []), newEquip] }));
            } else {
                // 기존 수정
                setEquipment(prev => ({
                    ...prev,
                    list: prev.list.map(e => e.id === activeEquipId ? {
                        ...e,
                        title: equipTitle,
                        desc: equipDesc,
                        meta: { ...e.meta, ...metaData } // 기존 meta 유지하며 덮어쓰기
                    } : e)
                }));
            }

            // 입력 폼 초기화
            setEquipTitle(''); setEquipDesc(''); setEquipCode(''); setEquipSystem(''); setEquipMaker('');
            setIsDirectSystem(false);
        }
        else if (modalConfig.type === 'ADD_EQUIP_DOC') {
            if (!inputTitle.trim()) return;
            const newDoc = { id: Date.now(), title: inputTitle, type: docType, path: manualAttachments.length > 0 ? manualAttachments[0].path : null };
            setEquipment(prev => ({ ...prev, list: prev.list.map(e => e.id === activeEquipId ? { ...e, documents: [...(e.documents || []), newDoc] } : e) }));
        }
        else if (modalConfig.type === 'ADD_BASIC_MANUAL') {
            const newItem = { id: Date.now(), category: inputCategory, title: inputTitle, desc: inputDesc, attachments: manualAttachments, chapters: [], isDone: false };
            setWork(prev => ({ ...prev, manuals: [...(prev.manuals || []), newItem] }));
        }
        else if (modalConfig.type === 'EDIT_BASIC_MANUAL') {
            setWork(prev => ({ ...prev, manuals: prev.manuals.map(m => m.id === editingManualId ? { ...m, title: inputTitle, desc: inputDesc, attachments: manualAttachments } : m) }));
            setEditingManualId(null);
        }
        else if (modalConfig.type === 'ADD_BASIC_CHAPTER') {
            setWork(prev => ({ ...prev, manuals: prev.manuals.map(m => m.id === activeId ? { ...m, chapters: [...(m.chapters || []), { id: Date.now(), title: inputTitle, steps: [] }] } : m) }));
        }
        else if (modalConfig.type === 'ADD_MANUAL_STEP') {
            setWork(prev => {
                const targetManual = prev.manuals.find(m => m.id === activeId);
                if (!targetManual) return prev;
                const targetChapterId = activeChapterId || (targetManual.chapters && targetManual.chapters.length > 0 ? targetManual.chapters[0].id : null);
                if (!targetChapterId) { safeAlert("챕터가 없습니다. 먼저 챕터를 추가해주세요."); return prev; }
                return { ...prev, manuals: prev.manuals.map(m => m.id === activeId ? { ...m, chapters: (m.chapters || []).map(c => c.id === targetChapterId ? { ...c, steps: [...(c.steps || []), { id: Date.now(), image: newStepForm.imagePath, title: newStepForm.title, content: newStepForm.content }] } : c) } : m) };
            });
            setNewStepForm({ imagePath: '', title: '', content: '' });
        }
        else if (modalConfig.type === 'ADD_FIELD_GUIDE' || modalConfig.type === 'EDIT_FIELD_GUIDE') {
            if (!inputTitle.trim()) return;
            if (modalConfig.type === 'ADD_FIELD_GUIDE') {
                const newGuide = { id: Date.now(), type: modalConfig.title.includes('고장') ? 'TROUBLE' : 'OPERATION', title: inputTitle, desc: inputDesc, attachments: manualAttachments, steps: [], tags: ['신규'] };
                setEquipment(prev => ({ ...prev, fieldGuides: [...(prev.fieldGuides || []), newGuide] }));
            } else {
                setEquipment(prev => ({ ...prev, fieldGuides: prev.fieldGuides.map(g => g.id === editingManualId ? { ...g, title: inputTitle, desc: inputDesc, attachments: manualAttachments } : g) }));
                setEditingManualId(null);
            }
        }
        else if (modalConfig.type === 'ADD_FIELD_STEP') {
            setEquipment(prev => ({ ...prev, fieldGuides: prev.fieldGuides.map(g => g.id === activeFieldGuideId ? { ...g, steps: [...(g.steps || []), { id: Date.now(), title: newStepForm.title, content: newStepForm.content, image: newStepForm.imagePath }] } : g) }));
            setNewStepForm({ imagePath: '', title: '', content: '' });
        }
        else if (modalConfig.type === 'ADD_CATEGORY' || modalConfig.type === 'EDIT_CATEGORY') {
            if (!newCatName.trim()) return;
            if (modalConfig.type === 'ADD_CATEGORY') {
                const finalId = newCatId.trim() ? newCatId.trim() : `CAT_${Date.now()}`;
                if (work.categories.some(c => c.id === finalId)) { safeAlert("이미 존재하는 카테고리 ID입니다."); return; }
                setWork(prev => ({ ...prev, categories: [...(prev.categories || []), { id: finalId, label: newCatName, color: newCatColor }] }));
            } else {
                setWork(prev => ({ ...prev, categories: prev.categories.map(c => c.id === editingCategoryId ? { ...c, label: newCatName, color: newCatColor } : c) }));
                setEditingCategoryId(null);
            }
            setNewCatName(''); setNewCatId(''); setNewCatColor('zinc');
        }
        setModalConfig({ ...modalConfig, isOpen: false }); setInputTitle(''); setInputDesc(''); setManualAttachments([]); setDocType('MANUAL');
    };

    const handleAddPart = () => {
        if (!partModal.name.trim()) return;
        const newPart = { id: Date.now(), name: partModal.name, spec: partModal.spec };
        setEquipment(prev => ({ ...prev, list: prev.list.map(e => e.id === activeEquipId ? { ...e, parts: [...(e.parts || []), newPart] } : e) }));
        setPartModal({ isOpen: false, name: '', spec: '' });
    };

    const handleAddLog = () => {
        if (!logModal.content.trim()) return;
        const newLog = { id: Date.now(), date: new Date().toISOString().split('T')[0], content: logModal.content, type: 'USER', targetPart: logModal.targetPart || '전체' };
        setEquipment(prev => ({ ...prev, list: prev.list.map(e => e.id === activeEquipId ? { ...e, logs: [newLog, ...(e.logs || [])] } : e) }));
        setLogModal({ isOpen: false, content: '', targetPart: '' });
    };

    const handleSaveStepEdit = () => {
        if (!editStepData) return;
        if (activeFieldGuideId) {
            setEquipment(prev => ({ ...prev, fieldGuides: prev.fieldGuides.map(g => g.id === activeFieldGuideId ? { ...g, steps: g.steps.map(s => s.id === editStepData.id ? editStepData : s) } : g) }));
            setEditStepData(null); return;
        }
        if (activeId) {
            const targetManual = getActiveItem('manuals');
            const currentChapterId = activeChapterId || (targetManual.chapters.length > 0 ? targetManual.chapters[0].id : null);
            if (!currentChapterId) return;
            setWork(prev => ({ ...prev, manuals: prev.manuals.map(m => { if (m.id === activeId) { return { ...m, chapters: m.chapters.map(c => { if (c.id === currentChapterId) { return { ...c, steps: c.steps.map(s => s.id === editStepData.id ? editStepData : s) }; } return c; }) }; } return m; }) }));
            setEditStepData(null);
        }
    };

    const requestDelete = (e, type, id, title) => {
        e.stopPropagation();
        safeConfirm(`'${title}' 항목을 삭제하시겠습니까?`, () => {
            setWork(prev => {
                let newWork = { ...prev };
                if (type === 'MANUAL') { newWork.manuals = prev.manuals.filter(m => m.id !== id); }
                else if (type === 'CHAPTER') {
                    newWork.manuals = prev.manuals.map(m => m.id === activeId ? { ...m, chapters: (m.chapters || []).filter(c => c.id !== id) } : m);
                    if (activeChapterId === id) { setActiveChapterId(null); setCurrentStepIndex(0); }
                }
                else if (type === 'STEP') {
                    const targetManual = prev.manuals.find(m => m.id === activeId);
                    if (targetManual) {
                        const targetChapterId = activeChapterId || (targetManual.chapters && targetManual.chapters.length > 0 ? targetManual.chapters[0].id : null);
                        if (targetChapterId) {
                            newWork.manuals = prev.manuals.map(m => m.id === activeId ? { ...m, chapters: (m.chapters || []).map(c => c.id === targetChapterId ? { ...c, steps: (c.steps || []).filter(s => s.id !== id) } : c) } : m);
                        }
                    }
                    setCurrentStepIndex(0);
                }
                return newWork;
            });
        });
    };

    // 기존 requestDelete 함수 아래에 추가
    const handleDeleteEquipment = (e, id, title) => {
        e.stopPropagation();
        safeConfirm(`${title} 및 관련 데이터를 모두 삭제하시겠습니까?`, () => {
            setEquipment(prev => ({
                ...prev,
                list: prev.list.filter(equip => equip.id !== id)
            }));
        });
    };

    // 부속품 삭제 함수
    const handleDeletePart = (partId) => {
        safeConfirm("선택한 부속품을 삭제하시겠습니까?", () => {
            setEquipment(prev => ({
                ...prev,
                list: prev.list.map(e => e.id === activeEquipId ? {
                    ...e,
                    parts: (e.parts || []).filter(p => p.id !== partId)
                } : e)
            }));
        });
    };

    // 상세 제원(Spec) 추가 함수
    const handleAddSpec = () => {
        if (!specModal.key.trim()) return;
        const newSpec = { id: Date.now(), key: specModal.key, value: specModal.value };
        setEquipment(prev => ({
            ...prev,
            list: prev.list.map(e => e.id === activeEquipId ? {
                ...e,
                specs: [...(e.specs || []), newSpec]
            } : e)
        }));
        setSpecModal({ isOpen: false, key: '', value: '' });
    };

    // 상세 제원(Spec) 삭제 함수
    const handleDeleteSpec = (specId) => {
        setEquipment(prev => ({
            ...prev,
            list: prev.list.map(e => e.id === activeEquipId ? {
                ...e,
                specs: (e.specs || []).filter(s => s.id !== specId)
            } : e)
        }));
    };

    // 정비 이력 삭제 함수
    const handleDeleteLog = (logId) => {
        safeConfirm("선택한 정비 이력을 삭제하시겠습니까?", () => {
            setEquipment(prev => ({
                ...prev,
                list: prev.list.map(e => e.id === activeEquipId ? {
                    ...e,
                    logs: (e.logs || []).filter(l => l.id !== logId)
                } : e)
            }));
        });
    };

    // 문서(P&ID, Manual) 삭제 함수
    const handleDeleteDoc = (docId) => {
        safeConfirm("선택한 문서를 삭제하시겠습니까?", () => {
            setEquipment(prev => ({
                ...prev,
                list: prev.list.map(e => e.id === activeEquipId ? {
                    ...e,
                    documents: (e.documents || []).filter(d => d.id !== docId)
                } : e)
            }));
            // 만약 현재 보고 있는 문서를 삭제했다면 뷰어 초기화
            if (activeEquipDocId === docId) setActiveEquipDocId(null);
        });
    };

    const handleEditManual = (e, m) => { e.stopPropagation(); setEditingManualId(m.id); setInputTitle(m.title); setInputDesc(m.desc); setManualAttachments(m.attachments || []); setModalConfig({ isOpen: true, type: 'EDIT_BASIC_MANUAL', title: '매뉴얼 수정' }); };
    const handleEditFieldGuide = (e, g) => { e.stopPropagation(); setEditingManualId(g.id); setInputTitle(g.title); setInputDesc(g.desc); setManualAttachments(g.attachments || []); setModalConfig({ isOpen: true, type: 'EDIT_FIELD_GUIDE', title: '가이드 수정' }); };
    const handleDeleteFieldGuide = (e, id) => { e.stopPropagation(); safeConfirm("삭제하시겠습니까?", () => setEquipment(prev => ({ ...prev, fieldGuides: prev.fieldGuides.filter(g => g.id !== id) }))); };
    const handleEditStepClick = () => {
        const item = getActiveItem('manuals');
        const chapter = item.chapters.find(c => c.id === activeChapterId) || item.chapters[0];
        setEditStepData(chapter.steps[currentStepIndex]);
    };
    const handleEditCategory = (e, c) => { e.stopPropagation(); setEditingCategoryId(c.id); setNewCatId(c.id); setNewCatName(c.label); setNewCatColor(c.color); setModalConfig({ isOpen: true, type: 'EDIT_CATEGORY', title: '카테고리 수정' }); };

    // --- 렌더러 ---
    const renderHome = () => (
        <div className="animate-fade-in p-2 space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Briefcase size={24} /></div>
                    직무 교육 센터
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 pl-1">실무 역량 강화를 위한 단계별 커리큘럼 및 업무 매뉴얼</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={() => setViewMode('BASIC_LIST')} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500"><BookOpen size={100} className="text-emerald-500" /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full mb-3 border border-emerald-100 dark:border-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Step 01</span><h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">공통 기초 교육</h3><p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">신입 사원 필수 코스<br />현장 안전, 사무, 보안 등 직무 가이드</p></div>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">교육 시작하기 <ChevronRight size={14} /></div>
                    </div>
                </div>
                <div onClick={() => setViewMode('EQUIP_LIST')} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500"><Wrench size={100} className="text-amber-500" /></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full mb-3 border border-amber-100 dark:border-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Step 02</span><h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">설비 마스터</h3><p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">주요 설비 운전/정비 매뉴얼<br />P&ID 도면 및 기술 자료 통합 관리</p></div>
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">설비 목록 보기 <ChevronRight size={14} /></div>
                    </div>
                </div>
                <div className="group relative bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl opacity-70 cursor-not-allowed">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><AlertTriangle size={100} className="text-amber-500" /></div>
                    <div><span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded-full mb-3 border border-zinc-200 dark:border-zinc-700">Step 03</span><h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">공정 운전 실무</h3><p className="text-sm text-zinc-400 dark:text-zinc-500">준비 중입니다.</p></div>
                </div>
            </div>
        </div>
    );

    const renderBasicList = () => {
        const manuals = work.manuals || [];
        const categories = work.categories || [];
        const filteredManuals = manualCategory === 'ALL' ? manuals : manuals.filter(m => m.category === manualCategory);

        const AddManualCard = ({ targetCategoryId, targetCategoryLabel }) => (
            <div onClick={() => { setInputCategory(targetCategoryId); setModalConfig({ isOpen: true, type: 'ADD_BASIC_MANUAL', title: `${targetCategoryLabel} 매뉴얼 추가` }); }} className="group flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer min-h-[140px] gap-2">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center text-zinc-400 transition-colors"><Plus size={20} /></div>
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">매뉴얼 등록</span>
            </div>
        );

        const ManualCard = ({ m }) => {
            const catInfo = categories.find(c => c.id === m.category) || { label: '기타', color: 'zinc' };
            const attachCount = (m.attachments || []).length;
            return (
                <div onClick={() => { setActiveId(m.id); setActiveChapterId(null); setViewMode('BASIC_DETAIL'); }} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 h-full">
                    <div className="flex justify-between items-start">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md border ${getColorStyles(catInfo.color)}`}>{catInfo.label}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleEditManual(e, m)} className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="수정"><Edit3 size={14} /></button>
                            <button onClick={(e) => requestDelete(e, 'MANUAL', m.id, m.title)} className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all" title="삭제"><Trash2 size={14} /></button>
                        </div>
                    </div>
                    <div><h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{m.title}</h3><p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{m.desc}</p></div>
                    <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-zinc-500 font-medium"><span className="flex items-center gap-1"><BookOpen size={14} className="text-zinc-400" /> {(m.chapters || []).length} Chapters</span>{attachCount > 0 && <span className="flex items-center gap-1 text-indigo-500"><FileText size={14} /> {attachCount}</span>}</div>
                        <span className="text-zinc-400 group-hover:translate-x-1 transition-transform group-hover:text-indigo-500"><ChevronRight size={14} /></span>
                    </div>
                </div>
            );
        };

        return (
            <div className="h-full flex flex-col animate-fade-in">
                <div className="flex flex-col gap-4 mb-6 px-2">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => setViewMode('HOME')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><ChevronLeft size={20} /></button><h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">공통 기초 교육</h2></div></div>
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-full max-w-full">
                        <button onClick={() => setManualCategory('ALL')} className={`flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${manualCategory === 'ALL' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>전체</button>
                        {categories.map(cat => (<button key={cat.id} onClick={() => setManualCategory(cat.id)} className={`group relative flex items-center gap-1.5 flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${manualCategory === cat.id ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'}`}>{cat.label}<div className="w-0 overflow-hidden group-hover:w-auto flex items-center gap-1 transition-all duration-300 opacity-0 group-hover:opacity-100"><span onClick={(e) => handleEditCategory(e, cat)} className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-zinc-400 hover:text-indigo-500 rounded transition-colors" title="수정"><Edit3 size={12} /></span><span onClick={(e) => handleDeleteCategory(e, cat.id, cat.label)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-500 rounded transition-colors" title="삭제"><Trash2 size={12} /></span></div></button>))}
                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_CATEGORY', title: '카테고리 추가' })} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"><Plus size={14} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 pb-10">
                    {manualCategory === 'ALL' ? (<div className="flex flex-col gap-8">{categories.map(cat => { const catManuals = manuals.filter(m => m.category === cat.id); return (<div key={cat.id} className="flex flex-col gap-3"><div className="flex items-center gap-2 px-1"><div className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getColorStyles(cat.color)}`}>{cat.id}</div><span className="text-xs font-bold text-zinc-400">{cat.label}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{catManuals.map(m => <ManualCard key={m.id} m={m} />)}</div></div>); })}</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{(() => { const currentCat = categories.find(c => c.id === manualCategory); return currentCat ? <AddManualCard targetCategoryId={currentCat.id} targetCategoryLabel={currentCat.label} /> : null; })()}{filteredManuals.map(m => <ManualCard key={m.id} m={m} />)}</div>)}
                </div>
            </div>
        );
    };

    const renderAttachmentButton = (attachments) => {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="relative">
                <button onClick={() => setShowFileList(!showFileList)} className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors flex items-center gap-1.5 ${showFileList ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><FileText size={12} /> 첨부 양식 <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 rounded-full text-[9px] min-w-[16px] text-center">{attachments.length}</span></button>
                {showFileList && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFileList(false)}></div>
                        <div className="absolute right-0 top-1/2 mt-2 w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 p-2 animate-fade-in-up origin-top-right">
                            <div className="flex justify-between items-center px-2 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-700/50"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Attached Files</span><div className="flex items-center gap-1"><button onClick={handleAddFileToDetail} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors" title="파일 추가"><Plus size={12} /></button><button onClick={() => setShowFileList(false)} className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"><X size={12} /></button></div></div>
                            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">{attachments.map((file, i) => (<div key={i} onClick={() => handleOpenFile(file.path)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50"><div className="p-1.5 bg-zinc-100 dark:bg-zinc-700 rounded text-zinc-500 group-hover:text-indigo-500 group-hover:bg-white dark:group-hover:bg-zinc-800 transition-colors"><FileText size={16} /></div><span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate flex-1 leading-tight">{file.name}</span><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleDeleteFileFromDetail(e, i)} className="p-1 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors" title="삭제"><Trash2 size={12} /></button><Download size={12} className="text-zinc-300 group-hover:text-indigo-400 transition-colors mr-1" /></div></div>))}</div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderStepSlider = (steps, nextChapter, navigateChapter) => {
        if (!steps || steps.length === 0) return <div className="flex flex-col items-center justify-center text-zinc-400 gap-3 h-full"><div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center"><Image size={24} className="opacity-50" /></div><p className="text-sm text-center">등록된 스텝이 없습니다.<br />우측 상단 '스텝 추가' 버튼을 눌러주세요.</p></div>;
        return (
            <div className="h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateY(-${currentStepIndex * 100}%)` }}>
                {steps.map((step, idx) => (
                    <div key={step.id} className="h-full w-full flex flex-col items-center justify-center p-8 pt-20">
                        <div className="w-full max-w-5xl h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800/50 relative flex items-center justify-center overflow-hidden">
                                {step.image ? <img src={step.image} alt="Step" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : <div className="flex flex-col items-center justify-center text-zinc-400 gap-2"><Image size={40} className="opacity-30" /><span className="text-xs">이미지 없음</span></div>}
                                <div className="hidden absolute inset-0 flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 gap-2"><AlertTriangle size={32} className="text-amber-500" /><span className="text-xs font-bold">이미지를 불러올 수 없습니다.</span></div>
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold">Step {idx + 1}</div>
                            </div>
                            <div className="h-[25%] min-h-[120px] p-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-6 overflow-hidden">
                                <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-zinc-100 dark:border-zinc-800 pr-6"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">TITLE</span><h4 className="text-base font-bold text-zinc-800 dark:text-zinc-100 mt-1">{step.title || `Step ${idx + 1}`}</h4></div>
                                <div className="flex-1 overflow-y-auto pr-2"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">DESCRIPTION</span><p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{step.content || "설명이 없습니다."}</p></div>
                            </div>
                        </div>
                    </div>
                ))}
                {nextChapter && (<div className="h-full w-full flex flex-col items-center justify-center p-8"><div onClick={() => navigateChapter(nextChapter.id)} className="group w-full max-w-[420px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl shadow-lg hover:shadow-xl hover:border-indigo-500 hover:-translate-y-1 transition-all cursor-pointer flex items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🚀</div><div className="flex flex-col"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next Chapter</span><h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{nextChapter.title}</h3></div></div><div className="flex items-center gap-1 text-xs font-bold text-zinc-400 group-hover:text-indigo-600 transition-colors bg-zinc-50 dark:bg-zinc-700/50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30">Start <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></div></div></div>)}
            </div>
        );
    };

    const renderBasicDetail = () => {
        const item = getActiveItem('manuals');
        if (!item) return null;
        const chapters = item.chapters || [];
        const currentChapterId = activeChapterId || (chapters.length > 0 ? chapters[0].id : null);
        const activeChapterIndex = chapters.findIndex(c => c.id === currentChapterId);
        const activeChapter = chapters[activeChapterIndex];
        const prevChapter = chapters[activeChapterIndex - 1];
        const nextChapter = chapters[activeChapterIndex + 1];
        const steps = activeChapter ? (activeChapter.steps || []) : [];
        const currentStep = steps[currentStepIndex];
        const attachments = item.attachments || [];

        const navigateChapter = (chapterId) => { if (!chapterId) return; setActiveChapterId(chapterId); setCurrentStepIndex(0); const scrollContainer = document.getElementById('step-scroll-container'); if (scrollContainer) scrollContainer.scrollTop = 0; };
        const handleWheelScroll = (e) => { const now = Date.now(); if (now - lastScrollTime.current < 500) return; const maxIndex = nextChapter ? steps.length : steps.length - 1; if (e.deltaY > 0) { if (currentStepIndex < maxIndex) { setCurrentStepIndex(prev => prev + 1); lastScrollTime.current = now; } } else if (e.deltaY < 0) { if (currentStepIndex > 0) { setCurrentStepIndex(prev => prev - 1); lastScrollTime.current = now; } } };
        const handleEditStepClick = () => { if (currentStep) setEditStepData(currentStep); };

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center px-4 bg-zinc-50/50 dark:bg-zinc-900/50 z-50 relative">
                    <div className="flex items-center gap-3"><button onClick={() => setIsTocOpen(!isTocOpen)} className={`p-2 rounded-lg transition-colors ${isTocOpen ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><Menu size={18} /></button><div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1"></div><button onClick={() => setViewMode('BASIC_LIST')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><ChevronLeft size={18} /></button><div className="flex flex-col ml-1"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">MANUAL</span><span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-none">{item.title}</span></div></div>
                    <div className="flex gap-2">{renderAttachmentButton(attachments)}<button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_BASIC_CHAPTER', title: '새 챕터 추가' })} className="px-3 py-1.5 text-xs font-bold border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"><Plus size={12} /> 챕터 추가</button></div>
                </div>
                <div className="flex-1 flex overflow-hidden relative">
                    <div className={`flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-10 transition-all duration-300 ease-in-out overflow-hidden ${isTocOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}`}>
                        <div className="w-64 flex flex-col h-full"><div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">Table of Contents</div><div className="flex-1 overflow-y-auto p-2 space-y-1">{(item.chapters || []).map((c, idx) => { const isActive = activeChapter && activeChapter.id === c.id; return (<div key={c.id} className="flex flex-col"><button onClick={() => { setActiveChapterId(c.id); setCurrentStepIndex(0); }} className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'}`}><div className="flex items-center gap-3 min-w-0"><span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>{idx + 1}</span><div className="min-w-0"><div className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{c.title}</div></div></div><div onClick={(e) => requestDelete(e, 'CHAPTER', c.id, c.title)} className={`p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-300 hover:text-rose-500 transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><Trash2 size={12} /></div></button>{isActive && (c.steps || []).length > 0 && (<div className="ml-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 mt-1 mb-1 space-y-0.5 animate-fade-in-down">{(c.steps || []).map((step, sIdx) => { const isStepActive = sIdx === currentStepIndex; return (<button key={step.id} onClick={() => setCurrentStepIndex(sIdx)} className={`w-full text-left py-2 px-2 rounded-lg text-[11px] transition-colors flex items-center gap-2 truncate ${isStepActive ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}><div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStepActive ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div><span className="truncate">{step.title ? (step.title.length > 15 ? step.title.substring(0, 15) + '...' : step.title) : `Step ${sIdx + 1}`}</span></button>); })}</div>)}</div>); })}</div></div>
                    </div>
                    <div className="flex-1 flex flex-col bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden transition-all duration-300">
                        {activeChapter ? (
                            <>
                                <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur absolute top-0 left-0 right-0 z-20"><div className="flex items-center gap-3"><button onClick={() => navigateChapter(prevChapter?.id)} disabled={!prevChapter} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronLeft size={20} /></button><h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><BookOpen size={18} className="text-indigo-500" /><span className="truncate max-w-[400px]">{activeChapter.title}</span></h3><button onClick={() => navigateChapter(nextChapter?.id)} disabled={!nextChapter} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronRight size={20} /></button></div><div className="flex gap-2">{steps.length > 0 && currentStep && (<button onClick={handleEditStepClick} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 text-zinc-500 hover:text-amber-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><Edit3 size={14} /> 수정</button>)}{steps.length > 0 && currentStep && (<button onClick={(e) => requestDelete(e, 'STEP', currentStep.id, currentStep.title || '현재 스텝')} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 text-zinc-500 hover:text-rose-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><Trash2 size={14} /> 삭제</button>)}<button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_MANUAL_STEP', title: '설명 단계 추가' })} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"><Image size={14} /> 스텝 추가</button></div></div>
                                <div id="step-scroll-container" onWheel={handleWheelScroll} className="flex-1 relative overflow-hidden">{renderStepSlider(steps, nextChapter, navigateChapter)}{steps.length > 0 && (<div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">{steps.map((_, idx) => (<div key={idx} onClick={() => setCurrentStepIndex(idx)} className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer hover:scale-125 ${idx === currentStepIndex ? 'bg-indigo-600 h-6' : 'bg-zinc-300 dark:bg-zinc-700'}`} />))}{nextChapter && (<div onClick={() => setCurrentStepIndex(steps.length)} className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer hover:scale-125 mt-2 ${currentStepIndex === steps.length ? 'bg-indigo-600 h-6' : 'bg-zinc-300 dark:bg-zinc-700 border border-indigo-500'}`} title="다음 챕터" />)}</div>)}</div>
                            </>
                        ) : (<div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4"><BookOpen size={48} className="opacity-20" /><p className="text-sm">좌측 목록에서 챕터를 선택하면<br />상세 내용이 표시됩니다.</p></div>)}
                    </div>
                </div>
            </div>
        );
    };

    const renderEquipList = () => {
        const activeTab = equipTab === 'SYSTEM' ? 'SYSTEM' : 'FIELD';
        const equipList = equipment.list || [];

        // 데이터 그룹화
        const groupedEquip = equipList.reduce((acc, equip) => {
            const sys = equip.meta?.system || '기타/공통 계통';
            if (!acc[sys]) acc[sys] = [];
            acc[sys].push(equip);
            return acc;
        }, {});

        const allSystems = Object.keys(groupedEquip).sort();
        const displayedSystems = systemFilter === 'ALL' ? allSystems : [systemFilter];

        return (
            <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-fade-in relative overflow-hidden">
                <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0 z-40">
                    <div className="flex items-center gap-3"><button onClick={() => setViewMode('HOME')} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 rounded text-zinc-500"><ChevronLeft size={20} /></button><h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">설비 마스터</h2></div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 py-4 flex flex-col gap-1">
                        <div className="px-3"><div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">현장 업무 (Field)</div><button onClick={() => setEquipTab('FIELD')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'FIELD' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>트러블 슈팅 / 기기 조작</button></div>
                        <div className="px-3 mt-4"><div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">설비 관리 (System)</div><button onClick={() => setEquipTab('SYSTEM')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'SYSTEM' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>전체 설비 계통도</button></div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-zinc-900 overflow-y-auto relative scroll-smooth">
                        {activeTab === 'SYSTEM' && (
                            <div className="max-w-5xl mx-auto pb-20">

                                {/* 🌟 [수정 1] Main Header: mb-6 제거 (초기 간격 벌어짐 해결) */}
                                <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 px-8 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 whitespace-nowrap">
                                            <div className="w-1 h-4 bg-indigo-500"></div>전체 설비 계통 목록
                                        </h3>

                                        {/* 커스텀 드롭다운 */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                                className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 rounded-lg py-1.5 px-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm active:scale-95"
                                            >
                                                <Filter size={12} className="text-indigo-500" />
                                                <span>{systemFilter === 'ALL' ? `전체 보기 (${allSystems.length})` : systemFilter}</span>
                                                <ChevronDown size={12} className={`text-zinc-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isFilterOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsFilterOpen(false)}></div>
                                                    <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-down origin-top-left">
                                                        <div className="max-h-64 overflow-y-auto p-1 scrollbar-hide">
                                                            <button
                                                                onClick={() => { setSystemFilter('ALL'); setIsFilterOpen(false); }}
                                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${systemFilter === 'ALL' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                                                            >
                                                                <span>전체 보기</span>
                                                                {systemFilter === 'ALL' && <Check size={12} />}
                                                            </button>
                                                            <div className="h-px bg-zinc-100 dark:bg-zinc-700/50 my-1"></div>
                                                            {allSystems.map(sys => (
                                                                <button
                                                                    key={sys}
                                                                    onClick={() => { setSystemFilter(sys); setIsFilterOpen(false); }}
                                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${systemFilter === sys ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                                                                >
                                                                    <span>{sys}</span>
                                                                    {systemFilter === sys && <Check size={12} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIPMENT', title: '설비 등록' })} className="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"><Plus size={14} /> 설비 등록</button>
                                </div>

                                {/* 🌟 [수정 2] 콘텐츠 영역: pt-6 추가 (헤더와 첫 섹션 사이의 적절한 간격) */}
                                <div className="px-8 pt-6">
                                    {allSystems.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50/50"><p className="text-sm text-zinc-500 font-medium">등록된 설비가 없습니다.</p></div>
                                    ) : (
                                        // 🌟 [수정 3] space-y-8 제거 (마진 대신 패딩 사용을 위해)
                                        <div className="flex flex-col">
                                            {displayedSystems.map(sys => (
                                                // 🌟 [수정 4] pb-12 추가: 섹션의 높이를 패딩으로 늘려서 스티키가 끊기지 않고 다음 섹션과 이어지게 함
                                                <div key={sys} className="relative scroll-mt-[60px] pb-12">

                                                    {/* 🌟 [수정 5] Section Header: top-[54px] (메인 헤더 높이 53px + 1px 여유) */}
                                                    <div className="sticky top-[54px] z-20 bg-white dark:bg-zinc-900 py-2 mb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                                                        <span className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm"><LayoutGrid size={14} /></span>
                                                        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{sys}</h4>
                                                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">{groupedEquip[sys].length}</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {groupedEquip[sys].map(equip => (
                                                            <div key={equip.id} onClick={() => { setActiveEquipId(equip.id); setActiveEquipDocId(null); setViewMode('EQUIP_DETAIL'); }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <span className="text-[10px] font-bold font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{equip.meta?.code || 'EQ-000'}</span>
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => handleEditEquipItem(e, equip)} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="설비 수정"><Edit3 size={14} /></button>
                                                                        <button onClick={(e) => handleDeleteEquipment(e, equip.id, equip.title)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all" title="설비 삭제"><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>
                                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate mb-1 group-hover:text-indigo-600 transition-colors">{equip.title}</h4>
                                                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                                                    <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5"><FileText size={12} className="text-zinc-400" /> Doc: {equip.documents?.length || 0}</span>
                                                                    <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5"><Wrench size={12} className="text-zinc-400" /> Part: {equip.parts?.length || 0}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'FIELD' && (
                            <div className="max-w-4xl mx-auto space-y-10 px-8 pb-10 pt-8">
                                {/* ... FIELD 탭 내용은 변경 사항 없음 ... */}
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-emerald-500"></div>현장 기기 조작법 (Operation)</h3><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '기기 조작법 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button></div>
                                    <div className="grid grid-cols-2 gap-3">{equipment.fieldGuides && equipment.fieldGuides.filter(g => g.type === 'OPERATION').map(g => (<div key={g.id} onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }} className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5"><div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button><button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button></div></div><p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">{g.desc}</p><div className="mt-2 flex gap-1"><span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">Standard</span>{g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}</div></div>))}</div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-rose-500"></div>고장 조치 매뉴얼 (Troubleshooting)</h3><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '고장 조치 매뉴얼 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button></div>
                                    <div className="grid grid-cols-2 gap-3">{equipment.fieldGuides && equipment.fieldGuides.filter(g => g.type === 'TROUBLE').map(g => (<div key={g.id} onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }} className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5"><div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button><button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button></div></div><p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">{g.desc}</p><div className="mt-2 flex gap-1"><span className="text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">긴급</span>{g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}</div></div>))}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderFieldDetail = () => {
        const guide = (equipment.fieldGuides || []).find(g => g.id === activeFieldGuideId);
        if (!guide) return <div className="p-8 text-zinc-400">데이터를 찾을 수 없습니다.</div>;

        const steps = guide.steps || [];
        const activeStep = steps.find(s => s.id === currentStepId) || (steps.length > 0 ? steps[0] : null);
        const isTrouble = guide.type === 'TROUBLE';

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative">
                <div className={`h-14 border-b flex justify-between items-center px-4 flex-shrink-0 z-20 ${isTrouble ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'}`}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('EQUIP_LIST')} className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-500"><ChevronLeft size={20} /></button>
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isTrouble ? 'text-rose-500' : 'text-emerald-500'}`}>{isTrouble ? 'TROUBLESHOOTING' : 'OPERATION GUIDE'}</span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{guide.title}</span>
                        </div>
                    </div>
                    <div className="flex gap-2"><button onClick={(e) => handleEditFieldGuide(e, guide)} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-50 flex items-center gap-1"><Edit3 size={12} /> 정보 수정</button></div>
                </div>
                <div className="flex-1 flex overflow-hidden relative">
                    <div className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col">
                        <div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Process Steps</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {steps.length === 0 && <div className="text-xs text-zinc-400 text-center py-4">등록된 단계가 없습니다.</div>}
                            {steps.map((step, idx) => {
                                const isActive = activeStep && activeStep.id === step.id;
                                return (
                                    <div key={step.id || idx} onClick={() => { setCurrentStepId(step.id); setIsDetailPanelOpen(true); }} className={`group w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'}`}>
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${isActive ? (isTrouble ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>{idx + 1}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-xs font-bold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'} mb-0.5`}>{step.title || `Step ${idx + 1}`}</div>
                                            <div className={`text-[10px] leading-tight line-clamp-2 ${isActive ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>{step.content || "내용 없음"}</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditStepData(step); }}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-zinc-400 hover:text-indigo-500 rounded transition-all"
                                            title="단계 수정"
                                        >
                                            <Edit3 size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                            <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_STEP', title: '작업 단계 추가' })} className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50/50 flex justify-center gap-2 mt-2 transition-all"><Plus size={14} /> 단계 추가</button>
                        </div>
                    </div>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex flex-col">
                        {activeStep && activeStep.image ? (<PanZoomViewer src={activeStep.image} alt="도면 확인" />) : (<div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2"><Image size={48} className="opacity-20" /><p className="text-sm">등록된 도면/사진이 없습니다.</p></div>)}
                        <button
                            onClick={() => setIsDetailPanelOpen(!isDetailPanelOpen)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-l-lg p-1 shadow-md z-30 hover:bg-zinc-50 transition-colors"
                            title={isDetailPanelOpen ? "상세 정보 닫기" : "상세 정보 열기"}
                        >
                            {isDetailPanelOpen ? <PanelRightClose size={16} className="text-zinc-500" /> : <PanelRightOpen size={16} className="text-zinc-500" />}
                        </button>
                    </div>

                    <div className={`absolute top-0 right-0 h-full w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 transition-transform duration-300 ease-in-out shadow-xl ${isDetailPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isTrouble ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{activeStep ? `STEP ${steps.indexOf(activeStep) + 1}` : 'INFO'}</span>
                                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-tight mt-2 mb-2">{activeStep ? (activeStep.title || activeStep.text) : "단계를 선택하세요"}</h3>
                            </div>
                            <button onClick={() => setIsDetailPanelOpen(false)} className="p-1 hover:bg-zinc-100 rounded text-zinc-400"><X size={16} /></button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto">
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{activeStep ? (activeStep.content || activeStep.text) : "좌측 목록에서 작업 단계를 선택하여 상세 내용을 확인하십시오."}</p>
                            {isTrouble && (<div className="mt-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-3 flex gap-2"><AlertTriangle className="text-rose-500 flex-shrink-0" size={16} /><div><h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">안전 주의</h4><p className="text-[11px] text-rose-600/80 mt-1">반드시 전원 차단 여부를 확인 후 작업하십시오.</p></div></div>)}
                        </div>
                        {guide.attachments && guide.attachments.length > 0 && (
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
                                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Attached Documents</h4>
                                <div className="space-y-1">
                                    {guide.attachments.map((file, i) => (
                                        <div key={i} onClick={() => handleOpenFile(file.path)} className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                                            <FileText size={14} className="text-indigo-500" />
                                            <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate flex-1">{file.name}</span>
                                            <Download size={12} className="text-zinc-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
                            <button className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm text-white ${isTrouble ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>확인 및 다음 단계</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderEquipDetail = () => {
        const equip = (equipment.list || []).find(e => e.id === activeEquipId);
        if (!equip) return <div className="flex items-center justify-center h-full text-zinc-400">데이터 로드 실패</div>;

        const documents = equip.documents || [];
        const logs = equip.logs || [];
        const parts = equip.parts || [];

        const pidDocs = documents.filter(d => d.type === 'PID');
        const manualDocs = documents.filter(d => d.type !== 'PID');

        const currentDocId = activeEquipDocId;
        const activeDoc = documents.find(d => d.id === currentDocId);

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                {/* 1. 상단 헤더 */}
                <div class="rounded-t-2xl h-14 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center px-4 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur z-20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsEquipTocOpen(!isEquipTocOpen)} className={`p-2 rounded-lg transition-colors ${isEquipTocOpen ? 'bg-zinc-200 dark:bg-zinc-700' : 'text-zinc-400'}`}><Menu size={18} /></button>
                        <div className="h-4 w-px bg-zinc-300 mx-1"></div>
                        <button onClick={() => setViewMode('EQUIP_LIST')} className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500"><ChevronLeft size={18} /></button>
                        <div className="flex flex-col ml-1">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{equip.meta?.system}</span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{equip.title}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIP_DOC', title: '도면/문서 등록' })} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex gap-1 shadow-sm transition-colors"><Plus size={12} /> 도면/문서 등록</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* 좌측 목록 패널 */}
                    <div className={`flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-10 transition-all duration-300 overflow-hidden ${isEquipTocOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}`}>
                        <div className="w-64 flex flex-col h-full overflow-y-auto">
                            {/* 섹션 1: P&ID 도면 */}
                            <div className="p-3">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1"><FileCode size={10} /> P&ID Drawings</div>
                                {pidDocs.length === 0 ? <div className="text-xs text-zinc-400 px-2 py-2 italic bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg">등록된 도면 없음</div> :
                                    <div className="space-y-1">
                                        {pidDocs.map(doc => (
                                            <div key={doc.id} className={`group flex items-center justify-between rounded-lg pr-1 transition-all ${activeEquipDocId === doc.id ? 'bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                                                <button onClick={() => setActiveEquipDocId(doc.id)} className="flex-1 text-left px-3 py-2 text-xs font-medium flex items-center gap-2 overflow-hidden">
                                                    <FileText size={14} className={`flex-shrink-0 ${activeEquipDocId === doc.id ? 'text-indigo-600' : 'text-zinc-500'}`} />
                                                    <span className={`truncate ${activeEquipDocId === doc.id ? 'text-indigo-600' : 'text-zinc-500 dark:text-zinc-400'}`}>{doc.title}</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }} className="p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded opacity-0 group-hover:opacity-100 transition-all" title="삭제"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>

                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 mx-4 my-1"></div>

                            {/* 섹션 2: 일반 문서/매뉴얼 */}
                            <div className="p-3">
                                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1"><Folder size={10} /> Manuals & Specs</div>
                                {manualDocs.length === 0 ? <div className="text-xs text-zinc-400 px-2 py-2 italic bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg">등록된 문서 없음</div> :
                                    <div className="space-y-1">
                                        {manualDocs.map(doc => (
                                            <div key={doc.id} className={`group flex items-center justify-between rounded-lg pr-1 transition-all ${activeEquipDocId === doc.id ? 'bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}>
                                                <button onClick={() => setActiveEquipDocId(doc.id)} className="flex-1 text-left px-3 py-2 text-xs font-medium flex items-center gap-2 overflow-hidden">
                                                    <BookOpen size={14} className={`flex-shrink-0 ${activeEquipDocId === doc.id ? 'text-emerald-600' : 'text-zinc-500'}`} />
                                                    <span className={`truncate ${activeEquipDocId === doc.id ? 'text-emerald-600' : 'text-zinc-500 dark:text-zinc-400'}`}>{doc.title}</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }} className="p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded opacity-0 group-hover:opacity-100 transition-all" title="삭제"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        </div>
                    </div>

                    {/* 중앙: 뷰어 */}
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 flex flex-col overflow-hidden relative">
                        {activeDoc ? (
                            activeDoc.path && activeDoc.path.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={activeDoc.path} className="w-full h-full border-none" title="PDF Viewer" />
                            ) : (
                                <PanZoomViewer src={activeDoc.path} alt={activeDoc.title} />
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                                <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-50"><Image size={32} /></div>
                                <p className="text-sm font-medium">왼쪽 목록에서 문서를 선택하세요.</p>
                            </div>
                        )}

                        {/* 토글 버튼 */}
                        <button
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-l-lg p-1 shadow-md z-30 hover:bg-zinc-50 transition-colors"
                            title={isRightPanelOpen ? "상세 패널 닫기" : "상세 패널 열기"}
                        >
                            {isRightPanelOpen ? <PanelRightClose size={16} className="text-zinc-500" /> : <PanelRightOpen size={16} className="text-zinc-500" />}
                        </button>
                    </div>

                    {/* 우측: 정보 및 이력 패널 */}
                    {/* ▼ [수정됨] 부모의 bg-white/bg-zinc-900을 제거(투명 처리)하여 모서리 겹침 현상 해결 ▼ */}
                    <div className={`flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 transition-all duration-300 ease-in-out overflow-hidden ${isRightPanelOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-none'}`}>
                        <div className="w-80 flex flex-col h-full">
                            {/* ▼ [수정됨] 탭 영역(Header)에만 배경색과 둥근 모서리(rounded-tr-2xl) 적용 ▼ */}
                            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur rounded-tr-2xl overflow-hidden">
                                <button onClick={() => setRightPanelTab('INFO')} className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${rightPanelTab === 'INFO' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white/50 dark:bg-zinc-800/50' : 'text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}>제원 및 구성</button>
                                <button onClick={() => setRightPanelTab('HISTORY')} className={`flex-1 py-3 text-xs font-bold text-center transition-colors ${rightPanelTab === 'HISTORY' ? 'text-amber-600 border-b-2 border-amber-600 bg-white/50 dark:bg-zinc-800/50' : 'text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'}`}>정비 이력 ({logs.length})</button>
                            </div>

                            {/* ▼ [수정됨] 본문 영역(Body)에 별도로 배경색(bg-white) 적용 ▼ */}
                            {rightPanelTab === 'INFO' && (
                                <div className="flex-1 overflow-y-auto p-5 space-y-8 bg-white dark:bg-zinc-900">
                                    {/* 1. 기본 정보 (General Info) */}
                                    <div>
                                        {/* 🌟 [수정] h3 태그 대신 div로 감싸고 flex justify-between 적용 */}
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                <Briefcase size={14} /> General Info
                                            </h3>

                                            {/* 수정 버튼 */}
                                            <button
                                                onClick={handleOpenEditEquip}
                                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-indigo-500 transition-colors"
                                                title="설비 정보 수정"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </div>

                                        <div className="space-y-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                            <div className="flex justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"><span className="text-zinc-500 dark:text-zinc-400">계통</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{equip.meta?.system || '공통'}</span></div>
                                            <div className="flex justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"><span className="text-zinc-500 dark:text-zinc-400">설비 코드</span><span className="font-bold text-zinc-700 dark:text-zinc-200">{equip.meta?.code}</span></div>
                                            <div className="flex justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0"><span className="text-zinc-500 dark:text-zinc-400">제조사</span><span className="font-bold text-zinc-700 dark:text-zinc-200">{equip.meta?.maker}</span></div>
                                        </div>
                                    </div>

                                    {/* 2. 상세 제원 (Technical Specs) */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Zap size={14} /> Technical Specs</h3>
                                            <button onClick={() => setSpecModal({ isOpen: true, key: '', value: '' })} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-indigo-500" title="스펙 추가"><Plus size={14} /></button>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                                            {(!equip.specs || equip.specs.length === 0) ? (
                                                <div className="p-4 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50">등록된 상세 제원이 없습니다.<br />(예: 용량, 압력, 재질 등)</div>
                                            ) : (
                                                <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                                    {(equip.specs || []).map(s => (
                                                        <div key={s.id} className="flex justify-between items-center p-3 text-xs group hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                                            <span className="font-bold text-zinc-500 dark:text-zinc-400">{s.key}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-zinc-800 dark:text-zinc-100">{s.value}</span>
                                                                <button onClick={() => handleDeleteSpec(s.id)} className="text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. 주요 구성품 (Major Components) */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Layers size={14} /> Major Components</h3>
                                            <button onClick={() => setPartModal({ isOpen: true, name: '', spec: '' })} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-indigo-500"><Plus size={14} /></button>
                                        </div>
                                        <div className="space-y-2">
                                            {parts.length === 0 ? <p className="text-xs text-zinc-300 text-center py-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">등록된 구성품이 없습니다.</p> : parts.map(part => (
                                                <div key={part.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm group">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                        <div>
                                                            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{part.name}</div>
                                                            {part.spec && <div className="text-[10px] text-zinc-400">{part.spec}</div>}
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeletePart(part.id)} className="p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === 'HISTORY' && (
                                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {logs.length === 0 ? <div className="flex flex-col items-center justify-center h-40 text-zinc-400"><History size={24} className="mb-2 opacity-20" /><p className="text-xs">정비 이력이 없습니다.</p></div> : logs.map(log => (
                                            <div key={log.id} className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 group">
                                                <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${log.type === 'AI' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-zinc-400">{log.date}</span>
                                                    <div className="flex items-center gap-2">
                                                        {log.targetPart && log.targetPart !== '전체' && <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">{log.targetPart}</span>}
                                                        <button onClick={() => handleDeleteLog(log.id)} className="text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{log.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <button onClick={() => setLogModal({ isOpen: true, content: '', targetPart: '' })} className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 flex items-center justify-center gap-2"><Plus size={14} /> 새 이력 작성</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        );
    };

    return (
        <div className="h-full relative">
            {viewMode === 'HOME' && renderHome()}
            {viewMode === 'BASIC_LIST' && renderBasicList()}
            {viewMode === 'BASIC_DETAIL' && renderBasicDetail()}
            {viewMode === 'EQUIP_LIST' && renderEquipList()}
            {viewMode === 'EQUIP_DETAIL' && renderEquipDetail()}
            {viewMode === 'FIELD_DETAIL' && renderFieldDetail()}

            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl w-full max-w-lg mx-4 rounded-3xl shadow-2xl border border-white/20 dark:border-zinc-800/50 p-8 transform scale-100 transition-all ring-1 ring-black/5">
                        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-3"><div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-500"><Plus size={20} /></div> {modalConfig.title}</h3>
                        <div className="space-y-5">
                            {/* 설비 등록 */}
                            {(modalConfig.type === 'ADD_EQUIPMENT' || modalConfig.type === 'EDIT_EQUIPMENT') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설비명</label>
                                        <input autoFocus value={equipTitle} onChange={e => setEquipTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 가스터빈 1호기" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설비 코드</label>
                                            <input value={equipCode} onChange={e => setEquipCode(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: GT-01" />
                                        </div>
                                        {/* 🌟 [디테일 복구] 제조사 입력 필드 추가 */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">제조사</label>
                                            <input value={equipMaker} onChange={e => setEquipMaker(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: Siemens" />
                                        </div>
                                    </div>

                                    {/* 소속 계통 입력 부분 (기능 개선됨) */}
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">소속 계통</label>
                                        {!isDirectSystem ? (
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={equipSystem}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'DIRECT_INPUT') {
                                                                setIsDirectSystem(true);
                                                                setEquipSystem('');
                                                                setOriginalSystemName(''); // 신규 입력이므로 원본 없음
                                                            } else {
                                                                setEquipSystem(e.target.value);
                                                            }
                                                        }}
                                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl pl-4 pr-10 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">계통 선택</option>
                                                        {Array.from(new Set((equipment.list || []).map(e => e.meta?.system).filter(Boolean))).sort().map(sys => (
                                                            <option key={sys} value={sys}>{sys}</option>
                                                        ))}
                                                        <option value="DIRECT_INPUT" className="font-bold text-indigo-500 bg-indigo-50 dark:bg-zinc-700">+ 새 계통 직접 입력</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                                                </div>

                                                {/* 🌟 수정 버튼: 누르면 원본 이름을 기억하고 입력 모드로 진입 */}
                                                <button
                                                    onClick={() => {
                                                        if (equipSystem) {
                                                            setOriginalSystemName(equipSystem);
                                                            setIsDirectSystem(true);
                                                        }
                                                    }}
                                                    disabled={!equipSystem}
                                                    className={`px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${!equipSystem ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title="선택한 계통명 일괄 변경"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={equipSystem}
                                                    onChange={e => setEquipSystem(e.target.value)}
                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder={originalSystemName ? "변경할 계통명 입력" : "새 계통 명칭 입력"}
                                                />

                                                {/* 🌟 기존 계통 수정 모드일 때만 [변경] 버튼 표시 */}
                                                {originalSystemName && (
                                                    <button
                                                        onClick={handleRenameSystem}
                                                        className="px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg transition-colors whitespace-nowrap"
                                                    >
                                                        변경
                                                    </button>
                                                )}

                                                <button
                                                    onClick={handleCancelSystemInput}
                                                    className="px-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors whitespace-nowrap"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설명</label>
                                        <input value={equipDesc} onChange={e => setEquipDesc(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="간략한 설명" />
                                    </div>
                                </>
                            )}
                            {/* 문서 등록 */}
                            {modalConfig.type === 'ADD_EQUIP_DOC' && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">문서 제목</label><input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-zinc-50/50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: Feedwater Pump P&ID" /></div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">문서 유형</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setDocType('PID')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${docType === 'PID' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 text-zinc-500'}`}>P&ID 도면</button>
                                            <button onClick={() => setDocType('MANUAL')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${docType === 'MANUAL' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 text-zinc-500'}`}>일반 문서/매뉴얼</button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1">파일 첨부</label></div>
                                        <div onClick={() => handleSelectFile('attachment')} className="w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all mb-2 border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                            <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400"><FileText size={20} /></div>
                                            <div className="text-center"><p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">클릭하여 파일 선택</p></div>
                                        </div>
                                        {manualAttachments.length > 0 && (
                                            <div className="bg-zinc-50/50 dark:bg-zinc-800/50 border dark:border-zinc-700 rounded-xl p-2">
                                                <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm">
                                                    <span className="text-xs truncate flex-1 text-zinc-700 dark:text-zinc-200">{manualAttachments[0].name}</span>
                                                    <Check size={14} className="text-emerald-500" />
                                                </div>
                                            </div>)}
                                    </div>
                                </>
                            )}
                            {/* 매뉴얼/가이드 등록 */}
                            {['ADD_BASIC_MANUAL', 'EDIT_BASIC_MANUAL', 'ADD_FIELD_GUIDE', 'EDIT_FIELD_GUIDE', 'ADD_BASIC_CHAPTER'].includes(modalConfig.type) && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">제목</label>
                                        <input
                                            autoFocus
                                            value={inputTitle}
                                            onChange={e => setInputTitle(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="제목 입력"
                                        />
                                    </div>
                                    {(modalConfig.type !== 'ADD_BASIC_CHAPTER') && <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설명</label>
                                        <textarea
                                            value={inputDesc}
                                            onChange={e => setInputDesc(e.target.value)}
                                            className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="내용 입력..."
                                        />
                                    </div>
                                    }
                                    {(modalConfig.type !== 'ADD_BASIC_CHAPTER') && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 ml-1">파일 첨부</label></div>
                                            <div onClick={() => handleSelectFile('attachment')} className="w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all mb-2 border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50">
                                                <div className="p-2 rounded-full bg-zinc-100 text-zinc-400"><FileText size={20} /></div>
                                                <div className="text-center"><p className="text-xs font-bold text-zinc-600">클릭하여 파일 선택</p></div>
                                            </div>
                                            {/* 파일 첨부 영역 하단 (공통 모달 내부) */}
                                            {manualAttachments.length > 0 && (
                                                <div className="space-y-1">
                                                    {manualAttachments.map((f, i) => (
                                                        <div key={i} className="bg-zinc-50/50 dark:bg-zinc-800/50 border dark:border-zinc-700 rounded-xl p-2 flex items-center justify-between">
                                                            <span className="text-xs truncate flex-1 text-zinc-700 dark:text-zinc-200">{f.name}</span>
                                                            <Check size={14} className="text-emerald-500" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            {/* 스텝 추가 */}
                            {(modalConfig.type === 'ADD_MANUAL_STEP' || modalConfig.type === 'ADD_FIELD_STEP') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">단계 제목</label>
                                        <input
                                            autoFocus
                                            value={newStepForm.title}
                                            onChange={e => setNewStepForm({ ...newStepForm, title: e.target.value })}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="단계 제목"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">상세 내용</label>
                                        <textarea
                                            value={newStepForm.content}
                                            onChange={e => setNewStepForm({ ...newStepForm, content: e.target.value })}
                                            className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="상세 내용..."
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 ml-1">이미지/도면</label></div>
                                        <div onClick={() => handleSelectImage('step')} className="w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all mb-2 border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50">
                                            {newStepForm.imagePath ? <img src={newStepForm.imagePath} className="h-32 object-contain" /> : <><div className="p-2 rounded-full bg-zinc-100 text-zinc-400"><Image size={20} /></div><div className="text-center"><p className="text-xs font-bold text-zinc-600">클릭하여 이미지 선택</p></div></>}
                                        </div>
                                    </div>
                                </>
                            )}
                            {/* 카테고리 추가/수정 */}
                            {(modalConfig.type === 'ADD_CATEGORY' || modalConfig.type === 'EDIT_CATEGORY') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">카테고리 ID (영문)</label>
                                        <input
                                            disabled={modalConfig.type === 'EDIT_CATEGORY'}
                                            value={newCatId}
                                            onChange={e => setNewCatId(e.target.value.toUpperCase())}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                            placeholder="예: SAFETY"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">카테고리 명칭</label>
                                        <input
                                            value={newCatName}
                                            onChange={e => setNewCatName(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="예: 안전 교육"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 block mb-1.5 ml-1">라벨 색상</label>
                                        {/* 🌟 [수정] Tailwind가 인식할 수 있도록 전체 클래스명을 명시한 배열 사용 */}
                                        <div className="grid grid-cols-9 gap-2 py-1">
                                            {[
                                                { val: 'zinc', cls: 'bg-zinc-500' }, { val: 'red', cls: 'bg-red-500' },
                                                { val: 'orange', cls: 'bg-orange-500' }, { val: 'amber', cls: 'bg-amber-500' },
                                                { val: 'yellow', cls: 'bg-yellow-500' }, { val: 'lime', cls: 'bg-lime-500' },
                                                { val: 'green', cls: 'bg-green-500' }, { val: 'emerald', cls: 'bg-emerald-500' },
                                                { val: 'teal', cls: 'bg-teal-500' }, { val: 'cyan', cls: 'bg-cyan-500' },
                                                { val: 'sky', cls: 'bg-sky-500' }, { val: 'blue', cls: 'bg-blue-500' },
                                                { val: 'indigo', cls: 'bg-indigo-500' }, { val: 'violet', cls: 'bg-violet-500' },
                                                { val: 'purple', cls: 'bg-purple-500' }, { val: 'fuchsia', cls: 'bg-fuchsia-500' },
                                                { val: 'pink', cls: 'bg-pink-500' }, { val: 'rose', cls: 'bg-rose-500' }
                                            ].map(({ val, cls }) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setNewCatColor(val)}
                                                    className={`w-6 h-6 rounded-full flex-shrink-0 border-2 transition-transform ${newCatColor === val ? 'border-zinc-800 dark:border-white scale-125' : 'border-transparent hover:scale-110'}`}
                                                >
                                                    {/* 🌟 명시적 클래스(cls) 사용으로 색상 100% 표시 보장 */}
                                                    <div className={`w-full h-full rounded-full ${cls} shadow-sm`}></div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="flex-1 py-3 rounded-xl border text-sm font-bold hover:bg-zinc-50">취소</button>
                            <button onClick={handleSaveData} className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-indigo-600 hover:bg-indigo-500 shadow-lg">등록하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 구성품(Components) 추가 모달 */}
            {partModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xs mx-4 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-zinc-800/50">
                        {/* ▼ 제목 수정 ▼ */}
                        <h3 className="font-bold mb-4 text-zinc-800 dark:text-zinc-100 text-sm">구성품 등록 (계기/밸브/기기)</h3>
                        <div className="space-y-3 mb-4">
                            {/* ▼ 플레이스홀더 수정 ▼ */}
                            <input value={partModal.name} onChange={e => setPartModal({ ...partModal, name: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="명칭 (예: TIT-001, Check Valve)" />
                            <input value={partModal.spec} onChange={e => setPartModal({ ...partModal, spec: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="규격/모델명 (선택)" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setPartModal({ isOpen: false, name: '', spec: '' })} className="flex-1 py-2 rounded-lg border dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800">취소</button>
                            <button onClick={handleAddPart} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500">등록</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 이력 작성 모달 */}
            {logModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-sm mx-4 rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-zinc-800/50">
                        <h3 className="font-bold mb-4 text-zinc-800 dark:text-zinc-100">정비 이력 작성</h3>
                        <div className="mb-3">
                            <label className="text-xs font-bold text-zinc-400 block mb-1">대상 구성품 (Component)</label>
                            <select value={logModal.targetPart} onChange={e => setLogModal({ ...logModal, targetPart: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none">
                                <option value="전체">설비 전체 (General)</option>
                                {currentEquip?.parts?.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <textarea value={logModal.content} onChange={e => setLogModal({ ...logModal, content: e.target.value })} className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 resize-none mb-4 outline-none focus:ring-2 focus:ring-amber-500" placeholder="정비 내용을 입력하세요..." />
                        <div className="flex gap-2">
                            <button onClick={() => setLogModal({ isOpen: false, content: '' })} className="flex-1 py-2 rounded-xl border text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">취소</button>
                            <button onClick={handleAddLog} className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 shadow-lg">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 상세 제원(Spec) 추가 모달 */}
            {specModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xs mx-4 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-zinc-800/50">
                        <h3 className="font-bold mb-4 text-zinc-800 dark:text-zinc-100 text-sm">상세 제원 추가</h3>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1">항목명 (Item)</label>
                                <input value={specModal.key} onChange={e => setSpecModal({ ...specModal, key: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 정격 용량, 설계 압력" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1">값 (Value)</label>
                                <input value={specModal.value} onChange={e => setSpecModal({ ...specModal, value: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 100 MW, 150 Bar" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setSpecModal({ isOpen: false, key: '', value: '' })} className="flex-1 py-2 rounded-lg border dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800">취소</button>
                            <button onClick={handleAddSpec} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500">추가</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 스텝 수정 모달 */}
            {editStepData && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-zinc-200 dark:border-zinc-800">
                        <h3 className="font-bold text-lg mb-4 text-zinc-800 dark:text-zinc-100">스텝 내용 수정</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-zinc-500 block mb-1">제목</label><input value={editStepData.title} onChange={(e) => setEditStepData({ ...editStepData, title: e.target.value })} className="w-full p-2 border rounded-lg text-sm" /></div>
                            <div><label className="text-xs font-bold text-zinc-500 block mb-1">내용</label><textarea value={editStepData.content} onChange={(e) => setEditStepData({ ...editStepData, content: e.target.value })} className="w-full h-32 p-2 border rounded-lg text-sm resize-none" /></div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 block mb-1">이미지 수정</label>
                                <div onClick={() => handleSelectImage('edit', editStepData.id)} className="border-2 border-dashed border-zinc-300 rounded-lg p-4 flex justify-center items-center cursor-pointer hover:bg-zinc-50">
                                    {editStepData.image ? <img src={editStepData.image} className="max-h-32 object-contain" /> : <div className="text-zinc-400 text-sm">이미지 변경 (클릭)</div>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditStepData(null)} className="flex-1 py-2 rounded-lg border text-sm font-bold">취소</button>
                            <button onClick={handleSaveStepEdit} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    {/* 너비를 내용에 맞게 자동(w-auto)으로 하되, 최소 320px ~ 최대 500px 사이에서 조절되도록 설정 */}
                    <div className="bg-white dark:bg-zinc-900 w-auto min-w-[320px] max-w-[500px] p-6 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                        <h3 className="font-bold text-lg mb-2 text-zinc-800 dark:text-zinc-100">{dialogConfig.type === 'alert' ? '알림' : '확인'}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 whitespace-pre-wrap">{dialogConfig.message}</p>
                        <div className="flex gap-2">
                            {dialogConfig.type === 'confirm' && <button onClick={closeDialog} className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-bold">취소</button>}
                            <button onClick={() => { if (dialogConfig.onConfirm) dialogConfig.onConfirm(); closeDialog(); }} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold">확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default WorkDetailView;