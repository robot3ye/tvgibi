'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Clock } from 'lucide-react';
import { Program, Channel } from '../../../data/mockData';
import { getChannels, getCurrentProgram } from '../../../lib/api';

// Dynamic import with SSR disabled to prevent hydration errors
const StablePlayer = dynamic(() => import('../../../components/StablePlayer'), { ssr: false });

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ChannelPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [nextProgram, setNextProgram] = useState<Program | null>(null);
  const [progress, setProgress] = useState(0);
  const [initialOffset, setInitialOffset] = useState(0);
  const lastProgramIdRef = useRef<string | null>(null);

  // Fetch Channel Details
  useEffect(() => {
    const fetchChannel = async () => {
        const channels = await getChannels();
        const found = channels.find(c => c.slug === slug);
        setChannel(found || null);
    };
    fetchChannel();
  }, [slug]);

  // Optimized Schedule Logic
  useEffect(() => {
    if (!channel) return;
    setMounted(true);

    const fetchProgram = async () => {
        const { current, next, offset } = await getCurrentProgram(channel.id);
        
        if (current) {
             // Use the offset returned from API which is calculated based on start_time
             // Or verify it matches current local time
             
             if (lastProgramIdRef.current !== current.id) {
                lastProgramIdRef.current = current.id;
                setInitialOffset(offset); // API calculates this correctly
                setCurrentProgram(current);
                setNextProgram(next);
            }
        } else {
             lastProgramIdRef.current = null;
             setCurrentProgram(null);
             setNextProgram(null);
        }
    };

    // Initial Fetch
    fetchProgram();
    
    // Polling interval (e.g., every 10 seconds to check for updates/sync)
    const pollInterval = setInterval(fetchProgram, 10000);

    // Local Progress Update Interval (runs every second for smooth UI)
    const progressInterval = setInterval(() => {
        if (!currentProgram) {
            setProgress(0);
            return;
        }

        const now = new Date();
        const [startH, startM] = currentProgram.startTime.split(':').map(Number);
        const [endH, endM] = currentProgram.endTime.split(':').map(Number);
        
        let startTotalMinutes = startH * 60 + startM;
        let endTotalMinutes = endH * 60 + endM;
        if (endTotalMinutes < startTotalMinutes) endTotalMinutes += 24 * 60; // Cross midnight

        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
        // Handle midnight crossover for current time if needed (complex, but assuming same day for simple MVP)
        let adjustedCurrentMinutes = currentTotalMinutes;
        if (adjustedCurrentMinutes < startTotalMinutes && (startTotalMinutes - adjustedCurrentMinutes) > 12 * 60) {
            adjustedCurrentMinutes += 24 * 60;
        }

        const durationMinutes = endTotalMinutes - startTotalMinutes;
        const elapsedMinutes = adjustedCurrentMinutes - startTotalMinutes;
        const elapsedSeconds = elapsedMinutes * 60 + now.getSeconds();
        const totalSeconds = durationMinutes * 60;

        if (totalSeconds > 0) {
            const p = (elapsedSeconds / totalSeconds) * 100;
            setProgress(Math.min(Math.max(p, 0), 100));
            
            // If finished, trigger immediate fetch
            if (p >= 100) {
                fetchProgram();
            }
        }
    }, 1000);

    return () => {
        clearInterval(pollInterval);
        clearInterval(progressInterval);
    };
  }, [channel, currentProgram]); // Re-run if channel changes or current program updates (to update closure vars)


  if (!channel) {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Kanal Yükleniyor...</h1>
                <button onClick={() => router.back()} className="text-primary hover:underline">
                    Geri Dön
                </button>
            </div>
        </div>
    );
  }

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
        <button 
            onClick={() => router.back()}
            className="pointer-events-auto p-2 rounded-full bg-black/50 backdrop-blur hover:bg-white/20 transition-colors"
        >
            <ArrowLeft size={24} />
        </button>
        
        <div className="flex items-center space-x-3 pointer-events-auto">
            <div className="bg-[#00ff00] text-black text-xs font-bold px-3 py-1 rounded animate-pulse shadow-[0_0_10px_rgba(0,255,0,0.5)]">
                ONLINE
            </div>
            <div className="bg-black/50 backdrop-blur px-3 py-1 rounded border border-white/10 flex items-center space-x-2">
                <div 
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: channel.color }}
                >
                    {channel.logo}
                </div>
                <span className="font-semibold text-sm">{channel.name}</span>
            </div>
        </div>
      </div>

      {/* Main Player Area */}
      <div className="flex-grow relative bg-black flex items-center justify-center">
        {currentProgram ? (
            <StablePlayer 
                url={`https://www.youtube.com/watch?v=${currentProgram.videoId}`}
                initialStart={initialOffset}
            />
        ) : (
            <div className="text-center text-gray-500">
                <p>Şu an yayın yok</p>
            </div>
        )}

        {/* Info Overlay (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 pb-8 px-8">
            <div className="max-w-7xl mx-auto">
                {currentProgram && (
                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                                    {currentProgram.title}
                                </h1>
                                <p className="text-gray-300 text-lg line-clamp-2 max-w-2xl drop-shadow-md">
                                    {currentProgram.description}
                                </p>
                            </div>
                            
                            {/* Next Program Info */}
                            {nextProgram && (
                                <div className="hidden md:block text-right opacity-80">
                                    <div className="text-sm text-gray-400 mb-1">SONRAKİ PROGRAM</div>
                                    <div className="flex items-center justify-end space-x-2">
                                        <Clock size={16} className="text-primary" />
                                        <span className="font-medium text-white">{nextProgram.startTime}</span>
                                        <span className="text-gray-300">- {nextProgram.title}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_var(--color-primary)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        
                        <div className="flex justify-between text-xs font-medium text-gray-400">
                            <span>{currentProgram.startTime}</span>
                            <span>{currentProgram.endTime}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
