// Last Updated: 2026-01-04 04:42:53
// [Part 1] 파일 상단: 임포트 및 InputModal
import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Search, X, Plus, Star, FileText, ChevronLeft, ChevronRight, Bot,
    Sparkles, CheckSquare, ExternalLink, Menu, Image, Edit3, Trash2,
    Calendar as CalendarIcon, Clock, Save, Calculator, ArrowRight
} from 'lucide-react';

const { ipcRenderer, shell } = window.require('electron');

// 🟢 [헬퍼 함수] 학습 상태 추출
const extractStudyStatus = (nodes) => {
    let statusSummary = [];
    const traverse = (items) => {
        items.forEach(item => {
            if (item.masteryLevel || item.quizHistory?.length > 0) {
                statusSummary.push({
                    title: item.title,
                    level: item.masteryLevel || 'Lv.1 🥚',
                    avgScore: item.quizHistory ? Math.round(item.quizHistory.reduce((a, b) => a + b, 0) / item.quizHistory.length) : 0
                });
            }
            if (item.children) traverse(item.children);
        });
    };
    traverse(nodes);
    return statusSummary;
};

// 🟢 [내부 컴포넌트] 입력/수정용 모달
const InputModal = ({ isOpen, type, title, value, onClose, onConfirm }) => {
    const [inputValue, setInputValue] = useState(value);

    useEffect(() => { if (isOpen) setInputValue(value); }, [isOpen, value]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-[400px] p-6 border border-zinc-200 dark:border-zinc-800 transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    {type === 'add' ? <Plus size={20} className="text-emerald-500" /> : <Edit3 size={20} className="text-amber-500" />}
                    {title}
                </h3>
                <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(inputValue); }}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
                    placeholder="내용을 입력하세요..."
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>
                    <button onClick={() => onConfirm(inputValue)} disabled={!inputValue.trim()} className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-colors disabled:opacity-50 ${type === 'add' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20'}`}>
                        {type === 'add' ? '추가하기' : '수정하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// [Part 2] 커리큘럼 아이템 컴포넌트
const CurriculumItem = ({
    item,
    parentTitle,
    level = 0,
    expandedItems,
    toggleExpand,
    toggleDone,
    handleAddClick,
    handleEditClick,
    requestDelete,
    handleAIStudy,
    handleOpenNote
}) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isRoot = level === 0;

    // 루트(책 제목)는 헤더에서 보여주므로 여기선 자식만 렌더링
    if (isRoot) {
        return (
            <div className="space-y-1">
                {item.children && item.children.map(child => (
                    <CurriculumItem
                        key={child.id} item={child} parentTitle={item.title} level={level + 1}
                        expandedItems={expandedItems} toggleExpand={toggleExpand} toggleDone={toggleDone}
                        handleAddClick={handleAddClick} handleEditClick={handleEditClick} requestDelete={requestDelete}
                        handleAIStudy={handleAIStudy} handleOpenNote={handleOpenNote}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className={`mb-2 transition-all duration-200 ml-4 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3`}>
            <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors group hover:bg-zinc-50 dark:hover:bg-zinc-800/30`}>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <button onClick={() => toggleExpand(item.id)} className={`p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ${!hasChildren ? 'invisible' : ''}`}>
                        <ChevronRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <button onClick={(e) => toggleDone(e, item.id)} className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-emerald-400'}`}>
                        {item.done && <CheckSquare size={10} strokeWidth={4} />}
                    </button>

                    <div
                        className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hasChildren) {
                                toggleExpand(item.id);
                            } else {
                                handleOpenNote(item);
                            }
                        }}
                    >
                        <p className={`text-sm truncate ${item.done ? 'line-through opacity-50 text-zinc-400' : 'text-zinc-600 dark:text-zinc-300 hover:text-emerald-600'}`}>
                            {item.title}
                            {item.masteryLevel && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ml-3 shadow-sm ${
                                    item.masteryLevel.includes('Lv.5') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    item.masteryLevel.includes('Lv.4') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    item.masteryLevel.includes('Lv.3') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-zinc-100 text-zinc-500 border-zinc-200'
                                }`}>
                                    {item.masteryLevel.replace(/ [가-힣]+ /, ' ')}
                                </span>
                            )}
                        </p>
                        {item.note && <div className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Edit3 size={8} /> 노트</div>}
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!hasChildren && (
                        <button onClick={(e) => handleAIStudy(e, item.title, parentTitle, item.note)} className="px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded hover:bg-indigo-100 transition-colors flex items-center gap-1 mr-1">
                            <Sparkles size={12} /> AI 점검
                        </button>
                    )}
                    <button onClick={(e) => handleAddClick(e, item.id)} className="p-1.5 text-emerald-500/70 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors" title="하위 추가"><Plus size={14} /></button>
                    <button onClick={(e) => handleEditClick(e, item.id, item.title)} className="p-1.5 text-indigo-500/70 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors" title="수정"><Edit3 size={14} /></button>
                    <button onClick={(e) => requestDelete(e, item.id, item.title)} className="p-1.5 text-rose-500/70 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors" title="삭제"><Trash2 size={14} /></button>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="pb-1 pt-1">
                    {item.children.map(child => (
                        <CurriculumItem
                            key={child.id} item={child} parentTitle={parentTitle} level={level + 1}
                            expandedItems={expandedItems} toggleExpand={toggleExpand} toggleDone={toggleDone}
                            handleAddClick={handleAddClick} handleEditClick={handleEditClick} requestDelete={requestDelete}
                            handleAIStudy={handleAIStudy} handleOpenNote={handleOpenNote}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// [Part 3] 서재 카드 & 에디터 관련 컴포넌트
const BookShelfCard = ({ book, onClick, onDelete, onToggleStar }) => {
    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) return node && node.done ? 100 : 0;
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };
    const progress = calculateProgress(book);

    const handleOpenFile = (e) => {
        e.stopPropagation();
        if (book.path) ipcRenderer.send('open-local-file', book.path);
    };

    return (
        <div onClick={onClick} className="group relative flex flex-col gap-2 cursor-pointer animate-fade-in">
            <div className={`relative aspect-[1/1.4] w-full overflow-hidden rounded-lg shadow-md border bg-zinc-100 dark:bg-zinc-800 transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl ${book.isStarred ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
                {book.cover ? (
                    <img src={book.cover} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                    <div className={`flex h-full w-full flex-col items-center justify-center gap-3 ${book.isLocal ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-400' : 'text-zinc-400'}`}>
                        {book.isLocal ? <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm"><FileText size={32} /></div> : <BookOpen size={32} strokeWidth={1.5} />}
                        {book.isLocal && <span className="text-[10px] font-bold uppercase tracking-wider">PDF DOC</span>}
                    </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); onToggleStar(e, book.id); }} className={`absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full transition-all z-20 shadow-sm ${book.isStarred ? 'bg-amber-400 text-white opacity-100 scale-100' : 'bg-black/40 text-white/50 hover:bg-amber-400 hover:text-white opacity-0 group-hover:opacity-100'}`}>
                    <Star size={16} fill={book.isStarred ? "currentColor" : "none"} strokeWidth={book.isStarred ? 0 : 2} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(e, book.id, book.title); }} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 z-10"><Trash2 size={14} /></button>
                {book.isLocal && (
                    <button onClick={handleOpenFile} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 hover:bg-indigo-600 text-white text-[10px] font-bold rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 z-20">
                        <ExternalLink size={10} /> 파일 열기
                    </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-200/50">
                    <div style={{ width: `${progress}%` }} className="h-full bg-emerald-500 transition-all duration-500"></div>
                </div>
            </div>
            <div>
                <div className="h-[2.8rem] flex items-start overflow-hidden mb-1"><h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2" title={book.title}>{book.title}</h3></div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{book.author}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{progress}% 완료</span>
                    {book.isStarred && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5"><Star size={8} fill="currentColor" /> 고정됨</span>}
                </div>
            </div>
        </div>
    );
};

const RichNoteEditor = ({ content, setContent, editorRef }) => {
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }, []);
    const handleInput = (e) => { setContent(e.currentTarget.innerHTML); };
    return (
        <div ref={editorRef} contentEditable onInput={handleInput} className="flex-1 w-full p-6 bg-transparent outline-none text-base leading-8 text-zinc-800 dark:text-zinc-200 font-sans overflow-y-auto whitespace-pre-wrap z-10 focus:ring-0" style={{ minHeight: '100%', lineHeight: '2rem' }} placeholder="여기에 내용을 입력하세요..." />
    );
};

const insertHtmlAtCursor = (html) => {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement("div");
        el.innerHTML = html;
        let frag = document.createDocumentFragment(), node, lastNode;
        while ((node = el.firstChild)) { lastNode = frag.appendChild(node); }
        range.insertNode(frag);
        if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
};

// [Part 4] 공학 수학 패드 컴포넌트
const EngineeringMathPad = ({ onDirectInsert }) => {
    const [mode, setMode] = useState('calc');
    const TabButton = ({ id, label }) => (
        <button onClick={() => setMode(id)} className={`flex-1 py-2 text-[10px] font-bold uppercase border-b-2 ${mode === id ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent text-zinc-400'}`}>{label}</button>
    );
    const KeyButton = ({ label, html, onClick }) => (
        <button onClick={(e) => { e.preventDefault(); if (onClick) onClick(); else if (html) onDirectInsert(html); }} className="h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-sm">{label}</button>
    );

    const renderKeypad = () => {
        switch (mode) {
            case 'calc': return (
                <div className="grid grid-cols-4 gap-2">
                    <KeyButton label="□/□" html={`<span class="inline-flex flex-col items-center align-middle mx-1 align-middle" contenteditable="false" style="vertical-align: middle;"><span class="border-b border-zinc-800 dark:border-zinc-200 px-1 min-w-[12px] text-center outline-none" contenteditable="true">□</span><span class="px-1 min-w-[12px] text-center outline-none" contenteditable="true">□</span></span>&nbsp;`} />
                    <KeyButton label="x²" html={`x<sup class="text-xs ml-0.5">2</sup>&nbsp;`} />
                    <KeyButton label="√" html={`√<span class="border-t border-zinc-800 dark:border-zinc-200 px-1 inline-block min-w-[12px]" contenteditable="true">□</span>&nbsp;`} />
                    <KeyButton label="∫" html="∫&nbsp;" /> <KeyButton label="∑" html="∑&nbsp;" /> <KeyButton label="∂" html="∂" /> <KeyButton label="∞" html="∞" />
                    <KeyButton label="lim" html="lim&nbsp;" /> <KeyButton label="sin" html="sin(" /> <KeyButton label="cos" html="cos(" /> <KeyButton label="tan" html="tan(" />
                </div>
            );
            case 'symbol': return (
                <div className="grid grid-cols-4 gap-2">
                    {['θ','ω','π','Ω','α','β','Δ','μ','∠','°','ε','λ'].map(s => <KeyButton key={s} label={s} html={s} />)}
                </div>
            );
            default: return (
                <div className="grid grid-cols-4 gap-2">
                    {['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+'].map(v => <KeyButton key={v} label={v} html={v} />)}
                </div>
            );
        }
    };

    return (
        <div className="w-[340px] bg-white dark:bg-zinc-900 flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800 select-none">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Math Tools</h4>
                <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700"><TabButton id="calc" label="Calculus" /><TabButton id="symbol" label="Symbols" /><TabButton id="num" label="Number" /></div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50">{renderKeypad()}</div>
        </div>
    );
};

// [Part 5] 메인 컴포넌트 시작: State & Basic Handlers
const DevelopmentDetailView = ({ dev, setDev, handleSendMessage, activeBookId, setActiveBookId }) => {
    // --- State ---
    const [loadingState, setLoadingState] = useState({ isLoading: false, message: '', progress: 0, targetProgress: 0 });
    const [inputTopic, setInputTopic] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const searchResults = dev.searchResults || [];

    const [inputModalState, setInputModalState] = useState({ isOpen: false, type: '', targetId: null, initialValue: '', title: '' });
    const [noteModalState, setNoteModalState] = useState({ isOpen: false, itemId: null, itemTitle: '', content: '' });
    const [showCalc, setShowCalc] = useState(false);
    const editorRef = useRef(null);

    const [showTocModal, setShowTocModal] = useState(false);
    const [selectedBookForToc, setSelectedBookForToc] = useState(null);
    const [manualToc, setManualToc] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiModalContent, setAiModalContent] = useState({ title: '', content: '' });
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedItems, setExpandedItems] = useState(new Set());

    const [studyMode, setStudyMode] = useState('summary');
    const [quizData, setQuizData] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizScore, setQuizScore] = useState(0);

    const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);
    const dragItem = useRef();
    const dragOverItem = useRef();

    // 로딩바 애니메이션 효과
    useEffect(() => {
        let interval;
        if (loadingState.isLoading && loadingState.progress < loadingState.targetProgress) {
            interval = setInterval(() => {
                setLoadingState(prev => {
                    if (prev.progress >= prev.targetProgress) return prev;
                    const increment = (prev.targetProgress - prev.progress) > 20 ? 2 : 1;
                    const randomAdd = Math.random() > 0.5 ? increment : 0;
                    return { ...prev, progress: Math.min(prev.progress + randomAdd, prev.targetProgress) };
                });
            }, 50);
        }
        return () => clearInterval(interval);
    }, [loadingState.isLoading, loadingState.progress, loadingState.targetProgress]);

    // DnD 핸들러
    const onBookDragStart = (e, position) => {
        if (dev.tasks[position].isStarred) { e.preventDefault(); return; }
        dragItem.current = position;
    };
    const onBookDragEnter = (e, position) => {
        e.preventDefault();
        if (dragItem.current === null || dragItem.current === position) return;
        if (dev.tasks[position].isStarred) return;
        const copyListItems = [...(dev.tasks || [])];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(position, 0, dragItemContent);
        dragItem.current = position;
        dragOverItem.current = position;
        setDev(prev => ({ ...prev, tasks: copyListItems }));
    };
    const onBookDragEnd = () => { dragItem.current = null; dragOverItem.current = null; };

    // 기본 CRUD 핸들러
    const toggleExpand = (id) => { setExpandedItems(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
    
    const toggleDone = (e, targetId) => {
        e.stopPropagation();
        const updateItems = (items) => items.map(item => {
            if (item.id === targetId) {
                const newDone = !item.done;
                const updateChildren = (children) => children.map(c => ({ ...c, done: newDone, children: c.children ? updateChildren(c.children) : [] }));
                return { ...item, done: newDone, children: item.children ? updateChildren(item.children) : [] };
            }
            if (item.children) return { ...item, children: updateItems(item.children) };
            return item;
        });
        setDev(prev => ({ ...prev, tasks: updateItems(prev.tasks || []) }));
    };

    const handleToggleStar = (e, bookId) => {
        setDev(prev => {
            let newTasks = prev.tasks.map(task =>
                task.id === bookId ? { ...task, isStarred: !task.isStarred } : task
            );
            
            // 🟢 [복구 확인] 즐겨찾기(Starred)된 항목을 배열 맨 앞으로 정렬
            newTasks.sort((a, b) => {
                if (a.isStarred === b.isStarred) return 0;
                return a.isStarred ? -1 : 1;
            });
            
            // 변경된 순서대로 즉시 저장
            ipcRenderer.send('save-development', { ...prev, tasks: newTasks });
            
            return { ...prev, tasks: newTasks };
        });
    };

    const requestDelete = (e, id, title) => { e.stopPropagation(); setDeleteTarget({ id, title }); setShowDeleteModal(true); };
    const confirmDelete = () => {
        if (!deleteTarget) return;
        const deleteRecursive = (items) => items.filter(item => item.id !== deleteTarget.id).map(item => ({ ...item, children: item.children ? deleteRecursive(item.children) : [] }));
        setDev(prev => {
            const newDev = { ...prev, tasks: deleteRecursive(prev.tasks || []) };
            ipcRenderer.send('save-development', newDev);
            return newDev;
        });
        setShowDeleteModal(false); setDeleteTarget(null);
    };

    const handleEditClick = (e, targetId, oldTitle) => { e.stopPropagation(); setInputModalState({ isOpen: true, type: 'edit', targetId, initialValue: oldTitle, title: '항목 수정' }); };
    const handleAddClick = (e, parentId) => { e.stopPropagation(); setInputModalState({ isOpen: true, type: 'add', targetId: parentId, initialValue: '', title: '하위 항목 추가' }); };
    
    const handleInputConfirm = (inputValue) => {
        if (!inputValue?.trim()) return;
        const { type, targetId } = inputModalState;
        if (type === 'edit') {
            const updateRecursive = (items) => items.map(item => item.id === targetId ? { ...item, title: inputValue } : (item.children ? { ...item, children: updateRecursive(item.children) } : item));
            setDev(prev => ({ ...prev, tasks: updateRecursive(prev.tasks || []) }));
        } else if (type === 'add') {
            const updateItems = (items) => items.map(item => item.id === targetId ? { ...item, children: [...(item.children || []), { id: generateId(), title: inputValue, done: false, children: [] }] } : (item.children ? { ...item, children: updateItems(item.children) } : item));
            setDev(prev => ({ ...prev, tasks: updateItems(prev.tasks || []) }));
            setExpandedItems(prev => new Set(prev).add(targetId));
        }
        setInputModalState(prev => ({ ...prev, isOpen: false }));
    };

    // 노트 핸들러
    const handleOpenNote = (item) => { setNoteModalState({ isOpen: true, itemId: item.id, itemTitle: item.title, content: item.note || '' }); };
    const handleSaveNote = () => {
        const { itemId, content } = noteModalState;
        const plainText = content.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
        const noteToSave = plainText.length === 0 ? null : content;
        const updateRecursive = (items) => items.map(item => item.id === itemId ? { ...item, note: noteToSave } : (item.children ? { ...item, children: updateRecursive(item.children) } : item));
        setDev(prev => ({ ...prev, tasks: updateRecursive(prev.tasks || []) }));
        setNoteModalState(prev => ({ ...prev, isOpen: false }));
    };

    // [Part 6] 메인 컴포넌트 로직: AI & PDF Handlers
    const activeBook = (dev.tasks || []).find(b => b.id === activeBookId);

    // AI 커리큘럼 분석
    const handleAnalyzeCurriculum = async () => {
        if (!activeBook) return;
        setIsGenerating(true);
        const studyStatus = extractStudyStatus(activeBook.children || []);
        
        // 진행률 계산
        const calculateProgress = (node) => {
            if (!node.children || node.children.length === 0) return node.done ? 100 : 0;
            const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
            return Math.round(total / node.children.length);
        };
        const totalProgress = calculateProgress(activeBook);

        if (studyStatus.length === 0) { alert("아직 학습 기록이 부족합니다."); setIsGenerating(false); return; }

        const prompt = `[Role] Professional Study Coach\n[Book] ${activeBook.title} (${totalProgress}%)\n[Status] ${JSON.stringify(studyStatus)}\nProvide 1-sentence Korean advice focusing on weak points.`;
        const advice = await handleSendMessage(null, prompt);
        
        setDev(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === activeBook.id ? { ...t, aiFeedback: advice } : t) }));
        setIsGenerating(false);
    };

    // AI 학습 보조 (요약)
    const handleAIStudy = async (e, topic, parentTitle, userNote) => {
        if (e) e.stopPropagation();
        setStudyMode('summary'); setQuizData([]); setUserAnswers({}); setQuizScore(0);
        setAiModalContent({ title: topic, content: '' }); setIsAiLoading(true); setShowAiModal(true);

        const prompt = `[Role] Tutor\n[Topic] ${topic} (${parentTitle})\nExplain key concepts simply. Check user note: "${userNote || ''}"`;
        const response = await handleSendMessage(null, prompt);
        setAiModalContent({ title: topic, content: response }); setIsAiLoading(false);
    };

    // 퀴즈 생성
    const handleGenerateQuiz = async () => {
        setStudyMode('quiz'); setIsAiLoading(true); setQuizData([]);
        const topic = aiModalContent.title;
        const prompt = `[Task] Create 5 Multiple Choice Questions (JSON) for '${topic}' in Korean.\nFormat: [{"id":1,"question":"...","options":["..."],"answer":0,"explanation":"..."}]`;
        try {
            const res = await handleSendMessage(null, prompt);
            const json = JSON.parse(res.replace(/```json|```/g, '').trim());
            setQuizData(json);
        } catch (e) { console.error(e); alert("퀴즈 생성 실패"); setStudyMode('summary'); }
        setIsAiLoading(false);
    };

    const handleSubmitQuiz = () => {
        let correct = 0; quizData.forEach((q, i) => { if (userAnswers[i] === q.answer) correct++; });
        const score = Math.round((correct / quizData.length) * 100);
        setQuizScore(score); setStudyMode('result');

        // 점수 저장 및 레벨 업데이트 로직
        const calculateLevel = (history) => {
            const avg = history.reduce((a, b) => a + b, 0) / history.length;
            if (avg >= 90) return 'Lv.5 👑'; if (avg >= 80) return 'Lv.4 🎓'; if (avg >= 70) return 'Lv.3 📘'; if (avg >= 50) return 'Lv.2 🌱'; return 'Lv.1 🥚';
        };
        const updateRecursive = (items) => items.map(item => {
            if (item.title === aiModalContent.title) {
                const newHistory = [...(item.quizHistory || []), score];
                return { ...item, quizHistory: newHistory, masteryLevel: calculateLevel(newHistory) };
            }
            if (item.children) return { ...item, children: updateRecursive(item.children) };
            return item;
        });
        setDev(prev => ({ ...prev, tasks: updateRecursive(prev.tasks || []) }));
    };

    // 책 검색
    const handleSearchBooks = async () => {
        if (!inputTopic.trim()) return;
        setIsSearching(true);
        try {
            const results = await ipcRenderer.invoke('search-naver-books', inputTopic);
            setDev(prev => ({ ...prev, searchResults: results.map(b => ({ title: b.title.replace(/<[^>]+>/g, ''), author: b.author, publisher: b.publisher, cover: b.image, link: b.link })) }));
        } catch (e) { alert("검색 오류"); }
        setIsSearching(false);
    };

    // 커리큘럼 생성 (목차)
    const handleCreateCurriculum = async () => {
        if (!selectedBookForToc) return;
        setIsGenerating(true);
        const prompt = `[Action] Generate Curriculum JSON for book '${selectedBookForToc.title}'.\nFilter: Main chapters only.\nFormat: { "title": "...", "children": [{ "title": "Ch1", "children": [] }] }`;
        await handleSendMessage(null, prompt); // handleSendMessage 내부에서 setDev 처리됨
        setIsGenerating(false); setShowTocModal(false); setInputTopic(''); setSelectedBookForToc(null);
    };

    // PDF 업로드
    const handleUploadPDF = async () => {
        try {
            const filePath = await ipcRenderer.invoke('select-pdf');
            if (!filePath) return;
            setLoadingState({ isLoading: true, message: 'PDF 분석 중...', progress: 0, targetProgress: 90 });
            
            const text = await ipcRenderer.invoke('extract-pdf-text', filePath);
            const prompt = `[Action] Generate Curriculum from PDF.\nFile: ${filePath}\nText: ${text.slice(0, 5000)}...\nExtract TOC structure as JSON.`;
            await handleSendMessage(null, prompt);
            
            setLoadingState({ isLoading: false, message: '', progress: 100, targetProgress: 100 });
        } catch (e) { alert("PDF 처리 실패"); setLoadingState({ isLoading: false, message: '', progress: 0, targetProgress: 0 }); }
    };

    // [Part 7] Render & Export
    const renderBookshelf = () => (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-8 p-6 animate-fade-in-up">
            <div className="group flex flex-col gap-3 cursor-pointer" onClick={() => document.getElementById('book-search-input').focus()}>
                <div className="aspect-[1/1.4] w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 group-hover:border-emerald-500 group-hover:text-emerald-500 group-hover:bg-emerald-50/10 transition-all bg-zinc-50/50 dark:bg-zinc-800/30">
                    <Search size={28} strokeWidth={1.5} /><span className="text-xs font-bold mt-2">교재 검색</span>
                </div>
            </div>
            <div className="group flex flex-col gap-3 cursor-pointer" onClick={handleUploadPDF}>
                <div className="aspect-[1/1.4] w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 group-hover:border-rose-500 group-hover:text-rose-500 group-hover:bg-rose-50/10 transition-all bg-zinc-50/50 dark:bg-zinc-800/30">
                    <FileText size={28} strokeWidth={1.5} /><span className="text-xs font-bold mt-2">PDF 등록</span>
                </div>
            </div>
            {(dev.tasks || []).map((book, index) => (
                <div key={book.id} draggable onDragStart={(e) => onBookDragStart(e, index)} onDragEnter={(e) => onBookDragEnter(e, index)} onDragEnd={onBookDragEnd} onDragOver={(e) => e.preventDefault()} className="cursor-move transition-transform active:scale-95">
                    <BookShelfCard book={book} onClick={() => setActiveBookId(book.id)} onDelete={requestDelete} onToggleStar={handleToggleStar} />
                </div>
            ))}
        </div>
    );

    const renderDetailView = () => {
        if (!activeBook) return null;
        const calculateProgress = (node) => {
            if (!node.children || node.children.length === 0) return node.done ? 100 : 0;
            const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
            return Math.round(total / node.children.length);
        };
        const progress = calculateProgress(activeBook);

        return (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex items-start gap-4 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <button onClick={() => setActiveBookId(null)} className="mt-1 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0"><ChevronLeft size={24} className="text-zinc-500" /></button>
                        <div className="w-20 h-28 bg-zinc-200 rounded-lg overflow-hidden shadow-sm flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                            {activeBook.cover ? <img src={activeBook.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-zinc-400" /></div>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-28 py-0.5">
                            <div><h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight line-clamp-2 break-keep mb-1" title={activeBook.title}>{activeBook.title}</h2><p className="text-xs text-zinc-500 truncate">{activeBook.author}</p></div>
                            <div className="flex items-center gap-3"><div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div style={{ width: `${progress}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500"></div></div><span className="text-xs font-bold text-emerald-600 whitespace-nowrap">{progress}% 완료</span></div>
                        </div>
                    </div>
                    <div className="w-[280px] lg:w-[320px] flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-center relative h-28">
                        <div className="flex items-start gap-3 h-full overflow-hidden">
                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-indigo-500 shadow-sm flex-shrink-0 mt-1"><Bot size={18} /></div>
                            <div className="flex-1 min-w-0 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-1 flex-shrink-0"><h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300">AI 학습 코치</h4><button onClick={handleAnalyzeCurriculum} disabled={isGenerating} className="text-[10px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-1 text-zinc-500 flex-shrink-0">{isGenerating ? <div className="w-2 h-2 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /> : <Sparkles size={10} />} 분석</button></div>
                                <div className="flex-1 overflow-y-auto scrollbar-hide"><p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug break-keep">{activeBook.aiFeedback || "데이터를 분석하여 취약점을 진단해 드립니다."}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                    <CurriculumItem item={activeBook} level={0} expandedItems={expandedItems} toggleExpand={toggleExpand} toggleDone={toggleDone} handleAddClick={handleAddClick} handleEditClick={handleEditClick} requestDelete={requestDelete} handleAIStudy={handleAIStudy} handleOpenNote={handleOpenNote} />
                </div>
            </div>
        );
    };

return (
        <div className="h-full flex flex-col p-6 animate-fade-in overflow-hidden relative">
            {!activeBookId && (
                <>
                    <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-800 dark:text-white"><BookOpen className="text-emerald-500" /> 내 서재</h2></div>
                    <div className="flex gap-2 mb-6"><input id="book-search-input" value={inputTopic} onChange={(e) => setInputTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks()} placeholder="새로 학습할 교재 검색" className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/50" /><button onClick={handleSearchBooks} disabled={isSearching} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-70 flex items-center gap-2">{isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />} 검색</button></div>
                    {searchResults.length > 0 && (
                        <div className="mb-6 p-3 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-fade-in">
                            <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">검색 결과 ({searchResults.length})</h3><button onClick={() => setDev(prev => ({ ...prev, searchResults: [] }))} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X size={14} /></button></div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">{searchResults.slice(0, 4).map((book, idx) => (<div key={idx} onClick={() => { setSelectedBookForToc(book); setShowTocModal(true); }} className="flex gap-3 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50 hover:border-emerald-500 hover:bg-emerald-50/10 cursor-pointer transition-all group bg-white dark:bg-zinc-900 items-center"><div className="w-10 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden flex-shrink-0 border border-zinc-100 dark:border-zinc-700">{book.cover ? <img src={book.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-zinc-400" /></div>}</div><div className="flex-1 min-w-0"><h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">{book.title}</h4><p className="text-xs text-zinc-500 mt-0.5 truncate">{book.author}</p></div><div className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity px-2"><Plus size={18} /></div></div>))}</div>
                        </div>
                    )}
                </>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-10">{activeBookId ? renderDetailView() : renderBookshelf()}</div>

            {/* Modals */}
            <InputModal isOpen={inputModalState.isOpen} type={inputModalState.type} title={inputModalState.title} value={inputModalState.initialValue} onClose={() => setInputModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={handleInputConfirm} />
            
            {noteModalState.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className={`bg-white dark:bg-zinc-900 w-full rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[80vh] overflow-hidden animate-scale-up transition-all duration-300 ${showCalc ? 'max-w-6xl' : 'max-w-4xl'}`} onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
                            <div><h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><BookOpen size={20} className="text-indigo-500" /> 학습 노트</h3><p className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">{noteModalState.itemTitle}</p></div>
                            <div className="flex gap-2 items-center">
                                <button onClick={() => setShowCalc(prev => !prev)} className={`p-2 rounded-lg transition-all border ${showCalc ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-zinc-200 text-zinc-400'}`}><Calculator size={18} /></button>
                                <button onClick={handleSaveNote} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1"><Save size={14} /> 저장</button>
                                <button onClick={() => setNoteModalState(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 flex overflow-hidden relative">
                            <div className="flex-1 flex flex-col bg-[#fffef0] dark:bg-[#1c1c1e] relative transition-all duration-300 cursor-text" onClick={() => editorRef.current?.focus()}>
                                <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '1.9rem' }}></div>
                                <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10" onClick={e => e.stopPropagation()}>
                                    <button className="text-xs font-bold text-zinc-500 hover:text-zinc-800" onClick={() => document.execCommand('bold')}>B</button>
                                    <button className="text-xs italic text-zinc-500 hover:text-zinc-800" onClick={() => document.execCommand('italic')}>I</button>
                                    <button className="text-xs underline text-zinc-500 hover:text-zinc-800" onClick={() => document.execCommand('underline')}>U</button>
                                </div>
                                <RichNoteEditor editorRef={editorRef} content={noteModalState.content} setContent={(html) => setNoteModalState(prev => ({ ...prev, content: html }))} />
                            </div>
                            {showCalc && <div className="w-[340px] border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col animate-slide-in-right z-20 shadow-xl"><EngineeringMathPad onDirectInsert={(htmlVal) => { editorRef.current?.focus(); insertHtmlAtCursor(htmlVal); setNoteModalState(prev => ({ ...prev, content: editorRef.current.innerHTML })); }} /></div>}
                        </div>
                    </div>
                </div>
            )}
            
            {showAiModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-scale-up">
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                            <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 flex items-center gap-2"><Sparkles size={20} /> {studyMode === 'summary' ? "AI 핵심 요약" : "실전 모의고사"}</h3>
                            <button onClick={() => setShowAiModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400"><X size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-black/20">
                            {isAiLoading ? <div className="flex flex-col items-center justify-center h-full gap-2 text-indigo-500"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div><span className="text-sm font-bold">AI 처리 중...</span></div> : (
                                studyMode === 'summary' ? <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">{aiModalContent.content}</div> : (
                                    studyMode === 'quiz' ? <div className="space-y-6">{quizData.map((q, i) => (<div key={i} className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700"><h5 className="font-bold mb-3">Q{i+1}. {q.question}</h5><div className="space-y-2">{q.options.map((opt, oi) => (<label key={oi} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${userAnswers[i]===oi ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-zinc-50 border-zinc-200'}`}><input type="radio" name={`q-${i}`} checked={userAnswers[i]===oi} onChange={() => setUserAnswers(prev => ({...prev, [i]: oi}))} className="hidden" /><div className={`w-4 h-4 rounded-full border flex items-center justify-center ${userAnswers[i]===oi ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-400'}`}>{userAnswers[i]===oi && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}</div><span className="text-sm">{opt}</span></label>))}</div></div>))}</div>
                                    : <div className="text-center p-8"><div className="text-4xl font-black text-indigo-500 mb-2">{quizScore}점</div><p className="text-sm text-zinc-500">총 {quizData.length}문제 중 {Math.round((quizScore/100)*quizData.length)}문제 정답</p></div>
                                )
                            )}
                        </div>
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end gap-3">
                            {studyMode === 'summary' && <button onClick={handleGenerateQuiz} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm">실전 문제 풀기</button>}
                            {studyMode === 'quiz' && <button onClick={handleSubmitQuiz} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm">제출 및 채점</button>}
                            {studyMode === 'result' && <button onClick={() => setShowAiModal(false)} className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-sm">완료</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* TOC Modal */}
            {showTocModal && selectedBookForToc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                        <h3 className="font-bold text-lg mb-4">목차 설정: {selectedBookForToc.title}</h3>
                        <textarea value={manualToc} onChange={(e) => setManualToc(e.target.value)} placeholder="목차를 여기에 붙여넣으세요..." className="w-full h-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-sm resize-none mb-4 outline-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowTocModal(false)} className="flex-1 py-3 rounded-xl border font-bold text-sm">취소</button>
                            <button onClick={handleCreateCurriculum} disabled={isGenerating} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm">{isGenerating ? '생성 중...' : (manualToc.trim() ? '입력한 목차로 생성' : '자동 생성')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ [수정됨] 삭제 모달: z-index를 최상위로 올리고 확인 버튼 로직 재점검 */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white dark:bg-zinc-900 w-[360px] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-rose-500" />
                        </div>
                        <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 mb-2">삭제 확인</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                            정말로 <strong>'{deleteTarget?.title}'</strong> 항목을<br />삭제하시겠습니까?<br />
                            <span className="text-xs text-rose-500 block mt-1">(하위 항목도 모두 삭제됩니다)</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-colors">삭제하기</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 로딩 인디케이터 (z-index 유지) */}
            {loadingState.isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-zinc-200 dark:border-zinc-800 w-[300px]">
                        <div className="w-16 h-16 border-4 border-zinc-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                        <h3 className="font-bold mb-2">처리 중...</h3>
                        <p className="text-sm text-zinc-500 mb-4 text-center">{loadingState.message}</p>
                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${loadingState.progress}%` }}></div></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DevelopmentDetailView;