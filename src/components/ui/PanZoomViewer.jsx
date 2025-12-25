// Last Updated: 2025-12-25 20:05:28
// src/components/ui/PanZoomViewer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Image } from 'lucide-react';

const PanZoomViewer = ({ src, alt, initialScale = 1 }) => {
    const [scale, setScale] = useState(initialScale);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // 1. 초기화 로직
    useEffect(() => {
        setScale(initialScale);
        setPosition({ x: 0, y: 0 });
    }, [initialScale, src]);

    // 🌟 2. [수정됨] 휠 이벤트 직접 연결 (passive: false 적용)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault(); // 이제 에러 없이 작동합니다!
            e.stopPropagation();

            const scaleAdjustment = -e.deltaY * 0.001;
            // 최소 축소 비율을 0.5(50%)에서 0.1(10%)로 낮춤
            const newScale = Math.min(Math.max(0.1, scale + scaleAdjustment), 4);
            
            // state 업데이트 (함수형 업데이트 사용 권장)
            setScale(prevScale => {
                const nextScale = Math.min(Math.max(0.1, prevScale + scaleAdjustment), 4);
                return nextScale;
            });
        };

        // passive: false 옵션을 주어 preventDefault()가 먹히도록 함
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []); // 빈 배열: 마운트 시 한 번만 연결

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => { setIsDragging(false); };

    return (
        <div className="relative w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl group">
            <div
                ref={containerRef}
                // onWheel={handleWheel}  <-- 🌟 삭제됨 (useEffect에서 처리)
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full flex items-center justify-center cursor-move"
            >
                {src ? (
                    <img
                        src={src}
                        alt={alt}
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
                            transition: isDragging ? 'none' : 'transform 0.1s linear' // 줌 반응 속도 개선
                        }}
                        className="max-w-none max-h-none pointer-events-none select-none"
                        draggable={false}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                        <Image size={48} className="opacity-20 mb-2" />
                        <span className="text-sm">도면 파일이 없습니다.</span>
                    </div>
                )}
            </div>

            {/* 컨트롤러 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="p-1.5 text-white hover:bg-white/20 rounded"><ZoomOut size={16} /></button>
                <span className="text-xs text-white font-mono flex items-center min-w-[40px] justify-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-1.5 text-white hover:bg-white/20 rounded"><ZoomIn size={16} /></button>
                <div className="w-px bg-white/20 mx-1"></div>
                <button onClick={() => { setScale(initialScale); setPosition({ x: 0, y: 0 }); }} className="p-1.5 text-white hover:bg-white/20 rounded" title="초기화"><Maximize size={16} /></button>
            </div>
        </div>
    );
};

export default PanZoomViewer;