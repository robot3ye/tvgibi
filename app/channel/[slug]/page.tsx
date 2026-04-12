'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Clock, Volume2, VolumeX, Maximize, Copy, List, ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react';
import screenfull from 'screenfull';
import { Program, Channel } from '../../../data/mockData';
import { getChannels, getCurrentProgram } from '../../../lib/api';

import TVOverlay from '../../../components/player/TVOverlay';
import ProgramInfoCard from '../../../components/player/ProgramInfoCard';
import RemoteControl from '../../../components/player/RemoteControl';
import ZappingNoise from '../../../components/player/ZappingNoise';

// Dynamic import with SSR disabled to prevent hydration errors
const StablePlayer = dynamic(() => import('../../../components/StablePlayer'), { ssr: false });

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ChannelPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Track active slug in state to allow silent URL changes without unmounting
  const [activeSlug, setActiveSlug] = useState(slug);
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [nextProgram, setNextProgram] = useState<Program | null>(null);
  const [progress, setProgress] = useState(0);
  const [initialOffset, setInitialOffset] = useState(0);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [volume, setVolume] = useState(100);
  const [subtitleLang, setSubtitleLang] = useState<string | null>(null); // State for subtitles
  const [showControls, setShowControls] = useState(true);
  const [showUI, setShowUI] = useState(true); // Control border, logo, channel num
  const [hasInteracted, setHasInteracted] = useState(true); // Default true, checked in effect
  const [isZapping, setIsZapping] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Track remote control position across channel changes
  // Provide a default fallback position for SSR / initial render
  const [remotePosition, setRemotePosition] = useState<{x: number, y: number} | undefined>(undefined);
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const draggableNodeRef = useRef<HTMLDivElement>(null);
  const lastProgramIdRef = useRef<string | null>(null);
  const currentOffsetRef = useRef<number>(0);

  // Initialize position and interaction on client side only to avoid hydration mismatch
  useEffect(() => {
      // In Next.js App Router, client-side navigation doesn't always trigger standard browser navigation events
      // the same way a hard reload does. Also document.referrer might not be reliable across local navigations.
      
      // Let's use a simpler approach:
      // If we have 'tv_started' in sessionStorage, it means the user has ALREADY clicked the "TV'Yİ AÇ" button 
      // or navigated from the home page (we'll set it there too).
      // However, if they HARD REFRESH on this page, the browser loses the "user gesture" context required for YouTube autoplay.
      // So we MUST show the modal on a hard refresh, even if 'tv_started' is in sessionStorage.
      
      const isReload = (window.performance.navigation && window.performance.navigation.type === 1) ||
                       (window.performance.getEntriesByType && window.performance.getEntriesByType("navigation").map((nav: any) => nav.type).includes("reload"));
      
      // If it's a hard reload, ALWAYS require interaction again.
      if (isReload) {
          setHasInteracted(false);
          sessionStorage.removeItem('tv_started');
      } else {
          // If it's NOT a reload, check if we already have permission (from home page or previous click)
          const hasPermission = sessionStorage.getItem('tv_started');
          if (hasPermission) {
              setHasInteracted(true);
          } else {
              setHasInteracted(false);
          }
      }

      // If no position saved in state/storage, start it at bottom-right 
    // We'll let Draggable use its default bounds first, or we can set a specific starting x/y
    const savedX = localStorage.getItem('remotePosX');
    const savedY = localStorage.getItem('remotePosY');
    if (savedX && savedY) {
        setRemotePosition({ x: parseFloat(savedX), y: parseFloat(savedY) });
    } else {
        setRemotePosition({ x: 0, y: 0 }); // 0,0 means it stays where CSS puts it initially
    }
  }, []);

  const handleSubtitleToggle = () => {
      if (!currentProgram) return;
      
      // We use the exact current elapsed seconds that our interval calculates every second
      // This ensures the iframe restarts from the exact spot you are watching right now
      setInitialOffset(currentOffsetRef.current);
      setSubtitleLang(prev => prev === 'tr' ? null : 'tr');
  };

  const handleRemoteDragStop = (e: any, data: { x: number, y: number }) => {
      setRemotePosition({ x: data.x, y: data.y });
      localStorage.setItem('remotePosX', data.x.toString());
      localStorage.setItem('remotePosY', data.y.toString());
  };

  // Fetch Channel Details
  useEffect(() => {
    const fetchChannel = async () => {
        // Clear current program when slug changes so we don't show old video during noise
        setCurrentProgram(null);
        setNextProgram(null);
        lastProgramIdRef.current = null;
        
        const channels = await getChannels();
        setAllChannels(channels);
        const found = channels.find(c => c.slug === activeSlug);
        setChannel(found || null);
    };
    fetchChannel();
  }, [activeSlug]);

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
        
        currentOffsetRef.current = Math.max(0, elapsedSeconds);

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


  // Helper for Zapping Effect
  const triggerZap = (newSlug: string) => {
      if (newSlug === activeSlug || isZapping) return;
      
      setIsZapping(true);
      
      // Force unmount the old player IMMEDIATELY by clearing states before we pushState
      setCurrentProgram(null);
      setNextProgram(null);
      lastProgramIdRef.current = null;
      
      // Play audio if available
      if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0.5; // Adjust as needed
          audioRef.current.loop = true; // Loop until zap finishes
          audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }

      // We wait just a tiny tick (50ms) to ensure React actually renders the `null` state
      // (destroying the old iframe) before we switch the active slug and trigger the new data fetch.
      setTimeout(() => {
          setActiveSlug(newSlug);
          window.history.pushState(null, '', `/channel/${newSlug}`);
          
          // Fixed timeout for zap noise (2.5s gives enough time for API and YouTube to load behind it)
          setTimeout(() => {
              setIsZapping(false);
              
              // Show UI (border, channel num) after zap
              setShowUI(true);
              
              // But keep controls hidden until mouse moves
              setShowControls(false);
              
              // Hide UI again after 3s if no mouse movement
              setTimeout(() => setShowUI(false), 3000);

              if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
              }
          }, 2500);
      }, 50); 
  };

  // Keyboard Controls
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // If we are currently zapping, ignore new key presses to prevent rapid firing
          if (!channel || allChannels.length === 0 || isZapping) return;

          const currentIndex = allChannels.findIndex(c => c.slug === activeSlug);

          // Volume controls
          if (e.key === 'ArrowUp') {
              e.preventDefault();
              setVolume(v => Math.min(v + 10, 100));
          } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setVolume(v => Math.max(v - 10, 0));
          }
          
          // Channel Navigation
          else if (e.key === 'ArrowRight') {
              const nextIndex = (currentIndex + 1) % allChannels.length;
              triggerZap(allChannels[nextIndex].slug);
          } else if (e.key === 'ArrowLeft') {
              const prevIndex = (currentIndex - 1 + allChannels.length) % allChannels.length;
              triggerZap(allChannels[prevIndex].slug);
          }

          // Number keys for channel selection
          if (/^[0-9]$/.test(e.key)) {
              const num = parseInt(e.key);
              let targetIndex = -1;
              if (num === 0) targetIndex = 9;
              else targetIndex = num - 1;

              if (targetIndex >= 0 && targetIndex < allChannels.length) {
                  triggerZap(allChannels[targetIndex].slug);
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channel, allChannels, activeSlug, isZapping]);

  // Mouse idle detection to hide controls
  useEffect(() => {
      let controlsTimeout: NodeJS.Timeout;
      let uiTimeout: NodeJS.Timeout;
      
      const handleMouseMove = () => {
          setShowControls(true);
          setShowUI(true);
          
          clearTimeout(controlsTimeout);
          clearTimeout(uiTimeout);
          
          controlsTimeout = setTimeout(() => setShowControls(false), 3000);
          uiTimeout = setTimeout(() => setShowUI(false), 3000);
      };

      window.addEventListener('mousemove', handleMouseMove);
      
      // Initial trigger to start timeouts
      handleMouseMove();

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          clearTimeout(controlsTimeout);
          clearTimeout(uiTimeout);
      };
  }, []);

  const handleFullscreen = () => {
      if (playerContainerRef.current && screenfull.isEnabled) {
          screenfull.toggle(playerContainerRef.current);
      }
  };

  const copyLink = () => {
      if (currentProgram) {
          navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${currentProgram.videoId}`);
          alert('Link kopyalandı!'); // Quick feedback, can use toast later
      }
  };

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

  if (!hasInteracted) {
      return (
          <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center text-white">
              <h1 className="text-4xl md:text-6xl font-bold mb-8 uppercase text-center max-w-lg tracking-tighter" style={{ color: channel?.color_primary || '#00FF4F' }}>
                  TVGİBİ.TV
              </h1>
              <button 
                  onClick={() => {
                      setHasInteracted(true);
                      sessionStorage.setItem('tv_started', '1');
                  }}
                  className="px-12 py-6 bg-[#00FF4F] text-black font-bold text-3xl border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:bg-[#00cc3f] transition-transform active:translate-y-2 active:translate-x-2 active:shadow-none uppercase"
              >
                  TV'Yİ AÇ
              </button>
          </div>
      );
  }

  return (
    <div ref={playerContainerRef} className="min-h-screen bg-black text-white flex flex-col font-mono relative overflow-hidden">
      {/* Audio element for zapping noise */}
      <audio ref={audioRef} src="/tv-noise-fx.wav" preload="auto" />

      {/* 25px Dynamic Border around the whole screen & Top Navigation */}
      <TVOverlay 
          showUI={showUI} 
          channel={channel} 
          allChannels={allChannels} 
      />

      {/* Main Player Area */}
      <div className="flex-grow relative bg-black flex items-center justify-center">
        <ZappingNoise isZapping={isZapping} />

        {currentProgram ? (
            <StablePlayer 
                url={`https://www.youtube.com/watch?v=${currentProgram.videoId}`}
                initialStart={initialOffset}
                volume={volume}
                subtitleLang={subtitleLang}
            />
        ) : (
            <div className="text-center text-gray-500 z-10">
                <p>Şu an yayın yok</p>
            </div>
        )}

        <ProgramInfoCard 
            showControls={showControls}
            currentProgram={currentProgram}
            nextProgram={nextProgram}
            channel={channel}
            progress={progress}
        />

        <RemoteControl 
            remotePosition={remotePosition}
            draggableNodeRef={draggableNodeRef}
            showControls={showControls}
            volume={volume}
            setVolume={setVolume}
            subtitleLang={subtitleLang}
            onSubtitleToggle={handleSubtitleToggle}
            handleRemoteDragStop={handleRemoteDragStop}
            handleFullscreen={handleFullscreen}
            copyLink={copyLink}
            onPrevChannel={() => {
                const currentIndex = allChannels.findIndex(c => c.id === channel.id);
                const prevIndex = (currentIndex - 1 + allChannels.length) % allChannels.length;
                triggerZap(allChannels[prevIndex].slug);
            }}
            onNextChannel={() => {
                const currentIndex = allChannels.findIndex(c => c.id === channel.id);
                const nextIndex = (currentIndex + 1) % allChannels.length;
                triggerZap(allChannels[nextIndex].slug);
            }}
            onGoHome={() => router.push('/')}
        />
      </div>
    </div>
  );
}
