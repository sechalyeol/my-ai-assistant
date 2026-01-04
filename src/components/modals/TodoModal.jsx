// Last Updated: 2026-01-04 20:42:03
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Edit3, X, ChevronRight, ChevronLeft, ChevronDown, Check,
    Calendar as CalendarIcon, Clock, Trash2, Save, AlertCircle
} from 'lucide-react';

// 카테고리 목록 정의
const CATEGORIES = [
    { value: 'default', label: '⚪ 기본 / 기타' },
    { value: 'shift', label: '🚨 근무 / 대근' },
    { value: 'work', label: '💼 업무 / 회의' },
    { value: 'personal', label: '🌱 개인 용무' },
    { value: 'health', label: '💪 건강 / 운동' },
    { value: 'finance', label: '💰 자산 / 금융' },
    { value: 'development', label: '📚 자기개발' },
];

// 🌟 [수정 1] VariableDropdown을 TodoModal 밖으로 꺼냈습니다. (성능 및 상태 유지 필수)
const VariableDropdown = ({ value, options, onChange, placeholder, theme = 'indigo', closeAllPopups }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : (placeholder || '선택하세요');

    const activeClass = theme === 'emerald'
        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold'
        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold';
            
    const dotClass = theme === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500';
    
    const borderColor = isOpen 
        ? (theme === 'emerald' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-indigo-500 ring-1 ring-indigo-500')
        : 'border-zinc-200 dark:border-zinc-700';

    const toggle = (e) => {
        e.stopPropagation();
        if (closeAllPopups) closeAllPopups(); // 다른 팝업 닫기 요청

        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                // 🌟 [수정 2] fixed 포지션을 사용하므로 window.scrollY를 더하지 않습니다.
                top: rect.bottom + 4, 
                left: rect.left,
                width: rect.width
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button
                ref={triggerRef}
                onClick={toggle}
                className={`w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 border ${borderColor} rounded-xl px-4 py-3 text-sm transition-all outline-none group`}
            >
                <span className={value ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-400"}>
                    {displayLabel}
                </span>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : 'group-hover:text-zinc-600'}`} />
            </button>

            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
                    <div
                        className="fixed z-[9999] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden animate-fade-in-down max-h-64 overflow-y-auto custom-scrollbar"
                        style={{
                            top: coords.top,
                            left: coords.left,
                            width: coords.width
                        }}
                    >
                        <div className="p-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2
                                        ${value === opt.value
                                            ? activeClass
                                            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${value === opt.value ? dotClass : 'bg-transparent'}`}></div>
                                    <span className="flex-1 truncate">{opt.label}</span>
                                    {value === opt.value && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
};

const TodoModal = ({ todo, onClose, onSave, onDelete }) => {
    const [editedTodo, setEditedTodo] = useState({ ...todo });

    // 팝업 상태
    const [showCalendar, setShowCalendar] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // 위치 계산용 Refs
    const dateInputRef = useRef(null);
    const startTimeInputRef = useRef(null);
    const endTimeInputRef = useRef(null);
    const [popupCoords, setPopupCoords] = useState({ top: 0, left: 0 });

    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
    const [navDate, setNavDate] = useState(todo && todo.date ? new Date(todo.date) : new Date());

    if (!todo) return null;

    const handleChange = (field, value) => { setEditedTodo(prev => ({ ...prev, [field]: value })); };
    const closeAllPopups = () => { setShowCalendar(false); setShowStartTimePicker(false); setShowEndTimePicker(false); };

    // 🌟 [수정 2] 다른 팝업들도 fixed라면 window.scrollY 제거 필요 (상황에 따라 다름)
    // 현재 코드의 캘린더/시간선택기는 position: fixed를 사용하므로 여기서도 scrollY를 빼는 것이 안전합니다.
    const updatePopupPosition = (ref) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPopupCoords({
                top: rect.bottom + 4, // scrollY 제거
                left: rect.left
            });
        }
    };

    // --- 🗓️ 커스텀 달력 (Portal) ---
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

        return createPortal(
            <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowCalendar(false)} />
                <div
                    className="fixed z-[9999] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-4 animate-fade-in-up w-64"
                    style={{ top: popupCoords.top, left: popupCoords.left }}
                >
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
            </>,
            document.body
        );
    };

    // --- ⏰ 커스텀 시간 선택기 (Portal) ---
    const renderCustomTimePicker = (field, closeFn) => {
        const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
        const minutes = ['00', '10', '20', '30', '40', '50'];
        const currentVal = editedTodo[field] || '09:00';
        const [currH, currM] = currentVal.split(':');

        return createPortal(
            <>
                <div className="fixed inset-0 z-[9998]" onClick={() => closeFn(false)} />
                <div
                    className="fixed z-[9999] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-2 animate-fade-in-up flex gap-2 h-48 w-48"
                    style={{ top: popupCoords.top, left: popupCoords.left }}
                >
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
            </>,
            document.body
        );
    };

    const handleActualDelete = () => {
        if (onDelete) {
            onDelete(todo.id);
            onClose();
        } else {
            alert("삭제 기능이 연결되지 않았습니다.");
        }
    };

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
                    {/* 🌟 [적용] 베리어블 디자인 카테고리 드롭다운 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">카테고리</label>
                        <VariableDropdown
                            value={editedTodo.category || 'default'}
                            options={CATEGORIES}
                            onChange={(val) => handleChange('category', val)}
                            placeholder="카테고리 선택"
                            closeAllPopups={closeAllPopups} // 기존 팝업 닫기 함수 전달
                        />
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
                            <div className="relative" ref={dateInputRef}>
                                <input
                                    type="text"
                                    readOnly
                                    value={editedTodo.date || ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updatePopupPosition(dateInputRef);
                                        setShowCalendar(!showCalendar);
                                        setShowStartTimePicker(false);
                                        setShowEndTimePicker(false);
                                    }}
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
                            <div className="relative" ref={startTimeInputRef}>
                                <input
                                    type="text"
                                    readOnly
                                    value={editedTodo.startTime || ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updatePopupPosition(startTimeInputRef);
                                        setShowStartTimePicker(!showStartTimePicker);
                                        setShowCalendar(false);
                                        setShowEndTimePicker(false);
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-center"
                                    placeholder="00:00"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><Clock size={14} /></div>
                            </div>
                            {showStartTimePicker && renderCustomTimePicker('startTime', setShowStartTimePicker)}
                        </div>

                        {/* 종료 시간 */}
                        <div className="relative">
                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">종료 시간</label>
                            <div className="relative" ref={endTimeInputRef}>
                                <input
                                    type="text"
                                    readOnly
                                    value={editedTodo.endTime || ''}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updatePopupPosition(endTimeInputRef);
                                        setShowEndTimePicker(!showEndTimePicker);
                                        setShowCalendar(false);
                                        setShowStartTimePicker(false);
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-center"
                                    placeholder="00:00"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400"><Clock size={14} /></div>
                            </div>
                            {showEndTimePicker && renderCustomTimePicker('endTime', setShowEndTimePicker)}
                        </div>
                    </div>

                    {/* 메모 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">메모</label>
                        <textarea value={editedTodo.memo || ''} onChange={(e) => handleChange('memo', e.target.value)} placeholder="상세 내용을 입력하세요..." className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none scrollbar-hide text-zinc-800 dark:text-zinc-100" />
                    </div>
                </div>

                {/* 하단 버튼 (이전과 동일) */}
                <div className="flex gap-3 mt-8">
                    {isDeleteConfirming ? (
                        <>
                            <button
                                onClick={() => setIsDeleteConfirming(false)}
                                className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-bold transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleActualDelete}
                                className="flex-[2] py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 animate-fade-in"
                            >
                                <AlertCircle size={16} /> 네, 삭제할게요
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsDeleteConfirming(true)}
                                className="flex-1 py-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> 삭제
                            </button>
                            <button
                                onClick={() => onSave(editedTodo)}
                                className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <Save size={16} /> 저장하기
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodoModal;