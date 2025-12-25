// Last Updated: 2025-12-26 02:32:54
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Sparkles, Send, Trash2, BookOpen, Heart, Bot, AlertTriangle } from 'lucide-react';

const { ipcRenderer } = window.require('electron');

const MentalDetailView = ({ mental, setMental, handleSendMessage }) => {
    const [diaryInput, setDiaryInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // 🟢 [추가] 삭제 모달 관련 State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const handleDiarySubmit = async () => {
        if (!diaryInput.trim()) return;
        setIsAnalyzing(true);
        await handleSendMessage(null, `일기: ${diaryInput}`);
        setDiaryInput('');
        setIsAnalyzing(false);
    };

    // 🟢 [수정] 삭제 요청 (모달 띄우기)
    const requestDeleteLog = (id) => {
        setDeleteTargetId(id);
        setShowDeleteModal(true);
    };

    // 🟢 [수정] 실제 삭제 실행
    const confirmDeleteLog = () => {
        if (!deleteTargetId) return;

        setMental(prev => {
            const newLogs = prev.logs.filter(log => log.id !== deleteTargetId);
            const todayStr = new Date().toISOString().split('T')[0];
            const todayLogs = newLogs.filter(log => log.date === todayStr);

            let newScore = 0;
            if (todayLogs.length > 0) {
                const total = todayLogs.reduce((acc, cur) => acc + cur.score, 0);
                newScore = Math.round(total / todayLogs.length);
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

            ipcRenderer.send('save-mental', newMentalData);
            return newMentalData;
        });

        setShowDeleteModal(false);
        setDeleteTargetId(null);
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
        if (score === 0) return "text-zinc-300";
        if (score >= 80) return "text-emerald-500";
        if (score >= 50) return "text-indigo-500";
        return "text-rose-500";
    };

    return (
        <div className="h-full flex flex-col gap-4 animate-fade-in p-2 overflow-hidden relative">
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
                            const displayTime = log.time || new Date(log.id).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                            return (
                                <div key={log.id} className="bg-white dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group relative">
                                    <button onClick={() => requestDeleteLog(log.id)} className="absolute top-4 right-4 p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="삭제"><Trash2 size={14} /></button>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
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
                                    <div className="mb-3 pl-1 border-l-2 border-zinc-200 dark:border-zinc-700"><p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic pl-2">"{log.summary}"</p></div>
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30 relative"><Bot size={14} className="absolute top-3 left-3 text-indigo-500" /><p className="text-xs text-zinc-700 dark:text-zinc-300 pl-6 leading-relaxed font-medium">{log.advice}</p></div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 🟢 삭제 확인 모달 추가 */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white dark:bg-zinc-900 w-[320px] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-rose-500" />
                        </div>
                        <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 mb-2">기록 삭제</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                            이 마음 기록을 정말 삭제하시겠습니까?<br />삭제 후에는 복구할 수 없습니다.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">취소</button>
                            <button onClick={confirmDeleteLog} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-colors">삭제</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentalDetailView;