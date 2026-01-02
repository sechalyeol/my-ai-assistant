// Last Updated: 2026-01-03 01:53:17
import React, { useState, useRef, useEffect } from 'react';
import {
    Briefcase, BookOpen, Wrench, AlertTriangle, ChevronRight, Plus, Edit3, Trash2,
    ChevronLeft, FileText, Image, ArrowRight, Menu, History, Bot, Lock, Zap,
    AlertCircle, X, Download, Upload, PanelRightClose, PanelRightOpen, GripVertical,
    Check, Folder, Layers, LayoutGrid, FileCode, ChevronDown, Filter, Star, StarHalf, Search,
    Bold
} from 'lucide-react';
import PanZoomViewer from '../components/ui/PanZoomViewer';
import FieldMapContainer from '../components/work/FieldMap/FieldMapContainer';

const { ipcRenderer } = window.require('electron');

// 🌟 [수정됨] 텍스트 입력 도우미 함수 (토글 기능 지원: 적용/해제)
const insertTag = (elementId, setFunc, value, tagStart, tagEnd) => {
    const textarea = document.getElementById(elementId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 선택된 텍스트
    const selectedText = value.substring(start, end);
    // 커서 앞부분 전체 텍스트
    const before = value.substring(0, start);
    // 커서 뒷부분 전체 텍스트
    const after = value.substring(end);

    let newText = "";
    let newCursorStart = start;
    let newCursorEnd = end;

    // 🔄 토글 로직: 커서 바로 앞뒤에 태그가 이미 있는지 검사
    if (before.endsWith(tagStart) && after.startsWith(tagEnd)) {
        // [해제] 태그가 이미 있으면 제거 (예: **텍스트** -> 텍스트)
        newText = before.slice(0, -tagStart.length) + selectedText + after.slice(tagEnd.length);

        // 커서 위치 보정 (태그 길이만큼 앞으로 당김)
        newCursorStart = start - tagStart.length;
        newCursorEnd = end - tagStart.length;
    } else {
        // [적용] 태그가 없으면 추가 (예: 텍스트 -> **텍스트**)
        newText = before + tagStart + selectedText + tagEnd + after;

        // 커서 위치 보정 (태그 길이만큼 뒤로 밈)
        newCursorStart = start + tagStart.length;
        newCursorEnd = end + tagStart.length;
    }

    // State 업데이트
    setFunc(newText);

    // ✨ UX 개선: 입력 후 커서나 선택 영역이 풀리지 않도록 위치 복구
    // React 리렌더링 타이밍을 고려해 setTimeout 사용
    setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
            el.focus();
            el.setSelectionRange(newCursorStart, newCursorEnd);
        }
    }, 0);
};

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

    // 🧠 AI 퀴즈 전용 State
    const [quizData, setQuizData] = useState({
        status: 'IDLE', // IDLE, LOADING, QUESTION, RESULT
        question: '',
        userAnswer: '',
        feedback: '',
        context: ''
    });

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
    const [newGuideCategory, setNewGuideCategory] = useState('');
    const [newGuideImportance, setNewGuideImportance] = useState(3);
    const [isDirectCategory, setIsDirectCategory] = useState(false);
    const [originalCategoryName, setOriginalCategoryName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => {
        setSearchTerm('');
    }, [equipTab]);

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
    const [targetTags, setTargetTags] = useState([]); // 🌟 태그 목록 저장용
    const [tagInput, setTagInput] = useState('');
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

    const renderStars = (score) => {
        const stars = [];
        const fullStars = Math.floor(score);
        const hasHalfStar = score % 1 !== 0;

        for (let i = 0; i < fullStars; i++) {
            stars.push(<Star key={`full-${i}`} size={12} className="fill-amber-400 text-amber-400" />);
        }
        if (hasHalfStar) {
            stars.push(<StarHalf key="half" size={12} className="fill-amber-400 text-amber-400" />);
        }
        // 빈 별 채우기 (선택사항, 최대 5개)
        const emptyStars = 5 - Math.ceil(score);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<Star key={`empty-${i}`} size={12} className="text-zinc-300 dark:text-zinc-600" />);
        }
        return <div className="flex gap-0.5">{stars}</div>;
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

    // 🌟 [추가] 계통 입력 취소 핸들러 (기존 코드)
    const handleCancelSystemInput = () => {
        setIsDirectSystem(false);
        if (originalSystemName) {
            setEquipSystem(originalSystemName);
            setOriginalSystemName('');
        } else {
            setEquipSystem('');
        }
    };

    // 🌟 [추가] 카테고리 일괄 변경 로직 (소속 계통과 동일)
    const handleRenameCategory = () => {
        if (!newGuideCategory.trim()) { safeAlert("변경할 분류 이름을 입력해주세요."); return; }
        if (newGuideCategory === originalCategoryName) { setIsDirectCategory(false); setOriginalCategoryName(''); return; }

        safeConfirm(`'${originalCategoryName}' 분류를 '${newGuideCategory}'(으)로 변경하시겠습니까?\n해당 분류로 등록된 모든 가이드가 함께 수정됩니다.`, () => {
            setEquipment(prev => ({
                ...prev,
                fieldGuides: prev.fieldGuides.map(g => {
                    if (g.category === originalCategoryName) {
                        return { ...g, category: newGuideCategory };
                    }
                    return g;
                })
            }));
            setOriginalCategoryName('');
            setIsDirectCategory(false);
        });
    };

    const VariableDropdown = ({ value, options, onSelect, onDirectInput, placeholder, theme = 'indigo' }) => {
        const [isOpen, setIsOpen] = useState(false);

        // 테마별 색상 설정
        const activeColor = theme === 'emerald'
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400';

        const hoverColor = theme === 'emerald'
            ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
        const ringColor = theme === 'emerald' ? 'focus:ring-emerald-500' : 'focus:ring-indigo-500';

        return (
            <div className="relative w-full">
                {/* 트리거 버튼 (현재 선택된 값 표시) */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 border ${isOpen ? `border-${theme}-500 ring-1 ring-${theme}-500` : 'border-zinc-200 dark:border-zinc-700'} rounded-xl px-4 py-3 text-sm transition-all outline-none`}
                >
                    <span className={value ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-400"}>
                        {value || placeholder}
                    </span>
                    <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 드롭다운 메뉴 (열렸을 때만 표시) */}
                {isOpen && (
                    <>
                        {/* 외부 클릭 시 닫기 위한 투명 오버레이 */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>

                        <div className="absolute left-0 top-full mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-down max-h-64 overflow-y-auto">
                            <div className="p-1">
                                {/* 옵션 리스트 */}
                                {options.length === 0 && (
                                    <div className="px-3 py-3 text-xs text-zinc-400 text-center italic">등록된 분류가 없습니다.</div>
                                )}

                                {options.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => { onSelect(opt); setIsOpen(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${value === opt ? `${activeColor} font-bold` : `text-zinc-600 dark:text-zinc-300 ${hoverColor}`}`}
                                    >
                                        {opt}
                                        {value === opt && <Check size={14} />}
                                    </button>
                                ))}

                                <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>

                                {/* 직접 입력 버튼 */}
                                <button
                                    onClick={() => { onDirectInput(); setIsOpen(false); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${theme === 'emerald' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                >
                                    <Plus size={14} /> 새 분류 직접 입력
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // 🌟 [추가] 카테고리 입력 취소 핸들러
    const handleCancelCategoryInput = () => {
        setIsDirectCategory(false);
        if (originalCategoryName) {
            setNewGuideCategory(originalCategoryName); setOriginalCategoryName('');
        } else {
            setNewGuideCategory('');
        }
    };

    // 🌟 [수정됨] AI 퀴즈 시작 (이미지-스텝 매칭 강화 버전)
    // 🌟 [수정됨] AI 퀴즈 시작 (오답 논란 원천 차단 버전)
    const handleStartQuiz = async () => {
        // 1. 데이터 및 이미지 추출
        let contextText = "";
        let sourceTitle = "";
        let stepsWithImages = [];

        if (viewMode === 'FIELD_DETAIL' && activeFieldGuideId) {
            const guide = equipment.fieldGuides.find(g => g.id === activeFieldGuideId);
            if (guide) {
                sourceTitle = guide.title;
                const stepsText = guide.steps.map((s, idx) => `[Step ${idx + 1}] ${s.title}: ${s.content}`).join('\n');
                contextText = `제목: ${guide.title}\n설명: ${guide.desc}\n작업 절차:\n${stepsText}`;
                stepsWithImages = guide.steps.filter(s => s.image);
            }
        } else if (viewMode === 'BASIC_DETAIL' && activeId) {
            const manual = work.manuals.find(m => m.id === activeId);
            if (manual) {
                sourceTitle = manual.title;
                let stepCount = 1;
                const contentText = manual.chapters.map(c => {
                    return `Chapter: ${c.title}\n` + c.steps.map(s => {
                        const stepStr = `[Step ${stepCount}] ${s.title || ''}: ${s.content}`;
                        if (s.image) stepsWithImages.push({ ...s, stepNumber: stepCount });
                        stepCount++;
                        return stepStr;
                    }).join('\n');
                }).join('\n\n');
                contextText = `제목: ${manual.title}\n설명: ${manual.desc}\n내용:\n${contentText}`;
            }
        }

        if (!contextText) {
            safeAlert("퀴즈를 진행할 매뉴얼이나 가이드를 선택해주세요.");
            return;
        }

        setModalConfig({ isOpen: true, type: 'AI_QUIZ', title: `AI 직무 테스트: ${sourceTitle}` });
        setQuizData({ status: 'LOADING', question: '', options: [], userAnswer: null, answer: null, explanation: '', quizImage: null });

        // 2. 문제 유형 결정
        const hasImage = stepsWithImages.length > 0;
        const isVisualQuiz = hasImage && Math.random() > 0.6;

        let selectedImage = null;
        let targetStepInfo = null;

        if (isVisualQuiz) {
            const randomStep = stepsWithImages[Math.floor(Math.random() * stepsWithImages.length)];
            selectedImage = randomStep.image;
            targetStepInfo = `
**[첨부 이미지 정보 (절대 준수)]**
- 이 사진은 **"${randomStep.title}"** 단계의 작업 사진입니다.
- 사진 속 상황에 대한 설명: "${randomStep.content}"
- ⚠️ **주의**: 이 사진을 다른 단계와 혼동하지 마십시오. 오직 위 설명에 근거하여 사진 관련 문제를 내십시오.
            `;
        }

        // 3. 프롬프트 구성 (오답 규칙 대폭 강화)
        const prompt = `
당신은 산업 현장의 **정밀 직무 평가관**입니다.
작업자가 아래 제공된 [직무 자료]를 완벽하고 정확하게 숙지했는지 검증하기 위해, **사실에 입각한 4지선다형 문제**를 하나 출제하십시오.

**[출제 절대 원칙 - 위반 금지]**
1. **오답(Distractor) 작성 규칙 (가장 중요)**:
   - 🚫 **금지**: 매뉴얼에 있는 **다른 올바른 스텝(Step)의 내용을 그대로 가져와서 오답으로 쓰지 마십시오.** (예: 3단계 문제를 내면서 1단계 내용을 오답 보기에 넣지 말 것. 작업자가 "이것도 맞는 절차인데?"라고 혼동합니다.)
   - ✅ **필수**: 오답은 무조건 **내용을 비틀어서 명백한 거짓(False)**으로 만드십시오.
     - **반대말 사용**: Open ↔ Close, 시계방향 ↔ 반시계방향, On ↔ Off
     - **대상 변경**: 밸브(HV110) → 펌프(P101), 핸들 → 스위치
     - **수치 조작**: 80℃ → 100℃, 5분 → 30분
   
2. **문제 유형 및 명확성**:
   - 질문은 "가장 먼저 할 일은?", "올바른 조작법은?" 처럼 구체적이어야 합니다.
   - ${selectedImage ? `**이미지 문제**: 첨부된 사진이 보여주는 특정 단계에 대해서만 물어보십시오.` : `**절차 문제**: 특정 상황이나 단계에서 수행해야 할 정확한 행동을 물어보십시오.`}

3. **정답(Answer)**:
   - 자료에 있는 문장을 정확히 인용하여 정답으로 만드십시오.

**[출력 형식]**
반드시 아래 **순수 JSON 포맷**으로만 응답하십시오.

{
  "question": "문제 지문",
  "options": ["보기1 (조작된 거짓 내용)", "보기2 (조작된 거짓 내용)", "보기3 (정답)", "보기4 (조작된 거짓 내용)"],
  "answer": 2, 
  "explanation": "해설 (정답의 근거가 되는 스텝을 인용하고, 오답들이 왜 틀렸는지 설명)"
}

${targetStepInfo ? targetStepInfo : ""}

**[참고 직무 자료: ${sourceTitle}]**
${contextText.substring(0, 6000)}
        `;

        try {
            const resultText = await callGemini(prompt, selectedImage);
            const cleanedText = resultText.replace(/```json|```/g, '').trim();
            const quizJson = JSON.parse(cleanedText);

            setQuizData(prev => ({
                ...prev,
                status: 'QUESTION',
                question: quizJson.question,
                options: quizJson.options,
                answer: quizJson.answer,
                explanation: quizJson.explanation,
                userAnswer: null,
                quizImage: selectedImage
            }));

        } catch (e) {
            console.error("퀴즈 생성 실패:", e);
            safeAlert(`문제 생성 중 오류가 발생했습니다.\n(${e.message})`);
            setModalConfig({ ...modalConfig, isOpen: false });
        }
    };
    // 🌟 [수정됨] 답안 제출 (로컬 즉시 채점)
    const handleSubmitAnswer = () => {
        if (quizData.userAnswer === null) {
            safeAlert("정답을 선택해 주세요.");
            return;
        }

        // 로딩 없이 바로 결과 화면으로 전환
        setQuizData(prev => ({
            ...prev,
            status: 'RESULT'
        }));
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
                // 🌟 [수정] 타입 결정 로직 변경 (3가지 분류)
                let guideType = 'OPERATION'; // 기본값
                if (modalConfig.title.includes('고장')) {
                    guideType = 'TROUBLE';
                } else if (modalConfig.title.includes('절차')) {
                    guideType = 'PROCEDURE'; // ✨ 이 부분이 핵심입니다!
                }

                const newGuide = {
                    id: Date.now(),
                    type: guideType,
                    title: inputTitle,
                    desc: inputDesc,
                    targetEquip: targetTags,
                    category: newGuideCategory,
                    importance: Number(newGuideImportance),
                    attachments: manualAttachments,
                    steps: [],
                    logs: [],
                    tags: ['신규']
                };
                setEquipment(prev => ({ ...prev, fieldGuides: [...(prev.fieldGuides || []), newGuide] }));

                // 초기화
                setNewGuideCategory('');
                setNewGuideImportance(3);

            } else {
                // 🚨 여기가 문제였습니다! (수정 모드)
                // 기존 코드에서는 title, desc, attachments만 업데이트하고 있었습니다.

                setEquipment(prev => ({
                    ...prev,
                    fieldGuides: prev.fieldGuides.map(g => g.id === editingManualId ? {
                        ...g,
                        title: inputTitle,
                        desc: inputDesc,
                        targetEquip: targetTags,
                        attachments: manualAttachments,
                        // 🌟 [추가] 아래 두 줄을 꼭 추가해야 수정된 카테고리와 중요도가 반영됩니다!
                        category: newGuideCategory,
                        importance: Number(newGuideImportance)
                    } : g)
                }));
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
    // 🌟 [수정] 수정 모드 진입 시, 기존 카테고리와 중요도(별점) 데이터도 state에 채워넣어야 함
    const handleEditFieldGuide = (e, g) => {
        e.stopPropagation();
        setEditingManualId(g.id);
        setInputTitle(g.title);
        setInputDesc(g.desc);

        if (Array.isArray(g.targetEquip)) {
            setTargetTags(g.targetEquip);
        } else if (typeof g.targetEquip === 'string' && g.targetEquip.trim() !== '') {
            // 만약 예전 데이터가 "LCV-101, PCV-102" 처럼 문자열로 되어있다면 콤마로 잘라서 배열로 만듦
            setTargetTags(g.targetEquip.split(',').map(t => t.trim()));
        } else {
            setTargetTags([]);
        }

        setManualAttachments(g.attachments || []);

        // 🔹 여기 추가됨: 기존 값 불러오기
        setNewGuideCategory(g.category || '');
        setNewGuideImportance(g.importance || 3);

        setModalConfig({ isOpen: true, type: 'EDIT_FIELD_GUIDE', title: '가이드 수정' });
    };
    const handleDeleteFieldGuide = (e, id) => { e.stopPropagation(); safeConfirm("삭제하시겠습니까?", () => setEquipment(prev => ({ ...prev, fieldGuides: prev.fieldGuides.filter(g => g.id !== id) }))); };

    // 🌟 [신규] 현장 가이드 스텝 삭제 함수
    const handleDeleteFieldStep = (e, stepId) => {
        e.stopPropagation();

        safeConfirm("이 단계를 삭제하시겠습니까?", () => {
            setEquipment(prev => ({
                ...prev,
                fieldGuides: prev.fieldGuides.map(g =>
                    g.id === activeFieldGuideId
                        ? { ...g, steps: (g.steps || []).filter(s => s.id !== stepId) }
                        : g
                )
            }));

            // 만약 현재 보고 있던 스텝을 삭제했다면, 상세 패널을 닫거나 초기화
            if (currentStepId === stepId) {
                setCurrentStepId(null);
                setIsDetailPanelOpen(false);
            }
        });
    };

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

    // 🌟 [추가] 클릭 가능한 별점 입력 UI (0.5 단위 정밀 제어)
    const renderInteractiveStars = (currentScore, setScore) => {
        return (
            <div className="flex items-center gap-1 cursor-pointer" onMouseLeave={() => { }}>
                {[1, 2, 3, 4, 5].map((index) => {
                    const isFull = currentScore >= index;
                    const isHalf = currentScore === index - 0.5;

                    return (
                        <div
                            key={index}
                            className="relative w-5 h-5 group"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const isLeft = e.clientX - rect.left < rect.width / 2;
                                setScore(isLeft ? index - 0.5 : index);
                            }}
                        >
                            {/* 실제 보이는 별 아이콘 */}
                            <Star
                                size={20}
                                className={`transition-colors ${isFull ? 'fill-amber-400 text-amber-400' :
                                    isHalf ? 'fill-transparent text-amber-400' : // 반별 처리는 아래 아이콘으로 덮어씀
                                        'text-zinc-300 dark:text-zinc-600'
                                    }`}
                            />
                            {/* 반쪽 별 덮어쓰기 (Half 상태일 때만) */}
                            {isHalf && (
                                <StarHalf
                                    size={20}
                                    className="absolute top-0 left-0 fill-amber-400 text-amber-400 pointer-events-none"
                                />
                            )}
                        </div>
                    );
                })}
                <span className="ml-2 text-xs font-bold text-amber-500">{currentScore}점</span>
            </div>
        );
    };

    const renderEquipList = () => {
        // activeTab 변수 로직 수정 (MAP 추가)
        let activeTab = 'SYSTEM';
        if (equipTab === 'FIELD') activeTab = 'FIELD';
        else if (equipTab === 'MAP') activeTab = 'MAP';

        // 검색 필터링 함수
        const filterList = (list, fields) => {
            if (!searchTerm.trim()) return list;
            const term = searchTerm.toLowerCase();
            return list.filter(item => {
                return fields.some(field => {
                    const value = field.split('.').reduce((obj, key) => obj?.[key], item);
                    return String(value || '').toLowerCase().includes(term);
                });
            });
        };

        return (
            <div className="h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-fade-in relative overflow-hidden">
                {/* 상단 헤더 */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0 z-40">
                    <div className="flex items-center gap-3"><button onClick={() => setViewMode('HOME')} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 rounded text-zinc-500"><ChevronLeft size={20} /></button><h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">설비 마스터</h2></div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* 좌측 탭 메뉴 */}
                    <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 py-4 flex flex-col gap-1">
                        <div className="px-3"><div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">현장 업무 (Field)</div><button onClick={() => setEquipTab('FIELD')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'FIELD' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>트러블 슈팅 / 기기 조작</button></div>
                        <div className="px-3 mt-4"><div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">설비 관리 (System)</div><button onClick={() => setEquipTab('SYSTEM')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'SYSTEM' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>전체 설비 계통도</button><button onClick={() => setEquipTab('MAP')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors mt-1 flex items-center gap-2 ${activeTab === 'MAP' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                            {/* 아이콘 예시 (MapPin 등) 사용 가능 */}
                            <span>밸브 위치도</span>
                            {activeTab === 'MAP' && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full ml-auto"></div>}
                        </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-zinc-900 overflow-y-auto relative scroll-smooth">
                        {activeTab === 'SYSTEM' && (() => {
                            // System 탭 로직 (검색 -> 그룹화)
                            const filteredEquip = filterList(equipment.list || [], ['title', 'meta.code', 'meta.system']);

                            const groupedEquip = filteredEquip.reduce((acc, equip) => {
                                const sys = equip.meta?.system || '기타/공통 계통';
                                if (!acc[sys]) acc[sys] = [];
                                acc[sys].push(equip);
                                return acc;
                            }, {});

                            const allSystems = Object.keys(groupedEquip).sort();
                            const displayedSystems = systemFilter === 'ALL' ? allSystems : (allSystems.includes(systemFilter) ? [systemFilter] : []);

                            return (
                                <div className="max-w-5xl mx-auto pb-20">
                                    <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 px-8 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 whitespace-nowrap hidden md:flex">
                                                <div className="w-1 h-4 bg-indigo-500"></div>전체 설비 계통 목록
                                            </h3>

                                            {/* 🌟 [수정됨] System 탭 검색창: 너비(max-w-xs)와 높이(py-1.5) 축소 */}
                                            <div className="relative flex-1 max-w-xs group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                                <input
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="설비명, 코드, 계통 검색..."
                                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl pl-9 pr-4 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none"
                                                />
                                            </div>

                                            {/* 드롭다운 필터 */}
                                            <div className="relative flex-shrink-0">
                                                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 rounded-lg py-1.5 px-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm active:scale-95">
                                                    <Filter size={12} className="text-indigo-500" />
                                                    <span>{systemFilter === 'ALL' ? '전체 보기' : systemFilter}</span>
                                                    <ChevronDown size={12} className={`text-zinc-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isFilterOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsFilterOpen(false)}></div>
                                                        <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-down origin-top-left">
                                                            <div className="max-h-64 overflow-y-auto p-1 scrollbar-hide">
                                                                <button onClick={() => { setSystemFilter('ALL'); setIsFilterOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${systemFilter === 'ALL' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}><span>전체 보기</span>{systemFilter === 'ALL' && <Check size={12} />}</button>
                                                                <div className="h-px bg-zinc-100 dark:bg-zinc-700/50 my-1"></div>
                                                                {allSystems.map(sys => (
                                                                    <button key={sys} onClick={() => { setSystemFilter(sys); setIsFilterOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${systemFilter === sys ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}><span>{sys}</span>{systemFilter === sys && <Check size={12} />}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIPMENT', title: '설비 등록' })} className="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 flex-shrink-0"><Plus size={14} /> 설비 등록</button>
                                    </div>

                                    <div className="px-8 pt-6">
                                        {allSystems.length === 0 ? (
                                            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50/50">
                                                <Search size={32} className="text-zinc-300 mb-2" />
                                                <p className="text-sm text-zinc-500 font-medium">검색 결과가 없습니다.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                {displayedSystems.map(sys => (
                                                    <div key={sys} className="relative scroll-mt-[60px] pb-12">
                                                        <div className="sticky top-[60px] z-20 bg-white dark:bg-zinc-900 py-2 mb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
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
                            );
                        })()}

                        {/* 🌟 [추가됨] 3. VALVE MAP 탭 내용 */}
                        {activeTab === 'MAP' && (
                            <div className="h-full w-full bg-zinc-50 dark:bg-zinc-900 p-4">
                                {/* FieldMapContainer 호출 - workData로 전체 equipment 데이터를 넘겨줌 (나중에 내부 필드맵 데이터 사용) */}
                                <FieldMapContainer workData={equipment} />
                            </div>
                        )}

                        {activeTab === 'FIELD' && (() => {
                            // Field 탭 로직 (검색 -> 필터링)
                            const filteredGuides = filterList(equipment.fieldGuides || [], ['title', 'desc', 'category']);

                            return (
                                <div className="max-w-4xl mx-auto space-y-10 px-8 pb-10 pt-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        {/* 🌟 [수정됨] Field 탭 검색창: 너비(max-w-sm)와 높이(py-2) 축소, 글자 크기(text-xs) 줄임 */}
                                        <div className="relative w-full max-w-sm group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
                                            <input
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="가이드 제목, 설명, 분류 검색..."
                                                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* 1. 현장 기기 조작법 (Operation) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                                                <div className="w-1 h-4 bg-emerald-500"></div>현장 기기 조작법 (Operation)
                                            </h3>
                                            <button onClick={() => { setNewGuideCategory(''); setNewGuideImportance(3); setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '기기 조작법 등록' }); }} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50">
                                                <Plus size={12} /> 등록
                                            </button>
                                        </div>

                                        {(() => {
                                            const guides = filteredGuides.filter(g => g.type === 'OPERATION');

                                            // 카테고리 없으면 건너뛰는 로직 유지
                                            const grouped = guides.reduce((acc, g) => {
                                                if (!g.category) return acc;
                                                const cat = g.category;
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(g);
                                                return acc;
                                            }, {});

                                            const categories = Object.keys(grouped).sort();

                                            return (
                                                <div className="space-y-8">
                                                    {categories.length === 0 && <p className="text-center text-zinc-400 text-xs py-4">표시할 데이터가 없습니다.</p>}
                                                    {categories.map(cat => (
                                                        <div key={cat}>
                                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                                <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{cat}</h4>
                                                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 rounded">{grouped[cat].length}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {grouped[cat].map(g => (
                                                                    <div
                                                                        key={g.id}
                                                                        onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }}
                                                                        className="group p-3.5 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:shadow-md hover:border-emerald-500 cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5 relative overflow-hidden flex flex-col h-full"
                                                                    >
                                                                        {/* 1. 상단: 제목 & 별점 (이 부분이 빠지면 안 됩니다!) */}
                                                                        <div className="flex justify-between items-start mb-1.5">
                                                                            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 pr-6">{g.title}</h4>
                                                                            <div className="absolute top-3.5 right-3.5">{renderStars(g.importance || 0)}</div>
                                                                        </div>

                                                                        {/* 2. 중단: 대상 기기 태그 리스트 (이 부분도 유지해야 합니다!) */}
                                                                        <div className="min-h-[32px] mb-2">
                                                                            {(g.targetEquip && g.targetEquip.length > 0) && (
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    <span className="text-[10px] font-bold text-zinc-400 ml-0.5">대상 기기</span>
                                                                                    <div className="flex flex-wrap gap-1.5">
                                                                                        {(Array.isArray(g.targetEquip) ? g.targetEquip : [g.targetEquip]).map((tag, idx) => (
                                                                                            <span
                                                                                                key={idx}
                                                                                                className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300"
                                                                                            >
                                                                                                {tag}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {/* 설명만 있고 대상기기가 없을 때의 처리가 필요하다면 여기에 추가 */}
                                                                        </div>

                                                                        {/* 3. 하단: 뱃지 & 버튼 (mt-auto로 바닥 고정) */}
                                                                        <div className="mt-auto flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
                                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">Standard</span>
                                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button>
                                                                                <button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* 🌟 [신규] 2. 운전 조작 절차서 (Procedure) */}
                                    <div className="mt-12">
                                        <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                                                <div className="w-1 h-4 bg-blue-500"></div>운전 조작 절차서
                                            </h3>
                                            {/* 등록 버튼: 타이틀에 '절차'가 들어가야 위에서 만든 로직이 작동함 */}
                                            <button onClick={() => { setNewGuideCategory(''); setNewGuideImportance(3); setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '운전 절차서 등록' }); }} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50">
                                                <Plus size={12} /> 등록
                                            </button>
                                        </div>

                                        {(() => {
                                            // 🌟 PROCEDURE 타입만 필터링
                                            const procedures = filteredGuides.filter(g => g.type === 'PROCEDURE');

                                            if (procedures.length === 0) {
                                                return <p className="text-center text-zinc-400 text-xs py-4">등록된 절차서가 없습니다.</p>;
                                            }

                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {procedures.map(g => (
                                                        <div
                                                            key={g.id}
                                                            onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }}
                                                            className="group p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:shadow-md hover:border-blue-500 cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5 relative overflow-hidden flex flex-col h-full"
                                                        >
                                                            {/* 상단: 제목 & 중요도 */}
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 pr-6">{g.title}</h4>
                                                                <div className="absolute top-4 right-4">{renderStars(g.importance || 0)}</div>
                                                            </div>

                                                            {/* 중단: 설명 (절차서는 보통 대상 기기가 광범위하므로 설명을 보여주는 게 나을 수 있음) */}
                                                            <div className="min-h-[32px] mb-3">
                                                                {/* 절차서에도 태그를 쓴다면 태그 표시, 아니면 설명 표시 */}
                                                                {(g.targetEquip && g.targetEquip.length > 0) ? (
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {(Array.isArray(g.targetEquip) ? g.targetEquip : [g.targetEquip]).map((tag, idx) => (
                                                                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                                                                                {tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                                        {g.desc || "상세 절차 내용 참조"}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* 하단: 뱃지 & 버튼 */}
                                                            <div className="mt-auto flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
                                                                {/* 파란색 뱃지 사용 */}
                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Process</span>

                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button>
                                                                    <button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* 2. 고장 조치 매뉴얼 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-rose-500"></div>고장 조치 매뉴얼 (Troubleshooting)</h3><button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '고장 조치 매뉴얼 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {filteredGuides.filter(g => g.type === 'TROUBLE').length === 0 ? <p className="col-span-2 text-center text-zinc-400 text-xs py-4">표시할 데이터가 없습니다.</p> :
                                                filteredGuides.filter(g => g.type === 'TROUBLE').map(g => (
                                                    <div key={g.id} onClick={() => { setActiveFieldGuideId(g.id); setCurrentStepId(null); setIsDetailPanelOpen(false); setViewMode('FIELD_DETAIL'); }} className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5">
                                                        <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button><button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button></div></div>
                                                        {/* 🌟 [변경] 설명 대신 대상 기기 태그 리스트 표시 */}
                                                        <div className="min-h-[32px] mb-2 flex flex-wrap items-center gap-1.5">
                                                            {(g.targetEquip && g.targetEquip.length > 0) ? (
                                                                Array.isArray(g.targetEquip) ? (
                                                                    // 배열인 경우 (태그가 여러 개) -> 하나씩 뱃지로 만듦
                                                                    g.targetEquip.map((tag, idx) => (
                                                                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                                                            {tag}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    // 혹시 옛날 데이터(문자열)일 경우를 대비한 방어 코드
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                                                        {g.targetEquip}
                                                                    </span>
                                                                )
                                                            ) : (
                                                                // 대상 기기가 없으면 기존처럼 설명을 보여줌
                                                                <p className="text-xs text-zinc-400 truncate w-full">{g.desc || "설명 없음"}</p>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex gap-1"><span className="text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">긴급</span>{g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}</div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        );
    };

    const renderFieldDetail = () => {
        const guide = (equipment.fieldGuides || []).find(g => g.id === activeFieldGuideId);
        if (!guide) return <div className="p-8 text-zinc-400">데이터를 찾을 수 없습니다.</div>;

        const steps = guide.steps || [];

        // 🌟 [변경] 초기값이거나 id 매칭이 안되면 null (개요 모드)
        // 기존에는 steps[0]을 강제로 보여줬지만, 이제는 '개요'를 보여주기 위해 null 허용
        const activeStep = steps.find(s => s.id === currentStepId);
        const isOverview = !activeStep; // 스텝이 선택되지 않았으면 '개요 모드'

        // 타입 확인
        const isTrouble = guide.type === 'TROUBLE';
        const isProcedure = guide.type === 'PROCEDURE';

        // 헤더 스타일 결정
        let headerStyle = 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30';
        let labelColor = 'text-emerald-500';
        let labelText = 'OPERATION GUIDE';

        if (isTrouble) {
            headerStyle = 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30';
            labelColor = 'text-rose-500';
            labelText = 'TROUBLESHOOTING';
        } else if (isProcedure) {
            headerStyle = 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30';
            labelColor = 'text-blue-500';
            labelText = 'STANDARD OPERATING PROCEDURE';
        }

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative">

                {/* 1. 상단 헤더 */}
                <div className={`h-14 border-b flex justify-between items-center px-4 flex-shrink-0 z-20 ${headerStyle}`}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('EQUIP_LIST')} className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-500"><ChevronLeft size={20} /></button>
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColor}`}>{labelText}</span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{guide.title}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleStartQuiz}
                            className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1"
                        >
                            <Bot size={12} /> AI 퀴즈
                        </button>
                        <button onClick={(e) => handleEditFieldGuide(e, guide)} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-50 flex items-center gap-1"><Edit3 size={12} /> 정보 수정</button></div>
                </div>

                <div className="flex-1 flex overflow-hidden relative">

                    {/* 2. 좌측 목록 사이드바 */}
                    <div className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col">
                        <div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Process Steps</div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-3">

                            {/* 🌟 [추가] 가이드 개요 (Description) 버튼 */}
                            <div
                                onClick={() => setCurrentStepId(null)}
                                className={`cursor-pointer w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${isOverview ? 'bg-white dark:bg-zinc-800 shadow-sm border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border-transparent'}`}
                            >
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isOverview ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                                    <FileText size={12} />
                                </div>
                                <div className="flex-1">
                                    <div className={`text-xs font-bold ${isOverview ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400'}`}>가이드 개요</div>
                                    <div className="text-[10px] text-zinc-400">Description & Info</div>
                                </div>
                            </div>

                            {/* 구분선 */}
                            <div className="h-px bg-zinc-200 dark:bg-zinc-700 mx-2"></div>

                            {/* 스텝 목록 */}
                            {steps.length === 0 && <div className="text-xs text-zinc-400 text-center py-4">등록된 단계가 없습니다.</div>}

                            {steps.map((step, idx) => {
                                const isActive = activeStep && activeStep.id === step.id;

                                // 🟥 Type 1: 고장 조치 (Trouble)
                                if (isTrouble) {
                                    return (
                                        <div
                                            key={step.id || idx}
                                            onClick={() => { setCurrentStepId(step.id); setIsDetailPanelOpen(true); }}
                                            className={`group cursor-pointer rounded-xl border transition-all overflow-hidden relative ${isActive ? 'bg-white dark:bg-zinc-800 border-rose-500 shadow-md ring-1 ring-rose-500' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-rose-300'}`}
                                        >
                                            <div className={`px-3 py-2 text-xs font-bold flex items-center justify-between ${isActive ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'}`}>
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <AlertTriangle size={12} className={isActive ? "text-rose-500" : "text-zinc-400"} />
                                                    <span className="truncate">원인 {idx + 1}: {step.title}</span>
                                                </div>
                                                {/* 🌟 [수정/삭제 버튼 그룹] */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditStepData(step); }}
                                                        className="p-1 hover:bg-white/50 rounded text-zinc-400 hover:text-indigo-500 transition-colors"
                                                        title="수정"
                                                    >
                                                        <Edit3 size={11} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteFieldStep(e, step.id)}
                                                        className="p-1 hover:bg-white/50 rounded text-zinc-400 hover:text-rose-600 transition-colors"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <div className="flex items-start gap-2">
                                                    <Wrench size={14} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                                                    <p className={`text-xs leading-relaxed line-clamp-2 ${isActive ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                        {removeFormatting(step.content) || "조치 내용을 확인하세요."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // 🟦 Type 2: 운전 절차서 (Procedure)
                                if (isProcedure) {
                                    return (
                                        <div key={step.id || idx} className="relative pl-2 group">
                                            {idx !== steps.length - 1 && (
                                                <div className="absolute left-[19px] top-8 bottom-[-12px] w-0.5 bg-zinc-200 dark:bg-zinc-800"></div>
                                            )}
                                            <div
                                                onClick={() => { setCurrentStepId(step.id); setIsDetailPanelOpen(true); }}
                                                className={`relative z-10 flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent'}`}
                                            >
                                                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 'border-zinc-300 dark:border-zinc-600 text-transparent'}`}>
                                                    <Check size={14} strokeWidth={3} />
                                                </div>

                                                <div className="min-w-0 pt-0.5 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`text-xs font-bold mb-1 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300'}`}>{step.title}</h4>
                                                        {/* 🌟 [수정/삭제 버튼 그룹] */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditStepData(step); }}
                                                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-zinc-400 hover:text-indigo-500 transition-colors"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteFieldStep(e, step.id)}
                                                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-zinc-400 hover:text-rose-500 transition-colors"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                                        {removeFormatting(step.content) || "절차 상세 확인"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // 🟩 Type 3: 일반 조작 (Operation)
                                return (
                                    <div key={step.id || idx} onClick={() => { setCurrentStepId(step.id); setIsDetailPanelOpen(true); }} className={`group w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'}`}>
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${isActive ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>{idx + 1}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-xs font-bold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'} mb-0.5`}>{step.title || `Step ${idx + 1}`}</div>
                                            <div className={`text-[10px] leading-tight line-clamp-2 ${isActive ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                {removeFormatting(step.content) || "내용 없음"}
                                            </div>
                                        </div>

                                        {/* 🌟 [수정/삭제 버튼 그룹] */}
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setEditStepData(step); }} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500 transition-colors"><Edit3 size={12} /></button>
                                            <button onClick={(e) => handleDeleteFieldStep(e, step.id)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                );
                            })}

                            <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_STEP', title: '항목 추가' })} className={`w-full py-3 border border-dashed rounded-xl text-xs font-bold flex justify-center gap-2 mt-2 transition-all ${isTrouble ? 'border-rose-300 text-rose-400 hover:bg-rose-50' : isProcedure ? 'border-blue-300 text-blue-400 hover:bg-blue-50' : 'border-emerald-300 text-emerald-400 hover:bg-emerald-50'}`}>
                                <Plus size={14} /> {isTrouble ? '원인 및 조치 추가' : isProcedure ? '절차 단계 추가' : '작업 단계 추가'}
                            </button>
                        </div>
                    </div>

                    {/* 3. 중앙 패널 (개요 모드 vs 스텝 모드) */}
                    {/* 3. 중앙 패널 */}
                    <div className={`flex-1 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${isDetailPanelOpen ? 'mr-80' : ''}`}>

                        <div className="w-full h-full flex flex-col items-center justify-center">
                            {isOverview ? (
                                // [개요 모드]
                                <div className="text-center p-8 animate-fade-in">
                                    <div className="w-24 h-24 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-lg mb-6 mx-auto">
                                        {isTrouble ? <AlertTriangle size={48} className="text-rose-500" /> : <BookOpen size={48} className={isProcedure ? "text-blue-500" : "text-emerald-500"} />}
                                    </div>
                                    <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">{guide.title}</h2>
                                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">우측 패널에서 상세 설명과 첨부파일을 확인하세요.</p>
                                </div>
                            ) : (
                                // [스텝 모드]
                                activeStep && activeStep.image ? (
                                    // 🌟 여기서 initialScale을 조건부로 전달합니다!
                                    // 패널이 열려있으면 0.7 (70%), 닫혀있으면 1 (100%)
                                    <PanZoomViewer
                                        src={activeStep.image}
                                        alt="도면 확인"
                                        initialScale={isDetailPanelOpen ? 0.7 : 1}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                                        <Image size={48} className="opacity-20" />
                                        <p className="text-sm">등록된 도면/사진이 없습니다.</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* 패널 열기/닫기 토글 버튼 */}
                        <button
                            onClick={() => setIsDetailPanelOpen(!isDetailPanelOpen)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-l-lg p-1 shadow-md z-30 hover:bg-zinc-50 transition-colors"
                            title={isDetailPanelOpen ? "상세 정보 닫기" : "상세 정보 열기"}
                        >
                            {isDetailPanelOpen ? <PanelRightClose size={16} className="text-zinc-500" /> : <PanelRightOpen size={16} className="text-zinc-500" />}
                        </button>
                    </div>

                    {/* 4. 우측 상세 패널 (조건부 렌더링) */}
                    <div className={`absolute top-0 right-0 h-full w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 transition-transform duration-300 ease-in-out shadow-xl ${isDetailPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                        {/* 우측 패널 헤더 */}
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
                            <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isOverview ? 'bg-indigo-100 text-indigo-600' : isTrouble ? 'bg-rose-100 text-rose-600' : isProcedure ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {isOverview ? 'GUIDE OVERVIEW' : `STEP ${steps.indexOf(activeStep) + 1}`}
                                </span>
                                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-tight mt-2 mb-2">
                                    {isOverview ? guide.title : (activeStep?.title || "단계 상세")}
                                </h3>
                            </div>
                            <button onClick={() => setIsDetailPanelOpen(false)} className="p-1 hover:bg-zinc-100 rounded text-zinc-400"><X size={16} /></button>
                        </div>

                        <div className="flex-1 p-5 overflow-y-auto">

                            {/* 🌟 [핵심] 개요 모드일 때만 Description과 Attachments 표시 */}
                            {isOverview && (
                                <>
                                    {/* 대상 기기 태그 (항상 표시) */}
                                    {(guide.targetEquip && guide.targetEquip.length > 0) && (
                                        <div className="mb-6 animate-fade-in">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider">대상 기기</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(guide.targetEquip) ? (
                                                    guide.targetEquip.map((tag, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{tag}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{guide.targetEquip}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 전체 설명 (Description) */}
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-6 animate-fade-in">
                                        <h4 className="text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-1"><FileText size={10} /> Description</h4>

                                        {/* 👇 여기를 수정하세요: guide.desc를 formatText로 감싸기 */}
                                        <div className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                            {formatText(guide.desc || "등록된 설명이 없습니다.")}
                                        </div>
                                    </div>

                                    {/* 첨부 파일 목록 */}
                                    {guide.attachments && guide.attachments.length > 0 && (
                                        <div className="mb-6 animate-fade-in">
                                            <h4 className="text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Folder size={10} /> Attachments</h4>
                                            <div className="space-y-2">
                                                {guide.attachments.map((file, i) => (
                                                    <div key={i} onClick={() => handleOpenFile(file.path)} className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors group">
                                                        <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg group-hover:bg-indigo-100"><FileText size={16} /></div>
                                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex-1 truncate">{file.name}</span>
                                                        <Download size={14} className="text-zinc-300 group-hover:text-indigo-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* 🌟 2. 스텝 상세 내용 (Step Detail) 부분 수정 */}
                            {!isOverview && (
                                <div className="animate-fade-in-up">
                                    <h4 className="text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Step Detail</h4>

                                    {/* 👇 여기를 수정하세요: activeStep.content를 formatText로 감싸기 */}
                                    <div className="text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed">
                                        {formatText(activeStep.content || activeStep.text || "상세 내용이 없습니다.")}
                                    </div>
                                </div>
                            )}

                            {/* 안전 주의는 항상 표시하거나, 필요하면 조건부로 */}
                            {isTrouble && (
                                <div className="mt-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-3 flex gap-2">
                                    <AlertTriangle className="text-rose-500 flex-shrink-0" size={16} />
                                    <div>
                                        <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">안전 주의</h4>
                                        <p className="text-[11px] text-rose-600/80 mt-1">반드시 전원 차단 여부를 확인 후 작업하십시오.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 하단 버튼 (스텝 이동 / 개요 확인) */}
                        {/* 🌟 [수정됨] 다크 모드 배경색(dark:bg-zinc-900) 추가 */}
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
                            {isOverview ? (
                                <button
                                    onClick={() => {
                                        if (steps.length > 0) setCurrentStepId(steps[0].id);
                                        else safeAlert("등록된 단계가 없습니다.");
                                    }}
                                    className="w-full py-3 rounded-xl text-sm font-bold shadow-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-transform active:scale-95"
                                >
                                    첫 번째 단계 시작하기
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        const currentIndex = steps.findIndex(s => s.id === currentStepId);
                                        if (currentIndex !== -1 && currentIndex < steps.length - 1) {
                                            setCurrentStepId(steps[currentIndex + 1].id);
                                        } else {
                                            setIsDetailPanelOpen(false); // 마지막 단계면 닫기
                                        }
                                    }}
                                    className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm text-white transition-transform active:scale-95 ${isTrouble ? 'bg-rose-600 hover:bg-rose-500' : isProcedure ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                >
                                    {steps.findIndex(s => s.id === currentStepId) === steps.length - 1 ? '작업 완료 (패널 닫기)' : '확인 및 다음 단계'}
                                </button>
                            )}
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

            {/* 1. 일반 등록/수정 모달 (AI 퀴즈가 아닐 때만 표시) */}
            {modalConfig.isOpen && modalConfig.type !== 'AI_QUIZ' && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
                    <div className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl w-full mx-4 rounded-3xl shadow-2xl border border-white/20 dark:border-zinc-800/50 p-8 transform scale-100 transition-all ring-1 ring-black/5 max-h-[85vh] overflow-y-auto scrollbar-hide ${(modalConfig.type === 'ADD_FIELD_GUIDE' || modalConfig.type === 'EDIT_FIELD_GUIDE') ? 'max-w-4xl' : 'max-w-lg'}`}>

                        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-500"><Plus size={20} /></div>
                            {modalConfig.title}
                        </h3>

                        <div className="space-y-5">
                            {/* 설비 등록/수정 */}
                            {(modalConfig.type === 'ADD_EQUIPMENT' || modalConfig.type === 'EDIT_EQUIPMENT') && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설비명</label>
                                        <input autoFocus value={equipTitle} onChange={e => setEquipTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 가스터빈 1호기" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설비 코드</label><input value={equipCode} onChange={e => setEquipCode(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: GT-01" /></div>
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">제조사</label><input value={equipMaker} onChange={e => setEquipMaker(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: Siemens" /></div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">소속 계통</label>
                                        {!isDirectSystem ? (
                                            <div className="flex gap-2">
                                                <div className="flex-1"><VariableDropdown value={equipSystem} options={Array.from(new Set((equipment.list || []).map(e => e.meta?.system).filter(Boolean))).sort()} placeholder="계통 선택" theme="indigo" onSelect={(val) => setEquipSystem(val)} onDirectInput={() => { setIsDirectSystem(true); setEquipSystem(''); setOriginalSystemName(''); }} /></div>
                                                <button onClick={() => { if (equipSystem) { setOriginalSystemName(equipSystem); setIsDirectSystem(true); } }} disabled={!equipSystem} className={`px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${!equipSystem ? 'opacity-50 cursor-not-allowed' : ''}`}><Edit3 size={18} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input autoFocus value={equipSystem} onChange={e => setEquipSystem(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder={originalSystemName ? "변경할 계통명 입력" : "새 계통 명칭 입력"} />
                                                {originalSystemName && <button onClick={handleRenameSystem} className="px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg transition-colors whitespace-nowrap">변경</button>}
                                                <button onClick={handleCancelSystemInput} className="px-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors whitespace-nowrap">취소</button>
                                            </div>
                                        )}
                                    </div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설명</label><input value={equipDesc} onChange={e => setEquipDesc(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="간략한 설명" /></div>
                                </>
                            )}

                            {/* 문서 등록 */}
                            {modalConfig.type === 'ADD_EQUIP_DOC' && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">문서 제목</label><input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-zinc-50/50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: Feedwater Pump P&ID" /></div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">문서 유형</label>
                                        <div className="flex gap-2"><button onClick={() => setDocType('PID')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${docType === 'PID' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 text-zinc-500'}`}>P&ID 도면</button><button onClick={() => setDocType('MANUAL')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${docType === 'MANUAL' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 text-zinc-500'}`}>일반 문서/매뉴얼</button></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 ml-1">파일 첨부</label></div>
                                        <div onClick={() => handleSelectFile('attachment')} className="w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all mb-2 border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"><div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400"><FileText size={20} /></div><div className="text-center"><p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">클릭하여 파일 선택</p></div></div>
                                        {manualAttachments.length > 0 && (<div className="bg-zinc-50/50 dark:bg-zinc-800/50 border dark:border-zinc-700 rounded-xl p-2"><div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm"><span className="text-xs truncate flex-1 text-zinc-700 dark:text-zinc-200">{manualAttachments[0].name}</span><Check size={14} className="text-emerald-500" /></div></div>)}
                                    </div>
                                </>
                            )}

                            {/* 가이드/매뉴얼 등록 */}
                            {(modalConfig.type === 'ADD_FIELD_GUIDE' || modalConfig.type === 'EDIT_FIELD_GUIDE') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">제목</label><input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="제목 입력" /></div>
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">대상 기기</label><div className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-2 py-2 text-sm focus-within:ring-2 focus-within:ring-indigo-500 flex flex-wrap gap-2 items-center min-h-[50px]">{targetTags.map((tag, index) => (<span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold animate-fade-in">{tag}<button onClick={() => setTargetTags(targetTags.filter((_, i) => i !== index))} className="hover:text-indigo-900 dark:hover:text-white rounded-full p-0.5 transition-colors"><X size={12} /></button></span>))}<input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim() && !targetTags.includes(tagInput.trim())) { setTargetTags([...targetTags, tagInput.trim()]); } setTagInput(''); } else if (e.key === 'Backspace' && !tagInput && targetTags.length > 0) { setTargetTags(targetTags.slice(0, -1)); } }} className="bg-transparent outline-none flex-1 min-w-[120px] text-zinc-900 dark:text-zinc-100 h-8 px-2" placeholder={targetTags.length === 0 ? "기기 번호 입력 (Enter)" : ""} /></div></div>
                                        <div className="flex-1 flex flex-col"><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설명</label><div className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all bg-white dark:bg-zinc-800"><div className="flex items-center gap-1 p-1.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700"><button onClick={() => insertTag('guideDescInput', setInputDesc, inputDesc, '**', '**')} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="굵게"><Bold size={16} strokeWidth={2.5} /></button><div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1"></div><button onClick={() => insertTag('guideDescInput', setInputDesc, inputDesc, '[[', ']]')} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex items-center gap-1" title="중요 강조"><AlertTriangle size={16} /><span className="text-[10px] font-bold">중요</span></button></div><textarea id="guideDescInput" value={inputDesc} onChange={e => setInputDesc(e.target.value)} className="w-full h-32 p-4 text-sm text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none resize-none placeholder:text-zinc-400" placeholder="내용을 입력하세요..." /></div></div>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="relative z-50"><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">설비 분류</label>{!isDirectCategory ? (<div className="flex gap-2"><div className="flex-1"><VariableDropdown value={newGuideCategory} options={Array.from(new Set((equipment.fieldGuides || []).map(g => g.category).filter(Boolean))).sort()} placeholder="분류 선택" theme="emerald" onSelect={(val) => setNewGuideCategory(val)} onDirectInput={() => { setIsDirectCategory(true); setNewGuideCategory(''); setOriginalCategoryName(''); }} /></div><button onClick={() => { if (newGuideCategory) { setOriginalCategoryName(newGuideCategory); setIsDirectCategory(true); } }} disabled={!newGuideCategory} className={`px-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition-colors ${!newGuideCategory ? 'opacity-50 cursor-not-allowed' : ''}`}><Edit3 size={18} /></button></div>) : (<div className="flex gap-2"><input autoFocus value={newGuideCategory} onChange={e => setNewGuideCategory(e.target.value)} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500 min-w-0" placeholder={originalCategoryName ? "변경할 분류명 입력" : "새 분류 명칭 입력"} />{originalCategoryName && <button onClick={handleRenameCategory} className="px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 shadow-lg transition-colors whitespace-nowrap flex-shrink-0">변경</button>}<button onClick={handleCancelCategoryInput} className="px-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors whitespace-nowrap flex-shrink-0">취소</button></div>)}</div>
                                        <div><div className="flex justify-between items-center mb-2 ml-1"><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">중요도</label><span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">클릭하여 조정</span></div><div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 flex justify-center">{renderInteractiveStars(newGuideImportance, setNewGuideImportance)}</div></div>
                                        <div><div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 ml-1">파일 첨부</label></div><div onClick={() => handleSelectFile('attachment')} className="w-full border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all mb-2 border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50 h-24"><div className="p-1.5 rounded-full bg-zinc-100 text-zinc-400"><FileText size={16} /></div><div className="text-center"><p className="text-xs font-bold text-zinc-600">클릭하여 파일 선택</p></div></div>{manualAttachments.length > 0 && (<div className="space-y-1">{manualAttachments.map((f, i) => (<div key={i} className="bg-zinc-50/50 dark:bg-zinc-800/50 border dark:border-zinc-700 rounded-xl p-2 flex items-center justify-between"><span className="text-xs truncate flex-1 text-zinc-700 dark:text-zinc-200">{f.name}</span><Check size={14} className="text-emerald-500" /></div>))}</div>)}</div>
                                    </div>
                                </div>
                            )}

                            {/* 스텝 추가 */}
                            {(modalConfig.type === 'ADD_MANUAL_STEP' || modalConfig.type === 'ADD_FIELD_STEP') && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">단계 제목</label><input autoFocus value={newStepForm.title} onChange={e => setNewStepForm({ ...newStepForm, title: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="단계 제목" /></div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">상세 내용</label><div className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all bg-white dark:bg-zinc-800"><div className="flex items-center gap-1 p-1.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700"><button onClick={() => insertTag('stepContentInput', val => setNewStepForm({ ...newStepForm, content: val }), newStepForm.content, '**', '**')} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors" title="굵게"><Bold size={16} strokeWidth={2.5} /></button><div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1"></div><button onClick={() => insertTag('stepContentInput', val => setNewStepForm({ ...newStepForm, content: val }), newStepForm.content, '[[', ']]')} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex items-center gap-1" title="중요 강조"><AlertTriangle size={16} /><span className="text-[10px] font-bold">중요</span></button></div><textarea id="stepContentInput" value={newStepForm.content} onChange={e => setNewStepForm({ ...newStepForm, content: e.target.value })} className="w-full h-24 p-3 text-sm text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none resize-none placeholder:text-zinc-400" placeholder="상세 내용을 입력하세요..." /></div></div>
                                    <div><div className="flex justify-between items-center mb-1.5"><label className="text-xs font-bold text-zinc-500 ml-1">이미지/도면</label></div><div onClick={() => handleSelectImage('step')} className="w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all mb-2 border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50">{newStepForm.imagePath ? <img src={newStepForm.imagePath} className="h-32 object-contain" /> : <><div className="p-2 rounded-full bg-zinc-100 text-zinc-400"><Image size={20} /></div><div className="text-center"><p className="text-xs font-bold text-zinc-600">클릭하여 이미지 선택</p></div></>}</div></div>
                                </>
                            )}

                            {/* 카테고리 추가/수정 */}
                            {(modalConfig.type === 'ADD_CATEGORY' || modalConfig.type === 'EDIT_CATEGORY') && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">카테고리 ID (영문)</label><input disabled={modalConfig.type === 'EDIT_CATEGORY'} value={newCatId} onChange={e => setNewCatId(e.target.value.toUpperCase())} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" placeholder="예: SAFETY" /></div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 ml-1">카테고리 명칭</label><input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 안전 교육" /></div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 block mb-1.5 ml-1">라벨 색상</label>
                                        <div className="grid grid-cols-9 gap-2 py-1">
                                            {[{ val: 'zinc', cls: 'bg-zinc-500' }, { val: 'red', cls: 'bg-red-500' }, { val: 'orange', cls: 'bg-orange-500' }, { val: 'amber', cls: 'bg-amber-500' }, { val: 'yellow', cls: 'bg-yellow-500' }, { val: 'lime', cls: 'bg-lime-500' }, { val: 'green', cls: 'bg-green-500' }, { val: 'emerald', cls: 'bg-emerald-500' }, { val: 'teal', cls: 'bg-teal-500' }, { val: 'cyan', cls: 'bg-cyan-500' }, { val: 'sky', cls: 'bg-sky-500' }, { val: 'blue', cls: 'bg-blue-500' }, { val: 'indigo', cls: 'bg-indigo-500' }, { val: 'violet', cls: 'bg-violet-500' }, { val: 'purple', cls: 'bg-purple-500' }, { val: 'fuchsia', cls: 'bg-fuchsia-500' }, { val: 'pink', cls: 'bg-pink-500' }, { val: 'rose', cls: 'bg-rose-500' }].map(({ val, cls }) => (
                                                <button key={val} onClick={() => setNewCatColor(val)} className={`w-6 h-6 rounded-full flex-shrink-0 border-2 transition-transform ${newCatColor === val ? 'border-zinc-800 dark:border-white scale-125' : 'border-transparent hover:scale-110'}`}><div className={`w-full h-full rounded-full ${cls} shadow-sm`}></div></button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 하단 버튼 */}
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="flex-1 py-3 rounded-xl border text-sm font-bold hover:bg-zinc-50">취소</button>
                            <button onClick={handleSaveData} className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-indigo-600 hover:bg-indigo-500 shadow-lg">등록하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🌟 2. AI 퀴즈 전용 모달 (컴팩트 디자인 개선판) */}
            {modalConfig.isOpen && modalConfig.type === 'AI_QUIZ' && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
                    {/* 🌟 max-w-xl로 너비를 조금 줄이고, 내부 패딩을 최적화 */}
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xl max-h-[85vh] rounded-2xl shadow-2xl border border-white/20 dark:border-zinc-800/50 flex flex-col transform scale-100 transition-all overflow-hidden">

                        {/* 1. 상단 헤더 (높이 축소 h-14 -> p-4) */}
                        <div className="flex justify-between items-center px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
                            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-500">
                                    <Bot size={18} />
                                </div>
                                {modalConfig.title}
                            </h3>
                            <button
                                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 2. 메인 컨텐츠 영역 */}
                        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide bg-zinc-50/50 dark:bg-black/20">

                            {/* 상태 A: 로딩 중 */}
                            {quizData.status === 'LOADING' && (
                                <div className="h-full flex flex-col items-center justify-center gap-5 min-h-[300px]">
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center animate-pulse">
                                            <Bot size={32} className="text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">AI가 문제를 출제하고 있습니다...</p>
                                        <p className="text-xs text-zinc-500">잠시만 기다려주세요.</p>
                                    </div>
                                </div>
                            )}

                            {/* 상태 B: 문제 풀이 */}
                            {quizData.status === 'QUESTION' && (
                                <div className="flex flex-col gap-4 animate-fade-in-up">

                                    {/* 질문 카드 */}
                                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/80 shadow-sm overflow-hidden">
                                        {/* 카드 헤더 */}
                                        <div className="bg-indigo-50/30 dark:bg-indigo-900/10 px-4 py-2.5 border-b border-indigo-100/50 dark:border-indigo-900/30 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                                <Bot size={12} /> AI Tutor Question
                                            </span>
                                        </div>

                                        {/* 📷 문제 이미지 (높이 제한 max-h-[200px]로 축소) */}
                                        {quizData.quizImage && (
                                            <div className="w-full bg-zinc-100 dark:bg-black/30 border-b border-zinc-100 dark:border-zinc-700/50 flex justify-center py-3">
                                                <img
                                                    src={quizData.quizImage}
                                                    alt="Problem Context"
                                                    className="max-h-[200px] object-contain shadow-sm rounded-md"
                                                />
                                            </div>
                                        )}

                                        {/* 📝 질문 텍스트 (글자 크기 축소) */}
                                        <div className="p-5">
                                            <div className="flex gap-3">
                                                <span className="text-xl font-black text-indigo-300 dark:text-indigo-800 select-none leading-none mt-0.5">Q.</span>
                                                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-relaxed">
                                                    {quizData.question}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 보기 선택 영역 (버튼 크기 축소) */}
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {quizData.options && quizData.options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setQuizData({ ...quizData, userAnswer: idx })}
                                                className={`relative w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 group ${quizData.userAnswer === idx
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm ring-1 ring-indigo-600 z-10'
                                                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all ${quizData.userAnswer === idx
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600'
                                                    }`}>
                                                    {['A', 'B', 'C', 'D'][idx]}
                                                </div>
                                                <span className={`text-xs font-medium ${quizData.userAnswer === idx ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}`}>
                                                    {option}
                                                </span>

                                                {/* 선택됨 체크 표시 */}
                                                {quizData.userAnswer === idx && (
                                                    <div className="absolute right-4 text-indigo-600 animate-fade-in">
                                                        <Check size={16} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 상태 C: 채점 결과 */}
                            {quizData.status === 'RESULT' && (
                                <div className="flex flex-col gap-4 animate-fade-in-up">

                                    {/* 결과 헤더 (컴팩트하게 변경) */}
                                    <div className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border shadow-sm ${quizData.userAnswer === quizData.answer
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                                        }`}>
                                        {quizData.userAnswer === quizData.answer ? (
                                            <>
                                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center text-emerald-600 shadow-sm animate-bounce-short">
                                                    <Check size={24} strokeWidth={4} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">정답입니다! 🎉</h3>
                                                    <p className="text-emerald-600/80 dark:text-emerald-400/80 text-xs mt-0.5">완벽하게 이해하고 계시네요.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center text-rose-600 shadow-sm animate-shake">
                                                    <X size={24} strokeWidth={4} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">아쉽네요, 오답입니다.</h3>
                                                    <p className="text-rose-600/80 dark:text-rose-400/80 text-xs mt-0.5">아래 해설을 통해 내용을 복습해보세요.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* AI 해설 (폰트 작게) */}
                                    <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                        <div className="flex gap-3 mb-3 items-center">
                                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Bot size={16} /></div>
                                            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                                                AI Solution Guide
                                            </h4>
                                        </div>
                                        <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap pl-1">
                                            {formatText(quizData.explanation)}
                                        </div>
                                    </div>

                                    {/* 문제 및 정답 복습 (접이식 대신 간소화) */}
                                    <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50 space-y-3">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Review Question</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Q. {quizData.question}</p>

                                        <div className="space-y-1.5">
                                            {quizData.options.map((opt, idx) => (
                                                <div key={idx} className={`text-[11px] px-3 py-2 rounded-lg flex justify-between items-center ${idx === quizData.answer
                                                    ? 'bg-emerald-100/50 text-emerald-800 font-bold border border-emerald-200/50'
                                                    : idx === quizData.userAnswer
                                                        ? 'bg-rose-100/50 text-rose-800 font-bold border border-rose-200/50 line-through decoration-rose-500'
                                                        : 'bg-white/50 dark:bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                    <div className="flex gap-2">
                                                        <span>{['A', 'B', 'C', 'D'][idx]}.</span>
                                                        <span>{opt}</span>
                                                    </div>
                                                    {idx === quizData.answer && <span className="text-[9px] bg-white text-emerald-700 px-1.5 py-0.5 rounded shadow-sm">정답</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. 하단 고정 버튼 영역 (높이 축소) */}
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 flex-shrink-0">
                            {quizData.status === 'QUESTION' ? (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={quizData.userAnswer === null}
                                    className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${quizData.userAnswer !== null
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20 active:scale-[0.98]'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                                        }`}
                                >
                                    정답 확인하기 <ArrowRight size={16} strokeWidth={2.5} />
                                </button>
                            ) : quizData.status === 'RESULT' ? (
                                <button
                                    onClick={handleStartQuiz}
                                    className="w-full py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:border-zinc-300 transition-all flex items-center justify-center gap-2 group shadow-sm"
                                >
                                    <History size={16} className="group-hover:rotate-180 transition-transform duration-500 text-zinc-400 group-hover:text-indigo-500" />
                                    다른 문제 풀기
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* 구성품(Components) 추가 모달 */}
            {partModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white/95 dark:bg-zinc-900/95 w-full max-w-xs mx-4 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-zinc-800/50">
                        <h3 className="font-bold mb-4 text-zinc-800 dark:text-zinc-100 text-sm">구성품 등록 (계기/밸브/기기)</h3>
                        <div className="space-y-3 mb-4">
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
                            <div><label className="text-[10px] font-bold text-zinc-400 block mb-1">항목명 (Item)</label><input value={specModal.key} onChange={e => setSpecModal({ ...specModal, key: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 정격 용량, 설계 압력" /></div>
                            <div><label className="text-[10px] font-bold text-zinc-400 block mb-1">값 (Value)</label><input value={specModal.value} onChange={e => setSpecModal({ ...specModal, value: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 100 MW, 150 Bar" /></div>
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
                            <div><label className="text-xs font-bold text-zinc-500 block mb-1">제목</label><input value={editStepData.title} onChange={(e) => setEditStepData({ ...editStepData, title: e.target.value })} className="w-full p-2 border rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 dark:text-zinc-100" /></div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 block mb-1.5">내용</label>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => insertTag('editStepContentInput', val => setEditStepData({ ...editStepData, content: val }), editStepData.content, '**', '**')} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 flex items-center gap-1"><Edit3 size={12} /> Bold</button>
                                    <button onClick={() => insertTag('editStepContentInput', val => setEditStepData({ ...editStepData, content: val }), editStepData.content, '[[', ']]')} className="px-2 py-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 flex items-center gap-1"><AlertTriangle size={12} /> Warning</button>
                                </div>
                                <textarea id="editStepContentInput" value={editStepData.content} onChange={(e) => setEditStepData({ ...editStepData, content: e.target.value })} className="w-full h-32 p-3 border rounded-xl text-sm resize-none bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 block mb-1">이미지 수정</label>
                                <div onClick={() => handleSelectImage('edit', editStepData.id)} className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 flex justify-center items-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">{editStepData.image ? <img src={editStepData.image} className="max-h-32 object-contain" /> : <div className="text-zinc-400 text-sm">이미지 변경 (클릭)</div>}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditStepData(null)} className="flex-1 py-2 rounded-lg border dark:border-zinc-700 dark:text-zinc-300 text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800">취소</button>
                            <button onClick={handleSaveStepEdit} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 shadow-md">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
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

const parseBold = (text) => {
    if (!text) return null;

    // **...** 패턴으로 분리
    const parts = text.split(/(\*\*[\s\S]*?\*\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={index} className="font-black text-zinc-900 dark:text-white whitespace-pre-wrap">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
};

// 🌟 [신규] 리스트 미리보기용: 특수기호(**, [[, ]]) 제거 함수
const removeFormatting = (text) => {
    if (!text) return "";
    // **, [[, ]] 문자열을 모두 빈 문자열로 치환
    return text.replace(/(\*\*|\[\[|\]\])/g, '');
};

// 🌟 [수정됨] 줄바꿈(Enter)까지 완벽하게 인식하는 포맷팅 함수
const formatText = (text) => {
    if (!text) return "";

    const elements = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
        // 1. 가장 먼저 등장하는 태그 찾기
        const boldIdx = remaining.indexOf('**');
        const colorIdx = remaining.indexOf('[[');

        // 2. 태그가 없으면 남은 텍스트 모두 추가하고 종료
        if (boldIdx === -1 && colorIdx === -1) {
            // 🌟 [핵심 수정] 일반 텍스트에도 whitespace-pre-wrap 클래스 추가
            elements.push(
                <span key={keyIndex++} className="whitespace-pre-wrap">
                    {remaining}
                </span>
            );
            break;
        }

        // 3. 볼드체(**)가 먼저 나오는 경우
        if (boldIdx !== -1 && (colorIdx === -1 || boldIdx < colorIdx)) {
            // 태그 앞부분 텍스트
            if (boldIdx > 0) {
                elements.push(
                    <span key={keyIndex++} className="whitespace-pre-wrap">
                        {remaining.slice(0, boldIdx)}
                    </span>
                );
            }

            // 닫는 태그 찾기
            const closeIdx = remaining.indexOf('**', boldIdx + 2);
            if (closeIdx !== -1) {
                const content = remaining.slice(boldIdx + 2, closeIdx);
                elements.push(
                    <strong key={keyIndex++} className="font-black text-zinc-900 dark:text-white whitespace-pre-wrap">
                        {formatText(content)}
                    </strong>
                );
                remaining = remaining.slice(closeIdx + 2);
            } else {
                elements.push(<span key={keyIndex++} className="whitespace-pre-wrap">**</span>);
                remaining = remaining.slice(boldIdx + 2);
            }
        }
        // 4. 색상 강조([[)가 먼저 나오는 경우
        else if (colorIdx !== -1 && (boldIdx === -1 || colorIdx < boldIdx)) {
            // 태그 앞부분 텍스트
            if (colorIdx > 0) {
                elements.push(
                    <span key={keyIndex++} className="whitespace-pre-wrap">
                        {remaining.slice(0, colorIdx)}
                    </span>
                );
            }

            // 닫는 태그 찾기
            const closeIdx = remaining.indexOf(']]', colorIdx + 2);
            if (closeIdx !== -1) {
                const content = remaining.slice(colorIdx + 2, closeIdx);
                elements.push(
                    <span key={keyIndex++} className="font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-1 rounded mx-0.5 whitespace-pre-wrap">
                        {formatText(content)}
                    </span>
                );
                remaining = remaining.slice(closeIdx + 2);
            } else {
                elements.push(<span key={keyIndex++} className="whitespace-pre-wrap">[[</span>);
                remaining = remaining.slice(colorIdx + 2);
            }
        }
    }

    return elements;
};

// 🔑 .env 파일에 저장된 키를 가져옵니다. (변수명은 사용자 환경에 맞게 수정 필요)
// 예: REACT_APP_OPENAI_API_KEY 또는 VITE_OPENAI_API_KEY
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

// 🤖 Google Gemini API 호출 함수
// 🤖 Google Gemini API 호출 함수 (멀티모달 지원)
const callGemini = async (promptText, imageBase64 = null) => {
    if (!GEMINI_API_KEY) {
        throw new Error("API Key가 없습니다. .env 파일을 확인해주세요.");
    }

    try {
        // 메시지 파트 구성
        const parts = [{ text: promptText }];

        // 🌟 이미지가 있으면 파트 추가 (base64 데이터)
        if (imageBase64) {
            // "data:image/png;base64,..." 형식에서 실제 데이터만 분리
            const base64Data = imageBase64.split(',')[1];
            const mimeType = imageBase64.split(';')[0].split(':')[1];

            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        }
        // gemini-1.5-flash 모델 사용 (속도 빠름, 비용 효율적)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: parts }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

export default WorkDetailView;