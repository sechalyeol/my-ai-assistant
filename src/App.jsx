// Last Updated: 2025-12-25 20:05:28
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import SunCalc from 'suncalc';
import {
    Send, Bot, User, Sparkles, LayoutDashboard, Menu, Calendar as CalendarIcon, Users, Edit3, Settings, LogOut,
    Home, Wallet, Heart, BookOpen, Briefcase, Minus, X, Copy, Square, CheckSquare, Sun, Moon, Check
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
    ScheduleChatWidget, MentalChatWidget, StudyChatWidget, FinanceChatWidget, CustomDashboardChatWidget
} from './components/widgets/ChatWidgets';

const { ipcRenderer } = window.require('electron');
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// 🧩 채팅창 전용 미니 퀴즈 컴포넌트
const QuizChatCard = ({ data }) => {
    const [selected, setSelected] = useState(null);
    const [isSolved, setIsSolved] = useState(false);

    const handleCheck = (idx) => {
        setSelected(idx);
        setIsSolved(true);
    };

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-md mt-2 w-full max-w-sm">
            {/* 헤더 */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Bot size={12} /> AI Random Quiz
                </span>
                <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">{data.title}</span>
            </div>

            {/* 이미지 (있으면) */}
            {data.image && (
                <div className="w-full h-40 bg-zinc-100 dark:bg-black/30 flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                    <img src={data.image} alt="Quiz" className="h-full object-contain" />
                </div>
            )}

            {/* 질문 */}
            <div className="p-4">
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-4 leading-relaxed whitespace-pre-wrap">
                    Q. {data.question}
                </p>

                {/* 보기 */}
                <div className="space-y-2">
                    {data.options.map((opt, idx) => {
                        let btnClass = "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300";

                        if (isSolved) {
                            if (idx === data.answer) btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold ring-1 ring-emerald-500"; // 정답
                            else if (idx === selected) btnClass = "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500"; // 오답
                            else btnClass = "opacity-50 border-zinc-100 dark:border-zinc-800"; // 나머지
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => !isSolved && handleCheck(idx)}
                                disabled={isSolved}
                                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all flex items-start gap-2 ${btnClass}`}
                            >
                                <span className="flex-shrink-0 mt-0.5">{['A', 'B', 'C', 'D'][idx]}.</span>
                                <span>{opt}</span>
                                {isSolved && idx === data.answer && <Check size={14} className="ml-auto text-emerald-500" />}
                            </button>
                        );
                    })}
                </div>

                {/* 해설 (정답 확인 후 표시) */}
                {isSolved && (
                    <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 animate-fade-in">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase">Solution</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {data.explanation}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

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

    const [notifiedLog, setNotifiedLog] = useState(new Set());

    // 🟢 [수정됨] 1분마다 일정 및 위젯 메모를 체크하여 시스템 알림 보내기
    useEffect(() => {
        const checkNotifications = () => {
            const now = new Date();

            // 1. 일정(Todos) 알림 체크
            todos.forEach(todo => {
                if (!todo.date || !todo.startTime) return;

                const targetDate = new Date(`${todo.date}T${todo.startTime}:00`);
                const diffMs = targetDate - now;
                const diffMins = Math.floor(diffMs / 1000 / 60);

                checkAndNotify(todo.id, todo.text, todo.category, diffMins);
            });

            // 2. 위젯(Custom Widgets) 알림 체크 (targetTime이 있는 경우)
            customWidgets.forEach(widget => {
                // targetTime이 없으면 건너뜀
                if (!widget.targetTime) return;

                // 오늘 날짜 기준으로 시간 설정
                const [targetHour, targetMinute] = widget.targetTime.split(':').map(Number);
                const targetDate = new Date();
                targetDate.setHours(targetHour, targetMinute, 0, 0);

                const diffMs = targetDate - now;
                const diffMins = Math.floor(diffMs / 1000 / 60);

                checkAndNotify(widget.id, widget.content, 'memo', diffMins);
            });
        };

        // 공통 알림 발송 함수
        const checkAndNotify = (id, content, type, diffMins) => {
            // 알림 조건: 30분 전, 15분 전, 10분 전
            const is30MinBefore = diffMins === 30;
            const is15MinBefore = diffMins === 15;
            const is10MinBefore = diffMins === 10;

            const notificationKey = `${id}-${diffMins}`;

            if ((is30MinBefore || is15MinBefore || is10MinBefore) && !notifiedLog.has(notificationKey)) {

                const typeLabel = type === 'work' ? '업무' : type === 'memo' ? '메모' : '일정';

                const noti = new Notification(`[${typeLabel}] 알림 ⏰`, {
                    body: `${diffMins}분 뒤: "${content}"`,
                    silent: false
                });

                noti.onclick = () => {
                    ipcRenderer.send('dashboard-maximize');
                };

                setNotifiedLog(prev => new Set(prev).add(notificationKey));
            }
        };

        checkNotifications();
        const timer = setInterval(checkNotifications, 30000); // 30초마다 체크

        return () => clearInterval(timer);
    }, [todos, customWidgets, notifiedLog]);

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
            const todayStr = now.toISOString().split('T')[0];
            const koreanDays = ['일', '월', '화', '수', '목', '금', '토'];
            const dayName = koreanDays[now.getDay()];
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const todayShift = getShiftForDate(now);
            const currentDateInfo = `Current Date: ${todayStr} (${dayName}요일), Current Time: ${timeStr}, User Context: 사용자가 현재 한국에 있으며, 지금 시각은 ${dayName}요일 새벽 ${now.getHours()}시입니다. 사용자가 "이따", "아침에"라고 말하면 무조건 오늘(${todayStr}) 날짜로 계산하세요. 어제로 계산하지 마세요.`;

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

            // 🟢 [핵심 2] 시스템 프롬프트 변수 선언 변경 (const -> let)
            let systemInstruction = getSystemInstruction({
                currentDateInfo,
                todayShift,
                todoListContext,
                futureContext,
                mentalHistoryText,
                libraryContext
            });

            // 🟢 [핵심 3] 메모 vs 일정 구분 로직 추가
            systemInstruction += `
            
            [명령어 구분 원칙-매우 중요]
            1. **대시보드 메모 (create_dashboard_widget)**:
              -사용자가 "메모해줘", "적어줘", "기록해줘" 같은 표현을 사용하면 **반드시** 'create_dashboard_widget' (type: 'card') 명령을 사용하세요.
              -시간 정보가 포함되어 있어도 "메모"라고 명시했다면 일정이 아닌 위젯(Sticky Note)으로 만들어야 합니다.
              -🚨 **중요**: 메모 내용에 '시간'이 포함되어 있다면 targetTime 필드에 "HH:MM" (24시간제) 형식으로 추가해 주세요.
              -예: "이따 6시 미팅 메모해" -> create_dashboard_widget { title: "메모", content: "6시 미팅", color: "amber", targetTime: "18:00" }
              -예: "새벽 3시 59분 기동" -> create_dashboard_widget { title: "메모", content: "3시 59분 기동", color: "rose", targetTime: "03:59" }

            2. **일정 추가 (add_todo)**:
              -사용자가 "일정 잡아", "스케줄 추가해", "알려줘", "등록해"라고 말하거나, 명백히 할 일 관리를 원할 때 사용하세요.
              -예: "6시에 미팅 일정 추가해" -> add_todo { date: "...", startTime: "18:00", content: "미팅" }
            
            3. **기본값**:
              -구분이 모호할 때는 'add_todo'(일정)를 우선하되, "메모"라는 단어가 들어가면 무조건 1번(위젯)을 따르세요.
            `;

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

    // 🎲 랜덤 퀴즈 생성 및 챗봇 전송 함수
    const generateRandomQuiz = async () => {
        const loadingId = Date.now() + Math.random();
        setMessages(prev => [...prev, { id: loadingId, role: 'ai', type: 'text', content: '📚 설비 데이터를 분석하여 실무 문제를 출제하고 있습니다...', isLoading: true }]);

        try {
            const allGuides = equipment.fieldGuides || [];
            const validItems = [...allGuides].filter(item => item.steps && Array.isArray(item.steps) && item.steps.length > 0);

            if (validItems.length === 0) {
                setMessages(prev => prev.map(msg => msg.id === loadingId ? {
                    ...msg,
                    type: 'text',
                    content: "문제로 출제할 만한 내용(설비/현장 가이드)이 없습니다. 😅\n설비 마스터 메뉴에서 가이드를 먼저 등록해 주세요.",
                    isLoading: false
                } : msg));
                return;
            }

            const randomItem = validItems[Math.floor(Math.random() * validItems.length)];
            let contextText = `제목: ${randomItem.title}\n설명: ${randomItem.desc}\n`;
            let availableImages = [];

            (randomItem.steps || []).forEach(s => {
                contextText += `${s.title}: ${s.content}\n`;
                if (s.image) availableImages.push(s.image);
            });

            const selectedImage = availableImages.length > 0 && Math.random() > 0.5
                ? availableImages[Math.floor(Math.random() * availableImages.length)]
                : null;

            const prompt = `
당신은 산업 현장의 **정밀 직무 평가관**입니다.
작업자가 아래 [직무 자료]를 정확히 이해했는지 검증하기 위해, **정답과 오답이 명확히 구분되는 4지선다형 문제**를 출제하십시오.

**[출제 절대 원칙]**
1. 오답 보기는 사실이 아닌 내용(False)으로 조작하십시오.
2. 자료에 적힌 정확한 용어만 사용하십시오.
3. 정답은 자료의 핵심 문장을 정확히 인용하십시오.

**[출력 절대 원칙 - 반드시 준수]**
1. 마크다운 코드 블록(json 기호)을 절대 사용하지 마십시오.
2. JSON 문법을 엄격히 준수하십시오. (배열 끝 쉼표 금지)
3. 오직 순수한 JSON 객체 하나만 출력하십시오.

**[JSON 구조 예시]**
{
  "question": "문제 지문",
  "options": ["보기1", "보기2", "보기3", "보기4"],
  "answer": 2,
  "explanation": "해설"
}

**[참고 직무 자료: ${randomItem.title}]**
${contextText.substring(0, 6000)}
            `;

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            let result;
            if (selectedImage) {
                const base64Data = selectedImage.split(',')[1];
                const mimeType = selectedImage.split(';')[0].split(':')[1];
                result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: mimeType } }]);
            } else {
                result = await model.generateContent(prompt);
            }

            const responseText = result.response.text();
            let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            const startIdx = cleanedText.indexOf('{');
            const endIdx = cleanedText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                cleanedText = cleanedText.substring(startIdx, endIdx + 1);
            }

            try {
                const quizJson = JSON.parse(cleanedText);
                setMessages(prev => prev.map(msg =>
                    msg.id === loadingId ? {
                        ...msg,
                        type: 'quiz',
                        content: '직무 퀴즈가 생성되었습니다.',
                        isLoading: false,
                        quizData: { ...quizJson, image: selectedImage, title: randomItem.title }
                    } : msg
                ));
            } catch (parseError) {
                console.error("JSON Parsing Error:", parseError);
                setMessages(prev => prev.map(msg => msg.id === loadingId ? {
                    ...msg,
                    content: "AI가 데이터를 생성하는 중 문법 오류가 발생했습니다. 다시 시도해 주세요.",
                    isLoading: false
                } : msg));
            }
        } catch (error) {
            console.error("Quiz Gen Error:", error);
            setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, content: "문제 생성 중 오류가 발생했습니다.", isLoading: false } : msg));
        }
    };
    
    const handleSendMessage = async (e, manualText = null) => {
        if (e) e.preventDefault();
        const text = manualText || inputValue;
        if (!text.trim()) return;

        // 🌟 [수정] 사용자 메시지 ID에도 랜덤값 추가하여 충돌 원천 차단
        const userMsgId = Date.now() + Math.random();

        // 🌟 [추가됨] 퀴즈 트리거 로직
        if (text.includes("퀴즈") || text.includes("문제") || (text.includes("테스트") && text.includes("직무"))) {
            setMessages(prev => [...prev, { id: Date.now(), role: 'user', type: 'text', content: text }]);
            setInputValue('');
            await generateRandomQuiz(); // 퀴즈 함수 호출 후 종료
            return;
        }

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
                let replyText = null;

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
                    if (isDuplicate) { replyText = `✋ 이미 저장된 일정입니다: ${newContent} `; } else {
                        const newTodo = { id: Date.now() + Math.random(), text: newContent, date: newDate, startTime: newTime, endTime: command.endTime || '', done: false, memo: '', category: finalCategory };
                        const nextTodos = [...currentRealData, newTodo];
                        ipcRenderer.send('save-schedules', nextTodos); setTodos(nextTodos);
                        replyText = `✅ 일정 추가: ${newDate} ${newContent} `;
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
                    // 1. 안전한 비교를 위해 ID를 문자열로 변환
                    const targetId = String(command.id);

                    // 2. 삭제 대상이 실제로 존재하는지 확인
                    const targetTodo = todos.find(t => String(t.id) === targetId);

                    if (targetTodo) {
                        setTodos(prev => {
                            // ID가 일치하지 않는 것만 남김 (삭제)
                            const nextTodos = prev.filter(t => String(t.id) !== targetId);
                            ipcRenderer.send('save-schedules', nextTodos);
                            return nextTodos;
                        });
                        replyText = `🗑️ 일정을 삭제했습니다: "${targetTodo.text}"`;
                    } else {
                        // 3. 대상을 못 찾았을 경우 에러 메시지 출력
                        replyText = `⚠️ 삭제할 일정을 찾을 수 없습니다. (ID 불일치)`;
                        console.warn(`[Delete Failed] Requested ID: ${command.id}, Available IDs: `, todos.map(t => t.id));
                    }
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
                else if (action === 'add_equipment_log') {
                    const { equipId, content, date } = command;
                    setEquipment(prev => {
                        const targetId = equipId || (prev.list.length > 0 ? prev.list[0].id : null);
                        if (!targetId) { replyText = "⚠️ 해당 설비를 찾을 수 없어 기록하지 못했습니다."; return prev; }
                        const newLog = { id: Date.now(), date: date || new Date().toISOString().split('T')[0], content: content, type: 'AI' };
                        const newList = prev.list.map(e => e.id === targetId ? { ...e, logs: [newLog, ...(e.logs || [])] } : e);
                        ipcRenderer.send('save-equipment', { ...prev, list: newList });
                        replyText = `🔧 정비 이력을 기록했습니다: ${content} `;
                        return { ...prev, list: newList };
                    });
                }
                else if (action === 'create_dashboard_widget') {
                    let finalUrl = command.url || null;
                    let finalTitle = command.title;
                    let finalIcon = command.icon || null;

                    // 특정 사이트(in-and-out) 또는 특정 키워드일 때 로컬 아이콘 지정
                    if (finalUrl && finalUrl.includes("in-and-out.e-inteco.studio")) {
                        // public 폴더에 있으면 루트 경로(/)로 직접 접근 가능합니다.
                        finalIcon = "/gs_logo.png";
                    }

                    if (finalTitle === '인천종합에너지') {
                        finalUrl = "https://toffice.e-inteco.co.kr/";

                        // 🌟 [수정 부분] Base64 아이콘 데이터 직접 삽입
                        finalIcon = 'data:image/x-icon;base64,AAABAAEAgIAAAAEAIAAoCAEAFgAAACgAAACAAAAAAAEAAAEAIAAAAAAAAAABABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wEAAAAAAAAAAAAAAAD///8E5eXMCv//3wgAAAAAAAAAAP///wH///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8B////AQAAAAAAAAAA27akDsSQUk6uYRquoEMA6Z5A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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8BAAAAAM2icCmiSAvQoEUA/6tdAv2sWwD+q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1oD/qNMELQAAAAA////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8EAAAAANCqcRuiSAvOoEUA/6tdAv2rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD+okoB/7yFQy7///8CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8C////AgAAAACqWBeunUEA/6xdA/yrWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+sXAL+nD4B1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////BAAAAACwYApNnD0A/6tbAvyrWwD+q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+dPwD/78+vEP///wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Af///wL/AAABnT4AzqdUA/+rXAH8q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6dTAf/GkVJRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wMAAAAAt24ePJs8AP+sXQT8q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/qVgA/7ZwIpAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8EAAAAAKlZFZuhSAD/rFwC+6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/rF4SqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AwAAAACeQATXqFcD/6tbAP6rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tcAf+qWA6fAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wPfv4AIlC4A+axdBPyrWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/p1QB/8mWXnIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8CxIlFGps8AP+tXgX7q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+iSgD/y5ZcJ////wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AbNnDiWcPgD/rFwC/KtbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sB/Zo5APQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wKzZw4lnkAA/6tcAvyrWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+qWAL+sWghc////wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8Dwo9HGZs8AP+rXAL8q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q10D/Jk3APQAAAAA////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////BOOqjgmZOQD/rV0E+6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6xeA/qbPAD/uYAuFv///wQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rXAL8p1QC/5s7APS5ejFiAAAAAAAAAAD///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AbJoHlanUwL/rFsA/qtbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+qWwD9qlkC/po6AP+6dCdcAAAAAP///wL///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wK8hkMqpE4B/6xbAP6rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sB+6VOAf+gQwZbAAAAAP///wIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJ09AdqsXAL8q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAfylTgH/nkEDTwAAAAD///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wLWpXMfoEUA/6xbAP6rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+qWwH9pU4B/59FCGAAAAAA////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKNNCb+rXQP9q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/qhVAv+pVhCRAAAAAP///wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wLouaILnD0A/6xbAP6rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+sXQT9oEQFzwAAAAD///8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AbJqIXusWgP+q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/rV0D+5o7APsAAAAA////AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnT8B76tbAP6rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6pcAP2iSQD/vIU9Lv///wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AdiqgyGfRAD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/rVwE/p9DB7IAAAAA////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAt3MrlapZAf6rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6xcAfyWMwD///+/BP///wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACeQQLvq1oA/qtbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/qFYB/rZzKXb///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8B4bSHEZ0/AP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6pbAP2cPQD6AAAAAP///wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wG7ejFiqFcB/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/q1sA/6tbAP+rWwD/rFsD/q9iHX3///8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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8fWWd/Pco4n1k8O0/yIAAAAA////AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+4z//////////////////5gAP/////////////////5AAF/////////////////6AAAv////////////////yAAAF////////////////6AAAAv///////////////6AAAAD///////////////5AAAAB///////////////9AAAAAH//////////////8AAAAAD//////////////+gAAAAA///////////////QAAAAAP//////////////oAAAAAD//////////////wAAAAAA//////////////4AAAAAAH/////////////8AAAAAAH/////////////+AAAAAAA//////////////AAAAAAAv/////////////gAAAAAAH/////////////0AAAAAAD/////////////6AAAAAAA/////////////9AAAAAAC//////////////AAAAAACf/////////////gAAAAAM//////////////0AAAAAb//////////////8AAAAAT//////////////+AAAAAT///////////////wAAAAL///////////////wAAAAL///////////////6AAAAF///////////////+AAAAC////////////////wAAABf///////////////wAAAAv///////////////+AAAAX///////////////+AAAAL////////////////gAAAF////////////////8AAAA////////////////8AAAAv////////////////gAAAH////////////////4AAAD////////////////4AAAC////////////////+AAAAf////////////////wAAAH////////////////8AAAH/AAD////////////+AAABAAAAAM///////////gAAAAAAAAAE//////////4AAAAAAAAAAJ/////////+AAAAAAAAAAAX/////////gAAAAAAAAAABf////////4AAAAAAAAAAAB////////8AAAAAAAAAAAAv////////AAAAAAAAAAAAF////////wAAAAAAAAAAAAf///////8AAAAAAAAAAAAP////////AAAAAAAAAAAAB////////wAAAAAAAAAAAAf///////8AAAAAAAAAAAAP////////AAAAAAAAAAAAB////////wAAAAAAAAAAABf///////8AAAAAAAAAAAAv////////gAAAAAAAAAAAX////////4AAAAAAAAAAAX////////+AAAAAAAAAAAT/////////gAAAAAAAAAAX/////////4AAAAAAAAABn/////////uAAAAAAAAAH/////////IEwAAAbwAAD3/////////IAEAAAF//////////////IABAAAAf/////////////oAAwAAAL/////////////gAAGAAAA/////////////0AABgAAAX////////////6AAAQAAAD////////////8AAAHAAAAP///////////8AAABwAAAF///////////+gAAAYAAAAv///////////QAAAHgAAAB///////////oAAADwAAAAP//////////0AAAA/AAAAB//////////8AAAAHgAAAAP/////////+AAAAH6AAAAF//////////AAAAA/AAAAAv/////////oAAAAP0AAAAA/////////0AAAAP+AAAAAT////////6AAAAB/4AAAABP///////+AAAAB/9AAAAAE////////AAAAAP/gAAAAAK///////oAAAAH/+AAAAAAZ//////4AAAAF//QAAAAAAv/////8AAAAA//6AAAAAAF/////+gAAAAv//AAAAAAAP/////gAAAAX//4AAAAAAB/////0AAAAD//+AAAAAAAv////8AAAAD///0AAAAAAD//33+gAAABf//+gAAAAAB//kCfgAAAAv///0AAAAAAH/0AB8AAAAH///+AAAAAAD/wAAsAAAAD////wAAAAAA/8AAFgAAAA/////QAAAAAP+AAAoAAABf////6AAAAAD/QAAAAAAAv/////QAAAAA/4AABAAAAX/////9AAAAAH8AAAAAAAL//////oAAAAH/AAAAAAAF//////+gAAAA/wAAAAAAA///////yAAAAv8AAAAAAA////////IAAAH/AAAAAABf///////8gAAD/wAAAAAAv////////yAAF/8AAAAAAn/////////kAC//AAAAAAX//////////MG//4AAAgAX//////////////8AAAUAT///////////////QAACQ////////////////6AAB//////////////////AAAf/////////////////6AAP//////////////////QAv//////////////////////////////////////////////////////////////////////////////////////////////////////////8=';
                    }
                    // -----------------------------------------------------

                    const newWidget = {
                        id: Date.now(),
                        type: command.widgetType || 'card',
                        title: finalTitle, // 🟢 수정된 title 사용
                        content: command.content,
                        url: finalUrl, // 🟢 수정된 url 사용
                        targetTime: command.targetTime || null,
                        color: command.color || 'indigo',
                        data: command.data || null,
                        finalIcon: finalIcon
                    };

                    setCustomWidgets(prev => [...prev, newWidget]);
                    replyText = `✅ 대시보드에 '${newWidget.title}' 위젯을 추가했습니다.`;
                }

                // src/App.jsx 내 delete_dashboard_widget 처리 부분

                else if (action === 'delete_dashboard_widget') {
                    // 1. 검색어 정규화 (소문자 변환 및 공백 제거)
                    const searchName = command.title.toLowerCase().replace(/\s+/g, '');

                    // 2. 현재 상태에서 삭제 대상 찾기
                    const target = customWidgets.find(w => {
                        const title = w.title.toLowerCase().replace(/\s+/g, '');
                        return title.includes(searchName) || searchName.includes(title);
                    });

                    if (target) {
                        // 3. ID를 사용하여 확실하게 삭제
                        setCustomWidgets(prev => prev.filter(w => w.id !== target.id));
                        replyText = `🗑️ '${target.title}' 위젯을 삭제했습니다.`;
                    } else {
                        // 4. 대상을 찾지 못한 경우 메시지 명확화
                        replyText = `⚠️ '${command.title}' 위젯을 찾을 수 없습니다. (현재 목록: ${customWidgets.map(w => w.title).join(', ')})`;
                    }
                }

                // 🌟 [추가] 대시보드 커스텀 위젯을 챗봇에서 조회하는 로직
                else if (action === 'show_dashboard_widgets') {
                    const filterType = command.widgetType; // 'card' (메모) 또는 'link' (링크)
                    let filteredData = [];
                    let widgetLabel = "";

                    if (filterType === 'card') {
                        filteredData = customWidgets.filter(w => w.type === 'card');
                        widgetLabel = "메모";
                    } else if (filterType === 'link') {
                        filteredData = customWidgets.filter(w => w.type === 'link');
                        widgetLabel = "퀵링크";
                    } else {
                        filteredData = customWidgets;
                        widgetLabel = "전체";
                    }

                    if (filteredData.length > 0) {
                        // 채팅창에 텍스트와 함께 위젯을 띄움
                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            role: 'ai',
                            type: 'widget',
                            widgetType: 'custom_dashboard', // ChatWidgets에서 처리할 새로운 타입
                            data: filteredData,
                            content: `등록하신 ${widgetLabel} 위젯 목록입니다.`
                        }]);
                        replyText = null; // 별도의 텍스트 응답을 방지하기 위해 null 설정
                    } else {
                        replyText = `등록된 ${widgetLabel} 위젯이 없습니다.`;
                    }
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
                        <div className="flex items-center gap-2.5"><div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-colors ${viewMode === 'chat' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-600 shadow-emerald-500/20'} `}><Bot size={16} className="text-white" /></div><h1 className="font-bold text-xs tracking-tight">AI Partner Pro</h1></div>
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
                                    <button onClick={() => setIsSidebarExpanded(p => !p)} className={`p-2 rounded-lg hover: bg-zinc-200 dark: hover: bg-zinc-800 transition-colors mb-6 ${isSidebarExpanded ? 'self-start' : 'self-center'} `}><Menu size={20} className="text-zinc-500" /></button>
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
                                        {(settings.visibleModules?.development || settings.visibleModules?.work) && (<div className="w-full">{isSidebarExpanded && <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 dark:text-emerald-400/70 mb-2 px-2 mt-4">Work & Growth</h3>}<div className="space-y-1">{settings.visibleModules?.development && <SideBarItem icon={BookOpen} label="자기개발" active={dashboardSubView === 'development'} onClick={() => setDashboardSubView('development')} isExpanded={isSidebarExpanded} />}{settings.visibleModules?.work && (
                                            <SideBarItem
                                                icon={Briefcase}
                                                label="직무교육"
                                                active={dashboardSubView === 'work'}
                                                onClick={() => {
                                                    setDashboardSubView('work');
                                                    setWorkViewMode('HOME'); // 🌟 클릭 시 'HOME'으로 강제 초기화 추가
                                                }}
                                                isExpanded={isSidebarExpanded}
                                            />
                                        )}</div></div>)}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950/80">{renderSubView()}</div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm ${msg.role === 'ai' ? 'bg-white border-zinc-200 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700' : 'bg-zinc-200 dark:bg-zinc-700'} `}>
                                                {msg.role === 'ai' ? <Sparkles size={14} /> : <User size={14} className="opacity-70" />}
                                            </div>

                                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm border max-w-[85%] ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white border-indigo-500'
                                                : msg.type === 'widget' || msg.type === 'quiz'
                                                    ? 'bg-transparent border-none shadow-none p-0'
                                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                                                }`}>
                                                {msg.type === 'widget' ? (<>{msg.widgetType === 'schedule' && <ScheduleChatWidget data={msg.data} />}{msg.widgetType === 'finance' && <FinanceChatWidget data={msg.data} />}{msg.widgetType === 'mental' && <MentalChatWidget data={msg.data} />}{msg.widgetType === 'development' && <StudyChatWidget data={msg.data} />}{msg.widgetType === 'custom_dashboard' && <CustomDashboardChatWidget data={msg.data} />}</>) : msg.type === 'quiz' ? (
                                                    /* 🌟 [추가됨] 퀴즈 카드 렌더링 */
                                                    <QuizChatCard data={msg.quizData} />
                                                ) : (
                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                )}
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