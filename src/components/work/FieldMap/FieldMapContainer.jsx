// Last Updated: 2025-12-30 14:52:43
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Environment, Line, Circle } from '@react-three/drei';
import {
    Database, LayoutTemplate, MousePointer2, Edit3,
    Save, X, Search, ChevronRight, ChevronDown,
    Trash2, Plus, Building, Layers, Check, Eye
} from 'lucide-react';
import * as THREE from 'three';

// 🌟 [New] 실행 취소/다시 실행을 위한 커스텀 훅
const useUndoRedo = (initialState) => {
    const [past, setPast] = useState([]);
    const [present, setPresent] = useState(initialState);
    const [future, setFuture] = useState([]);

    const set = (newState) => {
        setPast((prev) => [...prev, present]);
        setPresent(newState);
        setFuture([]);
    };

    const undo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        setFuture((prev) => [present, ...prev]);
        setPresent(previous);
        setPast(newPast);
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        setPast((prev) => [...prev, present]);
        setPresent(next);
        setFuture(newFuture);
    };

    return [present, set, undo, redo];
};


// -----------------------------------------------------------------------------
// 🏢 데이터 정의
// -----------------------------------------------------------------------------
const BUILDING_STRUCTURE = [
    { id: 'STEAM', name: '스팀터빈동', floors: ['B1', '1F', '2F', '3F'] },
    { id: 'DH', name: '지역난방설비동', floors: ['1F', '2F'] },
    { id: 'HRSG', name: '배열회수보일러동', floors: ['1F', '2F', 'RF'] }
];

const TOOL_HIERARCHY = [
    {
        id: 'EQUIPMENT',
        label: '설비',
        icon: Database,
        children: [
            {
                label: '밸브',
                hasSubMenu: true,
                children: [
                    { label: '전동식 버터플라이 밸브', type: 'VALVE_MOV' },
                    { label: '공압식 버터플라이 밸브', type: 'VALVE_BUTTERFLY_PNEUMATIC' },
                    { label: '다이어프램 밸브', type: 'VALVE_MULTI_SPRING' },
                    { label: '복동식 밸브', type: 'VALVE_DOUBLE_ACTING' },
                    { label: '유압식 밸브', type: 'VALVE_HYDRAULIC' }
                ]
            },
            { label: '팬', hasSubMenu: true, children: [{ label: '원심형', type: 'FAN_CENTRIFUGAL' }] },
            { label: '필터', hasSubMenu: true, children: [{ label: '차압 필터', type: 'FILTER_DP' }] },
            { label: '탱크', hasSubMenu: true, children: [{ label: '원통형 탱크', type: 'TANK_VERTICAL' }, { label: '사각형 탱크', type: 'TANK_SQUARE' }] },
            { label: '펌프', hasSubMenu: true, children: [{ label: '수평형', type: 'PUMP_HORIZ' }, { label: '수직형', type: 'PUMP_VERT' }] },
            { label: '전기 설비', hasSubMenu: true, children: [{ label: '제어반', type: 'LCP' }, { label: 'GCB & IPB', type: 'ELEC_GCB_SYSTEM' }] },
            { label: '열교환기', hasSubMenu: true, children: [{ label: '판형', type: 'HX_PLATE' }, { label: '쉘앤튜브', type: 'HX_SHELL' }, { label: '드레인 쿨러', type: 'HX_DRAIN_COOLER' }] }
        ]
    },
    {
        id: 'STRUCTURE',
        label: '구조물',
        icon: LayoutTemplate,
        children: [
            { label: '출입문', type: 'DOOR' },
            { label: '방화 셔터', type: 'FIRE_SHUTTER' },
            { label: '계단', type: 'STAIRS' },
            { label: '사다리', type: 'LADDER' },
            { label: '그레이팅', type: 'STEEL_GRATING' }
        ]
    }
];

// 🌟 [핵심 수정] 설비 타입으로 카테고리 찾기 (스마트 분류 로직 추가)
// 메뉴에 없는 구형 타입(VALVE_GATE 등)도 이름으로 유추해서 올바른 카테고리에 매칭시킵니다.
const getCategoryByType = (type) => {
    if (!type) return '기타';

    // 1. 메뉴 계층구조에서 정확히 일치하는 것 찾기 (우선순위 1)
    const equipGroup = TOOL_HIERARCHY.find(g => g.id === 'EQUIPMENT');
    if (equipGroup) {
        for (const cat of equipGroup.children) {
            if (cat.type === type) return cat.label;
            if (cat.children && cat.children.some(c => c.type === type)) return cat.label;
        }
    }

    // 2. 메뉴에 없더라도 이름으로 추측하여 분류 (우선순위 2 - Fallback)
    // 이게 있어야 '밸브' 체크박스를 켰을 때 VALVE_GATE 같은 구형 설비도 같이 켜집니다.
    if (type.includes('VALVE')) return '밸브';
    if (type.includes('PUMP')) return '펌프';
    if (type.includes('TANK')) return '탱크';
    if (type.includes('FAN')) return '팬';
    if (type.includes('FILTER')) return '필터';
    if (type.includes('HX')) return '열교환기';
    if (type.includes('ELEC') || type.includes('LCP')) return '전기 설비';

    return '기타';
};
// -----------------------------------------------------------------------------
// 🏭 3D Components & Logic
// -----------------------------------------------------------------------------

// 🌟 [복구됨] Label 컴포넌트 (이게 없어서 에러가 났었습니다)
const Label = ({ text, selected, hovered, height, forceShow }) => {
    if (!text || text.trim() === "") return null;
    const isVisible = selected || hovered || forceShow;
    if (!isVisible) return null;

    return (
        <Html position={[0, height + 0.5, 0]} center zIndexRange={[100, 0]}>
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap shadow-sm backdrop-blur-sm pointer-events-none select-none
                ${selected ? 'bg-indigo-600 text-white border-indigo-400 scale-110 z-50' : 
                  forceShow ? 'bg-indigo-900/80 text-white border-indigo-500/50 z-20' : 
                  'bg-black/70 text-white border-white/20 z-10'}`}>
                {text}
            </div>
        </Html>
    );
};

// 🌟 라벨 필터 패널
const LabelFilterPanel = ({ categories, visibleState, onToggle }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg flex flex-col w-48 transition-all animate-fade-in-left">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between p-3 w-full text-left border-b border-zinc-100 dark:border-zinc-800"
            >
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    <Eye size={14} className="text-indigo-500" />
                    라벨 보기 설정
                </div>
                <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => onToggle(cat)}
                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors
                                ${visibleState[cat] 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors
                                ${visibleState[cat] ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                {visibleState[cat] && <Check size={10} className="text-white" />}
                            </div>
                            {cat}
                        </button>
                    ))}
                    {categories.length === 0 && (
                        <div className="text-center py-2 text-xs text-zinc-400">표시할 설비가 없습니다</div>
                    )}
                </div>
            )}
        </div>
    );
};

const InteractiveObject = ({ Component, itemId, isEditMode, interactionMode, onUpdate, onDragStart, onDragEnd, onClick, isSelected, showLabel, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
    const vec = useMemo(() => new THREE.Vector3(), []);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const isDragProcess = useRef(false);

    const handlePointerDown = (e) => {
        if (!isEditMode) return;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        isDragProcess.current = false;

        if (interactionMode === 'MOVE') {
            e.stopPropagation();
            e.target.setPointerCapture(e.pointerId);
            plane.constant = -props.position[1];
            setIsDragging(true);
            if (onDragStart) onDragStart();
        }
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            e.stopPropagation();
            setIsDragging(false);
            e.target.releasePointerCapture(e.pointerId);
            if (onDragEnd) onDragEnd();
        }
    };

    const handlePointerMove = (e) => {
        if (!isDragging || !isEditMode || interactionMode !== 'MOVE') return;
        isDragProcess.current = true;
        e.stopPropagation();
        e.ray.intersectPlane(plane, vec);
        const x = Math.round(vec.x * 2) / 2;
        const z = Math.round(vec.z * 2) / 2;
        if (props.position[0] !== x || props.position[2] !== z) {
            onUpdate(itemId, x, z);
        }
    };

    const handleClick = (e) => {
        if (isEditMode && interactionMode === 'MOVE' && isDragProcess.current) return;
        e.stopPropagation();
        if (onClick) onClick(e);
    };

    useEffect(() => {
        if (!isEditMode) { document.body.style.cursor = 'auto'; return; }
        if (isHovered) { document.body.style.cursor = interactionMode === 'MOVE' ? 'move' : 'pointer'; }
        else { document.body.style.cursor = 'auto'; }
        return () => { document.body.style.cursor = 'auto'; };
    }, [isHovered, isEditMode, interactionMode]);

    const isUnderground = props.position[1] < 0;
    const groundLevelY = -props.position[1];

    return (
        <group>
            <Component
                {...props}
                isSelected={isSelected}
                isHovered={isHovered}
                showLabel={showLabel}
                onHoverChange={setIsHovered}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
                onClick={handleClick}
            />
            {isUnderground && (
                <group position={props.position}>
                    <Line
                        points={[[0, 0, 0], [0, groundLevelY, 0]]}
                        color={isSelected ? "#4f46e5" : "#ef4444"}
                        lineWidth={1}
                        dashed={true}
                        dashScale={2}
                        dashSize={0.2}
                        gapSize={0.1}
                    />
                    <group position={[0, groundLevelY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <Circle args={[0.3, 16]}>
                            <meshBasicMaterial color={isSelected ? "#4f46e5" : "#ef4444"} transparent opacity={0.3} />
                        </Circle>
                        <Circle args={[0.35, 16]}>
                            <meshBasicMaterial color={isSelected ? "#4f46e5" : "#ef4444"} wireframe />
                        </Circle>
                    </group>
                </group>
            )}
        </group>
    );
};

// --- 3D 모델 컴포넌트들 ---
const LocalControlPanel = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, scale = 1, showLabel, ...props }) => {
    const width = 1.0;
    const height = 1.8;
    const depth = 0.4;
    const legHeight = 0.2;
    const cabinetColor = "#94a3b8";
    const totalHeight = height + legHeight;

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, legHeight + height / 2, 0]}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={cabinetColor} metalness={0.3} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0, depth / 2 + 0.005]}>
                    <planeGeometry args={[width - 0.04, height - 0.04]} />
                    <meshStandardMaterial color={cabinetColor} metalness={0.3} roughness={0.4} />
                </mesh>
            </group>
            <group position={[0, legHeight + height * 0.75, depth / 2 + 0.02]}>
                <mesh position={[0, 0, -0.01]}><boxGeometry args={[0.9, 0.35, 0.02]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                {[-0.3, 0, 0.3].map((x, i) => (
                    <group key={i} position={[x, 0, 0.01]}>
                        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 32]} /><meshStandardMaterial color="#1e293b" /></mesh>
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02, 32]} /><meshBasicMaterial color="#ffffff" /></mesh>
                        <mesh rotation={[0, 0, -Math.PI / 4 + (i * 0.5)]} position={[0, 0, 0.022]}><boxGeometry args={[0.005, 0.08, 0.005]} /><meshBasicMaterial color="#dc2626" /></mesh>
                        <mesh position={[0, -0.15, 0]}><planeGeometry args={[0.05, 0.03]} /><meshBasicMaterial color="#000000" /></mesh>
                    </group>
                ))}
            </group>
            <group position={[0, legHeight + height * 0.45, depth / 2 + 0.02]}>
                <group position={[0, 0.15, 0]}>
                    <mesh position={[-0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} /></mesh>
                    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} /></mesh>
                    <mesh position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.6} /></mesh>
                </group>
                <group position={[0, -0.15, 0]}>
                    <mesh position={[-0.25, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.04]} /><meshStandardMaterial color="#15803d" /></mesh>
                    <mesh position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.04]} /><meshStandardMaterial color="#b91c1c" /></mesh>
                    <group position={[0.2, 0, 0]}>
                        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.02]} /><meshStandardMaterial color="#334155" /></mesh>
                        <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.02, 0.08, 0.02]} /><meshStandardMaterial color="#0f172a" /></mesh>
                    </group>
                </group>
            </group>
            <group position={[0, legHeight + height * 0.2, depth / 2 + 0.01]}>
                <mesh><planeGeometry args={[0.6, 0.15]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
                <mesh position={[0, 0, 0.001]}><planeGeometry args={[0.4, 0.02]} /><meshBasicMaterial color="#000000" /></mesh>
            </group>
            <group position={[0, legHeight / 2, 0]}>
                <mesh position={[width / 2 - 0.05, 0, depth / 2 - 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
                <mesh position={[-width / 2 + 0.05, 0, depth / 2 - 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
                <mesh position={[width / 2 - 0.05, 0, -depth / 2 + 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
                <mesh position={[-width / 2 + 0.05, 0, -depth / 2 + 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
            </group>
            <mesh position={[0, totalHeight / 2, 0]}>
                <boxGeometry args={[width, totalHeight, depth]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={totalHeight + 0.2} />
        </group>
    );
};

const SteelGrating = ({ position, rotation, onClick, isSelected, isHovered, onHoverChange, scale = 1, ...props }) => {
    const texture = useMemo(() => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 64, 64);
        ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(32, 64); ctx.moveTo(0, 32); ctx.lineTo(64, 32); ctx.stroke();
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t;
    }, []);
    useEffect(() => { texture.repeat.set(scale * 4, scale * 4); }, [scale, texture]);

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, 1, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <mesh position={[0, 0.05, 0]} castShadow receiveShadow><boxGeometry args={[4, 0.1, 4]} /><meshStandardMaterial color="#334155" /></mesh>
            <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3.8, 3.8]} /><meshStandardMaterial map={texture} transparent={true} alphaTest={0.1} side={THREE.DoubleSide} metalness={0.8} roughness={0.2} /></mesh>
            {/* 히트박스 */}
            <mesh position={[0, 0.1, 0]}><boxGeometry args={[4, 0.5, 4]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>

            {/* 🌟 [삭제됨] 구조물이라 명칭 라벨 불필요 */}
            {/* <Label text={label} ... /> */}
        </group>
    );
};

const PneumaticButterflyValve = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const bodyColor = "#94a3b8";
    const discColor = "#334155";
    const actuatorColor = "#f59e0b";
    const capColor = "#1e293b";
    const solenoidColor = "#0f172a";

    const renderBolts = (count, radius) => Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[Math.cos(i / count * Math.PI * 2) * radius, 0, Math.sin(i / count * Math.PI * 2) * radius]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12]} /><meshStandardMaterial color="#333" />
        </mesh>
    ));

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group rotation={[0, 0, Math.PI / 2]}>
                <mesh castShadow receiveShadow><cylinderGeometry args={[0.25, 0.25, 0.1, 32]} /><meshStandardMaterial color={bodyColor} /></mesh>
                <mesh rotation={[0, Math.PI / 6, 0]}><cylinderGeometry args={[0.23, 0.23, 0.02, 32]} /><meshStandardMaterial color={discColor} /></mesh>
                {renderBolts(4, 0.2)}
            </group>
            <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6]} /><meshStandardMaterial color={bodyColor} /></mesh>
            <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.15, 0.1, 0.15]} /><meshStandardMaterial color={bodyColor} /></mesh>
            <group position={[0, 0.65, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.18, 0.18, 0.8, 32]} /><meshStandardMaterial color={actuatorColor} metalness={0.3} roughness={0.4} /></mesh>
                <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.05, 32]} /><meshStandardMaterial color={capColor} /></mesh>
                <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.05, 32]} /><meshStandardMaterial color={capColor} /></mesh>
                <group position={[0, 0.2, 0]}>
                    <mesh><boxGeometry args={[0.1, 0.05, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
                    <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.04, 0.04, 0.05]} /><meshStandardMaterial color="#ef4444" /></mesh>
                    <mesh position={[0, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[0.01, 0.06, 0.08]} /><meshStandardMaterial color="#yellow" /></mesh>
                </group>
                <group position={[0, -0.1, 0.2]}>
                    <mesh><boxGeometry args={[0.3, 0.15, 0.1]} /><meshStandardMaterial color={solenoidColor} /></mesh>
                    <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 0.15]} /><meshStandardMaterial color="#111" /></mesh>
                    <mesh position={[-0.05, -0.1, 0]}><cylinderGeometry args={[0.02, 0.02, 0.1]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                    <mesh position={[0.05, -0.1, 0]}><cylinderGeometry args={[0.02, 0.02, 0.1]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                </group>
            </group>
            <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.0, 1.2, 0.6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={1.4} />
        </group>
    );
};

// 🌟 [Cleaned] ValvePin (불필요한 수동/버터플라이 로직 제거)
const ValvePin = ({ position, rotation, type, label, status, onClick, isSelected, isHovered, onHoverChange, scale = 1, showLabel, ...props }) => {
    // 타입 판별
    const isMOV = type === 'VALVE_MOV';
    const isMultiSpring = type === 'VALVE_MULTI_SPRING';
    const isDoubleActing = type === 'VALVE_DOUBLE_ACTING';
    const isHydraulic = type === 'VALVE_HYDRAULIC';

    // 색상 정의
    const castIron = "#334155";
    const flangeColor = "#475569";
    const boltColor = "#cbd5e1";
    const stemColor = "#e2e8f0";
    const yokeColor = "#1e293b";
    const tubeColor = "#d97706";

    const diaphragmGreen = "#059669";
    const cylinderBlack = "#0f172a";
    const hydraulicRed = "#dc2626";
    const wheelBlue = "#1d4ed8";

    // 헬퍼: 육각 볼트
    const renderBolts = (count, radius, yPos, axis = 'y') => {
        return Array.from({ length: count }).map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            let pos = [x, yPos, z];
            let rot = [0, 0, 0];
            if (axis === 'x') { pos = [yPos, x, z]; rot = [0, 0, Math.PI / 2]; }
            else if (axis === 'z') { pos = [x, z, yPos]; rot = [Math.PI / 2, 0, 0]; }
            return (
                <mesh key={i} position={pos} rotation={rot}>
                    <cylinderGeometry args={[0.015, 0.015, 0.03, 6]} />
                    <meshStandardMaterial color={boltColor} />
                </mesh>
            );
        });
    };

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>

            {/* PART 1: VALVE BODY (Globe Type Body for all included types) */}
            <group position={[0, 0.5, 0]}>
                <mesh castShadow><sphereGeometry args={[0.3, 32, 32]} /><meshStandardMaterial color={castIron} /></mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.9]} /><meshStandardMaterial color={castIron} /></mesh>
                <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.2, 0.25, 0.2]} /><meshStandardMaterial color={castIron} /></mesh>
                <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.26, 0.26, 0.05]} /><meshStandardMaterial color={flangeColor} /></mesh>
                <group position={[0, 0.4, 0]}>{renderBolts(8, 0.22, 0, 'y')}</group>
                <group position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <mesh><cylinderGeometry args={[0.38, 0.38, 0.08]} /><meshStandardMaterial color={flangeColor} /></mesh>
                    <group position={[0, 0.045, 0]}>{renderBolts(8, 0.3, 0, 'y')}</group>
                </group>
                <group position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <mesh><cylinderGeometry args={[0.38, 0.38, 0.08]} /><meshStandardMaterial color={flangeColor} /></mesh>
                    <group position={[0, 0.045, 0]}>{renderBolts(8, 0.3, 0, 'y')}</group>
                </group>
            </group>

            {/* PART 2: ACTUATOR */}
            {/* A. 컨트롤 밸브 (MultiSpring / DoubleActing) */}
            {(isMultiSpring || isDoubleActing) && (
                <group position={[0, 0.9, 0]}>
                    <group position={[0, -0.2, 0]}>
                        <mesh position={[-0.07, 0.25, 0]}><boxGeometry args={[0.03, 0.5, 0.04]} /><meshStandardMaterial color={yokeColor} /></mesh>
                        <mesh position={[0.07, 0.25, 0]}><boxGeometry args={[0.03, 0.5, 0.04]} /><meshStandardMaterial color={yokeColor} /></mesh>
                        <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.05, 6]} /><meshStandardMaterial color="#eab308" /></mesh>
                        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.025, 0.025, 0.6]} /><meshStandardMaterial color={stemColor} /></mesh>
                        <mesh position={[0, 0.25, 0.03]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshStandardMaterial color="#ef4444" /></mesh>
                    </group>
                    <group position={[0.22, -0.1, 0]}>
                        <mesh castShadow><boxGeometry args={[0.15, 0.22, 0.12]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                        <mesh position={[0, 0.05, 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.02]} /><meshStandardMaterial color="#fff" /></mesh>
                        <mesh position={[-0.1, 0.1, 0]} rotation={[0, 0, -Math.PI / 4]}><cylinderGeometry args={[0.008, 0.008, 0.25]} /><meshStandardMaterial color={tubeColor} /></mesh>
                    </group>
                    {isMultiSpring && (
                        <group position={[0, 0.4, 0]}>
                            <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.42, 0.15, 0.2]} /><meshStandardMaterial color={diaphragmGreen} /></mesh>
                            <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.42, 0.42, 0.2]} /><meshStandardMaterial color={diaphragmGreen} /></mesh>
                            <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={diaphragmGreen} /></mesh>
                            <group position={[0, 0.1, 0]}>{renderBolts(10, 0.39, 0, 'y')}</group>
                            <group position={[0, 0.6, 0]}>
                                <mesh><cylinderGeometry args={[0.03, 0.03, 0.2]} /><meshStandardMaterial color={stemColor} /></mesh>
                                <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.12, 0.02, 8, 16]} /><meshStandardMaterial color={wheelBlue} /></mesh>
                            </group>
                        </group>
                    )}
                    {isDoubleActing && (
                        <group position={[0, 0.5, 0]}>
                            <mesh castShadow><cylinderGeometry args={[0.28, 0.28, 0.6, 32]} /><meshStandardMaterial color={cylinderBlack} /></mesh>
                            <mesh position={[0, 0.31, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04]} /><meshStandardMaterial color="#111" /></mesh>
                            <mesh position={[0, -0.31, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04]} /><meshStandardMaterial color="#111" /></mesh>
                            <group position={[0, 0, 0]}>{renderBolts(4, 0.25, 0, 'y')}</group>
                        </group>
                    )}
                </group>
            )}

            {/* B. MOV (Limitorque) */}
            {isMOV && (
                <group position={[0, 0.95, 0]}>
                    <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.4, 0.3, 0.3]} /><meshStandardMaterial color={yokeColor} /></mesh>
                    <group position={[0.3, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <mesh><cylinderGeometry args={[0.14, 0.14, 0.4]} /><meshStandardMaterial color="#475569" /></mesh>
                        {[...Array(5)].map((_, i) => <mesh key={i} position={[0, -0.15 + i * 0.07, 0]}><cylinderGeometry args={[0.15, 0.15, 0.02]} /><meshStandardMaterial color="#475569" /></mesh>)}
                    </group>
                    <group position={[0, 0.1, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
                        <mesh><torusGeometry args={[0.18, 0.02, 8, 16]} /><meshStandardMaterial color="#b91c1c" /></mesh>
                    </group>
                    <mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                </group>
            )}

            {/* C. 유압식 */}
            {isHydraulic && (
                <group position={[0, 0.9, 0]}>
                    <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.12, 0.15, 0.4]} /><meshStandardMaterial color={yokeColor} /></mesh>
                    <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 1.0]} /><meshStandardMaterial color={hydraulicRed} /></mesh>
                    <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.18, 0.18, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
                    <group position={[0.25, 0.3, 0]}>
                        <mesh><cylinderGeometry args={[0.12, 0.12, 0.6]} /><meshStandardMaterial color="#333" /></mesh>
                        <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.12]} /><meshStandardMaterial color="#333" /></mesh>
                        <mesh position={[-0.15, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                    </group>
                </group>
            )}

            <mesh position={[0, 0.8, 0]}><boxGeometry args={[1.0, 2.0, 1.0]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={2.5} />
        </group>
    );
};

// 3. 사다리 (라벨 제거)
const VerticalLadder = ({ position, rotation, onClick, isSelected, isHovered, onHoverChange, scale = 1, ...props }) => {
    const HEIGHT = 5; const WIDTH = 0.8; const STEPS = 15; const RUNG_SPACING = HEIGHT / STEPS;
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, HEIGHT / 2, 0]}>
                <mesh position={[-WIDTH / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, HEIGHT]} /><meshStandardMaterial color="#475569" /></mesh>
                <mesh position={[WIDTH / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, HEIGHT]} /><meshStandardMaterial color="#475569" /></mesh>
                {Array.from({ length: STEPS }).map((_, i) => (<mesh key={i} position={[0, (i - STEPS / 2) * RUNG_SPACING, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, WIDTH]} /><meshStandardMaterial color="#cbd5e1" /></mesh>))}
                <mesh position={[0, HEIGHT / 2 - 0.5, -0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6]} /><meshStandardMaterial color="#334155" /></mesh>
                <mesh position={[0, -HEIGHT / 2 + 0.5, -0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6]} /><meshStandardMaterial color="#334155" /></mesh>
            </group>
            <group position={[0, HEIGHT - 1.5, 0.5]}>
                {[0, 0.8, 1.6].map((y, i) => (<group key={i} position={[0, y, 0]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.03, 8, 24, Math.PI]} /><meshStandardMaterial color="#f59e0b" /></mesh><mesh position={[-0.5, 0.4, 0]}><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#f59e0b" /></mesh><mesh position={[0.5, 0.4, 0]}><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#f59e0b" /></mesh><mesh position={[0, 0.4, 0.5]}><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#f59e0b" /></mesh></group>))}
            </group>
            <mesh position={[0, HEIGHT / 2, 0.2]}><boxGeometry args={[WIDTH + 0.6, HEIGHT, 1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>

            {/* 🌟 [삭제됨] 라벨 제거 */}
        </group>
    );
};

// 3. 계단 (오류 발생했던 부분 -> 라벨 제거 완료)
const Stairs = ({ position, rotation, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
    const STEPS = 12; const WIDTH = 3; const STEP_HEIGHT = 0.5; const STEP_DEPTH = 0.8; const LANDING_STEP = 6;
    const steps = useMemo(() => {
        const items = []; let currentY = 0; let currentZ = 0;
        for (let i = 0; i < STEPS; i++) {
            if (i === LANDING_STEP) {
                items.push(<group key={`landing-${i}`} position={[0, currentY, currentZ + 1]}><mesh position={[0, 0, 0]} receiveShadow castShadow><boxGeometry args={[WIDTH, 0.2, 3]} /><meshStandardMaterial color="#475569" roughness={0.6} /></mesh><mesh position={[WIDTH / 2 - 0.1, 1.5, 0]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#f59e0b" /></mesh><mesh position={[-WIDTH / 2 + 0.1, 1.5, 0]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#f59e0b" /></mesh></group>);
                currentZ += 3;
            }
            items.push(<group key={`step-${i}`} position={[0, currentY, currentZ]}><mesh position={[0, 0, 0]} receiveShadow castShadow><boxGeometry args={[WIDTH, 0.1, STEP_DEPTH]} /><meshStandardMaterial color="#334155" metalness={0.5} /></mesh><mesh position={[WIDTH / 2, -STEP_HEIGHT / 2, 0]}><boxGeometry args={[0.1, STEP_HEIGHT, STEP_DEPTH]} /><meshStandardMaterial color="#1e293b" /></mesh><mesh position={[-WIDTH / 2, -STEP_HEIGHT / 2, 0]}><boxGeometry args={[0.1, STEP_HEIGHT, STEP_DEPTH]} /><meshStandardMaterial color="#1e293b" /></mesh></group>);
            currentY += STEP_HEIGHT; currentZ += STEP_DEPTH;
        }
        return items;
    }, []);
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, STEP_HEIGHT / 2, 0]}>{steps}</group>
            <mesh position={[0, STEPS * STEP_HEIGHT / 2, STEPS * STEP_DEPTH / 2]} rotation={[0.5, 0, 0]}><boxGeometry args={[WIDTH + 1, STEPS * STEP_HEIGHT * 2, STEPS * STEP_DEPTH + 2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            {/* 🌟 [삭제됨] Label 컴포넌트 삭제로 오류 해결 */}
        </group>
    );
};

// 4. 출입문 (라벨 제거 완료)
const SecurityDoor = ({ position, rotation, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
    const WIDTH = 4.0; const HEIGHT = 6.0; const THICKNESS = 0.25; const FRAME_THICK = 0.4;
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, HEIGHT / 2, 0]}>
                <mesh position={[0, HEIGHT / 2, 0]} castShadow><boxGeometry args={[WIDTH + FRAME_THICK * 2, FRAME_THICK, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
                <mesh position={[-(WIDTH + FRAME_THICK) / 2, 0, 0]} castShadow><boxGeometry args={[FRAME_THICK, HEIGHT, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
                <mesh position={[(WIDTH + FRAME_THICK) / 2, 0, 0]} castShadow><boxGeometry args={[FRAME_THICK, HEIGHT, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
            </group>
            <group position={[0, HEIGHT / 2, 0]}>
                <mesh castShadow receiveShadow><boxGeometry args={[WIDTH, HEIGHT, THICKNESS]} /><meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.7} /></mesh>
                <mesh position={[0, 1.2, 0]}><boxGeometry args={[2.0, 2.0, THICKNESS + 0.05]} /><meshStandardMaterial color="#93c5fd" transparent opacity={0.6} /></mesh>
                <mesh position={[1.6, -0.3, 0.2]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh>
            </group>
            <group position={[WIDTH / 2 + 1.0, 3.5, 0.1]}><mesh><boxGeometry args={[0.5, 0.8, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh><mesh position={[0, 0.25, 0.06]}><circleGeometry args={[0.08, 16]} /><meshBasicMaterial color="#3b82f6" toneMapped={false} /></mesh></group>
            <group position={[0, HEIGHT + 0.8, 0.1]}><mesh><boxGeometry args={[2.0, 0.6, 0.1]} /><meshStandardMaterial color="#14532d" /></mesh><mesh position={[0, 0.1, 0.06]}><planeGeometry args={[1.7, 0.35]} /><meshBasicMaterial color="#22c55e" toneMapped={false} /></mesh></group>
            <mesh position={[0, HEIGHT / 2, 0]}><boxGeometry args={[WIDTH + 2, HEIGHT, 2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            {/* Label 컴포넌트 삭제됨 */}
        </group>
    );
};

// 5. 방화셔터 (라벨 제거 완료)
const FireShutter = ({ position, rotation, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
    const OPEN_W = 12.0; const OPEN_H = 10.0; const BOX_H = 1.5; const RAIL_W = 0.8; const DEPTH = 1.0;
    const shutterTexture = useMemo(() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128; const ctx = c.getContext('2d');
        ctx.fillStyle = '#64748b'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#334155';
        for (let i = 0; i < 128; i += 16) { ctx.fillRect(0, i, 128, 4); }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(OPEN_W / 2, OPEN_H / 2); return t;
    }, []);
    const totalHeight = OPEN_H + BOX_H;
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, OPEN_H + BOX_H / 2, 0]}><mesh castShadow receiveShadow><boxGeometry args={[OPEN_W + RAIL_W * 2 + 0.5, BOX_H, DEPTH + 0.2]} /><meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} /></mesh><mesh position={[0, 0, DEPTH / 2 + 0.11]}><planeGeometry args={[OPEN_W - 2, BOX_H - 0.5]} /><meshStandardMaterial color="#475569" metalness={0.5} /></mesh></group>
            <group><mesh position={[-(OPEN_W + RAIL_W) / 2, OPEN_H / 2, 0]} castShadow><boxGeometry args={[RAIL_W, OPEN_H, DEPTH]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} /></mesh><mesh position={[(OPEN_W + RAIL_W) / 2, OPEN_H / 2, 0]} castShadow><boxGeometry args={[RAIL_W, OPEN_H, DEPTH]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} /></mesh></group>
            <group position={[0, OPEN_H / 2, -0.1]}><mesh receiveShadow castShadow><planeGeometry args={[OPEN_W, OPEN_H]} /><meshStandardMaterial map={shutterTexture} metalness={0.8} roughness={0.4} side={THREE.DoubleSide} /></mesh><mesh position={[0, -OPEN_H / 2 + 0.2, 0.1]} castShadow><boxGeometry args={[OPEN_W, 0.4, DEPTH / 2]} /><meshStandardMaterial color="#1e293b" metalness={0.9} /></mesh></group>
            <group position={[OPEN_W / 2 + RAIL_W + 0.5, 1.5, 0]}><mesh castShadow><boxGeometry args={[0.6, 1.0, 0.3]} /><meshStandardMaterial color="#ca8a04" /></mesh><mesh position={[0, 0.2, 0.16]}><boxGeometry args={[0.2, 0.2, 0.1]} /><meshStandardMaterial color="#dc2626" /></mesh><mesh position={[0, -0.2, 0.16]}><boxGeometry args={[0.2, 0.2, 0.1]} /><meshStandardMaterial color="#16a34a" /></mesh></group>
            <mesh position={[0, totalHeight / 2, 0]}><boxGeometry args={[OPEN_W + 2, totalHeight, DEPTH + 1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            {/* Label 컴포넌트 삭제됨 */}
        </group>
    );
};

const IndustrialPump = ({ position, rotation, type, scale = 1, label, status, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const isVertical = type === 'PUMP_VERTICAL' || type === 'PUMP_VERT';
    const pumpColor = status === 'WARNING' ? '#ef4444' : (isSelected ? '#4f46e5' : '#3b82f6');
    const motorColor = "#64748b";
    const baseColor = "#1e293b";
    const shaftColor = "#cbd5e1";
    const guardColor = "#f59e0b";

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            {isVertical ? (
                <group position={[0, 2, 0]}>
                    <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[1, 1, 2.5, 32]} /><meshStandardMaterial color={motorColor} roughness={0.5} /></mesh>
                    <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[1.1, 1.1, 2, 8]} /><meshStandardMaterial color={motorColor} wireframe /></mesh>
                    <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.8, 0.6, 1]} /><meshStandardMaterial color="#f97316" /></mesh>
                    <mesh position={[0, -1.2, 0]}><cylinderGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color={pumpColor} /></mesh>
                    <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 4]} /><meshStandardMaterial color="#1e293b" /></mesh>
                    <mesh position={[2, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                    <mesh position={[-2, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                    <mesh position={[0, -2.5, 0]}><boxGeometry args={[1.5, 1, 1.5]} /><meshStandardMaterial color="#334155" /></mesh>
                    <mesh position={[0, 0, 0]}><boxGeometry args={[4.5, 6, 2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
                </group>
            ) : (
                <group position={[0, 0.6, 0]}>
                    <group position={[0.5, -0.7, 0]}>
                        <mesh receiveShadow castShadow><boxGeometry args={[7.5, 0.2, 2.8]} /><meshStandardMaterial color={baseColor} /></mesh>
                        <mesh position={[0, -0.15, 0]}><boxGeometry args={[7.7, 0.1, 3.0]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                    </group>
                    <group position={[-2.0, 0.6, 0]}>
                        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.0, 1.0, 2.5, 32]} /><meshStandardMaterial color={motorColor} /></mesh>
                        {Array.from({ length: 8 }).map((_, i) => (<mesh key={i} position={[-1.0 + i * 0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.05, 1.05, 0.15, 32]} /><meshStandardMaterial color={motorColor} /></mesh>))}
                        <mesh position={[0.2, 1.0, 0.5]} castShadow><boxGeometry args={[0.5, 0.4, 0.5]} /><meshStandardMaterial color={motorColor} /></mesh>
                        <mesh position={[0, -1.0, 0]}><boxGeometry args={[1.5, 0.2, 1.6]} /><meshStandardMaterial color={motorColor} /></mesh>
                    </group>
                    <group position={[-0.1, 0.6, 0]}>
                        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 1.5]} /><meshStandardMaterial color={shaftColor} metalness={0.8} roughness={0.2} /></mesh>
                        <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.5, 0.5, 0.9, 32, 1, true, 0, Math.PI]} /><meshStandardMaterial color={guardColor} side={THREE.DoubleSide} /></mesh>
                    </group>
                    <group position={[2.0, 0.6, 0]}>
                        <group>
                            <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.2, 1.2, 0.8, 32, 1, false, 0, Math.PI]} /><meshStandardMaterial color={pumpColor} /></mesh>
                            <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.2, 1.2, 0.8, 32, 1, false, Math.PI, Math.PI]} /><meshStandardMaterial color={pumpColor} /></mesh>
                            <mesh position={[0, 0, 0]}><boxGeometry args={[1.0, 0.05, 2.6]} /><meshStandardMaterial color={pumpColor} /></mesh>
                            {[0.4, -0.4].map(x => [-1.0, 1.0].map(z => (<mesh key={`${x}-${z}`} position={[x, 0.05, z]}><cylinderGeometry args={[0.04, 0.04, 0.05]} /><meshStandardMaterial color="#cbd5e1" /></mesh>)))}
                        </group>
                        <group position={[-0.8, 0, 0]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.4, 0.5]} /><meshStandardMaterial color={pumpColor} /></mesh></group>
                        <group position={[0.8, 0, 0]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.35, 0.5]} /><meshStandardMaterial color={pumpColor} /></mesh><mesh position={[0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.36, 0.36, 0.05]} /><meshStandardMaterial color="#334155" /></mesh></group>
                        <group position={[0, -0.2, 0.7]} rotation={[Math.PI / 2, 0, 0]}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.6, 0.7, 0.6]} /><meshStandardMaterial color={pumpColor} /></mesh><mesh position={[0, 0.65, 0]}><cylinderGeometry args={[0.85, 0.85, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.6, 0.6, 0.05]} /><meshBasicMaterial color="#000000" /></mesh></group>
                        <group position={[0, -0.2, -0.7]} rotation={[-Math.PI / 2, 0, 0]}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.5, 0.6, 0.6]} /><meshStandardMaterial color={pumpColor} /></mesh><mesh position={[0, 0.65, 0]}><cylinderGeometry args={[0.75, 0.75, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.5, 0.5, 0.05]} /><meshBasicMaterial color="#000000" /></mesh></group>
                        <group position={[0, 1.2, -0.4]} rotation={[0, Math.PI, 0]}><mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.03, 0.03, 0.4]} /><meshStandardMaterial color="#cbd5e1" /></mesh><mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.08]} /><meshStandardMaterial color="#ffffff" /></mesh><mesh position={[0, 0.1, 0.05]} rotation={[0, 0, -Math.PI / 6]}><boxGeometry args={[0.02, 0.12, 0.01]} /><meshBasicMaterial color="#ef4444" /></mesh></group>
                    </group>
                    <mesh position={[0.5, 0.8, 0]}><boxGeometry args={[8.0, 4.0, 3.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
                </group>
            )}
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={isVertical ? 5 : 3.5} />
        </group>
    );
};

const HeatExchanger = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const isPlate = type === 'HX_PLATE'; const metal = "#94a3b8"; const frameColor = "#0f172a";
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            {isPlate ? (
                <group position={[0, 1.5, 0]}>
                    <mesh position={[0, 0, 1.2]} castShadow><boxGeometry args={[1.8, 3.5, 0.2]} /><meshStandardMaterial color={frameColor} /></mesh>
                    <mesh position={[0, 0, -1.2]} castShadow><boxGeometry args={[1.8, 3.5, 0.2]} /><meshStandardMaterial color={frameColor} /></mesh>
                    <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 3]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                    <mesh position={[0, -1.6, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 3]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                    <mesh position={[0, 0, 0]}><boxGeometry args={[1.6, 3.2, 2.2]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                    <mesh position={[1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#475569" /></mesh>
                    <mesh position={[-1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#475569" /></mesh>
                    {[[0.5, 1.2], [-0.5, 1.2], [0.5, -1.2], [-0.5, -1.2]].map((pos, idx) => (<group key={idx} position={[pos[0], pos[1], 1.3]} rotation={[Math.PI / 2, 0, 0]}><mesh><cylinderGeometry args={[0.25, 0.25, 0.4]} /><meshStandardMaterial color={metal} /></mesh><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.4, 0.4, 0.05]} /><meshStandardMaterial color={metal} /></mesh></group>))}
                    <mesh position={[0, -1.85, 1.2]}><boxGeometry args={[0.5, 0.5, 0.1]} /><meshStandardMaterial color={frameColor} /></mesh>
                    <mesh position={[0, -1.85, -1.2]}><boxGeometry args={[0.5, 0.5, 0.1]} /><meshStandardMaterial color={frameColor} /></mesh>
                    <mesh position={[0, 0, 0]}><boxGeometry args={[2.5, 4, 3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
                </group>
            ) : (
                <group position={[0, 1.8, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.6, 1.6, 7, 32]} /><meshStandardMaterial color="#e2e8f0" metalness={0.4} /></mesh>
                    <mesh position={[3.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}><sphereGeometry args={[1.65, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#475569" /></mesh>
                    <mesh position={[-3.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><sphereGeometry args={[1.65, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#475569" /></mesh>
                    <mesh position={[-2, 1.5, 0]}><cylinderGeometry args={[0.6, 0.6, 1.2]} /><meshStandardMaterial color={metal} /></mesh>
                    <mesh position={[2, -1.5, 0]}><cylinderGeometry args={[0.6, 0.6, 1.2]} /><meshStandardMaterial color={metal} /></mesh>
                    <mesh position={[-2.5, -1.8, 0]}><boxGeometry args={[0.8, 1.2, 2.5]} /><meshStandardMaterial color="#334155" /></mesh>
                    <mesh position={[2.5, -1.8, 0]}><boxGeometry args={[0.8, 1.2, 2.5]} /><meshStandardMaterial color="#334155" /></mesh>
                    <mesh position={[0, 0, 0]}><boxGeometry args={[8, 3.5, 3.5]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
                </group>
            )}
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={isPlate ? 4.5 : 4.5} />
        </group>
    );
};

const DrainCooler = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const shellColor = "#94a3b8";
    const nozzleColor = "#64748b";
    const saddleColor = "#334155";
    const flangeColor = "#cbd5e1";

    const renderBolts = (count, radius, axis = 'y') => {
        return Array.from({ length: count }).map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            return (
                <mesh key={i} position={axis === 'z' ? [x, z, 0] : [x, 0, z]} rotation={axis === 'z' ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.05]} /><meshStandardMaterial color="#1e293b" />
                </mesh>
            );
        });
    };

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, 0.8, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.5, 0.5, 2.5, 32]} /><meshStandardMaterial color={shellColor} roughness={0.4} /></mesh>
                <group position={[1.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <mesh><cylinderGeometry args={[0.5, 0.5, 0.2]} /><meshStandardMaterial color={shellColor} /></mesh>
                    <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={shellColor} /></mesh>
                    <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.55, 0.55, 0.1]} /><meshStandardMaterial color={flangeColor} /></mesh>
                    <group position={[0, -0.15, 0]}>{renderBolts(12, 0.5, 'y')}</group>
                </group>
                <group position={[-1.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <mesh><cylinderGeometry args={[0.5, 0.5, 0.2]} /><meshStandardMaterial color={shellColor} /></mesh>
                    <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={shellColor} /></mesh>
                    <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.55, 0.55, 0.1]} /><meshStandardMaterial color={flangeColor} /></mesh>
                    <group position={[0, -0.15, 0]}>{renderBolts(12, 0.5, 'y')}</group>
                </group>
                <group position={[-0.6, 0.5, 0]}><mesh><cylinderGeometry args={[0.15, 0.15, 0.4]} /><meshStandardMaterial color={nozzleColor} /></mesh><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05]} /><meshStandardMaterial color={flangeColor} /></mesh></group>
                <group position={[0.6, -0.5, 0]}><mesh><cylinderGeometry args={[0.15, 0.15, 0.4]} /><meshStandardMaterial color={nozzleColor} /></mesh><mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05]} /><meshStandardMaterial color={flangeColor} /></mesh></group>
                <group position={[-0.8, -0.6, 0]}><mesh><boxGeometry args={[0.2, 0.6, 0.8]} /><meshStandardMaterial color={saddleColor} /></mesh><mesh position={[0, -0.35, 0]}><boxGeometry args={[0.4, 0.1, 1.0]} /><meshStandardMaterial color={saddleColor} /></mesh></group>
                <group position={[0.8, -0.6, 0]}><mesh><boxGeometry args={[0.2, 0.6, 0.8]} /><meshStandardMaterial color={saddleColor} /></mesh><mesh position={[0, -0.35, 0]}><boxGeometry args={[0.4, 0.1, 1.0]} /><meshStandardMaterial color={saddleColor} /></mesh></group>
            </group>
            <mesh position={[0, 0.8, 0]}><boxGeometry args={[3.0, 1.5, 1.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={2.0} />
        </group>
    );
};

const GeneratorBusSystem = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const pipeColor = "#e5e7eb";
    const bellowsColor = "#1f2937";
    const cabinetColor = "#f8fafc";
    const supportColor = "#64748b";
    const baseColor = "#15803d";
    const flangeColor = "#d1d5db";

    const renderRealBellows = (pos, axis = 'y') => {
        const rotation = axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
        return (
            <group position={pos} rotation={rotation}>
                {[0, 0.08, 0.16, 0.24, 0.32].map((offset, i) => (
                    <mesh key={i} position={[0, 0, offset - 0.16]}><torusGeometry args={[0.36, 0.04, 16, 32]} /><meshStandardMaterial color={bellowsColor} roughness={0.7} /></mesh>
                ))}
                <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.34, 0.34, 0.45]} /><meshStandardMaterial color="#111" /></mesh>
                <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.42, 0.42, 0.05]} /><meshStandardMaterial color={flangeColor} /></mesh>
                <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.42, 0.42, 0.05]} /><meshStandardMaterial color={flangeColor} /></mesh>
            </group>
        );
    };

    const renderPhase = (xPos) => (
        <group position={[xPos, 0, 0]}>
            <mesh position={[0, 4.95, 0]} castShadow><cylinderGeometry args={[0.32, 0.32, 1.5, 32]} /><meshStandardMaterial color={pipeColor} metalness={0.1} roughness={0.2} /></mesh>
            {renderRealBellows([0, 3.95, 0], 'y')}
            <group position={[0, 3.4, 0]}>
                <mesh><cylinderGeometry args={[0.32, 0.32, 0.6]} /><meshStandardMaterial color={pipeColor} /></mesh>
                <mesh position={[0, -0.1, 0]}><sphereGeometry args={[0.33, 32, 32]} /><meshStandardMaterial color={pipeColor} /></mesh>
                <mesh position={[0, -0.1, 0.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.32, 0.32, 0.8]} /><meshStandardMaterial color={pipeColor} /></mesh>
            </group>
            {renderRealBellows([0, 3.3, 1.05], 'z')}
            <mesh position={[0, 3.3, 2.8]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.32, 0.32, 3.0, 32]} /><meshStandardMaterial color={pipeColor} metalness={0.1} roughness={0.2} /></mesh>
            <group position={[0, 2.8, 0]}>
                <mesh><cylinderGeometry args={[0.25, 0.25, 0.6]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                <mesh position={[0, -0.25, 0]}><boxGeometry args={[0.5, 0.1, 0.5]} /><meshStandardMaterial color="#94a3b8" /></mesh>
            </group>
        </group>
    );

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, 0, 0]}>
                <mesh position={[0, 0.05, 0]}><boxGeometry args={[2.9, 0.1, 1.1]} /><meshStandardMaterial color="#334155" /></mesh>
                <mesh position={[0, 1.3, 0]} castShadow receiveShadow><boxGeometry args={[2.8, 2.4, 1.0]} /><meshStandardMaterial color={cabinetColor} /></mesh>
                {[-0.9, 0, 0.9].map((x, i) => (
                    <group key={i} position={[x, 1.3, 0.51]}>
                        <mesh><planeGeometry args={[0.85, 2.3]} /><meshStandardMaterial color={cabinetColor} /></mesh>
                        <mesh position={[0, 0, 0.01]}><lineSegments><edgesGeometry args={[new THREE.PlaneGeometry(0.85, 2.3)]} /><lineBasicMaterial color="#cbd5e1" /></lineSegments></mesh>
                        <mesh position={[0.35, 0.1, 0.02]}><boxGeometry args={[0.05, 0.3, 0.02]} /><meshStandardMaterial color="#334155" /></mesh>
                    </group>
                ))}
            </group>

            {renderPhase(-1.0)}
            {renderPhase(0)}
            {renderPhase(1.0)}

            <group position={[0, 0, 3.8]}>
                <group position={[-1.6, 0, 0]}>
                    <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.4, 0.5, 0.4]} /><meshStandardMaterial color={baseColor} /></mesh>
                    <mesh position={[0, 1.7, 0]}><boxGeometry args={[0.15, 2.4, 0.15]} /><meshStandardMaterial color={supportColor} /></mesh>
                </group>
                <group position={[1.6, 0, 0]}>
                    <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.4, 0.5, 0.4]} /><meshStandardMaterial color={baseColor} /></mesh>
                    <mesh position={[0, 1.7, 0]}><boxGeometry args={[0.15, 2.4, 0.15]} /><meshStandardMaterial color={supportColor} /></mesh>
                </group>
                <mesh position={[0, 2.975, 0]}><boxGeometry args={[3.8, 0.15, 0.15]} /><meshStandardMaterial color={supportColor} /></mesh>
                {[-1.0, 0, 1.0].map((x, i) => (
                    <mesh key={i} position={[x, 3.125, 0]}>
                        <boxGeometry args={[0.3, 0.15, 0.1]} />
                        <meshStandardMaterial color={supportColor} />
                    </mesh>
                ))}
            </group>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={5.8} />
        </group>
    );
};

const StorageTank = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const isSquare = type === 'TANK_SQUARE';
    const bodyColor = "#cbd5e1";
    const ribColor = "#64748b";
    const ladderColor = "#475569";
    const gaugeFrame = "#334155";

    const renderLadder = (height, xPos, zPos, rotY = 0) => (
        <group position={[xPos, 0, zPos]} rotation={[0, rotY, 0]}>
            <mesh position={[-0.25, 0, 0]}><cylinderGeometry args={[0.03, 0.03, height]} /><meshStandardMaterial color={ladderColor} /></mesh>
            <mesh position={[0.25, 0, 0]}><cylinderGeometry args={[0.03, 0.03, height]} /><meshStandardMaterial color={ladderColor} /></mesh>
            {Array.from({ length: Math.floor(height * 3.3) }).map((_, i) => (
                <mesh key={`rung-${i}`} position={[0, -height / 2 + i * 0.3 + 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.5]} />
                    <meshStandardMaterial color={ladderColor} />
                </mesh>
            ))}
            {Array.from({ length: Math.floor(height / 1.2) }).map((_, i) => {
                const y = -height / 2 + i * 1.2 + 0.6;
                return (
                    <group key={`bracket-${i}`} position={[0, y, -0.2]}>
                        <mesh position={[-0.25, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.4]} /><meshStandardMaterial color={ladderColor} /></mesh>
                        <mesh position={[0.25, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.4]} /><meshStandardMaterial color={ladderColor} /></mesh>
                        <mesh position={[-0.25, 0, -0.2]}><boxGeometry args={[0.08, 0.08, 0.02]} /><meshStandardMaterial color={ladderColor} /></mesh>
                        <mesh position={[0.25, 0, -0.2]}><boxGeometry args={[0.08, 0.08, 0.02]} /><meshStandardMaterial color={ladderColor} /></mesh>
                    </group>
                );
            })}
        </group>
    );

    const renderLevelGauge = (height, x, z, rotY = 0) => (
        <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
            <mesh position={[0, 0, -0.05]}><boxGeometry args={[0.2, height, 0.05]} /><meshStandardMaterial color={gaugeFrame} /></mesh>
            <mesh position={[0, 0, 0.02]}><cylinderGeometry args={[0.04, 0.04, height - 0.1]} /><meshStandardMaterial color="#e2e8f0" transparent opacity={0.3} /></mesh>
            <mesh position={[0, -height * 0.15, 0.02]}><cylinderGeometry args={[0.03, 0.03, height * 0.7]} /><meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.6} /></mesh>
        </group>
    );

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            {isSquare ? (
                <group position={[0, 2.0, 0]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[3.5, 4.0, 3.5]} />
                        <meshStandardMaterial color={bodyColor} roughness={0.3} />
                    </mesh>
                    {[-1.2, 0, 1.2].map((y, i) => (
                        <group key={i} position={[0, y, 0]}>
                            <mesh position={[0, 0, 1.76]}><boxGeometry args={[3.6, 0.15, 0.05]} /><meshStandardMaterial color={ribColor} /></mesh>
                            <mesh position={[0, 0, -1.76]}><boxGeometry args={[3.6, 0.15, 0.05]} /><meshStandardMaterial color={ribColor} /></mesh>
                            <mesh position={[1.76, 0, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[3.6, 0.15, 0.05]} /><meshStandardMaterial color={ribColor} /></mesh>
                            <mesh position={[-1.76, 0, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[3.6, 0.15, 0.05]} /><meshStandardMaterial color={ribColor} /></mesh>
                        </group>
                    ))}
                    {renderLevelGauge(2.5, 1.0, 1.8)}
                    {renderLadder(4.2, -2.05, 0, -Math.PI / 2)}
                    <mesh position={[0, 2.05, 0]}><cylinderGeometry args={[0.6, 0.6, 0.1]} /><meshStandardMaterial color="#475569" /></mesh>
                </group>

            ) : (
                <group position={[0, 2.5, 0]}>
                    <mesh castShadow receiveShadow><cylinderGeometry args={[1.8, 1.8, 4.0, 32]} /><meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.4} /></mesh>
                    <mesh position={[0, 2.0, 0]}><sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={bodyColor} /></mesh>
                    <mesh position={[0, -2.0, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={bodyColor} /></mesh>
                    <group rotation={[0, Math.PI / 2, 0]}>{renderLevelGauge(3.0, 1.85, 0)}</group>
                    {[45, 135, 225, 315].map((deg, i) => {
                        const rad = deg * Math.PI / 180;
                        return (
                            <group key={i} position={[Math.sin(rad) * 1.5, -2.5, Math.cos(rad) * 1.5]}>
                                <mesh><cylinderGeometry args={[0.12, 0.12, 1.5]} /><meshStandardMaterial color={ribColor} /></mesh>
                                <mesh position={[0, -0.75, 0]}><cylinderGeometry args={[0.25, 0.25, 0.1]} /><meshStandardMaterial color={ribColor} /></mesh>
                            </group>
                        );
                    })}
                    <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.5, 0.5, 0.2]} /><meshStandardMaterial color={ribColor} /></mesh>
                </group>
            )}
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={isSquare ? 4.8 : 6.0} />
        </group>
    );
};

const IndustrialFan = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const housingColor = "#334155";
    const motorColor = "#475569";
    const baseColor = "#1e293b";
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, 1.0, 0]}>
                <mesh position={[0, -0.9, 0]} castShadow><boxGeometry args={[1.5, 0.15, 1.0]} /><meshStandardMaterial color={baseColor} /></mesh>
                <group position={[-0.3, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <mesh castShadow><cylinderGeometry args={[0.25, 0.25, 0.6]} /><meshStandardMaterial color={motorColor} /></mesh>
                    {[...Array(5)].map((_, i) => (<mesh key={i} position={[0, -0.2 + i * 0.1, 0]}><cylinderGeometry args={[0.27, 0.27, 0.02]} /><meshStandardMaterial color={motorColor} /></mesh>))}
                    <mesh position={[0.15, 0.2, 0]}><boxGeometry args={[0.12, 0.15, 0.15]} /><meshStandardMaterial color={motorColor} /></mesh>
                </group>
                <group position={[0.3, 0, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.6, 0.6, 0.35, 32]} /><meshStandardMaterial color={housingColor} /></mesh>
                    <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.25, 0.25, 0.05]} /><meshStandardMaterial color="#0f172a" /></mesh>
                    <mesh position={[0, 0.5, 0.3]}><boxGeometry args={[0.35, 0.6, 0.4]} /><meshStandardMaterial color={housingColor} /></mesh>
                    <mesh position={[0, 0.8, 0.3]}><boxGeometry args={[0.45, 0.05, 0.5]} /><meshStandardMaterial color="#64748b" /></mesh>
                </group>
                <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 0.2]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            </group>
            <mesh position={[0, 0.8, 0]}><boxGeometry args={[1.5, 1.8, 1.0]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={2.0} />
        </group>
    );
};

const DifferentialFilter = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, showLabel, ...props }) => {
    const housingColor = "#cbd5e1";
    const pipeColor = "#94a3b8";
    const valveColor = "#334155";
    const handleColor = "#1e293b";
    const gaugeColor = "#ffffff";
    const tubeColor = "#f59e0b";

    const renderBolts = (count, radius, y) => Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[Math.cos(i / count * Math.PI * 2) * radius, y, Math.sin(i / count * Math.PI * 2) * radius]}>
            <cylinderGeometry args={[0.015, 0.015, 0.04]} /><meshStandardMaterial color="#475569" />
        </mesh>
    ));

    const renderFilterHousing = (xPos) => (
        <group position={[xPos, 0, 0]}>
            <mesh castShadow><cylinderGeometry args={[0.25, 0.25, 1.0, 32]} /><meshStandardMaterial color={housingColor} roughness={0.3} /></mesh>
            <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.28, 0.28, 0.08]} /><meshStandardMaterial color={housingColor} /></mesh>
            <group position={[0, 0.55, 0]}>{renderBolts(8, 0.24, 0)}</group>
            <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={housingColor} /></mesh>
            <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[0.04, 0.04, 0.08]} /><meshStandardMaterial color="#64748b" /></mesh>
            <mesh position={[0, -0.5, 0]}><sphereGeometry args={[0.25, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI]} /><meshStandardMaterial color={housingColor} /></mesh>
            <mesh position={[0, -0.78, 0]}><cylinderGeometry args={[0.04, 0.04, 0.08]} /><meshStandardMaterial color="#64748b" /></mesh>
            <mesh position={[0, -0.9, 0]}><cylinderGeometry args={[0.04, 0.04, 0.3]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh position={[0, -1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
        </group>
    );

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, 1.0, 0]}>
                {renderFilterHousing(-0.35)}
                {renderFilterHousing(0.35)}
                <group position={[0, 0, 0]}>
                    <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color={pipeColor} /></mesh>
                    <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 0.8]} /><meshStandardMaterial color={pipeColor} /></mesh>
                    <mesh position={[0, 0, 0]}><boxGeometry args={[0.25, 0.6, 0.25]} /><meshStandardMaterial color={valveColor} /></mesh>
                    <group position={[0, 0.35, 0.15]} rotation={[Math.PI / 4, 0, 0]}>
                        <mesh><cylinderGeometry args={[0.02, 0.02, 0.15]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
                        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.4]} /><meshStandardMaterial color={handleColor} /></mesh>
                    </group>
                </group>
                <group position={[0, 0.5, 0.2]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
                    <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.01]} /><meshStandardMaterial color={gaugeColor} /></mesh>
                    <mesh position={[0, 0.02, 0.04]} rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.01, 0.1, 0.01]} /><meshStandardMaterial color="#dc2626" /></mesh>
                    <mesh position={[-0.05, -0.1, -0.05]}><cylinderGeometry args={[0.008, 0.008, 0.2]} /><meshStandardMaterial color={tubeColor} /></mesh>
                    <mesh position={[0.05, -0.3, -0.05]}><cylinderGeometry args={[0.008, 0.008, 0.4]} /><meshStandardMaterial color={tubeColor} /></mesh>
                </group>
                <mesh position={[-0.5, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.05]} /><meshStandardMaterial color="#64748b" /></mesh>
                <mesh position={[0.5, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.05]} /><meshStandardMaterial color="#64748b" /></mesh>
            </group>
            <mesh position={[0, 0.8, 0]}><boxGeometry args={[1.5, 2.5, 1.0]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} forceShow={showLabel} height={2.2} />
        </group>
    );
};


const FloorPlane = ({ onFloorClick, editMode, isDark }) => {
    const [texture, setTexture] = useState(null);
    useEffect(() => {
        new THREE.TextureLoader().load('/floor_plan.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; setTexture(t); }, undefined, () => setTexture(null));
    }, []);
    const floorColor = isDark ? "#0f172a" : "#64748b";
    const gridColor1 = isDark ? "#1e293b" : "#94a3b8";
    const gridColor2 = isDark ? "#334155" : "#cbd5e1";

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={(e) => { if (!editMode || e.button !== 0 || e.delta > 2) return; e.stopPropagation(); onFloorClick(e.point); }}>
            <planeGeometry args={[100, 100]} />
            {texture ? (
                <meshStandardMaterial map={texture} transparent opacity={0.6} side={THREE.DoubleSide} />
            ) : (
                <meshStandardMaterial color={floorColor} transparent opacity={0.6} roughness={0.8} metalness={0.1} />
            )}

            <gridHelper args={[100, 20, gridColor1, gridColor2]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
        </mesh>
    );
};

// 🌟 [UI 수정] 베리어블 드롭다운 스타일 적용 + 기존 슬라이더/버튼 UI 복구
const PropertyPanel = ({ item, onUpdate, onDelete, onClose }) => {
    // 드롭다운 열림/닫힘 상태 관리
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 외부 클릭 시 드롭다운 닫기 위한 Ref
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!item) return null;

    // 🛠️ 지능형 목록 로직 (기존 유지)
    const getVariableTypeOptions = () => {
        for (const group of TOOL_HIERARCHY) {
            if (group.children) {
                for (const category of group.children) {
                    // 1. 밸브류 등 서브메뉴가 있는 경우
                    if (category.children && category.children.some(c => c.type === item.type)) {
                        return { label: category.label, options: category.children };
                    }
                    // 2. 펌프/열교환기 등 접두사로 묶인 경우
                    if (category.type === item.type) {
                        if (item.type.includes('PUMP')) return { label: '펌프 타입 선택', options: group.children.filter(c => c.type && c.type.includes('PUMP')) };
                        if (item.type.includes('HX')) return { label: '열교환기 타입 선택', options: group.children.filter(c => c.type && c.type.includes('HX')) };
                    }
                }
            }
        }
        return { label: '설비 타입', options: [{ label: item.label, type: item.type }] };
    };

    const { label: groupLabel, options: typeOptions } = getVariableTypeOptions();

    // 현재 선택된 타입의 라벨 찾기
    const currentOptionLabel = typeOptions.find(opt => opt.type === item.type)?.label || item.label;

    return (
        <div className="absolute top-20 right-4 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 z-20 animate-fade-in-right">

            {/* 헤더 */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <Edit3 size={16} className="text-indigo-500" /> 속성 편집
                </h3>
                <button onClick={onClose}>
                    <X size={18} className="text-zinc-400 hover:text-zinc-600" />
                </button>
            </div>

            <div className="space-y-4">

                {/* 🌟 1. 베리어블 드롭다운 UI (Variable Dropdown Style) */}
                {typeOptions.length > 1 && (
                    <div className="relative" ref={dropdownRef}>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                            {groupLabel}
                        </label>

                        {/* 드롭다운 트리거 버튼 */}
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border flex justify-between items-center text-sm font-medium transition-all
                                ${isDropdownOpen
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400'
                                    : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                        >
                            <span>{currentOptionLabel}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-500' : 'text-zinc-400'}`} />
                        </button>

                        {/* 드롭다운 목록 (Custom List) */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto animate-fade-in-down p-1">
                                {typeOptions.map((opt) => (
                                    <button
                                        key={opt.type}
                                        onClick={() => {
                                            onUpdate({ ...item, type: opt.type });
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center gap-2
                                            ${item.type === opt.type
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {/* 선택된 항목 표시 점 */}
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.type === opt.type ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. 설비 명칭 (텍스트 입력) */}
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">설비 명칭</label>
                    <input
                        type="text"
                        value={item.label || ""}
                        onChange={(e) => onUpdate({ ...item, label: e.target.value })}
                        className="w-full text-sm p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-black outline-none text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 transition-colors"
                    />
                </div>

                {/* 3. 높이 (기존 슬라이더 UI) */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">높이 (Y)</label>
                        <span className="text-[10px] font-mono text-zinc-500">{item.y || 0}m</span>
                    </div>
                    <input
                        type="range"
                        min="-5"
                        max="20"
                        step="0.5"
                        value={item.y || 0}
                        onChange={(e) => onUpdate({ ...item, y: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* 4. 크기 (기존 슬라이더 UI) */}
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">크기 (Scale)</label>
                        <span className="text-[10px] font-mono text-zinc-500">x{item.scale || 1}</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={item.scale || 1}
                        onChange={(e) => onUpdate({ ...item, scale: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer accent-indigo-500"
                    />
                </div>

                {/* 5. 회전 (기존 버튼식 UI) */}
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">회전</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onUpdate({ ...item, rotation: (item.rotation || 0) - Math.PI / 2 })}
                            className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition-colors"
                        >
                            ↺ -90°
                        </button>
                        <button
                            onClick={() => onUpdate({ ...item, rotation: (item.rotation || 0) + Math.PI / 2 })}
                            className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition-colors"
                        >
                            ↻ +90°
                        </button>
                    </div>
                </div>

                {/* 6. 삭제 버튼 */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    <button
                        onClick={onDelete}
                        className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-colors"
                    >
                        <Trash2 size={14} /> 설비 삭제
                    </button>
                </div>
            </div>
        </div>
    );
};

const FieldMapContainer = ({ workData }) => {
    const [showToast, setShowToast] = useState(false);
    const [activeBuildingId, setActiveBuildingId] = useState(BUILDING_STRUCTURE[0].id);
    const [activeFloorId, setActiveFloorId] = useState(BUILDING_STRUCTURE[0].floors[0]);
    const currentStorageKey = useMemo(() => `${activeBuildingId}-${activeFloorId}`, [activeBuildingId, activeFloorId]);

    const [allFloorData, setAllFloorData, undo, redo] = useUndoRedo({});

    const equipmentCategories = useMemo(() => {
        const group = TOOL_HIERARCHY.find(g => g.id === 'EQUIPMENT');
        return group ? group.children.map(c => c.label) : [];
    }, []);

    // 필터 토글 핸들러
    const toggleLabelVisibility = (category) => {
        setVisibleLabels(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const [visibleLabels, setVisibleLabels] = useState({});

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    useEffect(() => {
        const loadMapData = async () => {
            try {
                const { ipcRenderer } = window.require('electron');
                const loadedData = await ipcRenderer.invoke('load-map-data');
                console.log("📂 로드된 데이터:", loadedData);

                const parsedData = {};
                if (Array.isArray(loadedData)) {
                    loadedData.forEach(building => {
                        if (building.floors) {
                            building.floors.forEach(floor => {
                                const key = `${building.id}-${floor.id}`;
                                parsedData[key] = (floor.valves || []).map((item, index) => ({
                                    ...item,
                                    id: item.id || `static_${key}_${index}_${Date.now()}`,
                                    x: Number(item.x) || 0,
                                    y: Number(item.y) || 0,
                                    z: Number(item.z) || 0,
                                    rotation: Number(item.rotation) || 0,
                                    scale: Number(item.scale) || 1,
                                    label: item.label || '',
                                    status: item.status || 'NORMAL'
                                }));
                            });
                        }
                    });
                }
                setAllFloorData(parsedData);
            } catch (error) {
                console.error("❌ 로드 실패:", error);
            }
        };
        loadMapData();
    }, []);

    useEffect(() => {
        const building = BUILDING_STRUCTURE.find(b => b.id === activeBuildingId);
        if (building && !building.floors.includes(activeFloorId)) {
            setActiveFloorId(building.floors[0]);
        }
    }, [activeBuildingId]);

    const [editMode, setEditMode] = useState(false);
    const [interactionMode, setInteractionMode] = useState('MOVE');
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const [activeTool, setActiveTool] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchIds, setSearchIds] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const orbitControlsRef = useRef(null);

    const selectedItem = useMemo(() =>
        allFloorData[currentStorageKey]?.find(item => item.id === selectedId),
        [allFloorData, currentStorageKey, selectedId]
    );

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedId) {
                const item = allFloorData[currentStorageKey]?.find(i => i.id === selectedId);
                if (item) setClipboard(item);
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard && editMode) {
                const newItem = {
                    ...clipboard,
                    id: Date.now(),
                    x: clipboard.x + 2,
                    z: clipboard.z + 2,
                    label: `${clipboard.label} (Copy)`
                };
                setAllFloorData(prev => ({
                    ...prev,
                    [currentStorageKey]: [...(prev[currentStorageKey] || []), newItem]
                }));
                setSelectedId(newItem.id);
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editMode) handleDeleteItem();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, currentStorageKey, clipboard, allFloorData, editMode]);

    const handleSearch = () => {
        if (!searchInput.trim()) { setSearchIds([]); return; }
        const term = searchInput.toLowerCase();
        let firstMatchKey = null;
        const newSearchIds = [];

        Object.keys(allFloorData).forEach(key => {
            const matches = allFloorData[key].filter(item => item.label && item.label.toLowerCase().includes(term));
            if (matches.length > 0) {
                if (!firstMatchKey) firstMatchKey = key;
                matches.forEach(m => newSearchIds.push(m.id));
            }
        });

        if (newSearchIds.length > 0) {
            setSearchIds(newSearchIds);
            setSelectedId(null);
            const currentFloorHasMatch = (allFloorData[currentStorageKey] || []).some(item => newSearchIds.includes(item.id));
            if (!currentFloorHasMatch && firstMatchKey) {
                const [bId, fId] = firstMatchKey.split('-');
                if (bId && fId) {
                    setActiveBuildingId(bId);
                    setActiveFloorId(fId);
                }
            }
        } else {
            alert("검색 결과가 없습니다.");
            setSearchIds([]);
        }
    };

    const handleSave = async () => {
        const dataToSave = BUILDING_STRUCTURE.map(building => ({
            id: building.id,
            name: building.name,
            floors: building.floors.map(floorId => {
                const storageKey = `${building.id}-${floorId}`;
                const floorItems = allFloorData[storageKey] || [];

                return {
                    id: floorId,
                    label: `${floorId}층`,
                    valves: floorItems.map(item => ({
                        id: item.id,
                        type: item.type,
                        x: Number(item.x),
                        y: Number(item.y) || 0,
                        z: Number(item.z),
                        rotation: Number(item.rotation) || 0,
                        scale: Number(item.scale) || 1,
                        label: item.label || '',
                        status: item.status || 'NORMAL'
                    }))
                };
            })
        }));

        console.log("💾 저장할 데이터:", dataToSave);

        try {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('save-map-data', dataToSave);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
            console.log("✅ 저장 성공!");
        } catch (error) {
            console.error("❌ 저장 실패:", error);
            alert(`저장에 실패했습니다.\n오류: ${error.message}`);
        }
    };

    const handleAdd = (point) => {
        if (!activeTool) return;
        const newItem = {
            id: Date.now(),
            type: activeTool,
            x: Math.round(point.x),
            y: 0,
            z: Math.round(point.z),
            rotation: 0,
            scale: 1,
            label: `New Item`,
            status: 'NORMAL'
        };
        setAllFloorData(prev => ({
            ...prev,
            [currentStorageKey]: [...(prev[currentStorageKey] || []), newItem]
        }));
        setActiveTool(null);
        setSelectedId(newItem.id);
        setEditMode(true);
        setSearchIds([]);
        setInteractionMode('MOVE');
    };

    const handleUpdateItem = (id, x, z) => {
        setAllFloorData(prev => ({
            ...prev,
            [currentStorageKey]: prev[currentStorageKey].map(item => item.id === id ? { ...item, x, z } : item)
        }));
    };

    const handleUpdateProps = (updatedItem) =>
        setAllFloorData(prev => ({
            ...prev,
            [currentStorageKey]: prev[currentStorageKey].map(item => item.id === updatedItem.id ? updatedItem : item)
        }));

    const handleDeleteItem = () => {
        if (!selectedId) return;
        setAllFloorData(prev => ({
            ...prev,
            [currentStorageKey]: prev[currentStorageKey].filter(item => item.id !== selectedId)
        }));
        setSelectedId(null);
    };

    const handleDragStart = () => { if (orbitControlsRef.current) orbitControlsRef.current.enabled = false; };
    const handleDragEnd = () => { if (orbitControlsRef.current) orbitControlsRef.current.enabled = true; };

    const renderToolbar = () => (
        <div className="flex items-center gap-2 px-2 w-full whitespace-nowrap">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 mr-2 flex-shrink-0">
                <button
                    onClick={() => setInteractionMode('MOVE')}
                    title="이동 모드"
                    className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${interactionMode === 'MOVE' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    <MousePointer2 size={12} />
                    <span className="hidden 2xl:inline">이동</span>
                </button>
                <button
                    onClick={() => { setInteractionMode('PROP'); setActiveTool(null); }}
                    title="속성 편집"
                    className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${interactionMode === 'PROP' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    <Edit3 size={12} />
                    <span className="hidden 2xl:inline">속성</span>
                </button>
            </div>

            <div className="w-px h-4 bg-gray-300 mx-1 flex-shrink-0"></div>

            {TOOL_HIERARCHY.map((category, index) => {
                const isLastItem = index >= TOOL_HIERARCHY.length - 1;
                return (
                    <div key={category.id} className="relative flex-shrink-0">
                        <ToolBtn
                            label={category.label}
                            icon={category.icon}
                            active={activeCategory === category.id}
                            onClick={() => { setActiveCategory(activeCategory === category.id ? null : category.id); if (activeCategory !== category.id) setInteractionMode('MOVE'); }}
                            hasDropdown
                        />
                        {activeCategory === category.id && (
                            <div className={`fixed mt-2 w-40 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-[9999] flex flex-col p-1 animate-fade-in-up`} style={{ position: 'absolute', top: '100%' }}>
                                {category.children.map((child, idx) => (<DropdownItem key={idx} item={child} onSelect={(type) => { setActiveTool(type); setActiveCategory(null); setInteractionMode('MOVE'); }} />))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    const currentBuilding = BUILDING_STRUCTURE.find(b => b.id === activeBuildingId);

    return (
        <div className="h-full flex flex-col bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 shrink-0">
                <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide border-b border-zinc-100 dark:border-zinc-800">
                    {BUILDING_STRUCTURE.map((building) => (
                        <button
                            key={building.id}
                            onClick={() => setActiveBuildingId(building.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                                ${activeBuildingId === building.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                                }`}
                        >
                            <Building size={14} />
                            {building.name}
                        </button>
                    ))}
                </div>

                <div className="flex items-center h-12 px-4 gap-4">
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex-shrink-0">
                        {currentBuilding?.floors.map(floor => (
                            <button
                                key={floor}
                                onClick={() => { setActiveFloorId(floor); setSelectedId(null); }}
                                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1
                                    ${activeFloorId === floor
                                        ? 'bg-white dark:bg-zinc-700 shadow text-indigo-600 dark:text-indigo-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                                    }`}
                            >
                                <Layers size={12} />
                                {floor}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 flex-shrink-0"></div>

                    {editMode ? (
                        <div className="flex-1 mx-2 overflow-visible min-w-0 flex items-center">
                            {renderToolbar()}
                        </div>
                    ) : (
                        <>
                            <div className="relative group flex-1 max-w-xs ml-4">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="설비 검색..."
                                    className="w-full pl-8 pr-2 py-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                            <div className="flex-1"></div>
                        </>
                    )}

                    <button
                        onClick={() => { setEditMode(!editMode); setActiveTool(null); setSelectedId(null); setSearchIds([]); setActiveCategory(null); setInteractionMode('MOVE'); }}
                        className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition-colors ml-2 ${editMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50'}`}
                    >
                        <MousePointer2 size={14} />
                        <span className="hidden sm:inline">{editMode ? '종료' : '편집'}</span>
                    </button>

                    <button onClick={handleSave} className="flex-shrink-0 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 ml-1" title="데이터 저장">
                        <Save size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative bg-zinc-200 dark:from-gray-900 dark:to-black">
                {/* 🌟 [New] 라벨 필터 UI (3D 창 좌측 상단) */}
                <LabelFilterPanel
                    categories={equipmentCategories}
                    visibleState={visibleLabels}
                    onToggle={toggleLabelVisibility}
                />
                {editMode && selectedId && selectedItem && interactionMode === 'PROP' && (
                    <PropertyPanel item={selectedItem} onUpdate={handleUpdateProps} onDelete={handleDeleteItem} onClose={() => setSelectedId(null)} />
                )}
                {editMode && activeTool && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-20 flex items-center gap-2 pointer-events-none animate-bounce-small">
                        <Plus size={14} /> 배치 모드: {activeTool}
                    </div>
                )}
                {editMode && clipboard && (
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-bold z-20 pointer-events-none animate-fade-in-up">
                        📋 {clipboard.label} 복사됨 (Ctrl+V)
                    </div>
                )}

                {showToast && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-fade-in-up">
                        <div className="bg-white/20 p-1 rounded-full">
                            <Check size={16} className="text-white" />
                        </div>
                        <span className="font-bold text-sm">맵 데이터가 저장되었습니다!</span>
                    </div>
                )}

                <Canvas shadows camera={{ position: [15, 20, 15], fov: 45 }}>
                    <OrbitControls ref={orbitControlsRef} makeDefault maxPolarAngle={Math.PI / 2.1} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
                    <Environment preset="city" environmentIntensity={0.8} />

                    <FloorPlane onFloorClick={handleAdd} editMode={editMode && activeTool !== null} isDark={isDark} />

                    {(allFloorData[currentStorageKey] || []).map(item => {
                        const isHighlighted = selectedId === item.id || searchIds.includes(item.id);
                        const { id, ...itemData } = item;
                        // 🌟 라벨 표시 여부 계산
                        const category = getCategoryByType(item.type);
                        const showLabel = visibleLabels[category];
                        const props = {
                            ...itemData,
                            position: [Number(item.x), Number(item.y) || 0, Number(item.z)],
                            itemId: item.id,
                            isSelected: isHighlighted,
                            type: item.type,
                            isEditMode: editMode,
                            interactionMode: interactionMode,
                            showLabel: showLabel,
                            onUpdate: handleUpdateItem,
                            onDragStart: handleDragStart,
                            onDragEnd: handleDragEnd,
                            onClick: (e) => { e.stopPropagation(); setSelectedId(item.id); }
                        };

                        if (item.type === 'VALVE_BUTTERFLY_PNEUMATIC') {
                            return <InteractiveObject key={item.id} Component={PneumaticButterflyValve} {...props} />;
                        }
                        if (item.type === 'ELEC_GCB_SYSTEM') {
                            return <InteractiveObject key={item.id} Component={GeneratorBusSystem} {...props} />;
                        }
                        if (item.type === 'HX_DRAIN_COOLER') {
                            return <InteractiveObject key={item.id} Component={DrainCooler} {...props} />;
                        }
                        if (item.type === 'FIRE_SHUTTER') return <InteractiveObject key={item.id} Component={FireShutter} {...props} />;

                        // 🌟 [Optimized] 툴바 계층 구조에 있는 밸브 타입만 렌더링
                        if (['VALVE_MOV', 'VALVE_MULTI_SPRING', 'VALVE_DOUBLE_ACTING', 'VALVE_HYDRAULIC'].includes(item.type)) {
                            return <InteractiveObject key={item.id} Component={ValvePin} {...props} />;
                        }
                        if (item.type === 'LCP') return <InteractiveObject key={item.id} Component={LocalControlPanel} {...props} />;
                        if (item.type.includes('PUMP')) return <InteractiveObject key={item.id} Component={IndustrialPump} type={item.type === 'PUMP_VERT' ? 'PUMP_VERTICAL' : 'PUMP_HORIZONTAL'} {...props} />;
                        if (item.type.includes('HX')) return <InteractiveObject key={item.id} Component={HeatExchanger} type={item.type} {...props} />;
                        if (['TANK_VERTICAL', 'TANK_SQUARE'].includes(item.type)) {
                            return <InteractiveObject key={item.id} Component={StorageTank} {...props} />;
                        }
                        if (item.type === 'FAN_CENTRIFUGAL') {
                            return <InteractiveObject key={item.id} Component={IndustrialFan} {...props} />;
                        }
                        if (item.type === 'FILTER_DP') {
                            return <InteractiveObject key={item.id} Component={DifferentialFilter} {...props} />;
                        }
                        if (item.type.includes('STAIRS')) return <InteractiveObject key={item.id} Component={Stairs} {...props} />;
                        if (item.type === 'DOOR') return <InteractiveObject key={item.id} Component={SecurityDoor} {...props} />;
                        if (item.type === 'LADDER') return <InteractiveObject key={item.id} Component={VerticalLadder} {...props} />;
                        if (item.type === 'STEEL_GRATING') return <InteractiveObject key={item.id} Component={SteelGrating} {...props} />;
                        return null;
                    })}
                    <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={60} blur={2} far={4} />
                </Canvas>
            </div>
        </div>
    );
};

const ToolBtn = ({ label, active, onClick, icon: Icon, hasDropdown }) => (
    <button
        onClick={onClick}
        title={label}
        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 
        ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
    >
        {Icon && <Icon size={14} />}
        <span className="hidden 2xl:inline">{label}</span>
        {hasDropdown && <ChevronDown size={12} className={`transition-transform ${active ? 'rotate-180' : ''}`} />}
    </button>
);

const DropdownItem = ({ item, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (item.hasSubMenu) {
        return (
            <div
                className="relative"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <button
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex justify-between items-center transition-colors
                    ${isOpen
                            ? 'bg-zinc-100 dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700'
                        }`}
                >
                    {item.label}
                    <ChevronRight size={12} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                    <div className="w-full pl-2 pr-1 mt-1 space-y-1 animate-fade-in-down origin-top">
                        <div className="border-l-2 border-zinc-200 dark:border-zinc-600 pl-1 py-1">
                            {item.children.map((subItem, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(subItem.type);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-md transition-colors flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-500 shrink-0"></div>
                                    <span className="truncate">{subItem.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => onSelect(item.type)}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors hover:text-indigo-600"
        >
            {item.label}
        </button>
    );
};

export default FieldMapContainer;