'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getChannels, getCurrentProgram } from '../../../lib/api';
import { Channel, Program } from '../../../data/mockData';
import FooterNav from '../../../components/admin-v2/FooterNav';

// Dynamically import the 3D scene to avoid SSR issues with Three.js
const GodsEyeScene = dynamic(() => import('../../../components/gods-eye/GodsEyeScene'), { ssr: false }) as React.ComponentType<{ channels: ChannelWithLive[] }>;

export interface ChannelWithLive extends Channel {
    liveProgram?: Program | null;
}

export default function GodsEyePage() {
    const [channels, setChannels] = useState<ChannelWithLive[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            try {
                const fetchedChannels = await getChannels();
                const channelsWithLive = await Promise.all(
                    fetchedChannels.map(async (ch) => {
                        const { current } = await getCurrentProgram(ch.id);
                        return { ...ch, liveProgram: current };
                    })
                );
                
                if (isMounted) {
                    setChannels(channelsWithLive);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error loading God's Eye data:", err);
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        // Refresh every 30 seconds to keep live programs somewhat updated
        const interval = setInterval(loadData, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-[#00FF4F] flex items-center justify-center font-mono text-2xl tracking-widest">
                <div className="animate-pulse">BAĞLANTI KURULUYOR...</div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-black flex flex-col font-mono relative overflow-hidden">
            {/* Overlay Header */}
            <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-[#00FF4F] tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,79,0.8)]">
                        GOD'S EYE
                    </h1>
                    <p className="text-[#00FF4F] mt-2 opacity-80 uppercase text-sm">
                        Yayın Kontrol Merkezi / Sürüm 2.0
                    </p>
                </div>
                <div className="text-right text-[#00FF4F]">
                    <div className="text-xl font-bold animate-pulse">CANLI (LIVE)</div>
                    <div className="text-xs opacity-70 mt-1">Sistem Aktif</div>
                </div>
            </div>

            {/* 3D Canvas Area */}
            <div className="absolute inset-0 w-full h-full cursor-crosshair">
                <GodsEyeScene channels={channels} />
            </div>
            
            {/* Scanline overlay for that retro feel */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20 opacity-30 mix-blend-overlay"></div>
        </div>
    );
}
