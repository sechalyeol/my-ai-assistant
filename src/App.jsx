// Last Updated: 2025-12-17 03:03:57
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import SunCalc from 'suncalc';
import {
    Send, Bot, User, Sparkles, LayoutDashboard, Menu, Calendar as CalendarIcon, Users, Edit3, Settings, LogOut,
    Home, Wallet, Heart, BookOpen, Briefcase, Minus, X, Copy, Square, CheckSquare, Sun, Moon
} from 'lucide-react';

// 분리된 컴포넌트들 Import
import { GROUP_START_DATES, COMMON_SHIFT_PATTERN } from './constants';
import { getSystemInstruction } from './constants/systemPrompts';

import DashboardView from './views/DashboardView';
import ScheduleDetailView from './views/ScheduleDetailView';
import MentalDetailView from './views/MentalDetailView';
import DevelopmentDetailView from './views/DevelopmentDetailView';
import WorkDetailView from './views/WorkDetailView';
import SettingsModal from './components/modals/SettingsModal';
import GlobalSettingsModal from './components/modals/GlobalSettingsModal';
import {
    ScheduleChatWidget, MentalChatWidget, StudyChatWidget, FinanceChatWidget
} from './components/widgets/ChatWidgets';

const { ipcRenderer } = window.require('electron');
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const SideBarItem = ({ icon: Icon, label, active, onClick, isExpanded }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-start rounded-lg transition-colors p-2 ${active ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'} ${isExpanded ? 'justify-between' : 'justify-center'}`} title={!isExpanded ? label : undefined}>
        <span className={`flex items-center ${isExpanded ? 'gap-3' : 'gap-0'}`}><Icon size={16} />{isExpanded && <span className="text-sm whitespace-nowrap">{label}</span>}</span>
    </button>
);

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

    // 설정 모달 State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);

    const [isLoaded, setIsLoaded] = useState(false);
    const remoteUpdateFlags = useRef(new Set());

    const [customWidgets, setCustomWidgets] = useState([]);

    // 데이터 State
    const [todos, setTodos] = useState([]);
    const [settings, setSettings] = useState({ selectedGroup: "운영 1그룹" });
    const [work, setWork] = useState({ manuals: [] });
    const [equipment, setEquipment] = useState({ list: [], fieldGuides: [] });
    const [finance, setFinance] = useState({ totalAsset: 0, items: [] });
    const [mental, setMental] = useState({ logs: [], currentMood: '기록 없음', score: 0, todayAdvice: '' });
    const [dev, setDev] = useState({ tasks: [] });

    // 사용자 정보 State
    const [user, setUser] = useState({
        name: '고성열 매니저',
        role: '인천종합에너지',
        avatar: '👨‍💼',
        certifications: [],
        skills: [],
        career: ''
    });

    const [messages, setMessages] = useState([{ id: 1, role: 'ai', type: 'text', content: '안녕하세요. 당신의 성장을 돕는 AI 파트너입니다.' }]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const [isMaximized, setIsMaximized] = useState(false);

    const getShiftForDate = (targetDate) => {
        const groupName = settings.selectedGroup || "운영 1그룹";
        const baseDate = GROUP_START_DATES[groupName] || GROUP_START_DATES["운영 1그룹"];
        const d = new Date(targetDate); d.setHours(0, 0, 0, 0);
        const base = new Date(baseDate); base.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - base.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const pattern = COMMON_SHIFT_PATTERN;
        return pattern[(diffDays % pattern.length + pattern.length) % pattern.length];
    };

    const handleGroupChange = (newSettingsData) => {
        let updatedSettings = typeof newSettingsData === 'string' ? { ...settings, selectedGroup: newSettingsData } : { ...settings, ...newSettingsData };
        setSettings(updatedSettings);
        ipcRenderer.send('save-settings', updatedSettings);
    };

    const handleExportData = (dataToExport) => {
        if (dataToExport && Object.keys(dataToExport).length > 0) {
            ipcRenderer.send('export-selective-data', dataToExport);
        } else {
            ipcRenderer.send('export-all-data');
        }
    };
    const handleImportData = () => { alert("데이터 복원 기능은 준비 중입니다."); };
    const handleResetData = () => { if (confirm("정말 초기화하시겠습니까?")) { ipcRenderer.send('reset-all-data'); window.location.reload(); } };

    useEffect(() => {
        const loadSettings = async () => {
            try { const loaded = await ipcRenderer.invoke('load-settings'); if (loaded && loaded.selectedGroup) setSettings(loaded); } catch (e) { console.error("설정 로드 실패", e); }
        };
        loadSettings();
    }, []);

    const fetchData = async (dataType = 'all') => {
        try {
            if (dataType === 'all' || dataType === 'schedules') { const sData = await ipcRenderer.invoke('load-schedules') || []; remoteUpdateFlags.current.add('schedules'); setTodos(sData); }
            if (dataType === 'all' || dataType === 'finance') { const fData = await ipcRenderer.invoke('load-finance') || { totalAsset: 0, items: [] }; remoteUpdateFlags.current.add('finance'); setFinance(fData); }
            if (dataType === 'all' || dataType === 'mental') { let mData = await ipcRenderer.invoke('load-mental') || { logs: [], currentMood: '기록 없음', score: 0, todayAdvice: '' }; remoteUpdateFlags.current.add('mental'); setMental(mData); }
            if (dataType === 'all' || dataType === 'widgets') {
                const wData = await ipcRenderer.invoke('load-custom-widgets') || [];
                remoteUpdateFlags.current.add('widgets'); // 무한 루프 방지 플래그
                setCustomWidgets(wData);
            }
            if (dataType === 'all' || dataType === 'user') {
                const uData = await ipcRenderer.invoke('load-user-profile');
                if (uData) setUser(prev => ({ ...prev, ...uData }));
                remoteUpdateFlags.current.add('user');
            }

            if (dataType === 'all' || dataType === 'development' || dataType === 'work') {
                const dData = await ipcRenderer.invoke('load-development') || { tasks: [] };
                const wDataRaw = await ipcRenderer.invoke('load-work');
                let wData = wDataRaw || { manuals: [] };
                if (!wDataRaw && dData.tasks && dData.tasks.length > 0) {
                    const recoveredManuals = dData.tasks.filter(t => t.chapters || ['OPERATION', 'FIELD SAFETY', 'OFFICE'].includes(t.category));
                    if (recoveredManuals.length > 0) { wData.manuals = recoveredManuals; ipcRenderer.send('save-work', wData); } else { ipcRenderer.send('save-work', { manuals: [] }); }
                } else if (!wDataRaw) { ipcRenderer.send('save-work', { manuals: [] }); }
                if (dataType === 'all' || dataType === 'development') { remoteUpdateFlags.current.add('development'); setDev(dData); }
                if (dataType === 'all' || dataType === 'work') { remoteUpdateFlags.current.add('work'); setWork(wData); }
            }
            if (dataType === 'all' || dataType === 'equipment') { const eData = await ipcRenderer.invoke('load-equipment') || { list: [], fieldGuides: [] }; remoteUpdateFlags.current.add('equipment'); setEquipment(eData); }
            if (dataType === 'all') setIsLoaded(true);
        } catch (e) { console.error("Load Error:", e); }
    };

    useEffect(() => { fetchData('all'); }, []);

    useEffect(() => { const handleRefresh = async (event, dataType) => { remoteUpdateFlags.current.add(dataType); fetchData(dataType); }; ipcRenderer.on('data-updated', handleRefresh); return () => { ipcRenderer.removeListener('data-updated', handleRefresh); }; }, []);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('schedules')) { remoteUpdateFlags.current.delete('schedules'); return; } ipcRenderer.send('save-schedules', todos); }, [todos, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('finance')) { remoteUpdateFlags.current.delete('finance'); return; } ipcRenderer.send('save-finance', finance); }, [finance, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('mental')) { remoteUpdateFlags.current.delete('mental'); return; } ipcRenderer.send('save-mental', mental); }, [mental, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('development')) { remoteUpdateFlags.current.delete('development'); return; } ipcRenderer.send('save-development', dev); }, [dev, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('work')) { remoteUpdateFlags.current.delete('work'); return; } ipcRenderer.send('save-work', work); }, [work, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('equipment')) { remoteUpdateFlags.current.delete('equipment'); return; } ipcRenderer.send('save-equipment', equipment); }, [equipment, isLoaded]);
    useEffect(() => { if (!isLoaded) return; if (remoteUpdateFlags.current.has('user')) { remoteUpdateFlags.current.delete('user'); return; } ipcRenderer.send('save-user-profile', user); }, [user, isLoaded]);
    // 🌟 [추가] customWidgets 상태가 변하면 파일로 저장
    useEffect(() => {
        if (!isLoaded) return;
        if (remoteUpdateFlags.current.has('widgets')) {
            remoteUpdateFlags.current.delete('widgets');
            return;
        }
        ipcRenderer.send('save-custom-widgets', customWidgets);
    }, [customWidgets, isLoaded]);
    useEffect(() => {
        const calculateTheme = () => {
            const now = new Date(); let isDark = true;
            if (themeMode === 'auto') { const times = SunCalc.getTimes(now, 37.4563, 126.7052); isDark = !(now > times.sunrise && now < times.sunset); } else { isDark = themeMode === 'dark'; }
            setIsDarkMode(isDark);
            if (ipcRenderer) { const body = document.body; if (isDark) body.classList.add('dark'); else body.classList.remove('dark'); ipcRenderer.send('set-background-color', isDark ? '#18181b' : '#f5f5f5'); }
        };
        if (viewMode === 'chat') { ipcRenderer.send('sync-theme-mode', themeMode); }
        calculateTheme();
        const timer = setInterval(calculateTheme, 60000);
        return () => clearInterval(timer);
    }, [themeMode, viewMode]);

    useEffect(() => { const handleMaximizedState = (event, state) => setIsMaximized(state); ipcRenderer.on('window-maximized-state', handleMaximizedState); return () => ipcRenderer.removeListener('window-maximized-state', handleMaximizedState); }, []);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

    const callGeminiAI = async (userText) => {
        try {
            const realSchedules = await ipcRenderer.invoke('load-schedules') || [];
            const realMental = await ipcRenderer.invoke('load-mental') || { logs: [] };
            const realDev = await ipcRenderer.invoke('load-development') || { tasks: [] };
            const realEquip = await ipcRenderer.invoke('load-equipment') || { list: [] };

            const now = new Date();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const todayStr = now.toISOString().split('T')[0];
            const todayShift = getShiftForDate(now);
            const currentDateInfo = `Current Date: ${todayStr} (${days[now.getDay()]}), Time: ${now.getHours()}:${now.getMinutes()}`;

            const todoListContext = realSchedules.length > 0
                ? realSchedules.map(t => {
                    const d = new Date(t.date);
                    const dayName = isNaN(d) ? '' : `(${days[d.getDay()]})`;
                    return `[ID:${t.id}] ${t.date}${dayName} ${t.startTime || ''}${t.endTime ? '~' + t.endTime : ''} : ${t.text}`;
                }).join('\n')
                : "일정이 없습니다.";

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
            const futureContext = upcomingScheduleText ? `[Upcoming 7 Days]\n${upcomingScheduleText}` : "No upcoming schedules.";

            const twoWeeksAgo = new Date(now);
            twoWeeksAgo.setDate(now.getDate() - 14);
            const recentLogs = realMental.logs
                .filter(l => new Date(l.date) >= twoWeeksAgo)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            const mentalHistoryText = recentLogs.length > 0
                ? recentLogs.map(l => `${l.date} | Mood: ${l.mood} | Score: ${l.score} | Note: "${l.summary}"`).join('\n')
                : "No recent records.";

            const generateCurriculumContext = (tasks) => {
                let context = "";
                tasks.forEach(book => {
                    context += `[Book: ${book.title}] (Progress: ${book.progress || 0}%)\n`;
                });
                return context ? context : "서재가 비어있습니다.";
            };
            const libraryContext = generateCurriculumContext(realDev.tasks || []);

            // 시스템 프롬프트 생성 (외부 파일 사용)
            const systemInstruction = getSystemInstruction({
                currentDateInfo,
                todayShift,
                todoListContext,
                futureContext,
                mentalHistoryText,
                libraryContext
            });

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-pro",
                systemInstruction: systemInstruction,
                generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
            });

            const result = await model.generateContent(userText);
            const responseText = result.response.text();

            let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            if (!cleanText.startsWith('[')) {
                const first = cleanText.indexOf('{');
                const last = cleanText.lastIndexOf('}');
                if (first !== -1 && last !== -1) cleanText = cleanText.substring(first, last + 1);
            }
            if (cleanText.startsWith('{')) cleanText = `[${cleanText}]`;

            const commands = JSON.parse(cleanText);
            return { type: 'command', command: commands };

        } catch (error) {
            console.error("AI Error:", error);
            return { type: 'text', text: `오류가 발생했습니다: ${error.message}` };
        }
    };

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

                if (action === 'record_study') {
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
                else if (action === 'add_todo') {
                    let currentRealData = [];
                    try { currentRealData = await ipcRenderer.invoke('load-schedules') || []; } catch (e) { currentRealData = []; }
                    const newDate = command.date; const newTime = command.startTime || ''; const newContent = command.content;
                    let finalCategory = command.category;
                    if (!finalCategory || finalCategory === 'default') {
                        const text = newContent.toLowerCase();
                        if (text.includes('pt') || text.includes('헬스') || text.includes('운동') || text.includes('병원')) finalCategory = 'health';
                        else if (text.includes('회식') || text.includes('회의') || text.includes('업무')) finalCategory = 'work';
                        else if (text.includes('근무') || text.includes('대근')) finalCategory = 'shift';
                        else if (text.includes('공부') || text.includes('시험')) finalCategory = 'development';
                        else if (text.includes('은행') || text.includes('주식')) finalCategory = 'finance';
                        else finalCategory = 'default';
                    }
                    const isDuplicate = currentRealData.some(t => t.date === newDate && (t.startTime || '') === newTime && t.text === newContent);
                    if (isDuplicate) { replyText = `✋ 이미 저장된 일정입니다: ${newContent}`; } else {
                        const newTodo = { id: Date.now() + Math.random(), text: newContent, date: newDate, startTime: newTime, endTime: command.endTime || '', done: false, memo: '', category: finalCategory };
                        const nextTodos = [...currentRealData, newTodo];
                        ipcRenderer.send('save-schedules', nextTodos); setTodos(nextTodos);
                        replyText = `✅ 일정 추가: ${newDate} ${newContent}`;
                    }
                }
                else if (action === 'modify_todo') {
                    setTodos(prev => {
                        const nextTodos = prev.map(t => t.id === command.id ? { ...t, text: command.content || t.text, date: command.date || t.date, startTime: command.startTime || t.startTime, endTime: command.endTime || t.endTime } : t);
                        ipcRenderer.send('save-schedules', nextTodos); return nextTodos;
                    });
                    replyText = `일정 수정 완료`;
                }
                else if (action === 'delete_todo') {
                    setTodos(prev => { const nextTodos = prev.filter(t => t.id !== command.id); ipcRenderer.send('save-schedules', nextTodos); return nextTodos; });
                    replyText = `일정 삭제 완료`;
                }
                else if (action === 'search_books' && command.results) {
                    setDev(prev => ({ ...prev, searchResults: command.results }));
                    replyText = `🔍 총 ${command.results.length}권의 교재가 검색되었습니다.`;
                }
                else if (action === 'generate_curriculum') {
                    const regenerateIds = (item) => ({ ...item, id: Date.now() + Math.random().toString(36).substr(2, 9), children: item.children ? item.children.map(regenerateIds) : [] });
                    const safeTask = regenerateIds({ ...command, isStarred: false });
                    setDev(prev => {
                        const existingTasks = prev.tasks || [];
                        const starredBooks = existingTasks.filter(t => t.isStarred);
                        const normalBooks = existingTasks.filter(t => !t.isStarred);
                        return { ...prev, searchResults: [], tasks: [...starredBooks, safeTask, ...normalBooks] };
                    });
                    replyText = `📘 '${command.title}' 커리큘럼 생성이 완료되었습니다.`;
                }
                else if (action === 'start_quiz') {
                    const targetTopic = command.topic;
                    setAiModalContent({ title: targetTopic, content: '' }); setShowAiModal(true); setTimeout(() => { handleGenerateQuiz(); }, 100);
                    replyText = `📝 '${targetTopic}' 관련 실전 문제를 생성합니다.`;
                }
                else if (action === 'analyze_mental') {
                    const todayDate = new Date().toISOString().split('T')[0];
                    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const newLog = { id: Date.now(), date: todayDate, time: timeStr, summary: command.summary, mood: command.mood, score: command.score, advice: command.advice, tags: command.tags || [] };
                    setMental(prev => {
                        const todayLogs = prev.logs.filter(log => log.date === todayDate);
                        const totalScore = todayLogs.reduce((acc, cur) => acc + cur.score, 0) + newLog.score;
                        const avgScore = Math.round(totalScore / (todayLogs.length + 1));
                        return { ...prev, currentMood: newLog.mood, score: avgScore, todayAdvice: command.daily_advice, logs: [newLog, ...prev.logs] };
                    });
                    replyText = `📝 멘탈 기록 완료: ${command.mood} (${command.score}점)`;
                }
                else if (['show_schedule', 'show_finance', 'show_mental', 'show_development'].includes(action)) {
                    const typeMap = { 'show_schedule': 'schedule', 'show_finance': 'finance', 'show_mental': 'mental', 'show_development': 'development' };
                    const dataMap = { 'show_schedule': todos, 'show_finance': finance, 'show_mental': mental, 'show_development': dev };
                    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'ai', type: 'widget', widgetType: typeMap[action], data: dataMap[action] }]);
                    replyText = null;
                }
                else if (action === 'add_equipment_log') {
                    const { equipId, content, date } = command;
                    setEquipment(prev => {
                        const targetId = equipId || (prev.list.length > 0 ? prev.list[0].id : null);
                        if (!targetId) { replyText = "⚠️ 해당 설비를 찾을 수 없어 기록하지 못했습니다."; return prev; }
                        const newLog = { id: Date.now(), date: date || new Date().toISOString().split('T')[0], content: content, type: 'AI' };
                        const newList = prev.list.map(e => e.id === targetId ? { ...e, logs: [newLog, ...(e.logs || [])] } : e);
                        ipcRenderer.send('save-equipment', { ...prev, list: newList });
                        replyText = `🔧 정비 이력을 기록했습니다: ${content}`;
                        return { ...prev, list: newList };
                    });
                }

                else if (action === 'create_dashboard_widget') {
                    const newWidget = {
                        id: Date.now(),
                        type: command.widgetType || 'card', // 'card' 또는 'link'
                        title: command.title,
                        content: command.content,

                        // 🌟 [추가] URL 정보 저장 (이 부분이 없어서 동작 안 했던 것!)
                        url: command.url || null,

                        color: command.color || 'indigo',
                        data: command.data || null
                    };
                    setCustomWidgets(prev => [...prev, newWidget]);
                    replyText = `✅ 대시보드에 '${command.title}' 위젯을 추가했습니다.`;
                }

                else if (action === 'delete_dashboard_widget') {
                    // 위젯 제목으로 삭제 (ID를 모르므로 제목 매칭)
                    setCustomWidgets(prev => prev.filter(w => w.title !== command.title));
                    replyText = `🗑️ '${command.title}' 위젯을 삭제했습니다.`;
                }

                if (replyText) replyTexts.push(replyText);
            }

            if (replyTexts.length > 0) {
                const finalReply = replyTexts.join('\n');
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', type: 'text', content: finalReply }]);
                return finalReply;
            }
            return "처리가 완료되었습니다.";
        }
        else {
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', type: 'text', content: res.text }]);
            return res.text;
        }
    };

    const renderSubView = () => {
        const visibleModules = settings.visibleModules || { schedule: true, finance: true, mental: true, development: true, work: true };
        const currentModuleKey = { schedules: 'schedule', finance: 'finance', mental: 'mental', development: 'development', work: 'work' }[dashboardSubView];

        if (currentModuleKey && !visibleModules[currentModuleKey]) {
            return (<div className="flex flex-col items-center justify-center h-full text-zinc-400"><Settings size={48} className="mb-4 opacity-20" /><p>이 기능은 설정에서 비활성화되어 있습니다.</p><button onClick={() => setDashboardSubView('overview')} className="mt-4 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-sm font-bold text-zinc-600 dark:text-zinc-300">홈으로 돌아가기</button></div>);
        }

        switch (dashboardSubView) {
            case 'schedules': return <ScheduleDetailView todos={todos} setTodos={setTodos} settings={settings} onGroupChange={handleGroupChange} getShiftForDate={getShiftForDate} />;
            case 'finance': return <div className="p-4">재테크/자산 상세 현황 (미구현)</div>;
            case 'mental': return <MentalDetailView mental={mental} setMental={setMental} handleSendMessage={handleSendMessage} />;
            case 'development': return <DevelopmentDetailView dev={dev} setDev={setDev} handleSendMessage={handleSendMessage} activeBookId={activeBookId} setActiveBookId={setActiveBookId} />;
            case 'work': return <WorkDetailView work={work} setWork={setWork} equipment={equipment} setEquipment={setEquipment} handleSendMessage={handleSendMessage} viewMode={workViewMode} setViewMode={setWorkViewMode} />;
            case 'overview': default:
                return (
                    <DashboardView
                        // 🟢 [핵심 수정] 이전 버전의 Prop 이름(schedules, development)도 함께 전달하여 끊김 방지
                        todos={todos} schedules={todos}
                        setTodos={setTodos}
                        finance={finance} setFinance={setFinance}
                        mental={mental} setMental={setMental}
                        dev={dev} development={dev}
                        setDev={setDev}
                        work={work} setWork={setWork}
                        // 기타 props
                        dashboardSubView={dashboardSubView} setDashboardSubView={setDashboardSubView}
                        isSidebarExpanded={isSidebarExpanded} setIsSidebarExpanded={setIsSidebarExpanded}
                        handleSendMessage={handleSendMessage} settings={settings} handleGroupChange={handleGroupChange}
                        activeBookId={activeBookId} setActiveBookId={setActiveBookId}
                        setWorkViewMode={setWorkViewMode} workViewMode={workViewMode} equipment={equipment} setEquipment={setEquipment}
                        setShowSettingsModal={setShowSettingsModal} user={user}
                        customWidgets={customWidgets}
                        setCustomWidgets={setCustomWidgets}
                    />
                );
        }
    };

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <div className="h-screen w-full bg-transparent flex items-center justify-center p-[1px]">
                <div className="flex flex-col w-full h-full font-sans overflow-hidden relative transition-colors duration-500 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 border dark:border-zinc-800 rounded-2xl">
                    <header className="drag-region h-14 flex items-center justify-between px-4 border-b bg-white/80 border-zinc-200/50 dark:bg-zinc-900/80 dark:border-white/5 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-2.5"><div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-colors ${viewMode === 'chat' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}><Bot size={16} className="text-white" /></div><h1 className="font-bold text-xs tracking-tight">AI Partner Pro</h1></div>
                        <div className="flex items-center gap-1 no-drag">
                            {viewMode === 'chat' ? (<button onClick={() => ipcRenderer.send('toggle-dashboard')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors mr-2"><LayoutDashboard size={18} /></button>) : (<div className="mr-2"></div>)}
                            <button onClick={() => setThemeMode(p => p === 'auto' ? 'light' : p === 'light' ? 'dark' : 'auto')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 relative">{themeMode === 'auto' ? (<>{isDarkMode ? <Moon size={18} /> : <Sun size={18} />}<span className="absolute bottom-0 right-0 h-[10px] w-auto px-1 bg-indigo-600 text-white text-[6px] font-bold rounded-full flex items-center justify-center -mb-0.5 -mr-0.5 leading-none">AUTO</span></>) : (isDarkMode ? <Moon size={18} /> : <Sun size={18} />)}</button>
                            {viewMode === 'chat' ? (<><button onClick={() => ipcRenderer.send('minimize-window')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"><Minus size={18} /></button><button onClick={() => ipcRenderer.send('hide-window')} className="p-2 rounded-full hover:bg-rose-500 hover:text-white text-zinc-400"><X size={18} /></button></>) : (<><button onClick={() => ipcRenderer.send('dashboard-minimize')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"><Minus size={18} /></button><button onClick={() => ipcRenderer.send('dashboard-maximize')} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400">{isMaximized ? <Copy size={16} /> : <Square size={16} />}</button><button onClick={() => ipcRenderer.send('dashboard-close')} className="p-2 rounded-full hover:bg-rose-500 hover:text-white text-zinc-400"><X size={18} /></button></>)}
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-zinc-100/50 dark:to-transparent">
                        {viewMode === 'dashboard' ? (
                            <div className="flex h-full overflow-hidden">
                                <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} settings={settings} onUpdateSettings={handleGroupChange} />
                                <div className={`flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 transition-all duration-300 ${isSidebarExpanded ? 'w-[280px] p-4' : 'w-[64px] py-4 px-2 items-center'}`}>
                                    <button onClick={() => setIsSidebarExpanded(p => !p)} className={`p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors mb-6 ${isSidebarExpanded ? 'self-start' : 'self-center'}`}><Menu size={20} className="text-zinc-500" /></button>
                                    {isSidebarExpanded ? (
                                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6 w-full border border-zinc-200 dark:border-zinc-700/50 p-3 flex items-center justify-between animate-fade-in shadow-sm gap-2">
                                            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200 dark:border-indigo-800">
                                                    {user.avatar && user.avatar.startsWith('data:') ? (
                                                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                    ) : (
                                                        <span className="text-lg">{user.avatar || <Users size={20} />}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center">
                                                    <p className="font-bold text-sm truncate text-zinc-800 dark:text-zinc-100 leading-tight">{user.name}</p>
                                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{user.role}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => setShowGlobalSettings(true)} className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm"><Settings size={12} /></button>
                                                <button className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm"><LogOut size={12} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-6 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto border border-indigo-200 dark:border-indigo-800 cursor-pointer">
                                            {user.avatar && user.avatar.startsWith('data:') ? (
                                                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <span className="text-lg">{user.avatar || <Users size={20} />}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
                                        <div className="w-full">{isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-2 mt-2">Common</h3>}<div className="space-y-1"><SideBarItem icon={Home} label="대시보드 개요" active={dashboardSubView === 'overview'} onClick={() => setDashboardSubView('overview')} isExpanded={isSidebarExpanded} />{(settings.visibleModules?.schedule) && <SideBarItem icon={CalendarIcon} label="통합 일정" active={dashboardSubView === 'schedules'} onClick={() => setDashboardSubView('schedules')} isExpanded={isSidebarExpanded} />}</div></div>
                                        {!isSidebarExpanded && (settings.visibleModules?.finance || settings.visibleModules?.mental) && <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800 mx-auto my-2"></div>}
                                        {(settings.visibleModules?.finance || settings.visibleModules?.mental) && (<div className="w-full">{isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-500/70 dark:text-indigo-400/70 mb-2 px-2 mt-4">Personal Life</h3>}<div className="space-y-1">{settings.visibleModules?.finance && <SideBarItem icon={Wallet} label="자산관리" active={dashboardSubView === 'finance'} onClick={() => setDashboardSubView('finance')} isExpanded={isSidebarExpanded} />}{settings.visibleModules?.mental && <SideBarItem icon={Heart} label="멘탈관리" active={dashboardSubView === 'mental'} onClick={() => setDashboardSubView('mental')} isExpanded={isSidebarExpanded} />}</div></div>)}
                                        {!isSidebarExpanded && (settings.visibleModules?.development || settings.visibleModules?.work) && <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800 mx-auto my-2"></div>}
                                        {(settings.visibleModules?.development || settings.visibleModules?.work) && (<div className="w-full">{isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 dark:text-emerald-400/70 mb-2 px-2 mt-4">Work & Growth</h3>}<div className="space-y-1">{settings.visibleModules?.development && <SideBarItem icon={BookOpen} label="자기개발" active={dashboardSubView === 'development'} onClick={() => setDashboardSubView('development')} isExpanded={isSidebarExpanded} />}{settings.visibleModules?.work && <SideBarItem icon={Briefcase} label="직무교육" active={dashboardSubView === 'work'} onClick={() => setDashboardSubView('work')} isExpanded={isSidebarExpanded} />}</div></div>)}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950/80">{renderSubView()}</div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm ${msg.role === 'ai' ? 'bg-white border-zinc-200 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700' : 'bg-zinc-200 dark:bg-zinc-700'}`}>{msg.role === 'ai' ? <Sparkles size={14} /> : <User size={14} className="opacity-70" />}</div>
                                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm border max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white border-indigo-500' : msg.type === 'widget' ? 'bg-transparent border-none shadow-none p-0' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'}`}>
                                                {msg.type === 'widget' ? (<>{msg.widgetType === 'schedule' && <ScheduleChatWidget data={msg.data} />}{msg.widgetType === 'finance' && <FinanceChatWidget data={msg.data} />}{msg.widgetType === 'mental' && <MentalChatWidget data={msg.data} />}{msg.widgetType === 'development' && <StudyChatWidget data={msg.data} />}</>) : (<div className="whitespace-pre-wrap">{msg.content}</div>)}
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

            <GlobalSettingsModal
                isOpen={showGlobalSettings}
                onClose={() => setShowGlobalSettings(false)}
                user={user}
                setUser={setUser}
                allData={{ todos, finance, mental, dev, work, equipment }}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onResetData={handleResetData}
            />
        </div>
    );
}

export default App;