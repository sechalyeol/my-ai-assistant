// Last Updated: 2025-12-29 11:51:53
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Environment } from '@react-three/drei';
import { 
    Database, LayoutTemplate, MousePointer2, Edit3, 
    Save, X, Search, ChevronRight, ChevronDown, 
    Trash2, Plus 
} from 'lucide-react';
import * as THREE from 'three';

// 🌟 데이터 파일 import
import mapData from '../../../data/mapData.json';

// -----------------------------------------------------------------------------
// 🛠️ 툴바 계층 구조 정의
// -----------------------------------------------------------------------------
const TOOL_HIERARCHY = [
    {
        id: 'EQUIPMENT',
        label: '설비',
        icon: Database,
        children: [
            { label: '밸브', type: 'VALVE_PIN' },
            { label: '탱크', type: 'TANK' },
            { 
                label: '펌프', 
                hasSubMenu: true,
                children: [
                    { label: '수평형', type: 'PUMP_HORIZ' },
                    { label: '수직형', type: 'PUMP_VERT' }
                ]
            },
            { 
                label: '열교환기', 
                hasSubMenu: true,
                children: [
                    { label: '판형', type: 'HX_PLATE' },
                    { label: '쉘앤튜브', type: 'HX_SHELL' }
                ]
            }
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

// -----------------------------------------------------------------------------
// 🏭 3D Components & Logic
// -----------------------------------------------------------------------------

const Label = ({ text, selected, hovered, height }) => {
    if (!text || text.trim() === "") return null;
    const isVisible = selected || hovered;
    if (!isVisible) return null;

    return (
        <Html position={[0, height + 0.5, 0]} center zIndexRange={[100, 0]}>
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap shadow-sm backdrop-blur-sm pointer-events-none select-none
                ${selected ? 'bg-indigo-600 text-white border-indigo-400 scale-110 z-50' : 'bg-black/70 text-white border-white/20 z-10'}`}>
                {text}
            </div>
        </Html>
    );
};

// 🌟 InteractiveObject: 드래그 및 클릭 로직
const InteractiveObject = ({ Component, itemId, isEditMode, interactionMode, onUpdate, onDragStart, onDragEnd, onClick, ...props }) => {
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
            // 드래그 평면 높이 보정 (지하/공중 물체 대응)
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

    return (
        <Component 
            {...props} 
            isHovered={isHovered} 
            onHoverChange={setIsHovered}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onClick={handleClick}
        />
    );
};

// --- 3D 모델 컴포넌트 (모두 투명 히트박스 포함됨) ---

const SteelGrating = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, scale=1, ...props }) => {
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
            <mesh position={[0, 0.11, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow><planeGeometry args={[3.8, 3.8]} /><meshStandardMaterial map={texture} transparent={true} alphaTest={0.1} side={THREE.DoubleSide} metalness={0.8} roughness={0.2} /></mesh>
            {/* 🌟 히트박스 */}
            <mesh position={[0, 0.1, 0]}><boxGeometry args={[4, 0.5, 4]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} height={0.5} />
        </group>
    );
};

const ValvePin = ({ position, rotation, label, status, onClick, isSelected, isHovered, onHoverChange }) => {
    const color = status === 'WARNING' ? '#ef4444' : (isSelected ? '#4f46e5' : '#10b981');
    const groupRef = useRef(); const ringRef = useRef();
    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        if (ringRef.current) {
            const scale = (isSelected || isHovered) ? 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2 : 1;
            ringRef.current.scale.set(scale, scale, 1);
            ringRef.current.material.opacity = (isSelected || isHovered) ? 0.5 : 0.2;
        }
    });
    return (
        <group ref={groupRef} position={position} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }}>
            <group position={[0, 2, 0]}>
                <mesh castShadow><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSelected ? 0.8 : 0.2} /></mesh>
                <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1.1, 32]} /><meshBasicMaterial color="white" transparent opacity={0.2} side={THREE.DoubleSide} /></mesh>
                <mesh position={[0, -1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color={color} /></mesh>
            </group>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 0.6, 32]} /><meshBasicMaterial color={color} transparent opacity={0.6} /></mesh>
            {/* 🌟 히트박스 */}
            <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[1, 1, 3.5]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} height={3.2} />
        </group>
    );
};

const VerticalLadder = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, scale = 1, ...props }) => {
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
            {/* 🌟 히트박스 */}
            <mesh position={[0, HEIGHT/2, 0.2]}><boxGeometry args={[WIDTH + 0.6, HEIGHT, 1]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} height={HEIGHT * scale + 0.5} />
        </group>
    );
};

const Stairs = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange }) => {
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
        <group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }}>
            <group position={[0, STEP_HEIGHT / 2, 0]}>{steps}</group>
            {/* 🌟 히트박스: 계단 전체를 감싸는 경사 박스 */}
            <mesh position={[0, STEPS*STEP_HEIGHT/2, STEPS*STEP_DEPTH/2]} rotation={[0.5, 0, 0]}><boxGeometry args={[WIDTH + 1, STEPS*STEP_HEIGHT*2, STEPS*STEP_DEPTH + 2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} height={STEPS * STEP_HEIGHT + 2} />
        </group>
    );
};

const SecurityDoor = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
    const WIDTH = 4.0; const HEIGHT = 6.0; const THICKNESS = 0.25; const FRAME_THICK = 0.4; 
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }}>
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
            {/* 🌟 히트박스: 문 전체 영역 */}
            <mesh position={[0, HEIGHT/2, 0]}><boxGeometry args={[WIDTH + 2, HEIGHT, 2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} height={HEIGHT + 2.0} />
        </group>
    );
};

const FireShutter = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
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
            <group position={[0, OPEN_H + BOX_H / 2, 0]}><mesh castShadow receiveShadow><boxGeometry args={[OPEN_W + RAIL_W * 2 + 0.5, BOX_H, DEPTH + 0.2]} /><meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} /></mesh><mesh position={[0, 0, DEPTH/2 + 0.11]}><planeGeometry args={[OPEN_W - 2, BOX_H - 0.5]} /><meshStandardMaterial color="#475569" metalness={0.5} /></mesh></group>
            <group><mesh position={[-(OPEN_W + RAIL_W) / 2, OPEN_H / 2, 0]} castShadow><boxGeometry args={[RAIL_W, OPEN_H, DEPTH]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} /></mesh><mesh position={[(OPEN_W + RAIL_W) / 2, OPEN_H / 2, 0]} castShadow><boxGeometry args={[RAIL_W, OPEN_H, DEPTH]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} /></mesh></group>
            <group position={[0, OPEN_H / 2, -0.1]}><mesh receiveShadow castShadow><planeGeometry args={[OPEN_W, OPEN_H]} /><meshStandardMaterial map={shutterTexture} metalness={0.8} roughness={0.4} side={THREE.DoubleSide} /></mesh><mesh position={[0, -OPEN_H/2 + 0.2, 0.1]} castShadow><boxGeometry args={[OPEN_W, 0.4, DEPTH/2]} /><meshStandardMaterial color="#1e293b" metalness={0.9} /></mesh></group>
            <group position={[OPEN_W / 2 + RAIL_W + 0.5, 1.5, 0]}><mesh castShadow><boxGeometry args={[0.6, 1.0, 0.3]} /><meshStandardMaterial color="#ca8a04" /></mesh><mesh position={[0, 0.2, 0.16]}><boxGeometry args={[0.2, 0.2, 0.1]} /><meshStandardMaterial color="#dc2626" /></mesh><mesh position={[0, -0.2, 0.16]}><boxGeometry args={[0.2, 0.2, 0.1]} /><meshStandardMaterial color="#16a34a" /></mesh></group>
            {/* 🌟 히트박스 */}
            <mesh position={[0, totalHeight/2, 0]}><boxGeometry args={[OPEN_W + 2, totalHeight, DEPTH + 1]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            <Label text={label} selected={isSelected} hovered={isHovered} height={totalHeight + 1.0} />
        </group>
    );
};

const IndustrialPump = ({ position, rotation, type, scale = 1, label, status, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
    const isVertical = type === 'PUMP_VERTICAL' || type === 'PUMP_VERT';
    const color = status === 'WARNING' ? '#ef4444' : (isSelected ? '#4f46e5' : '#3b82f6');
    const metalColor = "#64748b"; const darkMetal = "#1e293b";
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            {isVertical ? (
                <group position={[0, 2, 0]}>
                    <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[1, 1, 2.5, 32]} /><meshStandardMaterial color={metalColor} roughness={0.5} /></mesh>
                    <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[1.1, 1.1, 2, 8]} /><meshStandardMaterial color={metalColor} wireframe /></mesh>
                    <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.8, 0.6, 1]} /><meshStandardMaterial color="#f97316" /></mesh>
                    <mesh position={[0, -1.2, 0]}><cylinderGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color={color} /></mesh>
                    <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 4]} /><meshStandardMaterial color={darkMetal} /></mesh>
                    <mesh position={[2, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                    <mesh position={[-2, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh>
                    <mesh position={[0, -2.5, 0]}><boxGeometry args={[1.5, 1, 1.5]} /><meshStandardMaterial color="#334155" /></mesh>
                    {/* 🌟 히트박스 (수직 펌프) */}
                    <mesh position={[0, 0, 0]}><boxGeometry args={[4.5, 6, 2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
                </group>
            ) : (
                <group position={[0, 0.8, 0]}>
                    <mesh position={[0, -0.6, 0]} receiveShadow><boxGeometry args={[5.5, 0.3, 2]} /><meshStandardMaterial color="#1e293b" /></mesh>
                    <group position={[-1.5, 0.5, 0]}><mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1, 1, 2.5, 32]} /><meshStandardMaterial color={metalColor} /></mesh><mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.05, 1.05, 0.5]} /><meshStandardMaterial color="#334155" /></mesh><mesh position={[0.5, 1, 0.5]}><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color={metalColor} /></mesh></group>
                    <mesh position={[0.2, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 1.2, 16, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} /></mesh>
                    <group position={[1.8, 0.5, 0]}><mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1.2, 1.2, 0.8, 32]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.4, 0.5, 1.5]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 2, 0]}><cylinderGeometry args={[0.7, 0.7, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.6, 1]} /><meshStandardMaterial color={color} /></mesh><mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.8, 0.8, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh></group>
                    {/* 🌟 히트박스 (수평 펌프) */}
                    <mesh position={[0, 0.5, 0]}><boxGeometry args={[6, 3, 3]} /><meshBasicMaterial transparent opacity={0} /></mesh>
                </group>
            )}
            <Label text={label} selected={isSelected} hovered={isHovered} height={isVertical ? 5 : 3.5} />
        </group>
    );
};

const HeatExchanger = ({ position, rotation, type, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
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
                    {/* 🌟 히트박스 (판형) */}
                    <mesh position={[0, 0, 0]}><boxGeometry args={[2.5, 4, 3]} /><meshBasicMaterial transparent opacity={0} /></mesh>
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
                    {/* 🌟 히트박스 (쉘앤튜브) */}
                    <mesh position={[0, 0, 0]}><boxGeometry args={[8, 3.5, 3.5]} /><meshBasicMaterial transparent opacity={0} /></mesh>
                </group>
            )}
            <Label text={label} selected={isSelected} hovered={isHovered} height={isPlate ? 4.5 : 4.5} />
        </group>
    );
};

const StorageTank = ({ position, rotation, scale = 1, label, onClick, isSelected, isHovered, onHoverChange, ...props }) => {
    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>
            <group position={[0, 2, 0]}>
                <mesh castShadow><cylinderGeometry args={[1.8, 1.8, 3.5, 32]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} /></mesh>
                <mesh position={[0, 1.75, 0]}><sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} /></mesh>
                <mesh position={[0, -1.75, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} /></mesh>
                {[45, 135, 225, 315].map(deg => { const rad = deg * Math.PI / 180; return (<mesh key={deg} position={[Math.sin(rad) * 1.5, -2.5, Math.cos(rad) * 1.5]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 1.8]} /><meshStandardMaterial color="#475569" /></mesh>) })}
                {/* 🌟 히트박스 (탱크) */}
                <mesh position={[0, 0, 0]}><cylinderGeometry args={[2, 2, 6]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            </group>
            <Label text={label} selected={isSelected} hovered={isHovered} height={6} />
        </group>
    );
};

// 🌟 [수정] 바닥 평면: 가시성 개선
const FloorPlane = ({ onFloorClick, editMode, isDark }) => {
    const [texture, setTexture] = useState(null);
    useEffect(() => { 
        new THREE.TextureLoader().load('/floor_plan.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; setTexture(t); }, undefined, () => setTexture(null)); 
    }, []);
    const floorColor = isDark ? "#0f172a" : "#64748b"; 
    const gridColor1 = isDark ? "#1e293b" : "#94a3b8"; 
    const gridColor2 = isDark ? "#334155" : "#cbd5e1"; 
    return (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={(e) => { if (!editMode || e.button !== 0 || e.delta > 2) return; e.stopPropagation(); onFloorClick(e.point); }}>
            <planeGeometry args={[100, 100]} />
            {texture ? <meshStandardMaterial map={texture} transparent opacity={0.9} side={THREE.DoubleSide} /> : <meshStandardMaterial color={floorColor} roughness={0.8} metalness={0.1} />}
            <gridHelper args={[100, 20, gridColor1, gridColor2]} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]} />
        </mesh>
    );
};

const PropertyPanel = ({ item, onUpdate, onDelete, onClose }) => {
    if (!item) return null;
    return (
        <div className="absolute top-20 right-4 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 z-20 animate-fade-in-right">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2"><Edit3 size={16} className="text-indigo-500" /> 속성 편집</h3>
                <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-zinc-600" /></button>
            </div>
            <div className="space-y-4">
                <div><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">설비 명칭</label><input type="text" value={item.label || ""} onChange={(e) => onUpdate({ ...item, label: e.target.value })} className="w-full text-sm p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-black outline-none text-zinc-900 dark:text-zinc-100" /></div>
                <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">높이</label><span className="text-[10px] font-mono text-zinc-500">{item.y || 0}m</span></div><input type="range" min="-10" max="20" step="0.5" value={item.y || 0} onChange={(e) => onUpdate({ ...item, y: parseFloat(e.target.value) })} className="w-full h-1 bg-zinc-200 rounded-lg cursor-pointer" /></div>
                <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">크기</label><span className="text-[10px] font-mono text-zinc-500">x{item.scale || 1}</span></div><input type="range" min="0.5" max="3.0" step="0.1" value={item.scale || 1} onChange={(e) => onUpdate({ ...item, scale: parseFloat(e.target.value) })} className="w-full h-1 bg-zinc-200 rounded-lg cursor-pointer" /></div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">회전</label>
                    <div className="flex gap-2">
                        <button onClick={() => onUpdate({ ...item, rotation: (item.rotation - Math.PI / 2) })} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition-colors">↺ -90°</button>
                        <button onClick={() => onUpdate({ ...item, rotation: (item.rotation + Math.PI / 2) })} className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold transition-colors">↻ +90°</button>
                    </div>
                </div>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2"><button onClick={onDelete} className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Trash2 size={14} /> 설비 삭제</button></div>
            </div>
        </div>
    );
};

const FieldMapContainer = ({ workData }) => {
    const [allFloorData, setAllFloorData] = useState(() => {
        let initData = mapData;
        if (workData && workData.mapData) initData = workData.mapData;
        else { const saved = localStorage.getItem('myFieldMapData'); if (saved) initData = JSON.parse(saved); }
        const normalizedData = {};
        const floors = Object.keys(initData).length > 0 ? Object.keys(initData) : ["3F", "2F", "1F", "B1"];
        floors.forEach(floor => {
            const items = initData[floor] || [];
            normalizedData[floor] = items.map((item, index) => ({
                ...item,
                id: item.id || `static_${floor}_${index}_${Date.now()}`,
                x: Number(item.x) || 0,
                y: Number(item.y) || 0,
                z: Number(item.z) || 0,
                rotation: Number(item.rotation) || 0,
                scale: Number(item.scale) || 1,
                label: item.label || 'Unknown'
            }));
        });
        return normalizedData;
    });
    useEffect(() => { localStorage.setItem('myFieldMapData', JSON.stringify(allFloorData)); }, [allFloorData]);
    const [activeFloor, setActiveFloor] = useState("2F");
    const [editMode, setEditMode] = useState(false);
    const [interactionMode, setInteractionMode] = useState('MOVE');
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDarkMode(); const observer = new MutationObserver(checkDarkMode); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); return () => observer.disconnect();
    }, []);
    const [activeTool, setActiveTool] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchIds, setSearchIds] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const orbitControlsRef = useRef(null);
    const selectedItem = useMemo(() => allFloorData[activeFloor]?.find(item => item.id === selectedId), [allFloorData, activeFloor, selectedId]);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedId) { const item = allFloorData[activeFloor]?.find(i => i.id === selectedId); if (item) setClipboard(item); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard && editMode) { const newItem = { ...clipboard, id: Date.now(), x: clipboard.x + 2, z: clipboard.z + 2, label: `${clipboard.label} (Copy)` }; setAllFloorData(prev => ({ ...prev, [activeFloor]: [...(prev[activeFloor] || []), newItem] })); setSelectedId(newItem.id); }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editMode) handleDeleteItem();
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, activeFloor, clipboard, allFloorData, editMode]);
    const handleSearch = () => {
        if (!searchInput.trim()) { setSearchIds([]); return; }
        const term = searchInput.toLowerCase(); let firstMatchFloor = null; const newSearchIds = [];
        Object.keys(allFloorData).forEach(floor => { const matches = allFloorData[floor].filter(item => item.label && item.label.toLowerCase().includes(term)); if (matches.length > 0) { if (!firstMatchFloor) firstMatchFloor = floor; matches.forEach(m => newSearchIds.push(m.id)); } });
        if (newSearchIds.length > 0) { setSearchIds(newSearchIds); setSelectedId(null); const currentFloorHasMatch = allFloorData[activeFloor].some(item => newSearchIds.includes(item.id)); if (!currentFloorHasMatch && firstMatchFloor) setActiveFloor(firstMatchFloor); } else { alert("검색 결과가 없습니다."); setSearchIds([]); }
    };
    const handleSave = () => { console.log("Saving Data:", allFloorData); alert("데이터가 저장(업데이트) 되었습니다."); };
    const handleAdd = (point) => {
        if (!activeTool) return;
        const newItem = { id: Date.now(), type: activeTool, x: Math.round(point.x), y: 0, z: Math.round(point.z), rotation: 0, scale: 1, label: `New Item`, status: 'NORMAL' };
        setAllFloorData(prev => ({ ...prev, [activeFloor]: [...(prev[activeFloor] || []), newItem] }));
        setActiveTool(null); setSelectedId(newItem.id); setEditMode(true); setSearchIds([]); setInteractionMode('MOVE');
    };
    const handleUpdateItem = (id, x, z) => { setAllFloorData(prev => ({ ...prev, [activeFloor]: prev[activeFloor].map(item => item.id === id ? { ...item, x, z } : item) })); };
    const handleUpdateProps = (updatedItem) => setAllFloorData(prev => ({ ...prev, [activeFloor]: prev[activeFloor].map(item => item.id === updatedItem.id ? updatedItem : item) }));
    const handleDeleteItem = () => { if (!selectedId) return; setAllFloorData(prev => ({ ...prev, [activeFloor]: prev[activeFloor].filter(item => item.id !== selectedId) })); setSelectedId(null); };
    const handleDragStart = () => { if (orbitControlsRef.current) orbitControlsRef.current.enabled = false; };
    const handleDragEnd = () => { if (orbitControlsRef.current) orbitControlsRef.current.enabled = true; };
    const renderToolbar = () => (
        <div className="flex items-center gap-2 px-2 overflow-visible">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 mr-2">
                <button onClick={() => setInteractionMode('MOVE')} className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${interactionMode === 'MOVE' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}><MousePointer2 size={12} /> 이동</button>
                <button onClick={() => { setInteractionMode('PROP'); setActiveTool(null); }} className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${interactionMode === 'PROP' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}><Edit3 size={12} /> 속성</button>
            </div>
            <div className="w-px h-4 bg-gray-300 mx-1 flex-shrink-0"></div>
            {TOOL_HIERARCHY.map((category, index) => {
                const isLastItem = index >= TOOL_HIERARCHY.length - 1;
                return (<div key={category.id} className="relative"><ToolBtn label={category.label} icon={category.icon} active={activeCategory === category.id} onClick={() => { setActiveCategory(activeCategory === category.id ? null : category.id); if (activeCategory !== category.id) setInteractionMode('MOVE'); }} hasDropdown />{activeCategory === category.id && (<div className={`absolute top-full mt-2 w-40 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 flex flex-col p-1 animate-fade-in-up ${isLastItem ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}>{category.children.map((child, idx) => (<DropdownItem key={idx} item={child} onSelect={(type) => { setActiveTool(type); setActiveCategory(null); setInteractionMode('MOVE'); }} />))}</div>)}</div>);
            })}
        </div>
    );
    return (
        <div className="h-full flex flex-col bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
            <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 z-10 shrink-0 gap-4 overflow-visible">
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex-shrink-0">{Object.keys(allFloorData).sort().reverse().map(floor => (<button key={floor} onClick={() => { setActiveFloor(floor); setSelectedId(null); }} className={`px-3 py-1 text-xs font-bold rounded ${activeFloor === floor ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>{floor}</button>))}</div>
                <div className="w-px h-6 bg-zinc-200 flex-shrink-0"></div>
                {!editMode && (<div className="relative group flex-1 max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={14} /><input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="설비 검색..." className="w-full pl-8 pr-2 py-1.5 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>)}
                <div className="flex-1"></div>
                <button onClick={() => { setEditMode(!editMode); setActiveTool(null); setSelectedId(null); setSearchIds([]); setActiveCategory(null); setInteractionMode('MOVE'); }} className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition-colors ${editMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}><MousePointer2 size={14} /> {editMode ? '편집 종료' : '편집 모드'}</button>
                {editMode && renderToolbar()}
                <button onClick={handleSave} className="flex-shrink-0 p-2 hover:bg-zinc-100 rounded-lg text-zinc-500" title="데이터 저장"><Save size={18} /></button>
            </div>
            <div className="flex-1 relative bg-zinc-200 dark:from-gray-900 dark:to-black">
                {editMode && selectedId && selectedItem && interactionMode === 'PROP' && <PropertyPanel item={selectedItem} onUpdate={handleUpdateProps} onDelete={handleDeleteItem} onClose={() => setSelectedId(null)} />}
                {editMode && activeTool && (<div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-20 flex items-center gap-2 pointer-events-none animate-bounce-small"><Plus size={14} /> 배치 모드: {activeTool}</div>)}
                {editMode && clipboard && (<div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-bold z-20 pointer-events-none animate-fade-in-up">📋 {clipboard.label} 복사됨 (Ctrl+V)</div>)}
                <Canvas shadows camera={{ position: [15, 20, 15], fov: 45 }}>
                    <OrbitControls ref={orbitControlsRef} makeDefault maxPolarAngle={Math.PI / 2.1} />
                    <ambientLight intensity={0.5} /> <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow /> <Environment preset="city" environmentIntensity={0.8} />
                    <FloorPlane onFloorClick={handleAdd} editMode={editMode && activeTool !== null} isDark={isDark} />
                    {(allFloorData[activeFloor] || []).map(item => {
                        const isHighlighted = selectedId === item.id || searchIds.includes(item.id);
                        const { id, ...itemData } = item;
                        const props = { ...itemData, position: [Number(item.x), Number(item.y) || 0, Number(item.z)], itemId: item.id, isSelected: isHighlighted, isEditMode: editMode, interactionMode: interactionMode, onUpdate: handleUpdateItem, onDragStart: handleDragStart, onDragEnd: handleDragEnd, onClick: (e) => { e.stopPropagation(); setSelectedId(item.id); } };
                        if (item.type === 'FIRE_SHUTTER') return <InteractiveObject key={item.id} Component={FireShutter} {...props} />;
                        if (item.type === 'VALVE_PIN') return <InteractiveObject key={item.id} Component={ValvePin} {...props} />;
                        if (item.type.includes('PUMP')) return <InteractiveObject key={item.id} Component={IndustrialPump} type={item.type === 'PUMP_VERT' ? 'PUMP_VERTICAL' : 'PUMP_HORIZONTAL'} {...props} />;
                        if (item.type.includes('HX')) return <InteractiveObject key={item.id} Component={HeatExchanger} type={item.type} {...props} />;
                        if (item.type === 'TANK') return <InteractiveObject key={item.id} Component={StorageTank} {...props} />;
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
const ToolBtn = ({ label, active, onClick, icon: Icon, hasDropdown }) => (<button onClick={onClick} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{Icon && <Icon size={14} />}{label}{hasDropdown && <ChevronDown size={12} className={`transition-transform ${active ? 'rotate-180' : ''}`} />}</button>);
const DropdownItem = ({ item, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);
    if (item.hasSubMenu) { return (<div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}><button className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg flex justify-between items-center transition-colors">{item.label}<ChevronRight size={12} className="text-gray-400" /></button>{isHovered && (<div className="absolute left-full top-0 ml-1 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-1 animate-fade-in-left">{item.children.map((subItem, idx) => (<button key={idx} onClick={() => onSelect(subItem.type)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors hover:text-indigo-600">{subItem.label}</button>))}</div>)}</div>); }
    return (<button onClick={() => onSelect(item.type)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors hover:text-indigo-600">{item.label}</button>);
};

export default FieldMapContainer;