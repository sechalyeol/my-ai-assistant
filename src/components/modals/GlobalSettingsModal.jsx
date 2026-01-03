// Last Updated: 2026-01-04 04:42:53
import React, { useState, useEffect } from 'react';
import { 
    X, User, Database, Info, Save, Download, Upload, 
    CheckCircle, Circle, FileText, Calendar, Wallet, Heart, BookOpen, Briefcase,
    Camera, Award, Plus, Trash2, Hash, PenTool
} from 'lucide-react';

const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');
const path = window.require('path');

const GlobalSettingsModal = ({ 
    isOpen, onClose, 
    user, setUser, 
    allData, 
    onExportData, onImportData, onResetData 
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [tempUser, setTempUser] = useState({ 
        name: '', role: '', avatar: '', 
        certifications: [], skills: [], career: '' 
    });
    
    const [newCert, setNewCert] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const [selectedItems, setSelectedItems] = useState({
        schedule: true, finance: true, mental: true, 
        development: true, work: true, equipment: true
    });

    useEffect(() => {
        if (isOpen) {
            setTempUser({ 
                name: user.name || '', 
                role: user.role || '', 
                avatar: user.avatar || '',
                certifications: user.certifications || [],
                skills: user.skills || [],
                career: user.career || ''
            });
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    // --- 이미지 및 파일 처리 로직 (기존 동일) ---
    const processImageFile = (filePath) => {
        try {
            const fileData = fs.readFileSync(filePath);
            const ext = path.extname(filePath).slice(1).toLowerCase();
            if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                alert("이미지 파일만 업로드 가능합니다.");
                return;
            }
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const base64Url = `data:${mimeType};base64,${fileData.toString('base64')}`;
            setTempUser(prev => ({ ...prev, avatar: base64Url }));
        } catch (error) {
            console.error("이미지 처리 실패:", error);
        }
    };

    const handleChangeAvatarClick = async () => {
        const filePath = await ipcRenderer.invoke('select-image');
        if (filePath) processImageFile(filePath);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.path) processImageFile(file.path);
        }
    };

    // --- 데이터 핸들러 ---
    const handleSaveProfile = () => { setUser(tempUser); onClose(); };
    
    const handleAddCert = () => { if (newCert.trim()) { setTempUser(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] })); setNewCert(''); }};
    const handleRemoveCert = (index) => { setTempUser(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) })); };
    
    const handleAddSkill = () => { if (newSkill.trim()) { setTempUser(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] })); setNewSkill(''); }};
    const handleRemoveSkill = (index) => { setTempUser(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) })); };

    const toggleSelection = (key) => { setSelectedItems(prev => ({ ...prev, [key]: !prev[key] })); };
    const toggleAll = () => {
        const allSelected = Object.values(selectedItems).every(v => v);
        const newState = {};
        Object.keys(selectedItems).forEach(key => newState[key] = !allSelected);
        setSelectedItems(newState);
    };
    
    const handleSelectiveExport = () => {
        const dataToExport = {};
        if (selectedItems.schedule) dataToExport.schedules = allData.todos;
        if (selectedItems.finance) dataToExport.finance = allData.finance;
        if (selectedItems.mental) dataToExport.mental = allData.mental;
        if (selectedItems.development) dataToExport.development = allData.dev;
        if (selectedItems.work) dataToExport.work = allData.work;
        if (selectedItems.equipment) dataToExport.equipment = allData.equipment;
        if (Object.keys(dataToExport).length === 0) { alert("내보낼 항목을 선택해주세요."); return; }
        onExportData(dataToExport);
    };

    const tabs = [
        { id: 'profile', label: '내 정보', icon: User },
        { id: 'data', label: '데이터 관리', icon: Database },
        { id: 'about', label: '앱 정보', icon: Info },
    ];

    const dataOptions = [
        { id: 'schedule', label: '일정', icon: Calendar, desc: '캘린더/할일', count: allData.todos?.length || 0 },
        { id: 'finance', label: '자산', icon: Wallet, desc: '수입/지출', count: allData.finance?.items?.length || 0 },
        { id: 'mental', label: '멘탈', icon: Heart, desc: '감정/조언', count: allData.mental?.logs?.length || 0 },
        { id: 'development', label: '자기개발', icon: BookOpen, desc: '학습/서재', count: allData.dev?.tasks?.length || 0 },
        { id: 'work', label: '직무교육', icon: Briefcase, desc: '매뉴얼', count: allData.work?.manuals?.length || 0 },
        { id: 'equipment', label: '설비', icon: FileText, desc: '설비/정비', count: allData.equipment?.list?.length || 0 },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
            {/* 스크롤바 숨김 스타일 (기능은 유지) */}
            <style>
                {`
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                `}
            </style>

            {/* 메인 모달 컨테이너 (Zinc 테마 적용) */}
            <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl h-[650px] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                
                {/* 1. 사이드바 (Zinc-50/Zinc-950) */}
                <div className="w-60 bg-zinc-50 dark:bg-zinc-950/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-4">
                    <div className="mb-6 px-2 mt-2">
                        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">Settings</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">환경 설정 및 관리</p>
                    </div>
                    <div className="space-y-1.5 flex-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === tab.id 
                                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200/60 dark:border-zinc-700' 
                                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                                }`}
                            >
                                <tab.icon size={18} strokeWidth={2} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="px-2 mt-auto">
                        <p className="text-[10px] text-zinc-400 font-mono">v1.0.0 Local</p>
                    </div>
                </div>

                {/* 2. 컨텐츠 영역 */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 relative">
                    {/* 공통 헤더 */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{tabs.find(t => t.id === activeTab).label}</h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 🟢 탭 1: 내 정보 (Flex Column으로 저장 버튼 하단 고정) */}
                    {activeTab === 'profile' && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            
                            {/* 스크롤 가능한 입력 영역 */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                                    
                                    {/* 프로필 이미지 & 기본 정보 */}
                                    <div className="flex items-center gap-6">
                                        <div 
                                            className={`relative group cursor-pointer w-24 h-24 rounded-full border-4 overflow-hidden flex-shrink-0 transition-all ${isDragging ? 'border-indigo-500 scale-105' : 'border-zinc-100 dark:border-zinc-800'}`}
                                            onClick={handleChangeAvatarClick}
                                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                        >
                                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                {tempUser.avatar && tempUser.avatar.startsWith('data:') ? (
                                                    <img src={tempUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl">{typeof tempUser.avatar === 'string' && tempUser.avatar.length < 5 ? tempUser.avatar : '🧑‍💻'}</span>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <Camera size={20} />
                                            </div>
                                        </div>
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 block mb-1.5 ml-1">이름</label>
                                                <input 
                                                    value={tempUser.name} 
                                                    onChange={e => setTempUser({...tempUser, name: e.target.value})}
                                                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-zinc-100 transition-colors"
                                                    placeholder="이름 입력"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 block mb-1.5 ml-1">소속 / 직함</label>
                                                <input 
                                                    value={tempUser.role} 
                                                    onChange={e => setTempUser({...tempUser, role: e.target.value})}
                                                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-zinc-100 transition-colors"
                                                    placeholder="직함 입력"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 상세 입력 섹션 */}
                                    <div className="space-y-6">
                                        {/* 자격증 */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 block mb-2 flex items-center gap-2">
                                                <Award size={14}/> 보유 자격증
                                            </label>
                                            <div className="flex gap-2 mb-3">
                                                <input 
                                                    value={newCert}
                                                    onChange={e => setNewCert(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddCert()}
                                                    className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-zinc-100"
                                                    placeholder="자격증 명칭 입력 (Enter)"
                                                />
                                                <button onClick={handleAddCert} className="px-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-300">
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {tempUser.certifications.map((cert, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800 rounded-lg text-xs font-bold flex items-center gap-2">
                                                        {cert}
                                                        <button onClick={() => handleRemoveCert(idx)} className="hover:text-amber-900 dark:hover:text-amber-200"><X size={12} /></button>
                                                    </span>
                                                ))}
                                                {tempUser.certifications.length === 0 && <span className="text-xs text-zinc-400 pl-1">등록된 내역 없음</span>}
                                            </div>
                                        </div>

                                        {/* 스킬 */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 block mb-2 flex items-center gap-2">
                                                <Hash size={14}/> 기술 스택
                                            </label>
                                            <div className="flex gap-2 mb-3">
                                                <input 
                                                    value={newSkill}
                                                    onChange={e => setNewSkill(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                                                    className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-zinc-100"
                                                    placeholder="기술 / 스킬 입력 (Enter)"
                                                />
                                                <button onClick={handleAddSkill} className="px-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-600 dark:text-zinc-300">
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {tempUser.skills.map((skill, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg text-xs font-bold flex items-center gap-2">
                                                        {skill}
                                                        <button onClick={() => handleRemoveSkill(idx)} className="hover:text-indigo-900 dark:hover:text-indigo-200"><X size={12} /></button>
                                                    </span>
                                                ))}
                                                {tempUser.skills.length === 0 && <span className="text-xs text-zinc-400 pl-1">등록된 내역 없음</span>}
                                            </div>
                                        </div>

                                        {/* 커리어 */}
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 block mb-2 flex items-center gap-2">
                                                <PenTool size={14}/> 커리어 요약
                                            </label>
                                            <textarea 
                                                value={tempUser.career}
                                                onChange={e => setTempUser({...tempUser, career: e.target.value})}
                                                className="w-full h-28 p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 outline-none dark:text-zinc-100"
                                                placeholder="주요 경력 사항을 입력하세요..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 저장 버튼 (고정 Footer) - Zinc/Indigo 테마 유지 */}
                            <div className="shrink-0 p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end">
                                <button onClick={handleSaveProfile} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                    <Save size={16} /> 설정 저장하기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 🟢 탭 2: 데이터 관리 (Zinc 테마 적용) */}
                    {activeTab === 'data' && (
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">내보낼 데이터 선택</h4>
                                    <button onClick={toggleAll} className="text-xs text-indigo-500 hover:text-indigo-400 font-bold hover:underline">
                                        전체 선택 / 해제
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {dataOptions.map((opt) => (
                                        <div 
                                            key={opt.id}
                                            onClick={() => toggleSelection(opt.id)}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden ${
                                                selectedItems[opt.id] 
                                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' 
                                                : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className={`p-1.5 rounded-lg transition-colors ${selectedItems[opt.id] ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                                    <opt.icon size={16} />
                                                </div>
                                                <div className={`${selectedItems[opt.id] ? 'text-indigo-500' : 'text-zinc-300 dark:text-zinc-600'}`}>
                                                    {selectedItems[opt.id] ? <CheckCircle size={18} /> : <Circle size={18} />}
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`text-xs font-bold block mb-0.5 ${selectedItems[opt.id] ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{opt.label}</span>
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{opt.desc}</span>
                                            </div>
                                            <div className="mt-auto pt-2 flex justify-end">
                                                <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {opt.count}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <button onClick={handleSelectiveExport} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                        <Download size={14} /> 선택 항목 백업
                                    </button>
                                    <button onClick={onImportData} className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 transition-all">
                                        <Upload size={14} /> 데이터 복원
                                    </button>
                                </div>

                                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">데이터 초기화</h4>
                                        <p className="text-[10px] text-rose-500/70">경고: 모든 데이터가 영구적으로 삭제됩니다.</p>
                                    </div>
                                    <button onClick={onResetData} className="px-3 py-1.5 bg-white dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors flex items-center gap-1">
                                        <Trash2 size={12} /> 초기화
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🟢 탭 3: 앱 정보 (Zinc 테마 적용) */}
                    {activeTab === 'about' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in p-6 overflow-y-auto scrollbar-hide">
                            <div className="w-16 h-16 bg-zinc-900 dark:bg-white rounded-3xl flex items-center justify-center text-3xl shadow-xl transform rotate-3 hover:rotate-6 transition-transform cursor-default">
                                🤖
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight">My AI Assistant</h3>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded-full border border-zinc-200 dark:border-zinc-700">v1.0.0</span>
                                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-200 dark:border-indigo-800">Local Only</span>
                                </div>
                            </div>
                            <div className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                개인 업무 효율과 자기개발을 위한<br/>올인원 AI 파트너입니다.<br/><br/>
                                데이터는 로컬 환경에만 저장되며,<br/>외부 서버로 전송되지 않습니다.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsModal;