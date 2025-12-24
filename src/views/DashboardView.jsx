// Last Updated: 2025-12-25 06:56:43
// DashboardView.jsx

import React, { useState, useRef, useEffect } from 'react'; // 🌟 useRef, useEffect 추가
import {
    Sparkles, Heart, Cloud, CloudRain, Wallet, BookOpen, Calendar as CalendarIcon,
    CalendarDays, ChevronRight, Settings, ExternalLink, Briefcase, Wrench, Activity,
    Lock, Bot, Trash, Trash2, Clock, StickyNote, Building2, X, ChevronDown
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { BookCoverFlowWidget } from '../components/widgets/ChatWidgets';


const { ipcRenderer } = window.require('electron');

// 🟢 [내부 컴포넌트 1] 멘탈 비주얼 로직 (유지)
const getMentalVisuals = (score) => {
    if (score === 0) return { themeName: "zinc", icon: Sparkles, gradient: "from-zinc-400 to-zinc-500", bgIconColor: "text-zinc-500/10", scoreColor: "text-zinc-400 dark:text-zinc-500", badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400", adviceBoxBorder: "border-zinc-200 dark:border-zinc-700", headerBorder: "border-zinc-200 dark:border-zinc-700", headerBg: "bg-zinc-50 dark:bg-zinc-800/50", botIcon: "text-zinc-400", headerText: "text-zinc-500 dark:text-zinc-400", inputFocus: "focus:ring-zinc-400/20" };
    else if (score >= 80) return { themeName: "rose", icon: Heart, gradient: "from-rose-400 to-pink-500", bgIconColor: "text-rose-500/10", scoreColor: "text-rose-600 dark:text-rose-400", badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400", adviceBoxBorder: "border-rose-100/50 dark:border-rose-900/30", headerBorder: "border-rose-100/30 dark:border-rose-900/20", headerBg: "bg-rose-50/30 dark:bg-rose-900/10", botIcon: "text-rose-500", headerText: "text-rose-600 dark:text-rose-400", inputFocus: "focus:ring-rose-500/20" };
    else if (score >= 50) return { themeName: "emerald", icon: Cloud, gradient: "from-emerald-400 to-teal-500", bgIconColor: "text-emerald-500/10", scoreColor: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", adviceBoxBorder: "border-emerald-100/50 dark:border-emerald-900/30", headerBorder: "border-emerald-100/30 dark:border-emerald-900/20", headerBg: "bg-emerald-50/30 dark:bg-emerald-900/10", botIcon: "text-emerald-500", headerText: "text-emerald-600 dark:text-emerald-400", inputFocus: "focus:ring-emerald-500/20" };
    else return { themeName: "indigo", icon: CloudRain, gradient: "from-indigo-400 to-blue-500", bgIconColor: "text-indigo-500/10", scoreColor: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400", adviceBoxBorder: "border-indigo-100/50 dark:border-indigo-900/30", headerBorder: "border-indigo-100/30 dark:border-indigo-900/20", headerBg: "bg-indigo-50/30 dark:bg-indigo-900/10", botIcon: "text-indigo-500", headerText: "text-indigo-600 dark:text-indigo-400", inputFocus: "focus:ring-indigo-500/20" };
};

// 🟢 [내부 컴포넌트 2] ModernCard (유지)
const ModernCard = ({ title, icon: Icon, children, className = "", accentColor = "indigo", count = null, headerAction = null }) => {
    const colors = {
        rose: "from-rose-500/10 to-rose-500/5 border-rose-200/50 dark:border-rose-500/20 text-rose-500",
        indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-200/50 dark:border-indigo-500/20 text-indigo-500",
        emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-500",
        zinc: "from-zinc-500/10 to-zinc-500/5 border-zinc-200/50 dark:border-zinc-500/20 text-zinc-500",
        violet: "from-violet-500/10 to-violet-500/5 border-violet-200/50 dark:border-violet-500/20 text-violet-500",
        amber: "from-amber-500/10 to-amber-500/5 border-amber-200/50 dark:border-amber-500/20 text-amber-500",
        blue: "from-blue-500/10 to-blue-500/5 border-blue-200/50 dark:border-blue-500/20 text-blue-500",
    };
    const activeColor = colors[accentColor] || colors.zinc;

    return (
        <div className={`relative h-full overflow-hidden rounded-2xl border bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group ${activeColor.split(' ').slice(2).join(' ')} ${className}`}>
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br ${activeColor.split(' ')[0]} blur-3xl opacity-50 pointer-events-none group-hover:opacity-80 transition-opacity`}></div>
            <div className="relative z-10 p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm ${activeColor.split(' ').slice(-1)[0]}`}><Icon size={14} /></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {headerAction && <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{headerAction}</div>}
                        {count !== null && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/20 shadow-sm ${activeColor.split(' ').slice(-1)[0]}`}>{count}</span>}
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
};

// 🟢 [추가] 커스텀 확인 모달 컴포넌트 (유지)
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-full text-rose-500">
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{title}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        취소
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm transition-colors">
                        삭제
                    </button>
                </div>
            </div>
        </div>
    );
};

// 🟢 [수정됨] ManualAccessWidget (유지)
const ManualAccessWidget = ({ work, setDashboardSubView, setWorkViewMode }) => {
    const manuals = work.manuals || [];
    const categories = work.categories || [];
    const sections = [
        { id: 'COMMON', label: '공통 기초 교육', engLabel: 'Basic Training', icon: Briefcase, color: 'indigo' },
        { id: 'FACILITY', label: '설비 마스터', engLabel: 'Facility Master', icon: Wrench, color: 'amber' },
        { id: 'PROCESS', label: '공정 운전 실무', engLabel: 'Process Operation', icon: Activity, color: 'emerald' }
    ];

    const handleSectionClick = (sectionId) => {
        setDashboardSubView('work');
        if (sectionId === 'COMMON') setWorkViewMode('BASIC_LIST');
        else if (sectionId === 'FACILITY') setWorkViewMode('EQUIP_LIST');
        else if (sectionId === 'PROCESS') setWorkViewMode('OPER_LIST');
        else setWorkViewMode('HOME');
    };

    return (
        <ModernCard title={<span className="text-600 dark:text-400">Job Manuals</span>} accentColor="violet" icon={BookOpen} count={`${manuals.length} Docs`} headerAction={<button onClick={() => { setDashboardSubView('work'); setWorkViewMode('HOME'); }} className="p-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30 text-zinc-400 hover:text-violet-600 transition-colors" title="직무 교육 홈으로 이동"><ExternalLink size={14} /></button>}>
            <Briefcase className="absolute bottom-[-10px] right-[-10px] text-violet-500/5 dark:text-violet-500/10 transform rotate-[-15deg] pointer-events-none transition-colors duration-500" size={100} strokeWidth={1.5} />
            <div className="flex flex-col h-full gap-2 pt-1 relative z-10">
                {sections.map((section, idx) => {
                    const targetCategoryIds = categories.filter(c => c.group === section.id).map(c => c.id);
                    const count = manuals.filter(m => targetCategoryIds.includes(m.category)).length;
                    const isAlwaysActive = section.id === 'FACILITY' || (section.id === 'COMMON' && count > 0);
                    const hasData = isAlwaysActive || count > 0;
                    const Icon = section.icon;
                    const colorMap = { amber: 'bg-amber-50/40 text-amber-700 border-amber-200/50 group-hover:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', emerald: 'bg-emerald-50/40 text-emerald-700 border-emerald-200/50 group-hover:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', indigo: 'bg-indigo-50/40 text-indigo-700 border-indigo-200/50 group-hover:border-indigo-400/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' };
                    const activeStyle = colorMap[section.color];

                    return (
                        <div key={idx} onClick={() => hasData && handleSectionClick(section.id)} className={`group relative w-full flex-1 px-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${hasData ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-sm ${activeStyle}` : "bg-zinc-50/30 border-zinc-100/50 text-zinc-400 border-dashed dark:bg-white/5 dark:border-zinc-800 dark:text-zinc-600 opacity-60 cursor-not-allowed"}`}>
                            <div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg ${hasData ? 'bg-white/60 dark:bg-white/10 shadow-sm' : 'bg-zinc-100/50 dark:bg-zinc-800'}`}><Icon size={16} /></div><div className="flex flex-col justify-center"><span className="text-[9px] font-bold opacity-70 uppercase tracking-wider leading-none mb-0.5">{section.engLabel}</span><span className="font-bold text-xs">{section.label}</span></div></div>
                            <div>{hasData ? (<div className="flex items-center gap-1"><span className="text-xs font-bold bg-white/40 dark:bg-white/10 px-1.5 py-0.5 rounded text-current">{section.id === 'FACILITY' ? 'GO' : count}</span></div>) : (<Lock size={12} className="opacity-40" />)}</div>
                        </div>
                    );
                })}
            </div>
        </ModernCard>
    );
};

// 🟢 [메인] DashboardView 컴포넌트
const DashboardView = ({
    todos, setTodos, finance, mental, setMental, dev,
    dashboardSubView, setDashboardSubView,
    handleSendMessage, settings, handleGroupChange,
    activeBookId, setActiveBookId,
    work, setWorkViewMode,
    setShowSettingsModal,
    customWidgets = [],
    setCustomWidgets
}) => {
    // -----------------------------------------------------
    // 🌟 [상태 및 레퍼런스]
    const [isMentalAnalyzing, setIsMentalAnalyzing] = useState(false);
    const [isDraggingMode, setIsDraggingMode] = useState(false);
    const longPressTimer = useRef(null);
    // -----------------------------------------------------

    const visibleModules = settings.visibleModules || { schedule: true, finance: true, mental: true, development: true, work: true };
    const [widgetOrder, setWidgetOrder] = useState(settings.dashboardWidgetOrder || ['mental', 'tasks', 'finance', 'development', 'work']);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isQuickLinksExpanded, setIsQuickLinksExpanded] = useState(false);



    const shortcuts = customWidgets.filter(w => w.type === 'link' || w.url);
    const infoWidgets = customWidgets.filter(w => w.type !== 'link' && !w.url);

    // 🌟 [Quick Link 순서 관리]
    const [quickLinkOrder, setQuickLinkOrder] = useState(shortcuts.map(w => w.id));

    useEffect(() => {
        // customWidgets가 변경될 때 (추가/삭제), quickLinkOrder를 재설정
        const currentIds = shortcuts.map(w => w.id);
        if (currentIds.length !== quickLinkOrder.length || currentIds.some(id => !quickLinkOrder.includes(id))) {
            setQuickLinkOrder(currentIds);
        }
    }, [shortcuts.length, customWidgets]);

    // 🌟 [Quick Links 순서 저장]
    const saveQuickLinksOrder = (newOrder) => {
        // 현재 링크 타입이 아닌 위젯(메모 등)들만 따로 보관
        const otherWidgets = customWidgets.filter(w => w.type !== 'link' && !w.url);

        // 새로운 순서에 맞춰 링크 위젯들 재배열
        const orderedLinks = newOrder
            .map(id => customWidgets.find(w => w.id === id))
            .filter(Boolean);

        // 메모 + 정렬된 링크를 합쳐서 전체 상태 업데이트 (데이터 보존)
        const finalWidgets = [...otherWidgets, ...orderedLinks];
        setCustomWidgets(finalWidgets);
        setQuickLinkOrder(newOrder);

        // Electron 저장 (필요 시)
        if (window.require) {
            window.require('electron').ipcRenderer.send('save-custom-widgets', finalWidgets);
        }
    };

    // 2. [수정] 드래그 시작 시 고스트 이미지 문제 해결
    const onShortcutDragStart = (e, id) => {
        // 꾹 누르지 않고 그냥 드래그하면 취소 (실수 방지)
        if (!isDraggingMode) {
            e.preventDefault();
            return;
        }

        setDraggedItem(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id); // 드래그 데이터 보장

        // 🌟 [핵심]: pointer-events: none을 제거해야 마우스를 잘 따라옵니다.
        // 대신 투명도만 조절합니다.
        setTimeout(() => {
            if (e.target) e.target.classList.add('opacity-20');
        }, 0);
    };

    const onShortcutDragOver = (e, targetId) => {
        e.preventDefault(); // 필수
        const draggedId = draggedItem;

        if (!draggedId || draggedId === targetId) return;

        setQuickLinkOrder(prevOrder => {
            const draggedIndex = prevOrder.indexOf(draggedId);
            const targetIndex = prevOrder.indexOf(targetId);

            if (draggedIndex === -1 || targetIndex === -1) return prevOrder;

            const newOrder = [...prevOrder];
            newOrder.splice(draggedIndex, 1);
            newOrder.splice(targetIndex, 0, draggedId);
            return newOrder; // 이 리턴이 화면을 실시간으로 다시 그리며 아이콘을 밀어냅니다.
        });
    };

    // 3. [수정] 드래그 종료 시 pointer-events 복구
    const onShortcutDragEnd = (e) => {
        if (e.target) e.target.classList.remove('opacity-20');
        setDraggedItem(null);
        saveQuickLinksOrder(quickLinkOrder);
    };

    // 🌟 [길게 누르기 감지 로직]
    const handlePressStart = (id) => (e) => {
        if (e.button !== 0) return;
        if (isDraggingMode) return;
        longPressTimer.current = setTimeout(() => {
            setIsDraggingMode(true);
            longPressTimer.current = null;
        }, 1000); // 0.5초만 눌러도 드래그 가능
    };
    const handlePressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleDragModeExit = () => {
        if (isDraggingMode) {
            setIsDraggingMode(false);
            setDraggedItem(null);
            saveQuickLinksOrder(quickLinkOrder);
        }
    };
    // -----------------------------------------------------

    const saveWidgetOrder = (newOrder) => {
        const newSettings = { ...settings, dashboardWidgetOrder: newOrder };
        ipcRenderer.send('save-settings', newSettings);
        if (handleGroupChange) {
            handleGroupChange(newSettings);
        }
    };

    const onDragStart = (e, index) => { setDraggedItem(widgetOrder[index]); e.dataTransfer.effectAllowed = "move"; e.target.style.opacity = '0.5'; };
    const onDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedItem(null); saveWidgetOrder(widgetOrder); };
    const onDragOver = (e, index) => { e.preventDefault(); const draggedOverItem = widgetOrder[index]; if (draggedItem === draggedOverItem) return; const items = [...widgetOrder]; items.splice(items.indexOf(draggedItem), 1); items.splice(items.indexOf(draggedOverItem), 0, draggedItem); setWidgetOrder(items); };

    // 위젯 크기 로직 (4열 그리드 대응)
    const getWidgetSpan = (key) => {
        const commonSpan = 'col-span-2 md:col-span-2';
        switch (key) {
            case 'mental': case 'tasks': case 'development': case 'work':
                return `${commonSpan} row-span-3`;
            case 'finance': default:
                return `${commonSpan} row-span-2`;
        }
    };

    // 🟢 [최종_수정] 복잡한 계산 제거, 1:1 비율 적용
    const getMemoLayoutSettings = (count) => {
        if (count === 0) return { wrapper: "hidden", grid: "", style: {} };

        const isEven = count % 2 === 0;
        const gridCols = "grid-cols-2"; // 2열 고정

        const spanValue = count === 1 ? 2 : count;

        return {
            className: "col-span-2 md:col-span-2",
            grid: `${gridCols} gap-3`,
            style: { gridRow: `span ${spanValue} / span ${spanValue}` }
        };
    };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const twoWeeksLater = new Date(today); twoWeeksLater.setDate(today.getDate() + 14);
    const upcomingTodos = todos.filter(t => { if (!t.date) return false; const tDate = new Date(t.date); return tDate >= today && tDate <= twoWeeksLater; }).sort((a, b) => new Date(`${a.date} ${a.startTime || '00:00'}`) - new Date(`${b.date} ${b.startTime || '00:00'}`));
    const mentalVisuals = getMentalVisuals(mental.score);
    const MentalIcon = mentalVisuals.icon;

    const widgetComponents = {
        mental: (
            <ModernCard title="Mental Health" icon={Heart} accentColor={mentalVisuals.themeName}>
                <div className="flex flex-col justify-between h-full gap-1.5 overflow-hidden">
                    <div className="flex items-end justify-between flex-shrink-0"><div><div className="flex items-end gap-1"><span className={`text-4xl font-black tracking-tighter leading-none transition-colors duration-500 ${mentalVisuals.scoreColor}`}>{mental.score}</span><span className="text-[16px] text-zinc-400 font-bold mb-1">/100</span></div></div><div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-colors duration-500 ${mentalVisuals.badge}`}>{mental.currentMood}</div></div>
                    <MentalIcon className={`absolute top-0 right-[-8px] transform rotate-[-10deg] pointer-events-none transition-colors duration-500 ${mentalVisuals.bgIconColor}`} size={90} strokeWidth={1} />
                    <div className={`flex-1 bg-white/50 dark:bg-black/20 rounded-lg border backdrop-blur-sm overflow-hidden flex flex-col min-h-0 z-10 transition-colors duration-500 ${mentalVisuals.adviceBoxBorder}`}><div className={`px-2 py-1.5 border-b flex items-center gap-1.5 flex-shrink-0 ${mentalVisuals.headerBorder} ${mentalVisuals.headerBg}`}><Bot size={10} className={`${mentalVisuals.botIcon}`} /><span className={`text-[9px] font-bold uppercase ${mentalVisuals.headerText}`}>Today's Insight</span></div><div className="p-2 overflow-y-auto scrollbar-hide"><p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug whitespace-pre-wrap break-keep">{mental.todayAdvice || (mental.logs.length > 0 ? mental.logs[0].advice : "오늘 하루는 어떠셨나요?")}</p></div></div>
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0"><div style={{ width: `${mental.score}%` }} className={`h-full rounded-full shadow-sm transition-all duration-1000 bg-gradient-to-r ${mentalVisuals.gradient}`}></div></div>
                    <div className="relative flex-shrink-0"><input placeholder={isMentalAnalyzing ? "분석 중..." : "오늘의 기분은?"} disabled={isMentalAnalyzing} className={`w-full h-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 text-xs outline-none transition-all shadow-sm flex items-center focus:ring-2 focus:ring-inset focus:border-transparent ${mentalVisuals.inputFocus} ${isMentalAnalyzing ? 'opacity-50 cursor-not-allowed bg-zinc-100' : ''}`} onKeyDown={async (e) => { if (e.key === 'Enter' && e.target.value.trim()) { const text = e.target.value.trim(); e.target.value = ''; setIsMentalAnalyzing(true); try { await handleSendMessage(null, `일기: ${text}`); } finally { setIsMentalAnalyzing(false); } } }} />{isMentalAnalyzing && (<div className="absolute right-2 top-1/2 -translate-y-1/2"><div className="w-3 h-3 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin"></div></div>)}</div>
                </div>
            </ModernCard>
        ),
        finance: (
            <ModernCard title="Total Assets" icon={Wallet} accentColor="indigo">
                <div className="flex flex-col h-full justify-between"><div><h3 className="text-2xl font-bold text-zinc-800 dark:text-white tracking-tight">₩ {finance.totalAsset.toLocaleString()}</h3><div className="flex items-center gap-2 mt-1"><span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">+2.4% ▲</span><span className="text-[10px] text-zinc-400">지난달 대비</span></div></div><div className="h-14 w-full relative opacity-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={[{ val: 100 }, { val: 120 }, { val: 110 }, { val: 140 }, { val: 130 }, { val: 160 }]}><Line type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
            </ModernCard>
        ),
        development: (
            <ModernCard title="My Library" icon={BookOpen} accentColor="emerald" count={`${(dev.tasks || []).length} Books`} headerAction={<button onClick={() => setDashboardSubView('development')} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-zinc-400 hover:text-emerald-600 transition-colors"><ExternalLink size={14} /></button>}>
                <BookCoverFlowWidget tasks={dev.tasks} onBookClick={(bookId) => { setActiveBookId(bookId); setDashboardSubView('development'); }} />
            </ModernCard>
        ),
        work: <ManualAccessWidget work={work} setDashboardSubView={setDashboardSubView} setWorkViewMode={setWorkViewMode} />,
        tasks: (
            <ModernCard title="Upcoming Schedule" icon={CalendarIcon} accentColor="zinc" count={upcomingTodos.length > 0 ? `${upcomingTodos.length} Tasks` : null}>
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 min-h-0 mb-2 space-y-1.5 pt-1">
                        {upcomingTodos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-1">
                                <CalendarDays size={20} className="opacity-20" /><span className="text-xs">일정 없음</span>
                            </div>
                        ) : (upcomingTodos.map((t) => {
                            let dateLabel = "";
                            if (t.date) { const parts = t.date.split('-'); if (parts.length === 3) dateLabel = `${parts[1]}.${parts[2]}`; }
                            if (t.startTime) { dateLabel += ` ${t.startTime}`; } else if (t.time) { dateLabel += ` ${t.time}`; }
                            const isWork = (t.text || "").includes("근무") || (t.category === 'shift');
                            const dotColor = isWork ? "bg-amber-400" : "bg-indigo-400";

                            return (
                                <div key={t.id} className="group/task relative flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700/50">
                                    <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`}></div>
                                    <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
                                        <span className="text-xs font-medium truncate text-zinc-700 dark:text-zinc-200">{t.text}</span>
                                        {dateLabel && (
                                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-md font-medium group-hover/task:opacity-0 transition-opacity">
                                                {dateLabel}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTaskTargetId(t.id);
                                        }}
                                        className="absolute right-2 p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded opacity-0 group-hover/task:opacity-100 transition-all"
                                        title="일정 삭제"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        }))}
                    </div>
                    <div className="pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800/50">
                        <button onClick={() => setDashboardSubView('schedules')} className="w-full py-2 px-3 bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 rounded-lg transition-all flex items-center justify-center gap-2 group">
                            전체 일정 <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </ModernCard>
        )
    };

    // 중복 ID 방지 (유지)
    React.useEffect(() => {
        if (customWidgets.length > 0) {
            const seenIds = new Set();
            let hasDuplicates = false;

            customWidgets.forEach(w => {
                if (seenIds.has(w.id)) hasDuplicates = true;
                seenIds.add(w.id);
            });

            if (hasDuplicates) {
                console.log("중복 ID 감지됨! 자동으로 수정합니다.");
                setCustomWidgets(prev => prev.map((w, index) => ({
                    ...w,
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`
                })));
            }
        }
    }, [customWidgets.length]);

    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteTaskTargetId, setDeleteTaskTargetId] = useState(null);

    const confirmDeleteTask = () => {
        if (deleteTaskTargetId) {
            setTodos(prev => prev.filter(t => t.id !== deleteTaskTargetId));
            setDeleteTaskTargetId(null);
        }
    };

    const handleDeleteWidget = (id) => {
        setDeleteTargetId(id);
    };

    const confirmDelete = () => {
        if (deleteTargetId) {
            setCustomWidgets(prev => prev.filter(w => w.id !== deleteTargetId));
            setDeleteTargetId(null);
        }
    };

    const MAX_VISIBLE_SHORTCUTS = 4;
    const shouldCollapse = shortcuts.length > MAX_VISIBLE_SHORTCUTS;

    // 🌟 [추가]: quickLinkOrder를 사용하여 shortcuts를 정렬합니다.
    const sortedShortcuts = quickLinkOrder
        .map(id => shortcuts.find(w => w.id === id))
        .filter(Boolean); // null/undefined 제거 (안전장치)

    const visibleShortcuts = shouldCollapse && !isQuickLinksExpanded
        ? sortedShortcuts.slice(0, MAX_VISIBLE_SHORTCUTS - 1) // 마지막 자리는 '더 보기' 버튼을 위해 비워둡니다.
        : sortedShortcuts;

    // 🟢 [적용] 현재 메모 개수에 따른 레이아웃 설정 가져오기
    const memoLayout = getMemoLayoutSettings(infoWidgets.length);

    const getFaviconUrl = (url) => {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch (e) { return null; }
    };

    return (
        <div className="animate-fade-in pb-10" onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} onDoubleClick={handleDragModeExit}>
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Dashboard Overview</h2>
                <div className="flex gap-2">
                    {/* 🌟 [추가]: 드래그 모드 안내 */}
                    {isDraggingMode ? (
                        <span className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full animate-pulse font-bold">🗑️ 드래그 모드: 순서 변경/X버튼으로 삭제 (더블클릭 해제)</span>
                    ) : (
                        <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">💡 위젯을 드래그하여 정렬 순서를 변경할 수 있습니다.</span>
                    )}
                    <button onClick={() => setShowSettingsModal(true)} className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors"><Settings size={15} /></button>
                </div>
            </div>

            {/* 1. 바로가기 링크 (상단 분리) */}
            {shortcuts.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-zinc-400 mb-3 px-1 uppercase tracking-wider">Quick Links</h3>
                    {/* 🌟 [핵심 수정]: flex 컨테이너에 transition-all 추가 */}
                    <div className="flex flex-wrap gap-4 animate-fade-in-down transition-all duration-300">

                        {visibleShortcuts.map((widget, index) => {
                            const favicon = getFaviconUrl(widget.url);
                            const isLocalFile = !widget.url.startsWith('http');
                            const useBase64Icon = !!widget.finalIcon;
                            const isBeingDragged = draggedItem === widget.id; // 🌟 드래그 중인 아이템 식별

                            // 🌟 [애니메이션 로직]:
                            const animationStyle = {
                                // 1. 평소/펼친 상태 모두 정자세(0deg). '펼칠 때' (false->true) 이 0deg로 부드럽게 transition 됨.
                                transform: isQuickLinksExpanded ? 'rotate(0deg)' : `rotate(0deg)`,
                                transition: 'transform 0.3s ease-out',
                                transitionDelay: isQuickLinksExpanded ? `${index * 50}ms` : '0ms'
                            };

                            // 🌟 [숨겨진 트릭]: 펼쳐질 때 회전 애니메이션 적용
                            // isQuickLinksExpanded가 false(접힘)일 때 임시로 회전 각도를 가지도록 합니다.
                            // isQuickLinksExpanded가 true가 되면 0deg로 돌아오면서 애니메이션이 보입니다.
                            // **주의: 이 로직은 Tailwind.config에 transition-property: transform이 정의되어 있어야 동작합니다.**
                            // Tailwind가 없는 환경에서는 추가 CSS가 필요합니다.
                            const initialRotation = isQuickLinksExpanded ? 'rotate(0deg)' : `rotate(${index * 15}deg)`;


                            // 🌟 [D&D 속성]
                            const draggableProps = isDraggingMode ? {
                                draggable: true,
                                onDragStart: (e) => onShortcutDragStart(e, widget.id),
                                onDragEnd: onShortcutDragEnd,
                                onDragOver: (e) => onShortcutDragOver(e, widget.id),
                            } : {};

                            return (
                                <div
                                    key={widget.id} // 🌟 key는 widget.id로 유지되어야 합니다.
                                    className={`shortcut-grid-item group relative flex flex-col items-center gap-2 transform transition-all duration-300 ${draggableProps.className} ${isBeingDragged ? 'opacity-0' : ''}`}
                                    {...draggableProps} // 🌟 드래그 속성 적용
                                    onDoubleClick={handleDragModeExit} // 더블클릭으로 모드 해제
                                >
                                    <button
                                        onClick={() => {
                                            if (isDraggingMode) return;
                                            if (isLocalFile) {
                                                window.require('electron').ipcRenderer.send('open-path', widget.url);
                                            } else {
                                                window.open(widget.url, '_blank');
                                            }
                                        }}
                                        onMouseDown={handlePressStart(widget.id)} // 🌟 길게 누르기 시작
                                        onMouseUp={handlePressEnd} // 🌟 길게 누르기 끝
                                        onMouseLeave={handlePressEnd}

                                        // 🌟 [최종 애니메이션 스타일]: 평소/펼침 상태는 정자세, 펼칠 때 애니메이션
                                        className={`w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 group-hover:ring-2 group-hover:ring-indigo-500/20 ${isDraggingMode ? 'shake-mode' : ''}`}
                                        style={{
                                            transition: 'transform 0.3s ease-out',
                                            transitionDelay: isQuickLinksExpanded ? `${index * 50}ms` : '0ms',
                                            transform: isQuickLinksExpanded ? 'rotate(0deg)' : `rotate(0deg)`,
                                        }}
                                    >
                                        {/* Base64 아이콘 렌더링 로직 (유지) */}
                                        {useBase64Icon ? (
                                            <img
                                                src={widget.finalIcon}
                                                alt={widget.title}
                                                className="w-8 h-8 object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                                            />
                                        ) : favicon ? (
                                            <img
                                                src={favicon}
                                                alt={widget.title}
                                                className="w-8 h-8 object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                                            />
                                        ) : (
                                            isLocalFile ? (
                                                <Building2 size={24} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                            ) : (
                                                <ExternalLink size={24} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                            )
                                        )}
                                    </button>

                                    <span className={`text-[10px] font-bold text-zinc-500 dark:text-zinc-400 max-w-[4rem] truncate text-center group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors ${!isQuickLinksExpanded && shouldCollapse && index >= MAX_VISIBLE_SHORTCUTS - 1 ? 'opacity-0 h-0 overflow-hidden' : ''}`}>
                                        {widget.title}
                                    </span>

                                    {/* 🌟 [수정]: 드래그 모드일 때만 삭제 버튼 표시 */}
                                    {isDraggingMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteWidget(widget.id); }}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center transition-all shadow-sm hover:bg-rose-600 hover:scale-110 z-20"
                                            title="삭제"
                                        >
                                            <span className="text-xs font-bold leading-none mb-0.5">×</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {/* 🟢 [추가] '더 보기' 버튼 */}
                        {shouldCollapse && (
                            <div className="group relative flex flex-col items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (isDraggingMode) {
                                            handleDragModeExit();
                                        } else {
                                            setIsQuickLinksExpanded(prev => !prev);
                                        }
                                    }}
                                    className={`w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-300 ${isQuickLinksExpanded ? 'border-indigo-500 bg-indigo-50/20 text-indigo-500 rotate-180' : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:border-indigo-500'}`}
                                    title={isQuickLinksExpanded ? "접기" : `${shortcuts.length - visibleShortcuts.length}개 더 보기`}
                                >
                                    {isQuickLinksExpanded ? (
                                        <X size={20} />
                                    ) : (
                                        <div className="text-lg font-bold">...</div>
                                    )}
                                </button>
                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 max-w-[4rem] truncate text-center group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                                    {isQuickLinksExpanded ? '접기' : '더 보기'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. 메인 그리드 (유지) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[80px] grid-flow-dense pb-20">
                {/* ... (메인 그리드 위젯 로직 유지) ... */}
                {infoWidgets.length > 0 && (
                    <div
                        className={`${memoLayout.className} grid ${memoLayout.grid} animate-fade-in`}
                        style={memoLayout.style}
                    >
                        {infoWidgets.map((widget, index) => {
                            const isAlarm = !!widget.targetTime;
                            const Icon = isAlarm ? Clock : StickyNote;
                            const accentColor = isAlarm ? 'rose' : (widget.color || 'zinc');

                            const isCompact = infoWidgets.length > 1 && infoWidgets.length % 2 !== 0;

                            return (
                                <div key={`memo-${widget.id}-${index}`} className="relative group h-full overflow-hidden">
                                    <ModernCard
                                        title={isAlarm ? "알림" : widget.title}
                                        icon={Icon}
                                        accentColor={accentColor}
                                        className={`h-full ${isCompact ? '!px-3 !py-1.5' : ''}`}
                                    >
                                        <div className={`flex flex-col h-full justify-between ${isCompact ? 'gap-0' : 'gap-2'}`}>
                                            <div className="flex-1 flex items-center justify-center min-h-0">
                                                <div className={`font-bold text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap text-center px-1 break-keep leading-tight overflow-hidden ${isCompact ? 'text-[11px] line-clamp-2' : 'text-sm'}`}>
                                                    {widget.content}
                                                </div>
                                            </div>
                                            {isAlarm && (
                                                <div className="flex justify-center border-t border-zinc-100 dark:border-zinc-800/50 mt-auto pt-2">
                                                    <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0 rounded-full flex items-center gap-1">
                                                        <Clock size={8} /> {widget.targetTime}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </ModernCard>

                                    <button
                                        onClick={() => handleDeleteWidget(widget.id)}
                                        className={`absolute right-2 bg-zinc-100 hover:bg-rose-500 hover:text-white text-zinc-400 rounded-full opacity-0 group-hover:opacity-100 transition-all ${isCompact ? 'top-1.5 p-1' : 'top-2 p-1.5'}`}
                                    >
                                        <Trash2 size={isCompact ? 10 : 12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* B. 메인 위젯들 - 메모 아래로 이동됨 (유지) */}
                {widgetOrder.filter(key => { if (key === 'tasks') return visibleModules.schedule; return visibleModules[key]; }).map((widgetKey, index) => (
                    <div
                        key={widgetKey}
                        draggable
                        onDragStart={(e) => onDragStart(e, index)}
                        onDragEnter={(e) => onDragOver(e, index)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`${getWidgetSpan(widgetKey)} cursor-move transition-transform active:scale-[0.99]`}
                    >
                        {widgetComponents[widgetKey]}
                    </div>
                ))}

            </div>

            <ConfirmModal
                isOpen={!!deleteTargetId}
                onClose={() => setDeleteTargetId(null)}
                onConfirm={confirmDelete}
                title="위젯 삭제"
                message="이 위젯을 대시보드에서 제거하시겠습니까? 데이터는 유지되지 않습니다."
            />

            <ConfirmModal
                isOpen={!!deleteTaskTargetId}
                onClose={() => setDeleteTaskTargetId(null)}
                onConfirm={confirmDeleteTask}
                title="일정 삭제"
                message="이 일정을 목록에서 삭제하시겠습니까?"
            />
        </div>
    );
};

export default DashboardView;