// Last Updated: 2025-12-30 15:59:37
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import SunCalc from 'suncalc';
import {
    Send, Bot, User, Sparkles,
    CheckSquare, Wallet, Heart, BookOpen,
    MoreHorizontal, Trash2, Sun, Moon, X, Minus,
    LayoutDashboard, MessageSquare, Menu, Home, Calendar as CalendarIcon, Users, Briefcase, ChevronRight, Clock,
    ChevronLeft, CalendarDays, Edit3, Save,
    Square, Copy, Smile, Meh, Frown,
    Cloud, CloudRain, Search, Plus, Star, FileText, ExternalLink, Calculator,
    MapPin, Wrench, AlertTriangle, Lock, Image, ArrowRight, Settings, LogOut,
    ShieldCheck, Folder, Activity, Database, History, ZoomIn, ZoomOut, Maximize,
    AlertCircle, CheckCircle2, ClipboardList, Zap
} from 'lucide-react';

const { ipcRenderer, shell } = window.require('electron');

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// 🟢 4개 그룹의 기준일 데이터 (상수)
const GROUP_START_DATES = {
    "운영 1그룹": new Date(2025, 2, 5),
    "운영 2그룹": new Date(2025, 2, 26),
    "운영 3그룹": new Date(2025, 2, 12),
    "운영 4그룹": new Date(2025, 2, 19)
};

// 🟢 공통 근무 패턴 (상수)
const COMMON_SHIFT_PATTERN = [
    "주간 근무", "주간 근무", "휴무", "휴무", "휴무",
    "야간 근무", "야간 근무", "휴무", "휴무",
    "주간 근무", "주간 근무", "주간 근무", "휴무", "휴무",
    "야간 근무", "야간 근무", "휴무", "휴무", "휴무",
    "주간 근무", "주간 근무", "휴무", "휴무",
    "야간 근무", "야간 근무", "야간 근무", "휴무", "휴무",
];

const getEventStyle = (todo) => {
    const text = (todo.text || "").toLowerCase();
    let category = todo.category;

    if (!category) {
        if (text.includes("대근") || text.includes("근무") || text.includes("당직") || text.includes("shift")) category = 'shift';
        else if (text.includes("미팅") || text.includes("회의") || text.includes("업무") || text.includes("보고")) category = 'work';
        else if (text.includes("pt") || text.includes("운동") || text.includes("헬스") || text.includes("병원")) category = 'health';
        else if (text.includes("자산") || text.includes("은행") || text.includes("주식") || text.includes("적금")) category = 'finance';
        else if (text.includes("공부") || text.includes("강의") || text.includes("독서") || text.includes("개발")) category = 'development';
        else category = 'default';
    }

    switch (category) {
        case 'shift':
            const isNight = text.includes("야간");
            const isCover = text.includes("대근");
            if (isNight && isCover) return { card: "bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-600 text-violet-900 dark:text-violet-100 font-bold", bar: "bg-violet-500 border-violet-600 text-white z-10 shadow-md", badge: "bg-violet-200 text-violet-800 border-violet-300" };
            if (!isNight && isCover) return { card: "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-600 text-rose-900 dark:text-rose-100 font-bold", bar: "bg-rose-500 border-rose-600 text-white z-10 shadow-md", badge: "bg-rose-200 text-rose-800 border-rose-300" };
            if (isNight) return { card: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 font-bold", bar: "bg-slate-600 border-slate-700 text-white z-10 shadow-sm", badge: "bg-slate-200 text-slate-700 border-slate-300" };
            return { card: "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-bold", bar: "bg-amber-300 border-amber-400 text-amber-900 z-10 shadow-sm", badge: "bg-amber-50 text-amber-700 border-amber-200" };
        case 'work': return { card: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200", bar: "bg-indigo-100 border-indigo-300 text-indigo-900 z-30 shadow-sm", badge: "bg-indigo-50 text-indigo-600 border-indigo-200" };
        case 'health': return { card: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200", bar: "bg-emerald-100 border-emerald-300 text-emerald-900 z-20", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" };
        case 'finance': return { card: "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-700 text-blue-800 dark:text-blue-200", bar: "bg-blue-100 border-blue-300 text-blue-900 z-20", badge: "bg-blue-50 text-blue-600 border-blue-200" };
        case 'development': return { card: "bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-700 text-purple-800 dark:text-purple-200", bar: "bg-purple-100 border-purple-300 text-purple-900 z-20", badge: "bg-purple-50 text-purple-600 border-purple-200" };
        default: return { card: "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300", bar: "bg-zinc-200 border-zinc-300 text-zinc-800 z-20", badge: "bg-zinc-100 text-zinc-600 border-zinc-200" };
    }
};

// ---------------------------------------------------------
// 🟢 1. 공통 UI 컴포넌트
// ---------------------------------------------------------

function DashboardCard({ title, icon: Icon, children, className = "" }) {
    return (
        <div className={`bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm ${className}`}>
            <div className="flex items-center gap-2 mb-3 text-zinc-500 dark:text-zinc-400">
                <Icon size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
            </div>
            {children}
        </div>
    );
}

const SideBarItem = ({ icon: Icon, label, active, onClick, isExpanded }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-start rounded-lg transition-colors p-2 
            ${active ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'}
            ${isExpanded ? 'justify-between' : 'justify-center'}
        `}
        title={!isExpanded ? label : undefined}
    >
        <span className={`flex items-center ${isExpanded ? 'gap-3' : 'gap-0'}`}>
            <Icon size={16} />
            {isExpanded && <span className="text-sm whitespace-nowrap">{label}</span>}
        </span>
        {isExpanded && active && <ChevronRight size={14} />}
    </button>
);

// [App.jsx] TodoModal 컴포넌트 (시간 선택창 너비 축소 & 기본 팝업 차단)

const TodoModal = ({ todo, onClose, onSave, onDelete }) => {
    const [editedTodo, setEditedTodo] = useState({ ...todo });

    // 팝업 상태
    const [showCalendar, setShowCalendar] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // 달력 네비게이션 상태
    const [navDate, setNavDate] = useState(todo && todo.date ? new Date(todo.date) : new Date());

    if (!todo) return null;

    const handleChange = (field, value) => { setEditedTodo(prev => ({ ...prev, [field]: value })); };

    // --- 🗓️ 커스텀 달력 ---
    const renderCustomCalendar = () => {
        const year = navDate.getFullYear();
        const month = navDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));

        const handleDateClick = (e, date) => {
            e.stopPropagation();
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            handleChange('date', dateStr);
            setShowCalendar(false);
        };

        return (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 p-4 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={(e) => { e.stopPropagation(); setNavDate(new Date(year, month - 1, 1)) }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-500"><ChevronLeft size={16} /></button>
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{year}년 {month + 1}월</span>
                    <button onClick={(e) => { e.stopPropagation(); setNavDate(new Date(year, month + 1, 1)) }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-500"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (<span key={d} className={`text-[10px] font-bold ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-zinc-400'}`}>{d}</span>))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        if (!d) return <div key={i}></div>;
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const isSelected = editedTodo.date === dateStr;
                        const isToday = new Date().toDateString() === d.toDateString();
                        return (
                            <button key={i} onClick={(e) => handleDateClick(e, d)} className={`h-8 w-8 rounded-full text-xs flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white font-bold shadow-md' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'} ${isToday && !isSelected ? 'border border-indigo-500 text-indigo-500 font-bold' : ''}`}>
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- ⏰ 커스텀 시간 선택기 (너비 축소 및 위치 보정) ---
    const renderCustomTimePicker = (field, closeFn, align = 'left') => {
        const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
        const minutes = ['00', '10', '20', '30', '40', '50'];
        const currentVal = editedTodo[field] || '09:00';
        const [currH, currM] = currentVal.split(':');

        return (
            // 🟢 [수정] w-64 -> w-48 (너비 축소), right-0 클래스 지원
            <div className={`absolute top-full mt-2 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 p-2 animate-fade-in-up flex gap-2 h-48 ${align === 'right' ? 'right-0' : 'left-0'}`}>
                <div className="flex-1 overflow-y-auto scrollbar-hide border-r border-zinc-100 dark:border-zinc-700 pr-1">
                    <div className="text-[10px] text-zinc-400 font-bold text-center mb-1 sticky top-0 bg-white dark:bg-zinc-800 py-1">시</div>
                    <div className="grid grid-cols-1 gap-1">
                        {hours.map(h => (
                            <button key={h} onClick={(e) => { e.stopPropagation(); handleChange(field, `${h}:${currM}`); }} className={`py-1.5 rounded text-xs transition-colors ${currH === h ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>{h}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide pl-1">
                    <div className="text-[10px] text-zinc-400 font-bold text-center mb-1 sticky top-0 bg-white dark:bg-zinc-800 py-1">분</div>
                    <div className="grid grid-cols-1 gap-1">
                        {minutes.map(m => (
                            <button key={m} onClick={(e) => { e.stopPropagation(); handleChange(field, `${currH}:${m}`); closeFn(false); }} className={`py-1.5 rounded text-xs transition-colors ${currM === m ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>{m}</button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // 🟢 배경 클릭 시 모든 팝업 닫기
    const closeAllPopups = () => { setShowCalendar(false); setShowStartTimePicker(false); setShowEndTimePicker(false); };

    return (
        <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-all p-4">
            <div onClick={(e) => { e.stopPropagation(); closeAllPopups(); }} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[400px] p-6 border border-zinc-200 dark:border-zinc-800 transform transition-all scale-100 relative">

                {/* 헤더 */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                        <Edit3 size={18} className="text-indigo-500" /> 일정 상세 / 수정
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {/* 카테고리 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">카테고리</label>
                        <div className="relative">
                            <select value={editedTodo.category || 'default'} onChange={(e) => handleChange('category', e.target.value)} className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                                <option value="default">⚪ 기본 / 기타</option><option value="shift">🚨 근무 / 대근</option><option value="work">💼 업무 / 회의</option><option value="personal">🌱 개인 용무</option><option value="health">💪 건강 / 운동</option><option value="finance">💰 자산 / 금융</option><option value="development">📚 자기개발</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><ChevronRight size={14} className="rotate-90" /></div>
                        </div>
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">내용</label>
                        <input value={editedTodo.text} onChange={(e) => handleChange('text', e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="일정 내용을 입력하세요" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative">
                        {/* 날짜 선택 */}
                        <div className="col-span-2 relative">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">날짜</label>
                            <div className="relative">
                                {/* 🟢 type="text" + readOnly로 브라우저 기본 달력 원천 차단 */}
                                <input
                                    type="text"
                                    readOnly
                                    value={editedTodo.date || ''}
                                    onClick={(e) => { e.stopPropagation(); setShowCalendar(!showCalendar); setShowStartTimePicker(false); setShowEndTimePicker(false); }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                    placeholder="날짜를 선택하세요"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><CalendarIcon size={16} /></div>
                            </div>
                            {showCalendar && renderCustomCalendar()}
                        </div>

                        {/* 시작 시간 */}
                        <div className="relative">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">시작 시간</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    readOnly
                                    value={editedTodo.startTime || ''}
                                    onClick={(e) => { e.stopPropagation(); setShowStartTimePicker(!showStartTimePicker); setShowCalendar(false); setShowEndTimePicker(false); }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-center"
                                    placeholder="00:00"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><Clock size={14} /></div>
                            </div>
                            {/* 왼쪽 정렬 */}
                            {showStartTimePicker && renderCustomTimePicker('startTime', setShowStartTimePicker, 'left')}
                        </div>

                        {/* 종료 시간 */}
                        <div className="relative">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">종료 시간</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    readOnly
                                    value={editedTodo.endTime || ''}
                                    onClick={(e) => { e.stopPropagation(); setShowEndTimePicker(!showEndTimePicker); setShowCalendar(false); setShowStartTimePicker(false); }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-center"
                                    placeholder="00:00"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><Clock size={14} /></div>
                            </div>
                            {/* 🟢 오른쪽 정렬 (화면 밖으로 나가는 것 방지) */}
                            {showEndTimePicker && renderCustomTimePicker('endTime', setShowEndTimePicker, 'right')}
                        </div>
                    </div>

                    {/* 메모 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">메모</label>
                        <textarea value={editedTodo.memo || ''} onChange={(e) => handleChange('memo', e.target.value)} placeholder="상세 내용을 입력하세요..." className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none scrollbar-hide text-zinc-800 dark:text-zinc-100" />
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-3 mt-8">
                    <button onClick={() => onDelete(todo.id)} className="flex-1 py-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm font-bold transition-colors flex items-center justify-center gap-2"><Trash2 size={16} /> 삭제</button>
                    <button onClick={() => onSave(editedTodo)} className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"><Save size={16} /> 저장하기</button>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------
// 🟢 2. PanZoomViewer (설비 도면용 - 기능 보강)
// ---------------------------------------------------------
const PanZoomViewer = ({ src, alt }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const handleWheel = (e) => {
        e.preventDefault();
        const scaleAdjustment = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.5, scale + scaleAdjustment), 4);
        setScale(newScale);
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => { setIsDragging(false); };

    return (
        <div className="relative w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl group">
            <div
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full flex items-center justify-center cursor-move"
            >
                {src ? (
                    <img
                        src={src}
                        alt={alt}
                        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: isDragging ? 'none' : 'transform 0.1s' }}
                        className="max-w-none max-h-none pointer-events-none select-none"
                        draggable={false}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                        <Image size={48} className="opacity-20 mb-2" />
                        <span className="text-sm">도면 파일이 없습니다.</span>
                    </div>
                )}
            </div>

            {/* 컨트롤러 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 text-white hover:bg-white/20 rounded"><ZoomOut size={16} /></button>
                <span className="text-xs text-white font-mono flex items-center min-w-[40px] justify-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-1.5 text-white hover:bg-white/20 rounded"><ZoomIn size={16} /></button>
                <div className="w-px bg-white/20 mx-1"></div>
                <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="p-1.5 text-white hover:bg-white/20 rounded" title="초기화"><Maximize size={16} /></button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------
// 🟢 3. 상세 뷰 컴포넌트 (ScheduleDetailView) - 교대 근무 자동화 포함
// ---------------------------------------------------------

// [App.jsx] - ScheduleDetailView (리사이징 가이드/핸들 완벽 수정 및 중복 제거)

const ScheduleDetailView = ({ todos, setTodos, settings, onGroupChange, getShiftForDate }) => {
    const [calendarMode, setCalendarMode] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [expandedDate, setExpandedDate] = useState(null);

    const [draggedTodoId, setDraggedTodoId] = useState(null);
    const [resizingTodo, setResizingTodo] = useState(null);

    const [guideTime, setGuideTime] = useState(null);
    const [guideLeft, setGuideLeft] = useState(null);
    const [hoveredRowDate, setHoveredRowDate] = useState(null);

    const [expandedMemoDates, setExpandedMemoDates] = useState(new Set());
    const lastScrollTime = useRef(0);

    // --- 설정 ---
    const SHIFT_BASE_DATE = new Date(2025, 2, 5);
    const SHIFT_PATTERN = [
        "주간 근무", "주간 근무", "휴무", "휴무", "휴무",
        "야간 근무", "야간 근무", "휴무", "휴무",
        "주간 근무", "주간 근무", "주간 근무", "휴무", "휴무",
        "야간 근무", "야간 근무", "휴무", "휴무", "휴무",
        "주간 근무", "주간 근무", "휴무", "휴무",
        "야간 근무", "야간 근무", "야간 근무", "휴무", "휴무",
    ];

    // --- 로직 ---
    const getAutoShiftTodo = (dateStr) => {
        const shiftType = getShiftForDate(new Date(dateStr));
        if (!shiftType || shiftType === "휴무") return null;
        const isDayShift = shiftType === "주간 근무";
        const isNightShift = shiftType === "야간 근무";
        let startTime = "09:00";
        let endTime = "18:00";
        if (isDayShift) { startTime = "07:30"; endTime = "19:30"; }
        else if (isNightShift) { startTime = "19:30"; endTime = "07:30"; }
        return { id: `auto-shift-${dateStr}`, text: shiftType, date: dateStr, startTime, endTime, category: 'shift', isAuto: true, memo: "자동 생성된 교대 근무 일정입니다." };
    };

    const toggleMemoExpand = (dateStr) => {
        setExpandedMemoDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateStr)) newSet.delete(dateStr);
            else newSet.add(dateStr);
            return newSet;
        });
    };

    // --- 헬퍼 함수 ---
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const offset = firstDay;
        return { days, offset, year, month };
    };

    const isSameDate = (d1, dStr) => {
        if (!dStr) return false;
        const d2 = new Date(dStr);
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const getMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const formatTime = (minutes, snapTo = 1) => {
        const snapped = Math.round(minutes / snapTo) * snapTo;
        const h = Math.floor(snapped / 60);
        const m = snapped % 60;
        if (h >= 24) return "23:59";
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleSaveTodo = (updatedTodo) => {
        if (updatedTodo.isAuto) return;
        setTodos(prev => prev.map(t => t.id === updatedTodo.id ? updatedTodo : t));
        setSelectedTodo(null);
    };

    const handleDeleteTodo = (id) => {
        if (typeof id === 'string' && id.startsWith('auto-shift')) {
            alert("자동 생성된 근무 일정은 삭제할 수 없습니다.");
            return;
        }

        // 🟢 [수정] 상태 업데이트와 동시에 파일 강제 저장
        setTodos(prev => {
            const newTodos = prev.filter(t => t.id !== id);

            // 🔥 즉시 저장
            ipcRenderer.send('save-schedules', newTodos);

            return newTodos;
        });

        setSelectedTodo(null);
        if (expandedDate) setExpandedDate(null);
    };

    // --- DnD & Resizing 핸들러 ---
    const handleDragStart = (e, todoId) => {
        if (typeof todoId === 'string' && todoId.startsWith('auto-shift')) { e.preventDefault(); return; }
        if (resizingTodo) { e.preventDefault(); return; }
        e.stopPropagation();
        setDraggedTodoId(todoId);
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOverTimeline = (e, dateStr) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = (x / rect.width) * 100;
        const totalMinutes = 1440;
        const currentMinutes = (totalMinutes * percent) / 100;
        const timeStr = formatTime(currentMinutes, 30);
        const snappedMinutes = getMinutes(timeStr);
        const snappedPercent = (snappedMinutes / 1440) * 100;
        setGuideLeft(`${snappedPercent}%`);
        setGuideTime(timeStr);
        setHoveredRowDate(dateStr);
    };

    const handleDragLeaveTimeline = () => {
        setGuideTime(null);
        setGuideLeft(null);
        setHoveredRowDate(null);
    };

    const handleDropOnTimeline = (e, dateStr) => {
        e.preventDefault();
        e.stopPropagation();
        setGuideTime(null);
        setHoveredRowDate(null);

        if (!draggedTodoId) return;
        if (!guideTime) return;

        const targetTodo = todos.find(t => t.id === draggedTodoId);
        let duration = 60;

        if (targetTodo && targetTodo.startTime && targetTodo.endTime) {
            const prevStart = getMinutes(targetTodo.startTime);
            const prevEnd = getMinutes(targetTodo.endTime);
            duration = prevEnd < prevStart ? (1440 - prevStart) + prevEnd : prevEnd - prevStart;
            if (duration < 30) duration = 30;
        }

        const startMin = getMinutes(guideTime);
        let endMinTotal = startMin + duration;
        endMinTotal = Math.round(endMinTotal / 30) * 30;
        let endH = Math.floor(endMinTotal / 60);
        let endM = endMinTotal % 60;
        if (endH >= 24) endH -= 24;
        const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        setTodos(prev => prev.map(t =>
            t.id === draggedTodoId
                ? { ...t, date: dateStr, startTime: guideTime, endTime }
                : t
        ));
        setDraggedTodoId(null);
    };

    const handleDropOnUntimed = (e, dateStr) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedTodoId) return;
        setTodos(prev => prev.map(t => t.id === draggedTodoId ? { ...t, date: dateStr, startTime: '', endTime: '' } : t));
        setDraggedTodoId(null);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingTodo) return;
            e.preventDefault();
            const { id, startX, startWidthPercent, containerWidth, startTime } = resizingTodo;
            const deltaX = e.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;
            const newWidthPercent = Math.max(startWidthPercent + deltaPercent, 2);
            const startMin = getMinutes(startTime);
            const durationMin = (newWidthPercent / 100) * 1440;
            let endMinTotal = startMin + durationMin;
            endMinTotal = Math.round(endMinTotal / 30) * 30;
            let endH = Math.floor(endMinTotal / 60);
            let endM = endMinTotal % 60;
            if (endH >= 24) endH -= 24;
            const newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            setTodos(prev => prev.map(t => t.id === id ? { ...t, endTime: newEndTime } : t));
        };
        const handleMouseUp = () => {
            if (resizingTodo) {
                setResizingTodo(null);
                document.body.style.cursor = 'default';
            }
        };
        if (resizingTodo) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingTodo]);

    const handlePrev = () => { if (calendarMode === 'week') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7))); else setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1))); };
    const handleNext = () => { if (calendarMode === 'week') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7))); else setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1))); };
    const handleWheel = (e) => { const now = Date.now(); if (now - lastScrollTime.current < 500) return; if (calendarMode === 'week') { if (e.target.closest('.overflow-y-auto')) return; } if (e.deltaY > 0) { handleNext(); lastScrollTime.current = now; } else if (e.deltaY < 0) { handlePrev(); lastScrollTime.current = now; } };

    // 🟢 주간 뷰
    const renderWeekView = () => {
        const startOfWeek = getStartOfWeek(new Date(currentDate));
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const timeSlots = Array.from({ length: 24 }, (_, i) => i);

        return (
            <div className="flex flex-col h-full overflow-hidden gap-3">
                {/* 상단 요약 */}
                <div className="h-[40%] flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50 p-2">
                    <div className="text-[10px] font-bold text-zinc-400 mb-1 uppercase tracking-wider flex items-center gap-1"><LayoutDashboard size={12} /> Weekly Summary</div>
                    <div className="flex-1 grid grid-cols-7 gap-2 overflow-hidden">
                        {weekDays.map((day, idx) => {
                            const dateStr = getLocalDateString(day);
                            const autoShift = getAutoShiftTodo(dateStr);
                            let dayEvents = todos.filter(t => t.date && isSameDate(day, t.date));
                            if (autoShift) dayEvents = [autoShift, ...dayEvents];

                            const isToday = isSameDate(new Date(), day.toISOString());
                            const dayNameColor = idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-zinc-500';
                            const dateNumColor = isToday ? 'text-indigo-600' : 'text-zinc-800 dark:text-zinc-200';
                            const containerBg = isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-zinc-50/50 dark:bg-zinc-800/50 border-transparent';
                            return (
                                <div key={idx} className={`flex flex-col h-full rounded-lg border ${containerBg} overflow-hidden`}>
                                    <div className="p-1.5 text-center flex-shrink-0"><span className={`text-[9px] font-bold uppercase block ${dayNameColor}`}>{dayNames[idx]}</span><span className={`text-sm font-black ${dateNumColor}`}>{day.getDate()}</span></div>
                                    <div className="flex-1 p-1 space-y-1 overflow-y-auto scrollbar-hide">
                                        {dayEvents.map(t => {
                                            const style = getEventStyle(t);
                                            return (<div key={t.id} onClick={() => setSelectedTodo(t)} className={`text-[9px] p-1 rounded border shadow-sm truncate cursor-pointer hover:opacity-80 ${style.card}`}>{t.text}</div>);
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 하단 타임라인 */}
                <div className="flex-1 flex flex-col min-h-0 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 h-8 flex-shrink-0 text-[10px] text-zinc-400 font-bold uppercase">
                        <div className="w-14 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center">Date</div>
                        <div className="w-32 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center">Memo (Untimed)</div>
                        <div className="flex-1 flex relative overflow-hidden">{timeSlots.map(h => (<div key={h} className="flex-1 border-r border-zinc-100 dark:border-zinc-800/50 flex items-center justify-center font-normal">{h}</div>))}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {weekDays.map((day, idx) => {
                            const dateStr = getLocalDateString(day);
                            const prevDay = new Date(day); prevDay.setDate(day.getDate() - 1); const prevDateStr = getLocalDateString(prevDay);

                            const autoShift = getAutoShiftTodo(dateStr);
                            const prevAutoShift = getAutoShiftTodo(prevDateStr);

                            let dayEvents = todos.filter(t => t.date === dateStr);
                            if (autoShift) dayEvents = [autoShift, ...dayEvents];
                            let prevDayEvents = todos.filter(t => t.date === prevDateStr);
                            if (prevAutoShift) prevDayEvents = [prevAutoShift, ...prevDayEvents];

                            const continuingEvents = prevDayEvents.filter(t => t.startTime && t.endTime && getMinutes(t.endTime) < getMinutes(t.startTime));
                            const isToday = isSameDate(new Date(), day.toISOString());
                            const timedEvents = dayEvents.filter(t => t.startTime);
                            timedEvents.sort((a, b) => {
                                const durationA = getMinutes(a.endTime || a.startTime) - getMinutes(a.startTime);
                                const durationB = getMinutes(b.endTime || b.startTime) - getMinutes(b.startTime);
                                return durationB - durationA; // 긴 시간이 먼저 오도록 내림차순 정렬 (먼저 렌더링 = 밑에 깔림)
                            });
                            const untimedEvents = dayEvents.filter(t => !t.startTime);

                            const isExpanded = expandedMemoDates.has(dateStr);
                            const visibleUntimed = isExpanded ? untimedEvents : untimedEvents.slice(0, 1);
                            const hiddenCount = untimedEvents.length - 1;

                            // 🟢 리사이징 중인 일정 확인 (가이드라인용)
                            const resizingEvent = timedEvents.find(t => resizingTodo && resizingTodo.id === t.id);

                            return (
                                <div key={idx} className={`flex border-b border-zinc-100 dark:border-zinc-800 min-h-[60px] ${isToday ? 'bg-indigo-50/20' : ''}`}>
                                    <div className="w-14 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-center items-center bg-zinc-50/30 dark:bg-zinc-900/50">
                                        <span className={`text-[10px] font-bold ${idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-zinc-500'}`}>{dayNames[idx]}</span>
                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">{day.getDate()}</span>
                                    </div>

                                    {/* 메모 영역 */}
                                    <div className="w-32 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-1.5 flex flex-col gap-1 bg-white/50 dark:bg-zinc-900/20 transition-colors" onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)'; }} onDragLeave={(e) => e.currentTarget.style.backgroundColor = ''} onDrop={(e) => { e.currentTarget.style.backgroundColor = ''; handleDropOnUntimed(e, dateStr); }}>
                                        {untimedEvents.length > 0 ? (<>{visibleUntimed.map(t => { const style = getEventStyle(t); return (<div key={t.id} draggable={!t.isAuto} onDragStart={(e) => handleDragStart(e, t.id)} onClick={() => setSelectedTodo(t)} className={`px-2 py-1 rounded-lg border truncate cursor-move transition-all active:scale-95 flex items-center gap-1.5 ${style.card} hover:shadow-md text-[10px]`}><div className="w-1 h-1 rounded-full bg-current opacity-50"></div>{t.text}</div>); })}{!isExpanded && hiddenCount > 0 && <div onClick={() => toggleMemoExpand(dateStr)} className="text-[9px] text-center font-bold text-zinc-400 bg-zinc-50 hover:bg-zinc-200 rounded cursor-pointer py-0.5 transition-colors">+{hiddenCount} more</div>}{isExpanded && hiddenCount > 0 && <div onClick={() => toggleMemoExpand(dateStr)} className="text-[9px] text-center font-bold text-zinc-400 bg-zinc-50 hover:bg-zinc-200 rounded cursor-pointer py-0.5 transition-colors">- 접기</div>}</>) : (<div className="h-full flex items-center justify-center opacity-30 text-[10px]">-</div>)}
                                    </div>

                                    {/* 타임라인 그래프 */}
                                    <div className="flex-1 relative min-w-[600px] group/timeline" onDragOver={(e) => handleDragOverTimeline(e, dateStr)} onDragLeave={handleDragLeaveTimeline} onDrop={(e) => handleDropOnTimeline(e, dateStr)}>
                                        <div className="absolute inset-0 flex pointer-events-none">{timeSlots.map(h => (<div key={h} className="flex-1 border-r border-dashed border-zinc-100 dark:border-zinc-800/50 h-full"></div>))}</div>

                                        {/* 🟢 드래그 가이드 */}
                                        {guideTime && draggedTodoId && hoveredRowDate === dateStr && (<div className="absolute top-0 bottom-0 w-px bg-indigo-500 z-30 pointer-events-none" style={{ left: guideLeft }}><div className="absolute -top-[25px] left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">{guideTime}</div></div>)}

                                        {/* 🟢 리사이징 가이드 (통일된 디자인: row 전체 높이) */}
                                        {resizingEvent && hoveredRowDate === dateStr && (<div className="absolute top-0 bottom-0 w-px bg-indigo-500 z-40 pointer-events-none" style={{ left: `${(getMinutes(resizingEvent.endTime) / 1440) * 100}%` }}><div className="absolute -top-[25px] left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">{resizingEvent.endTime}</div></div>)}

                                        {continuingEvents.map(t => {
                                            const endMin = getMinutes(t.endTime);
                                            const width = (endMin / 1440) * 100;
                                            const style = getEventStyle(t);
                                            return (<div key={`cont-${t.id}`} className={`absolute top-2 bottom-2 rounded-r border-y border-r shadow-sm flex items-center px-2 overflow-visible opacity-60 ${style.bar}`} style={{ left: 0, width: `${width}%` }} title={`(전일) ${t.text}: ~${t.endTime}`}><div className="text-[9px] font-bold truncate opacity-70">← {t.text} (~{t.endTime})</div></div>);
                                        })}
                                        {timedEvents.map(t => {
                                            const startMin = getMinutes(t.startTime);
                                            let endMin = t.endTime ? getMinutes(t.endTime) : startMin + 60;
                                            const isCrossing = endMin < startMin;
                                            if (endMin < startMin) endMin = 1440;
                                            const left = (startMin / 1440) * 100;
                                            const width = ((endMin - startMin) / 1440) * 100;
                                            const style = getEventStyle(t);
                                            const isResizingThis = resizingTodo && resizingTodo.id === t.id;
                                            const isNarrow = width < 10 && !isResizingThis;
                                            const isAuto = t.isAuto;

                                            return (
                                                <div key={t.id} draggable={!isResizingThis && !isAuto} onDragStart={(e) => handleDragStart(e, t.id)} className={`absolute top-2 bottom-2 rounded border shadow-sm flex items-center px-2 cursor-pointer transition-all overflow-visible group/bar ${style.bar} ${isResizingThis ? 'z-30 brightness-95' : 'z-10'} ${isNarrow ? 'hover:z-50 hover:w-auto hover:min-w-[140px] hover:shadow-xl hover:scale-105 hover:-translate-y-0.5' : 'hover:brightness-95 hover:z-20 hover:shadow-md'}`} style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}>
                                                    <div className="flex-1 h-full flex flex-col justify-center min-w-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedTodo(t); }}><span className="text-[9px] font-bold opacity-80 leading-none mb-0.5 whitespace-nowrap">{t.startTime} ~ {isCrossing ? `${t.endTime}(익일)` : t.endTime}</span><span className="text-[10px] font-bold leading-none truncate">{t.text}</span></div>
                                                    {!isAuto && (
                                                        <div className="absolute right-0 top-0 bottom-0 w-4 cursor-e-resize flex items-center justify-center opacity-0 group-hover/bar:opacity-100 z-30 hover:bg-black/5" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const parentRect = e.currentTarget.parentElement.parentElement.getBoundingClientRect(); setResizingTodo({ id: t.id, startX: e.clientX, startWidthPercent: width, containerWidth: parentRect.width, startTime: t.startTime }); document.body.style.cursor = 'e-resize'; }}>
                                                            <div className="w-1 h-3 bg-black/40 rounded-full shadow-sm"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ... 월간 뷰 (기존 유지) ...
    const renderMonthView = () => {
        const { days, offset, year, month } = getDaysInMonth(currentDate);
        const blanks = Array.from({ length: offset }, (_, i) => <div key={`blank-${i}`} className="bg-zinc-50/30 dark:bg-zinc-900/10 rounded-lg"></div>);
        const dateCells = Array.from({ length: days }, (_, i) => {
            const d = new Date(year, month, i + 1);
            const dString = d.toISOString();
            const dateStr = getLocalDateString(d);

            const autoShift = getAutoShiftTodo(dateStr);
            let dayEvents = todos.filter(t => t.date && isSameDate(d, t.date));
            if (autoShift) dayEvents = [autoShift, ...dayEvents];

            const isToday = isSameDate(new Date(), dString);
            const dayOfWeek = d.getDay();
            const dateNumColor = isToday ? 'text-indigo-600' : (dayOfWeek === 0 ? 'text-rose-600' : dayOfWeek === 6 ? 'text-blue-600' : 'text-zinc-500');
            const MAX_VISIBLE = 2;
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
            const overflowCount = dayEvents.length - MAX_VISIBLE;
            const isExpanded = expandedDate === dString;
            const currentRow = Math.floor((i + offset) / 7);
            const isBottomRow = currentRow >= 3;
            const vertPos = isBottomRow ? 'bottom-[105%] mb-1 origin-bottom' : 'top-[105%] mt-1 origin-top';
            const horizPos = (dayOfWeek === 0 || dayOfWeek === 1) ? 'left-0' : (dayOfWeek === 5 || dayOfWeek === 6) ? 'right-0' : 'left-1/2 -translate-x-1/2 origin-top';

            return (
                <div key={i} className={`relative h-full min-h-0 border rounded-lg p-1.5 flex flex-col justify-start gap-0.5 ${isToday ? 'border-indigo-400 bg-indigo-50/30' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30'} ${isExpanded ? 'z-50 opacity-100' : 'hover:opacity-100 z-auto'} transition-none`}>
                    <div className={`text-right text-[10px] font-bold mb-0.5 ${dateNumColor}`}>{i + 1}</div>
                    <div className="w-full flex flex-col gap-0.5 overflow-hidden">
                        {visibleEvents.map(t => {
                            const style = getEventStyle(t);
                            return (<div key={t.id} onClick={(e) => { e.stopPropagation(); setSelectedTodo(t); }} className={`text-[9px] px-1 py-0.5 rounded border truncate font-bold cursor-pointer hover:opacity-80 transition-opacity ${style.card}`}>{t.text}</div>);
                        })}
                        {overflowCount > 0 && (<div onClick={(e) => { e.stopPropagation(); setExpandedDate(dString); }} className="text-[8px] text-center font-bold text-zinc-500 bg-zinc-100 hover:bg-zinc-200 rounded cursor-pointer py-0.5 transition-colors">+{overflowCount}</div>)}
                    </div>
                    {isExpanded && (
                        <>
                            <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={(e) => { e.stopPropagation(); setExpandedDate(null); }} />
                            <div className={`absolute ${vertPos} ${horizPos} z-50 w-[240px] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl flex flex-col p-3 border border-indigo-100 dark:border-zinc-700 animate-fade-in-up`} onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div><span className={`text-sm font-black ${dateNumColor}`}>{i + 1}일 전체 일정</span></div>
                                    <button onClick={(e) => { e.stopPropagation(); setExpandedDate(null); }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"><X size={14} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[240px] scrollbar-hide space-y-1">
                                    {dayEvents.map(t => {
                                        const style = getEventStyle(t);
                                        const timeDisplay = t.startTime ? `${t.startTime}` : t.time;
                                        return (
                                            <div key={t.id} onClick={(e) => { e.stopPropagation(); setSelectedTodo(t); }} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all hover:translate-x-0.5 ${style.card}`}>
                                                {timeDisplay ? (<div className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>{timeDisplay}</div>) : (<div className="w-1.5 h-1.5 rounded-full bg-current opacity-50 ml-1 mr-1"></div>)}
                                                <div className="text-xs font-bold truncate flex-1 leading-none pt-0.5">{t.text}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            );
        });

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="grid grid-cols-7 gap-1 mb-1 flex-shrink-0">
                    {dayHeaders.map((d, i) => {
                        const headerColor = i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-zinc-400';
                        return <div key={d} className={`text-center text-xs font-bold py-1 ${headerColor}`}>{d}</div>;
                    })}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr gap-1 flex-1 min-h-0 relative">
                    {blanks}
                    {dateCells}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="animate-fade-in p-6 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 h-full overflow-y-auto flex flex-col" onWheel={handleWheel}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mr-2"><CalendarIcon className="text-indigo-500" />{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                            <button onClick={() => setCalendarMode('week')} className={`px-3 py-1 text-xs rounded-md transition-colors ${calendarMode === 'week' ? 'bg-white dark:bg-zinc-700 shadow-sm font-bold' : 'text-zinc-500'}`}>주간</button>
                            <button onClick={() => setCalendarMode('month')} className={`px-3 py-1 text-xs rounded-md transition-colors ${calendarMode === 'month' ? 'bg-white dark:bg-zinc-700 shadow-sm font-bold' : 'text-zinc-500'}`}>월간</button>
                        </div>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                            {["운영 1그룹", "운영 2그룹", "운영 3그룹", "운영 4그룹"].map(group => (
                                <button key={group} onClick={() => onGroupChange(group)} className={`px-3 py-1 text-xs rounded-md transition-all ${settings.selectedGroup === group ? 'bg-white dark:bg-zinc-700 shadow-sm font-bold text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>{group.replace("운영 ", "")}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">오늘</button>
                        <button onClick={handleNext} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex-1 min-h-0">{calendarMode === 'week' ? renderWeekView() : renderMonthView()}</div>
            </div>
            {selectedTodo && <TodoModal todo={selectedTodo} onClose={() => setSelectedTodo(null)} onSave={handleSaveTodo} onDelete={handleDeleteTodo} />}
        </>
    );
};

// ---------------------------------------------------------
// 🟢 4. 멘탈 관리 컴포넌트 (MentalDetailView)
// ---------------------------------------------------------
// [App.jsx] - MentalDetailView (삭제 확인 팝업 제거됨)

const MentalDetailView = ({ mental, setMental, handleSendMessage }) => {
    const [diaryInput, setDiaryInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleDiarySubmit = async () => {
        if (!diaryInput.trim()) return;
        setIsAnalyzing(true);
        await handleSendMessage(null, `일기: ${diaryInput}`);
        setDiaryInput('');
        setIsAnalyzing(false);
    };

    // 🟢 [수정] 로그 삭제 핸들러 (기록 없으면 0점/기록 없음 처리)
    const handleDeleteLog = (id) => {
        // 🟢 [수정] 상태 업데이트와 동시에 파일 강제 저장
        setMental(prev => {
            const newLogs = prev.logs.filter(log => log.id !== id);

            const todayStr = new Date().toISOString().split('T')[0];
            const todayLogs = newLogs.filter(log => log.date === todayStr);

            let newScore = 0;
            if (todayLogs.length > 0) {
                const total = todayLogs.reduce((acc, cur) => acc + cur.score, 0);
                newScore = Math.round(total / todayLogs.length);
            } else {
                newScore = 0;
            }

            const latestLog = newLogs.length > 0 ? newLogs[0] : null;
            const newMood = latestLog ? latestLog.mood : '기록 없음';

            const newMentalData = {
                ...prev,
                logs: newLogs,
                currentMood: newMood,
                score: newScore,
                todayAdvice: todayLogs.length > 0 ? prev.todayAdvice : ""
            };

            // 🔥 즉시 저장
            ipcRenderer.send('save-mental', newMentalData);

            return newMentalData;
        });
    };

    const lineChartData = [...mental.logs].reverse().map(log => ({ date: log.date.slice(5), score: log.score }));
    const moodCounts = mental.logs.reduce((acc, log) => { acc[log.mood] = (acc[log.mood] || 0) + 1; return acc; }, {});
    const pieChartData = Object.keys(moodCounts).map(key => ({ name: key, value: moodCounts[key] }));
    const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-xl"><p className="text-[10px] text-zinc-400 font-bold mb-1">{label}</p><p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{payload[0].value}{payload[0].name === 'score' ? '점' : '회'}</p></div>);
        }
        return null;
    };

    const getScoreColor = (score) => {
        if (score === 0) return "text-zinc-300"; // 0점일 때 회색 처리
        if (score >= 80) return "text-emerald-500";
        if (score >= 50) return "text-indigo-500";
        return "text-rose-500";
    };

    return (
        <div className="h-full flex flex-col gap-4 animate-fade-in p-2 overflow-hidden">
            <div className="grid grid-cols-3 gap-4 flex-shrink-0 h-[300px]">
                <div className="col-span-2 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4"><div className="flex items-baseline gap-2"><span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mental Analytics</span><span className={`text-2xl font-black ${getScoreColor(mental.score)}`}>{mental.score}</span></div><div className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">Last 7 Days</div></div>
                    <div className="flex-1 flex gap-4 min-h-0">
                        <div className="flex-[2] relative"><ResponsiveContainer width="100%" height="100%"><LineChart data={lineChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb40" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} dy={10} /><YAxis hide domain={[0, 100]} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#6366f1' }} /></LineChart></ResponsiveContainer></div>
                        <div className="w-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
                        <div className="flex-1 relative"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">{pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip content={<CustomTooltip />} /><Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} layout="horizontal" verticalAlign="bottom" align="center" /></PieChart></ResponsiveContainer></div>
                    </div>
                </div>
                <div className="col-span-1 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-2 flex items-center gap-2"><Sparkles size={14} className="text-amber-500" /> 마음 기록</h3>
                    <textarea value={diaryInput} onChange={(e) => setDiaryInput(e.target.value)} placeholder="오늘 하루는 어땠나요?" className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500/50 outline-none mb-3" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDiarySubmit(); } }} />
                    <div className="flex justify-end"><button onClick={handleDiarySubmit} disabled={isAnalyzing || !diaryInput.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20">{isAnalyzing ? '분석 중...' : '기록하기'} <Send size={12} /></button></div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 border-t border-zinc-100 dark:border-zinc-800/50 pt-2">
                <div className="space-y-3">
                    {mental.logs.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-zinc-400 opacity-60 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl mt-4"><BookOpen size={32} strokeWidth={1.5} /><p className="text-xs mt-2 font-medium">아직 기록된 마음 일기가 없습니다.</p></div>
                    ) : (
                        mental.logs.map((log) => {
                            // 🟢 [추가] 시간 표시 로직 (저장된 time이 없으면 id로 계산)
                            const displayTime = log.time || new Date(log.id).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

                            return (
                                <div key={log.id} className="bg-white dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group relative">
                                    <button onClick={() => handleDeleteLog(log.id)} className="absolute top-4 right-4 p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="삭제"><Trash2 size={14} /></button>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            {/* ▼▼▼ 날짜와 시간을 같이 표시하도록 수정 ▼▼▼ */}
                                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1">
                                                {log.date} <span className="text-zinc-300">|</span> {displayTime}
                                            </span>

                                            <div className="flex gap-1">
                                                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">#{log.mood}</span>
                                                {log.tags && log.tags.map((tag, i) => (<span key={i} className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">#{tag}</span>))}
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 font-bold ${getScoreColor(log.score)} pr-8`}><Heart size={12} className="fill-current" /><span className="text-xs">{log.score}점</span></div>
                                    </div>
                                    {/* ... (나머지 내용 동일) */}
                                    <div className="mb-3 pl-1 border-l-2 border-zinc-200 dark:border-zinc-700"><p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic pl-2">"{log.summary}"</p></div>
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30 relative"><Bot size={14} className="absolute top-3 left-3 text-indigo-500" /><p className="text-xs text-zinc-700 dark:text-zinc-300 pl-6 leading-relaxed font-medium">{log.advice}</p></div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------
// 🟢 [개편] 자기개발 뷰: 교재 검색 -> 선택 -> 커리큘럼 생성
// ---------------------------------------------------------
// 🟢 [신규] 입력/수정용 모달 (prompt 대체)
const InputModal = ({ isOpen, type, title, value, onClose, onConfirm }) => {
    const [inputValue, setInputValue] = React.useState(value);

    React.useEffect(() => { if (isOpen) setInputValue(value); }, [isOpen, value]);

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
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
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

// 🟢 [수정됨] 하위추가/수정/삭제 버튼 시인성 개선 (색상 적용 및 크기 확대)
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

    // 루트 아이템은 상세 뷰 헤더에서 보여주므로 패스
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

                            {/* 🟢 [신규] 레벨 뱃지 표시 */}
                            {item.masteryLevel && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ml-3 shadow-sm ${
                                    // 기존 데이터("Lv.5 마스터 👑")가 있어도 "Lv.5 👑"처럼 보이게 처리
                                    // 저장 로직을 바꿨으므로 새로 저장되는 건 자동으로 심플해짐
                                    item.masteryLevel.includes('Lv.5') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        item.masteryLevel.includes('Lv.4') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            item.masteryLevel.includes('Lv.3') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-zinc-100 text-zinc-500 border-zinc-200'
                                    }`}>
                                    {/* 만약 기존 데이터("마스터")가 남아있다면 화면에서만이라도 지워줌 */}
                                    {item.masteryLevel.replace(/ [가-힣]+ /, ' ')}
                                </span>
                            )}

                        </p>
                        {item.note && <div className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Edit3 size={8} /> 노트</div>}
                    </div>
                </div>

                {/* 🟢 [수정] 액션 버튼 그룹 시인성 개선 */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!hasChildren && (
                        <button
                            onClick={(e) => handleAIStudy(e, item.title, parentTitle, item.note)}
                            className="px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded hover:bg-indigo-100 transition-colors flex items-center gap-1 mr-1"
                        >
                            <Sparkles size={12} /> AI 점검
                        </button>
                    )}

                    {/* + 추가 버튼 (초록색 계열) */}
                    <button onClick={(e) => handleAddClick(e, item.id)} className="p-1.5 text-emerald-500/70 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors" title="하위 추가">
                        <Plus size={14} />
                    </button>

                    {/* 수정 버튼 (파란색 계열) */}
                    <button onClick={(e) => handleEditClick(e, item.id, item.title)} className="p-1.5 text-indigo-500/70 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors" title="수정">
                        <Edit3 size={14} />
                    </button>

                    {/* 삭제 버튼 (붉은색 계열) */}
                    <button onClick={(e) => requestDelete(e, item.id, item.title)} className="p-1.5 text-rose-500/70 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors" title="삭제">
                        <Trash2 size={14} />
                    </button>
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

const BookShelfCard = ({ book, onClick, onDelete, onToggleStar }) => {
    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) {
            return node && node.done ? 100 : 0;
        }
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };
    const progress = calculateProgress(book);

    // 🟢 로컬 파일 열기 핸들러
    const handleOpenFile = (e) => {
        e.stopPropagation();
        if (book.path) ipcRenderer.send('open-local-file', book.path);
    };

    return (
        <div onClick={onClick} className="group relative flex flex-col gap-2 cursor-pointer animate-fade-in">
            {/* 책 표지 영역 */}
            <div className={`relative aspect-[1/1.4] w-full overflow-hidden rounded-lg shadow-md border bg-zinc-100 dark:bg-zinc-800 transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl ${book.isStarred ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-zinc-200 dark:border-zinc-800'}`}>

                {/* 🟢 이미지 또는 PDF 아이콘 표시 */}
                {book.cover ? (
                    <img src={book.cover} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                    <div className={`flex h-full w-full flex-col items-center justify-center gap-3 ${book.isLocal ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-400' : 'text-zinc-400'}`}>
                        {book.isLocal ? <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm"><FileText size={32} /></div> : <BookOpen size={32} strokeWidth={1.5} />}
                        {book.isLocal && <span className="text-[10px] font-bold uppercase tracking-wider">PDF DOC</span>}
                    </div>
                )}

                {/* 즐겨찾기 버튼 */}
                <button onClick={(e) => { e.stopPropagation(); onToggleStar(e, book.id); }} className={`absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full transition-all z-20 shadow-sm ${book.isStarred ? 'bg-amber-400 text-white opacity-100 scale-100' : 'bg-black/40 text-white/50 hover:bg-amber-400 hover:text-white opacity-0 group-hover:opacity-100'}`}>
                    <Star size={16} fill={book.isStarred ? "currentColor" : "none"} strokeWidth={book.isStarred ? 0 : 2} />
                </button>

                {/* 우측 상단 삭제 버튼 */}
                <button onClick={(e) => { e.stopPropagation(); onDelete(e, book.id, book.title); }} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 z-10">
                    <Trash2 size={14} />
                </button>

                {/* 🟢 [신규] PDF 파일 바로 열기 버튼 (중앙 하단) */}
                {book.isLocal && (
                    <button onClick={handleOpenFile} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 hover:bg-indigo-600 text-white text-[10px] font-bold rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 z-20">
                        <ExternalLink size={10} /> 파일 열기
                    </button>
                )}

                {/* 진행률 오버레이 */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-200/50">
                    <div style={{ width: `${progress}%` }} className="h-full bg-emerald-500 transition-all duration-500"></div>
                </div>
            </div>

            {/* 정보 영역 */}
            <div>
                <div className="h-[2.8rem] flex items-start overflow-hidden mb-1">
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2" title={book.title}>{book.title}</h3>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{book.author}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{progress}% 완료</span>
                    {book.isStarred && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5"><Star size={8} fill="currentColor" /> 고정됨</span>}
                </div>
            </div>
        </div>
    );
};

// 🟢 [전체 코드] DevelopmentDetailView: 서재, 검색, 그리고 리치 에디터 모달 포함
const DevelopmentDetailView = ({ dev, setDev, handleSendMessage, activeBookId, setActiveBookId }) => {
    // --- State ---
    const [loadingState, setLoadingState] = useState({
        isLoading: false,
        message: '',
        progress: 0,       // 화면에 보여질 숫자 (예: 31, 32, 33...)
        targetProgress: 0  // 최종 목표 숫자 (예: 50)
    });

    // 🟢 [신규] 목표치까지 숫자를 부드럽게 올려주는 애니메이션 효과
    useEffect(() => {
        let interval;
        if (loadingState.isLoading && loadingState.progress < loadingState.targetProgress) {
            interval = setInterval(() => {
                setLoadingState(prev => {
                    // 목표에 도달했으면 멈춤
                    if (prev.progress >= prev.targetProgress) return prev;

                    // 남은 거리에 따라 속도 조절 (많이 남았으면 성큼, 조금 남았으면 찔끔)
                    const diff = prev.targetProgress - prev.progress;
                    const increment = diff > 20 ? 2 : 1;

                    // 랜덤성을 섞어서 기계적인 느낌 제거 (가끔 멈칫하거나 2씩 오름)
                    const randomAdd = Math.random() > 0.5 ? increment : 0;

                    return { ...prev, progress: Math.min(prev.progress + randomAdd, prev.targetProgress) };
                });
            }, 50); // 0.05초마다 실행 (부드러운 움직임)
        }
        return () => clearInterval(interval);
    }, [loadingState.isLoading, loadingState.progress, loadingState.targetProgress]);

    const [inputTopic, setInputTopic] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const searchResults = dev.searchResults || [];
    const [searchPage, setSearchPage] = useState(1);

    // 모달 State
    const [inputModalState, setInputModalState] = useState({ isOpen: false, type: '', targetId: null, initialValue: '', title: '' });
    const [noteModalState, setNoteModalState] = useState({ isOpen: false, itemId: null, itemTitle: '', content: '' }); // content는 이제 HTML 문자열

    // 계산기 토글 State
    const [showCalc, setShowCalc] = useState(false);

    // 에디터 Ref
    const editorRef = useRef(null);

    // 기타 Modal State
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

    // 👇👇 이 부분들이 빠져서 에러가 난 것입니다 👇👇
    const [studyMode, setStudyMode] = useState('summary'); // 'summary' | 'quiz' | 'result'
    const [quizData, setQuizData] = useState([]);          // 퀴즈 데이터
    const [userAnswers, setUserAnswers] = useState({});    // 사용자 답안
    const [quizScore, setQuizScore] = useState(0);         // 퀴즈 점수
    const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);
    const ITEMS_PER_PAGE = 4;
    const currentBooks = searchResults.slice((searchPage - 1) * ITEMS_PER_PAGE, searchPage * ITEMS_PER_PAGE);

    // 🟢 [복구] 드래그 앤 드롭 참조 변수
    const dragItem = useRef();
    const dragOverItem = useRef();

    // 🟢 [복구] 책 드래그 시작 핸들러 (즐겨찾기 고정 로직 포함)
    const onBookDragStart = (e, position) => {
        // 🚨 핵심: 즐겨찾기(isStarred)된 책은 드래그 시작을 막습니다.
        if (dev.tasks[position].isStarred) {
            e.preventDefault();
            return;
        }
        dragItem.current = position;
    };

    // 🟢 [복구] 책 드래그 중 순서 변경 핸들러 (고정된 위치 침범 방지)
    const onBookDragEnter = (e, position) => {
        e.preventDefault();

        if (dragItem.current === null || dragItem.current === undefined) return;
        if (dragItem.current === position) return;

        // 🚨 핵심: 이동하려는 목표 위치(position)에 있는 책이 즐겨찾기 상태라면 이동을 막습니다.
        // (즉, 고정된 책들 사이나 그 위로 끼어들 수 없음)
        if (dev.tasks[position].isStarred) return;

        const copyListItems = [...(dev.tasks || [])];
        const dragItemContent = copyListItems[dragItem.current];

        // 배열 재정렬
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(position, 0, dragItemContent);

        dragItem.current = position;
        dragOverItem.current = position;

        setDev(prev => ({ ...prev, tasks: copyListItems }));
    };

    // 🟢 [복구] 책 드래그 종료 핸들러
    const onBookDragEnd = (e) => {
        dragItem.current = null;
        dragOverItem.current = null;
    };

    // --- 핸들러 생략 없이 구현 ---
    const toggleExpand = (id) => { setExpandedItems(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
    const toggleDone = (e, targetId) => {
        e.stopPropagation();
        const updateItems = (items) => {
            return items.map(item => {
                if (item.id === targetId) {
                    const newDone = !item.done;
                    const updateChildren = (children) => children.map(c => ({ ...c, done: newDone, children: c.children ? updateChildren(c.children) : [] }));
                    return { ...item, done: newDone, children: item.children ? updateChildren(item.children) : [] };
                }
                if (item.children) { return { ...item, children: updateItems(item.children) }; }
                return item;
            });
        };
        setDev(prev => ({ ...prev, tasks: updateItems(prev.tasks || []) }));
    };

    // 🟢 [신규] 즐겨찾기 핸들러
    const handleToggleStar = (e, bookId) => {
        setDev(prev => {
            let newTasks = prev.tasks.map(task =>
                task.id === bookId ? { ...task, isStarred: !task.isStarred } : task
            );
            // 즐겨찾기 우선 정렬
            newTasks.sort((a, b) => {
                if (a.isStarred === b.isStarred) return 0;
                return a.isStarred ? -1 : 1;
            });
            return { ...prev, tasks: newTasks };
        });
    };

    const requestDelete = (e, id, title) => {
        e.stopPropagation();
        setDeleteTarget({ id, title });
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        const deleteRecursive = (items) => {
            return items
                .filter(item => item.id !== deleteTarget.id)
                .map(item => ({ ...item, children: item.children ? deleteRecursive(item.children) : [] }));
        };

        // 🟢 [수정] 상태 업데이트와 동시에 파일 강제 저장
        setDev(prev => {
            const newTasks = deleteRecursive(prev.tasks || []);
            const newDev = { ...prev, tasks: newTasks };

            // 🔥 즉시 저장 (이 코드가 핵심입니다)
            ipcRenderer.send('save-development', newDev);

            return newDev;
        });

        setShowDeleteModal(false);
        setDeleteTarget(null);
    };

    const handleEditClick = (e, targetId, oldTitle) => {
        e.stopPropagation();
        setInputModalState({ isOpen: true, type: 'edit', targetId: targetId, initialValue: oldTitle, title: '항목 수정' });
    };

    const handleAddClick = (e, parentId) => {
        e.stopPropagation();
        setInputModalState({ isOpen: true, type: 'add', targetId: parentId, initialValue: '', title: '하위 항목 추가' });
    };

    // 🟢 [신규] 노트 열기 핸들러
    const handleOpenNote = (item) => {
        setNoteModalState({
            isOpen: true,
            itemId: item.id,
            itemTitle: item.title,
            content: item.note || '' // 기존 노트가 있으면 불러오기
        });
    };

    // 🟢 [신규] 노트 저장 핸들러
    const handleSaveNote = () => {
        const { itemId, content } = noteModalState;

        // 1. HTML 태그와 공백(&nbsp;)을 제거하고 순수 텍스트가 있는지 확인
        const plainText = content
            .replace(/<[^>]*>?/gm, '') // HTML 태그 제거
            .replace(/&nbsp;/g, '')    // 공백 엔티티 제거
            .trim();                   // 앞뒤 공백 제거

        // 2. 텍스트가 없으면 null로 저장 (그래야 뱃지가 사라짐), 있으면 원래 HTML 내용 저장
        const noteToSave = plainText.length === 0 ? null : content;

        const updateRecursive = (items) => {
            return items.map(item => {
                if (item.id === itemId) {
                    return { ...item, note: noteToSave };
                }
                if (item.children) {
                    return { ...item, children: updateRecursive(item.children) };
                }
                return item;
            });
        };

        setDev(prev => ({ ...prev, tasks: updateRecursive(prev.tasks || []) }));
        setNoteModalState(prev => ({ ...prev, isOpen: false }));
    };

    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) {
            return node && node.done ? 100 : 0;
        }
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    // 🟢 [신규] 전체 커리큘럼 분석 및 피드백 생성 핸들러
    const handleAnalyzeCurriculum = async () => {
        if (!activeBook) return;
        setIsGenerating(true); // 로딩 스피너 활용

        // 1. 현재 책의 학습 상태 추출
        const studyStatus = extractStudyStatus(activeBook.children || []);
        const totalProgress = calculateProgress(activeBook);

        // 2. 학습 데이터가 너무 없으면 기본 문구 처리
        if (studyStatus.length === 0) {
            alert("아직 학습 기록(퀴즈 결과)이 부족합니다. 먼저 학습을 진행해주세요!");
            setIsGenerating(false);
            return;
        }

        // 3. AI 프롬프트 전송
        const prompt = `
        [Role] Professional Study Coach
        [Task] Analyze the student's study status and provide a 1-sentence strategic advice.
        [Current Book] ${activeBook.title} (Total Progress: ${totalProgress}%)
        [Study History & Levels]
        ${JSON.stringify(studyStatus, null, 2)}

        [Analysis Logic]
        1. Identify the "Weakest Link" (Lowest Level or Low Scores).
        2. If all are high, recommend the next unstudied chapter.
        3. Be encouraging but specific.

        [Output Format]
        Just the advice text in Korean. (No JSON, No Markdown).
        Example: "제2장 기본 회로소자의 점수가 낮습니다(Lv.2). 이 부분을 우선적으로 복습하는 것을 추천합니다."
        `;

        const advice = await handleSendMessage(null, prompt);

        // 4. 피드백 저장 (책 객체에 'aiFeedback' 필드 추가)
        setDev(prev => {
            const updateRecursive = (items) => items.map(item => item.id === activeBook.id ? { ...item, aiFeedback: advice } : item);
            return { ...prev, tasks: updateRecursive(prev.tasks) };
        });

        setIsGenerating(false);
    };

    // 🟢 [1단계] AI 학습 보조 (요약 화면 열기)
    const handleAIStudy = async (e, topic, parentTitle, userNote) => {
        if (e) e.stopPropagation();

        // 상태 초기화
        setStudyMode('summary');
        setQuizData([]);
        setUserAnswers({});
        setQuizScore(0);

        setAiModalContent({ title: topic, content: '' });
        setIsAiLoading(true);
        setShowAiModal(true);

        // 요약 프롬프트
        const prompt = `
        [Role] Professional Tutor
        [Topic] ${topic} (from ${parentTitle})
        [Task] Explain the key concepts of '${topic}' concisely with bullet points.
        If user note exists ("${userNote || ''}"), check for misunderstandings.
        `;

        const response = await handleSendMessage(null, prompt);
        setAiModalContent({ title: topic, content: response });
        setIsAiLoading(false);
    };

    // 🟢 [2단계] 퀴즈 생성 핸들러
    const handleGenerateQuiz = async () => {
        setStudyMode('quiz');
        setIsAiLoading(true);
        setQuizData([]);

        const topic = aiModalContent.title;

        // 1. 현재 주제의 내 레벨 찾기 (dev 상태에서 탐색)
        let currentLevel = "Lv.1 입문 (정보 없음)";
        let historyCount = 0;

        const findLevel = (items) => {
            for (const item of items) {
                if (item.title === topic) {
                    if (item.masteryLevel) currentLevel = item.masteryLevel;
                    if (item.quizHistory) historyCount = item.quizHistory.length;
                    return;
                }
                if (item.children) findLevel(item.children);
            }
        };
        findLevel(dev.tasks || []);

        console.log(`🤖 AI 난이도 조정 요청: ${topic} (현재 레벨: ${currentLevel})`);

        // 2. 레벨에 따른 프롬프트 전략 수립
        let difficultyInstruction = "";
        if (currentLevel.includes("Lv.5") || currentLevel.includes("Lv.4")) {
            difficultyInstruction = "User is an EXPERT. Generate HARD, complex scenario-based questions. Focus on edge cases and deep theory.";
        } else if (currentLevel.includes("Lv.3")) {
            difficultyInstruction = "User is Intermediate. Mix basic and application questions.";
        } else {
            difficultyInstruction = "User is a BEGINNER. Focus on basic definitions and core concepts. Use simple language.";
        }

        // 3. 프롬프트 구성
        const prompt = `
    [Task] Create a Multiple Choice Quiz (CBT Style)
    [Topic] ${topic}
    [User Level] ${currentLevel} (Studied ${historyCount} times)
    [Difficulty Instruction] ${difficultyInstruction}
    
    [Quantity] 10 questions (Adjusted to user level)
    [Language] Korean (한국어)

    [Output Format]
    Strictly output a JSON Array ONLY. No markdown.
    [
      {
        "id": 1,
        "question": "Question text?",
        "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
        "answer": 0,
        "explanation": "Why this is correct (tailored to user level)."
      }
    ]
    `;

        try {
            const responseText = await handleSendMessage(null, prompt);
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedQuiz = JSON.parse(cleanJson);
            setQuizData(parsedQuiz);
        } catch (error) {
            console.error("Quiz Generation Failed:", error);
            alert("퀴즈 생성 실패. 다시 시도해주세요.");
            setStudyMode('summary');
        } finally {
            setIsAiLoading(false);
        }
    };

    // 🟢 [3단계] 퀴즈 제출 및 채점
    // 🟢 [업그레이드] 퀴즈 제출 및 '학습 수준(Mastery)' 저장/케어 시스템
    const handleSubmitQuiz = () => {
        let correctCount = 0;
        quizData.forEach((q, idx) => {
            if (userAnswers[idx] === q.answer) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / quizData.length) * 100);
        setQuizScore(score);
        setStudyMode('result'); // 결과 화면으로 전환

        // 🌟 1. 현재 학습 중인 주제(Topic) 찾아서 점수 기록하기
        const targetTopic = aiModalContent.title; // 현재 학습 중인 주제

        // 🌟 레벨 계산 헬퍼 함수 (문구 수정됨)
        const calculateLevel = (history) => {
            if (!history || history.length === 0) return 'Lv.1 🥚';
            const avg = history.reduce((a, b) => a + b, 0) / history.length;

            // "마스터", "고급" 등의 텍스트 제거 -> 심플하게 변경
            if (avg >= 90) return 'Lv.5 👑';
            if (avg >= 80) return 'Lv.4 🎓';
            if (avg >= 70) return 'Lv.3 📘';
            if (avg >= 50) return 'Lv.2 🌱';
            return 'Lv.1 🥚';
        };

        setDev(prev => {
            const updateRecursive = (items) => {
                return items.map(item => {
                    // 주제 이름이 일치하면 점수 업데이트
                    if (item.title === targetTopic) {
                        const newHistory = [...(item.quizHistory || []), score]; // 기존 점수 배열 + 새 점수
                        const newLevel = calculateLevel(newHistory); // 새 평균으로 레벨 재산정

                        // 🌟 로그 찍어서 확인
                        console.log(`[학습 케어] '${item.title}' 업데이트: 점수 ${score}점, 레벨 ${newLevel}`);

                        return {
                            ...item,
                            quizHistory: newHistory,
                            masteryLevel: newLevel,
                            lastStudied: new Date().toISOString().split('T')[0] // 마지막 학습일
                        };
                    }
                    if (item.children) {
                        return { ...item, children: updateRecursive(item.children) };
                    }
                    return item;
                });
            };
            return { ...prev, tasks: updateRecursive(prev.tasks || []) };
        });
    };

    // ... (기존 모달 핸들러들: handleInputConfirm, handleCreateCurriculum 등) ...
    const handleInputConfirm = (inputValue) => {
        if (!inputValue || !inputValue.trim()) return;
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

    // [수정된 handleSearchBooks]
    const handleSearchBooks = async () => {
        if (!inputTopic.trim()) return;
        setIsSearching(true);
        setSearchPage(1);

        try {
            const results = await ipcRenderer.invoke('search-naver-books', inputTopic);

            // 1. 변수에 결과를 먼저 담습니다.
            const formattedResults = results.map(b => ({
                title: b.title.replace(/<[^>]+>/g, ''), // HTML 태그 제거
                author: b.author.replace(/\^/g, ', ').replace(/<[^>]+>/g, ''),
                publisher: b.publisher.replace(/<[^>]+>/g, ''),
                cover: b.image,
                link: b.link
            }));

            // 2. 전역 상태(dev)를 업데이트합니다. (이러면 파일 저장도 자동으로 됩니다)
            setDev(prev => ({
                ...prev,
                searchResults: formattedResults
            }));

        } catch (e) {
            console.error(e);
            alert("검색 중 오류가 발생했습니다.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectBook = (book) => { setSelectedBookForToc(book); setShowTocModal(true); setManualToc(''); };

    // 🟢 [핵심 수정 2] 커리큘럼 생성 핸들러
    const handleCreateCurriculum = async () => {
        if (!selectedBookForToc) return;
        setIsGenerating(true);

        const instruction = manualToc.trim()
            ? `[User Provided TOC]\n${manualToc}\n\nIMPORTANT: Use the provided TOC text to construct the hierarchy.`
            : `[Instruction]\nCreate a standard curriculum based on your knowledge of this book.`;

        const prompt = `
        [Action] Generate Curriculum
        [Target Book] ${selectedBookForToc.title}
        [Meta Info] Cover: ${selectedBookForToc.cover}, Author: ${selectedBookForToc.author}, Publisher: ${selectedBookForToc.publisher}
        
        ${instruction}

        [Filtering Rules]
        1. **EXCLUDE** non-content items: "연습문제", "해답", "정답", "풀이", "머리말", "부록", "찾아보기", "참고문헌".
        2. **FOCUS ONLY** on the main learning chapters, theories, and concepts.
        3. If an item is named "Chapter X. Title", keep "Title" or "Chapter X. Title".
        
        [Format] STRICT JSON only: { 
            "action": "generate_curriculum", 
            "title": "${selectedBookForToc.title}", 
            "cover": "${selectedBookForToc.cover}", 
            "author": "${selectedBookForToc.author}", 
            "publisher": "${selectedBookForToc.publisher}", 
            "children": [
                {
                    "title": "Chapter Title",
                    "children": [ { "title": "Sub-topic 1" } ]
                }
            ] 
        }
        `;

        await handleSendMessage(null, prompt);

        setIsGenerating(false);
        setShowTocModal(false);

        // 🔴 [삭제] setSearchResults([]); -> handleSendMessage 안에서 setDev로 이미 처리됨
        setInputTopic('');
        setSelectedBookForToc(null);
    };

    const handleUploadPDF = async () => {
        try {
            // 0. 초기화
            const filePath = await ipcRenderer.invoke('select-pdf');
            if (!filePath) return;

            const fileName = filePath.split(/[/\\]/).pop();
            const title = fileName.replace('.pdf', '');

            // 1. 파일 열기 시작 -> 목표 30% 설정
            // (useEffect가 0에서 30까지 부드럽게 채워줌)
            setLoadingState({
                isLoading: true,
                message: '📂 PDF 파일을 열고 있습니다...',
                progress: 0,
                targetProgress: 30
            });

            // 파일 로딩 흉내 (너무 빠르면 재미없으니 0.5초 대기)
            await new Promise(r => setTimeout(r, 500));

            // 2. 텍스트 추출 시작 -> 목표 60% 설정
            // (30에서 60까지 서서히 올라감)
            setLoadingState(prev => ({
                ...prev,
                message: '📑 문서 내용을 추출하고 있습니다...\n(이미지가 많으면 시간이 걸릴 수 있습니다)',
                targetProgress: 60
            }));

            const rawText = await ipcRenderer.invoke('extract-pdf-text', filePath);

            const LIMIT = 300000;
            const tocContext = rawText.length > LIMIT ? rawText.slice(0, LIMIT) + "..." : rawText;

            // 3. AI 분석 요청 -> 목표 95% 설정
            // (여기서 AI가 응답할 때까지 60 -> 95로 천천히 올라가며 사용자를 안심시킴)
            setLoadingState(prev => ({
                ...prev,
                message: `🤖 AI가 ${tocContext.length.toLocaleString()}자 분량의 텍스트를 분석하여\n커리큘럼을 생성합니다...`,
                targetProgress: 95
            }));

            // 🟢 [프롬프트 수정] 요약 금지 & 전체 추출 강조
            const prompt = `
            [Action] Generate Curriculum from PDF
            [File Name] ${title}
            
            [Instruction]
            1. Search for the **"Table of Contents"** or **"Contents"** section in the text provided below.
            2. **CRITICAL:** The TOC spans multiple pages. **Do NOT stop** after the first few chapters.
            3. You MUST extract **ALL** chapters and sub-sections found in the text, from the beginning of the TOC to the very end.
            4. **DO NOT SUMMARIZE.** Keep the full hierarchy and exact titles as they appear in the document.
            5. If the TOC goes from Chapter 1 to Chapter 10, ensure ALL 10 chapters are included in the JSON.

            [PDF Text Content (First ${LIMIT} chars)]
            ${tocContext}
            
            [Output Format] STRICT JSON only: { 
                "action": "generate_curriculum", 
                "title": "${title}", 
                "cover": "", 
                "author": "Local Document", 
                "publisher": "PDF File", 
                "path": "${filePath.replace(/\\/g, '\\\\')}", 
                "isLocal": true,
                "children": [
                    {
                        "title": "1. Introduction ...",
                        "children": [ { "title": "1.1 ..." } ]
                    },
                    {
                        "title": "...", 
                        "children": []
                    }
                ] 
            }
            `;

            await handleSendMessage(null, prompt);

            // 4. 완료! -> 100%로 점프
            setLoadingState(prev => ({ ...prev, message: '완료!', targetProgress: 100, progress: 100 }));

            // 잠시 후 닫기
            setTimeout(() => {
                setLoadingState({ isLoading: false, message: '', progress: 0, targetProgress: 0 });
            }, 800);

        } catch (error) {
            console.error(error);
            setLoadingState({ isLoading: false, message: '', progress: 0, targetProgress: 0 });
            alert("파일 처리 중 오류가 발생했습니다.");
        }
    };

    const activeBook = (dev.tasks || []).find(b => b.id === activeBookId);

    // 🟢 서재 뷰
    // 🟢 서재 뷰 (Grid) 렌더링
    const renderBookshelf = () => (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-8 p-6 animate-fade-in-up">

            {/* 🟢 1. 교재 검색 추가 버튼 */}
            <div className="group flex flex-col gap-3 cursor-pointer" onClick={() => document.getElementById('book-search-input').focus()}>
                <div className="aspect-[1/1.4] w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 group-hover:border-emerald-500 group-hover:text-emerald-500 group-hover:bg-emerald-50/10 transition-all bg-zinc-50/50 dark:bg-zinc-800/30">
                    <Search size={28} strokeWidth={1.5} />
                    <span className="text-xs font-bold mt-2">교재 검색</span>
                </div>
                <div className="h-10"></div>
            </div>

            {/* 🟢 2. [신규] PDF 업로드 버튼 */}
            <div className="group flex flex-col gap-3 cursor-pointer" onClick={handleUploadPDF}>
                <div className="aspect-[1/1.4] w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 group-hover:border-rose-500 group-hover:text-rose-500 group-hover:bg-rose-50/10 transition-all bg-zinc-50/50 dark:bg-zinc-800/30">
                    <FileText size={28} strokeWidth={1.5} />
                    <span className="text-xs font-bold mt-2">PDF 등록</span>
                </div>
                <div className="h-10"></div>
            </div>

            {/* 책 목록 */}
            {(dev.tasks || []).map((book, index) => (
                <div key={book.id} draggable onDragStart={(e) => onBookDragStart(e, index)} onDragEnter={(e) => onBookDragEnter(e, index)} onDragEnd={onBookDragEnd} onDragOver={(e) => e.preventDefault()} className="cursor-move transition-transform active:scale-95">
                    <BookShelfCard book={book} onClick={() => setActiveBookId(book.id)} onDelete={requestDelete} onToggleStar={handleToggleStar} />
                </div>
            ))}
        </div>
    );

    // 🟢 상세 뷰 (커리큘럼)
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
                {/* 🟢 헤더 영역: [왼쪽: 유동적 너비] + [오른쪽: 고정 너비] */}
                <div className="flex items-start gap-4 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">

                    {/* 1. 왼쪽: 책 정보 (flex-1로 남는 공간 차지, min-w-0로 텍스트 넘침 방지) */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <button onClick={() => setActiveBookId(null)} className="mt-1 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0">
                            <ChevronLeft size={24} className="text-zinc-500" />
                        </button>

                        <div className="w-20 h-28 bg-zinc-200 rounded-lg overflow-hidden shadow-sm flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                            {activeBook.cover ? (
                                <img src={activeBook.cover} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} className="text-zinc-400" /></div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between h-28 py-0.5">
                            <div>
                                {/* 🌟 여기가 핵심: 제목이 길면 2줄까지만 보여주고 ... 처리 */}
                                <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight line-clamp-2 break-keep mb-1" title={activeBook.title}>
                                    {activeBook.title}
                                </h2>
                                <p className="text-xs text-zinc-500 truncate">{activeBook.author}</p>
                            </div>

                            {/* 진행률 바 */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div style={{ width: `${progress}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500"></div>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">{progress}% 완료</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. 오른쪽: AI 코칭 블록 (flex-shrink-0으로 절대 안 줄어들게 고정) */}
                    <div className="w-[280px] lg:w-[320px] flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-center relative h-28">
                        <div className="flex items-start gap-3 h-full overflow-hidden">
                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg text-indigo-500 shadow-sm flex-shrink-0 mt-1">
                                <Bot size={18} />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-1 flex-shrink-0">
                                    <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300">AI 학습 코치</h4>
                                    <button
                                        onClick={handleAnalyzeCurriculum}
                                        disabled={isGenerating}
                                        className="text-[10px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-1 text-zinc-500 flex-shrink-0"
                                    >
                                        {isGenerating ? <div className="w-2 h-2 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /> : <Sparkles size={10} />}
                                        분석
                                    </button>
                                </div>
                                {/* 텍스트 영역도 스크롤/말줄임 처리 */}
                                <div className="flex-1 overflow-y-auto scrollbar-hide">
                                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug break-keep">
                                        {activeBook.aiFeedback || "데이터를 분석하여 취약점을 진단해 드립니다."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* 하단: 커리큘럼 리스트 */}
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
                    <div className="flex gap-2 mb-6"><input id="book-search-input" value={inputTopic} onChange={(e) => setInputTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks()} placeholder="새로 학습할 교재 검색" className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/50" /><button onClick={handleSearchBooks} disabled={isSearching} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-70 flex items-center gap-2">{isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />} 검색</button></div>
                    {searchResults.length > 0 && (
                        <div className="mb-6 p-3 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-fade-in">
                            <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">검색 결과 ({searchResults.length})</h3><button onClick={() => setDev(prev => ({ ...prev, searchResults: [] }))} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><X size={14} /></button></div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">{currentBooks.map((book, idx) => (<div key={idx} onClick={() => handleSelectBook(book)} className="flex gap-3 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50 hover:border-emerald-500 hover:bg-emerald-50/10 cursor-pointer transition-all group bg-white dark:bg-zinc-900 items-center"><div className="w-10 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden flex-shrink-0 border border-zinc-100 dark:border-zinc-700">{book.cover ? <img src={book.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-zinc-400" /></div>}</div><div className="flex-1 min-w-0"><h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">{book.title}</h4><p className="text-xs text-zinc-500 mt-0.5 truncate">{book.author}</p></div><div className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity px-2"><Plus size={18} /></div></div>))}</div>
                        </div>
                    )}
                </>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-10">
                {activeBookId ? renderDetailView() : renderBookshelf()}
            </div>

            {/* Input Modal */}
            <InputModal isOpen={inputModalState.isOpen} type={inputModalState.type} title={inputModalState.title} value={inputModalState.initialValue} onClose={() => setInputModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={handleInputConfirm} />

            {noteModalState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div
                        className={`bg-white dark:bg-zinc-900 w-full rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[80vh] overflow-hidden animate-scale-up transition-all duration-300 ${showCalc ? 'max-w-6xl' : 'max-w-4xl'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 헤더 */}
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900">
                            <div><h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><BookOpen size={20} className="text-indigo-500" /> 학습 노트</h3><p className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">{noteModalState.itemTitle}</p></div>
                            <div className="flex gap-2 items-center">
                                <button onClick={() => setShowCalc(prev => !prev)} className={`p-2 rounded-lg transition-all border ${showCalc ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-zinc-200 text-zinc-400'}`}><Calculator size={18} /></button>
                                <button onClick={handleSaveNote} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1"><Save size={14} /> 저장</button>
                                <button onClick={() => setNoteModalState(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"><X size={20} /></button>
                            </div>
                        </div>

                        {/* 바디 */}
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* 📝 노트 영역 (Rich Editor) */}
                            <div className="flex-1 flex flex-col bg-[#fffef0] dark:bg-[#1c1c1e] relative transition-all duration-300 cursor-text" onClick={() => editorRef.current?.focus()}>
                                <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '1.9rem' }}></div>

                                {/* 툴바 */}
                                <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10" onClick={e => e.stopPropagation()}>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Editor Tools</span>
                                    <div className="h-3 w-px bg-zinc-300 dark:bg-zinc-700"></div>
                                    <button className="text-xs font-bold text-zinc-500 hover:text-zinc-800" onClick={() => document.execCommand('bold')}>B</button>
                                    <button className="text-xs italic text-zinc-500 hover:text-zinc-800" onClick={() => document.execCommand('italic')}>I</button>
                                    <button className="text-xs underline text-zinc-500 hover:text-zinc-800" onClick={() => document.execCommand('underline')}>U</button>
                                </div>

                                {/* 🟢 [교체] RichNoteEditor 사용 */}
                                <RichNoteEditor
                                    editorRef={editorRef}
                                    content={noteModalState.content} // HTML 내용
                                    setContent={(html) => setNoteModalState(prev => ({ ...prev, content: html }))}
                                />
                            </div>

                            {/* 🧮 계산기(도구함) 영역 */}
                            {showCalc && (
                                <div className="w-[340px] border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col animate-slide-in-right z-20 shadow-xl">
                                    <EngineeringMathPad
                                        onDirectInsert={(htmlVal) => {
                                            // 🟢 [핵심] 버튼 누르면 노트(에디터)에 바로 모양 삽입
                                            editorRef.current?.focus();
                                            insertHtmlAtCursor(htmlVal);
                                            // 상태 동기화
                                            setNoteModalState(prev => ({ ...prev, content: editorRef.current.innerHTML }));
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 [수정됨] AI 튜터 모달 (핵심 정리 -> CBT 퀴즈 -> 결과) */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-all p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-scale-up">
                        {/* 헤더 */}
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                            <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                <Sparkles size={20} />
                                {studyMode === 'summary' ? "AI 핵심 요약 노트" : studyMode === 'quiz' ? "실전 모의고사 (CBT)" : "시험 결과 분석"}
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-lg"><X size={18} /></button>
                        </div>

                        {/* 바디 (스크롤 영역) */}
                        <div className="flex-1 overflow-y-auto p-0 bg-zinc-50/50 dark:bg-black/20 relative">
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-500">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="font-bold text-sm text-zinc-500">{studyMode === 'quiz' ? "AI가 고난이도 문제를 출제하고 있습니다..." : "AI가 내용을 분석 중입니다..."}</p>
                                </div>
                            ) : (
                                <>
                                    {/* 1. 요약 모드 */}
                                    {studyMode === 'summary' && (
                                        <div className="p-8 max-w-3xl mx-auto">
                                            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                                {aiModalContent.content}
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. 퀴즈 모드 */}
                                    {studyMode === 'quiz' && (
                                        <div className="p-8 max-w-3xl mx-auto space-y-8">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 mb-6 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-indigo-800 dark:text-indigo-200">{aiModalContent.title} - 모의고사</h4>
                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">총 {quizData.length}문제 | 4지선다형</p>
                                                </div>
                                                <div className="text-2xl font-black text-indigo-300 dark:text-indigo-700 opacity-50">CBT</div>
                                            </div>
                                            {quizData.map((q, index) => (
                                                <div key={index} className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm">
                                                    <div className="flex gap-3 mb-4">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold flex items-center justify-center text-xs">{index + 1}</span>
                                                        <h5 className="font-bold text-zinc-800 dark:text-zinc-100 text-base leading-snug">{q.question}</h5>
                                                    </div>
                                                    <div className="space-y-2 pl-9">
                                                        {q.options.map((opt, optIdx) => (
                                                            <label key={optIdx} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${userAnswers[index] === optIdx ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 font-bold' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'}`}>
                                                                <input type="radio" name={`q-${index}`} value={optIdx} checked={userAnswers[index] === optIdx} onChange={() => setUserAnswers(prev => ({ ...prev, [index]: optIdx }))} className="hidden" />
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${userAnswers[index] === optIdx ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-400'}`}>
                                                                    {userAnswers[index] === optIdx && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                                </div>
                                                                <span className="text-sm">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 3. 결과 모드 */}
                                    {studyMode === 'result' && (
                                        <div className="p-8 max-w-3xl mx-auto space-y-8">
                                            {/* 점수판 */}
                                            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 text-center shadow-sm">
                                                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Score</h4>
                                                <div className={`text-6xl font-black mb-4 ${quizScore >= 80 ? 'text-emerald-500' : quizScore >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{quizScore}점</div>
                                                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{quizData.length}문제 중 {Math.round((quizScore / 100) * quizData.length)}문제 정답</p>
                                            </div>

                                            {/* 오답 노트 */}
                                            <div className="space-y-6">
                                                {quizData.map((q, index) => {
                                                    const isCorrect = userAnswers[index] === q.answer;
                                                    return (
                                                        <div key={index} className={`rounded-xl border p-5 ${isCorrect ? 'bg-emerald-50/30 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50/30 border-rose-100 dark:border-rose-900/30'}`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex gap-2 font-bold text-sm">
                                                                    <span className={`px-2 py-0.5 rounded text-xs ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isCorrect ? "정답" : "오답"}</span>
                                                                    <span className="text-zinc-800 dark:text-zinc-200">Q{index + 1}. {q.question}</span>
                                                                </div>
                                                            </div>
                                                            <div className="pl-14 text-sm space-y-1 mb-4 text-zinc-600 dark:text-zinc-400">
                                                                <p>내가 쓴 답: <span className={isCorrect ? 'font-bold text-emerald-600' : 'font-bold text-rose-500 line-through'}>{q.options[userAnswers[index]] || "(미응시)"}</span></p>
                                                                {!isCorrect && <p>정답: <span className="font-bold text-emerald-600">{q.options[q.answer]}</span></p>}
                                                            </div>
                                                            <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 ml-14">
                                                                <span className="font-bold mr-1">💡 해설:</span> {q.explanation}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 하단 액션바 */}
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end gap-3">
                            {studyMode === 'summary' && (
                                <>
                                    <button onClick={() => setShowAiModal(false)} className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">학습 종료</button>
                                    <button onClick={handleGenerateQuiz} disabled={isAiLoading} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                                        <CheckSquare size={16} /> 실전 문제 풀기 (15문항)
                                    </button>
                                </>
                            )}
                            {studyMode === 'quiz' && (
                                <button onClick={handleSubmitQuiz} className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all w-full md:w-auto">
                                    답안지 제출 및 채점
                                </button>
                            )}
                            {studyMode === 'result' && (
                                <>
                                    <button onClick={() => setStudyMode('summary')} className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">요약 다시보기</button>
                                    <button onClick={() => setShowAiModal(false)} className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">완료</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 [업그레이드] 단계별 진행 상황을 보여주는 로딩 오버레이 */}
            {loadingState.isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-zinc-200 dark:border-zinc-800 animate-scale-up w-[400px]">

                        {/* 1. 스피너 & 아이콘 */}
                        <div className="relative mb-6">
                            <div className="w-20 h-20 border-4 border-zinc-100 dark:border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                                <Sparkles size={24} className="animate-pulse" />
                            </div>
                        </div>

                        {/* 2. 상태 메시지 (동적으로 변함) */}
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2 text-center">
                            AI 작업 진행 중
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6 h-10 flex items-center justify-center leading-tight whitespace-pre-wrap">
                            {loadingState.message}
                        </p>

                        {/* 3. 진행률 바 (Progress Bar) */}
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden relative">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500 ease-out relative"
                                style={{ width: `${loadingState.progress}%` }}
                            >
                                {/* 반짝이는 효과 */}
                                <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/30 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="w-full flex justify-end mt-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{loadingState.progress}%</span>
                        </div>

                    </div>
                </div>
            )}

            {showTocModal && selectedBookForToc && ( /* ...기존 목차 설정 모달... */
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-all">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[500px] overflow-hidden relative">
                        {isGenerating && (
                            <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-fade-in transition-all">
                                <div className="bg-white/80 dark:bg-zinc-900/90 p-6 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-700 backdrop-blur-md">
                                    <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                                    <h4 className="text-lg font-bold text-zinc-400 dark:text-zinc-100 mb-1">분석 중...</h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">잠시만 기다려주세요 (약 5~10초)</p>
                                </div>
                            </div>
                        )}
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 flex-shrink-0">
                            <div className="flex-1 min-w-0 mr-4"><h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 whitespace-nowrap">목차 설정</h3><p className="text-xs text-zinc-500 mt-0.5 truncate block" title={selectedBookForToc.title}>{selectedBookForToc.title}</p></div>
                            <div className="flex gap-2 flex-shrink-0"><button onClick={() => selectedBookForToc.link && shell.openExternal(selectedBookForToc.link)} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs rounded-lg text-zinc-600 dark:text-zinc-300 font-bold transition-colors flex items-center gap-1 whitespace-nowrap">📖 책 정보</button><button onClick={() => setShowTocModal(false)} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"><X size={18} /></button></div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col overflow-hidden bg-zinc-50/50 dark:bg-black/20">
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 p-4 rounded-xl mb-4 flex-shrink-0"><p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed"><strong>[책 정보]</strong> 버튼을 눌러 목차를 복사해오세요.<br />비워두면 기본 목차로 자동 생성됩니다.</p></div>
                            <textarea value={manualToc} onChange={(e) => setManualToc(e.target.value)} placeholder="목차 내용을 여기에 붙여넣으세요..." className="flex-1 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-300 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none shadow-sm overflow-y-auto" />
                        </div>
                        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                            <button onClick={handleCreateCurriculum} disabled={isGenerating} className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-70">{manualToc.trim() ? <CheckSquare size={18} /> : <Sparkles size={18} />}{manualToc.trim() ? "입력한 목차로 등록" : "자동 생성 (Auto)"}</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && ( /* ...기존 삭제 모달... */
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-all">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-[400px] p-6 border border-zinc-200 dark:border-zinc-800 transform transition-all scale-100">
                        <div className="flex flex-col items-center text-center mb-6"><div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-500 mb-4"><Trash2 size={24} /></div><h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">항목 삭제</h3><p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed"><strong>'{deleteTarget?.title}'</strong><br />항목을 정말 삭제하시겠습니까?<br /><span className="text-rose-500 text-xs block mt-1">(하위 항목도 모두 삭제됩니다)</span></p></div>
                        <div className="flex gap-3"><button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button><button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-colors">삭제하기</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 🟢 [신규] 채팅창 내부에 표시될 미니 위젯 컴포넌트들

// 🟢 1. [업그레이드] 일정 요약 위젯 (D-Day, 요일 추가)
const ScheduleChatWidget = ({ data }) => {
    // 오늘 기준 미래 일정 필터링 및 정렬
    const upcoming = data
        .filter(t => {
            const d = new Date(t.date);
            d.setHours(23, 59, 59, 999); // 해당 날짜 끝까지 포함
            return d >= new Date();
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4); // 최대 4개 표시

    const getDDay = (dateStr) => {
        const target = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = (target - today) / (1000 * 60 * 60 * 24);
        if (diff === 0) return "D-Day";
        if (diff === 1) return "내일";
        return `D-${diff}`;
    };

    const getDayName = (dateStr) => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return days[new Date(dateStr).getDay()];
    };

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">다가오는 일정</span>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{upcoming.length}건</span>
            </div>
            <div className="space-y-2.5">
                {upcoming.length > 0 ? upcoming.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center ${t.category === 'shift' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'}`}>
                            <span className="text-[8px] font-bold leading-none">{getDDay(t.date)}</span>
                            <span className="text-xs font-bold leading-none mt-0.5">{new Date(t.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">{t.text}</p>
                                <span className="text-[10px] text-zinc-400">{getDayName(t.date)}요일</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {t.date} {t.startTime ? `• ${t.startTime}` : ''}
                            </p>
                        </div>
                    </div>
                )) : <div className="py-4 text-center text-xs text-zinc-400">예정된 일정이 없습니다 🏝️</div>}
            </div>
        </div>
    );
};

// 🟢 2. [업그레이드] 멘탈 요약 위젯 (가독성 개선, 텍스트 줄바꿈 지원)
const MentalChatWidget = ({ data }) => {
    // 점수에 따른 색상/텍스트 결정
    const getStatus = (score) => {
        if (score >= 80) return { color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20", label: "매우 좋음" };
        if (score >= 50) return { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "안정적" };
        return { color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", label: "지침/우울" };
    };

    const status = getStatus(data.score);

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-0 overflow-hidden shadow-sm">
            {/* 헤더 부분 */}
            <div className="p-4 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Heart size={16} className="text-rose-500 fill-rose-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">오늘의 마음 날씨</span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                    {data.currentMood}
                </div>
            </div>

            {/* 내용 부분 */}
            <div className="p-4">
                <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className={`text-4xl font-black ${status.color}`}>{data.score}</span>
                    <span className="text-sm text-zinc-400 font-medium">/100</span>
                </div>

                {/* 조언 섹션 (말풍선 스타일) */}
                <div className="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700/50">
                    {/* 꼬리표 효과 (옵션) */}
                    <div className="absolute -top-1.5 left-6 w-3 h-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-l border-zinc-100 dark:border-zinc-700/50 transform rotate-45"></div>

                    <div className="flex gap-2">
                        <span className="text-lg">💡</span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-keep">
                            {data.todayAdvice || "오늘 하루 감정을 기록해보세요. AI가 분석하여 조언을 드립니다."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// [App.jsx] StudyChatWidget 컴포넌트 (평균 성취도 삭제 및 수정본)

const StudyChatWidget = ({ data }) => {
    // 리스트 펼치기/접기 상태 관리
    const [isExpanded, setIsExpanded] = useState(false);

    // 1. 진행률 계산 헬퍼 함수
    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) {
            return node && node.done ? 100 : 0;
        }
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    // 2. 모든 책 데이터 가공
    const allBooks = (data.tasks || []).map(book => ({
        ...book,
        calculatedProgress: calculateProgress(book)
    }));

    // 3. 정렬 (진행 중인 것 우선, 완료된 건 뒤로)
    const sortedBooks = allBooks.sort((a, b) => {
        if (a.calculatedProgress !== 100 && b.calculatedProgress !== 100) return b.calculatedProgress - a.calculatedProgress;
        return a.calculatedProgress - b.calculatedProgress;
    });

    // 4. 펼치기 상태에 따라 보여줄 아이템 개수 결정 (기본 3개)
    const visibleBooks = isExpanded ? sortedBooks : sortedBooks.slice(0, 3);

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm transition-all duration-300">
            {/* 헤더: 총 권수 표시 */}
            <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-500" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">학습 라이브러리</span>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">
                    총 {allBooks.length}권
                </span>
            </div>

            {/* 개별 책 리스트 */}
            <div className="space-y-3">
                {visibleBooks.length > 0 ? visibleBooks.map(book => (
                    <div key={book.id} className="group flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate w-40" title={book.title}>
                                {book.title}
                            </span>
                            <span className={`font-bold ${book.calculatedProgress === 100 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                {book.calculatedProgress}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                style={{ width: `${book.calculatedProgress}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${book.calculatedProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <div className="text-xs text-zinc-400 text-center py-2">등록된 교재가 없습니다.</div>
                )}
            </div>

            {/* 전체 보기/접기 버튼 (3개 초과일 때만 표시) */}
            {allBooks.length > 3 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full mt-3 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                    {isExpanded ? (
                        <>접기 <ChevronRight size={12} className="-rotate-90" /></>
                    ) : (
                        <>전체 리스트 보기 (+{allBooks.length - 3}) <ChevronRight size={12} className="rotate-90" /></>
                    )}
                </button>
            )}
        </div>
    );
};


// 🟢 [수정됨] 3D 커버 플로우 위젯 (진행률 실시간 계산 로직 추가)
const BookCoverFlowWidget = ({ tasks, onBookClick }) => {
    const books = tasks || [];
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentBook = books[currentIndex];

    // 🟢 [추가] 진행률 계산 함수 (DetailView와 동일한 로직)
    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) {
            return node && node.done ? 100 : 0;
        }
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    // 현재 책의 실시간 진행률 계산
    const currentProgress = currentBook ? calculateProgress(currentBook) : 0;

    const prevBook = () => setCurrentIndex(prev => (prev === 0 ? books.length - 1 : prev - 1));
    const nextBook = () => setCurrentIndex(prev => (prev === books.length - 1 ? 0 : prev + 1));

    const getCardStyle = (index) => {
        const relativeIndex = index - currentIndex;
        const absRelative = Math.abs(relativeIndex);

        if (relativeIndex === 0) {
            return {
                transform: 'translateX(0) translateZ(100px) rotateY(0deg)',
                zIndex: 10,
                opacity: 1,
                scale: 1,
            };
        }

        const sign = Math.sign(relativeIndex);
        const translateX = sign * 50 * absRelative;
        const translateZ = -100 * absRelative;
        const rotateY = sign * -45;
        const scale = Math.max(0.6, 1 - (0.2 * absRelative));
        const opacity = Math.max(0.3, 1 - (0.4 * absRelative));

        return {
            transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
            zIndex: 10 - absRelative,
            opacity: opacity,
        };
    };

    if (books.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                <BookOpen size={30} className="opacity-30" />
                <p className="text-xs">서재가 비어있습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 relative flex items-center justify-center perspective-[600px] overflow-hidden py-4">
                <button onClick={(e) => { e.stopPropagation(); prevBook(); }} className="absolute left-0 z-20 p-1 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all backdrop-blur-sm">
                    <ChevronLeft size={18} />
                </button>

                <div className="relative w-24 h-32 transform-style-3d flex items-center justify-center">
                    {books.map((book, index) => {
                        if (Math.abs(index - currentIndex) > 2) return null;

                        const isCenter = index === currentIndex;

                        return (
                            <div key={book.id}
                                className="absolute w-full h-full transition-all duration-500 ease-in-out bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden cursor-pointer group"
                                style={getCardStyle(index)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCenter && onBookClick) onBookClick(book.id);
                                    else setCurrentIndex(index);
                                }}
                            >
                                {book.cover ? (
                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 p-2">
                                        <BookOpen size={32} className="text-emerald-400/50 group-hover:text-emerald-500 transition-colors mb-1" />
                                        {book.isLocal && <span className="text-[8px] font-bold text-emerald-600/70 uppercase">PDF</span>}
                                    </div>
                                )}

                                {isCenter && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onBookClick) onBookClick(book.id);
                                            }}
                                            className="w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-lg flex items-center justify-center text-emerald-600 hover:scale-110 transition-transform cursor-pointer border border-emerald-100 dark:border-zinc-600"
                                            title="목차 바로가기"
                                        >
                                            <Menu size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button onClick={(e) => { e.stopPropagation(); nextBook(); }} className="absolute right-0 z-20 p-1 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all backdrop-blur-sm">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="h-16 flex flex-col justify-center border-t border-zinc-100 dark:border-zinc-800/50 pt-0 text-center">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate px-4">{currentBook.title}</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mb-1">{currentBook.author || '저자 미상'}</p>
                <div className="flex items-center gap-2 justify-center px-6">
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        {/* 🟢 [수정] currentProgress 변수 사용 */}
                        <div style={{ width: `${currentProgress}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"></div>
                    </div>
                    {/* 🟢 [수정] currentProgress 변수 사용 */}
                    <span className="text-[9px] font-bold text-emerald-600">{currentProgress}%</span>
                </div>
            </div>
        </div>
    );
};

// 🟢 [신규] HTML 수식 모양을 보여주는 리치 에디터
const RichNoteEditor = ({ content, setContent, editorRef }) => {
    // 초기 내용 반영
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }, []);

    const handleInput = (e) => {
        setContent(e.currentTarget.innerHTML);
    };

    return (
        <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="flex-1 w-full p-6 bg-transparent outline-none text-base leading-8 text-zinc-800 dark:text-zinc-200 font-sans overflow-y-auto whitespace-pre-wrap z-10 focus:ring-0"
            style={{ minHeight: '100%', lineHeight: '2rem' }}
            placeholder="여기에 내용을 입력하세요..."
        />
    );
};

// 🟢 [유틸] 현재 커서 위치에 HTML(수식 모양)을 강제로 집어넣는 함수
const insertHtmlAtCursor = (html) => {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const el = document.createElement("div");
        el.innerHTML = html;
        let frag = document.createDocumentFragment(), node, lastNode;
        while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);

        if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } else {
        // 포커스가 없으면 에디터 끝에 추가
        const editor = document.getElementById('rich-editor');
        if (editor) editor.innerHTML += html;
    }
};

// 🟢 [신규] CSS 기반 경량 수식 렌더러 (라이브러리 없이 수식 시각화)
const MathRender = ({ content }) => {
    if (!content) return <span className="opacity-50">수식을 입력하세요...</span>;

    // 1. 텍스트를 토큰화하여 처리 (간이 파서)
    const renderTokens = (text) => {
        const parts = [];
        let i = 0;

        while (i < text.length) {
            // 분수 처리: \frac{a}{b}
            if (text.substr(i, 5) === '\\frac') {
                let j = i + 5;
                if (text[j] === '{') {
                    // 분자 추출
                    let numeratorStart = j + 1;
                    let braceCount = 1;
                    let numeratorEnd = numeratorStart;
                    while (braceCount > 0 && numeratorEnd < text.length) {
                        if (text[numeratorEnd] === '{') braceCount++;
                        if (text[numeratorEnd] === '}') braceCount--;
                        numeratorEnd++;
                    }
                    const numerator = text.substring(numeratorStart, numeratorEnd - 1);

                    // 분모 추출
                    let denominatorStart = numeratorEnd + 1; // '{' 건너뜀
                    braceCount = 1;
                    let denominatorEnd = denominatorStart;
                    while (braceCount > 0 && denominatorEnd < text.length) {
                        if (text[denominatorEnd] === '{') braceCount++;
                        if (text[denominatorEnd] === '}') braceCount--;
                        denominatorEnd++;
                    }
                    const denominator = text.substring(denominatorStart, denominatorEnd - 1);

                    parts.push(
                        <span key={i} className="inline-flex flex-col items-center align-middle mx-1">
                            <span className="border-b border-zinc-800 dark:border-zinc-200 px-1 text-xs pb-[1px]">{renderTokens(numerator)}</span>
                            <span className="text-xs pt-[1px]">{renderTokens(denominator)}</span>
                        </span>
                    );
                    i = denominatorEnd;
                    continue;
                }
            }

            // 위첨자(제곱) 처리: ^{...} 또는 ^숫자
            if (text[i] === '^') {
                if (text[i + 1] === '{') {
                    let j = i + 2;
                    let end = text.indexOf('}', j);
                    const power = text.substring(j, end);
                    parts.push(<sup key={i} className="text-[0.7em] ml-0.5">{renderTokens(power)}</sup>);
                    i = end + 1;
                } else {
                    parts.push(<sup key={i} className="text-[0.7em] ml-0.5">{text[i + 1]}</sup>);
                    i += 2;
                }
                continue;
            }

            // 루트 처리: \sqrt{...}
            if (text.substr(i, 5) === '\\sqrt') {
                let j = i + 5;
                if (text[j] === '{') {
                    let end = text.indexOf('}', j);
                    const inner = text.substring(j + 1, end);
                    parts.push(
                        <span key={i} className="inline-flex items-center mx-1">
                            <span className="text-lg leading-none">√</span>
                            <span className="border-t border-zinc-800 dark:border-zinc-200 pt-[1px] ml-[1px]">{renderTokens(inner)}</span>
                        </span>
                    );
                    i = end + 1;
                    continue;
                }
            }

            // 일반 텍스트 및 기호 변환
            let char = text[i];
            if (char === '*') char = '×';
            if (char === '/') char = '÷';

            // 개행 문자 처리
            if (char === '\n') {
                parts.push(<br key={i} />);
            } else {
                parts.push(<span key={i}>{char}</span>);
            }
            i++;
        }
        return parts;
    };

    return <span className="font-serif text-lg leading-relaxed">{renderTokens(content)}</span>;
};

// 🟢 [수정] 버튼 클릭 시 '모양(HTML)'을 내보내는 공학 패드
const EngineeringMathPad = ({ onDirectInsert }) => {
    const [mode, setMode] = useState('calc');

    // 탭 버튼
    const TabButton = ({ id, label }) => (
        <button onClick={() => setMode(id)} className={`flex-1 py-2 text-[10px] font-bold uppercase border-b-2 ${mode === id ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent text-zinc-400'}`}>{label}</button>
    );

    // 키패드 버튼 (html prop이 있으면 그걸 에디터로 쏨)
    const KeyButton = ({ label, html, onClick }) => {
        return (
            <button
                onClick={(e) => {
                    e.preventDefault(); // 포커스 뺏기 방지
                    if (onClick) onClick();
                    else if (html) onDirectInsert(html); // 🚀 핵심: HTML 모양을 바로 삽입
                }}
                className="h-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-sm"
            >
                {label}
            </button>
        );
    };

    const renderKeypad = () => {
        switch (mode) {
            case 'calc': return (
                <div className="grid grid-cols-4 gap-2">
                    {/* 🟢 분수: CSS flex로 위아래 정렬된 모양을 삽입 */}
                    <KeyButton
                        label={<div className="flex flex-col items-center leading-none text-xs scale-90"><span className="border-b border-current pb-[1px]">□</span><span>□</span></div>}
                        html={`<span class="inline-flex flex-col items-center align-middle mx-1 align-middle" contenteditable="false" style="vertical-align: middle;"><span class="border-b border-zinc-800 dark:border-zinc-200 px-1 min-w-[12px] text-center outline-none" contenteditable="true">□</span><span class="px-1 min-w-[12px] text-center outline-none" contenteditable="true">□</span></span>&nbsp;`}
                    />
                    {/* 🟢 제곱: sup 태그 삽입 */}
                    <KeyButton
                        label={<span className="text-xs">x<sup className="text-[9px]">2</sup></span>}
                        html={`x<sup class="text-xs ml-0.5">2</sup>&nbsp;`}
                    />

                    {/* 🟢 루트: 특수문자와 border-top 조합 */}
                    <KeyButton
                        label="√"
                        html={`√<span class="border-t border-zinc-800 dark:border-zinc-200 px-1 inline-block min-w-[12px]" contenteditable="true">□</span>&nbsp;`}
                    />
                    {/* 기타 기호들 */}
                    <KeyButton label="∫" html="∫&nbsp;" />
                    <KeyButton label="∑" html="∑&nbsp;" />
                    <KeyButton label="∂" html="∂" />
                    <KeyButton label="∞" html="∞" />

                    <KeyButton label="lim" html="lim&nbsp;" />
                    <KeyButton label="sin" html="sin(" />
                    <KeyButton label="cos" html="cos(" />
                    <KeyButton label="tan" html="tan(" />
                </div>
            );
            case 'symbol': return (
                <div className="grid grid-cols-4 gap-2">
                    <KeyButton label="θ" html="θ" /><KeyButton label="ω" html="ω" /><KeyButton label="π" html="π" /><KeyButton label="Ω" html="Ω" />
                    <KeyButton label="α" html="α" /><KeyButton label="β" html="β" /><KeyButton label="Δ" html="Δ" /><KeyButton label="μ" html="μ" />
                    <KeyButton label="∠" html="∠" /><KeyButton label="°" html="°" /><KeyButton label="ε" html="ε" /><KeyButton label="λ" html="λ" />
                </div>
            );
            default: return (
                <div className="grid grid-cols-4 gap-2">
                    {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'].map(val => (
                        <KeyButton key={val} label={val} html={val} />
                    ))}
                </div>
            );
        }
    };

    return (
        <div className="w-[340px] bg-white dark:bg-zinc-900 flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800 select-none">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Math Tools</h4>
                <div className="flex bg-white dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
                    <TabButton id="calc" label="Calculus" /><TabButton id="symbol" label="Symbols" /><TabButton id="num" label="Number" />
                </div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50">
                {renderKeypad()}
            </div>
            <div className="p-3 text-center text-[10px] text-zinc-400">
                버튼을 누르면 노트에 바로 입력됩니다.
            </div>
        </div>
    );
};

const extractStudyStatus = (nodes) => {
    let statusSummary = [];
    const traverse = (items) => {
        items.forEach(item => {
            // 학습 기록이 있거나, 레벨이 있는 경우만 추출
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

// 🟢 [디자인 수정] SettingsModal: 다른 모달과 디자인 통일 (애니메이션, 그림자, 라운딩)
const SettingsModal = ({ isOpen, onClose, settings, onUpdateSettings }) => {
    if (!isOpen) return null;

    const toggleModule = (key) => {
        const currentModules = settings.visibleModules || {
            schedule: true, finance: true, mental: true, development: true, work: true
        };
        const newSettings = {
            ...settings,
            visibleModules: {
                ...currentModules,
                [key]: !currentModules[key]
            }
        };
        onUpdateSettings(newSettings);
    };

    const modules = [
        { key: 'schedule', label: '통합 일정', icon: CalendarIcon },
        { key: 'finance', label: '자산 관리', icon: Wallet },
        { key: 'mental', label: '멘탈 케어', icon: Heart },
        { key: 'development', label: '자기개발', icon: BookOpen },
        { key: 'work', label: '직무 교육', icon: Briefcase },
    ];

    const currentModules = settings.visibleModules || { schedule: true, finance: true, mental: true, development: true, work: true };

    return (
        // 🟢 배경: 블러 처리 및 페이드인 애니메이션 적용
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
            {/* 🟢 컨텐츠: 스케일업 애니메이션 및 디자인 통일 */}
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transform scale-100 transition-all animate-scale-up" onClick={e => e.stopPropagation()}>

                {/* 헤더 */}
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                        <Settings size={20} className="text-zinc-500" /> 설정
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"><X size={20} /></button>
                </div>

                {/* 바디 */}
                <div className="p-5 space-y-3">
                    <div className="mb-4">
                        <p className="text-xs text-zinc-400">자주 사용하지 않는 메뉴는 숨겨서<br />사이드바를 깔끔하게 관리하세요.</p>
                    </div>

                    {modules.map(m => {
                        const Icon = m.icon;
                        const isActive = currentModules[m.key];
                        return (
                            <div key={m.key} onClick={() => toggleModule(m.key)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'}`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className={`text-sm font-bold ${isActive ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400'}`}>{m.label}</span>
                                </div>
                                {/* 토글 스위치 디자인 */}
                                <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isActive ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${isActive ? 'left-6' : 'left-1'}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


// ---------------------------------------------------------
// 🟢 5. 메인 App 컴포넌트 & DashboardView
// ---------------------------------------------------------

const DashboardView = ({
    todos, setTodos,
    finance, setFinance,
    mental, setMental,
    dev, setDev,
    dashboardSubView, setDashboardSubView,
    isSidebarExpanded, setIsSidebarExpanded,
    handleSendMessage,
    settings,
    handleGroupChange,
    getShiftForDate,
    activeBookId, setActiveBookId,
    work, setWork,
    setWorkViewMode,
    workViewMode,
    equipment, setEquipment
}) => {

    const [isMentalAnalyzing, setIsMentalAnalyzing] = useState(false);
    // [👇 아래 두 줄 추가]
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const visibleModules = settings.visibleModules || { schedule: true, finance: true, mental: true, development: true, work: true };

    // 🟢 [수정 1] settings에 저장된 순서가 있으면 그걸 쓰고, 없으면 기본값 사용
    const [widgetOrder, setWidgetOrder] = useState(
        settings.dashboardWidgetOrder || ['mental', 'tasks', 'finance', 'development', 'work']
    );
    const [draggedItem, setDraggedItem] = useState(null);

    // 🟢 [신규] 순서 변경 시 파일로 저장하는 함수
    const saveWidgetOrder = (newOrder) => {
        const newSettings = { ...settings, dashboardWidgetOrder: newOrder };
        // 부모 상태 업데이트 (즉시 반영을 위해)
        if (handleGroupChange) {
            // handleGroupChange는 settings 전체를 저장하는 함수 역할을 겸할 수 있음
            // 혹은 ipcRenderer를 직접 호출
            ipcRenderer.send('save-settings', newSettings);
        } else {
            ipcRenderer.send('save-settings', newSettings);
        }
    };

    const onDragStart = (e, index) => {
        setDraggedItem(widgetOrder[index]);
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };

    const onDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItem(null);
        // 🟢 [수정 2] 드래그가 끝나면 확정된 순서를 저장
        saveWidgetOrder(widgetOrder);
    };

    const onDragOver = (e, index) => {
        e.preventDefault();
        const draggedOverItem = widgetOrder[index];
        if (draggedItem === draggedOverItem) return;

        const items = [...widgetOrder];
        const draggedItemIndex = items.indexOf(draggedItem);
        const draggedOverItemIndex = items.indexOf(draggedOverItem);

        items.splice(draggedItemIndex, 1);
        items.splice(draggedOverItemIndex, 0, draggedItem);

        setWidgetOrder(items);
    };

    const getWidgetSpan = (key) => {
        switch (key) {
            case 'mental': return 'col-span-1 row-span-3';
            case 'tasks': return 'col-span-1 row-span-3';
            case 'finance': return 'col-span-1 row-span-2';
            case 'development': return 'col-span-1 row-span-3';
            case 'work': return 'col-span-1 row-span-3';
            default: return 'col-span-1 row-span-2';
        }
    };


    // 🟢 [신규] 멘탈 점수에 따른 비주얼(색상, 아이콘) 반환 함수
    const getMentalVisuals = (score) => {
        // ⚪ 0점: 기록 없음 (Zinc - 회색)
        if (score === 0) {
            return {
                themeName: "zinc",
                icon: Sparkles,
                gradient: "from-zinc-400 to-zinc-500",
                bgIconColor: "text-zinc-500/10",
                scoreColor: "text-zinc-400 dark:text-zinc-500",
                badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
                adviceBoxBorder: "border-zinc-200 dark:border-zinc-700",
                headerBorder: "border-zinc-200 dark:border-zinc-700",
                headerBg: "bg-zinc-50 dark:bg-zinc-800/50",
                botIcon: "text-zinc-400",
                headerText: "text-zinc-500 dark:text-zinc-400",
                inputFocus: "focus:ring-zinc-400/20"
            };
        }
        // 💖 80점 이상: 행복/최고 (Rose - 핑크/레드) -> 아이콘: 하트
        else if (score >= 80) {
            return {
                themeName: "rose",
                icon: Heart,
                gradient: "from-rose-400 to-pink-500",
                bgIconColor: "text-rose-500/10",
                scoreColor: "text-rose-600 dark:text-rose-400",
                badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
                adviceBoxBorder: "border-rose-100/50 dark:border-rose-900/30",
                headerBorder: "border-rose-100/30 dark:border-rose-900/20",
                headerBg: "bg-rose-50/30 dark:bg-rose-900/10",
                botIcon: "text-rose-500",
                headerText: "text-rose-600 dark:text-rose-400",
                inputFocus: "focus:ring-rose-500/20"
            };
        }
        // 🌿 50~79점: 평온/안정 (Emerald - 초록) -> 아이콘: 구름
        else if (score >= 50) {
            return {
                themeName: "emerald",
                icon: Cloud,
                gradient: "from-emerald-400 to-teal-500",
                bgIconColor: "text-emerald-500/10",
                scoreColor: "text-emerald-600 dark:text-emerald-400",
                badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                adviceBoxBorder: "border-emerald-100/50 dark:border-emerald-900/30",
                headerBorder: "border-emerald-100/30 dark:border-emerald-900/20",
                headerBg: "bg-emerald-50/30 dark:bg-emerald-900/10",
                botIcon: "text-emerald-500",
                headerText: "text-emerald-600 dark:text-emerald-400",
                inputFocus: "focus:ring-emerald-500/20"
            };
        }
        // 🌧️ 1~49점: 우울/지침 (Indigo - 파랑) -> 아이콘: 비
        else {
            return {
                themeName: "indigo",
                icon: CloudRain,
                gradient: "from-indigo-400 to-blue-500",
                bgIconColor: "text-indigo-500/10",
                scoreColor: "text-indigo-600 dark:text-indigo-400",
                badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                adviceBoxBorder: "border-indigo-100/50 dark:border-indigo-900/30",
                headerBorder: "border-indigo-100/30 dark:border-indigo-900/20",
                headerBg: "bg-indigo-50/30 dark:bg-indigo-900/10",
                botIcon: "text-indigo-500",
                headerText: "text-indigo-600 dark:text-indigo-400",
                inputFocus: "focus:ring-indigo-500/20"
            };
        }
    };

    const ModernCard = ({ title, icon: Icon, children, className = "", accentColor = "indigo", count = null, headerAction = null }) => {
        // 🟢 [수정] violet, amber, blue 색상 테마를 추가했습니다.
        const colors = {
            rose: "from-rose-500/10 to-rose-500/5 border-rose-200/50 dark:border-rose-500/20 text-rose-500",
            indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-200/50 dark:border-indigo-500/20 text-indigo-500",
            emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-500",
            zinc: "from-zinc-500/10 to-zinc-500/5 border-zinc-200/50 dark:border-zinc-500/20 text-zinc-500",
            // ▼ 새로 추가된 색상들 ▼
            violet: "from-violet-500/10 to-violet-500/5 border-violet-200/50 dark:border-violet-500/20 text-violet-500",
            amber: "from-amber-500/10 to-amber-500/5 border-amber-200/50 dark:border-amber-500/20 text-amber-500",
            blue: "from-blue-500/10 to-blue-500/5 border-blue-200/50 dark:border-blue-500/20 text-blue-500",
        };

        // 만약 정의되지 않은 색이 들어오면 zinc(회색)를 기본값으로 씁니다.
        const activeColor = colors[accentColor] || colors.zinc;

        return (
            <div className={`relative h-full overflow-hidden rounded-2xl border bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group ${activeColor.split(' ').slice(2).join(' ')} ${className}`}>
                {/* 배경 그라디언트 원형 장식 */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br ${activeColor.split(' ')[0]} blur-3xl opacity-50 pointer-events-none group-hover:opacity-80 transition-opacity`}></div>

                <div className="relative z-10 p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            {/* 아이콘 배경색 */}
                            <div className={`p-1.5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm ${activeColor.split(' ').slice(-1)[0]}`}>
                                <Icon size={14} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {headerAction && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {headerAction}
                                </div>
                            )}
                            {count !== null && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/20 shadow-sm ${activeColor.split(' ').slice(-1)[0]}`}>
                                    {count}
                                </span>
                            )}
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        );
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);

    const upcomingTodos = todos
        .filter(t => {
            if (!t.date) return false;
            const tDate = new Date(t.date);
            return tDate >= today && tDate <= twoWeeksLater;
        })
        .sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.startTime || a.time || '00:00'}`);
            const dateB = new Date(`${b.date} ${b.startTime || b.time || '00:00'}`);
            return dateA - dateB;
        });

    const mentalVisuals = getMentalVisuals(mental.score);
    const MentalIcon = mentalVisuals.icon;
    // [App.jsx] - ManualAccessWidget (잠금 로직 복구 버전)

    const ManualAccessWidget = ({ work, setDashboardSubView, setWorkViewMode }) => {
        const manuals = work.manuals || [];
        const categories = work.categories || [];

        const sections = [
            {
                id: 'COMMON',
                label: '공통 기초 교육',
                engLabel: 'Basic Training',
                icon: Briefcase,
                color: 'indigo'
            },
            {
                id: 'FACILITY',
                label: '설비 마스터',
                engLabel: 'Facility Master',
                icon: Wrench,
                color: 'amber'
            },
            {
                id: 'PROCESS',
                label: '공정 운전 실무',
                engLabel: 'Process Operation',
                icon: Activity,
                color: 'emerald'
            }
        ];

        // 클릭 시 이동 로직
        const handleSectionClick = (sectionId) => {
            setDashboardSubView('work');
            if (sectionId === 'COMMON') {
                setWorkViewMode('BASIC_LIST');
            } else if (sectionId === 'FACILITY') {
                setWorkViewMode('EQUIP_LIST');
            } else if (sectionId === 'PROCESS') {
                setWorkViewMode('OPER_LIST');
            } else {
                setWorkViewMode('HOME');
            }
        };

        return (
            <ModernCard
                title={<span className="text-600 dark:text-400">Job Manuals</span>}
                accentColor="violet"
                icon={BookOpen}
                count={`${manuals.length} Docs`}
                headerAction={
                    <button
                        onClick={() => {
                            setDashboardSubView('work');
                            setWorkViewMode('HOME');
                        }}
                        className="p-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30 text-zinc-400 hover:text-violet-600 transition-colors"
                        title="직무 교육 홈으로 이동"
                    >
                        <ExternalLink size={14} />
                    </button>
                }
            >
                <Briefcase className="absolute bottom-[-10px] right-[-10px] text-violet-500/5 dark:text-violet-500/10 transform rotate-[-15deg] pointer-events-none transition-colors duration-500" size={100} strokeWidth={1.5} />

                <div className="flex flex-col h-full gap-2 pt-1 relative z-10">
                    {sections.map((section, idx) => {
                        // 🟢 [복구] 실제 데이터 기반으로 활성화 여부 판단
                        const targetCategoryIds = categories.filter(c => c.group === section.id).map(c => c.id);
                        // '공통 기초 교육(COMMON)'은 카테고리 그룹이 지정 안 된 경우도 포함하거나, 기본적으로 활성화하고 싶다면 로직 조정 가능
                        // 여기서는 일단 데이터가 있어야 열리는 정석대로 복구합니다.
                        // (단, COMMON은 보통 데이터가 있으니 열릴 것입니다)

                        // ※ 만약 '공통 기초 교육'은 데이터 없어도 무조건 열어두고 싶다면:
                        // const hasData = section.id === 'COMMON' || count > 0; 로 수정하세요.

                        const count = manuals.filter(m => targetCategoryIds.includes(m.category)).length;

                        // 🔒 원래 로직대로 복구: 데이터가 1개라도 있어야 hasData = true
                        // (테스트용 강제 true 코드를 삭제했습니다)
                        const hasData = count > 0;

                        const Icon = section.icon;

                        const colorMap = {
                            amber: 'bg-amber-50/40 text-amber-700 border-amber-200/50 group-hover:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
                            emerald: 'bg-emerald-50/40 text-emerald-700 border-emerald-200/50 group-hover:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                            indigo: 'bg-indigo-50/40 text-indigo-700 border-indigo-200/50 group-hover:border-indigo-400/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
                        };

                        const activeStyle = colorMap[section.color];
                        const disabledStyle = "bg-zinc-50/30 border-zinc-100/50 text-zinc-400 border-dashed dark:bg-white/5 dark:border-zinc-800 dark:text-zinc-600 opacity-60 cursor-not-allowed";

                        return (
                            <div
                                key={idx}
                                // 🟢 데이터가 있을 때만 클릭 가능하도록 변경
                                onClick={() => hasData && handleSectionClick(section.id)}
                                className={`
                                group relative w-full flex-1 px-3 rounded-xl border flex items-center justify-between transition-all duration-300
                                ${hasData ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-sm ${activeStyle}` : disabledStyle}
                            `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${hasData ? 'bg-white/60 dark:bg-white/10 shadow-sm' : 'bg-zinc-100/50 dark:bg-zinc-800'}`}>
                                        <Icon size={16} />
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <span className="text-[9px] font-bold opacity-70 uppercase tracking-wider leading-none mb-0.5">
                                            {section.engLabel}
                                        </span>
                                        <span className="font-bold text-xs">
                                            {section.label}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    {hasData ? (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold bg-white/40 dark:bg-white/10 px-1.5 py-0.5 rounded text-current">
                                                {count}
                                            </span>
                                        </div>
                                    ) : (
                                        <Lock size={12} className="opacity-40" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ModernCard>
        );
    };

    const widgetComponents = {
        // 🟢 1. 멘탈 위젯 수정본
        mental: (
            // [수정 1] accentColor에 themeName을 전달
            <ModernCard title="Mental Health" icon={Heart} accentColor={mentalVisuals.themeName}>
                {/* ▼▼▼ 이 div가 열렸는데 닫히지 않았습니다 ▼▼▼ */}
                <div className="flex flex-col justify-between h-full gap-1.5 overflow-hidden">

                    {/* 상단: 점수 및 상태 */}
                    <div className="flex items-end justify-between flex-shrink-0">
                        <div>
                            <div className="flex items-end gap-1">
                                <span className={`text-4xl font-black tracking-tighter leading-none transition-colors duration-500 ${mentalVisuals.scoreColor}`}>{mental.score}</span>
                                <span className="text-[16   px] text-zinc-400 font-bold mb-1">/100</span>
                            </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-colors duration-500 ${mentalVisuals.badge}`}>
                            {mental.currentMood}
                        </div>
                    </div>

                    {/* 배경 장식 */}
                    <MentalIcon className={`absolute top-0 right-[-8px] transform rotate-[-10deg] pointer-events-none transition-colors duration-500 ${mentalVisuals.bgIconColor}`} size={90} strokeWidth={1} />

                    {/* 조언 박스 */}
                    <div className={`flex-1 bg-white/50 dark:bg-black/20 rounded-lg border backdrop-blur-sm overflow-hidden flex flex-col min-h-0 z-10 transition-colors duration-500 ${mentalVisuals.adviceBoxBorder}`}>
                        <div className={`px-2 py-1.5 border-b flex items-center gap-1.5 flex-shrink-0 ${mentalVisuals.headerBorder} ${mentalVisuals.headerBg}`}>
                            <Bot size={10} className={`${mentalVisuals.botIcon}`} />
                            <span className={`text-[9px] font-bold uppercase ${mentalVisuals.headerText}`}>Today's Insight</span>
                        </div>
                        <div className="p-2 overflow-y-auto scrollbar-hide">
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug whitespace-pre-wrap break-keep">
                                {mental.todayAdvice || (mental.logs.length > 0 ? mental.logs[0].advice : "오늘 하루는 어떠셨나요? 마음을 기록하면 AI가 분석하여 맞춤 조언을 드립니다.")}
                            </p>
                        </div>
                    </div>

                    {/* 게이지 바 */}
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                        <div style={{ width: `${mental.score}%` }} className={`h-full rounded-full shadow-sm transition-all duration-1000 bg-gradient-to-r ${mentalVisuals.gradient}`}></div>
                    </div>

                    {/* 입력창 */}
                    <div className="relative flex-shrink-0">
                        <input
                            placeholder={isMentalAnalyzing ? "AI가 감정을 분석 중입니다..." : "오늘의 기분은?"}
                            disabled={isMentalAnalyzing}
                            className={`w-full h-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 text-xs outline-none transition-all shadow-sm flex items-center 
                            focus:ring-2 focus:ring-inset focus:border-transparent ${mentalVisuals.inputFocus} 
                            ${isMentalAnalyzing ? 'opacity-50 cursor-not-allowed bg-zinc-100' : ''}`}

                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                    const text = e.target.value.trim();
                                    e.target.value = '';

                                    setIsMentalAnalyzing(true);
                                    try {
                                        await handleSendMessage(null, `일기: ${text}`);
                                    } finally {
                                        setIsMentalAnalyzing(false);
                                    }
                                }
                            }}
                        />

                        {isMentalAnalyzing && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <div className="w-3 h-3 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>  {/* <<<<< [수정됨] 여기에 </div> 태그를 꼭 추가해주세요! */}
            </ModernCard>
        ),

        // 💰 2. 자산 위젯 (기존 유지)
        finance: (
            <ModernCard title="Total Assets" icon={Wallet} accentColor="indigo">
                <div className="flex flex-col h-full justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-zinc-800 dark:text-white tracking-tight">₩ {finance.totalAsset.toLocaleString()}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">+2.4% ▲</span>
                            <span className="text-[10px] text-zinc-400">지난달 대비</span>
                        </div>
                    </div>
                    <div className="h-14 w-full relative opacity-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{ val: 100 }, { val: 120 }, { val: 110 }, { val: 140 }, { val: 130 }, { val: 160 }]}>
                                <Line type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </ModernCard>
        ),


        // 🟢 3. 자기개발 위젯 (수정된 부분: 버튼 및 onBookClick 전달)
        development: (
            <ModernCard
                title="My Library"
                icon={BookOpen}
                accentColor="emerald"
                count={`${(dev.tasks || []).length} Books`}
                headerAction={
                    <button
                        onClick={() => setDashboardSubView('development')}
                        className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-zinc-400 hover:text-emerald-600 transition-colors"
                        title="서재 상세화면으로 이동"
                    >
                        <ExternalLink size={14} />
                    </button>
                }
            >
                <BookCoverFlowWidget
                    tasks={dev.tasks}
                    onBookClick={(bookId) => {
                        setActiveBookId(bookId);            // 1. 해당 책 ID를 상태에 저장
                        setDashboardSubView('development');    // 2. 화면을 개발(서재) 탭으로 전환
                    }}
                />
            </ModernCard>
        ),

        work: (
            <ManualAccessWidget
                work={work} // WorkDetailView에서 work로 전달됨
                setDashboardSubView={setDashboardSubView}
                setWorkViewMode={setWorkViewMode}
            />
        ),

        // 📅 4. 일정 위젯 (기존 유지)
        tasks: (
            <ModernCard
                title="Upcoming Schedule"
                icon={CalendarIcon}
                accentColor="zinc"
                // 👇 [수정] 숫자만 넣던 것을 "문자열"로 변경하여 의미를 명확하게 전달
                count={upcomingTodos.length > 0 ? `${upcomingTodos.length} Tasks` : null}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    {/* 내부 내용은 기존과 동일 */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 min-h-0 mb-2 space-y-1.5 pt-1">
                        {upcomingTodos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-1">
                                <CalendarDays size={20} className="opacity-20" />
                                <span className="text-xs">일정 없음</span>
                            </div>
                        ) : (
                            upcomingTodos.map((t) => {
                                // ... 기존 맵핑 로직 동일 ...
                                let dateLabel = "";
                                if (t.date) {
                                    const parts = t.date.split('-');
                                    if (parts.length === 3) dateLabel = `${parts[1]}.${parts[2]}`;
                                }
                                if (t.startTime) { dateLabel += ` ${t.startTime}`; }
                                else if (t.time) { dateLabel += ` ${t.time}`; }

                                const isWork = (t.text || "").includes("근무") || (t.category === 'shift');
                                const dotColor = isWork ? "bg-amber-400" : "bg-indigo-400";

                                return (
                                    <div key={t.id} className="group/task flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700/50">
                                        <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`}></div>
                                        <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
                                            <span className="text-xs font-medium truncate text-zinc-700 dark:text-zinc-200">{t.text}</span>
                                            {dateLabel && (
                                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 rounded-md font-medium">
                                                    {dateLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800/50">
                        <button onClick={() => setDashboardSubView('schedules')} className="w-full py-2 px-3 bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 rounded-lg transition-all flex items-center justify-center gap-2 group">
                            전체 일정
                            <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </ModernCard>
        )
    };

    const renderSubView = () => {
        // 🟢 비활성화된 모듈 접근 차단 (URL 파라미터나 강제 접근 시 방어)
        const currentModuleKey = {
            schedules: 'schedule',
            finance: 'finance',
            mental: 'mental',
            development: 'development',
            work: 'work'
        }[dashboardSubView];

        if (currentModuleKey && !visibleModules[currentModuleKey]) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                    <Settings size={48} className="mb-4 opacity-20" />
                    <p>이 기능은 설정에서 비활성화되어 있습니다.</p>
                    <button onClick={() => setDashboardSubView('overview')} className="mt-4 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-sm font-bold text-zinc-600 dark:text-zinc-300">홈으로 돌아가기</button>
                </div>
            );
        }

        switch (dashboardSubView) {
            case 'schedules':
                return <ScheduleDetailView
                    todos={todos}
                    setTodos={setTodos}
                    settings={settings}
                    onGroupChange={handleGroupChange}
                    getShiftForDate={getShiftForDate} />;
            case 'finance': return <div className="p-4">재테크/자산 상세 현황 (미구현)</div>;
            case 'mental': return <MentalDetailView mental={mental} setMental={setMental} handleSendMessage={handleSendMessage} />;
            case 'development': return <DevelopmentDetailView dev={dev} setDev={setDev} handleSendMessage={handleSendMessage} activeBookId={activeBookId} setActiveBookId={setActiveBookId} />;
            case 'work':
                return <WorkDetailView
                    work={work} setWork={setWork}
                    equipment={equipment} setEquipment={setEquipment} // 🟢 전달
                    handleSendMessage={handleSendMessage}
                    viewMode={workViewMode} setViewMode={setWorkViewMode}
                />;
            case 'overview':
            default:
                return (
                    <div className="animate-fade-in pb-10">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Dashboard Overview</h2>
                            <div className="flex gap-2">
                                <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                                    💡 위젯을 드래그하여 정렬 순서를 변경할 수 있습니다.
                                </span>
                                <button onClick={() => setShowSettingsModal(true)} className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
                                    <Settings size={15} />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 auto-rows-[80px] grid-flow-dense">
                            {widgetOrder
                                // 🟢 [필터링 로직 수정됨] widgetOrder 뒤에 .filter가 붙어야 합니다.
                                .filter(key => {
                                    if (key === 'tasks') return visibleModules.schedule;
                                    return visibleModules[key];
                                })
                                .map((widgetKey, index) => (
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
                    </div>
                );
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* 설정 모달 */}
            <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} settings={settings} onUpdateSettings={handleGroupChange} />

            {/* 사이드바 시작 */}
            <div className={`flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 transition-all duration-300 
    ${isSidebarExpanded ? 'w-[280px] p-4' : 'w-[64px] py-4 px-2 items-center'} 
`}>

                {/* 햄버거 메뉴 */}
                <button
                    onClick={() => setIsSidebarExpanded(p => !p)}
                    className={`p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors mb-6 
    ${isSidebarExpanded ? 'self-start' : 'self-center'}`}
                >
                    <Menu size={20} className="text-zinc-500" />
                </button>

                {/* 🟢 [수정 완료] 네임카드 디자인 변경 (한 줄 배치) */}
                {isSidebarExpanded ? (
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6 w-full border border-zinc-200 dark:border-zinc-700/50 p-3 flex items-center justify-between animate-fade-in shadow-sm gap-2">
                        {/* 왼쪽: 프로필 사진 + 정보 */}
                        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200 dark:border-indigo-800">
                                <Users size={20} />
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                                <p className="font-bold text-sm truncate text-zinc-800 dark:text-zinc-100 leading-tight">고성열 매니저</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">인천종합에너지</p>
                            </div>
                        </div>

                        {/* 🟢 오른쪽: 기능 아이콘들 (작은 원형 버튼) */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm" title="프로필 수정">
                                <Edit3 size={12} />
                            </button>
                            <button onClick={() => setShowSettingsModal(true)} className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm" title="환경 설정">
                                <Settings size={12} />
                            </button>
                            <button className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm" title="로그아웃">
                                <LogOut size={12} />
                            </button>
                        </div>
                    </div>
                ) : (
                    // 축소 시: 심플하게 아이콘만 표시
                    <div className="mb-6 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-200 dark:border-indigo-800 cursor-pointer" title="고성열 매니저">
                        <Users size={20} />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
                    {/* 1. Common 섹션 */}
                    <div className="w-full">
                        {isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-2 mt-2">Common</h3>}
                        <div className="space-y-1">
                            <SideBarItem icon={Home} label="대시보드 개요" active={dashboardSubView === 'overview'} onClick={() => setDashboardSubView('overview')} isExpanded={isSidebarExpanded} />
                            {visibleModules.schedule && <SideBarItem icon={CalendarIcon} label="통합 일정" active={dashboardSubView === 'schedules'} onClick={() => setDashboardSubView('schedules')} isExpanded={isSidebarExpanded} />}
                        </div>
                    </div>

                    {!isSidebarExpanded && (visibleModules.finance || visibleModules.mental) && <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800 mx-auto my-2"></div>}

                    {/* 2. Personal Life 섹션 */}
                    {(visibleModules.finance || visibleModules.mental) && (
                        <div className="w-full">
                            {isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-500/70 dark:text-indigo-400/70 mb-2 px-2 mt-4">Personal Life</h3>}
                            <div className="space-y-1">
                                {visibleModules.finance && <SideBarItem icon={Wallet} label="자산관리" active={dashboardSubView === 'finance'} onClick={() => setDashboardSubView('finance')} isExpanded={isSidebarExpanded} />}
                                {visibleModules.mental && <SideBarItem icon={Heart} label="멘탈관리" active={dashboardSubView === 'mental'} onClick={() => setDashboardSubView('mental')} isExpanded={isSidebarExpanded} />}
                            </div>
                        </div>
                    )}

                    {!isSidebarExpanded && (visibleModules.development || visibleModules.work) && <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800 mx-auto my-2"></div>}

                    {/* 3. Work & Growth 섹션 */}
                    {(visibleModules.development || visibleModules.work) && (
                        <div className="w-full">
                            {isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 dark:text-emerald-400/70 mb-2 px-2 mt-4">Work & Growth</h3>}
                            <div className="space-y-1">
                                {visibleModules.development && <SideBarItem icon={BookOpen} label="자기개발" active={dashboardSubView === 'development'} onClick={() => setDashboardSubView('development')} isExpanded={isSidebarExpanded} />}
                                {visibleModules.work && <SideBarItem icon={Briefcase} label="직무교육" active={dashboardSubView === 'work'} onClick={() => setDashboardSubView('work')} isExpanded={isSidebarExpanded} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* 사이드바 끝 */}

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950/80">{renderSubView()}</div>
        </div>
    );
};

// [App.jsx] - WorkDetailView (현장 가이드 상세 기능 강화판)

const WorkDetailView = ({ work, setWork, equipment, setEquipment, handleSendMessage, viewMode, setViewMode }) => {

    // --- 🏗️ 설비 마스터 전용 State ---
    const [activeEquipId, setActiveEquipId] = useState(null);
    const [activeEquipChapterId, setActiveEquipChapterId] = useState(null);
    const [isEquipTocOpen, setIsEquipTocOpen] = useState(true);
    const [equipAiQuery, setEquipAiQuery] = useState('');
    const [equipTab, setEquipTab] = useState('FIELD');
    const [logModal, setLogModal] = useState({ isOpen: false, content: '' });

    // 🟢 [신규] 가이드 상세 보기 모달 상태
    const [guideDetailModal, setGuideDetailModal] = useState({ isOpen: false, guide: null });
    // [신규] 현장 가이드 상세 화면용 State
    const [activeFieldGuideId, setActiveFieldGuideId] = useState(null);
    const [currentStepId, setCurrentStepId] = useState(null);

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

    // 입력 폼 (공용)
    const [inputTitle, setInputTitle] = useState('');
    const [inputDesc, setInputDesc] = useState('');
    const [inputCategory, setInputCategory] = useState('FIELD');
    // 구조: [{ text: "1단계 내용" }, { text: "2단계 내용" }]
    const [inputSteps, setInputSteps] = useState([{ text: '' }]);

    // 설비 입력 폼
    const [equipTitle, setEquipTitle] = useState('');
    const [equipCode, setEquipCode] = useState('');
    const [equipDesc, setEquipDesc] = useState('');

    // 파일 및 기타
    const [manualAttachments, setManualAttachments] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [newCatId, setNewCatId] = useState('');
    const [newCatColor, setNewCatColor] = useState('zinc');
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [newStepForm, setNewStepForm] = useState({ imagePath: '', title: '', content: '' });
    const [editStepData, setEditStepData] = useState(null);
    const [editingManualId, setEditingManualId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // --- 헬퍼 함수 ---
    const getDocTypeStyle = (type) => {
        switch (type) {
            case 'PID': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: FileText, label: 'P&ID' };
            case 'MANUAL': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: BookOpen, label: 'Manual' };
            case 'DESIGN': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Wrench, label: 'Design' };
            default: return { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: FileText, label: 'Doc' };
        }
    };

    const getColorStyles = (colorName) => {
        const map = { slate: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900/30 dark:border-slate-700 dark:text-slate-400', zinc: 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900/30 dark:border-zinc-700 dark:text-zinc-400', red: 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400', orange: 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400', amber: 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400', lime: 'bg-lime-50 border-lime-200 text-lime-600 dark:bg-lime-900/30 dark:border-lime-700 dark:text-lime-400', green: 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400', emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400', teal: 'bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-400', cyan: 'bg-cyan-50 border-cyan-200 text-cyan-600 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-400', sky: 'bg-sky-50 border-sky-200 text-sky-600 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-400', blue: 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400', indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400', violet: 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-400', purple: 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400', fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:border-fuchsia-700 dark:text-fuchsia-400', pink: 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-400', rose: 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400' };
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

    // 🟢 [동적 입력 핸들러 추가] ---------------------------
    const handleStepChange = (index, value) => {
        const newSteps = [...inputSteps];
        newSteps[index].text = value;
        setInputSteps(newSteps);
    };

    // 👇 [여기서부터 복사해서 붙여넣으세요] 👇
    const addInputStep = () => {
        setInputSteps([...inputSteps, { text: '' }]);
    };

    const removeInputStep = (index) => {
        if (inputSteps.length === 1) return; // 최소 1개는 유지
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

    // 🟢 [수정됨] 현장 가이드(Field Guide) 수정 핸들러
    const handleEditFieldGuide = (e, guide) => {
        e.stopPropagation();
        setEditingManualId(guide.id);
        setInputTitle(guide.title);

        // 🔥 핵심: 기존 steps 배열을 불러오거나, 없으면 desc를 줄바꿈으로 쪼개서 로드
        let existingSteps = [];
        if (guide.steps && guide.steps.length > 0) {
            existingSteps = guide.steps.map(s => typeof s === 'string' ? { text: s } : { text: s.text || s });
        } else if (guide.desc) {
            existingSteps = guide.desc.split('\n').map(t => ({ text: t }));
        }
        setInputSteps(existingSteps.length > 0 ? existingSteps : [{ text: '' }]);

        const modalTitle = guide.type === 'TROUBLE' ? '고장 조치 매뉴얼 수정' : '기기 조작법 수정';
        setModalConfig({ isOpen: true, type: 'EDIT_FIELD_GUIDE', title: modalTitle });
    };

    const handleDeleteFieldGuide = (e, id) => {
        e.stopPropagation();
        safeConfirm("이 가이드를 정말 삭제하시겠습니까?", () => {
            setEquipment(prev => ({
                ...prev,
                fieldGuides: (prev.fieldGuides || []).filter(g => g.id !== id)
            }));
        });
    };

    // 🟢 [핵심] 저장 로직
    const handleSaveData = () => {
        // 1. 공통 기초 교육 관련
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

        // 2. 설비 마스터 관련
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
                id: Date.now(),
                title: inputTitle,
                type: 'PID',
                path: manualAttachments.length > 0 ? manualAttachments[0].path : null
            };
            setEquipment(prev => ({
                ...prev,
                list: prev.list.map(e => e.id === activeEquipId ? { ...e, documents: [...(e.documents || []), newDoc] } : e)
            }));
        }
        else if (modalConfig.type === 'ADD_EQUIP_CHAPTER') {
            if (!inputTitle.trim()) return;
            setEquipment(prev => ({
                ...prev,
                list: prev.list.map(e => e.id === activeEquipId ? {
                    ...e,
                    chapters: [...(e.chapters || []), { id: Date.now(), title: inputTitle, docId: null, isDone: false }]
                } : e)
            }));
        }
        else if (modalConfig.type === 'ADD_FIELD_GUIDE' || modalConfig.type === 'EDIT_FIELD_GUIDE') {
            if (!inputTitle.trim()) return;

            // steps 배열 가공 (빈 값 제거)
            const validSteps = inputSteps
                .filter(s => s.text.trim() !== '')
                .map((s, idx) => ({ id: idx, text: s.text }));

            const descPreview = validSteps.map(s => s.text).join('\n'); // 미리보기용

            if (modalConfig.type === 'ADD_FIELD_GUIDE') {
                const newGuide = {
                    id: Date.now(),
                    type: modalConfig.title.includes('고장') ? 'TROUBLE' : 'OPERATION',
                    title: inputTitle,
                    desc: descPreview,
                    steps: validSteps, // 🔥 배열로 저장
                    tags: ['신규']
                };
                setEquipment(prev => ({ ...prev, fieldGuides: [...(prev.fieldGuides || []), newGuide] }));
            } else {
                setEquipment(prev => ({
                    ...prev,
                    fieldGuides: prev.fieldGuides.map(g => g.id === editingManualId ? {
                        ...g,
                        title: inputTitle,
                        desc: descPreview,
                        steps: validSteps // 🔥 배열로 업데이트
                    } : g)
                }));
                setEditingManualId(null);
            }
        }

        setModalConfig({ ...modalConfig, isOpen: false });
        setInputTitle(''); setInputDesc(''); setManualAttachments([]);
        setInputSteps([{ text: '' }]); // 초기화
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

    // --- 정비 이력 추가 핸들러 ---
    const handleAddLog = () => {
        if (!logModal.content.trim()) return;
        const newLog = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            content: logModal.content,
            type: 'USER'
        };
        setEquipment(prev => ({
            ...prev,
            list: prev.list.map(e => e.id === activeEquipId ? { ...e, logs: [newLog, ...(e.logs || [])] } : e)
        }));
        setLogModal({ isOpen: false, content: '' });
    };

    // 🟢 [디자인 변경] 우측 슬라이드 오버 패널 (Detail View)
    const GuideDetailPanel = ({ guide, onClose, onEdit, onDelete }) => {
        if (!guide) return null;

        // desc가 일반 텍스트면 그냥 보여주고, 줄바꿈이 있으면 단계로 끊어서 보여줌
        const steps = guide.steps && guide.steps.length > 0
            ? guide.steps
            : (guide.desc || "").split('\n').filter(s => s.trim()).map((s, i) => ({ id: i, text: s }));

        const isTrouble = guide.type === 'TROUBLE';
        const themeColor = isTrouble ? 'rose' : 'emerald';
        const themeBg = isTrouble ? 'bg-rose-50' : 'bg-emerald-50';
        const themeBorder = isTrouble ? 'border-rose-200' : 'border-emerald-200';
        const themeText = isTrouble ? 'text-rose-600' : 'text-emerald-600';

        return (
            <div className="fixed inset-0 z-[70] overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
                <div className="absolute inset-0 overflow-hidden">
                    {/* 1. 배경 (클릭 시 닫힘) */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity animate-fade-in"
                        onClick={onClose}
                    ></div>

                    <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                        {/* 2. 슬라이드 패널 본체 */}
                        <div className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out sm:duration-700 animate-slide-in-right">
                            <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800">

                                {/* 헤더 영역 */}
                                <div className={`px-6 py-6 border-b ${isTrouble ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${isTrouble ? 'bg-rose-100 text-rose-700 ring-rose-600/20' : 'bg-emerald-100 text-emerald-700 ring-emerald-600/20'}`}>
                                                {isTrouble ? <AlertTriangle size={12} /> : <Zap size={12} />}
                                                {isTrouble ? '긴급 조치 (Trouble)' : '표준 조작 (Operation)'}
                                            </span>
                                        </div>
                                        <div className="ml-3 flex h-7 items-center gap-2">
                                            {/* 수정/삭제 버튼을 패널 안으로 이동 */}
                                            <button onClick={() => onEdit(guide)} className="rounded-md p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-zinc-100 transition-colors" title="수정">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={() => onDelete(guide.id)} className="rounded-md p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 transition-colors" title="삭제">
                                                <Trash2 size={16} />
                                            </button>
                                            <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 transition-colors">
                                                <span className="sr-only">Close panel</span>
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-bold leading-7 text-zinc-900 dark:text-zinc-100 mt-2">{guide.title}</h2>
                                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                        최종 업데이트: {new Date(guide.id).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* 컨텐츠 영역 */}
                                <div className="relative flex-1 px-6 py-6 sm:px-6">
                                    {/* 경고 박스 */}
                                    {isTrouble && (
                                        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-4 mb-8 border border-rose-100 dark:border-rose-900/30">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <AlertCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200">작업 전 안전 수칙</h3>
                                                    <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                                                        <ul className="list-disc space-y-1 pl-5">
                                                            <li>반드시 2인 1조로 작업하십시오.</li>
                                                            <li>해당 구역의 전원을 차단(LOTO) 후 진입하십시오.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 단계별 절차 (Timeline Style) */}
                                    <div className="flow-root">
                                        <ul role="list" className="-mb-8">
                                            {steps.map((step, stepIdx) => (
                                                <li key={stepIdx}>
                                                    <div className="relative pb-8">
                                                        {stepIdx !== steps.length - 1 ? (
                                                            <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
                                                        ) : null}
                                                        <div className="relative flex space-x-3">
                                                            <div>
                                                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-zinc-900 font-bold text-sm ${isTrouble ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                                                    {stepIdx + 1}
                                                                </span>
                                                            </div>
                                                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                                <div>
                                                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                                                                        {step.text || step}
                                                                    </p>
                                                                    {step.image && (
                                                                        <div className="mt-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                                                            <img src={step.image} alt="Step Detail" className="w-full h-auto object-cover" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* 하단 액션 버튼 */}
                                <div className="flex flex-shrink-0 justify-end px-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        className="rounded-xl bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-200 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                        onClick={onClose}
                                    >
                                        닫기
                                    </button>
                                    <button
                                        type="button"
                                        className={`ml-4 inline-flex justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isTrouble ? 'bg-rose-600 hover:bg-rose-500 focus-visible:outline-rose-600' : 'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-600'}`}
                                        onClick={onClose}
                                    >
                                        확인 완료
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- 렌더러 1: 홈 화면 ---
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

    // --- 렌더러 2: 기초 교육 리스트 ---
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
                        <div className="flex items-center gap-2 text-zinc-500 font-medium">
                            <span className="flex items-center gap-1"><BookOpen size={14} className="text-zinc-400" /> {(m.chapters || []).length} Chapters</span>
                            {attachCount > 0 && <span className="flex items-center gap-1 text-indigo-500"><FileText size={14} /> {attachCount}</span>}
                        </div>
                        <span className="text-zinc-400 group-hover:translate-x-1 transition-transform group-hover:text-indigo-500"><ChevronRight size={14} /></span>
                    </div>
                </div>
            );
        };

        return (
            <div className="h-full flex flex-col animate-fade-in">
                <div className="flex flex-col gap-4 mb-6 px-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><button onClick={() => setViewMode('HOME')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><ChevronLeft size={20} /></button><h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">공통 기초 교육</h2></div>
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-full max-w-full">
                        <button onClick={() => setManualCategory('ALL')} className={`flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${manualCategory === 'ALL' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>전체</button>
                        {categories.map(cat => (<button key={cat.id} onClick={() => setManualCategory(cat.id)} className={`group relative flex items-center gap-1.5 flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${manualCategory === cat.id ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'}`}>{cat.label}<div className="w-0 overflow-hidden group-hover:w-auto flex items-center gap-1 transition-all duration-300 opacity-0 group-hover:opacity-100">
                            <span onClick={(e) => handleEditCategory(e, cat)} className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-zinc-400 hover:text-indigo-500 rounded transition-colors" title="수정"><Edit3 size={12} /></span>
                            <span onClick={(e) => handleDeleteCategory(e, cat.id, cat.label)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-500 rounded transition-colors" title="삭제"><Trash2 size={12} /></span>
                        </div></button>))}
                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_CATEGORY', title: '카테고리 추가' })} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"><Plus size={14} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 pb-10">
                    {manualCategory === 'ALL' ? (<div className="flex flex-col gap-8">{categories.map(cat => { const catManuals = manuals.filter(m => m.category === cat.id); return (<div key={cat.id} className="flex flex-col gap-3"><div className="flex items-center gap-2 px-1"><div className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getColorStyles(cat.color)}`}>{cat.id}</div><span className="text-xs font-bold text-zinc-400">{cat.label}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{catManuals.map(m => <ManualCard key={m.id} m={m} />)}</div></div>); })}</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{(() => { const currentCat = categories.find(c => c.id === manualCategory); return currentCat ? <AddManualCard targetCategoryId={currentCat.id} targetCategoryLabel={currentCat.label} /> : null; })()}{filteredManuals.map(m => <ManualCard key={m.id} m={m} />)}</div>)}
                </div>
            </div>
        );
    };

    // --- 렌더러 3: 기초 교육 상세 (뷰어) ---
    const renderAttachmentButton = (attachments) => {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="relative">
                <button onClick={() => setShowFileList(!showFileList)} className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors flex items-center gap-1.5 ${showFileList ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <FileText size={12} /> 첨부 양식 <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 rounded-full text-[9px] min-w-[16px] text-center">{attachments.length}</span>
                </button>
                {showFileList && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFileList(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 p-2 animate-fade-in-up origin-top-right">
                            <div className="flex justify-between items-center px-2 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-700/50">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Attached Files</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={handleAddFileToDetail} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors" title="파일 추가"><Plus size={12} /></button>
                                    <button onClick={() => setShowFileList(false)} className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"><X size={12} /></button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
                                {attachments.map((file, i) => (
                                    <div key={i} onClick={() => handleOpenFile(file.path)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50">
                                        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-700 rounded text-zinc-500 group-hover:text-indigo-500 group-hover:bg-white dark:group-hover:bg-zinc-800 transition-colors"><FileText size={16} /></div>
                                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate flex-1 leading-tight">{file.name}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleDeleteFileFromDetail(e, i)} className="p-1 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors" title="삭제"><Trash2 size={12} /></button>
                                            <ExternalLink size={12} className="text-zinc-300 group-hover:text-indigo-400 transition-colors mr-1" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderStepSlider = (steps, nextChapter, navigateChapter) => {
        if (!steps || steps.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-zinc-400 gap-3 h-full">
                    <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center"><Image size={24} className="opacity-50" /></div>
                    <p className="text-sm text-center">등록된 스텝이 없습니다.<br />우측 상단 '스텝 추가' 버튼을 눌러주세요.</p>
                </div>
            );
        }
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
                {nextChapter && (
                    <div className="h-full w-full flex flex-col items-center justify-center p-8">
                        <div onClick={() => navigateChapter(nextChapter.id)} className="group w-full max-w-[420px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl shadow-lg hover:shadow-xl hover:border-indigo-500 hover:-translate-y-1 transition-all cursor-pointer flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🚀</div><div className="flex flex-col"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next Chapter</span><h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">{nextChapter.title}</h3></div></div>
                            <div className="flex items-center gap-1 text-xs font-bold text-zinc-400 group-hover:text-indigo-600 transition-colors bg-zinc-50 dark:bg-zinc-700/50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30">Start <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></div>
                        </div>
                    </div>
                )}
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

        const navigateChapter = (chapterId) => {
            if (!chapterId) return;
            setActiveChapterId(chapterId);
            setCurrentStepIndex(0);
            const scrollContainer = document.getElementById('step-scroll-container');
            if (scrollContainer) scrollContainer.scrollTop = 0;
        };

        const handleWheelScroll = (e) => {
            const now = Date.now();
            if (now - lastScrollTime.current < 500) return;
            const maxIndex = nextChapter ? steps.length : steps.length - 1;
            if (e.deltaY > 0) { if (currentStepIndex < maxIndex) { setCurrentStepIndex(prev => prev + 1); lastScrollTime.current = now; } }
            else if (e.deltaY < 0) { if (currentStepIndex > 0) { setCurrentStepIndex(prev => prev - 1); lastScrollTime.current = now; } }
        };

        const handleEditStepClick = () => { if (currentStep) setEditStepData(currentStep); };

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center px-4 bg-zinc-50/50 dark:bg-zinc-900/50 z-50 relative">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsTocOpen(!isTocOpen)} className={`p-2 rounded-lg transition-colors ${isTocOpen ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><Menu size={18} /></button>
                        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1"></div>
                        <button onClick={() => setViewMode('BASIC_LIST')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"><ChevronLeft size={18} /></button>
                        <div className="flex flex-col ml-1"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">MANUAL</span><span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-none">{item.title}</span></div>
                    </div>
                    <div className="flex gap-2">
                        {renderAttachmentButton(attachments)}
                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_BASIC_CHAPTER', title: '새 챕터 추가' })} className="px-3 py-1.5 text-xs font-bold border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"><Plus size={12} /> 챕터 추가</button>
                    </div>
                </div>
                <div className="flex-1 flex overflow-hidden relative">
                    <div className={`flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-10 transition-all duration-300 ease-in-out overflow-hidden ${isTocOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none'}`}>
                        <div className="w-64 flex flex-col h-full">
                            <div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">Table of Contents</div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {(item.chapters || []).map((c, idx) => {
                                    const isActive = activeChapter && activeChapter.id === c.id;
                                    return (
                                        <div key={c.id} className="flex flex-col">
                                            <button onClick={() => { setActiveChapterId(c.id); setCurrentStepIndex(0); }} className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'}`}>
                                                <div className="flex items-center gap-3 min-w-0"><span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>{idx + 1}</span><div className="min-w-0"><div className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{c.title}</div></div></div>
                                                <div onClick={(e) => requestDelete(e, 'CHAPTER', c.id, c.title)} className={`p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-300 hover:text-rose-500 transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><Trash2 size={12} /></div>
                                            </button>
                                            {isActive && (c.steps || []).length > 0 && (
                                                <div className="ml-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 mt-1 mb-1 space-y-0.5 animate-fade-in-down">
                                                    {(c.steps || []).map((step, sIdx) => {
                                                        const isStepActive = sIdx === currentStepIndex;
                                                        return (<button key={step.id} onClick={() => setCurrentStepIndex(sIdx)} className={`w-full text-left py-2 px-2 rounded-lg text-[11px] transition-colors flex items-center gap-2 truncate ${isStepActive ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}><div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStepActive ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div><span className="truncate">{step.title ? (step.title.length > 15 ? step.title.substring(0, 15) + '...' : step.title) : `Step ${sIdx + 1}`}</span></button>);
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden transition-all duration-300">
                        {activeChapter ? (
                            <>
                                <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur absolute top-0 left-0 right-0 z-20">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => navigateChapter(prevChapter?.id)} disabled={!prevChapter} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronLeft size={20} /></button>
                                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><BookOpen size={18} className="text-indigo-500" /><span className="truncate max-w-[400px]">{activeChapter.title}</span></h3>
                                        <button onClick={() => navigateChapter(nextChapter?.id)} disabled={!nextChapter} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ChevronRight size={20} /></button>
                                    </div>
                                    <div className="flex gap-2">
                                        {steps.length > 0 && currentStep && (<button onClick={handleEditStepClick} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 text-zinc-500 hover:text-amber-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><Edit3 size={14} /> 수정</button>)}
                                        {steps.length > 0 && currentStep && (<button onClick={(e) => requestDelete(e, 'STEP', currentStep.id, currentStep.title || '현재 스텝')} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 text-zinc-500 hover:text-rose-500 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"><Trash2 size={14} /> 삭제</button>)}
                                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_MANUAL_STEP', title: '설명 단계 추가' })} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"><Image size={14} /> 스텝 추가</button>
                                    </div>
                                </div>
                                <div id="step-scroll-container" onWheel={handleWheelScroll} className="flex-1 relative overflow-hidden">
                                    {renderStepSlider(steps, nextChapter, navigateChapter)}
                                    {steps.length > 0 && (<div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">{steps.map((_, idx) => (<div key={idx} onClick={() => setCurrentStepIndex(idx)} className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer hover:scale-125 ${idx === currentStepIndex ? 'bg-indigo-600 h-6' : 'bg-zinc-300 dark:bg-zinc-700'}`} />))}{nextChapter && (<div onClick={() => setCurrentStepIndex(steps.length)} className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer hover:scale-125 mt-2 ${currentStepIndex === steps.length ? 'bg-indigo-600 h-6' : 'bg-zinc-300 dark:bg-zinc-700 border border-indigo-500'}`} title="다음 챕터" />)}</div>)}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4">
                                <BookOpen size={48} className="opacity-20" />
                                <p className="text-sm">좌측 목록에서 챕터를 선택하면<br />상세 내용이 표시됩니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };


    // --- 렌더러 4: 설비 목록 화면 (Split Layout) ---
    const renderEquipList = () => {
        const activeTab = equipTab === 'SYSTEM' ? 'SYSTEM' : 'FIELD';
        const equipList = equipment.list || [];
        const fieldGuides = equipment.fieldGuides || [];

        return (
            <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 animate-fade-in relative">
                {/* 👆 relative 클래스 확인 (모달 위치 잡기 위해) */}

                <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('HOME')} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 rounded text-zinc-500"><ChevronLeft size={20} /></button>
                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">설비 마스터</h2>
                    </div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 py-4 flex flex-col gap-1">
                        <div className="px-3">
                            <div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">현장 업무 (Field)</div>
                            <button onClick={() => setEquipTab('FIELD')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'FIELD' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>트러블 슈팅 / 기기 조작</button>
                        </div>
                        <div className="px-3 mt-4">
                            <div className="text-[11px] font-bold text-zinc-400 px-3 mb-2">설비 관리 (System)</div>
                            <button onClick={() => setEquipTab('SYSTEM')} className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'SYSTEM' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>전체 설비 계통도</button>
                        </div>
                    </div>
                    <div className="flex-1 bg-white dark:bg-zinc-900 overflow-y-auto p-8">
                        {activeTab === 'FIELD' && (
                            <div className="max-w-4xl mx-auto space-y-10">
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-rose-500"></div>고장 조치 매뉴얼 (Troubleshooting)</h3>
                                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '고장 조치 매뉴얼 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {fieldGuides.filter(g => g.type === 'TROUBLE').map(g => (
                                            <div key={g.id}
                                                onClick={() => {
                                                    setActiveFieldGuideId(g.id);
                                                    setCurrentStepId(null);
                                                    setViewMode('FIELD_DETAIL'); // 🔥 여기서 화면 전환이 일어납니다
                                                }}
                                                className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button>
                                                        <button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{g.desc}</p>
                                                <div className="mt-2 flex gap-1">
                                                    <span className="text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">긴급</span>
                                                    {g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {fieldGuides.filter(g => g.type === 'TROUBLE').length === 0 && <div className="col-span-2 text-center py-8 text-zinc-400 text-xs">등록된 매뉴얼이 없습니다.</div>}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-emerald-500"></div>현장 기기 조작법 (Operation)</h3>
                                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_FIELD_GUIDE', title: '기기 조작법 등록' })} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2 py-1 rounded bg-white hover:bg-zinc-50"><Plus size={12} /> 등록</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {fieldGuides.filter(g => g.type === 'OPERATION').map(g => (
                                            <div key={g.id}
                                                onClick={() => setGuideDetailModal({ isOpen: true, guide: g })}
                                                className="group p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:shadow-sm cursor-pointer bg-white dark:bg-zinc-800 transition-all hover:-translate-y-0.5"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{g.title}</h4>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => handleEditFieldGuide(e, g)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-indigo-500"><Edit3 size={12} /></button>
                                                        <button onClick={(e) => handleDeleteFieldGuide(e, g.id)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{g.desc}</p>
                                                <div className="mt-2 flex gap-1">
                                                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">Standard</span>
                                                    {g.steps && g.steps.length > 0 && <span className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1.5 py-0.5 rounded">{g.steps.length}단계</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {fieldGuides.filter(g => g.type === 'OPERATION').length === 0 && <div className="col-span-2 text-center py-8 text-zinc-400 text-xs">등록된 조작법이 없습니다.</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'SYSTEM' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><div className="w-1 h-4 bg-indigo-500"></div>전체 설비 계통 목록</h3>
                                    <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIPMENT', title: '설비 등록' })} className="text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"><Plus size={12} /> 설비 등록</button>
                                </div>
                                {equipList.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50/50"><p className="text-sm text-zinc-500">등록된 설비가 없습니다.</p></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {equipList.map(equip => (
                                            <div key={equip.id} onClick={() => { setActiveEquipId(equip.id); setActiveEquipChapterId(null); setViewMode('EQUIP_DETAIL'); }} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group">
                                                <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{equip.meta?.code || 'EQ-000'}</span></div>
                                                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate mb-1 group-hover:text-amber-600 transition-colors">{equip.title}</h4>
                                                <p className="text-xs text-zinc-500 line-clamp-2 h-8 leading-relaxed">{equip.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ✅ [슬라이드 오버 적용] GuideDetailModal 대신 GuideDetailPanel 사용 */}
                {guideDetailModal.isOpen && (
                    <GuideDetailPanel
                        guide={guideDetailModal.guide}
                        onClose={() => setGuideDetailModal({ isOpen: false, guide: null })}
                        onEdit={(guide) => {
                            setGuideDetailModal({ isOpen: false, guide: null }); // 패널 닫고
                            handleEditFieldGuide({ stopPropagation: () => { } }, guide); // 수정 모달 열기
                        }}
                        onDelete={(id) => {
                            setGuideDetailModal({ isOpen: false, guide: null }); // 패널 닫고
                            handleDeleteFieldGuide({ stopPropagation: () => { } }, id); // 삭제 다이얼로그
                        }}
                    />
                )}
            </div>
        );
    };

    // --- [신규 렌더러] 현장 가이드 상세 (3단 구조: 목차 - 도면 - 상세) ---
    const renderFieldDetail = () => {
        const guide = (equipment.fieldGuides || []).find(g => g.id === activeFieldGuideId);
        if (!guide) return <div className="p-8 text-zinc-400">데이터를 찾을 수 없습니다.</div>;

        const steps = guide.steps || [];
        const activeStep = steps.find(s => s.id === currentStepId) || (steps.length > 0 ? steps[0] : null);
        const isTrouble = guide.type === 'TROUBLE';

        return (
            <div className="h-full flex flex-col animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                {/* 1. 헤더 */}
                <div className={`h-14 border-b flex justify-between items-center px-4 flex-shrink-0 z-20 ${isTrouble ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'}`}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('EQUIP_LIST')} className="p-1.5 hover:bg-black/5 rounded-lg text-zinc-500"><ChevronLeft size={20} /></button>
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isTrouble ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {isTrouble ? 'TROUBLESHOOTING' : 'OPERATION GUIDE'}
                            </span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{guide.title}</span>
                        </div>
                    </div>
                    {/* 상단 편집 버튼 (필요 시 활성화) */}
                    <div className="flex gap-2">
                        <button onClick={(e) => handleEditFieldGuide(e, guide)} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-50 flex items-center gap-1"><Edit3 size={12} /> 가이드 수정</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* 2. 좌측: 단계(Step) 리스트 */}
                    <div className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col">
                        <div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Process Steps</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {steps.length === 0 && <div className="text-xs text-zinc-400 text-center py-4">등록된 단계가 없습니다.</div>}
                            {steps.map((step, idx) => {
                                const isActive = activeStep && activeStep.id === step.id;
                                return (
                                    <div key={step.id || idx} onClick={() => setCurrentStepId(step.id)} className={`group w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent'}`}>
                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${isActive ? (isTrouble ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>{idx + 1}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-xs font-bold leading-tight ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{step.title || step.text}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. 중앙: 도면 뷰어 (PanZoomViewer) */}
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex flex-col">
                        {activeStep && activeStep.image ? (
                            <PanZoomViewer src={activeStep.image} alt="도면 확인" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                                <Image size={48} className="opacity-20" />
                                <p className="text-sm">등록된 도면/사진이 없습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* 4. 우측: 상세 지시 및 체크 */}
                    <div className="w-80 flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20">
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isTrouble ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {activeStep ? `STEP ${steps.indexOf(activeStep) + 1}` : 'INFO'}
                            </span>
                            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-tight mt-2 mb-2">
                                {activeStep ? (activeStep.title || activeStep.text) : "단계를 선택하세요"}
                            </h3>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto">
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {activeStep ? (activeStep.content || activeStep.text) : "좌측 목록에서 작업 단계를 선택하여 상세 내용을 확인하십시오."}
                            </p>

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
                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50">
                            <button className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm text-white ${isTrouble ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                확인 및 다음 단계
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- 렌더러 5: 설비 상세 화면 (3 Column Layout + Logs) ---
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
                    <div className="flex gap-2">
                        <button onClick={() => setModalConfig({ isOpen: true, type: 'ADD_EQUIP_DOC', title: '문서 추가' })} className="px-3 py-1.5 border hover:bg-white text-xs font-bold rounded-lg flex gap-1"><Plus size={12} /> 문서 추가</button>
                    </div>
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
                        {activeDoc ? (
                            <PanZoomViewer src={activeDoc.path} alt={activeChapter.title} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2"><Image size={40} className="opacity-30" /><p className="text-sm">선택된 문서가 없습니다.</p></div>
                        )}
                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/60 backdrop-blur p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm pointer-events-none">
                            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{activeChapter ? activeChapter.title : 'No Chapter Selected'}</h2>
                        </div>
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
                            <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex gap-2"><History size={14} /> Maintenance Log</h3>
                                <button onClick={() => setLogModal({ isOpen: true, content: '' })} className="p-1 hover:bg-zinc-200 rounded"><Plus size={14} className="text-zinc-500" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {logs.length === 0 ? <p className="text-xs text-zinc-400 text-center py-4">이력이 없습니다.</p> : logs.map(log => (
                                    <div key={log.id} className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                                        <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${log.type === 'AI' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-zinc-400">{log.date}</span>
                                            {log.type === 'AI' && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded font-bold">AI Auto</span>}
                                        </div>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">{log.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col p-5 bg-indigo-50/30 dark:bg-indigo-900/5">
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Bot size={14} /> AI Document Coach
                            </h3>
                            <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl border border-indigo-100 dark:border-zinc-700 p-3 mb-3 overflow-y-auto shadow-sm">
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    현재 보고 계신 <strong>{activeDoc?.title || '문서'}</strong>에 대해 궁금한 점이 있으신가요?<br /><br />
                                    예시:<br />
                                    - "이 P&ID에서 유압 라인은 어디인가요?"<br />
                                    - "시동 시퀀스 3단계를 요약해줘."
                                </p>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={equipAiQuery}
                                    onChange={(e) => setEquipAiQuery(e.target.value)}
                                    placeholder="질문을 입력하세요..."
                                    className="w-full h-24 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 rounded-xl p-3 text-xs resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={() => handleSendMessage(null, `[Context: ${equip.title} - ${activeDoc?.title}] ${equipAiQuery}`)}
                                    disabled={!equipAiQuery.trim()}
                                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    분석 및 질문
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Log Modal */}
                {logModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
                            <h3 className="font-bold mb-4">정비 이력 추가</h3>
                            <textarea value={logModal.content} onChange={e => setLogModal({ ...logModal, content: e.target.value })} className="w-full h-24 border rounded-xl p-3 text-sm resize-none mb-4 outline-none focus:ring-2 focus:ring-amber-500" placeholder="내용을 입력하세요..." />
                            <div className="flex gap-2">
                                <button onClick={() => setLogModal({ isOpen: false, content: '' })} className="flex-1 py-2 rounded-lg border text-sm font-bold">취소</button>
                                <button onClick={handleAddLog} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold">저장</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🟢 Guide Detail Modal (현장 가이드 상세 뷰어) */}
                {guideDetailModal.isOpen && (
                    <GuideDetailModal
                        guide={guideDetailModal.guide}
                        onClose={() => setGuideDetailModal({ isOpen: false, guide: null })}
                    />
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

            {/* 🟢 새로 추가된 뷰 모드 연결 */}
            {viewMode === 'EQUIP_LIST' && renderEquipList()}
            {viewMode === 'EQUIP_DETAIL' && renderEquipDetail()}
            {viewMode === 'FIELD_DETAIL' && renderFieldDetail()}

            {/* 통합 알림/확인 다이얼로그 */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => dialogConfig.type === 'alert' && closeDialog()}>
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center text-center animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${dialogConfig.type === 'confirm' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500'}`}>
                            {dialogConfig.type === 'confirm' ? <AlertTriangle size={24} /> : <div className="text-2xl">💡</div>}
                        </div>
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-2">{dialogConfig.type === 'confirm' ? '확인 필요' : '알림'}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed whitespace-pre-wrap">{dialogConfig.message}</p>

                        <div className="flex gap-2 w-full">
                            {dialogConfig.type === 'confirm' && (
                                <button onClick={closeDialog} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>
                            )}
                            <button onClick={() => { if (dialogConfig.onConfirm) dialogConfig.onConfirm(); closeDialog(); }} className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-colors ${dialogConfig.type === 'confirm' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}>{dialogConfig.type === 'confirm' ? '확인' : '닫기'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 통합 입력 모달 */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 transform scale-100 transition-all">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                            {modalConfig.type.includes('EDIT') ? <Edit3 size={18} className="text-amber-500" /> : <Plus size={18} className="text-indigo-500" />} {modalConfig.title}
                        </h3>
                        <div className="space-y-4">
                            {modalConfig.type === 'ADD_EQUIPMENT' && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설비명</label>
                                        <input autoFocus value={equipTitle} onChange={e => setEquipTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 가스터빈 1호기" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설비 코드</label>
                                            <input value={equipCode} onChange={e => setEquipCode(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: GT-01" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">설명</label>
                                            <input value={equipDesc} onChange={e => setEquipDesc(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="설비에 대한 간략한 설명" />
                                        </div>
                                    </div>
                                </>
                            )}
                            {(modalConfig.type === 'ADD_CATEGORY' || modalConfig.type === 'EDIT_CATEGORY') && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">카테고리 ID</label>
                                            <input value={newCatId} onChange={e => setNewCatId(e.target.value.toUpperCase())} readOnly={modalConfig.type === 'EDIT_CATEGORY'} className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400 ${modalConfig.type === 'EDIT_CATEGORY' ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 cursor-not-allowed' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'}`} placeholder="예: IT_SUPPORT" />
                                        </div>
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">카테고리 명칭</label><input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="예: 💻 IT 지원" /></div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-3">색상 테마 선택</label>
                                        <div className="flex flex-wrap gap-2">{colorPalette.map(theme => (<button key={theme.id} onClick={() => setNewCatColor(theme.id)} className={`w-8 h-8 rounded-full transition-all shadow-sm ${theme.bg} ${newCatColor === theme.id ? 'ring-4 ring-offset-2 ring-zinc-200 dark:ring-zinc-700 scale-110 opacity-100' : 'opacity-40 hover:opacity-100 hover:scale-105'}`} title={theme.id} />))}</div>
                                    </div>
                                </>
                            )}
                            {modalConfig.type === 'ADD_MANUAL_STEP' && (
                                <>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">스텝 이미지</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-400 truncate flex items-center gap-2"><Image size={16} /> {newStepForm.imagePath ? newStepForm.imagePath.split(/[/\\]/).pop() : "이미지를 선택하세요"}</div>
                                            <button onClick={() => handleSelectImage('step')} className="px-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-indigo-600 dark:text-indigo-400 font-bold">찾기</button>
                                        </div>
                                    </div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">스텝 제목</label><input value={newStepForm.title} onChange={e => setNewStepForm({ ...newStepForm, title: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="제목 입력" /></div>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">상세 내용</label><textarea value={newStepForm.content} onChange={e => setNewStepForm({ ...newStepForm, content: e.target.value })} className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-zinc-400" placeholder="내용 입력..." /></div>
                                </>
                            )}
                            {/* 🟢 [수정] 통합된 매뉴얼/챕터/설비문서 입력 폼 */}
                            {(['ADD_BASIC_MANUAL', 'EDIT_BASIC_MANUAL', 'ADD_FIELD_GUIDE', 'ADD_EQUIP_DOC'].includes(modalConfig.type)) && (
                                <>
                                    <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">제목</label><input autoFocus value={inputTitle} onChange={e => setInputTitle(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400" placeholder="제목 입력" /></div>

                                    {/* 설명 입력은 문서추가(DOC) 제외하고 표시 */}
                                    {modalConfig.type !== 'ADD_EQUIP_DOC' && (
                                        <div><label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5">{modalConfig.type === 'ADD_FIELD_GUIDE' ? '상세 단계 입력 (줄바꿈으로 구분)' : '설명'}</label><textarea value={inputDesc} onChange={e => setInputDesc(e.target.value)} className="w-full h-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-400 resize-none" placeholder={modalConfig.type === 'ADD_FIELD_GUIDE' ? "예:\n1. 전원을 차단한다.\n2. 밸브를 잠근다.\n..." : "설명 입력"} /></div>
                                    )}

                                    {/* 파일 첨부는 문서추가(DOC) 또는 매뉴얼(MANUAL)일 때만 표시 */}
                                    {(modalConfig.type.includes('MANUAL') || modalConfig.type === 'ADD_EQUIP_DOC') && (
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
                            {/* 챕터 추가 (공통/설비 공용) */}
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
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 transform scale-100 transition-all">
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

function App() {
    const urlParams = new URLSearchParams(window.location.search);
    const initialViewMode = urlParams.get('view') === 'dashboard' ? 'dashboard' : 'chat';
    const initialThemeMode = urlParams.get('theme') || 'auto';
    const [workViewMode, setWorkViewMode] = useState('HOME');

    const [viewMode, setViewMode] = useState(initialViewMode);
    const [themeMode, setThemeMode] = useState(initialThemeMode);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [dashboardSubView, setDashboardSubView] = useState('overview');
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [activeBookId, setActiveBookId] = useState(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const remoteUpdateFlags = useRef(new Set());

    const [todos, setTodos] = useState([]);
    const [settings, setSettings] = useState({ selectedGroup: "운영 1그룹" });
    const [work, setWork] = useState({ manuals: [] }); // 🟢 [추가]
    const [equipment, setEquipment] = useState({ list: [], fieldGuides: [] });

    const getShiftForDate = (targetDate) => {
        const groupName = settings.selectedGroup || "운영 1그룹";
        const baseDate = GROUP_START_DATES[groupName] || GROUP_START_DATES["운영 1그룹"];

        const d = new Date(targetDate);
        d.setHours(0, 0, 0, 0);
        const base = new Date(baseDate);
        base.setHours(0, 0, 0, 0);

        const diffTime = d.getTime() - base.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const pattern = COMMON_SHIFT_PATTERN;
        const patternIndex = (diffDays % pattern.length + pattern.length) % pattern.length;
        return pattern[patternIndex];
    };

    const handleGroupChange = (newSettingsData) => {
        let updatedSettings;
        // 문자열만 오면(기존 방식 호환) 객체로 변환
        if (typeof newSettingsData === 'string') {
            updatedSettings = { ...settings, selectedGroup: newSettingsData };
        } else {
            // 객체로 오면(설정 변경) 그대로 병합
            updatedSettings = { ...settings, ...newSettingsData };
        }

        setSettings(updatedSettings);
        ipcRenderer.send('save-settings', updatedSettings);
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const loaded = await ipcRenderer.invoke('load-settings');
                if (loaded && loaded.selectedGroup) setSettings(loaded);
            } catch (e) { console.error("설정 로드 실패", e); }
        };
        loadSettings();
    }, []);

    const [finance, setFinance] = useState({ totalAsset: 0, items: [] });
    const [mental, setMental] = useState({ logs: [], currentMood: '기록 없음', score: 0, todayAdvice: '' });
    const [dev, setDev] = useState({ tasks: [] });

    const [messages, setMessages] = useState([{
        id: 1, role: 'ai', type: 'text', content: '안녕하세요. 당신의 성장을 돕는 AI 파트너입니다.'
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const [isMaximized, setIsMaximized] = useState(false);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // 🟢 [최종 수정] App 컴포넌트 내부의 fetchData 함수 (복구 후 강제 저장 추가)
    const fetchData = async (dataType = 'all') => {
        try {
            // 1. 일정 로드
            if (dataType === 'all' || dataType === 'schedules') {
                const sData = await ipcRenderer.invoke('load-schedules') || [];
                remoteUpdateFlags.current.add('schedules');
                setTodos(sData);
            }

            // 2. 자산 로드
            if (dataType === 'all' || dataType === 'finance') {
                const fData = await ipcRenderer.invoke('load-finance') || { totalAsset: 0, items: [] };
                remoteUpdateFlags.current.add('finance');
                setFinance(fData);
            }

            // 3. 멘탈 로드
            if (dataType === 'all' || dataType === 'mental') {
                let mData = await ipcRenderer.invoke('load-mental') || { logs: [], currentMood: '기록 없음', score: 0, todayAdvice: '' };
                const todayStr = new Date().toISOString().split('T')[0];
                const lastLogDate = mData.logs.length > 0 ? mData.logs[0].date : null;
                if (lastLogDate !== todayStr) {
                    mData = { ...mData, currentMood: '기록 없음', score: 0, todayAdvice: "새로운 하루가 시작되었습니다! ☀️" };
                }
                remoteUpdateFlags.current.add('mental');
                setMental(mData);
            }

            // 4. [핵심 수정] 자기개발(dev) & 직무교육(work) 데이터 로드 및 마이그레이션
            if (dataType === 'all' || dataType === 'development' || dataType === 'work') {
                // 파일 로드
                const dData = await ipcRenderer.invoke('load-development') || { tasks: [] };
                // work.json 원본 상태 확인
                const wDataRaw = await ipcRenderer.invoke('load-work');
                let wData = wDataRaw || { manuals: [] };

                // 🚨 [복구 로직] work.json 파일 자체가 없을 때만(null) 실행
                // (사용자가 다 지워서 빈 배열 [] 인 상태와 구분하기 위함)
                if (!wDataRaw && dData.tasks && dData.tasks.length > 0) {

                    // 기존 데이터 중 '챕터'가 있거나, '매뉴얼 카테고리'인 것을 찾습니다.
                    const recoveredManuals = dData.tasks.filter(t =>
                        t.chapters ||
                        ['OPERATION', 'FIELD SAFETY', 'OFFICE'].includes(t.category)
                    );

                    if (recoveredManuals.length > 0) {
                        console.log(`♻️ 초기 실행: development.json에서 ${recoveredManuals.length}개의 데이터를 가져왔습니다.`);
                        wData.manuals = recoveredManuals;

                        // 🔥 [필수 추가] 복구된 데이터를 즉시 파일로 저장해버립니다.
                        // 이렇게 해야 다음 실행 때 파일이 존재한다고 인식하여 복구 로직을 건너뜁니다.
                        ipcRenderer.send('save-work', wData);
                    } else {
                        // 복구할 게 없으면 빈 껍데기라도 저장해서 파일 생성
                        ipcRenderer.send('save-work', { manuals: [] });
                    }
                } else if (!wDataRaw) {
                    // 데이터도 없고 파일도 없으면 빈 파일 생성
                    ipcRenderer.send('save-work', { manuals: [] });
                }

                // development 상태 업데이트
                if (dataType === 'all' || dataType === 'development') {
                    remoteUpdateFlags.current.add('development');
                    setDev(dData);
                }

                // work 상태 업데이트
                if (dataType === 'all' || dataType === 'work') {
                    remoteUpdateFlags.current.add('work');
                    setWork(wData);
                }
            }

            // 🟢 [신규] 설비 데이터 로드 (equipment.json)
            if (dataType === 'all' || dataType === 'equipment') {
                // 파일이 없으면 빈 객체 반환하도록 백엔드(main.js)에서 처리 필요, 여기서는 로드 시도
                const eData = await ipcRenderer.invoke('load-equipment') || { list: [], fieldGuides: [] }; // fieldGuides 초기화 포함
                remoteUpdateFlags.current.add('equipment');
                setEquipment(eData);
            }

            if (dataType === 'all') setIsLoaded(true);
        } catch (e) {
            console.error("Load Error:", e);
            alert("데이터 로드 중 오류가 발생했습니다.");
        }
    };

    useEffect(() => { fetchData('all'); }, []);

    useEffect(() => {
        if (!isLoaded) return;
        if (remoteUpdateFlags.current.has('equipment')) {
            remoteUpdateFlags.current.delete('equipment');
            return;
        }
        ipcRenderer.send('save-equipment', equipment);
    }, [equipment, isLoaded]);

    useEffect(() => {
        const handleRefresh = async (event, dataType) => {
            remoteUpdateFlags.current.add(dataType);
            if (dataType === 'schedules') { const updated = await ipcRenderer.invoke('load-schedules'); setTodos(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev); }
            else if (dataType === 'finance') { const updated = await ipcRenderer.invoke('load-finance'); setFinance(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev); }
            else if (dataType === 'mental') { const updated = await ipcRenderer.invoke('load-mental'); setMental(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev); }
            else if (dataType === 'development') { const updated = await ipcRenderer.invoke('load-development'); setDev(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev); }
            else if (dataType === 'work') { const updated = await ipcRenderer.invoke('load-work'); setWork(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev); }
        };
        ipcRenderer.on('data-updated', handleRefresh);
        return () => { ipcRenderer.removeListener('data-updated', handleRefresh); };
    }, []);

    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('schedules')) { remoteUpdateFlags.current.delete('schedules'); return; } ipcRenderer.send('save-schedules', todos); }, [todos, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('finance')) { remoteUpdateFlags.current.delete('finance'); return; } ipcRenderer.send('save-finance', finance); }, [finance, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('mental')) { remoteUpdateFlags.current.delete('mental'); return; } ipcRenderer.send('save-mental', mental); }, [mental, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('development')) { remoteUpdateFlags.current.delete('development'); return; } ipcRenderer.send('save-development', dev); }, [dev, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('work')) { remoteUpdateFlags.current.delete('work'); return; } ipcRenderer.send('save-work', work); }, [work, isLoaded]);

    useEffect(() => {
        const calculateTheme = () => {
            const now = new Date();
            let isDark = true;
            if (themeMode === 'auto') {
                const times = SunCalc.getTimes(now, 37.4563, 126.7052);
                const isDayTime = now > times.sunrise && now < times.sunset;
                isDark = !isDayTime;
            } else { isDark = themeMode === 'dark'; }
            setIsDarkMode(isDark);
            if (ipcRenderer) {
                const body = document.body;
                if (isDark) { body.classList.add('dark'); } else { body.classList.remove('dark'); }
                const color = isDark ? '#18181b' : '#f5f5f5';
                ipcRenderer.send('set-background-color', color);
            }
        };
        if (viewMode === 'chat') { ipcRenderer.send('sync-theme-mode', themeMode); }
        calculateTheme();
        const intervalTime = themeMode === 'auto' ? 60000 : null;
        let timer = null;
        if (intervalTime) { timer = setInterval(calculateTheme, intervalTime); }
        return () => { if (timer) clearInterval(timer); };
    }, [themeMode, viewMode]);

    useEffect(() => {
        const handleMaximizedState = (event, state) => { setIsMaximized(state); };
        ipcRenderer.on('window-maximized-state', handleMaximizedState);
        return () => { ipcRenderer.removeListener('window-maximized-state', handleMaximizedState); };
    }, []);

    // 🟢 [AI 호출 함수: 기존 기능 유지 + 멘탈 종합 분석 강화]
    const callGeminiAI = async (userText) => {
        try {
            // 1. 최신 데이터 로드 (Source of Truth)
            // 🚨 AI가 판단하기 직전에 '진짜 저장된 파일'을 몰래 읽어와서 그것만 보여줍니다.
            const realSchedules = await ipcRenderer.invoke('load-schedules') || [];
            const realMental = await ipcRenderer.invoke('load-mental') || { logs: [] }; // 멘탈 데이터 로드
            const realDev = await ipcRenderer.invoke('load-development') || { tasks: [] }; // 서재 데이터 로드
            const realEquip = await ipcRenderer.invoke('load-equipment') || { list: [] };

            const now = new Date();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const todayStr = now.toISOString().split('T')[0];

            const todayShift = getShiftForDate(now);

            const currentDateInfo = `Current Date: ${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} (${days[now.getDay()]}), Time: ${now.getHours()}:${now.getMinutes()}`;

            // ---------------------------------------------------------
            // 🟢 [Context 1] 일정 컨텍스트 (기존 + 미래 7일 추가)
            // ---------------------------------------------------------
            // (1) 오늘 일정 (기존 로직 유지)
            const todoListContext = realSchedules.length > 0
                ? realSchedules.map(t => {
                    const d = new Date(t.date);
                    const dayName = isNaN(d) ? '' : `(${days[d.getDay()]})`;
                    return `[ID:${t.id}] ${t.date}${dayName} ${t.startTime || ''}${t.endTime ? '~' + t.endTime : ''} : ${t.text}`;
                }).join('\n')
                : "일정이 없습니다. (List is Empty)";

            // (2) 미래 7일 일정 (멘탈 분석용 추가)
            const oneWeekLater = new Date(now);
            oneWeekLater.setDate(now.getDate() + 7);

            const upcomingScheduleText = realSchedules
                .filter(t => {
                    const d = new Date(t.date);
                    return d >= new Date(todayStr) && d <= oneWeekLater;
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(t => `- ${t.date} (${t.startTime || ''}): ${t.text} [Category: ${t.category}]`)
                .join('\n');

            const futureContext = upcomingScheduleText
                ? `[Upcoming Schedules (Next 7 Days)]\n${upcomingScheduleText}`
                : "No upcoming schedules for the next 7 days.";

            // ---------------------------------------------------------
            // 🟢 [Context 2] 멘탈 히스토리 (최근 2주 데이터 강화)
            // ---------------------------------------------------------
            const twoWeeksAgo = new Date(now);
            twoWeeksAgo.setDate(now.getDate() - 14);

            const recentLogs = realMental.logs
                .filter(l => new Date(l.date) >= twoWeeksAgo)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const mentalHistoryText = recentLogs.length > 0
                ? recentLogs.map(l =>
                    `${l.date} | Mood: ${l.mood} | Score: ${l.score} | Note: "${l.summary}"`
                ).join('\n')
                : "No records for the last 2 weeks.";

            // ---------------------------------------------------------
            // 🟢 [Context 3] 서재 컨텍스트 (기존 유지)
            // ---------------------------------------------------------
            const generateCurriculumContext = (tasks) => {
                let context = "";
                tasks.forEach(book => {
                    context += `[BookID: ${book.id}] Title: "${book.title}" (Progress: ${book.progress || 0}%)\n`;
                    const traverse = (nodes, depth = 0) => {
                        if (depth > 2) return;
                        nodes.forEach(node => {
                            const status = node.done ? "✅Done" : "⬜To Do";
                            const note = node.note ? ` (Note: ${node.note.substring(0, 30)}...)` : "";
                            const indent = "  ".repeat(depth + 1);
                            context += `${indent}- ${status} : ${node.title}${note}\n`;
                            if (node.children) traverse(node.children, depth + 1);
                        });
                    };
                    if (book.children) traverse(book.children);
                    context += "\n";
                });
                return context ? context : "서재가 비어있습니다.";
            };
            const libraryContext = generateCurriculumContext(realDev.tasks || []);

            // 🟢 설비 목록 컨텍스트 생성
            const equipContext = realEquip.list.map(e => `[ID:${e.id}] ${e.title} (${e.meta.code})`).join('\n') || "등록된 설비 없음";

            // ---------------------------------------------------------
            // 🟢 [System Instruction] 모든 지침 통합
            // ---------------------------------------------------------
            const systemInstruction = `
        You are 'AI Partner Pro'.

        [🚨 CRITICAL RULES - READ THIS FIRST]
        1. **SOURCE OF TRUTH**: The [Existing Schedules] list below is the **ONLY** truth.
        2. **IGNORE MEMORY**: Do NOT rely on previous conversation history.
        3. **UNCONDITIONAL EXECUTION**: 
           - When the user asks to add a schedule (e.g., "Add PT"), **DO NOT** check for duplicates yourself.
           - **ALWAYS** generate the 'add_todo' JSON action immediately.
        4. **ALWAYS JSON**: Output JSON command only.

        [Context]
        - Current Time: ${currentDateInfo}
        - **Today's Shift**: ${todayShift}
        - **Existing Schedules (All)**: 
        ${todoListContext}
        
        - **Upcoming Schedules (Strategy Context)**:
        ${futureContext}
        
        - **Mental History (Last 2 Weeks)**:
        ${mentalHistoryText}
        
        - **User's Library**:
        ${libraryContext}

        [Task 1: Schedule Management] (Priority: High)
        - Use JSON actions (add_todo, etc.) for schedule commands.
        - "주간/대근" -> 07:30~19:30, "야간/대근" -> 19:30~07:30.
        - **Category Rules**:
          - "health": PT, 헬스, 운동, 병원
          - "work": 회의, 업무, 출장
          - "shift": 근무, 대근
          - "finance": 은행, 주식
          - "development": 공부, 독서
          - "personal": 약속, 여행

        [Task 2: Mental Care & Comprehensive Analysis] (Priority: High)
        - **Trigger**: When user inputs a mood/diary (e.g., "오늘 힘들었어", "기분 좋아", "일기: ...").
        - **Action**: "analyze_mental"
        
        - **Logic for 'advice' (Specific Feedback)**:
           - Analyze the *current* sentiment/score (0-19:Worst, 90-100:Perfect).
           - Give warm empathy or praise for *this specific input*.
           
        - **Logic for 'daily_advice' (Strategic Insight)**:
           - **Look at the Trend**: Is the score dropping over 2 weeks? (Burnout warning). Rising? (Keep it up).
           - **Look at the Schedule**: 
             - Big event coming up? -> Advice on preparation/mindset.
             - Empty schedule? -> Suggest rest/hobby.
           - **Look at the Shift**: 
             - Use shift context wisely (e.g., Night shift + Exam = Sleep strategy).
           - **Output**: One strategic, helpful sentence in Korean.

        [Task 3: Self-Development & Library]
        - **Check Library**: If user asks "What books?", read [User's Library].
        - **Study Tracking**: "I studied [Topic]" -> **ACTION: "record_study"** (mark_done: true).
        - **Note Taking**: "Note that [Content]" -> **ACTION: "record_study"** (note: Content).
        - **Quiz Request**: "Quiz on [Topic]" -> **ACTION: "start_quiz"** (topic: Topic).

        [Task 4: Dashboard Widgets]
        - Trigger: "Check schedule", "Show finance", "Mental status", "Study progress" -> Use "show_X" actions.

        [Task 5: Facility Management] (Priority: High)
        - **Trigger**: User mentions equipment maintenance, repair, or operation (e.g., "1호기 밸브 교체했어", "가스터빈 점검 완료").
        - **Action**: "add_equipment_log"
        - **Logic**: 
          1. Identify the equipment from [Equipment List] using fuzzy matching (e.g., "1호기" -> "가스터빈 1호기").
          2. If equipment is found, use its ID. If not sure, set equipId to null.
          3. Extract the content of the maintenance/operation.

        [JSON Schema]
        { 
          "action": "analyze_mental", 
          "summary": "string", 
          "mood": "string", 
          "score": number, 
          "advice": "Feedback for THIS input", 
          "daily_advice": "Strategic advice based on history & schedule", 
          "tags": ["string"] 
        }
        { "action": "add_todo", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "content": "string", "category": "string" }
        { "action": "modify_todo", "id": number, "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "content": "string" }
        { "action": "delete_todo", "id": number }
        { "action": "search_books", "results": [] }
        { "action": "generate_curriculum", "title": "string", ... } 
        { "action": "record_study", "topic": "string", "note": "string", "mark_done": boolean }
        { "action": "delete_book", "id": "string" }
        { "action": "show_schedule" }
        { "action": "show_finance" }
        { "action": "show_mental" }
        { "action": "show_development" }
        { "action": "chat", "message": "string" }
        { "action": "start_quiz", "topic": "string" }
        { "action": "add_equipment_log", "equipId": number|null, "content": "string", "date": "YYYY-MM-DD" }
        
        IMPORTANT: If multiple actions needed, return a JSON ARRAY.
      `;

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-pro",
                systemInstruction: systemInstruction,
                generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
            });

            const result = await model.generateContent(userText);
            const responseText = result.response.text();

            try {
                let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                if (!cleanText.startsWith('[')) {
                    const firstBracket = cleanText.indexOf('{');
                    const lastBracket = cleanText.lastIndexOf('}');
                    if (firstBracket !== -1 && lastBracket !== -1) {
                        cleanText = cleanText.substring(firstBracket, lastBracket + 1);
                    }
                }
                const command = JSON.parse(cleanText);

                if (command.action === 'chat') { return { type: 'text', text: command.message }; }
                return { type: 'command', command };

            } catch (e) {
                console.error("JSON Parse Error:", e);
                return { type: 'text', text: "데이터를 처리하는 도중 문제가 발생했습니다." };
            }
        } catch (error) {
            console.error("Gemini API Error:", error);
            return { type: 'text', text: `시스템 오류가 발생했습니다: ${error.message}` };
        }
    };

    // 🟢 [메시지 핸들러 수정본] - add_equipment_log 처리 로직 추가
    const handleSendMessage = async (e, manualText = null) => {
        if (e) e.preventDefault();
        const text = manualText || inputValue;
        if (!text.trim()) return;

        setMessages(prev => [...prev, { id: Date.now(), role: 'user', type: 'text', content: text }]);
        setInputValue('');
        setIsTyping(true);

        const res = await callGeminiAI(text);
        setIsTyping(false);

        if (res.type === 'command') {
            if (Array.isArray(res.command) && res.command.length > 0 && !res.command[0].action) {
                return JSON.stringify(res.command);
            }

            const commands = Array.isArray(res.command) ? res.command : [res.command];
            let replyTexts = [];

            for (const command of commands) {
                const { action } = command;
                let replyText = "처리했습니다.";

                // -----------------------------------------------------------
                // 기존 로직들을 그대로 사용하되, res.command 대신 command 변수 사용
                // -----------------------------------------------------------

                // 1. 학습 기록
                if (action === 'record_study') {
                    const { topic, note, mark_done } = command; // command로 변경
                    // ... (기존 record_study 내부 로직 동일하게 유지) ...
                    let found = false;
                    let updatedBookTitle = "";
                    const updateRecursive = (items) => {
                        return items.map(item => {
                            if (item.title.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(item.title.toLowerCase())) {
                                found = true;
                                return { ...item, done: mark_done !== undefined ? mark_done : item.done, note: note ? (item.note ? item.note + "\n\n" + note : note) : item.note };
                            }
                            if (item.children) return { ...item, children: updateRecursive(item.children) };
                            return item;
                        });
                    };
                    setDev(prev => {
                        const newTasks = prev.tasks.map(book => {
                            const updatedChildren = updateRecursive(book.children || []);
                            if (found || book.title.includes(topic)) {
                                updatedBookTitle = book.title;
                                if (book.title.includes(topic)) {
                                    return { ...book, done: mark_done ?? book.done, note: note ? (book.note + "\n" + note) : book.note, children: updatedChildren };
                                }
                                return { ...book, children: updatedChildren };
                            }
                            return book;
                        });
                        return { ...prev, tasks: newTasks };
                    });
                    replyText = found ? `✅ 학습 기록 완료! '${updatedBookTitle}'의 '${topic}' 내용을 업데이트했습니다.` : `⚠️ '${topic}' 항목을 서재에서 찾을 수 없습니다.`;
                }

                // 2. 책 삭제
                else if (action === 'delete_book') {
                    const targetId = command.id; // command로 변경
                    setDev(prev => {
                        const newTasks = (prev.tasks || []).filter(book => String(book.id) !== String(targetId));
                        return { ...prev, tasks: newTasks };
                    });
                    replyText = `🗑️ 요청하신 교재를 서재에서 삭제했습니다.`;
                }

                // 3. 일정 관리 (다중 추가 시 핵심 부분)
                else if (action === 'add_todo') {

                    // 파일에서 최신 데이터 로드
                    let currentRealData = [];
                    try {
                        currentRealData = await ipcRenderer.invoke('load-schedules') || [];
                    } catch (e) { currentRealData = []; }

                    const newDate = command.date; // command로 변경
                    const newTime = command.startTime || '';
                    const newContent = command.content;
                    let finalCategory = command.category;

                    // 카테고리 자동 분류 로직
                    if (!finalCategory || finalCategory === 'default') {
                        const text = newContent.toLowerCase();
                        if (text.includes('pt') || text.includes('헬스') || text.includes('운동') || text.includes('병원')) finalCategory = 'health';
                        else if (text.includes('회식') || text.includes('회의') || text.includes('업무')) finalCategory = 'work';
                        else if (text.includes('근무') || text.includes('대근')) finalCategory = 'shift';
                        else if (text.includes('공부') || text.includes('시험')) finalCategory = 'development';
                        else if (text.includes('은행') || text.includes('주식')) finalCategory = 'finance';
                        else finalCategory = 'default';
                    }

                    // 중복 검사
                    const isDuplicate = currentRealData.some(t => t.date === newDate && (t.startTime || '') === newTime && t.text === newContent);

                    if (isDuplicate) {
                        replyText = `✋ 이미 저장된 일정입니다: ${newContent} (${newDate})`;
                    } else {
                        const newTodo = {
                            id: Date.now() + Math.random(), // 🌟 반복문이므로 ID 충돌 방지 위해 난수 추가
                            text: newContent,
                            date: newDate,
                            startTime: newTime,
                            endTime: command.endTime || '',
                            done: false,
                            memo: '',
                            category: finalCategory
                        };

                        const nextTodos = [...currentRealData, newTodo];
                        ipcRenderer.send('save-schedules', nextTodos); // 저장
                        setTodos(nextTodos);

                        const catMap = { health: '운동', work: '업무', shift: '근무', development: '자기개발', finance: '자산', default: '기타' };
                        replyText = `✅ 일정 추가: ${newDate} ${newContent} (${catMap[finalCategory] || '기타'})`;
                    }
                }


                else if (action === 'modify_todo') {
                    const targetId = command.id;
                    setTodos(prev => {
                        const nextTodos = prev.map(t => {
                            if (t.id === targetId) {
                                return {
                                    ...t,
                                    // 🟢 [수정] 내용뿐만 아니라 날짜, 시간도 값이 있으면 업데이트합니다.
                                    text: command.content || t.text,
                                    date: command.date || t.date,
                                    startTime: command.startTime || t.startTime,
                                    endTime: command.endTime || t.endTime,
                                    // 카테고리 수정도 원하시면 아래 줄 주석 해제
                                    // category: command.category || t.category 
                                };
                            }
                            return t;
                        });
                        ipcRenderer.send('save-schedules', nextTodos);
                        return nextTodos;
                    });
                    replyText = `일정 수정 완료`;
                }
                else if (action === 'delete_todo') {
                    setTodos(prev => {
                        const nextTodos = prev.filter(t => t.id !== command.id);
                        ipcRenderer.send('save-schedules', nextTodos);
                        return nextTodos;
                    });
                    replyText = `일정 삭제 완료`;
                }

                // --- [학습/서재 관리] ---
                else if (action === 'search_books' && command.results) {
                    setDev(prev => ({ ...prev, searchResults: command.results }));
                    replyText = `🔍 총 ${command.results.length}권의 교재가 검색되었습니다.`;
                }
                else if (action === 'generate_curriculum') {
                    const regenerateIds = (item) => ({ ...item, id: Date.now() + Math.random().toString(36).substr(2, 9), children: item.children ? item.children.map(regenerateIds) : [] });

                    // 새 책 데이터 준비 (즐겨찾기 해제 상태)
                    const safeTask = regenerateIds({ ...command, isStarred: false });

                    setDev(prev => {
                        const existingTasks = prev.tasks || [];

                        // 1. 즐겨찾기 된 책과 아닌 책 분리
                        const starredBooks = existingTasks.filter(t => t.isStarred);
                        const normalBooks = existingTasks.filter(t => !t.isStarred);

                        // 2. 순서 조합: [즐겨찾기] -> [새 책] -> [나머지]
                        return {
                            ...prev,
                            searchResults: [],
                            tasks: [...starredBooks, safeTask, ...normalBooks]
                        };
                    });

                    replyText = `📘 '${command.title}' 커리큘럼 생성이 완료되었습니다.`;
                }
                else if (action === 'record_study') {
                    const { topic, note, mark_done } = command;
                    let found = false;
                    const updateRecursive = (items) => items.map(item => {
                        if (item.title.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(item.title.toLowerCase())) {
                            found = true;
                            return { ...item, done: mark_done ?? item.done, note: note ? (item.note ? item.note + "\n\n" + note : note) : item.note };
                        }
                        if (item.children) return { ...item, children: updateRecursive(item.children) };
                        return item;
                    });
                    setDev(prev => ({ ...prev, tasks: updateRecursive(prev.tasks || []) }));
                    replyText = found ? `✅ 학습 기록: '${topic}' 업데이트 완료` : `⚠️ '${topic}' 항목을 찾을 수 없습니다.`;
                }
                else if (action === 'delete_book') {
                    setDev(prev => ({ ...prev, tasks: (prev.tasks || []).filter(b => String(b.id) !== String(command.id)) }));
                    replyText = `🗑️ 책 삭제 완료`;
                }
                else if (action === 'start_quiz') {
                    const targetTopic = command.topic;
                    setAiModalContent({ title: targetTopic, content: '' });
                    setShowAiModal(true);
                    setTimeout(() => { handleGenerateQuiz(); }, 100);
                    replyText = `📝 '${targetTopic}' 관련 실전 문제를 생성합니다.`;
                }

                // --- [멘탈 관리] ---
                else if (action === 'analyze_mental') {
                    const todayDate = new Date().toISOString().split('T')[0];
                    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const newLog = { id: Date.now(), date: todayDate, time: timeStr, summary: command.summary, mood: command.mood, score: command.score, advice: command.advice, tags: command.tags || [] };
                    setMental(prev => {
                        const todayLogs = prev.logs.filter(log => log.date === todayDate);
                        const totalScore = todayLogs.reduce((acc, cur) => acc + cur.score, 0) + newLog.score;
                        const avgScore = Math.round(totalScore / (todayLogs.length + 1));
                        return { ...prev, currentMood: newLog.mood, score: avgScore, todayAdvice: command.daily_advice, logs: [newLog, ...prev.logs] };
                    });
                    replyText = `📝 멘탈 기록 완료: ${command.mood} (${command.score}점)`;
                }

                // --- [위젯 표시] ---
                else if (['show_schedule', 'show_finance', 'show_mental', 'show_development'].includes(action)) {
                    const typeMap = { 'show_schedule': 'schedule', 'show_finance': 'finance', 'show_mental': 'mental', 'show_development': 'development' };
                    const dataMap = { 'show_schedule': todos, 'show_finance': finance, 'show_mental': mental, 'show_development': dev };
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'ai', type: 'widget', widgetType: typeMap[action], data: dataMap[action] }]);
                    replyText = null;
                }

                // 🟢 [추가] 설비 이력 추가 액션
                if (action === 'add_equipment_log') {
                    const { equipId, content, date } = command;
                    setEquipment(prev => {
                        // ID가 없으면 첫 번째 설비에 기록 (혹은 에러 처리)
                        const targetId = equipId || (prev.list.length > 0 ? prev.list[0].id : null);

                        if (!targetId) {
                            replyText = "⚠️ 해당 설비를 찾을 수 없어 기록하지 못했습니다.";
                            return prev;
                        }

                        const newLog = {
                            id: Date.now(),
                            date: date || new Date().toISOString().split('T')[0],
                            content: content,
                            type: 'AI' // AI가 기록함 표시
                        };

                        const newList = prev.list.map(e => e.id === targetId ? { ...e, logs: [newLog, ...(e.logs || [])] } : e);
                        // 즉시 파일 저장
                        ipcRenderer.send('save-equipment', { ...prev, list: newList });
                        replyText = `🔧 정비 이력을 기록했습니다: ${content}`;
                        return { ...prev, list: newList };
                    });
                }

                if (replyText) replyTexts.push(replyText);
            } // 반복문 종료

            // 최종 답변 출력
            if (replyTexts.length > 0) {
                const finalReply = replyTexts.join('\n');
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', type: 'text', content: finalReply }]);
                return finalReply;
            }
            return "처리가 완료되었습니다.";
        }
        else {
            // 일반 텍스트 응답
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', type: 'text', content: res.text }]);
            return res.text;
        }
    };

    const handleToggleDashboard = () => { ipcRenderer.send('toggle-dashboard'); };

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <div className="h-screen w-full bg-transparent flex items-center justify-center p-[1px]">
                <div className="flex flex-col w-full h-full font-sans overflow-hidden relative transition-colors duration-500 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 border dark:border-zinc-800 rounded-2xl">

                    <header className="drag-region h-14 flex items-center justify-between px-4 border-b bg-white/80 border-zinc-200/50 dark:bg-zinc-900/80 dark:border-white/5 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-colors ${viewMode === 'chat' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}><Bot size={16} className="text-white" /></div>
                            <h1 className="font-bold text-xs tracking-tight">AI Partner Pro</h1>
                        </div>
                        <div className="flex items-center gap-1 no-drag">
                            {viewMode === 'chat' ? (<button onClick={handleToggleDashboard} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors mr-2"><LayoutDashboard size={18} /></button>) : (<div className="mr-2"></div>)}
                            <button onClick={() => setThemeMode(p => p === 'auto' ? 'light' : p === 'light' ? 'dark' : 'auto')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 relative">{themeMode === 'auto' ? (<>{isDarkMode ? <Moon size={18} /> : <Sun size={18} />}<span className="absolute bottom-0 right-0 h-[10px] w-auto px-1 bg-indigo-600 text-white text-[6px] font-bold rounded-full flex items-center justify-center -mb-0.5 -mr-0.5 leading-none">AUTO</span></>) : (isDarkMode ? <Moon size={18} /> : <Sun size={18} />)}</button>
                            {viewMode === 'chat' ? (<><button onClick={() => ipcRenderer.send('minimize-window')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"><Minus size={18} /></button><button onClick={() => ipcRenderer.send('hide-window')} className="p-2 rounded-full hover:bg-rose-500 hover:text-white text-zinc-400"><X size={18} /></button></>) : (<><button onClick={() => ipcRenderer.send('dashboard-minimize')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"><Minus size={18} /></button><button onClick={() => ipcRenderer.send('dashboard-maximize')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400">{isMaximized ? <Copy size={16} /> : <Square size={16} />}</button><button onClick={() => ipcRenderer.send('dashboard-close')} className="p-2 rounded-full hover:bg-rose-500 hover:text-white text-zinc-400"><X size={18} /></button></>)}
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-zinc-100/50 dark:to-transparent">
                        {viewMode === 'dashboard' ? (
                            <DashboardView
                                todos={todos} setTodos={setTodos}
                                finance={finance} setFinance={setFinance}
                                mental={mental} setMental={setMental}
                                dev={dev} setDev={setDev}
                                dashboardSubView={dashboardSubView} setDashboardSubView={setDashboardSubView}
                                isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded}
                                handleSendMessage={handleSendMessage}
                                settings={settings}
                                handleGroupChange={handleGroupChange}
                                getShiftForDate={getShiftForDate}
                                activeBookId={activeBookId}       // 🟢 추가
                                setActiveBookId={setActiveBookId} // 🟢 추가
                                work={work}       // 🟢 추가
                                setWork={setWork}
                                setWorkViewMode={setWorkViewMode}
                                workViewMode={workViewMode}
                                equipment={equipment}       // 🟢 전달
                                setEquipment={setEquipment} // 🟢 전달
                            />
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm ${msg.role === 'ai' ? 'bg-white border-zinc-200 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                                                {msg.role === 'ai' ? <Sparkles size={14} /> : <User size={14} className="opacity-70" />}
                                            </div>
                                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm border max-w-[85%] ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white border-indigo-500'
                                                : msg.type === 'widget'
                                                    ? 'bg-transparent border-none shadow-none p-0'
                                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                                                }`}>
                                                {msg.type === 'widget' ? (
                                                    <>
                                                        {msg.widgetType === 'schedule' && <ScheduleChatWidget data={msg.data} />}
                                                        {msg.widgetType === 'finance' && <FinanceChatWidget data={msg.data} />}
                                                        {msg.widgetType === 'mental' && <MentalChatWidget data={msg.data} />}
                                                        {msg.widgetType === 'development' && <StudyChatWidget data={msg.data} />}
                                                    </>
                                                ) : (
                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && <div className="text-xs text-zinc-400 ml-12">AI가 생각중입니다...</div>}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
                                    <form onSubmit={handleSendMessage} className="relative">
                                        <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="AI에게 명령 (예: 기분 기록해줘, 자산 추가해줘)" className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                                        <button type="submit" disabled={!inputValue.trim()} className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"><Send size={16} /></button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;