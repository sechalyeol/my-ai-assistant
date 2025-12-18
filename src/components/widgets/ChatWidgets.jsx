// Last Updated: 2025-12-18 17:50:21
import React, { useState } from 'react';
import { Calendar as CalendarIcon, Wallet, Heart, BookOpen, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

// 1. 일정 위젯
export const ScheduleChatWidget = ({ data }) => {
    const upcoming = (data || [])
        .filter(t => {
            const d = new Date(t.date);
            d.setHours(23, 59, 59, 999);
            return d >= new Date();
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);

    const getDDay = (dateStr) => {
        const target = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = (target - today) / (1000 * 60 * 60 * 24);
        if (diff === 0) return "D-Day";
        if (diff === 1) return "내일";
        return `D-${Math.ceil(diff)}`;
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

// 2. 자산 위젯
export const FinanceChatWidget = ({ data }) => (
    <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Wallet size={16} className="text-emerald-500" />
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">자산 현황</span>
        </div>
        <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">총 자산</span>
            <span className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight">
                ₩ {data?.totalAsset?.toLocaleString() || 0}
            </span>
        </div>
    </div>
);

// 3. 멘탈 위젯
export const MentalChatWidget = ({ data }) => {
    const getStatus = (score) => {
        if (score >= 80) return { color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20", label: "매우 좋음" };
        if (score >= 50) return { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "안정적" };
        return { color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", label: "지침/우울" };
    };
    const status = getStatus(data?.score || 0);

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-0 overflow-hidden shadow-sm">
            <div className="p-4 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Heart size={16} className="text-rose-500 fill-rose-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">오늘의 마음 날씨</span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                    {data?.currentMood || '기록 없음'}
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className={`text-4xl font-black ${status.color}`}>{data?.score || 0}</span>
                    <span className="text-sm text-zinc-400 font-medium">/100</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700/50">
                    <div className="flex gap-2">
                        <span className="text-lg">💡</span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-keep">
                            {data?.todayAdvice || "오늘 하루 감정을 기록해보세요."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. 학습 위젯 (리스트형)
export const StudyChatWidget = ({ data }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) return node && node.done ? 100 : 0;
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    const allBooks = (data?.tasks || []).map(book => ({
        ...book,
        calculatedProgress: calculateProgress(book)
    })).sort((a, b) => b.calculatedProgress - a.calculatedProgress);

    const visibleBooks = isExpanded ? allBooks : allBooks.slice(0, 3);

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-600" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">학습 라이브러리</span>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">
                    총 {allBooks.length}권
                </span>
            </div>
            <div className="space-y-3">
                {visibleBooks.length > 0 ? visibleBooks.map(book => (
                    <div key={book.id} className="group flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate w-40">{book.title}</span>
                            <span className={`font-bold ${book.calculatedProgress === 100 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                {book.calculatedProgress}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div style={{ width: `${book.calculatedProgress}%` }} className={`h-full rounded-full transition-all duration-500 ${book.calculatedProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
                        </div>
                    </div>
                )) : <div className="text-xs text-zinc-400 text-center py-2">등록된 교재가 없습니다.</div>}
            </div>
            {allBooks.length > 3 && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-3 py-2 text-[10px] font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 rounded-lg flex items-center justify-center gap-1">
                    {isExpanded ? <>접기 <ChevronLeft size={12} className="rotate-90" /></> : <>더보기 (+{allBooks.length - 3}) <ChevronRight size={12} className="rotate-90" /></>}
                </button>
            )}
        </div>
    );
};

// 5. 3D 책 커버 플로우 위젯 (완전 복구)
export const BookCoverFlowWidget = ({ tasks, onBookClick }) => {
    const books = tasks || [];
    const [currentIndex, setCurrentIndex] = useState(0);

    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) return node && node.done ? 100 : 0;
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    const currentBook = books[currentIndex];
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
                                        <button className="w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-lg flex items-center justify-center text-emerald-600 hover:scale-110 transition-transform cursor-pointer border border-emerald-100 dark:border-zinc-600">
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
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate px-4">{currentBook?.title}</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mb-1">{currentBook?.author || '저자 미상'}</p>
                <div className="flex items-center gap-2 justify-center px-6">
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div style={{ width: `${currentProgress}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"></div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600">{currentProgress}%</span>
                </div>
            </div>
        </div>
    );
};

// src/components/widgets/ChatWidgets.jsx

// src/components/widgets/ChatWidgets.jsx

export const CustomDashboardChatWidget = ({ data }) => {
    const memos = data.filter(w => w.type === 'card');
    const links = data.filter(w => w.type === 'link');

    return (
        <div className="w-80 flex flex-col gap-4">
            {/* 1. 메모/알람 섹션 */}
            {memos.length > 0 && (
                <div className="space-y-2.5">
                    {memos.map(memo => {
                        // 시간 정보가 있으면 알람으로 간주
                        const isAlarm = !!memo.targetTime;
                        
                        return (
                            <div key={memo.id} className={`p-3.5 rounded-2xl border shadow-sm transition-all ${
                                isAlarm 
                                ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                                : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                            }`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                                            isAlarm ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            {isAlarm ? '⏰' : '📌'}
                                        </span>
                                        <span className={`text-xs font-bold ${
                                            isAlarm ? 'text-indigo-900 dark:text-indigo-200' : 'text-amber-900 dark:text-amber-200'
                                        }`}>
                                            {memo.title}
                                        </span>
                                    </div>
                                    {isAlarm && (
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-600 text-white rounded-full shadow-sm shadow-indigo-200">
                                            {memo.targetTime}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed pl-1">
                                    {memo.content}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 2. 링크 섹션 (기존 코드 유지) */}
            {/* ... */}
        </div>
    );
};