// Last Updated: 2025-12-15 22:45:33
import React, { useState, useRef, useEffect } from 'react';
import {
    Briefcase, BookOpen, Wrench, AlertTriangle, ChevronRight, Plus, Edit3, Trash2,
    ChevronLeft, FileText, Image, ArrowRight, Menu, History, Bot, Lock, Zap,
    AlertCircle, X, Download, Upload, PanelRightClose, PanelRightOpen, GripVertical
} from 'lucide-react';
import PanZoomViewer from '../components/ui/PanZoomViewer';

const { ipcRenderer } = window.require('electron');

const WorkDetailView = ({ work, setWork, equipment, setEquipment, handleSendMessage, viewMode, setViewMode }) => {

    // --- 🏗️ 설비 마스터 전용 State ---
    const [activeEquipId, setActiveEquipId] = useState(null);
    const [activeEquipChapterId, setActiveEquipChapterId] = useState(null);
    const [isEquipTocOpen, setIsEquipTocOpen] = useState(true);
    const [equipAiQuery, setEquipAiQuery] = useState('');
    const [equipTab, setEquipTab] = useState('FIELD');
    const [logModal, setLogModal] = useState({ isOpen: false, content: '' });

    // 현장 가이드 상세 화면용 State
    const [activeFieldGuideId, setActiveFieldGuideId] = useState(null);
    const [currentStepId, setCurrentStepId] = useState(null);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false); // 기본값 닫힘

    // --- 기본 상태 (기초 교육용) ---
    const lastScrollTime = useRef(0);
    const [activeId, setActiveId] = useState(null);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [showFileList, setShowFileList] = useState(false);

    const [manualCategory, setManualCategory] = useState('ALL');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', title: '' });
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });

    // 입력 폼
    const [inputTitle, setInputTitle] = useState('');
    const [inputDesc, setInputDesc] = useState('');
    const [inputCategory, setInputCategory] = useState('FIELD');
    const [inputSteps, setInputSteps] = useState([{ text: '' }]); // Legacy support

    const [equipTitle, setEquipTitle] = useState('');
    const [equipCode, setEquipCode] = useState('');
    const [equipDesc, setEquipDesc] = useState('');

    const [manualAttachments, setManualAttachments] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatId, setNewCatId] = useState('');
    const [newCatColor, setNewCatColor] = useState('zinc');
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [newStepForm, setNewStepForm] = useState({ imagePath: '', title: '', content: '' });
    const [editStepData, setEditStepData] = useState(null);
    const [editingManualId, setEditingManualId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // 색상 팔레트 정의
    const colorPalette = [
        { id: 'slate', bg: 'bg-slate-500' }, { id: 'red', bg: 'bg-red-500' }, { id: 'orange', bg: 'bg-orange-500' },
        { id: 'amber', bg: 'bg-amber-500' }, { id: 'yellow', bg: 'bg-yellow-500' }, { id: 'lime', bg: 'bg-lime-500' },
        { id: 'green', bg: 'bg-green-500' }, { id: 'emerald', bg: 'bg-emerald-500' }, { id: 'teal', bg: 'bg-teal-500' },
        { id: 'cyan', bg: 'bg-cyan-500' }, { id: 'sky', bg: 'bg-sky-500' }, { id: 'blue', bg: 'bg-blue-500' },
        { id: 'indigo', bg: 'bg-indigo-500' }, { id: 'violet', bg: 'bg-violet-500' }, { id: 'purple', bg: 'bg-purple-500' },
        { id: 'fuchsia', bg: 'bg-fuchsia-500' }, { id: 'pink', bg: 'bg-pink-500' }, { id: 'rose', bg: 'bg-rose-500' }
    ];

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
            slate: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900/30 dark:border-slate-700 dark:text-slate-400',
            zinc: 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900/30 dark:border-zinc-700 dark:text-zinc-400',
            red: 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400',
            orange: 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400',
            amber: 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400',
            lime: 'bg-lime-50 border-lime-200 text-lime-600 dark:bg-lime-900/30 dark:border-lime-700 dark:text-lime-400',
            green: 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400',
            emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400',
            teal: 'bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-400',
            cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-400',
            sky: 'bg-sky-50 border-sky-200 text-sky-600 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-400',
            blue: 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400',
            indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400',
            violet: 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-400',
            purple: 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400',
            fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:border-fuchsia-700 dark:text-fuchsia-400',
            pink: 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-400',
            rose: 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400'
        };
        return map[colorName] || map['zinc'];
    };

    const safeAlert = (message) => { setDialogConfig({ isOpen: true, type: 'alert', message, onConfirm: null }); };
    const safeConfirm = (message, onConfirmAction) => { setDialogConfig({ isOpen: true, type: 'confirm', message, onConfirm: onConfirmAction }); };
    const closeDialog = () => { setDialogConfig({ ...dialogConfig, isOpen: false }); };
    const getActiveItem = (listName) => (work[listName] || []).find(i => i.id === activeId);

    // --- 파일 핸들러 ---
    const handleSelectFile = async (type) => {
        try {
            const result = await ipcRenderer.invoke('select-any-file');
            if (!result) return;
            const { filePath, fileName } = result;
            if (type === 'attachment') {
                setManualAttachments(prev => [...prev, { name: fileName, path: filePath }]);
            }
        } catch (error) {
            console.error("파일 선택 오류:", error);
            const filePath = await ipcRenderer.invoke('select-image');
            if (filePath) {
                const name = filePath.split(/[/\\]/).pop();
                if (type === 'attachment') setManualAttachments(prev => [...prev, { name, path: filePath }]);
            }
        }
    };

    const handleSelectImage = async (target, stepId = null) => {
        try {
            const filePath = await ipcRenderer.invoke('select-image');
            if (!filePath) return;
            
            const fs = window.require('fs');
            const path = window.require('path');
            const fileData = fs.readFileSync(filePath);
            const ext = path.extname(filePath).slice(1).toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const base64Url = `data:${mimeType};base64,${fileData.toString('base64')}`;

            if (target === 'step') setNewStepForm(prev => ({ ...prev, imagePath: base64Url }));
            else if (target === 'edit' && stepId) setEditStepData(prev => ({ ...prev, image: base64Url }));
        } catch (error) { console.error(error); }
    };

    const handleOpenFile = (path) => { ipcRenderer.send('open-local-file', path); };

    const handleAddFileToDetail = async () => {
        try {
            const result = await ipcRenderer.invoke('select-any-file');
            if (!result) return;
            const { filePath, fileName } = result;
            setWork(prev => {
                const newWork = { ...prev, manuals: prev.manuals.map(m => m.id === activeId ? { ...m, attachments: [...(m.attachments || []), { name: fileName, path: filePath }] } : m) };
                ipcRenderer.send('save-work', newWork);
                return newWork;
            });
        } catch (error) { console.error("파일 추가 실패:", error); }
    };

    const handleDeleteFileFromDetail = (e, fileIndex) => {
        e.stopPropagation();
        safeConfirm("이 첨부파일을 삭제하시겠습니까?", () => {
            setWork(prev => {
                const newWork = { ...prev, manuals: prev.manuals.map(m => m.id === activeId ? { ...m, attachments: m.attachments.filter((_, idx) => idx !== fileIndex) } : m) };
                ipcRenderer.send('save-work', newWork);
                return newWork;
            });
        });
    };

    const handleDropFile = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            const newAttachments = files.map(file => ({ name: file.name, path: file.path }));
            setManualAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const handleStepChange = (index, value) => {
        const newSteps = [...inputSteps];
        newSteps[index].text = value;
        setInputSteps(newSteps);
    };

    const addInputStep = () => { setInputSteps([...inputSteps, { text: '' }]); };
    const removeInputStep = (index) => {
        if (inputSteps.length === 1) return;
        const newSteps = inputSteps.filter((_, i) => i !== index);
        setInputSteps(newSteps);
    };

    // --- 데이터 조작 핸들러 ---
    const handleDeleteCategory = (e, catId, catLabel) => {
        e.stopPropagation();
        safeConfirm(`'${catLabel}' 카테고리를 삭제하시겠습니까?`, () => {
            setWork(prev => {
                let newWork = { ...prev };
                newWork.categories = prev.categories.filter(c => c.id !== catId);
                if (manualCategory === catId) setManualCategory('ALL');
                if (inputCategory === catId) setInputCategory('FIELD');
                ipcRenderer.send('save-work', newWork);
                return newWork;
            });
        });
    };

    const handleEditManual = (e, manual) => {
        e.stopPropagation();
        setEditingManualId(manual.id);
        setInputTitle(manual.title || '');
        setInputDesc(manual.desc || '');
        setManualAttachments(manual.attachments || []);
        setModalConfig({ isOpen: true, type: 'EDIT_BASIC_MANUAL', title: '매뉴얼 정보 수정' });
    };

    const handleEditCategory = (e, cat) => {
        e.stopPropagation();
        setEditingCategoryId(cat.id);
        setNewCatId(cat.id);
        setNewCatName(cat.label);
        setNewCatColor(cat.color);
        setModalConfig({ isOpen: true, type: 'EDIT_CATEGORY', title: '카테고리 수정' });
    };

    const handleEditFieldGuide = (e, guide) => {
        e.stopPropagation();
        setEditingManualId(guide.id);
        setInputTitle(guide.title);
        setInputDesc(guide.desc || '');
        setManualAttachments(guide.attachments || []);

        const modalTitle = guide.type === 'TROUBLE' ? '고장 조치 매뉴얼 수정' : '기기 조작법 수정';
        setModalConfig({ isOpen: true, type: 'EDIT_FIELD_GUIDE', title: modalTitle });
    };

    const handleDeleteFieldGuide = (e, id) => {
        e.stopPropagation();
        safeConfirm("이 가이드를 정말 삭제하시겠습니까?", () => {
            setEquipment(prev => ({ ...prev, fieldGuides: (prev.fieldGuides || []).filter(g => g.id !== id) }));
        });
    };

    const handleSaveData = () => {
        if (modalConfig.type === 'ADD_CATEGORY') {
            if (!newCatName.trim()) return;
            const finalId = newCatId.trim() ? newCatId.trim() : `CAT_${Date.now()}`;
            if (work.categories.some(c => c.id === finalId)) { safeAlert("이미 존재하는 카테고리 ID입니다."); return; }
            setWork(prev => ({ ...prev, categories: [...(prev.categories || []), { id: finalId, label: newCatName, color: newCatColor }] }));
            setNewCatName(''); setNewCatId(''); setNewCatColor('zinc');
        }
        else if (modalConfig.type === 'EDIT_CATEGORY') {
            if (!newCatName.trim()) return;
            setWork(prev => {
                const newWork = { ...prev, categories: prev.categories.map(c => c.id === editingCategoryId ? { ...c, label: newCatName, color: newCatColor } : c) };
                ipcRenderer.send('save-work', newWork);
                return newWork;
            });
            setEditingCategoryId(null);
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
        else if (modalConfig.type === 'ADD_EQUIPMENT') {
            if (!equipTitle.trim()) return;
            const newEquip = {
                id: Date.now(), title: equipTitle, desc: equipDesc,
                chapters: [], documents: [], logs: [],
                meta: { code: equipCode || 'EQ-000', maker: '제조사 미정', installDate: new Date().toISOString().split('T')[0], location: '현장' }
            };
            setEquipment(prev => ({ ...prev, list: [...(prev.list || []), newEquip] }));
            setEquipTitle(''); setEquipDesc(''); setEquipCode('');
        }
        else if (modalConfig.type === 'ADD_EQUIP_DOC') {
            if (!inputTitle.trim()) return;
            const newDoc = {
                id: Date.now(), title: inputTitle, type: 'PID',
                path: manualAttachments.length > 0 ? manualAttachments[0].path : null
            };
            setEquipment(prev => ({ ...prev, list: prev.list.map(e => e.id === activeEquipId ? { ...e, documents: [...(e.documents || []), newDoc] } : e) }));
        }
        else if (modalConfig.type === 'ADD_EQUIP_CHAPTER') {
            if (!inputTitle.trim()) return;
            setEquipment(prev => ({
                ...prev, list: prev.list.map(e => e.id === activeEquipId ? {
                    ...e, chapters: [...(e.chapters || []), { id: Date.now(), title: inputTitle, docId: null, isDone: false }]
                } : e)
            }));
        }
        else if (modalConfig.type === 'ADD_FIELD_GUIDE' || modalConfig.type === 'EDIT_FIELD_GUIDE') {
            if (!inputTitle.trim()) return;
            if (modalConfig.type === 'ADD_FIELD_GUIDE') {
                const newGuide = {
                    id: Date.now(),
                    type: modalConfig.title.includes('고장') ? 'TROUBLE' : 'OPERATION',
                    title: inputTitle,
                    desc: inputDesc,
                    attachments: manualAttachments,
                    steps: [],
                    tags: ['신규']
                };
                setEquipment(prev => ({ ...prev, fieldGuides: [...(prev.fieldGuides || []), newGuide] }));
            } else {
                setEquipment(prev => ({
                    ...prev,
                    fieldGuides: prev.fieldGuides.map(g => g.id === editingManualId ? {
                        ...g, title: inputTitle, desc: inputDesc, attachments: manualAttachments
                    } : g)
                }));
                setEditingManualId(null);
            }
        }
        else if (modalConfig.type === 'ADD_FIELD_STEP') {
            setEquipment(prev => ({
                ...prev,
                fieldGuides: prev.fieldGuides.map(g => g.id === activeFieldGuideId ? {
                    ...g,
                    steps: [...(g.steps || []), {
                        id: Date.now(),
                        title: newStepForm.title,
                        content: newStepForm.content,
                        image: newStepForm.imagePath
                    }]
                } : g)
            }));
            setNewStepForm({ imagePath: '', title: '', content: '' });
        }

        setModalConfig({ ...modalConfig, isOpen: false });
        setInputTitle(''); setInputDesc(''); setManualAttachments([]);
        setInputSteps([{ text: '' }]);
    };

    const handleSaveStepEdit = () => {
        if (!editStepData || !activeId) return;
        const targetManual = getActiveItem('manuals');
        const currentChapterId = activeChapterId || (targetManual.chapters.length > 0 ? targetManual.chapters[0].id : null);
        if (!currentChapterId) return;
        setWork(prev => ({ ...prev, manuals: prev.manuals.map(m => { if (m.id === activeId) { return { ...m, chapters: m.chapters.map(c => { if (c.id === currentChapterId) { return { ...c, steps: c.steps.map(s => s.id === editStepData.id ? editStepData : s) }; } return c; }) }; } return m; }) }));
        setEditStepData(null);
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
                ipcRenderer.send('save-work', newWork);
                return newWork;
            });
        });
    };

    const handleAddLog = () => {
        if (!logModal.content.trim()) return;
        const newLog = {
            id: Date.now(), date: new Date().toISOString().split('T')[0], content: logModal.content, type: 'USER'
        };
        setEquipment(prev => ({ ...prev, list: prev.list.map(e => e.id === activeEquipId ? { ...e, logs: [newLog, ...(e.logs || [])] } : e) }));
        setLogModal({ isOpen: false, content: '' });
    };

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

    // --- 렌더러 3: 기초 교육 상세 ---
    const renderAttachmentButton = (attachments) => {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="relative">
                <button onClick={() => setShowFileList(!showFileList)} className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors flex items-center gap-1.5 ${showFileList ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><FileText size={12} /> 첨부 양식 <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 rounded-full text-[9px] min-w-[16px] text-center">{attachments.length}</span></button>
                {showFileList && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFileList(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 p-2 animate-fade-in-up origin-top-right">
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

    // --- 렌더러 4: 설비 목록 화면 ---
    const renderEquipList = () => {
        const activeTab = equipTab === 'SYSTEM' ? 'SYSTEM' : 'FIELD';
        const equipList = equipment.list || [];
        const fieldGuides = equipment.fieldGuides || [];

        return (
            <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-fade-in relative overflow-hidden">
                <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3"><button onClick={() => setViewMode('HOME')} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 rounded text-zinc-500"><ChevronLeft size={20} /></button><h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">설비 마스터</h2></div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 py-4 flex flex-col gap-1">
                        <div className="px-3"><div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">현장 업무 (Field)</div><button onClick={() => setEquipTab('FIELD')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'FIELD' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>트러블 슈팅 / 기기 조작</button></div>
                        <div className="px-3 mt-4"><div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">설비 관리 (System)</div><button onClick={() => setEquipTab('SYSTEM')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'SYSTEM' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>전체 설비 계통도</button></div>
                    </div>
                    <div className="flex-1 bg-white dark:bg-zinc-900 overflow-y-auto p-8">
                        {activeTab === 'FIELD' && (
                            <div className="max-w-4xl mx-auto space-y-10">
                                {/* 현장 기기 조작법 */}
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-emerald-500"></div>현장 기기 조작법 (Operation)</h3><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '기기 조작법 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button></div>
                                    <div className="grid grid-cols-2 gap-3">{fieldGuides.filter(g => g.type === 'OPERATION').map(g => (<div key={g.id} onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }} className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5"><div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button><button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button></div></div>
                                    {/* 🟢 [수정됨] 설명 텍스트를 두 줄까지 표시 */}
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">{g.desc}</p>
                                    <div className="mt-2 flex gap-1"><span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">Standard</span>{g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}</div></div>))}</div>
                                </div>
                                {/* 고장 조치 매뉴얼 */}
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-rose-500"></div>고장 조치 매뉴얼 (Troubleshooting)</h3><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '고장 조치 매뉴얼 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button></div>
                                    <div className="grid grid-cols-2 gap-3">{fieldGuides.filter(g => g.type === 'TROUBLE').map(g => (<div key={g.id} onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }} className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5"><div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button><button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button></div></div>
                                    {/* 🟢 [수정됨] 설명 텍스트를 두 줄까지 표시 */}
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">{g.desc}</p>
                                    <div className="mt-2 flex gap-1"><span className="text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">긴급</span>{g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}</div></div>))}</div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'SYSTEM' && (
                            <div className="max-w-4xl mx-auto"><div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-indigo-500"></div>전체 설비 계통 목록</h3><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIPMENT', title: '설비 등록' })} className="text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"><Plus size={12} /> 설비 등록</button></div>{equipList.length === 0 ? (<div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50/50"><p className="text-sm text-zinc-500">등록된 설비가 없습니다.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{equipList.map(equip => (<div key={equip.id} onClick={() => { setActiveEquipId(equip.id); setActiveEquipChapterId(null); setViewMode('EQUIP_DETAIL'); }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group"><div className="flex justify-between items-start mb-2"><span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{equip.meta?.code || 'EQ-000'}</span></div><h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate mb-1 group-hover:text-amber-600 transition-colors">{equip.title}</h4><p className="text-xs text-zinc-500 line-clamp-2 h-8 leading-relaxed">{equip.desc}</p></div>))}</div>)}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- 렌더러 5: 현장 가이드 상세 (3단 구조) ---
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
                                            {/* 🟢 [수정됨] 단계 이름을 진하게, 내용을 연하게 표시 */}
                                            <div className={`text-xs font-bold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'} mb-0.5`}>{step.title || `Step ${idx + 1}`}</div>
                                            <div className={`text-[10px] leading-tight line-clamp-2 ${isActive ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>{step.content || "내용 없음"}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* 🟢 [추가됨] 단계 추가 버튼 (목록 하단) */}
                            <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_STEP', title: '작업 단계 추가' })} className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50/50 flex justify-center gap-2 mt-2 transition-all"><Plus size={14} /> 단계 추가</button>
                        </div>
                    </div>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex flex-col">
                        {activeStep && activeStep.image ? (<PanZoomViewer src={activeStep.image} alt="도면 확인" />) : (<div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2"><Image size={48} className="opacity-20" /><p className="text-sm">등록된 도면/사진이 없습니다.</p></div>)}
                        
                        {/* 🟢 [추가됨] 우측 슬라이드 패널 토글 버튼 (화면 우측 중앙) */}
                        <button 
                            onClick={() => setIsDetailPanelOpen(!isDetailPanelOpen)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-l-lg p-1 shadow-md z-30 hover:bg-zinc-50 transition-colors"
                            title={isDetailPanelOpen ? "상세 정보 닫기" : "상세 정보 열기"}
                        >
                            {isDetailPanelOpen ? <PanelRightClose size={16} className="text-zinc-500" /> : <PanelRightOpen size={16} className="text-zinc-500" />}
                        </button>
                    </div>

                    {/* 🟢 [수정됨] 우측 상세 패널 (슬라이드 방식) */}
                    <div className={`absolute top-0 right-0 h-full w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 transition-transform duration-300 ease-in-out shadow-xl ${isDetailPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isTrouble ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{activeStep ? `STEP ${steps.indexOf(activeStep) + 1}` : 'INFO'}</span>
                                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-tight mt-2 mb-2">{activeStep ? (activeStep.title || activeStep.text) : "단계를 선택하세요"}</h3>
                            </div>
                            <button onClick={() => setIsDetailPanelOpen(false)} className="p-1 hover:bg-zinc-100 rounded text-zinc-400"><X size={16}/></button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto">
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{activeStep ? (activeStep.content || activeStep.text) : "좌측 목록에서 작업 단계를 선택하여 상세 내용을 확인하십시오."}</p>
                            {isTrouble && (<div className="mt-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-3 flex gap-2"><AlertTriangle className="text-rose-500 flex-shrink-0" size={16} /><div><h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">안전 주의</h4><p className="text-[11px] text-rose-600/80 mt-1">반드시 전원 차단 여부를 확인 후 작업하십시오.</p></div></div>)}
                        </div>
                        
                        {/* 첨부파일 표시 영역 */}
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

    // --- 렌더러 6: 설비 상세 화면 (3 Column Layout + Logs) ---
    const renderEquipDetail = () => {
        const equip = (equipment.list || []).find(e => e.id === activeEquipId);
        if (!equip) return <div className="flex items-center justify-center h-full text-zinc-400">데이터 로드 실패</div>;

        const chapters = equip.chapters || [];
        const logs = equip.logs || [];
        const currentChapterId = activeEquipChapterId || (chapters.length > 0 ? chapters[0].id : null);
        const activeChapter = chapters.find(c => c.id === currentChapterId);
        const activeDoc = activeChapter ? (equip.documents || []).find(d => d.id === activeChapter.docId) : null;

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center px-4 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur z-20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsEquipTocOpen(!isEquipTocOpen)} className={`p-2 rounded-lg transition-colors ${isEquipTocOpen ? 'bg-zinc-200 dark:bg-zinc-700' : 'text-zinc-400'}`}><Menu size={18} /></button>
                        <div className="h-4 w-px bg-zinc-300 mx-1"></div>
                        <button onClick={() => setViewMode('EQUIP_LIST')} className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500"><ChevronLeft size={18} /></button>
                        <div className="flex flex-col ml-1"><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">EQUIPMENT</span><span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{equip.title}</span></div>
                    </div>
                    <div className="flex gap-2"><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIP_DOC', title: '문서 추가' })} className="px-3 py-1.5 border hover:bg-white text-xs font-bold rounded-lg flex gap-1"><Plus size={12} /> 문서 추가</button></div>
                </div>
                <div className="flex-1 flex overflow-hidden relative">
                    <div className={`flex-shrink-0 bg-zinc-50 dark:bg-zinc-950/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-10 transition-all duration-300 overflow-hidden ${isEquipTocOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}`}>
                        <div className="w-64 flex flex-col h-full">
                            <div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b">Documents</div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {chapters.map(c => {
                                    const isActive = c.id === currentChapterId;
                                    const linkedDoc = (equip.documents || []).find(d => d.id === c.docId);
                                    const style = linkedDoc ? getDocTypeStyle(linkedDoc.type) : getDocTypeStyle('default');
                                    const Icon = style.icon;
                                    return (
                                        <button key={c.id} onClick={() => setActiveEquipChapterId(c.id)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isActive ? 'bg-white shadow-sm border border-zinc-200' : 'hover:bg-zinc-200/50'}`}>
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} ${style.color}`}><Icon size={14} /></div>
                                            <div className="min-w-0"><div className={`text-[10px] font-bold uppercase ${style.color}`}>{style.label}</div><div className="text-xs font-bold truncate">{c.title}</div></div>
                                        </button>
                                    );
                                })}
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIP_CHAPTER', title: '섹션 추가' })} className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50/50 flex justify-center gap-2 mt-2"><Plus size={14} /> 새 섹션</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 flex flex-col overflow-hidden relative">
                        {activeDoc ? (<PanZoomViewer src={activeDoc.path} alt={activeChapter.title} />) : (<div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2"><Image size={40} className="opacity-30" /><p className="text-sm">선택된 문서가 없습니다.</p></div>)}
                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/60 backdrop-blur p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm pointer-events-none"><h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{activeChapter ? activeChapter.title : 'No Chapter Selected'}</h2></div>
                    </div>
                    <div className="w-80 flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20">
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex gap-2"><Wrench size={14} /> Spec Info</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs"><span className="text-zinc-500">Code</span><span className="font-bold bg-zinc-100 px-2 py-0.5 rounded">{equip.meta?.code}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-zinc-500">Maker</span><span className="font-bold">{equip.meta?.maker}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-zinc-500">Location</span><span className="font-bold">{equip.meta?.location}</span></div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center"><h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex gap-2"><History size={14} /> Maintenance Log</h3><button onClick={() => setLogModal({ isOpen: true, content: '' })} className="p-1 hover:bg-zinc-200 rounded"><Plus size={14} className="text-zinc-500" /></button></div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {logs.length === 0 ? <p className="text-xs text-zinc-400 text-center py-4">이력이 없습니다.</p> : logs.map(log => (
                                    <div key={log.id} className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                                        <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${log.type === 'AI' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                                        <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-bold text-zinc-400">{log.date}</span>{log.type === 'AI' && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded font-bold">AI Auto</span>}</div>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{log.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col p-5 bg-indigo-50/30 dark:bg-indigo-900/5">
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Bot size={14} /> AI Document Coach</h3>
                            <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl border border-indigo-100 dark:border-zinc-700 p-3 mb-3 overflow-y-auto shadow-sm"><p className="text-xs text-zinc-500 leading-relaxed">현재 보고 계신 <strong>{activeDoc?.title || '문서'}</strong>에 대해 궁금한 점이 있으신가요?</p></div>
                            <div className="relative">
                                <textarea value={equipAiQuery} onChange={(e) => setEquipAiQuery(e.target.value)} placeholder="질문을 입력하세요..." className="w-full h-24 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 rounded-xl p-3 text-xs resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
                                <button onClick={() => handleSendMessage(null, `[Context: ${equip.title} - ${activeDoc?.title}] ${equipAiQuery}`)} disabled={!equipAiQuery.trim()} className="absolute bottom-2 right-2 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50">분석 및 질문</button>
                            </div>
                        </div>
                    </div>
                </div>
                {logModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm mx-4 rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                            <h3 className="font-bold mb-4 text-zinc-800 dark:text-zinc-100">정비 이력 추가</h3>
                            <textarea
                                value={logModal.content}
                                onChange={e => setLogModal({ ...logModal, content: e.target.value })}
                                className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm resize-none mb-4 outline-none focus:ring-2 focus:ring-amber-500 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                                placeholder="내용을 입력하세요..."
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setLogModal({ isOpen: false, content: '' })} className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">취소</button>
                                <button onClick={handleAddLog} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">저장</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // --- 메인 렌더링 ---
    return (
        <div className="h-full relative">
            {viewMode === 'HOME' && renderHome()}
            {viewMode === 'BASIC_LIST' && renderBasicList()}
            {viewMode === 'BASIC_DETAIL' && renderBasicDetail()}
            {viewMode === 'EQUIP_LIST' && renderEquipList()}
            {viewMode === 'EQUIP_DETAIL' && renderEquipDetail()}
            {viewMode === 'FIELD_DETAIL' && renderFieldDetail()}

            {/* 통합 알림/확인 다이얼로그 */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => dialogConfig.type === 'alert' && closeDialog()}>
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xs mx-4 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center text-center animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${dialogConfig.type === 'confirm' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500'}`}>{dialogConfig.type === 'confirm' ? <AlertTriangle size={24} /> : <div className="text-2xl">💡</div>}</div>
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">{dialogConfig.type === 'confirm' ? '확인 필요' : '알림'}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed whitespace-pre-wrap">{dialogConfig.message}</p>
                        <div className="flex gap-2 w-full">
                            {dialogConfig.type === 'confirm' && (<button onClick={closeDialog} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>)}
                            <button onClick={() => { if (dialogConfig.onConfirm) dialogConfig.onConfirm(); closeDialog(); }} className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-colors ${dialogConfig.type === 'confirm' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}>{dialogConfig.type === 'confirm' ? '확인' : '닫기'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 통합 입력 모달 */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 transform scale-100 transition-all">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                            {modalConfig.type.includes('EDIT') ? <Edit3 size={18} className="text-amber-500" /> : <Plus size={18} className="text-indigo-500" />} {modalConfig.title}
                        </h3>
                        <div className="space-y-4">
                            {modalConfig.type === 'ADD_EQUIPMENT' && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설비명</label><input autoFocus value={equipTitle} onChange={e => setEquipTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 가스터빈 1호기" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설비 코드</label><input value={equipCode} onChange={e => setEquipCode(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: GT-01" /></div>
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설명</label><input value={equipDesc} onChange={e => setEquipDesc(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="설비에 대한 간략한 설명" /></div>
                                    </div>
                                </>
                            )}
                            {(modalConfig.type === 'ADD_CATEGORY' || modalConfig.type === 'EDIT_CATEGORY') && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">카테고리 ID</label><input value={newCatId} onChange={e => setNewCatId(e.target.value.toUpperCase())} readOnly={modalConfig.type === 'EDIT_CATEGORY'} className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400 ${modalConfig.type === 'EDIT_CATEGORY' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 cursor-not-allowed' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'}`} placeholder="예: IT_SUPPORT" /></div>
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">카테고리 명칭</label><input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="예: 💻 IT 지원" /></div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-3">색상 테마 선택</label>
                                        <div className="flex flex-wrap gap-2">{colorPalette.map(theme => (<button key={theme.id} onClick={() => setNewCatColor(theme.id)} className={`w-8 h-8 rounded-full transition-all shadow-sm ${theme.bg} ${newCatColor === theme.id ? 'ring-4 ring-offset-2 ring-zinc-200 dark:ring-zinc-700 scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-105'}`} title={theme.id} />))}</div>
                                    </div>
                                </>
                            )}
                            {(modalConfig.type === 'ADD_MANUAL_STEP' || modalConfig.type === 'ADD_FIELD_STEP') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">스텝 이미지</label>
                                        <div 
                                            onClick={() => handleSelectImage('step')}
                                            className="w-full h-24 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/10 transition-all group"
                                        >
                                            {newStepForm.imagePath ? (
                                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                                    <Image size={20} />
                                                    <span className="text-sm font-bold">이미지가 선택되었습니다</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 text-zinc-400 group-hover:text-indigo-500 transition-colors">
                                                        <Upload size={20} />
                                                    </div>
                                                    <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-500 transition-colors">클릭하여 이미지 업로드</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">스텝 제목</label><input value={newStepForm.title} onChange={e => setNewStepForm({ ...newStepForm, title: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="제목 입력" /></div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">상세 내용</label><textarea value={newStepForm.content} onChange={e => setNewStepForm({ ...newStepForm, content: e.target.value })} className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-zinc-400" placeholder="내용 입력..." /></div>
                                </>
                            )}
                            {(['ADD_BASIC_MANUAL', 'EDIT_BASIC_MANUAL', 'ADD_FIELD_GUIDE', 'EDIT_FIELD_GUIDE', 'ADD_EQUIP_DOC'].includes(modalConfig.type)) && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">제목</label><input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="제목 입력" /></div>

                                    {modalConfig.type !== 'ADD_EQUIP_DOC' && (
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설명</label><textarea value={inputDesc} onChange={e => setInputDesc(e.target.value)} className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400 resize-none" placeholder="설명 입력" /></div>
                                    )}

                                    {(modalConfig.type.includes('MANUAL') || modalConfig.type === 'ADD_EQUIP_DOC' || modalConfig.type.includes('FIELD_GUIDE')) && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">관련 서식/파일 첨부</label></div>
                                            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDropFile} onClick={() => handleSelectFile('attachment')} className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all mb-2 ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                                <div className={`p-2 rounded-full ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}><FileText size={20} /></div>
                                                <div className="text-center"><p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{isDragging ? "여기에 놓으세요!" : "클릭하여 파일 선택 또는 드래그"}</p><p className="text-[10px] text-zinc-400 mt-0.5">모든 형식의 파일 지원</p></div>
                                            </div>
                                            {manualAttachments.length > 0 && (
                                                <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 flex flex-col gap-1 max-h-[100px] overflow-y-auto scrollbar-hide">
                                                    {manualAttachments.map((file, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-lg text-sm group">
                                                            <div className="flex items-center gap-2 truncate flex-1"><FileText size={14} className="text-zinc-400 flex-shrink-0" /><span className="truncate text-zinc-700 dark:text-zinc-300 text-xs">{file.name}</span></div>
                                                            <button onClick={(e) => { e.stopPropagation(); setManualAttachments(prev => prev.filter((_, idx) => idx !== i)); }} className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-500 rounded transition-colors"><Trash2 size={12} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            {(modalConfig.type === 'ADD_BASIC_CHAPTER' || modalConfig.type === 'ADD_EQUIP_CHAPTER') && (
                                <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">제목</label><input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="제목 입력" /></div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>
                            <button onClick={handleSaveData} className={`flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-colors ${modalConfig.type.includes('EDIT') ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}>{modalConfig.type.includes('EDIT') ? '수정하기' : '등록하기'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 스텝 수정 모달 */}
            {editStepData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 transform scale-100 transition-all">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                            <Edit3 size={18} className="text-amber-500" /> 스텝 수정: {editStepData.title || 'Step'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">스텝 이미지</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-400 truncate flex items-center gap-2">
                                        <Image size={16} /> {editStepData.image ? '업로드됨' : "이미지 선택"}
                                    </div>
                                    <button onClick={() => setEditStepData(Object.assign({}, editStepData, { image: null }))} className="px-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors text-rose-600 dark:text-rose-400 font-bold">삭제</button>
                                    <button onClick={() => handleSelectImage('edit', editStepData.id)} className="px-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-indigo-600 dark:text-indigo-400 font-bold">변경</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">스텝 제목</label>
                                <input value={editStepData.title || ''} onChange={(e) => setEditStepData(Object.assign({}, editStepData, { title: e.target.value }))} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-zinc-400" placeholder="제목 입력" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">상세 내용</label>
                                <textarea value={editStepData.content || ''} onChange={(e) => setEditStepData(Object.assign({}, editStepData, { content: e.target.value }))} className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500 resize-none placeholder:text-zinc-400" placeholder="내용 입력..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setEditStepData(null)} className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>
                            <button onClick={handleSaveStepEdit} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors">수정하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkDetailView;