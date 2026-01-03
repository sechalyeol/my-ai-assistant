// Last Updated: 2026-01-03 20:19:58
import React from 'react';
import { X, Wrench, Image as ImageIcon, Activity, Droplets, Gauge, AlertCircle } from 'lucide-react';

const EquipmentDetailModal = ({ isOpen, onClose, item, matchedInfo }) => {
    if (!isOpen || !item) return null;

    const imageUrl = item.image || matchedInfo?.image || matchedInfo?.fieldGuides?.[0]?.attachments?.[0]?.path || null;

    // 날짜 포맷팅
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleDateString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
    };

    // 상태에 따른 아이콘 색상
    const getStatusColor = (status) => {
        switch (status) {
            case 'WARNING': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            case 'ERROR': return 'text-red-500 bg-red-50 border-red-200';
            default: return 'text-emerald-500 bg-emerald-50 border-emerald-200';
        }
    };

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-fade-in">
            {/* 🌟 크기 축소: max-w-lg (기존 xl보다 작음), 높이 제한 */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-700 flex flex-col max-h-[80vh]">
                
                {/* 1. 헤더 (타이틀 & 닫기 버튼만 깔끔하게) */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                        설비 상세 정보
                        {/* 상태 표시 점 (작게) */}
                        <span className={`w-2 h-2 rounded-full ${item.status === 'WARNING' ? 'bg-yellow-500' : item.status === 'ERROR' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* 2. 컨텐츠 영역 (스크롤) */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {matchedInfo ? (
                        <>
                            {/* 🌟 상단: 이미지 + 설명 (컴팩트 레이아웃) */}
                            <div className="flex gap-4 mb-6">
                                {/* 설비 사진 (작게 고정) */}
                                <div className="w-24 h-24 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Equipment" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={24} className="text-zinc-300" />
                                    )}
                                </div>

                                {/* 설비 명칭 & 개요 (작은 글씨) */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-1">
                                        {matchedInfo.title || item.label}
                                    </h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-2">
                                        {matchedInfo.meta?.maker || "제조사 정보 없음"} | {matchedInfo.meta?.system || "시스템 미지정"}
                                    </p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                                        {matchedInfo.desc || "설비에 대한 상세 설명이 없습니다."}
                                    </p>
                                </div>
                            </div>

                            {/* 🌟 기술 스펙 (Specs) - 원하시는 유효양정, 유량 등 */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Activity size={12} /> Technical Specs
                                </h4>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 p-3">
                                    {/* matchedInfo.specs가 있으면 그것을, 없으면 meta에서 위치/날짜 뺀 나머지 표시 */}
                                    {matchedInfo.specs ? (
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                            {Object.entries(matchedInfo.specs).map(([key, value]) => (
                                                <div key={key} className="flex justify-between items-center text-sm border-b border-dashed border-zinc-200 dark:border-zinc-700/50 pb-1 last:border-0">
                                                    <span className="text-zinc-500 font-medium capitalize">{key}</span>
                                                    <span className="text-zinc-800 dark:text-zinc-200 font-bold">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // JSON에 specs가 없을 경우의 Fallback (예시 데이터)
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-500 font-medium">정격 출력</span>
                                                <span className="text-zinc-800 dark:text-zinc-200 font-bold">150 kW</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-500 font-medium">유효 양정</span>
                                                <span className="text-zinc-800 dark:text-zinc-200 font-bold">45 m</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-500 font-medium">설계 유량</span>
                                                <span className="text-zinc-800 dark:text-zinc-200 font-bold">320 ㎥/h</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-500 font-medium">회전수</span>
                                                <span className="text-zinc-800 dark:text-zinc-200 font-bold">1750 rpm</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 정비 이력 (History) */}
                            <div>
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Wrench size={12} /> Maintenance History
                                </h4>
                                {matchedInfo.logs && matchedInfo.logs.length > 0 ? (
                                    <div className="space-y-2">
                                        {matchedInfo.logs.map((log, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-2.5 rounded bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:border-indigo-200 transition-colors">
                                                <div className="shrink-0 w-16 text-[11px] font-mono text-zinc-400 pt-0.5">
                                                    {formatDate(log.date)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{log.content}</p>
                                                    <p className="text-[10px] text-zinc-400">작업자: {log.worker || "-"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-dashed border-zinc-200 dark:border-zinc-700">
                                        <span className="text-xs text-zinc-400">최근 정비 이력이 없습니다.</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // 매칭 정보 없음 UI (심플하게)
                        <div className="flex flex-col items-center justify-center py-8 text-center h-full text-zinc-400">
                            <AlertCircle size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">연동된 설비 정보가 없습니다</p>
                            <p className="text-xs mt-1">JSON 데이터의 Title과 설비 라벨을 확인하세요.</p>
                        </div>
                    )}
                </div>

                {/* 3. 푸터 (높이 고정) */}
                <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EquipmentDetailModal;