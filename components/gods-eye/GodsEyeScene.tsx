'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment, ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ChannelWithLive } from '../../app/admin/gods-eye/page';

interface GodsEyeSceneProps {
    channels: ChannelWithLive[];
}

interface MonitorProps {
    channel: ChannelWithLive;
    position: [number, number, number];
    rotation: [number, number, number];
    onClick: (pos: [number, number, number], rot: [number, number, number], channel: ChannelWithLive) => void;
    isActive: boolean;
}

const Monitor = ({ channel, position, rotation, onClick, isActive }: MonitorProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // YouTube iframe URL
    let videoUrl = '';
    if (channel.liveProgram?.videoId) {
        videoUrl = `https://www.youtube.com/embed/${channel.liveProgram.videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${channel.liveProgram.videoId}`;
    }

    const handleClick = (e: any) => {
        e.stopPropagation(); // Prevent clicking behind
        onClick(position, rotation, channel);
    };

    return (
        <group position={position} rotation={rotation}>
            {/* Monitor Frame */}
            <mesh 
                ref={meshRef}
                onClick={handleClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <boxGeometry args={[3.2, 1.8, 0.1]} />
                <meshStandardMaterial 
                    color={isActive ? "#00FF4F" : (hovered ? "#333333" : "#111111")} 
                    metalness={0.8} 
                    roughness={0.2}
                    emissive={isActive ? "#00FF4F" : "#000000"}
                    emissiveIntensity={isActive ? 0.2 : 0}
                />
            </mesh>

            {/* Glowing border if active */}
            {isActive && (
                <mesh position={[0, 0, -0.06]}>
                    <boxGeometry args={[3.4, 2.0, 0.05]} />
                    <meshBasicMaterial color="#00FF4F" wireframe />
                </mesh>
            )}

            {/* Screen Content (Html) */}
            <Html 
                transform 
                position={[0, 0, 0.051]} 
                scale={0.32}
                occlude
            >
                <div 
                    style={{ 
                        width: '640px', 
                        height: '360px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    className={`transition-opacity duration-300 bg-black border-4 ${isActive ? 'border-[#00FF4F] opacity-100' : (hovered ? 'border-[#333] opacity-80' : 'border-[#333] opacity-60')} relative overflow-hidden pointer-events-none`}
                >
                        {videoUrl ? (
                            <iframe 
                                src={videoUrl} 
                                style={{ width: '640px', height: '360px', border: 'none' }}
                                allow="autoplay; encrypted-media" 
                                className="pointer-events-none opacity-80"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[#00FF4F] font-mono border-4 border-dashed border-[#00FF4F]">
                                <h2 className="text-5xl font-black mb-4">SİNYAL YOK</h2>
                                <p className="text-2xl">{channel.name}</p>
                            </div>
                        )}

                        {/* HUD Overlay */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                        
                        <div className="absolute bottom-4 left-4 bg-black/80 border-2 border-[#00FF4F] p-3 text-[#00FF4F] font-mono pointer-events-none">
                            <h3 className="text-2xl font-black uppercase mb-1">{channel.name}</h3>
                            <p className="text-sm">LIVE: {channel.liveProgram?.title || 'YAYIN YOK'}</p>
                        </div>
                    </div>
                </Html>
        </group>
    );
};

// Component to handle camera animation
const CameraRig = ({ targetPosition, targetRotation, controlsRef }: { targetPosition: THREE.Vector3 | null, targetRotation: THREE.Euler | null, controlsRef: React.MutableRefObject<any> }) => {
    const { camera } = useThree();
    
    useFrame((state, delta) => {
        if (targetPosition && targetRotation) {
            // Calculate a point 5 units directly in front of the monitor
            // Using the monitor's rotation to find the "forward" vector
            const forward = new THREE.Vector3(0, 0, 1);
            forward.applyEuler(targetRotation);
            
            const targetCamPos = new THREE.Vector3(
                targetPosition.x + forward.x * 5,
                targetPosition.y + forward.y * 5,
                targetPosition.z + forward.z * 5
            );
            
            camera.position.lerp(targetCamPos, 4 * delta);
            
            // Move OrbitControls target to look at the monitor
            if (controlsRef.current) {
                controlsRef.current.target.lerp(targetPosition, 4 * delta);
            }
        } else {
            // Optional: return to default target when unselected
            if (controlsRef.current) {
                controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 2 * delta);
            }
        }
    });
    
    return null;
};

export default function GodsEyeScene({ channels }: GodsEyeSceneProps) {
    const [activeChannel, setActiveChannel] = useState<ChannelWithLive | null>(null);
    const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
    const [targetRot, setTargetRot] = useState<THREE.Euler | null>(null); // Add target rotation
    const controlsRef = useRef<any>(null);

    const handleMonitorClick = (pos: [number, number, number], rot: [number, number, number], channel: ChannelWithLive) => {
        setActiveChannel(channel);
        setTargetPos(new THREE.Vector3(...pos));
        setTargetRot(new THREE.Euler(...rot));
    };

    const handleBackgroundClick = () => {
        setActiveChannel(null);
        setTargetPos(null);
        setTargetRot(null);
    };

    // Calculate positions in a semicircle
    const radius = 13;
    const monitors = channels.map((channel, index) => {
        const angle = (index / (channels.length > 1 ? channels.length - 1 : 1)) * Math.PI - Math.PI / 2;
        // Map angle from -PI/2 to PI/2
        
        const x = Math.sin(angle) * radius;
        const z = -Math.cos(angle) * radius;
        const y = 0; // Can stagger heights if many channels

        const rotationY = -angle; // Face the center

        return {
            channel,
            position: [x, y, z] as [number, number, number],
            rotation: [0, rotationY, 0] as [number, number, number]
        };
    });

    return (
        <>
            <Canvas 
                camera={{ position: [0, 2, 16], fov: 60 }} 
                onPointerMissed={handleBackgroundClick}
            >
                <color attach="background" args={['#050505']} />
                
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00FF4F" />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* The curved wall of monitors */}
                <group position={[0, 0, 0]}>
                    {monitors.map((m) => (
                        <Monitor 
                            key={m.channel.id}
                            channel={m.channel}
                            position={m.position}
                            rotation={m.rotation}
                            onClick={handleMonitorClick}
                            isActive={activeChannel?.id === m.channel.id}
                        />
                    ))}
                </group>

                {/* Floor reflection for that cyberpunk look */}
                <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={20} blur={2} far={4} />
                
                <gridHelper args={[30, 30, '#00FF4F', '#113311']} position={[0, -2, 0]} />

                <OrbitControls 
                    ref={controlsRef}
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                    minDistance={2}
                    maxDistance={25}
                />

                <CameraRig targetPosition={targetPos} targetRotation={targetRot} controlsRef={controlsRef} />
            </Canvas>

            {/* UI Overlay for active channel */}
            {activeChannel && (
                <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/80 border-2 border-[#00FF4F] p-4 text-[#00FF4F] font-mono pointer-events-none text-center backdrop-blur-sm z-30">
                    <p className="text-sm opacity-70 mb-1">ODAKLANILAN KANAL</p>
                    <h2 className="text-2xl font-black">{activeChannel.name}</h2>
                    {activeChannel.liveProgram && (
                        <p className="mt-2 text-white">Şu an: {activeChannel.liveProgram.title}</p>
                    )}
                </div>
            )}
            
            <div className="absolute bottom-32 right-8 bg-black/60 border border-[#00FF4F]/30 p-4 text-[#00FF4F] font-mono pointer-events-none text-xs z-30">
                <p>MOUSE SOL TIK: Ekrana Odaklan</p>
                <p>BOŞLUĞA TIKLA: Geri Çık</p>
                <p>SÜRÜKLE: Odayı Çevir</p>
                <p>SCROLL: Yakınlaş/Uzaklaş</p>
            </div>
        </>
    );
}
