// Last Updated: 2025-12-25 20:05:28
// src/components/work/FieldMap/FieldMapContainer.jsx
import React, { useState } from 'react';
import PanZoomViewer from '../../ui/PanZoomViewer'; // 기존 컴포넌트 활용
import ValvePin from './ValvePin';
import ValveDetailDrawer from './ValveDetailDrawer';

const FieldMapContainer = ({ mapData }) => {
    const [selectedValve, setSelectedValve] = useState(null);

    // mapData가 없을 경우의 스켈레톤 UI 처리
    if (!mapData) return <div className="h-full flex items-center justify-center text-zinc-400">데이터를 등록해주세요.</div>;

    return (
        <div className="relative h-full w-full flex overflow-hidden animate-fade-in">
            {/* 메인 맵 캔버스 영역 */}
            <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <PanZoomViewer src={mapData.image}>
                    {/* 등록된 밸브들을 지도 위에 매핑 */}
                    {mapData.valves?.map((valve) => (
                        <ValvePin 
                            key={valve.id} 
                            valve={valve} 
                            onClick={() => setSelectedValve(valve)} 
                        />
                    ))}
                </PanZoomViewer>
            </div>

            {/* 우측 상세 정보 패널 (Drawer 형식) */}
            <ValveDetailDrawer 
                valve={selectedValve} 
                onClose={() => setSelectedValve(null)} 
            />
        </div>
    );
};

export default FieldMapContainer;