// Last Updated: 2025-12-25 21:14:54
import React, { useState } from 'react';
import { Layers, MapPin, Activity, ChevronRight, Search, Filter } from 'lucide-react';

const FieldMapContainer = ({ workData }) => {
    const [selectedValve, setSelectedValve] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // 프레임워크 시각화를 위한 내부 구조 (실제 데이터는 props로 받음)
    const displayData = workData?.fieldMaps || [
        {
            building: "본관 발전동",
            floor: "2층",
            sections: [
                {
                    name: "기계실 A구역",
                    valves: [
                        { id: "V-BG-01", name: "메인 냉각수 밸브", location: "입구측 상단 벽면", status: "정상" },
                        { id: "V-BG-02", name: "증기 차단 밸브", location: "펌프 뒤쪽 하단", status: "점검필요" }
                    ]
                }
            ]
        }
    ];

    return (
        <div className="h-full flex gap-6 animate-fade-in">
            {/* [왼쪽] 위치 브라우저: 엑셀의 계층 구조를 나타냄 */}
            <div className="w-72 flex flex-col gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Layers size={18} className="text-indigo-500" />
                        <h3 className="font-bold text-sm tracking-tight">Location</h3>
                    </div>
                    
                    {/* 건물/층 선택 리스트 UI */}
                    <div className="space-y-2">
                        {displayData.map((item, idx) => (
                            <button key={idx} className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 transition-all hover:scale-[1.02]">
                                <div className="text-left">
                                    <p className="text-[10px] font-bold opacity-70 uppercase">{item.building}</p>
                                    <p className="text-sm font-bold">{item.floor}</p>
                                </div>
                                <ChevronRight size={16} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* [중앙] 밸브 그리드: 엑셀의 각 행을 시각적 카드로 변환 */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* 검색 및 필터 바 */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="밸브 이름 또는 ID 검색..." 
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <button className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 hover:text-indigo-500 transition-colors">
                        <Filter size={18} />
                    </button>
                </div>

                {/* 카드 리스트 영역 */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
                    {displayData[0].sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <div className="h-1 w-1 rounded-full bg-indigo-500" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{section.name}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {section.valves.map((valve) => (
                                    <div 
                                        key={valve.id}
                                        onClick={() => setSelectedValve(valve)}
                                        className="group p-5 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 transition-all cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <Activity size={24} />
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                valve.status === '정상' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                {valve.status}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-base mb-1 tracking-tight">{valve.name}</h4>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="truncate">{valve.location}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* [우측] 상세 정보: 밸브 클릭 시 나타나는 슬라이드 패널 */}
            {selectedValve && (
                <div className="w-80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-8 shadow-2xl animate-slide-in-right">
                    <div className="flex justify-between items-start mb-8">
                        <h3 className="font-bold text-xl tracking-tight">Valve Info</h3>
                        <button onClick={() => setSelectedValve(null)} className="text-zinc-400 hover:text-zinc-600">✕</button>
                    </div>
                    {/* 상세 내용 (규격, 조작 매뉴얼 링크 등) */}
                    <div className="space-y-6">
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Target ID</p>
                            <p className="font-mono text-sm">{selectedValve.id}</p>
                        </div>
                        {/* 더 많은 상세 정보 프레임워크... */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldMapContainer;