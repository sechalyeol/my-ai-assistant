// Last Updated: 2025-12-17 03:30:09
// src/components/ui/PanZoomViewer.jsx
import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize, Image } from 'lucide-react';

const PanZoomViewer = ({ src, alt }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const handleWheel = (e) => {
        e.preventDefault();
        const scaleAdjustment = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.5, scale + scaleAdjustment), 4);
        setScale(newScale);
    };

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
                onWheel={handleWheel}
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
                        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: isDragging ? 'none' : 'transform 0.1s' }}
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
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 text-white hover:bg-white/20 rounded"><ZoomOut size={16} /></button>
                <span className="text-xs text-white font-mono flex items-center min-w-[40px] justify-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-1.5 text-white hover:bg-white/20 rounded"><ZoomIn size={16} /></button>
                <div className="w-px bg-white/20 mx-1"></div>
                <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="p-1.5 text-white hover:bg-white/20 rounded" title="초기화"><Maximize size={16} /></button>
            </div>
        </div>
    );
};

export default PanZoomViewer;