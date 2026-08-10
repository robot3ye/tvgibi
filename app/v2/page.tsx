'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getChannels, getCurrentProgram } from '../../lib/api';
import { ChannelWithLive } from '../admin/gods-eye/page';
import Link from 'next/link';

// Dynamically import the 3D scene to avoid SSR issues
const AltHomeScene = dynamic(() => import('../../components/v2/AltHomeScene'), { ssr: false });

export default function V2HomePage() {
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
                console.error("Error loading v2 home data:", err);
                if (isMounted) setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-[#00FF4F] flex flex-col items-center justify-center font-mono text-xl tracking-widest relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                <div className="animate-pulse mb-4 text-4xl font-black">BOOTING SYSTEM...</div>
                <div className="text-xs opacity-70">Establishing neural link to TVGIBI network</div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-black flex flex-col font-mono relative overflow-hidden">
            {/* 3D Canvas Background */}
            <div className="absolute inset-0 w-full h-full z-0 cursor-crosshair">
                <AltHomeScene channels={channels} />
            </div>
            
            {/* Scanline overlay for that retro feel */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-30 mix-blend-overlay"></div>

            {/* Brutalist 2D Overlay UI */}
            <div className="absolute top-0 left-0 w-full p-6 z-20 pointer-events-none flex justify-between items-start">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-white mix-blend-difference tracking-tighter uppercase">
                        TVGIBI <span className="text-[#00FF4F]">OS_V2</span>
                    </h1>
                    <p className="text-[#00FF4F] mt-2 opacity-80 uppercase text-xs tracking-widest border border-[#00FF4F] inline-block px-2 py-1 bg-black/50 backdrop-blur-sm">
                        CYBERDECK INTERFACE // 3D EXPLORER
                    </p>
                </div>
                
                <div className="text-right text-[#00FF4F] bg-black/50 p-3 border border-[#333] backdrop-blur-sm">
                    <div className="text-sm font-bold">SYSTEM_ONLINE</div>
                    <div className="text-xs opacity-70 mt-1">NODES: {channels.length}</div>
                    <div className="text-xs opacity-70">LATENCY: 12ms</div>
                </div>
            </div>

            {/* Bottom Controls / Marquee */}
            <div className="absolute bottom-0 left-0 w-full z-20 border-t-2 border-[#00FF4F] bg-black/80 backdrop-blur-md">
                <div className="flex items-center">
                    <div className="bg-[#00FF4F] text-black font-black text-sm px-4 py-2 uppercase shrink-0">
                        ANNOUNCEMENT
                    </div>
                    <div className="overflow-hidden whitespace-nowrap w-full text-[#00FF4F] text-sm py-2 px-4 pointer-events-none">
                        <div className="inline-block animate-[marquee_20s_linear_infinite]">
                            WELCOME TO THE NEW 3D EXPLORER. DRAG TO ROTATE THE SPHERE. SCROLL TO ZOOM. CLICK A TERMINAL TO TUNE IN. // SYSTEM IS FULLY OPERATIONAL // ENJOY THE SIMULATION.
                        </div>
                    </div>
                    <div className="shrink-0 px-4 pointer-events-auto">
                        <Link href="/" className="text-xs text-white hover:text-[#00FF4F] border border-white hover:border-[#00FF4F] px-3 py-1 transition-colors uppercase">
                            BACK TO 2D
                        </Link>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}} />
        </div>
    );
}