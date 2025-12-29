// Last Updated: 2025-12-29 14:52:23
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Environment } from '@react-three/drei';
import {
    Database, LayoutTemplate, MousePointer2, Edit3,
    Save, X, Search, ChevronRight, ChevronDown,
    Trash2, Plus, Building, Layers, Check
} from 'lucide-react';
import * as THREE from 'three';

// 🌟 데이터 파일 import
import mapData from '../../../data/mapData.json';

// -----------------------------------------------------------------------------
// 🏢 건물 및 층 구조 정의
// -----------------------------------------------------------------------------
const BUILDING_STRUCTURE = [
    {
        id: 'STEAM',
        name: '스팀터빈동',
        floors: ['B1', '1F', '2F', '3F']
    },
    {
        id: 'DH',
        name: '지역난방설비동',
        floors: ['1F', '2F']
    },
    {
        id: 'HRSG',
        name: '배열회수보일러동',
        floors: ['1F', '2F', 'RF'] // RF: 최상부층
    }
];

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
            { label: '제어반', type: 'LCP' },
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

// 🌟 InteractiveObject
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

// --- 3D 모델 컴포넌트들 ---

// 🌟 [수정됨] 현장 제어반 (LCP) - 전압/전류계 타입
const LocalControlPanel = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, scale = 1, ...props }) => {
    const width = 1.0;
    const height = 1.8;
    const depth = 0.4;
    const legHeight = 0.2;
    const cabinetColor = "#94a3b8"; // 약간 더 진한 회색 (산업용 도장 느낌)

    return (
        <group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick} onPointerOver={(e) => { e.stopPropagation(); onHoverChange(true); }} onPointerOut={(e) => { e.stopPropagation(); onHoverChange(false); }} {...props}>

            {/* 1. 메인 캐비닛 바디 */}
            <group position={[0, legHeight + height / 2, 0]}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                    <meshStandardMaterial color={cabinetColor} metalness={0.3} roughness={0.4} />
                </mesh>
                {/* 문 틈새 */}
                <mesh position={[0, 0, depth / 2 + 0.005]}>
                    <planeGeometry args={[width - 0.04, height - 0.04]} />
                    <meshStandardMaterial color={cabinetColor} metalness={0.3} roughness={0.4} />
                </mesh>
            </group>

            {/* 2. 상단 계기판 영역 (R, S, T 미터기) */}
            <group position={[0, legHeight + height * 0.75, depth / 2 + 0.02]}>
                {/* 미터기 배경 판넬 (약간 튀어나옴) */}
                <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[0.9, 0.35, 0.02]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>

                {/* 3개의 아날로그 미터 (왼쪽부터 R, S, T) */}
                {[-0.3, 0, 0.3].map((x, i) => (
                    <group key={i} position={[x, 0, 0.01]}>
                        {/* 미터기 테두리 (검은색) */}
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
                            <meshStandardMaterial color="#1e293b" />
                        </mesh>
                        {/* 미터기 유리면 (흰색) */}
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.011, 0]}>
                            <cylinderGeometry args={[0.1, 0.1, 0.02, 32]} />
                            <meshBasicMaterial color="#ffffff" />
                        </mesh>
                        {/* 미터기 바늘 (빨간색, 랜덤한 각도로 회전) */}
                        <mesh rotation={[0, 0, -Math.PI / 4 + (i * 0.5)]} position={[0, 0, 0.022]}>
                            <boxGeometry args={[0.005, 0.08, 0.005]} />
                            <meshBasicMaterial color="#dc2626" />
                        </mesh>
                        {/* 하단 라벨 (R/S/T) 표현 - 작은 사각형 */}
                        <mesh position={[0, -0.15, 0]}>
                            <planeGeometry args={[0.05, 0.03]} />
                            <meshBasicMaterial color="#000000" />
                        </mesh>
                    </group>
                ))}
            </group>

            {/* 3. 중단 조작부 (램프 & 스위치) */}
            <group position={[0, legHeight + height * 0.45, depth / 2 + 0.02]}>
                {/* 상태 표시등 (ON/OFF/TRIP) - 상단 배치 */}
                <group position={[0, 0.15, 0]}>
                    <mesh position={[-0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} /></mesh> {/* Stop (Red) */}
                    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} /></mesh>   {/* Run (Green) */}
                    <mesh position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.6} /></mesh>   {/* Fault (Yellow) */}
                </group>

                {/* 조작 버튼 및 셀렉터 스위치 - 하단 배치 */}
                <group position={[0, -0.15, 0]}>
                    {/* 기동 버튼 (녹색, 튀어나옴) */}
                    <mesh position={[-0.25, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.035, 0.035, 0.04]} />
                        <meshStandardMaterial color="#15803d" />
                    </mesh>
                    {/* 정지 버튼 (적색, 튀어나옴) */}
                    <mesh position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.035, 0.035, 0.04]} />
                        <meshStandardMaterial color="#b91c1c" />
                    </mesh>

                    {/* 전압/전류 전환 셀렉터 스위치 (Cam Switch) */}
                    <group position={[0.2, 0, 0]}>
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.05, 0.05, 0.02]} />
                            <meshStandardMaterial color="#334155" />
                        </mesh>
                        {/* 스위치 손잡이 */}
                        <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 4]}>
                            <boxGeometry args={[0.02, 0.08, 0.02]} />
                            <meshStandardMaterial color="#0f172a" />
                        </mesh>
                    </group>
                </group>
            </group>

            {/* 4. 하단 명판 (Equipment Nameplate) */}
            <group position={[0, legHeight + height * 0.2, depth / 2 + 0.01]}>
                <mesh>
                    <planeGeometry args={[0.6, 0.15]} />
                    <meshStandardMaterial color="#f1f5f9" />
                </mesh>
                {/* 글씨 느낌의 줄무늬 */}
                <mesh position={[0, 0, 0.001]}>
                    <planeGeometry args={[0.4, 0.02]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
            </group>

            {/* 5. 다리 (앵글 베이스) */}
            <group position={[0, legHeight / 2, 0]}>
                <mesh position={[width / 2 - 0.05, 0, depth / 2 - 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
                <mesh position={[-width / 2 + 0.05, 0, depth / 2 - 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
                <mesh position={[width / 2 - 0.05, 0, -depth / 2 + 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
                <mesh position={[-width / 2 + 0.05, 0, -depth / 2 + 0.05]}><boxGeometry args={[0.1, legHeight, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
            </group>

            <Label text={label} selected={isSelected} hovered={isHovered} height={height + legHeight + 0.2} />
        </group>
    );
};

const SteelGrating = ({ position, rotation, label, onClick, isSelected, isHovered, onHoverChange, scale = 1, ...props }) => {
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
            <mesh position={[0, HEIGHT / 2, 0.2]}><boxGeometry args={[WIDTH + 0.6, HEIGHT, 1]} /><meshBasicMaterial transparent opacity={0} /></mesh>
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
            <mesh position={[0, STEPS * STEP_HEIGHT / 2, STEPS * STEP_DEPTH / 2]} rotation={[0.5, 0, 0]}><boxGeometry args={[WIDTH + 1, STEPS * STEP_HEIGHT * 2, STEPS * STEP_DEPTH + 2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
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
            <mesh position={[0, HEIGHT / 2, 0]}><boxGeometry args={[WIDTH + 2, HEIGHT, 2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
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
            <group position={[0, OPEN_H + BOX_H / 2, 0]}><mesh castShadow receiveShadow><boxGeometry args={[OPEN_W + RAIL_W * 2 + 0.5, BOX_H, DEPTH + 0.2]} /><meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} /></mesh><mesh position={[0, 0, DEPTH / 2 + 0.11]}><planeGeometry args={[OPEN_W - 2, BOX_H - 0.5]} /><meshStandardMaterial color="#475569" metalness={0.5} /></mesh></group>
            <group><mesh position={[-(OPEN_W + RAIL_W) / 2, OPEN_H / 2, 0]} castShadow><boxGeometry args={[RAIL_W, OPEN_H, DEPTH]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} /></mesh><mesh position={[(OPEN_W + RAIL_W) / 2, OPEN_H / 2, 0]} castShadow><boxGeometry args={[RAIL_W, OPEN_H, DEPTH]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.5} /></mesh></group>
            <group position={[0, OPEN_H / 2, -0.1]}><mesh receiveShadow castShadow><planeGeometry args={[OPEN_W, OPEN_H]} /><meshStandardMaterial map={shutterTexture} metalness={0.8} roughness={0.4} side={THREE.DoubleSide} /></mesh><mesh position={[0, -OPEN_H / 2 + 0.2, 0.1]} castShadow><boxGeometry args={[OPEN_W, 0.4, DEPTH / 2]} /><meshStandardMaterial color="#1e293b" metalness={0.9} /></mesh></group>
            <group position={[OPEN_W / 2 + RAIL_W + 0.5, 1.5, 0]}><mesh castShadow><boxGeometry args={[0.6, 1.0, 0.3]} /><meshStandardMaterial color="#ca8a04" /></mesh><mesh position={[0, 0.2, 0.16]}><boxGeometry args={[0.2, 0.2, 0.1]} /><meshStandardMaterial color="#dc2626" /></mesh><mesh position={[0, -0.2, 0.16]}><boxGeometry args={[0.2, 0.2, 0.1]} /><meshStandardMaterial color="#16a34a" /></mesh></group>
            <mesh position={[0, totalHeight / 2, 0]}><boxGeometry args={[OPEN_W + 2, totalHeight, DEPTH + 1]} /><meshBasicMaterial transparent opacity={0} /></mesh>
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
                    <mesh position={[0, 0, 0]}><boxGeometry args={[4.5, 6, 2]} /><meshBasicMaterial transparent opacity={0} /></mesh>
                </group>
            ) : (
                <group position={[0, 0.8, 0]}>
                    <mesh position={[0, -0.6, 0]} receiveShadow><boxGeometry args={[5.5, 0.3, 2]} /><meshStandardMaterial color="#1e293b" /></mesh>
                    <group position={[-1.5, 0.5, 0]}><mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1, 1, 2.5, 32]} /><meshStandardMaterial color={metalColor} /></mesh><mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.05, 1.05, 0.5]} /><meshStandardMaterial color="#334155" /></mesh><mesh position={[0.5, 1, 0.5]}><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color={metalColor} /></mesh></group>
                    <mesh position={[0.2, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 1.2, 16, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} /></mesh>
                    <group position={[1.8, 0.5, 0]}><mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1.2, 1.2, 0.8, 32]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.4, 0.5, 1.5]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 2, 0]}><cylinderGeometry args={[0.7, 0.7, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.6, 1]} /><meshStandardMaterial color={color} /></mesh><mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.8, 0.8, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh></group>
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
                <mesh position={[0, 0, 0]}><cylinderGeometry args={[2, 2, 6]} /><meshBasicMaterial transparent opacity={0} /></mesh>
            </group>
            <Label text={label} selected={isSelected} hovered={isHovered} height={6} />
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
            {texture ? <meshStandardMaterial map={texture} transparent opacity={0.9} side={THREE.DoubleSide} /> : <meshStandardMaterial color={floorColor} roughness={0.8} metalness={0.1} />}
            <gridHelper args={[100, 20, gridColor1, gridColor2]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
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
    const [showToast, setShowToast] = useState(false);
    // 🌟 상태: 활성화된 건물 ID (초기값: 첫 번째 건물)
    const [activeBuildingId, setActiveBuildingId] = useState(BUILDING_STRUCTURE[0].id);

    // 🌟 상태: 활성화된 층 ID (초기값: 첫 번째 건물의 첫 번째 층)
    const [activeFloorId, setActiveFloorId] = useState(BUILDING_STRUCTURE[0].floors[0]);

    // 🌟 계산: 데이터 저장을 위한 고유 키 생성 (예: "STEAM-2F")
    const currentStorageKey = useMemo(() => `${activeBuildingId}-${activeFloorId}`, [activeBuildingId, activeFloorId]);

    // 🌟 데이터 로딩 로직: 건물별/층별 데이터 관리
    const [allFloorData, setAllFloorData] = useState(() => {
        let initData = {};

        // 1. 외부 props나 localStorage에서 데이터 로드
        if (workData && workData.mapData) {
            initData = workData.mapData;
        } else {
            const saved = localStorage.getItem('myFieldMapData');
            if (saved) initData = JSON.parse(saved);
        }

        // 2. 데이터 정규화 및 마이그레이션 (기존 '2F' -> 'STEAM-2F'로 매핑)
        const normalizedData = {};
        Object.keys(initData).forEach(key => {
            let newKey = key;
            // 만약 키가 층 이름만 있다면(예: '2F'), 기본 건물(STEAM)에 할당
            if (!key.includes('-') && BUILDING_STRUCTURE[0].floors.includes(key)) {
                newKey = `STEAM-${key}`;
            }

            normalizedData[newKey] = (initData[key] || []).map((item, index) => ({
                ...item,
                id: item.id || `static_${newKey}_${index}_${Date.now()}`,
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

    // 건물이 변경되면 해당 건물의 첫 번째 층으로 자동 선택
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

    // 🌟 선택된 아이템 찾기 (현재 활성화된 Key 기준)
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

            // 현재 화면에 검색 결과가 없다면 해당 층으로 이동
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

    const handleSave = () => {
        // 1. 현재 화면의 데이터(allFloorData)를 파일 구조(배열)로 변환
        const dataToSave = BUILDING_STRUCTURE.map(building => ({
            id: building.id,
            name: building.name,
            floors: building.floors.map(floorId => {
                // 'STEAM-1F' 같은 키를 생성하여 데이터 조회
                const storageKey = `${building.id}-${floorId}`;
                const floorItems = allFloorData[storageKey] || [];

                // 층별 데이터 구조 생성
                return {
                    id: floorId,
                    label: `${floorId}층`, // 필요 시 mapData의 라벨을 가져오도록 개선 가능
                    // 화면상의 모든 아이템을 'valves' 키(또는 items)에 저장
                    valves: floorItems.map(item => ({
                        id: item.id,
                        type: item.type,
                        x: Number(item.x),
                        y: Number(item.y) || 0,
                        z: Number(item.z),
                        rotation: Number(item.rotation) || 0,
                        scale: Number(item.scale) || 1,
                        label: item.label || '', // 🌟 여기서 수정된 명칭(label)이 저장됩니다
                        status: item.status || 'NORMAL'
                    }))
                };
            })
        }));

        console.log("Saving Converted Data:", dataToSave);

        try {
            const { ipcRenderer } = window.require('electron');

            // 변환된 데이터를 저장 요청
            ipcRenderer.send('save-map-data', dataToSave);

            // 토스트 메시지 표시
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);

        } catch (error) {
            console.error("저장 실패:", error);
            alert("저장에 실패했습니다.");
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
        // 🌟 [수정] max-w-full 및 flex-nowrap 추가로 줄바꿈 방지
        <div className="flex items-center gap-2 px-2 w-full whitespace-nowrap">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 mr-2 flex-shrink-0">
                <button
                    onClick={() => setInteractionMode('MOVE')}
                    title="이동 모드"
                    className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${interactionMode === 'MOVE' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    <MousePointer2 size={12} />
                    {/* 화면이 넓을 때(2xl)만 텍스트 표시 */}
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

            {/* 도구 버튼들 */}
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
                        {/* 드롭다운 메뉴 (z-index 높여서 가려짐 방지) */}
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

            {/* 상단: 건물 및 층 선택 영역 */}
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 shrink-0">
                {/* 1. 건물 선택 탭 */}
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

                {/* 2. 층 선택 및 툴바 */}
                <div className="flex items-center h-12 px-4 gap-4">
                    {/* 층 목록 */}
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

                    {/* 중앙 영역: 검색창(일반 모드) 또는 툴바(편집 모드) 표시 */}
                    {editMode ? (
                        // 편집 모드: 툴바를 중앙 넓은 공간에 배치 + 가로 스크롤 허용
                        <div className="flex-1 mx-2 overflow-visible min-w-0 flex items-center">
                            {renderToolbar()}
                        </div>
                    ) : (
                        // 일반 모드: 검색창 표시
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

                    {/* 편집 모드 토글 버튼 */}
                    <button
                        onClick={() => { setEditMode(!editMode); setActiveTool(null); setSelectedId(null); setSearchIds([]); setActiveCategory(null); setInteractionMode('MOVE'); }}
                        className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition-colors ml-2 ${editMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50'}`}
                    >
                        <MousePointer2 size={14} />
                        {/* 화면이 너무 작으면 텍스트 숨김 */}
                        <span className="hidden sm:inline">{editMode ? '종료' : '편집'}</span>
                    </button>

                    {/* 저장 버튼 */}
                    <button onClick={handleSave} className="flex-shrink-0 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 ml-1" title="데이터 저장">
                        <Save size={18} />
                    </button>
                </div>
                {/* 닫는 태그 추가 완료 (Header) */}
            </div>

            {/* 3D Canvas 영역 - 🌟 [수정] Header 밖으로 빼냄 */}
            <div className="flex-1 relative bg-zinc-200 dark:from-gray-900 dark:to-black">
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

                    {/* 선택된 키(건물-층)에 해당하는 데이터만 렌더링 */}
                    {(allFloorData[currentStorageKey] || []).map(item => {
                        const isHighlighted = selectedId === item.id || searchIds.includes(item.id);
                        const { id, ...itemData } = item;
                        const props = {
                            ...itemData,
                            position: [Number(item.x), Number(item.y) || 0, Number(item.z)],
                            itemId: item.id,
                            isSelected: isHighlighted,
                            isEditMode: editMode,
                            interactionMode: interactionMode,
                            onUpdate: handleUpdateItem,
                            onDragStart: handleDragStart,
                            onDragEnd: handleDragEnd,
                            onClick: (e) => { e.stopPropagation(); setSelectedId(item.id); }
                        };

                        if (item.type === 'FIRE_SHUTTER') return <InteractiveObject key={item.id} Component={FireShutter} {...props} />;
                        if (item.type === 'VALVE_PIN') return <InteractiveObject key={item.id} Component={ValvePin} {...props} />;
                        if (item.type === 'LCP') return <InteractiveObject key={item.id} Component={LocalControlPanel} {...props} />;
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

// 툴바 버튼 컴포넌트
const ToolBtn = ({ label, active, onClick, icon: Icon, hasDropdown }) => (
    <button
        onClick={onClick}
        title={label}
        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 
        ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
    >
        {Icon && <Icon size={14} />}
        {/* 여기 클래스가 hidden 2xl:inline 이어야 합니다 */}
        <span className="hidden 2xl:inline">{label}</span>
        {hasDropdown && <ChevronDown size={12} className={`transition-transform ${active ? 'rotate-180' : ''}`} />}
    </button>
);

// src/components/work/FieldMap/FieldMapContainer.jsx 내부

const DropdownItem = ({ item, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);

    if (item.hasSubMenu) {
        return (
            <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <button className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg flex justify-between items-center transition-colors">
                    {item.label}<ChevronRight size={12} className="text-gray-400" />
                </button>
                {isHovered && (
                    /* 🌟 [수정] ml-1 제거 (간격 없애기) */
                    <div className="absolute left-full top-0 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-1 animate-fade-in-left z-[9999]">
                        {item.children.map((subItem, idx) => (
                            <button key={idx} onClick={() => onSelect(subItem.type)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors hover:text-indigo-600">
                                {subItem.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    return (
        <button onClick={() => onSelect(item.type)} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-zinc-700 rounded-lg transition-colors hover:text-indigo-600">
            {item.label}
        </button>
    );
};

export default FieldMapContainer;