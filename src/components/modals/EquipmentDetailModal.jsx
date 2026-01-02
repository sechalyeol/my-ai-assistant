// Last Updated: 2026-01-03 01:53:17
import React from 'react';
import { X, FileText, Activity, MapPin, Calendar, Settings, Image as ImageIcon } from 'lucide-react';

const EquipmentDetailModal = ({ isOpen, onClose, item, matchedInfo }) => {
    if (!isOpen || !item) return null;

    // 설비 상태에 따른 뱃지 색상
    const getStatusColor = (status) => {
        switch (status) {
            case 'NORMAL': return 'bg-green-100 text-green-700 border-green-200';
            case 'WARNING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'ERROR': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    // 이미지 경로 처리 (matchedInfo에 이미지가 없으면 기본 플레이스홀더 사용)
    const imageUrl = matchedInfo?.image || matchedInfo?.fieldGuides?.[0]?.attachments?.[0]?.path || null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 flex flex-col max-h-[85vh]">
                
                {/* 1. 헤더 (이미지 영역 포함) */}
                <div className="relative h-48 bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt="Equipment" 
                            className="w-full h-full object-cover"
                            onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}} 
                        />
                    ) : null}
                    
                    {/* 이미지가 없거나 로드 실패시 표시될 fallback */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400" style={{display: imageUrl ? 'none' : 'flex'}}>
                        <ImageIcon size={48} className="mb-2 opacity-50" />
                        <span className="text-sm font-medium">설비 이미지가 등록되지 않았습니다</span>
                    </div>

                    {/* 닫기 버튼 */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>

                    {/* 타이틀 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{item.label || "Unnamed Equipment"}</h2>
                                <p className="text-zinc-300 text-sm flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-xs font-mono border border-white/10">
                                        ID: {item.id}
                                    </span>
                                    <span className="text-zinc-400">|</span>
                                    <span>{matchedInfo?.title || item.type}</span>
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status || 'NORMAL')}`}>
                                {item.status || 'NORMAL'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. 컨텐츠 영역 (스크롤 가능) */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {/* 기본 스펙 정보 그리드 */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <Settings size={14} />
                                <span className="text-xs font-bold">제조사 (Maker)</span>
                            </div>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {matchedInfo?.meta?.maker || "정보 없음"}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <Activity size={14} />
                                <span className="text-xs font-bold">시스템 (System)</span>
                            </div>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {matchedInfo?.meta?.system || "미지정 계통"}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <Calendar size={14} />
                                <span className="text-xs font-bold">설치일 (Install Date)</span>
                            </div>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {matchedInfo?.meta?.installDate || "날짜 정보 없음"}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                <MapPin size={14} />
                                <span className="text-xs font-bold">위치 (Location)</span>
                            </div>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                {matchedInfo?.meta?.location || "현장"}
                            </p>
                        </div>
                    </div>

                    {/* 상세 설명 / 가이드 */}
                    {matchedInfo?.desc && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-500" />
                                설비 개요
                            </h3>
                            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                                {matchedInfo.desc}
                            </div>
                        </div>
                    )}

                    {/* 관련 문서/가이드 연결 (예시 데이터가 있을 경우) */}
                    {matchedInfo?.fieldGuides?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-2">관련 운전 가이드</h3>
                            <div className="space-y-2">
                                {matchedInfo.fieldGuides.map((guide, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer group">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 shrink-0 flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 transition-colors">
                                                {guide.title}
                                            </p>
                                            <p className="text-xs text-zinc-500 line-clamp-1">{guide.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. 하단 액션 버튼 */}
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-2 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
                    >
                        닫기
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                        상세 이력 보기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EquipmentDetailModal;