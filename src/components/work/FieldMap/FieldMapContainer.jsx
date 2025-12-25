// Last Updated: 2025-12-26 02:32:54
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture, ContactShadows, Environment } from '@react-three/drei';
import { Layers, Box, Circle, Copy, Trash2, RotateCw, Ruler, Save, ArrowUpCircle, MousePointer2, MoveVertical, MapPin, X, Edit3, Search, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

// 💾 [정상 데이터]
const INITIAL_DATA = {
    "2F": [],
    "1F": [
        { "id": 1766672583278, "type": "DOOR", "x": 50, "z": 0, "rotation": 1.5707963267948966, "scale": 3, "label": "지역난방설비동 방면 출입문", "status": "NORMAL" },
        { "id": 1766672590947, "type": "DOOR", "x": 35, "z": 50, "rotation": 3.141592653589793, "scale": 3, "label": "#1 GT Gas Skid 방면 출입문", "status": "NORMAL" },
        { "id": 1766672597907, "type": "DOOR", "x": -27, "z": 50, "rotation": 3.141592653589793, "scale": 3, "label": "Heat Pump 방면 출입문", "status": "NORMAL" },
        { "id": 1766672612071, "type": "DOOR", "x": -22, "z": -50, "rotation": 3.141592653589793, "scale": 3, "label": "창고정비동 방면 출입문", "status": "NORMAL" },
        { "id": 1766672639615, "type": "PUMP_HORIZ", "x": 44, "z": -45, "rotation": 4.71238898038469, "scale": 1.5, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766672640467, "type": "PUMP_HORIZ", "x": 37, "z": -45, "rotation": 4.71238898038469, "scale": 1.5, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766672689323, "type": "STAIRS", "x": 38, "z": 43, "rotation": 1.5707963267948966, "scale": 1.5, "label": "#3 DH Heater 방면 계단", "status": "NORMAL" },
        { "id": 1766672704675, "type": "PUMP_HORIZ", "x": 30, "z": -45, "rotation": 4.71238898038469, "scale": 1.5, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766672721683, "type": "HX_PLATE", "x": -9, "z": -30, "rotation": 3.141592653589793, "scale": 2, "label": "#1 Cooling Water Heat Exchanger", "status": "NORMAL" },
        { "id": 1766672757939, "type": "HX_PLATE", "x": -18, "z": -30, "rotation": 3.141592653589793, "scale": 2, "label": "#2 Cooling Water Heat Exchanger", "status": "NORMAL" },
        { "id": 1766672766478, "type": "PUMP_HORIZ", "x": -35, "z": -8, "rotation": 1.5707963267948966, "scale": 2, "label": "#2 Secondary Cooling Water Pump", "status": "NORMAL" },
        { "id": 1766672768947, "type": "PUMP_HORIZ", "x": -35, "z": -30, "rotation": 1.5707963267948966, "scale": 2, "label": "#1 Secondary Cooling Water Pump", "status": "NORMAL" },
        { "id": 1766678839545, "type": "STAIRS", "x": 18, "y": -2, "z": 15, "rotation": 0, "scale": 1, "label": "지하 1층 계단", "status": "NORMAL" },
        { "id": 1766678857277, "type": "STAIRS", "x": -45, "y": 0, "z": 20, "rotation": 3.141592653589793, "scale": 1, "label": "ST 3상분리모선 방면 계단", "status": "NORMAL" },
        { "id": 1766678938905, "type": "STAIRS", "x": -40, "y": 5, "z": 9, "rotation": 0, "scale": 1, "label": "", "status": "NORMAL" },
        { "id": 1766679037619, "type": "HX_SHELL", "x": -20, "y": 3, "z": 25, "rotation": 0, "scale": 0.9, "label": "Drain Cooler", "status": "NORMAL" },
        { "id": 1766679063179, "type": "TANK", "x": -11, "y": 2.5, "z": 30, "rotation": 0, "scale": 1.5, "label": "Condensate Drain Tank", "status": "NORMAL" },
        { "id": 1766679091666, "type": "VALVE_PIN", "x": -43, "y": 1, "z": -35, "rotation": 0, "scale": 0.9, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679094916, "type": "VALVE_PIN", "x": -43, "y": 1, "z": -17, "rotation": 0, "scale": 0.9, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679350607, "type": "VALVE_PIN", "x": 28, "y": 0, "z": -15, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679351487, "type": "VALVE_PIN", "x": 28, "y": 0, "z": -12, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679352729, "type": "VALVE_PIN", "x": 28, "y": 0, "z": -9, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679362807, "type": "VALVE_PIN", "x": 28, "y": 0, "z": -6, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679372183, "type": "VALVE_PIN", "x": 45, "y": 0, "z": 7, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679373995, "type": "VALVE_PIN", "x": 45, "y": 0, "z": 10, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679375502, "type": "VALVE_PIN", "x": 45, "y": 0, "z": 13, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679377503, "type": "VALVE_PIN", "x": 45, "y": 0, "z": 16, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679444455, "type": "VALVE_PIN", "x": 45, "y": 0, "z": 19, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679766514, "type": "LADDER", "x": -5, "y": 0, "z": 27, "rotation": 0, "scale": 1, "label": "", "status": "NORMAL" },
        { "id": 1766679821031, "type": "VALVE_PIN", "x": -7, "y": 5, "z": 26, "rotation": 0, "scale": 0.5, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766680576181, "type": "HX_SHELL", "x": 1, "y": 0, "z": 1, "rotation": -1.5707963267948966, "scale": 2, "label": "#1 DH Heater", "status": "NORMAL" }
    ],
    "B1": [
        { "id": 1766679123780, "type": "STAIRS", "x": 21, "y": 0, "z": 12, "rotation": 0, "scale": 0.9, "label": "New STAIRS", "status": "NORMAL" },
        { "id": 1766679130550, "type": "PUMP_VERT", "x": 2, "y": 0, "z": 8, "rotation": 0, "scale": 0.9, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679131691, "type": "PUMP_VERT", "x": 2, "y": 0, "z": 0, "rotation": 0, "scale": 0.9, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679132650, "type": "PUMP_VERT", "x": 2, "y": 0, "z": -8, "rotation": 0, "scale": 0.9, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679133875, "type": "PUMP_VERT", "x": 2, "y": 0, "z": -15, "rotation": 0, "scale": 0.9, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679141739, "type": "VALVE_PIN", "x": 7, "y": 0, "z": 8, "rotation": 0, "scale": 0.9, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679143022, "type": "VALVE_PIN", "x": 7, "y": 0, "z": 0, "rotation": 0, "scale": 0.9, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679144791, "type": "VALVE_PIN", "x": 7, "y": 0, "z": -8, "rotation": 0, "scale": 0.9, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679146907, "type": "VALVE_PIN", "x": 7, "y": 0, "z": -15, "rotation": 0, "scale": 0.9, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679236330, "type": "PUMP_HORIZ", "x": -6, "y": 0, "z": 22, "rotation": 0, "scale": 0.6, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679239867, "type": "PUMP_HORIZ", "x": -6, "y": 0, "z": 18, "rotation": 0, "scale": 0.6, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679250111, "type": "VALVE_PIN", "x": -1, "y": 0, "z": 27, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679252126, "type": "VALVE_PIN", "x": 5, "y": 0, "z": 26, "rotation": 0, "scale": 0.6, "label": "New VALVE", "status": "NORMAL" },
        { "id": 1766679263979, "type": "PUMP_VERT", "x": -13, "y": 0, "z": -25, "rotation": 0, "scale": 0.6, "label": "New PUMP", "status": "NORMAL" },
        { "id": 1766679265814, "type": "PUMP_VERT", "x": -9, "y": 0, "z": -25, "rotation": 0, "scale": 0.6, "label": "New PUMP", "status": "NORMAL" }
    ]
};

// -----------------------------------------------------------------------------

// 🏭 [High-Fidelity 3D Component Library]

// -----------------------------------------------------------------------------



/**

 * 🪜 수직 사다리 (Vertical Ladder) - 안전 케이지 포함

 */

const VerticalLadder = ({ position, rotation, label, onClick, isSelected }) => {

    const HEIGHT = 5;

    const WIDTH = 0.8;

    const STEPS = 15;

    const RUNG_SPACING = HEIGHT / STEPS;



    return (

        <group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick}>

            <group position={[0, HEIGHT / 2, 0]}>

                <mesh position={[-WIDTH / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, HEIGHT]} /><meshStandardMaterial color="#475569" /></mesh>

                <mesh position={[WIDTH / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, HEIGHT]} /><meshStandardMaterial color="#475569" /></mesh>

                {Array.from({ length: STEPS }).map((_, i) => (

                    <mesh key={i} position={[0, (i - STEPS / 2) * RUNG_SPACING, 0]} rotation={[0, 0, Math.PI / 2]}>

                        <cylinderGeometry args={[0.03, 0.03, WIDTH]} />

                        <meshStandardMaterial color="#cbd5e1" />

                    </mesh>

                ))}

                <mesh position={[0, HEIGHT / 2 - 0.5, -0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6]} /><meshStandardMaterial color="#334155" /></mesh>

                <mesh position={[0, -HEIGHT / 2 + 0.5, -0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.6]} /><meshStandardMaterial color="#334155" /></mesh>

            </group>

            <group position={[0, HEIGHT - 1.5, 0.5]}>

                {[0, 0.8, 1.6].map((y, i) => (

                    <group key={i} position={[0, y, 0]}>

                        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.03, 8, 24, Math.PI]} /><meshStandardMaterial color="#f59e0b" /></mesh>

                        <mesh position={[-0.5, 0.4, 0]}><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#f59e0b" /></mesh>

                        <mesh position={[0.5, 0.4, 0]}><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#f59e0b" /></mesh>

                        <mesh position={[0, 0.4, 0.5]}><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#f59e0b" /></mesh>

                    </group>

                ))}

            </group>

            <Label text={label} selected={isSelected} height={HEIGHT + 0.5} />

        </group>

    );

};



// 📍 밸브 핀

const ValvePin = ({ position, rotation, label, status, onClick, isSelected }) => {

    const color = status === 'WARNING' ? '#ef4444' : (isSelected ? '#4f46e5' : '#10b981');

    return (

        <group position={position} onClick={onClick}>

            <group position={[0, 2, 0]}>

                <mesh castShadow><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} /></mesh>

                <mesh><ringGeometry args={[0.4, 0.8, 32]} /><meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.8} /></mesh>

                <mesh position={[0, -1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color={color} /></mesh>

            </group>

            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 0.6, 32]} /><meshBasicMaterial color={color} transparent opacity={0.6} /></mesh>

            <Label text={label} selected={isSelected} height={3.2} />

        </group>

    );

};



// 🪜 계단 (Stairs) - 통합 버전

const Stairs = ({ position, rotation, label, onClick, isSelected }) => {

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

    return (<group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick}><group position={[0, STEP_HEIGHT / 2, 0]}>{steps}</group><Label text={label} selected={isSelected} height={STEPS * STEP_HEIGHT + 2} /></group>);

};



// 🚪 출입문

const SecurityDoor = ({ position, rotation, label, onClick, isSelected }) => {

    const WIDTH = 1.5; const HEIGHT = 2.5; const THICKNESS = 0.1; const FRAME_THICK = 0.15;

    return (<group position={position} rotation={[0, rotation || 0, 0]} onClick={onClick}><group position={[0, HEIGHT / 2, 0]}><mesh position={[0, HEIGHT / 2, 0]} castShadow><boxGeometry args={[WIDTH + FRAME_THICK * 2, FRAME_THICK, 0.2]} /><meshStandardMaterial color="#334155" /></mesh><mesh position={[-(WIDTH + FRAME_THICK) / 2, 0, 0]} castShadow><boxGeometry args={[FRAME_THICK, HEIGHT, 0.2]} /><meshStandardMaterial color="#334155" /></mesh><mesh position={[(WIDTH + FRAME_THICK) / 2, 0, 0]} castShadow><boxGeometry args={[FRAME_THICK, HEIGHT, 0.2]} /><meshStandardMaterial color="#334155" /></mesh></group><group position={[0, HEIGHT / 2, 0]}><mesh castShadow receiveShadow><boxGeometry args={[WIDTH, HEIGHT, THICKNESS]} /><meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.7} /></mesh><mesh position={[0, 0.5, 0]}><boxGeometry args={[0.8, 0.8, THICKNESS + 0.02]} /><meshStandardMaterial color="#93c5fd" transparent opacity={0.6} /></mesh><mesh position={[0.6, -0.1, 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.3]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh></group><group position={[WIDTH / 2 + 0.4, 1.4, 0.05]}><mesh><boxGeometry args={[0.2, 0.3, 0.05]} /><meshStandardMaterial color="#1e293b" /></mesh><mesh position={[0, 0.1, 0.03]}><circleGeometry args={[0.03, 16]} /><meshBasicMaterial color="#3b82f6" toneMapped={false} /></mesh></group><group position={[0, HEIGHT + 0.3, 0.05]}><mesh><boxGeometry args={[0.8, 0.25, 0.05]} /><meshStandardMaterial color="#14532d" /></mesh><mesh position={[0, 0.05, 0.03]}><planeGeometry args={[0.7, 0.15]} /><meshBasicMaterial color="#22c55e" toneMapped={false} /></mesh></group><Label text={label} selected={isSelected} height={HEIGHT + 0.8} /></group>);

};



// 🔄 펌프

const IndustrialPump = ({ position, rotation, type, scale = 1, label, status, onClick, isSelected }) => {

    const isVertical = type === 'PUMP_VERTICAL';

    const color = status === 'WARNING' ? '#ef4444' : (isSelected ? '#4f46e5' : '#3b82f6');

    const metalColor = "#64748b"; const darkMetal = "#1e293b";

    return (<group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick}>{isVertical ? (<group position={[0, 2, 0]}><mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[1, 1, 2.5, 32]} /><meshStandardMaterial color={metalColor} roughness={0.5} /></mesh><mesh position={[0, 1.5, 0]}><cylinderGeometry args={[1.1, 1.1, 2, 8]} /><meshStandardMaterial color={metalColor} wireframe /></mesh><mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.8, 0.6, 1]} /><meshStandardMaterial color="#f97316" /></mesh><mesh position={[0, -1.2, 0]}><cylinderGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 4]} /><meshStandardMaterial color={darkMetal} /></mesh><mesh position={[2, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[-2, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.2]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[0, -2.5, 0]}><boxGeometry args={[1.5, 1, 1.5]} /><meshStandardMaterial color="#334155" /></mesh></group>) : (<group position={[0, 0.8, 0]}><mesh position={[0, -0.6, 0]} receiveShadow><boxGeometry args={[5.5, 0.3, 2]} /><meshStandardMaterial color="#1e293b" /></mesh><group position={[-1.5, 0.5, 0]}><mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1, 1, 2.5, 32]} /><meshStandardMaterial color={metalColor} /></mesh><mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.05, 1.05, 0.5]} /><meshStandardMaterial color="#334155" /></mesh><mesh position={[0.5, 1, 0.5]}><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color={metalColor} /></mesh></group><mesh position={[0.2, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 1.2, 16, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} /></mesh><group position={[1.8, 0.5, 0]}><mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1.2, 1.2, 0.8, 32]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.4, 0.5, 1.5]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 2, 0]}><cylinderGeometry args={[0.7, 0.7, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh><mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.6, 1]} /><meshStandardMaterial color={color} /></mesh><mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.8, 0.8, 0.1]} /><meshStandardMaterial color="#94a3b8" /></mesh></group></group>)}<Label text={label} selected={isSelected} height={isVertical ? 5 : 3.5} /></group>);

};



// 🌡️ 열교환기

const HeatExchanger = ({ position, rotation, type, scale = 1, label, onClick, isSelected }) => {

    const isPlate = type === 'HX_PLATE'; const metal = "#94a3b8"; const frameColor = "#0f172a";

    return (<group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick}>{isPlate ? (<group position={[0, 1.5, 0]}><mesh position={[0, 0, 1.2]} castShadow><boxGeometry args={[1.8, 3.5, 0.2]} /><meshStandardMaterial color={frameColor} /></mesh><mesh position={[0, 0, -1.2]} castShadow><boxGeometry args={[1.8, 3.5, 0.2]} /><meshStandardMaterial color={frameColor} /></mesh><mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 3]} /><meshStandardMaterial color="#cbd5e1" /></mesh><mesh position={[0, -1.6, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 3]} /><meshStandardMaterial color="#cbd5e1" /></mesh><mesh position={[0, 0, 0]}><boxGeometry args={[1.6, 3.2, 2.2]} /><meshStandardMaterial color="#cbd5e1" /></mesh><mesh position={[1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#475569" /></mesh><mesh position={[-1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#475569" /></mesh>{[[0.5, 1.2], [-0.5, 1.2], [0.5, -1.2], [-0.5, -1.2]].map((pos, idx) => (<group key={idx} position={[pos[0], pos[1], 1.3]} rotation={[Math.PI / 2, 0, 0]}><mesh><cylinderGeometry args={[0.25, 0.25, 0.4]} /><meshStandardMaterial color={metal} /></mesh><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.4, 0.4, 0.05]} /><meshStandardMaterial color={metal} /></mesh></group>))}<mesh position={[0, -1.85, 1.2]}><boxGeometry args={[0.5, 0.5, 0.1]} /><meshStandardMaterial color={frameColor} /></mesh><mesh position={[0, -1.85, -1.2]}><boxGeometry args={[0.5, 0.5, 0.1]} /><meshStandardMaterial color={frameColor} /></mesh></group>) : (<group position={[0, 1.8, 0]}><mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.6, 1.6, 7, 32]} /><meshStandardMaterial color="#e2e8f0" metalness={0.4} /></mesh><mesh position={[3.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}><sphereGeometry args={[1.65, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#475569" /></mesh><mesh position={[-3.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><sphereGeometry args={[1.65, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#475569" /></mesh><mesh position={[-2, 1.5, 0]}><cylinderGeometry args={[0.6, 0.6, 1.2]} /><meshStandardMaterial color={metal} /></mesh><mesh position={[2, -1.5, 0]}><cylinderGeometry args={[0.6, 0.6, 1.2]} /><meshStandardMaterial color={metal} /></mesh><mesh position={[-2.5, -1.8, 0]}><boxGeometry args={[0.8, 1.2, 2.5]} /><meshStandardMaterial color="#334155" /></mesh><mesh position={[2.5, -1.8, 0]}><boxGeometry args={[0.8, 1.2, 2.5]} /><meshStandardMaterial color="#334155" /></mesh></group>)}<Label text={label} selected={isSelected} height={isPlate ? 4.5 : 4.5} /></group>);

};



// 🛢️ 탱크

const StorageTank = ({ position, rotation, scale = 1, label, onClick, isSelected }) => {

    return (<group position={position} rotation={[0, rotation || 0, 0]} scale={[scale, scale, scale]} onClick={onClick}><group position={[0, 2, 0]}><mesh castShadow><cylinderGeometry args={[1.8, 1.8, 3.5, 32]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} /></mesh><mesh position={[0, 1.75, 0]}><sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} /></mesh><mesh position={[0, -1.75, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.3} /></mesh>{[45, 135, 225, 315].map(deg => { const rad = deg * Math.PI / 180; return (<mesh key={deg} position={[Math.sin(rad) * 1.5, -2.5, Math.cos(rad) * 1.5]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 1.8]} /><meshStandardMaterial color="#475569" /></mesh>) })}</group><Label text={label} selected={isSelected} height={6} /></group>);

};



const Label = ({ text, selected, height }) => (

    <Html position={[0, height, 0]} center zIndexRange={[100, 0]}><div className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all whitespace-nowrap shadow-sm backdrop-blur-sm pointer-events-none ${selected ? 'bg-indigo-600 text-white border-indigo-400 scale-110' : 'bg-black/50 text-white border-white/20'}`}>{text}</div></Html>

);



const FloorPlane = ({ onFloorClick, editMode }) => {

    const [texture, setTexture] = useState(null);

    useEffect(() => { new THREE.TextureLoader().load('/floor_plan.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; setTexture(t); }, undefined, () => setTexture(null)); }, []);

    return (

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={(e) => { if (!editMode || e.button !== 0 || e.delta > 2) return; e.stopPropagation(); onFloorClick(e.point); }}>

            <planeGeometry args={[100, 100]} />

            {texture ? <meshStandardMaterial map={texture} transparent opacity={0.9} side={THREE.DoubleSide} /> : <meshStandardMaterial color="#e2e8f0" />}

            <gridHelper args={[100, 20, 0x94a3b8, 0xe2e8f0]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />

        </mesh>

    );

};



// =============================================================================

// 🎛️ 속성 편집 패널 (Side Panel)

// =============================================================================

const PropertyPanel = ({ item, onUpdate, onDelete, onClose }) => {

    if (!item) return null;



    return (

        <div className="absolute top-20 right-4 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 z-20 animate-fade-in-right">

            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">

                <h3 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">

                    <Edit3 size={16} className="text-indigo-500" /> 속성 편집

                </h3>

                <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-zinc-600" /></button>

            </div>



            <div className="space-y-4">

                {/* 1. 이름 변경 */}

                <div>

                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">설비 명칭 (Label)</label>

                    <input

                        type="text"

                        value={item.label}

                        onChange={(e) => onUpdate({ ...item, label: e.target.value })}

                        className="w-full text-sm p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-indigo-500 outline-none"

                    />

                </div>



                {/* 2. 높이 (Elevation) */}

                <div>

                    <div className="flex justify-between mb-1">

                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">높이 (Elevation)</label>

                        <span className="text-[10px] font-mono text-zinc-500">{item.y || 0}m</span>

                    </div>

                    <input

                        type="range" min="-10" max="20" step="0.5"

                        value={item.y || 0}

                        onChange={(e) => onUpdate({ ...item, y: parseFloat(e.target.value) })}

                        className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"

                    />

                </div>



                {/* 3. 크기 (Scale) */}

                <div>

                    <div className="flex justify-between mb-1">

                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">크기 (Scale)</label>

                        <span className="text-[10px] font-mono text-zinc-500">x{item.scale || 1}</span>

                    </div>

                    <input

                        type="range" min="0.5" max="3.0" step="0.1"

                        value={item.scale || 1}

                        onChange={(e) => onUpdate({ ...item, scale: parseFloat(e.target.value) })}

                        className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer"

                    />

                </div>



                {/* 4. 회전 (Rotation) */}

                <div>

                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">회전 (Rotation)</label>

                    <div className="flex gap-2">

                        <button

                            onClick={() => onUpdate({ ...item, rotation: (item.rotation - Math.PI / 2) })}

                            className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"

                        >

                            ↺ -90°

                        </button>

                        <button

                            onClick={() => onUpdate({ ...item, rotation: (item.rotation + Math.PI / 2) })}

                            className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"

                        >

                            ↻ +90°

                        </button>

                    </div>

                </div>



                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">

                    <button

                        onClick={onDelete}

                        className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2"

                    >

                        <Trash2 size={14} /> 설비 삭제

                    </button>

                </div>

            </div>

        </div>

    );

};



// =============================================================================

// 🎬 Main Logic

// =============================================================================



const FieldMapContainer = () => {

    // localStorage 데이터 연동

    const [allFloorData, setAllFloorData] = useState(() => {

        const saved = localStorage.getItem('myFieldMapData');

        return saved ? JSON.parse(saved) : INITIAL_DATA;

    });



    useEffect(() => { localStorage.setItem('myFieldMapData', JSON.stringify(allFloorData)); }, [allFloorData]);



    const [activeFloor, setActiveFloor] = useState("2F");

    const [editMode, setEditMode] = useState(false);

    const [activeTool, setActiveTool] = useState(null); // 현재 선택된 도구 (배치용)

    const [selectedId, setSelectedId] = useState(null); // 현재 선택된 설비 (수정용)



    // 선택된 아이템 데이터 찾기

    const selectedItem = useMemo(() =>

        allFloorData[activeFloor]?.find(item => item.id === selectedId),

        [allFloorData, activeFloor, selectedId]);



    // ➕ 설비 추가 (바닥 클릭 시)

    const handleAdd = (point) => {

        if (!activeTool) return; // 도구가 선택되지 않았으면 무시



        const newItem = {

            id: Date.now(),

            type: activeTool,

            x: Math.round(point.x),

            y: 0, // 기본 높이

            z: Math.round(point.z),

            rotation: 0,

            scale: 1,

            label: `New ${activeTool.split('_')[0]}`, // 기본 이름

            status: 'NORMAL'

        };

        setAllFloorData(prev => ({ ...prev, [activeFloor]: [...(prev[activeFloor] || []), newItem] }));



        // 추가 후 도구 해제할지, 유지할지는 선택 사항 (여기선 유지)

    };



    // ✏️ 설비 수정 (속성 패널에서 호출)

    const handleUpdateItem = (updatedItem) => {

        setAllFloorData(prev => ({

            ...prev,

            [activeFloor]: prev[activeFloor].map(item => item.id === updatedItem.id ? updatedItem : item)

        }));

    };



    // 🗑️ 설비 삭제

    const handleDeleteItem = () => {

        if (!selectedId) return;

        setAllFloorData(prev => ({ ...prev, [activeFloor]: prev[activeFloor].filter(item => item.id !== selectedId) }));

        setSelectedId(null);

    };



    const handleExport = () => {

        navigator.clipboard.writeText(JSON.stringify(allFloorData, null, 4));

        alert("데이터 복사 완료! 코드의 INITIAL_DATA에 붙여넣으세요.");

    };



    return (

        <div className="h-full flex flex-col bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">



            {/* 🛠️ 상단 툴바 (단순화됨: 도구 선택만 남김) */}

            <div className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 z-10 shrink-0 gap-4">

                {/* 1. 층 선택 */}

                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex-shrink-0">

                    {Object.keys(INITIAL_DATA).map(floor => (

                        <button key={floor} onClick={() => { setActiveFloor(floor); setSelectedId(null); }} className={`px-3 py-1 text-xs font-bold rounded ${activeFloor === floor ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>{floor}</button>

                    ))}

                </div>



                <div className="w-px h-6 bg-zinc-200 flex-shrink-0"></div>



                {/* 2. 편집 모드 토글 */}

                <button onClick={() => { setEditMode(!editMode); setActiveTool(null); setSelectedId(null); }} className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition-colors ${editMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}>

                    <MousePointer2 size={14} /> {editMode ? '편집 종료' : '편집 모드'}

                </button>



                {/* 3. 도구 리스트 (편집 모드일 때만, 가로 스크롤) */}

                {editMode && (

                    <div className="flex-1 overflow-x-auto flex items-center gap-2 pb-1 scrollbar-hide px-2">

                        <ToolBtn label="선택 (Select)" active={activeTool === null} onClick={() => setActiveTool(null)} />

                        <div className="w-px h-4 bg-gray-300 mx-1 flex-shrink-0"></div>

                        <ToolBtn label="📍 밸브 핀" active={activeTool === 'VALVE_PIN'} onClick={() => setActiveTool('VALVE_PIN')} />

                        <ToolBtn label="수평 펌프" active={activeTool === 'PUMP_HORIZ'} onClick={() => setActiveTool('PUMP_HORIZ')} />

                        <ToolBtn label="수직 펌프" active={activeTool === 'PUMP_VERT'} onClick={() => setActiveTool('PUMP_VERT')} />

                        <ToolBtn label="탱크" active={activeTool === 'TANK'} onClick={() => setActiveTool('TANK')} />

                        <ToolBtn label="판형 HX" active={activeTool === 'HX_PLATE'} onClick={() => setActiveTool('HX_PLATE')} />

                        <ToolBtn label="쉘앤튜브 HX" active={activeTool === 'HX_SHELL'} onClick={() => setActiveTool('HX_SHELL')} />

                        <ToolBtn label="출입문" active={activeTool === 'DOOR'} onClick={() => setActiveTool('DOOR')} />

                        <ToolBtn label="계단" active={activeTool === 'STAIRS'} onClick={() => setActiveTool('STAIRS')} />

                        <ToolBtn label="사다리" active={activeTool === 'LADDER'} onClick={() => setActiveTool('LADDER')} />

                    </div>

                )}



                {/* 4. Export (우측 고정) */}

                <button onClick={handleExport} className="flex-shrink-0 ml-auto p-2 hover:bg-zinc-100 rounded-lg text-zinc-500" title="데이터 내보내기">

                    <Save size={18} />

                </button>

            </div>



            {/* 3D 뷰어 */}

            <div className="flex-1 relative bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black">



                {/* 🖥️ 속성 편집 패널 (선택 시 우측에 등장) */}

                {editMode && selectedId && selectedItem && (

                    <PropertyPanel

                        item={selectedItem}

                        onUpdate={handleUpdateItem}

                        onDelete={handleDeleteItem}

                        onClose={() => setSelectedId(null)}

                    />

                )}



                {/* 안내 메시지 */}

                {editMode && !selectedId && (

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-4 py-1.5 rounded-full text-xs backdrop-blur-sm pointer-events-none">

                        {activeTool ? `🖱️ 바닥을 클릭하여 [${activeTool}] 배치` : '👆 설비를 클릭하여 속성 편집'}

                    </div>

                )}



                <Canvas shadows camera={{ position: [15, 20, 15], fov: 45 }}>

                    <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />

                    <ambientLight intensity={0.7} />

                    <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />

                    <Environment preset="city" />



                    <FloorPlane onFloorClick={handleAdd} editMode={editMode} />



                    {(allFloorData[activeFloor] || []).map(item => {

                        const props = {

                            key: item.id,

                            position: [item.x, item.y || 0, item.z],

                            rotation: item.rotation,

                            scale: item.scale,

                            label: item.label,

                            status: item.status,

                            isSelected: selectedId === item.id,

                            onClick: (e) => {

                                e.stopPropagation();

                                if (editMode) {

                                    setActiveTool(null); // 편집하려 클릭했으니 도구 선택 해제

                                    setSelectedId(item.id);

                                }

                            }

                        };



                        if (item.type === 'VALVE_PIN') return <ValvePin {...props} />;

                        if (item.type.includes('PUMP')) return <IndustrialPump type={item.type === 'PUMP_VERT' ? 'PUMP_VERTICAL' : 'PUMP_HORIZONTAL'} {...props} />;

                        if (item.type.includes('HX')) return <HeatExchanger type={item.type} {...props} />;

                        if (item.type === 'TANK') return <StorageTank {...props} />;

                        if (item.type.includes('STAIRS')) return <Stairs {...props} />;

                        if (item.type === 'DOOR') return <SecurityDoor {...props} />;

                        if (item.type === 'LADDER') return <VerticalLadder {...props} />;

                        return null;

                    })}

                    <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={60} blur={2} far={4} />

                </Canvas>

            </div>

        </div>

    );

};



const ToolBtn = ({ label, active, onClick }) => (

    <button onClick={onClick} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-all flex-shrink-0 ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>

        {label}

    </button>

);



export default FieldMapContainer;