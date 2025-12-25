// Last Updated: 2025-12-25 20:05:28
// src/constants/index.js

// 🟢 4개 그룹의 기준일 데이터 (상수)
export const GROUP_START_DATES = {
    "운영 1그룹": new Date(2025, 2, 5),
    "운영 2그룹": new Date(2025, 2, 26),
    "운영 3그룹": new Date(2025, 2, 12),
    "운영 4그룹": new Date(2025, 2, 19)
};

// 🟢 공통 근무 패턴 (상수)
export const COMMON_SHIFT_PATTERN = [
    "주간 근무", "주간 근무", "휴무", "휴무", "휴무",
    "야간 근무", "야간 근무", "휴무", "휴무",
    "주간 근무", "주간 근무", "주간 근무", "휴무", "휴무",
    "야간 근무", "야간 근무", "휴무", "휴무", "휴무",
    "주간 근무", "주간 근무", "휴무", "휴무",
    "야간 근무", "야간 근무", "야간 근무", "휴무", "휴무",
];

export const getEventStyle = (todo) => {
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