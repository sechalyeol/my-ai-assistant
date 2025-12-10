// Last Updated: 2025-12-10 15:38:38
import React from 'react';
import { Calendar as CalendarIcon, Wallet, Heart, BookOpen } from 'lucide-react';

// 1. 일정 위젯
export const ScheduleChatWidget = ({ data }) => (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold"><CalendarIcon size={14}/> 일정 확인</div>
        <div className="text-xs space-y-1">
            {data && data.length > 0 ? data.slice(0,3).map((t,i)=><div key={i}>• {t.text}</div>) : "일정이 없습니다."}
        </div>
    </div>
);

// 2. 자산 위젯
export const FinanceChatWidget = ({ data }) => (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold"><Wallet size={14}/> 자산 현황</div>
        <div className="text-sm font-bold">₩ {data?.totalAsset?.toLocaleString() || 0}</div>
    </div>
);

// 3. 멘탈 위젯
export const MentalChatWidget = ({ data }) => (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-2 text-rose-600 font-bold"><Heart size={14}/> 멘탈 점수</div>
        <div className="text-sm">현재 기분: {data?.currentMood} ({data?.score}점)</div>
    </div>
);

// 4. 학습 위젯
export const StudyChatWidget = ({ data }) => (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-2 text-amber-600 font-bold"><BookOpen size={14}/> 학습 현황</div>
        <div className="text-xs">등록된 책: {data?.tasks?.length || 0}권</div>
    </div>
);

// 5. 책 커버 플로우 (대시보드용)
export const BookCoverFlowWidget = ({ tasks, onBookClick }) => {
    if (!tasks || tasks.length === 0) return <div className="text-xs text-zinc-400 text-center py-10">등록된 도서가 없습니다.</div>;
    return (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
            {tasks.map((book) => (
                <div key={book.id} onClick={() => onBookClick(book.id)} className="flex-shrink-0 w-20 cursor-pointer group">
                    <div className="aspect-[1/1.4] rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm group-hover:shadow-md transition-all">
                        {book.cover ? <img src={book.cover} className="w-full h-full object-cover" alt={book.title}/> : <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300"><BookOpen size={20}/></div>}
                    </div>
                    <p className="text-[10px] mt-1 truncate text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">{book.title}</p>
                </div>
            ))}
        </div>
    );
};