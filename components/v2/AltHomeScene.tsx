'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ChannelWithLive } from '../../app/admin/gods-eye/page';
import { useRouter } from 'next/navigation';

interface AltHomeSceneProps {
    channels: ChannelWithLive[];
}

const FloatingChannel = ({ channel, index, total, onClick }: { channel: ChannelWithLive, index: number, total: number, onClick: (id: string) => void }) => {
    const [hovered, setHovered] = useState(false);
    
    const videoUrl = channel.liveProgram?.videoId 
        ? `https://www.youtube.com/embed/${channel.liveProgram.videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${channel.liveProgram.videoId}` 
        : '';

    // Layout: Curved Wall (2 rows)
    const itemsPerRow = Math.ceil(total / 2);
    const row = index < itemsPerRow ? 0 : 1;
    const col = index % itemsPerRow;
    
    // Spread them in an arc
    const arcSpread = Math.PI * 0.95; // ~170 degrees spread (wider)
    const startAngle = -arcSpread / 2;
    const angleStep = itemsPerRow > 1 ? arcSpread / (itemsPerRow - 1) : 0;
    const angle = startAngle + col * angleStep;
    
    const radius = 22; // Bigger circle for more horizontal space
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius + 10; // push forward a bit to compensate for bigger radius
    const y = row === 0 ? 4.5 : -4.5; // More vertical spacing

    return (
        <group position={[x, y, z]} rotation={[0, -angle, 0]}>
            {/* Gentle float, no crazy orbiting */}
            <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
                {/* 3D Frame - Always visible */}
                <mesh 
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
                    onClick={(e) => { e.stopPropagation(); onClick(channel.id); }}
                    position={[0, 0, -0.1]}
                >
                    <boxGeometry args={[6.4, 5.2, 0.2]} />
                    <meshStandardMaterial 
                        color={hovered ? "#00FF4F" : "#050505"} 
                        emissive={hovered ? "#00FF4F" : "#00FF4F"}
                        emissiveIntensity={hovered ? 0.6 : 0.15}
                        wireframe={!hovered}
                    />
                </mesh>

                {/* Brutalist HTML Card */}
                <Html transform center distanceFactor={16} zIndexRange={[100, 0]}>
                    <div 
                        onClick={() => onClick(channel.id)}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        className={`w-[400px] h-[320px] border-4 flex flex-col p-4 transition-all duration-200 cursor-pointer pointer-events-auto ${
                            hovered 
                            ? 'bg-[#00FF4F] border-[#00FF4F] text-black shadow-[0_0_40px_rgba(0,255,79,0.8)] scale-105' 
                            : 'bg-black/90 border-[#00FF4F] text-[#00FF4F] shadow-[0_0_15px_rgba(0,255,79,0.3)] backdrop-blur-md'
                        }`}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3 shrink-0">
                            <h2 className="text-2xl font-black uppercase font-mono tracking-tighter truncate max-w-[70%]">
                                {channel.name}
                            </h2>
                            <span className={`text-sm px-2 py-1 border font-mono font-bold shrink-0 ${hovered ? 'border-black text-black' : 'border-[#00FF4F] text-[#00FF4F]'}`}>
                                CH_{index.toString().padStart(2, '0')}
                            </span>
                        </div>

                        {/* Video Area */}
                        <div className={`w-full h-[160px] mb-3 relative overflow-hidden border-2 shrink-0 bg-black ${hovered ? 'border-black' : 'border-[#00FF4F]'}`}>
                            {videoUrl ? (
                                <>
                                    <iframe 
                                        src={videoUrl}
                                        className="absolute top-1/2 left-1/2 w-[120%] h-[150%] -translate-x-1/2 -translate-y-1/2 pointer-events-none grayscale-[30%] contrast-125 opacity-80"
                                        style={{ border: 'none' }}
                                        allow="autoplay; encrypted-media"
                                        loading="lazy"
                                    />
                                    {/* Scanline / Color overlay for the video to make it blend with the brutalist theme */}
                                    <div className={`absolute inset-0 pointer-events-none mix-blend-overlay ${hovered ? 'bg-[#00FF4F]/20' : 'bg-[#00FF4F]/10'}`}></div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-mono opacity-70 border border-dashed">
                                    NO SIGNAL
                                </div>
                            )}
                        </div>
                        
                        {/* Info Area */}
                        <div className={`flex-1 flex flex-col justify-end border-l-4 pl-3 pb-1 ${hovered ? 'border-black bg-black/5' : 'border-[#00FF4F] bg-[#00FF4F]/5'}`}>
                            {channel.liveProgram ? (
                                <>
                                    <div className={`text-xs font-bold mb-1 flex items-center gap-2 ${hovered ? 'text-black' : 'text-white'}`}>
                                        <span className={`w-2 h-2 rounded-full animate-pulse ${hovered ? 'bg-black' : 'bg-red-500'}`}></span>
                                        NOW PLAYING
                                    </div>
                                    <p className={`font-mono text-sm line-clamp-1 ${hovered ? 'text-black font-bold' : 'text-[#00FF4F] opacity-80'}`}>
                                        {channel.liveProgram.title}
                                    </p>
                                </>
                            ) : (
                                <div className="text-sm font-mono opacity-70">
                                    OFFLINE
                                </div>
                            )}
                        </div>
                    </div>
                </Html>
            </Float>
        </group>
    );
};

const CoreMonolith = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
            meshRef.current.rotation.x += 0.002;
        }
    });

    return (
        <group>
            <mesh ref={meshRef}>
                <octahedronGeometry args={[2, 0]} />
                <meshStandardMaterial 
                    color="#000000" 
                    emissive="#00FF4F" 
                    emissiveIntensity={0.2} 
                    wireframe 
                    transparent 
                    opacity={0.3}
                />
            </mesh>
            
            <Text
                position={[0, 0, 0]}
                fontSize={1.5}
                color="#00FF4F"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                TVGIBI
            </Text>
        </group>
    );
};

export default function AltHomeScene({ channels }: AltHomeSceneProps) {
    const router = useRouter();

    const handleChannelClick = (id: string) => {
        router.push(`/channels/${id}`);
    };

    return (
        <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
            <color attach="background" args={['#050505']} />
            
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00FF4F" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#FF004F" />

            <Stars radius={50} depth={50} count={3000} factor={4} saturation={1} fade speed={2} />

            <CoreMonolith />

            <group>
                {channels.map((channel, idx) => (
                    <FloatingChannel 
                        key={channel.id} 
                        channel={channel} 
                        index={idx} 
                        total={channels.length} 
                        onClick={handleChannelClick}
                    />
                ))}
            </group>

            {/* OrbitControls for exploration */}
            <OrbitControls 
                enablePan={true}
                enableZoom={true}
                minDistance={5}
                maxDistance={40}
                autoRotate={false}
            />
        </Canvas>
    );
}