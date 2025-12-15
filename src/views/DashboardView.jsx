// Last Updated: 2025-12-16 04:18:05
import React, { useState } from 'react';
import {
    Sparkles, Heart, Cloud, CloudRain, Wallet, BookOpen, Calendar as CalendarIcon,
    CalendarDays, ChevronRight, Settings, ExternalLink, Briefcase, Wrench, Activity, Lock, Bot
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { BookCoverFlowWidget } from '../components/widgets/ChatWidgets';

const { ipcRenderer } = window.require('electron');

// 🟢 [내부 컴포넌트 1] 멘탈 비주얼 로직
const getMentalVisuals = (score) => {
    if (score === 0) return { themeName: "zinc", icon: Sparkles, gradient: "from-zinc-400 to-zinc-500", bgIconColor: "text-zinc-500/10", scoreColor: "text-zinc-400 dark:text-zinc-500", badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400", adviceBoxBorder: "border-zinc-200 dark:border-zinc-700", headerBorder: "border-zinc-200 dark:border-zinc-700", headerBg: "bg-zinc-50 dark:bg-zinc-800/50", botIcon: "text-zinc-400", headerText: "text-zinc-500 dark:text-zinc-400", inputFocus: "focus:ring-zinc-400/20" };
    else if (score >= 80) return { themeName: "rose", icon: Heart, gradient: "from-rose-400 to-pink-500", bgIconColor: "text-rose-500/10", scoreColor: "text-rose-600 dark:text-rose-400", badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400", adviceBoxBorder: "border-rose-100/50 dark:border-rose-900/30", headerBorder: "border-rose-100/30 dark:border-rose-900/20", headerBg: "bg-rose-50/30 dark:bg-rose-900/10", botIcon: "text-rose-500", headerText: "text-rose-600 dark:text-rose-400", inputFocus: "focus:ring-rose-500/20" };
    else if (score >= 50) return { themeName: "emerald", icon: Cloud, gradient: "from-emerald-400 to-teal-500", bgIconColor: "text-emerald-500/10", scoreColor: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", adviceBoxBorder: "border-emerald-100/50 dark:border-emerald-900/30", headerBorder: "border-emerald-100/30 dark:border-emerald-900/20", headerBg: "bg-emerald-50/30 dark:bg-emerald-900/10", botIcon: "text-emerald-500", headerText: "text-emerald-600 dark:text-emerald-400", inputFocus: "focus:ring-emerald-500/20" };
    else return { themeName: "indigo", icon: CloudRain, gradient: "from-indigo-400 to-blue-500", bgIconColor: "text-indigo-500/10", scoreColor: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400", adviceBoxBorder: "border-indigo-100/50 dark:border-indigo-900/30", headerBorder: "border-indigo-100/30 dark:border-indigo-900/20", headerBg: "bg-indigo-50/30 dark:bg-indigo-900/10", botIcon: "text-indigo-500", headerText: "text-indigo-600 dark:text-indigo-400", inputFocus: "focus:ring-indigo-500/20" };
};

// 🟢 [내부 컴포넌트 2] ModernCard
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

// 🟢 [수정됨] ManualAccessWidget
const ManualAccessWidget = ({ work, setDashboardSubView, setWorkViewMode }) => {
    const manuals = work.manuals || [];
    const categories = work.categories || [];
    const sections = [
        { id: 'COMMON', label: '공통 기초 교육', engLabel: 'Basic Training', icon: Briefcase, color: 'indigo' },
        { id: 'FACILITY', label: '설비 마스터', engLabel: 'Facility Master', icon: Wrench, color: 'amber' },
        { id: 'PROCESS', label: '공정 운전 실무', engLabel: 'Process Operation', icon: Activity, color: 'emerald' }
    ];

    const handleSectionClick = (sectionId) => {
        setDashboardSubView('work'); // 상위 탭 전환
        if (sectionId === 'COMMON') setWorkViewMode('BASIC_LIST');
        else if (sectionId === 'FACILITY') setWorkViewMode('EQUIP_LIST'); // 설비 마스터 연결
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
                    
                    // 🟢 [핵심 수정] 설비 마스터(FACILITY)는 데이터 개수와 상관없이 항상 활성화(hasData = true)
                    // COMMON은 원래 데이터가 있으면 활성화, PROCESS는 데이터가 있어야 활성화
                    const isAlwaysActive = section.id === 'FACILITY' || (section.id === 'COMMON' && count > 0);
                    const hasData = isAlwaysActive || count > 0;
                    
                    const Icon = section.icon;
                    const colorMap = { amber: 'bg-amber-50/40 text-amber-700 border-amber-200/50 group-hover:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', emerald: 'bg-emerald-50/40 text-emerald-700 border-emerald-200/50 group-hover:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', indigo: 'bg-indigo-50/40 text-indigo-700 border-indigo-200/50 group-hover:border-indigo-400/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' };
                    const activeStyle = colorMap[section.color];

                    return (
                        <div key={idx} onClick={() => hasData && handleSectionClick(section.id)} className={`group relative w-full flex-1 px-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${hasData ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-sm ${activeStyle}` : "bg-zinc-50/30 border-zinc-100/50 text-zinc-400 border-dashed dark:bg-white/5 dark:border-zinc-800 dark:text-zinc-600 opacity-60 cursor-not-allowed"}`}>
                            <div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg ${hasData ? 'bg-white/60 dark:bg-white/10 shadow-sm' : 'bg-zinc-100/50 dark:bg-zinc-800'}`}><Icon size={16} /></div><div className="flex flex-col justify-center"><span className="text-[9px] font-bold opacity-70 uppercase tracking-wider leading-none mb-0.5">{section.engLabel}</span><span className="font-bold text-xs">{section.label}</span></div></div>
                            {/* 설비 마스터일 때는 'GO' 표시, 나머지는 개수 또는 잠금 아이콘 */}
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
    setShowSettingsModal // 🟢 App.jsx에서 내려받은 함수 사용
}) => {
    const [isMentalAnalyzing, setIsMentalAnalyzing] = useState(false);
    const visibleModules = settings.visibleModules || { schedule: true, finance: true, mental: true, development: true, work: true };
    const [widgetOrder, setWidgetOrder] = useState(settings.dashboardWidgetOrder || ['mental', 'tasks', 'finance', 'development', 'work']);
    const [draggedItem, setDraggedItem] = useState(null);

    const saveWidgetOrder = (newOrder) => {
        const newSettings = { ...settings, dashboardWidgetOrder: newOrder };
        
        // 1. 일렉트론 파일 저장 (영구 저장)
        ipcRenderer.send('save-settings', newSettings);
        
        // 2. 🟢 [복구] 부모 컴포넌트(App.jsx)의 상태 즉시 업데이트 (화면 깜빡임 방지)
        if (handleGroupChange) {
            handleGroupChange(newSettings);
        }
    };

    const onDragStart = (e, index) => { setDraggedItem(widgetOrder[index]); e.dataTransfer.effectAllowed = "move"; e.target.style.opacity = '0.5'; };
    const onDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedItem(null); saveWidgetOrder(widgetOrder); };
    const onDragOver = (e, index) => { e.preventDefault(); const draggedOverItem = widgetOrder[index]; if (draggedItem === draggedOverItem) return; const items = [...widgetOrder]; items.splice(items.indexOf(draggedItem), 1); items.splice(items.indexOf(draggedOverItem), 0, draggedItem); setWidgetOrder(items); };

    const getWidgetSpan = (key) => {
        switch (key) {
            case 'mental': case 'tasks': case 'development': case 'work': return 'col-span-1 row-span-3';
            case 'finance': default: return 'col-span-1 row-span-2';
        }
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
                        {upcomingTodos.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-1"><CalendarDays size={20} className="opacity-20" /><span className="text-xs">일정 없음</span></div>) : (upcomingTodos.map((t) => {
                            let dateLabel = ""; if (t.date) { const parts = t.date.split('-'); if (parts.length === 3) dateLabel = `${parts[1]}.${parts[2]}`; } if (t.startTime) { dateLabel += ` ${t.startTime}`; } else if (t.time) { dateLabel += ` ${t.time}`; }
                            const isWork = (t.text || "").includes("근무") || (t.category === 'shift'); const dotColor = isWork ? "bg-amber-400" : "bg-indigo-400";
                            return (<div key={t.id} className="group/task flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700/50"><div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`}></div><div className="flex-1 flex items-center justify-between min-w-0 gap-2"><span className="text-xs font-medium truncate text-zinc-700 dark:text-zinc-200">{t.text}</span>{dateLabel && (<span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-md font-medium">{dateLabel}</span>)}</div></div>);
                        }))}
                    </div>
                    <div className="pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800/50"><button onClick={() => setDashboardSubView('schedules')} className="w-full py-2 px-3 bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 rounded-lg transition-all flex items-center justify-center gap-2 group">전체 일정 <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" /></button></div>
                </div>
            </ModernCard>
        )
    };

    return (
        <div className="animate-fade-in pb-10">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Dashboard Overview</h2>
                <div className="flex gap-2"><span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">💡 위젯을 드래그하여 정렬 순서를 변경할 수 있습니다.</span><button onClick={() => setShowSettingsModal(true)} className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors"><Settings size={15} /></button></div>
            </div>
            <div className="grid grid-cols-2 gap-4 auto-rows-[80px] grid-flow-dense">
                {widgetOrder.filter(key => { if (key === 'tasks') return visibleModules.schedule; return visibleModules[key]; }).map((widgetKey, index) => (
                    <div key={widgetKey} draggable onDragStart={(e) => onDragStart(e, index)} onDragEnter={(e) => onDragOver(e, index)} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()} className={`${getWidgetSpan(widgetKey)} cursor-move transition-transform active:scale-[0.99]`}>{widgetComponents[widgetKey]}</div>
                ))}
            </div>
        </div>
    );
};

export default DashboardView;