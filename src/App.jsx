// Last Updated: 2025-11-18 01:11:26
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai"; // 🧠 AI 두뇌 임포트
import SunCalc from 'suncalc'; 
import { 
  Send, Bot, User, Sparkles, 
  CheckSquare, Wallet,
  MoreHorizontal, Trash2, Sun, Moon, X, Minus 
} from 'lucide-react';

const { ipcRenderer } = window.require('electron');

// 👇👇 [중요] 여기에 발급받은 API 키를 넣으세요! 👇👇
const API_KEY = "AIzaSyBCjAfdyfZ_l4pFO8kXeVt7DLmZgLI5Ido"; 

// AI 초기화
const genAI = new GoogleGenerativeAI(API_KEY);

function App() {
  // --- [1. 스마트 테마 시스템] ---
  const [themeMode, setThemeMode] = useState('auto');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const INCHEON_COORDS = { lat: 37.4563, lng: 126.7052 };

  useEffect(() => {
    const calculateTheme = () => {
      const now = new Date();
      if (themeMode === 'auto') {
        const times = SunCalc.getTimes(now, INCHEON_COORDS.lat, INCHEON_COORDS.lng);
        const isDayTime = now > times.sunrise && now < times.sunset;
        setIsDarkMode(!isDayTime); 
      } else {
        setIsDarkMode(themeMode === 'dark');
      }
    };
    calculateTheme();
    const timer = setInterval(calculateTheme, 60000);
    return () => clearInterval(timer);
  }, [themeMode]); 

  const cycleThemeMode = () => {
    setThemeMode(prev => {
      if (prev === 'auto') return 'light';
      if (prev === 'light') return 'dark';
      return 'auto';
    });
  };

  // --- [2. 데이터 상태] ---
  const [todos, setTodos] = useState([]);
  
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', type: 'text', content: '안녕하세요. Gemini AI가 탑재된 당신의 파트너입니다. 무엇을 도와드릴까요?' }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadInitialTodos = async () => {
      // main.cjs의 'load-todos' 핸들러를 호출합니다.
      const savedTodos = await ipcRenderer.invoke('load-todos');
      
      // 저장된 데이터가 있으면 로드하고, 없거나 빈 배열이면 기본값(연동 테스트)을 설정합니다.
      if (savedTodos && savedTodos.length > 0) {
        setTodos(savedTodos);
      } else {
        // 파일이 비어있을 경우, 최초 사용자에게 보여줄 기본값 설정
        setTodos([{ id: 1, text: 'Gemini API 연동 테스트', done: false }]);
      }
    };
    loadInitialTodos();
  }, []); // 빈 배열: 컴포넌트가 마운트될 때 (앱 시작 시) 한 번만 실행

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

// 👇👇 [여기에 추가] todos 상태 변경 시 자동 저장 👇👇
  useEffect(() => {
    // todos 배열이 변경될 때마다 실행됩니다.
    ipcRenderer.send('save-todos', todos);
  }, [todos]); // todos가 Dependency Array (의존성 배열)이므로 todos가 바뀔 때마다 실행됩니다.

  // --- [3. ✨ 진짜 AI 통신 로직] ---
  const callGeminiAI = async (userText, currentTodos) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

      // 🤖 시스템 프롬프트: AI에게 역할을 부여하고, 앱을 조작하는 '법'을 가르칩니다.
      const systemInstruction = `
        너는 사용자의 생산성을 돕는 'AI Partner'야. 
        너는 사용자의 질문에 친절하게 답하거나, 사용자의 명령에 따라 '할일(Todo)'을 관리해야 해.
        
        [중요 규칙]
        사용자가 "할일 추가해줘", "일정에 넣어줘" 같이 작업을 요청하면, 
        반드시 아래와 같은 **JSON 형식**으로만 대답해야 해 (다른 말 덧붙이지 마):
        {"action": "add_todo", "content": "할일 내용"}
        
        사용자가 "자산 보여줘", "돈 관리" 같이 말하면:
        {"action": "show_finance"}
        
        그 외의 일반적인 대화나 조언을 구할 때는:
        그냥 평소처럼 친절한 한국어 텍스트로 대답해.
        
        현재 저장된 할일 목록은 다음과 같아 (참고용):
        ${JSON.stringify(currentTodos.map(t => t.text))} // 👈 인수로 받은 currentTodos를 사용
      `;

      const prompt = `${systemInstruction}\n\n사용자: ${userText}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // AI가 JSON(명령)을 보냈는지, 일반 텍스트를 보냈는지 판단
      try {
        // JSON 파싱 시도 (AI가 명령을 내린 경우)
        const command = JSON.parse(text);
        
        if (command.action === 'add_todo') {
          const newTodo = { id: Date.now(), text: command.content, done: false };
          setTodos(prev => [...prev, newTodo]);
          return { type: 'widget', widgetType: 'todo', text: `"${command.content}" 항목을 추가했습니다. ✅` };
        }
        
        if (command.action === 'show_finance') {
          return { type: 'widget', widgetType: 'finance', text: '요청하신 자산 현황입니다.' };
        }

      } catch (e) {
        // JSON이 아니면 일반 대화로 간주
        return { type: 'text', text: text };
      }

    } catch (error) {
      console.error("AI Error:", error);
      return { type: 'text', text: '죄송해요, 네트워크 연결 상태가 좋지 않아 잠시 생각할 시간이 필요해요.' };
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const userText = inputValue;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', type: 'text', content: userText }]);
    setInputValue('');
    setIsTyping(true); // 타이핑 인디케이터 시작

    // 진짜 AI 호출
    const response = await callGeminiAI(userText, todos);
    
    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      role: 'ai',
      type: response?.type || 'text',
      widgetType: response?.widgetType,
      content: response?.text || '오류가 발생했습니다.'
    }]);
    
    setIsTyping(false); // 타이핑 인디케이터 종료
  };

  // --- [4. UI 렌더링 (이전과 동일)] ---
  const toggleTodo = (id) => setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTodo = (id) => setTodos(todos.filter(t => t.id !== id));

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="h-screen w-full bg-transparent flex items-center justify-center p-[1px]">
        
        <div className="flex flex-col w-full h-full font-sans overflow-hidden relative transition-colors duration-500 ease-in-out
          bg-zinc-50 text-zinc-900 
          dark:bg-zinc-950 dark:text-zinc-100 border dark:border-zinc-800 rounded-2xl">
          
          <header className="drag-region h-14 flex items-center justify-between px-4 border-b transition-colors
            bg-white/80 border-zinc-200/50
            dark:bg-zinc-900/80 dark:border-white/5 backdrop-blur-md sticky top-0 z-20">
            
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Bot size={16} className="text-white" />
              </div>
              <h1 className="font-bold text-xs tracking-tight">AI Partner</h1>
            </div>
            
            <div className="flex items-center gap-1 no-drag">
              <button 
                onClick={cycleThemeMode} 
                className="relative p-2 rounded-full transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 group mr-1"
                title={`현재 모드: ${themeMode === 'auto' ? '자동' : themeMode === 'light' ? '라이트' : '다크'}`}
              >
                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                {themeMode === 'auto' && (
                  <span className="absolute bottom-1 right-0.5 bg-indigo-500 text-white text-[6px] font-bold px-0.5 rounded shadow-sm leading-none">AUTO</span>
                )}
              </button>

              <button 
                onClick={() => ipcRenderer.send('minimize-window')}
                className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
              >
                <Minus size={18} />
              </button>

              <button 
                onClick={() => ipcRenderer.send('hide-window')}
                className="p-2 rounded-full hover:bg-rose-500 hover:text-white text-zinc-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-gradient-to-b from-transparent to-zinc-100/50 dark:to-transparent">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm
                  ${msg.role === 'ai' 
                    ? 'bg-white border-zinc-200 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-indigo-400' 
                    : 'bg-zinc-200 border-zinc-300 dark:bg-zinc-700 dark:border-zinc-600'}`}>
                  {msg.role === 'ai' ? <Sparkles size={14} /> : <User size={14} className="opacity-70" />}
                </div>

                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm border transition-colors duration-300
                    ${msg.role === 'user' 
                      ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-sm' 
                      : 'bg-white border-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>

                  {msg.type === 'widget' && (
                    <div className="mt-2 w-full animate-fade-in-up">
                      {msg.widgetType === 'finance' && <FinanceWidget />}
                      {msg.widgetType === 'todo' && (
                        <TodoWidget todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="AI에게 요청하세요 (예: 내일 미팅 추가해줘)"
                className="w-full bg-zinc-100 border-zinc-200 text-zinc-900 placeholder:text-zinc-400
                  dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-600
                  border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- [위젯 컴포넌트들 (동일)] ---
function TodoWidget({ todos, onToggle, onDelete }) {
  return (
    <div className="rounded-xl p-4 w-[280px] shadow-sm border transition-colors
      bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center gap-2 mb-3 text-zinc-500 dark:text-zinc-400">
        <CheckSquare size={14} />
        <span className="text-xs font-bold uppercase">할 일 목록</span>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {todos.length === 0 ? (
           <p className="text-xs text-zinc-400 text-center py-2">할 일이 없습니다 ✨</p>
        ) : (
          todos.map(todo => (
            <div key={todo.id} className="flex items-center gap-2.5 p-2 rounded-lg transition-colors
              bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-transparent dark:hover:border-zinc-700">
              <button onClick={() => onToggle(todo.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-400'}`}>
                {todo.done && <CheckSquare size={10} className="text-white" />}
              </button>
              <span className={`text-xs flex-1 truncate ${todo.done ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>{todo.text}</span>
              <button onClick={() => onDelete(todo.id)} className="text-zinc-400 hover:text-rose-500"><Trash2 size={12} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FinanceWidget() {
  return (
    <div className="rounded-xl p-4 w-[280px] shadow-sm border transition-colors
      bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Wallet size={14} />
          <span className="text-xs font-bold uppercase">내 자산</span>
        </div>
        <span className="text-rose-500 text-xs font-bold">+5.2%</span>
      </div>
      <div className="text-xl font-bold text-zinc-900 dark:text-white mb-1">₩ 42,500,000</div>
      <div className="flex items-end gap-1 h-10 mt-2 opacity-90">
        {[30, 45, 40, 60, 75, 50, 80].map((h, i) => (
          <div key={i} className="flex-1 bg-indigo-100 dark:bg-indigo-500/30 rounded-t-sm relative overflow-hidden">
            <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-indigo-500"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
       <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center">
         <Sparkles size={14} className="text-indigo-500" />
       </div>
       <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center h-10
         bg-zinc-100 dark:bg-zinc-900">
         <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
         <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-75"></span>
         <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-150"></span>
       </div>
     </div>
  );
}

export default App;