// Last Updated: 2025-12-30 15:59:37
import React, { useState, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, 
    Wallet, 
    Heart, 
    BookOpen, 
    ChevronLeft, 
    ChevronRight, 
    Menu, 
    Link as LinkIcon, 
    ExternalLink,
    MapPin, 
    Box,
    Map as MapIcon,
    List,
    ArrowLeft
} from 'lucide-react';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Center, Float } from '@react-three/drei';
import * as THREE from 'three';

import mapData from '../../data/mapData.json';

// ----------------------------------------------------------------------
// 1. 설비 채팅 위젯 (개선됨: 리스트 -> 맵 상세 보기)
// ----------------------------------------------------------------------
export const EquipmentChatWidget = ({ data }) => {
    // data.foundItems: 검색된 설비 목록
    const foundItems = data.foundItems || [];
    const [selectedItem, setSelectedItem] = useState(null); // 현재 지도 볼 아이템

    // 🌟 선택된 아이템의 층 정보와 주변 설비들(Context) 찾기
    const mapContext = useMemo(() => {
        if (!selectedItem) return null;

        // mapData 전체를 뒤져서 해당 아이템이 있는 층(Floor) 데이터를 찾습니다.
        for (const b of mapData) {
            for (const f of b.floors) {
                const target = (f.valves || []).find(v => v.id === selectedItem.id);
                if (target) {
                    return {
                        buildingName: b.name,
                        floorName: f.label,
                        allItems: f.valves, // 그 층의 모든 설비 (배경용)
                        targetItem: target
                    };
                }
            }
        }
        return null;
    }, [selectedItem]);

    // 📦 3D 객체 렌더러 (고스트 모드)
    const GhostObject = ({ item, isTarget }) => {
        const color = isTarget ? "#ef4444" : "#94a3b8"; // 타겟: 빨강, 나머지: 회색
        const opacity = isTarget ? 1.0 : 0.2;           // 타겟: 선명, 나머지: 흐릿
        const scale = isTarget ? 1.5 : 1.0;             // 타겟: 좀 더 크게

        // 타입별 대략적인 모양
        let Geometry = <boxGeometry args={[1, 1, 1]} />;
        let yOffset = 0.5;

        if (item.type.includes('TANK')) {
            Geometry = <cylinderGeometry args={[1.2, 1.2, 3, 16]} />;
            yOffset = 1.5;
        } else if (item.type.includes('PUMP')) {
            Geometry = <boxGeometry args={[2, 0.8, 0.8]} />;
            yOffset = 0.4;
        } else if (item.type.includes('STAIRS')) {
            Geometry = <boxGeometry args={[2, 4, 1]} />;
            yOffset = 2;
        } else if (item.type.includes('VALVE')) {
            Geometry = <sphereGeometry args={[0.4, 16, 16]} />;
            yOffset = 0.4;
        } else if (item.type.includes('DOOR') || item.type.includes('SHUTTER')) {
             Geometry = <boxGeometry args={[3, 3, 0.2]} />;
             yOffset = 1.5;
        }

        return (
            <group 
                position={[item.x, item.y || 0, item.z]} 
                rotation={[0, item.rotation || 0, 0]} 
                scale={[scale, scale, scale]}
            >
                {/* 본체 */}
                <mesh position={[0, yOffset, 0]}>
                    {Geometry}
                    <meshStandardMaterial color={color} transparent opacity={opacity} />
                </mesh>
                
                {/* 타겟 마커 및 라벨 */}
                {isTarget && (
                    <>
                        {/* 둥둥 떠있는 화살표 */}
                        <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
                            <mesh position={[0, yOffset + 2.5, 0]} rotation={[Math.PI, 0, 0]}>
                                <coneGeometry args={[0.4, 0.8, 8]} />
                                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
                            </mesh>
                        </Float>
                        {/* 텍스트 라벨 */}
                        <Html position={[0, yOffset + 3.2, 0]} center zIndexRange={[100, 0]}>
                            <div className="flex flex-col items-center">
                                <div className="px-2.5 py-1 bg-red-600 text-white text-[11px] font-bold rounded-lg shadow-xl whitespace-nowrap border border-white/20">
                                    {item.label}
                                </div>
                                <div className="w-0.5 h-2 bg-red-600"></div>
                            </div>
                        </Html>
                    </>
                )}
            </group>
        );
    };

    return (
        <div className="w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-300">
            
            {/* 1. 지도 보기 모드 */}
            {selectedItem && mapContext ? (
                <div className="flex flex-col h-full animate-fade-in">
                    {/* 상단 네비게이션 */}
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors bg-white dark:bg-zinc-700 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600"
                        >
                            <ArrowLeft size={12} /> 목록으로
                        </button>
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-400 font-bold">위치 정보</p>
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {mapContext.buildingName} {mapContext.floorName}
                            </p>
                        </div>
                    </div>

                    {/* 3D 캔버스 영역 */}
                    <div className="h-64 relative bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-black">
                        <Canvas camera={{ position: [mapContext.targetItem.x + 8, 12, mapContext.targetItem.z + 8], fov: 40 }}>
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
                            <OrbitControls 
                                target={[mapContext.targetItem.x, 0, mapContext.targetItem.z]} 
                                maxPolarAngle={Math.PI / 2.1}
                                autoRotate={true}
                                autoRotateSpeed={0.5}
                            />
                            
                            <gridHelper args={[100, 20, "#cbd5e1", "#334155"]} position={[0, -0.01, 0]} />
                            
                            {/* 🌟 주변 설비 모두 렌더링 */}
                            {mapContext.allItems.map((item, idx) => (
                                <GhostObject 
                                    key={item.id || idx} 
                                    item={item} 
                                    isTarget={item.id === selectedItem.id} 
                                />
                            ))}
                        </Canvas>

                        {/* 하단 범례 */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 mb-1">{selectedItem.label}</p>
                                <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> 선택됨
                                    <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block ml-2"></span> 주변 설비
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* 2. 검색 결과 리스트 모드 */
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <List size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">설비 검색 결과</p>
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                                {foundItems.length}개의 설비가 발견됨
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700 pr-1">
                        {foundItems.length > 0 ? (
                            foundItems.map((item) => {
                                // 리스트에서도 위치 정보 미리 보여주기 위해 mapData 검색
                                let locationText = "위치 정보 없음";
                                for(const b of mapData) {
                                    for(const f of b.floors) {
                                        if((f.valves||[]).some(v => v.id === item.id)) {
                                            locationText = `${b.name} ${f.label}`;
                                        }
                                    }
                                }

                                return (
                                    <div 
                                        key={item.id} 
                                        className="group p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-700/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-700 border border-zinc-100 dark:border-zinc-600 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                                                <MapPin size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {item.label}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                                    {locationText}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            지도 보기
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-zinc-400 text-xs">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 🌟 [추가됨] 파비콘 가져오는 함수 (이게 없어서 에러가 났었습니다)
const getFavicon = (url) => {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
        return null;
    }
};

// 1. 일정 위젯
export const ScheduleChatWidget = ({ data }) => {
    const upcoming = (data || [])
        .filter(t => {
            const d = new Date(t.date);
            d.setHours(23, 59, 59, 999);
            return d >= new Date();
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);

    const getDDay = (dateStr) => {
        const target = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diff = (target - today) / (1000 * 60 * 60 * 24);
        if (diff === 0) return "D-Day";
        if (diff === 1) return "내일";
        return `D-${Math.ceil(diff)}`;
    };

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">다가오는 일정</span>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{upcoming.length}건</span>
            </div>
            <div className="space-y-2.5">
                {upcoming.length > 0 ? upcoming.map(t => (
                    <div key={t.id} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center ${t.category === 'shift' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'}`}>
                            <span className="text-[8px] font-bold leading-none">{getDDay(t.date)}</span>
                            <span className="text-xs font-bold leading-none mt-0.5">{new Date(t.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">{t.text}</p>
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {t.date} {t.startTime ? `• ${t.startTime}` : ''}
                            </p>
                        </div>
                    </div>
                )) : <div className="py-4 text-center text-xs text-zinc-400">예정된 일정이 없습니다 🏝️</div>}
            </div>
        </div>
    );
};

// 2. 자산 위젯
export const FinanceChatWidget = ({ data }) => (
    <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <Wallet size={16} className="text-emerald-500" />
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">자산 현황</span>
        </div>
        <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">총 자산</span>
            <span className="text-2xl font-black text-zinc-800 dark:text-white tracking-tight">
                ₩ {data?.totalAsset?.toLocaleString() || 0}
            </span>
        </div>
    </div>
);

// 3. 멘탈 위젯
export const MentalChatWidget = ({ data }) => {
    const getStatus = (score) => {
        if (score >= 80) return { color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20", label: "매우 좋음" };
        if (score >= 50) return { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "안정적" };
        return { color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", label: "지침/우울" };
    };
    const status = getStatus(data?.score || 0);

    return (
        <div className="font-sans text-base w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-0 overflow-hidden shadow-sm">
            <div className="p-4 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Heart size={16} className="text-rose-500 fill-rose-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">오늘의 마음 날씨</span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                    {data?.currentMood || '기록 없음'}
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className={`text-4xl font-black ${status.color}`}>{data?.score || 0}</span>
                    <span className="text-sm text-zinc-400 font-medium">/100</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700/50">
                    <div className="flex gap-2">
                        <span className="text-lg">💡</span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-keep">
                            {data?.todayAdvice || "오늘 하루 감정을 기록해보세요."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. 학습 위젯 (리스트형)
export const StudyChatWidget = ({ data }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) return node && node.done ? 100 : 0;
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    const allBooks = (data?.tasks || []).map(book => ({
        ...book,
        calculatedProgress: calculateProgress(book)
    })).sort((a, b) => b.calculatedProgress - a.calculatedProgress);

    const visibleBooks = isExpanded ? allBooks : allBooks.slice(0, 3);

    return (
        <div className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-600" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">학습 라이브러리</span>
                </div>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">
                    총 {allBooks.length}권
                </span>
            </div>
            <div className="space-y-3">
                {visibleBooks.length > 0 ? visibleBooks.map(book => (
                    <div key={book.id} className="group flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate w-40">{book.title}</span>
                            <span className={`font-bold ${book.calculatedProgress === 100 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                {book.calculatedProgress}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div style={{ width: `${book.calculatedProgress}%` }} className={`h-full rounded-full transition-all duration-500 ${book.calculatedProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}></div>
                        </div>
                    </div>
                )) : <div className="text-xs text-zinc-400 text-center py-2">등록된 교재가 없습니다.</div>}
            </div>
            {allBooks.length > 3 && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-3 py-2 text-[10px] font-bold text-zinc-500 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 rounded-lg flex items-center justify-center gap-1">
                    {isExpanded ? <>접기 <ChevronLeft size={12} className="rotate-90" /></> : <>더보기 (+{allBooks.length - 3}) <ChevronRight size={12} className="rotate-90" /></>}
                </button>
            )}
        </div>
    );
};

// 5. 3D 책 커버 플로우 위젯
export const BookCoverFlowWidget = ({ tasks, onBookClick }) => {
    const books = tasks || [];
    const [currentIndex, setCurrentIndex] = useState(0);

    const calculateProgress = (node) => {
        if (!node || !node.children || node.children.length === 0) return node && node.done ? 100 : 0;
        const total = node.children.reduce((acc, child) => acc + calculateProgress(child), 0);
        return Math.round(total / node.children.length);
    };

    const currentBook = books[currentIndex];
    const currentProgress = currentBook ? calculateProgress(currentBook) : 0;

    const prevBook = () => setCurrentIndex(prev => (prev === 0 ? books.length - 1 : prev - 1));
    const nextBook = () => setCurrentIndex(prev => (prev === books.length - 1 ? 0 : prev + 1));

    const getCardStyle = (index) => {
        const relativeIndex = index - currentIndex;
        const absRelative = Math.abs(relativeIndex);

        if (relativeIndex === 0) {
            return {
                transform: 'translateX(0) translateZ(100px) rotateY(0deg)',
                zIndex: 10,
                opacity: 1,
                scale: 1,
            };
        }

        const sign = Math.sign(relativeIndex);
        const translateX = sign * 50 * absRelative;
        const translateZ = -100 * absRelative;
        const rotateY = sign * -45;
        const scale = Math.max(0.6, 1 - (0.2 * absRelative));
        const opacity = Math.max(0.3, 1 - (0.4 * absRelative));

        return {
            transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
            zIndex: 10 - absRelative,
            opacity: opacity,
        };
    };

    if (books.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                <BookOpen size={30} className="opacity-30" />
                <p className="text-xs">서재가 비어있습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 relative flex items-center justify-center perspective-[600px] overflow-hidden py-4">
                <button onClick={(e) => { e.stopPropagation(); prevBook(); }} className="absolute left-0 z-20 p-1 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all backdrop-blur-sm">
                    <ChevronLeft size={18} />
                </button>

                <div className="relative w-24 h-32 transform-style-3d flex items-center justify-center">
                    {books.map((book, index) => {
                        if (Math.abs(index - currentIndex) > 2) return null;
                        const isCenter = index === currentIndex;
                        return (
                            <div key={book.id}
                                className="absolute w-full h-full transition-all duration-500 ease-in-out bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden cursor-pointer group"
                                style={getCardStyle(index)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCenter && onBookClick) onBookClick(book.id);
                                    else setCurrentIndex(index);
                                }}
                            >
                                {book.cover ? (
                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 p-2">
                                        <BookOpen size={32} className="text-emerald-400/50 group-hover:text-emerald-500 transition-colors mb-1" />
                                        {book.isLocal && <span className="text-[8px] font-bold text-emerald-600/70 uppercase">PDF</span>}
                                    </div>
                                )}
                                {isCenter && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                        <button className="w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-lg flex items-center justify-center text-emerald-600 hover:scale-110 transition-transform cursor-pointer border border-emerald-100 dark:border-zinc-600">
                                            <Menu size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button onClick={(e) => { e.stopPropagation(); nextBook(); }} className="absolute right-0 z-20 p-1 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all backdrop-blur-sm">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="h-16 flex flex-col justify-center border-t border-zinc-100 dark:border-zinc-800/50 pt-0 text-center">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate px-4">{currentBook?.title}</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mb-1">{currentBook?.author || '저자 미상'}</p>
                <div className="flex items-center gap-2 justify-center px-6">
                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div style={{ width: `${currentProgress}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"></div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600">{currentProgress}%</span>
                </div>
            </div>
        </div>
    );
};

// 6. 커스텀 대시보드 위젯 (메모 & 링크)
export const CustomDashboardChatWidget = ({ data }) => {
    const memos = data.filter(w => w.type === 'card');
    const links = data.filter(w => w.type === 'link');

    return (
        <div className="w-80 flex flex-col gap-4">
            
            {/* 1. 메모/알람 섹션 */}
            {memos.length > 0 && (
                <div className="space-y-2.5">
                    {memos.map(memo => {
                        const isAlarm = !!memo.targetTime;
                        return (
                            <div key={memo.id} className={`p-3.5 rounded-2xl border shadow-sm transition-all ${
                                isAlarm 
                                ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                                : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                            }`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                                            isAlarm ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            {isAlarm ? '⏰' : '📌'}
                                        </span>
                                        <span className={`text-xs font-bold ${
                                            isAlarm ? 'text-indigo-900 dark:text-indigo-200' : 'text-amber-900 dark:text-amber-200'
                                        }`}>
                                            {memo.title}
                                        </span>
                                    </div>
                                    {isAlarm && (
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-600 text-white rounded-full shadow-sm shadow-indigo-200">
                                            {memo.targetTime}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed pl-1">
                                    {memo.content}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 🌟 2. 링크 섹션 (finalIcon 대응 업데이트) */}
            {links.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {links.map(link => {
                        // 🌟 여기서 getFavicon을 사용합니다! (이제 정의되어 있으므로 에러 안 남)
                        const iconSrc = link.finalIcon || getFavicon(link.url);

                        return (
                            <a 
                                key={link.id} 
                                href={link.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group shadow-sm"
                            >
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform text-xs">
                                    {iconSrc ? (
                                        <img 
                                            src={iconSrc} 
                                            alt={link.title} 
                                            className="w-5 h-5 object-contain"
                                            onError={(e) => { e.target.parentElement.innerHTML = '🔗'; }} 
                                        />
                                    ) : (
                                        '🔗'
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-200 truncate">{link.title}</p>
                                    <p className="text-[8px] text-indigo-500 dark:text-indigo-400 font-medium">바로가기 →</p>
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
};