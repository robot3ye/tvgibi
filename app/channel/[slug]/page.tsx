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
  const [showVolumeOSD, setShowVolumeOSD] = useState(false);
  const [showSubtitleOSD, setShowSubtitleOSD] = useState(false);
  const [showChannelListModal, setShowChannelListModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track remote control position across channel changes
  // Provide a default fallback position for SSR / initial render
  const [remotePosition, setRemotePosition] = useState<{x: number, y: number} | undefined>(undefined);
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const draggableNodeRef = useRef<HTMLDivElement>(null);
  const lastProgramIdRef = useRef<string | null>(null);
  const currentOffsetRef = useRef<number>(0);

  // Initialize position and interaction on client side only to avoid hydration mismatch
  useEffect(() => {
      // Sadece session storage'ı kontrol et, her reload'da izin isteme
      const hasPermission = sessionStorage.getItem('tv_started');
      setHasInteracted(!!hasPermission);

      // Kumandanın başlangıç pozisyonu
      const savedX = localStorage.getItem('remotePosX');
      const savedY = localStorage.getItem('remotePosY');
      
      if (savedX && savedY) {
          setRemotePosition({ x: parseFloat(savedX), y: parseFloat(savedY) });
      } else {
          // Sayfanın en sağ alt kısmı (340px genişlik, 570px yükseklik + margin)
          // bounds="parent" ile çakışmaması için window yerine document.documentElement kullanıyoruz
          // ve biraz daha geniş bir güvenlik payı bırakıyoruz.
          const clientWidth = document.documentElement.clientWidth || window.innerWidth;
          const clientHeight = document.documentElement.clientHeight || window.innerHeight;
          
          const startX = clientWidth - 360; 
          const startY = clientHeight - 600;
          setRemotePosition({ x: Math.max(20, startX), y: Math.max(20, startY) });
      }
  }, []);

  const handleVolumeChange = (newVolume: number | ((prev: number) => number)) => {
      setVolume(prev => {
          const calculatedVolume = typeof newVolume === 'function' ? newVolume(prev) : newVolume;
          
          setShowVolumeOSD(true);
          if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
          volumeTimeoutRef.current = setTimeout(() => setShowVolumeOSD(false), 2000);
          
          return calculatedVolume;
      });
  };

  const handleSubtitleToggle = () => {
      if (!currentProgram) return;
      
      setInitialOffset(currentOffsetRef.current);
      setSubtitleLang(prev => prev === 'tr' ? null : 'tr');
      
      setShowSubtitleOSD(true);
      if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
      subtitleTimeoutRef.current = setTimeout(() => setShowSubtitleOSD(false), 2000);
  };

  const handleRemoteDragStop = (e: any, data: { x: number, y: number }) => {
      setRemotePosition({ x: data.x, y: data.y });
      localStorage.setItem('remotePosX', data.x.toString());
      localStorage.setItem('remotePosY', data.y.toString());
  };

  // Fetch Channel Details
  useEffect(() => {
    let isCancelled = false;
    const fetchChannel = async () => {
        // Clear current program when slug changes so we don't show old video during noise
        setCurrentProgram(null);
        setNextProgram(null);
        lastProgramIdRef.current = null;
        
        const channels = await getChannels();
        if (isCancelled) return;
        setAllChannels(channels);
        const found = channels.find(c => c.slug === activeSlug);
        setChannel(found || null);
    };
    fetchChannel();
    return () => {
        isCancelled = true;
    };
  }, [activeSlug]);

  // Optimized Schedule Logic
  useEffect(() => {
    if (!channel || channel.slug !== activeSlug) return;
    let isCancelled = false;
    setMounted(true);

    const fetchProgram = async () => {
        if (isCancelled) return;
        const { current, next, offset } = await getCurrentProgram(channel.id);
        if (isCancelled) return;
        
        if (current) {
             if (lastProgramIdRef.current !== current.id) {
                lastProgramIdRef.current = current.id;
                setInitialOffset(offset);
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

    return () => {
        isCancelled = true;
        clearInterval(pollInterval);
    };
  }, [channel, activeSlug]);

  // Local Progress Update Interval (runs every second for smooth UI)
  useEffect(() => {
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
            
            // If finished, polling interval will catch it within 10 seconds.
        }
    }, 1000);

    return () => clearInterval(progressInterval);
  }, [currentProgram]);


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
              handleVolumeChange(Math.min(volume + 10, 100));
          } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleVolumeChange(Math.max(volume - 10, 0));
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

        {/* Volume OSD */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] pointer-events-none transition-opacity duration-300 ${showVolumeOSD ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-4 bg-black/80 px-8 py-6 rounded-3xl border-4" style={{ borderColor: channel.color_primary || '#00FF4F' }}>
                {volume === 0 ? <VolumeX size={64} color={channel.color_primary || '#00FF4F'} /> : <Volume2 size={64} color={channel.color_primary || '#00FF4F'} />}
                <div className="text-6xl font-black font-mono" style={{ color: channel.color_primary || '#00FF4F' }}>
                    {volume}%
                </div>
            </div>
        </div>

        {/* Subtitle OSD */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] pointer-events-none transition-opacity duration-300 ${showSubtitleOSD ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-4 bg-black/80 px-8 py-6 rounded-3xl border-4" style={{ borderColor: channel.color_primary || '#00FF4F' }}>
                <div className="text-5xl font-black font-mono uppercase" style={{ color: channel.color_primary || '#00FF4F' }}>
                    ALTYAZI: {subtitleLang === 'tr' ? 'AÇIK' : 'KAPALI'}
                </div>
            </div>
        </div>

        <RemoteControl 
            remotePosition={remotePosition}
            draggableNodeRef={draggableNodeRef}
            showControls={showControls}
            volume={volume}
            setVolume={handleVolumeChange}
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
            onOpenChannelList={() => setShowChannelListModal(true)}
            onGoHome={() => router.push('/')}
            onOpenSchedule={() => router.push(`/schedule/${channel.slug}`)}
            channelColor={channel.color_primary || '#00FF4F'}
            onSelectChannelNumber={(num: number) => {
                let targetIndex = num === 0 ? 9 : num - 1;
                if (targetIndex >= 0 && targetIndex < allChannels.length) {
                    triggerZap(allChannels[targetIndex].slug);
                }
            }}
            onRandomChannel={() => {
                const availableChannels = allChannels.filter(c => c.slug !== activeSlug);
                if (availableChannels.length > 0) {
                    const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
                    triggerZap(randomChannel.slug);
                }
            }}
            onTurnOffTV={() => {
                sessionStorage.removeItem('tv_started');
                setHasInteracted(false);
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }}
        />

        {/* Channel List Modal */}
        {showChannelListModal && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm">
                <div className="w-full max-w-4xl bg-black border-4 border-white shadow-[12px_12px_0px_0px_#FFF] p-8 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b-4 border-white pb-4">
                        <h2 className="text-4xl font-bold text-[#00FF4F] uppercase tracking-widest">Kanal_ Index</h2>
                        <button 
                            onClick={() => setShowChannelListModal(false)}
                            className="text-white hover:text-red-500 font-bold text-3xl transition-colors"
                        >
                            X
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {allChannels.map((c, idx) => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    triggerZap(c.slug);
                                    setShowChannelListModal(false);
                                }}
                                className={`p-4 border-2 border-white flex flex-col items-center justify-center gap-3 transition-transform hover:scale-105 ${activeSlug === c.slug ? 'bg-white/20' : 'bg-black hover:bg-gray-900'}`}
                                style={{ borderColor: c.color_primary || '#FFF' }}
                            >
                                <span className="text-3xl font-black" style={{ color: c.color_primary || '#FFF' }}>{idx + 1 === 10 ? 0 : idx + 1}</span>
                                {c.logo_main ? (
                                    <img src={c.logo_main} alt={c.name} className="h-12 object-contain" />
                                ) : (
                                    <span className="font-bold">{c.name}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
