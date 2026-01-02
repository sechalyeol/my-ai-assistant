// Last Updated: 2026-01-03 01:53:17
// src/components/modals/TodoModal.jsx
import React, { useState } from 'react';
import {
    Edit3, X, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, Trash2, Save, AlertCircle
} from 'lucide-react';

const TodoModal = ({ todo, onClose, onSave, onDelete }) => {
    const [editedTodo, setEditedTodo] = useState({ ...todo });

    // 팝업 상태
    const [showCalendar, setShowCalendar] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    
    // 🟢 [추가] 삭제 확인 모드 상태
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

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

    // --- ⏰ 커스텀 시간 선택기 ---
    const renderCustomTimePicker = (field, closeFn, align = 'left') => {
        const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
        const minutes = ['00', '10', '20', '30', '40', '50'];
        const currentVal = editedTodo[field] || '09:00';
        const [currH, currM] = currentVal.split(':');

        return (
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

    // 🟢 실제 삭제 실행 핸들러
    const handleActualDelete = () => {
        if (onDelete) {
            onDelete(todo.id);
            onClose(); // 삭제 후 모달 닫기
        } else {
            console.error("onDelete 함수가 TodoModal에 전달되지 않았습니다!");
            alert("삭제 기능이 연결되지 않았습니다. 개발자에게 문의하세요.");
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
                            {showEndTimePicker && renderCustomTimePicker('endTime', setShowEndTimePicker, 'right')}
                        </div>
                    </div>

                    {/* 메모 */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 block">메모</label>
                        <textarea value={editedTodo.memo || ''} onChange={(e) => handleChange('memo', e.target.value)} placeholder="상세 내용을 입력하세요..." className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none scrollbar-hide text-zinc-800 dark:text-zinc-100" />
                    </div>
                </div>

                {/* 🟢 [수정됨] 하단 버튼 영역: 삭제 확인 모드 추가 */}
                <div className="flex gap-3 mt-8">
                    {isDeleteConfirming ? (
                        // 삭제 확인 모드일 때 보여질 버튼들
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
                        // 평소 상태일 때 보여질 버튼들
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