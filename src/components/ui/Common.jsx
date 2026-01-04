// Last Updated: 2026-01-04 20:42:03
// src/components/ui/Common.jsx
import React from 'react';
import { ChevronRight } from 'lucide-react';

export function DashboardCard({ title, icon: Icon, children, className = "" }) {
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

export const SideBarItem = ({ icon: Icon, label, active, onClick, isExpanded }) => (
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