'use client';

import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Maximize2, Volume2, VolumeX, Plus, Minus, Youtube, Tv, ArrowUp, ExternalLink } from 'lucide-react';
import { Channel, Program } from '../../data/mockData';
import { getCurrentProgram } from '../../lib/api';
import ZappingNoise from '../player/ZappingNoise';
import StablePlayer from '../StablePlayer';
import Link from 'next/link';

interface HeroPlayerProps {
    channels: Channel[];
}

export default function HeroPlayer({ channels }: HeroPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
    const [nextProgram, setNextProgram] = useState<Program | null>(null);
    const [initialOffset, setInitialOffset] = useState<number>(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isFloating, setIsFloating] = useState(false);
    const [floatWidth, setFloatWidth] = useState(320);
    const [isZapping, setIsZapping] = useState(true);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const zapIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);

    const draggableRef = useRef<HTMLDivElement>(null);
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

    const activeChannels = channels.filter(c => c.is_online !== false);

    const loadChannel = async (index: number, background = false) => {
        if (activeChannels.length === 0) return;
        if (!background) setIsZapping(true);
        const channel = activeChannels[index];
        try {
            const data = await getCurrentProgram(channel.id);
            if (!isMounted.current) return;
            
            if (data && data.current) {
                setCurrentProgram(data.current);
                setNextProgram(data.next);
                if (!background) setInitialOffset(data.offset);
            } else {
                setCurrentProgram(null);
                setNextProgram(null);
            }
        } catch (error) {
            console.error("Error fetching program:", error);
            if (isMounted.current) {
                setCurrentProgram(null);
                setNextProgram(null);
            }
        }
        
        if (!background) {
            // Zapping effect duration
            setTimeout(() => {
                if (isMounted.current) setIsZapping(false);
            }, 1000 + Math.random() * 1000);
        }
    };

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        loadChannel(currentIndex);
    }, [currentIndex, activeChannels.length]);

    // Auto-zap every 10s
    useEffect(() => {
        if (activeChannels.length === 0) return;
        
        zapIntervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % activeChannels.length);
        }, 10000);

        return () => {
            if (zapIntervalRef.current) clearInterval(zapIntervalRef.current);
        };
    }, [activeChannels.length]);

    useEffect(() => {
        if (!isFloating) {
            setDragPos({ x: 0, y: 0 });
        }
    }, [isFloating]);

    // PiP Scroll Logic - Reliable alternative to IntersectionObserver
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // If the bottom of the player is scrolled past the top of the screen + 80px buffer
            if (rect.bottom < 80) {
                setIsFloating(true);
            } else {
                setIsFloating(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Check initially

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Program ending check
    useEffect(() => {
        if (!currentProgram) return;

        const interval = setInterval(() => {
            const now = new Date();
            const currentH = now.getHours();
            const currentM = now.getMinutes();
            const currentS = now.getSeconds();
            const currentTotal = currentH * 3600 + currentM * 60 + currentS;

            const [eh, em, es] = currentProgram.endTime.split(':').map(Number);
            let endTotal = eh * 3600 + em * 60 + (es || 0);

            const [sh, sm, ss] = currentProgram.startTime.split(':').map(Number);
            const startTotal = sh * 3600 + sm * 60 + (ss || 0);

            if (endTotal <= startTotal) {
                endTotal += 24 * 3600;
            }

            let checkTotal = currentTotal;
            if (currentTotal < startTotal && currentTotal < 6 * 3600 && startTotal >= 18 * 3600) {
                checkTotal += 24 * 3600;
            }

            if (checkTotal >= endTotal) {
                // Program has ended!
                if (nextProgram) {
                    setIsZapping(true);
                    setCurrentProgram(nextProgram);
                    setInitialOffset(0);
                    setTimeout(() => { if (isMounted.current) setIsZapping(false); }, 1500);
                    
                    // Fetch next program silently in background
                    setTimeout(() => loadChannel(currentIndex, true), 3000);
                } else {
                    // No next program in state, fetch normally
                    loadChannel(currentIndex);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentProgram, nextProgram, currentIndex]);

    const resetZapTimer = () => {
        if (zapIntervalRef.current) clearInterval(zapIntervalRef.current);
        zapIntervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % activeChannels.length);
        }, 10000);
    };

    const handleNextChannel = () => {
        if (activeChannels.length === 0) return;
        resetZapTimer();
        setCurrentIndex((prev) => (prev + 1) % activeChannels.length);
    };

    const handlePrevChannel = () => {
        if (activeChannels.length === 0) return;
        resetZapTimer();
        setCurrentIndex((prev) => (prev - 1 + activeChannels.length) % activeChannels.length);
    };

    const toggleFullscreen = () => {
        const elem = document.getElementById('hero-player-wrapper');
        if (elem) {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(console.error);
            } else {
                elem.requestFullscreen().catch(console.error);
            }
        }
    };

    const openInYouTube = () => {
        if (currentProgram?.videoId) {
            window.open(`https://youtube.com/watch?v=${currentProgram.videoId}`, '_blank');
        }
    };

    const handleDrag = (e: any, data: { x: number; y: number }) => {
        setDragPos({ x: data.x, y: data.y });
    };

    if (activeChannels.length === 0) return null;

    const currentChannel = activeChannels[currentIndex];
    const channelColor = currentChannel.color_primary || currentChannel.color || '#00ff08';

    const playerContent = (
        <div id="hero-player-wrapper" className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden group pointer-events-auto">
            {/* Player itself */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-auto">
                {!isZapping && currentProgram && (
                    <StablePlayer 
                        url={`https://youtube.com/watch?v=${currentProgram.videoId}`}
                        initialStart={initialOffset}
                        volume={isMuted ? 0 : 100}
                        subtitleLang={null}
                    />
                )}
                {!isZapping && !currentProgram && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-green-500 font-mono pointer-events-none">
                        <span className="text-xl md:text-3xl font-bold animate-pulse">SİNYAL BEKLENİYOR_</span>
                    </div>
                )}
                <div className="pointer-events-none absolute inset-0">
                    <ZappingNoise isZapping={isZapping} />
                </div>
            </div>

            {/* Link wrapper over the entire player for easy access */}
            <Link 
                href={`/@${currentChannel.slug}`}
                className="absolute inset-0 z-10 block"
                title={`${currentChannel.name} Kanalına Git`}
            />

            {/* UI Overlay - 100% Opacity */}
            {!isFloating && (
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
                    {/* Channel Name */}
                    <div 
                        className="flex items-center gap-3 px-3 py-2 bg-black border-2"
                        style={{ borderColor: channelColor }}
                    >
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-mono">CH {(currentIndex + 1).toString().padStart(2, '0')}</span>
                            <span className="text-sm font-bold text-white uppercase tracking-wider">{currentChannel.name}</span>
                        </div>
                    </div>

                    {/* Current Program Info */}
                    {currentProgram && (
                        <div className="hidden md:flex flex-col bg-black/90 border-l-4 p-2 pointer-events-none" style={{ borderColor: channelColor }}>
                            <span className="text-xs text-gray-400 font-mono">ŞU AN YAYINDA:</span>
                            <span className="text-sm font-bold text-white line-clamp-1 max-w-[300px]">
                                {currentProgram.title}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Mini Remote (Always visible on the left side, below channel info) */}
            <div className={`absolute top-1/2 -translate-y-1/2 left-4 z-30 flex flex-col gap-2 p-2 bg-black border-2 border-[#333] transition-opacity duration-300 pointer-events-auto`}>
                {!isFloating && (
                    <>
                        <Link 
                            href={`/@${currentChannel.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#222] text-white transition-colors"
                            title="Kanalı Aç"
                        >
                            <ExternalLink size={18} />
                        </Link>
                        <div className="w-6 h-[1px] bg-[#333] my-1 mx-auto"></div>
                    </>
                )}

                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#222] text-white transition-colors"
                    title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                >
                    {isMuted ? <VolumeX size={18} className="text-red-500" /> : <Volume2 size={18} className="text-green-500" />}
                </button>
                
                {!isFloating && (
                    <>
                        <div className="w-6 h-[1px] bg-[#333] my-1 mx-auto"></div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); handlePrevChannel(); }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#222] text-white transition-colors"
                            title="Önceki Kanal"
                        >
                            <Minus size={18} />
                        </button>
                        
                        <div className="text-xs font-mono text-gray-400 font-bold text-center">CH</div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleNextChannel(); }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#222] text-white transition-colors"
                            title="Sonraki Kanal"
                        >
                            <Plus size={18} />
                        </button>

                        <div className="w-6 h-[1px] bg-[#333] my-1 mx-auto"></div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); openInYouTube(); }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#222] text-white transition-colors"
                            title="YouTube'da Aç"
                        >
                            <Youtube size={18} />
                        </button>
                    </>
                )}
                
                {isFloating && (
                    <>
                        <div className="w-6 h-[1px] bg-[#333] my-1 mx-auto"></div>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                window.scrollTo({ top: 0, behavior: 'smooth' }); 
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#222] text-white transition-colors"
                            title="Yukarı Dön"
                        >
                            <ArrowUp size={18} />
                        </button>
                    </>
                )}
            </div>
            
            {/* Draggable handle for floating mode */}
            {isFloating && (
                <div className="absolute top-0 left-0 w-full h-8 cursor-move z-40 bg-gradient-to-b from-black/80 to-transparent flex justify-center items-start pt-1 group/handle">
                    <div className="w-12 h-1 bg-white/30 rounded-full mt-1"></div>
                    
                    {/* Scale controls */}
                    <div className="absolute top-1 right-2 flex gap-1 opacity-0 group-hover/handle:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setFloatWidth(w => Math.max(240, w - 60)); }}
                            className="w-5 h-5 flex items-center justify-center bg-black border border-white text-white text-xs hover:bg-white hover:text-black transition-colors"
                            title="Küçült"
                        >
                            <Minus size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setFloatWidth(w => Math.min(800, w + 60)); }}
                            className="w-5 h-5 flex items-center justify-center bg-black border border-white text-white text-xs hover:bg-white hover:text-black transition-colors"
                            title="Büyüt"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div ref={containerRef} className="relative w-full mt-8 mb-2 border-4 border-black bg-black" style={{ aspectRatio: '16/9' }}>
            {/* Placeholder Text for when floating */}
            {isFloating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-green-500 font-mono z-0 pointer-events-none">
                    <Tv size={48} className="mb-4 opacity-50" />
                    <span className="text-sm font-bold opacity-70">YAYIN SAĞ ALT KÖŞEDE DEVAM EDİYOR_</span>
                </div>
            )}
            
            <Draggable 
                nodeRef={draggableRef} 
                disabled={!isFloating} 
                handle=".cursor-move"
                position={dragPos}
                onDrag={handleDrag}
            >
                <div 
                    ref={draggableRef}
                    className={
                        isFloating 
                            ? "fixed bottom-8 right-8 aspect-video z-[100] border-2 border-green-500 bg-black shadow-2xl shadow-green-500/20 pointer-events-auto transition-[width] duration-300" 
                            : "absolute inset-0 w-full h-full z-10 pointer-events-auto"
                    }
                    style={isFloating ? { width: `${floatWidth}px` } : {}}
                >
                    {playerContent}
                </div>
            </Draggable>
        </div>
    );
}
