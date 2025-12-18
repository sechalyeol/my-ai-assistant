// Last Updated: 2025-12-18 17:50:21
import React from 'react';
import { Settings, X, Calendar as CalendarIcon, Wallet, Heart, BookOpen, Briefcase } from 'lucide-react';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
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

export default SettingsModal;