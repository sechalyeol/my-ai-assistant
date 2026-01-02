// Last Updated: 2026-01-03 01:53:17
import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import TodoModal from '../components/modals/TodoModal'; // 1단계에서 만든 모달 import
import { getEventStyle, GROUP_START_DATES, COMMON_SHIFT_PATTERN } from '../constants'; // 1단계에서 만든 상수 import

const { ipcRenderer } = window.require('electron');

const ScheduleDetailView = ({ todos, setTodos, settings, onGroupChange, getShiftForDate }) => {
    const [calendarMode, setCalendarMode] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [expandedDate, setExpandedDate] = useState(null);
    const [dialogConfig, setDialogConfig] = useState({ isOpen: false, message: '', onConfirm: null });

    const [draggedTodoId, setDraggedTodoId] = useState(null);
    const [resizingTodo, setResizingTodo] = useState(null);

    const [guideTime, setGuideTime] = useState(null);
    const [guideLeft, setGuideLeft] = useState(null);
    const [hoveredRowDate, setHoveredRowDate] = useState(null);

    const [expandedMemoDates, setExpandedMemoDates] = useState(new Set());
    const lastScrollTime = useRef(0);

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

    // 🟢 [수정] 삭제 확인 다이얼로그 띄우기
    // 🟢 [수정] 삭제 확인 다이얼로그 띄우기
    const handleDeleteTodo = (id) => {
        if (typeof id === 'string' && id.startsWith('auto-shift')) {
            alert("자동 생성된 근무 일정은 삭제할 수 없습니다.");
            return;
        }
        setDialogConfig({
            isOpen: true,
            message: "정말 이 일정을 삭제하시겠습니까?",
            onConfirm: () => {
                setTodos(prev => {
                    // 🌟 ID를 문자열로 변환해서 비교하도록 수정
                    const newTodos = prev.filter(t => String(t.id) !== String(id));
                    ipcRenderer.send('save-schedules', newTodos);
                    return newTodos;
                });
                setSelectedTodo(null);
                if (expandedDate) setExpandedDate(null);
            }
        });
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
                                return durationB - durationA;
                            });
                            const untimedEvents = dayEvents.filter(t => !t.startTime);

                            const isExpanded = expandedMemoDates.has(dateStr);
                            const visibleUntimed = isExpanded ? untimedEvents : untimedEvents.slice(0, 1);
                            const hiddenCount = untimedEvents.length - 1;

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

                                        {guideTime && draggedTodoId && hoveredRowDate === dateStr && (<div className="absolute top-0 bottom-0 w-px bg-indigo-500 z-30 pointer-events-none" style={{ left: guideLeft }}><div className="absolute -top-[25px] left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">{guideTime}</div></div>)}
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

            {/* 🌟 [추가] 삭제 확인 다이얼로그 UI */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 w-80 p-6 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                        <h3 className="font-bold text-lg mb-2 text-zinc-800 dark:text-zinc-100">확인</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 whitespace-pre-wrap">{dialogConfig.message}</p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setDialogConfig({ ...dialogConfig, isOpen: false })} 
                                className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                                취소
                            </button>
                            <button 
                                onClick={() => { 
                                    if (dialogConfig.onConfirm) dialogConfig.onConfirm(); 
                                    setDialogConfig({ ...dialogConfig, isOpen: false }); 
                                }} 
                                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg"
                            >
                                네, 삭제할게요
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ScheduleDetailView;