// Last Updated: 2026-01-04 04:42:53
import React, { useState } from 'react';
import { User, Lock, ArrowRight, Activity } from 'lucide-react';

const { ipcRenderer } = window.require('electron');

const LoginView = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await ipcRenderer.invoke('auth-login', { username, password });
            if (res.success) {
                // 로그인 성공 시 상위 컴포넌트(App.jsx)에 사용자 정보 전달
                onLoginSuccess(res.user);
            } else {
                setError(res.message);
            }
        } catch (err) {
            console.error(err);
            setError("서버 통신 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-zinc-50 dark:bg-zinc-950 p-6 select-none font-sans text-zinc-900 dark:text-zinc-100">
            {/* 상단 드래그 영역 (앱 이동 가능하게) */}
            <div className="absolute top-0 left-0 w-full h-10 drag-region" />

            <div className="w-full max-w-[360px] p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center animate-fade-in-up">
                
                {/* 로고 영역 */}
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 transform transition-transform hover:scale-105">
                    <Activity size={32} className="text-white" />
                </div>

                <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">AI Partner Pro</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Authorized Personnel Only</p>

                <form onSubmit={handleLogin} className="w-full space-y-4">
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="사번 / 아이디" 
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-800 transition-all placeholder:font-normal"
                            value={username} 
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="password" 
                            placeholder="비밀번호" 
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-800 transition-all placeholder:font-normal"
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 text-rose-500 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || !username || !password}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 mt-4"
                    >
                        {isLoading ? "인증 확인 중..." : "로그인"} <ArrowRight size={18} />
                    </button>
                </form>
            </div>
            
            <div className="mt-8 text-center space-y-1">
                <p className="text-[10px] text-zinc-400">Incheon Total Energy Company</p>
                <p className="text-[10px] text-zinc-500">System Ver 1.2.0</p>
            </div>
        </div>
    );
};

export default LoginView;