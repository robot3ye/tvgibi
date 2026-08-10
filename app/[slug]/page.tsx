'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Clock, Volume2, VolumeX, Maximize, Copy, List, ChevronLeft, ChevronRight, GripHorizontal, Zap, Volume1, Shuffle, Youtube, Power, MessageSquare } from 'lucide-react';
import screenfull from 'screenfull';
import { Program, Channel } from '../../data/mockData';
import { getChannels, getCurrentProgram } from '../../lib/api';

import RemoteControl from '../../components/player/RemoteControl';
import ZappingNoise from '../../components/player/ZappingNoise';
import ZappSettingsModal from '../../components/player/ZappSettingsModal';
import ScrambleText from '../../components/ui/ScrambleText';
import ScheduleModal from '../../components/player/ScheduleModal';
import TeletextTicker from '../../components/player/TeletextTicker';

// Dynamic import with SSR disabled to prevent hydration errors
const StablePlayer = dynamic(() => import('../../components/StablePlayer'), { ssr: false });

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ChannelPage({ params }: PageProps) {
  const { slug: rawSlug } = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Parse the slug (handle @ prefix)
  const decodedSlug = decodeURIComponent(rawSlug);
  const isChannelLink = decodedSlug.startsWith('@');
  const actualSlug = isChannelLink ? decodedSlug.slice(1) : decodedSlug;
  
  // Track active slug in state to allow silent URL changes without unmounting
  const [activeSlug, setActiveSlug] = useState(actualSlug);
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [nextProgram, setNextProgram] = useState<Program | null>(null);
  const [progress, setProgress] = useState(0);
  const [initialOffset, setInitialOffset] = useState(0);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [volume, setVolume] = useState(100);
  const [subtitleLang, setSubtitleLang] = useState<string | null>(null); // State for subtitles
  const [hasInteracted, setHasInteracted] = useState(true); // Default true, checked in effect
  const [isZapping, setIsZapping] = useState(false);
  const isZappingRef = useRef(false);
  const [showVolumeOSD, setShowVolumeOSD] = useState(false);
  const [showSubtitleOSD, setShowSubtitleOSD] = useState(false);
  const [showChannelListModal, setShowChannelListModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showOldRemote, setShowOldRemote] = useState(false);
  const [showUI, setShowUI] = useState(true);
  
  // Zapp State
  const [showZappModal, setShowZappModal] = useState(false);
  const [zappMode, setZappMode] = useState<'10' | '30' | '60' | 'random' | null>(null);
  const [zappCountdown, setZappCountdown] = useState<number | null>(null);
  const zappIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subtitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track remote control position across channel changes
  const [remotePosition, setRemotePosition] = useState<{x: number, y: number} | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);
  
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const draggableNodeRef = useRef<HTMLDivElement>(null);
  const lastProgramIdRef = useRef<string | null>(null);
  const currentOffsetRef = useRef<number>(0);

  // Initialize position and interaction on client side only to avoid hydration mismatch
  useEffect(() => {
      setIsClient(true);
      // Sadece session storage'ı kontrol et, her reload'da izin isteme
      const hasPermission = sessionStorage.getItem('tv_started');
      setHasInteracted(!!hasPermission);

      // Kumandanın başlangıç pozisyonu
      const savedX = localStorage.getItem('remotePosX');
      const savedY = localStorage.getItem('remotePosY');
      
      if (savedX && savedY) {
          setRemotePosition({ x: parseFloat(savedX), y: parseFloat(savedY) });
      } else {
          // Kumandayı her durumda "ekranın tam ortasında" başlatalım ki 
          // gizli scroll, padding, div overflow vb. hiçbir şeye takılmasın.
          const clientWidth = document.documentElement.clientWidth || window.innerWidth;
          const clientHeight = document.documentElement.clientHeight || window.innerHeight;
          
          // 340px genişlik ve 570px yüksekliğindeki kumandanın merkezi
          const startX = (clientWidth / 2) - 170; 
          const startY = (clientHeight / 2) - 285;
          
          setRemotePosition({ x: Math.max(0, startX), y: Math.max(0, startY) });
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
        const found = channels.find((c: Channel) => c.slug === activeSlug);
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
        const [startH, startM, startS] = currentProgram.startTime.split(':').map(Number);
        const [endH, endM, endS] = currentProgram.endTime.split(':').map(Number);
        
        const startTotal = startH * 3600 + startM * 60 + (startS || 0);
        let endTotal = endH * 3600 + endM * 60 + (endS || 0);
        if (endTotal < startTotal) {
            endTotal += 24 * 3600;
        }

        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentS = now.getSeconds();
        let currentTotal = currentH * 3600 + currentM * 60 + currentS;

        if (currentTotal < startTotal && (startTotal - currentTotal) > 12 * 3600) {
            currentTotal += 24 * 3600;
        }

        const elapsedSeconds = currentTotal - startTotal;
        const totalSeconds = endTotal - startTotal;
        
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
      if (newSlug === activeSlug || isZappingRef.current) return;
      
      // OSD Volume'u kapat
      setShowVolumeOSD(false);
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);

      setIsZapping(true);
      isZappingRef.current = true;
      
      // Force unmount the old player IMMEDIATELY by clearing states before we pushState
      setCurrentProgram(null);
      setNextProgram(null);
      lastProgramIdRef.current = null;
      
      // Random zap duration between 2000ms and 3000ms
      const zapDuration = Math.floor(Math.random() * 1000) + 2000;
      
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
          window.history.pushState(null, '', `/@${newSlug}`);
          
          // Fixed timeout for zap noise (2.5s gives enough time for API and YouTube to load behind it)
              setTimeout(() => {
                  setIsZapping(false);
                  isZappingRef.current = false;

                  if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                  }
              }, zapDuration);
          }, 50); 
      };

  // UI Visibility (Mouse Idle)
  useEffect(() => {
      const handleMouseMove = () => {
          setShowUI(true);
          if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
          mouseTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
      };

      window.addEventListener('mousemove', handleMouseMove);
      // Trigger once on mount
      handleMouseMove();

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      };
  }, []);

  // Keyboard Controls
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Toggle old remote with K key
          if (e.key.toLowerCase() === 'k') {
              setShowOldRemote(prev => !prev);
              return;
          }

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

  const handleFullscreen = () => {
      if (playerContainerRef.current && screenfull.isEnabled) {
          screenfull.toggle(playerContainerRef.current);
      }
  };

  const copyLink = () => {
      navigator.clipboard.writeText(`${window.location.origin}/@${activeSlug}`);
      alert('Link kopyalandı!'); // Quick feedback, can use toast later
  };

  const handlePrevChannel = () => {
      if (allChannels.length === 0) return;
      const currentIndex = allChannels.findIndex(c => c.slug === activeSlug);
      if (currentIndex === -1) return;
      const prevIndex = (currentIndex - 1 + allChannels.length) % allChannels.length;
      triggerZap(allChannels[prevIndex].slug);
  };

  const handleNextChannel = () => {
      if (allChannels.length === 0) return;
      const currentIndex = allChannels.findIndex(c => c.slug === activeSlug);
      if (currentIndex === -1) return;
      const nextIndex = (currentIndex + 1) % allChannels.length;
      triggerZap(allChannels[nextIndex].slug);
  };

  // Zapp Logic
  const handleZappToggle = (e?: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (zappMode) {
          // If active, turn it off
          setZappMode(null);
          setZappCountdown(null);
          if (zappIntervalRef.current) clearInterval(zappIntervalRef.current);
      } else {
          // If inactive, show modal
          setShowZappModal(true);
      }
  };

  useEffect(() => {
      if (!zappMode || allChannels.length === 0) {
          setZappCountdown(null);
          if (zappIntervalRef.current) clearInterval(zappIntervalRef.current);
          return;
      }

      let delay = 10;
      if (zappMode === '30') delay = 30;
      else if (zappMode === '60') delay = 60;
      else if (zappMode === 'random') {
          delay = Math.floor(Math.random() * (30 - 10 + 1)) + 10; // Random between 10s and 30s
      }

      setZappCountdown(delay);
      if (zappIntervalRef.current) clearInterval(zappIntervalRef.current);

      zappIntervalRef.current = setInterval(() => {
          setZappCountdown(prev => {
              if (prev === null) return null;
              if (prev <= 1) {
                  // Trigger zap using latest activeSlug via allChannels loop
                  const currentIndex = allChannels.findIndex(c => c.slug === activeSlug);
                  if (currentIndex !== -1) {
                      const nextIndex = (currentIndex + 1) % allChannels.length;
                      triggerZap(allChannels[nextIndex].slug);
                  }
                  return 0; // The next useEffect execution (on activeSlug change) will reset the timer
              }
              return prev - 1;
          });
      }, 1000);

      return () => {
          if (zappIntervalRef.current) clearInterval(zappIntervalRef.current);
      };
  }, [zappMode, activeSlug, allChannels]); // Re-run whenever activeSlug changes so the timer restarts

  const handleRandomChannel = () => {
      if (!channel || allChannels.length === 0) return;
      const availableChannels = allChannels.filter(c => c.slug !== activeSlug);
      if (availableChannels.length > 0) {
          const randomChannel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
          triggerZap(randomChannel.slug);
      }
  };

  const handleTurnOffTV = () => {
      sessionStorage.removeItem('tv_started');
      setHasInteracted(false);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
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

  const channelIndex = allChannels.findIndex((c) => c.id === channel?.id);
  const channelNumber = String(channelIndex + 1).padStart(2, '0');

  return (
    <div ref={playerContainerRef} className="fixed inset-0 w-screen h-screen font-mono overflow-hidden bg-black">
      {/* Audio element for zapping noise */}
      <audio ref={audioRef} src="/tv-noise-fx.wav" preload="auto" />

      {/* Fullscreen Video Area */}
      <div className="absolute inset-0 z-0 bg-black">
          <ZappingNoise isZapping={isZapping} />

          {currentProgram ? (
              <StablePlayer 
                  url={`https://www.youtube.com/watch?v=${currentProgram.videoId}`}
                  initialStart={initialOffset}
                  volume={volume}
                  subtitleLang={subtitleLang}
              />
          ) : (
              <div className="text-center text-gray-500 z-10 w-full h-full flex items-center justify-center">
                  <p className="text-2xl font-bold">Sinyal bekleniyor</p>
              </div>
          )}

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
      </div>

      {/* UI Overlay Wrapper */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-30 hover:opacity-100 focus-within:opacity-100 ${showUI ? 'opacity-50' : 'opacity-0'}`}>
          
          {/* Border around screen */}
          <div className="absolute inset-0 border-[25px] pointer-events-none" style={{ borderColor: channel.color_primary || '#00FF4F' }} />

          {/* Top Links */}
          <div className="absolute top-0 right-[25px] h-[25px] flex items-center gap-4 md:gap-6 text-black font-black text-[10px] md:text-xs pointer-events-auto px-4 z-50">
            <button onClick={() => router.push('/')} className="hover:underline hover:decoration-[#00ff00] hover:decoration-2 underline-offset-4 tracking-widest">
                <ScrambleText text="ANASAYFA" delay={0.1} className="text-black" hoverClassName="text-black" />
            </button>
            <button onClick={() => setShowChannelListModal(true)} className="hover:underline hover:decoration-[#00ff00] hover:decoration-2 underline-offset-4 tracking-widest">
                <ScrambleText text="KANAL LİSTESİ" delay={0.2} className="text-black" hoverClassName="text-black" />
            </button>
            <button onClick={() => setShowScheduleModal(true)} className="hover:underline hover:decoration-[#00ff00] hover:decoration-2 underline-offset-4 tracking-widest">
                <ScrambleText text="YAYIN AKIŞI" delay={0.3} className="text-black" hoverClassName="text-black" />
            </button>
          </div>

          {/* Right Info Box */}
          <div className="absolute top-[25px] right-[25px] bottom-[150px] w-[260px] md:w-[320px] bg-transparent text-black flex flex-col p-4 gap-3 overflow-y-auto pointer-events-auto max-h-[calc(100vh-180px)]">
              {/* Channel Number */}
              <div className="text-5xl md:text-6xl font-black tracking-widest leading-none text-center mix-blend-difference shrink-0" style={{ color: channel.color_primary || '#00FF4F' }}>
                  [{channelNumber}]
              </div>
              
              {/* Channel Logo */}
              <div className="bg-black aspect-[16/4.5] flex items-center justify-center w-full border-4 border-black relative overflow-hidden shrink-0" style={{ borderColor: channel.color_primary || '#00FF4F', minHeight: '60px' }}>
                  {channel.logo_corner ? (
                      <img src={channel.logo_corner} alt={channel.name} className="absolute inset-0 w-full h-full object-contain p-2" />
                  ) : channel.logo_main ? (
                      <img src={channel.logo_main} alt={channel.name} className="absolute inset-0 w-full h-full object-contain p-2" />
                  ) : (
                      <span className="text-white font-bold text-xl md:text-2xl uppercase tracking-widest px-4 text-center">{channel.name}</span>
                  )}
              </div>

              {/* Video Info */}
              <div className="bg-[#00ff00] text-black p-2 md:p-3 border-2 border-black shrink-0">
                  <p className="text-[11px] md:text-xs font-bold leading-snug opacity-90" style={{ display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {currentProgram?.description || 'Bu program için açıklama bulunmuyor.'}
                  </p>
              </div>

              {/* Youtube Creator */}
              <div className="bg-[#00ff00] text-black p-2 md:p-3 border-2 border-black shrink-0">
                  <div className="text-[10px] md:text-xs font-medium mb-1 opacity-80">Youtube Creator:</div>
                  <div className="text-sm md:text-base font-black leading-tight">{currentProgram?.creator || channel.name}</div>
              </div>

              {/* Yayın Saati */}
              <div className="bg-[#00ff00] text-black p-2 md:p-3 border-2 border-black shrink-0">
                  <div className="text-[10px] md:text-xs font-medium mb-1 opacity-80">Yayın Saati:</div>
                  <div className="flex items-center gap-2 font-black text-xs md:text-sm">
                      <span>{currentProgram?.startTime.split(':').slice(0, 2).join(':')}</span>
                      <div className="flex-1 h-3 bg-black relative">
                          <div 
                              className="absolute top-0 left-0 h-full bg-white transition-all duration-1000 ease-linear"
                              style={{ width: `${progress}%` }}
                          />
                      </div>
                      <span>{currentProgram?.endTime.split(':').slice(0, 2).join(':')}</span>
                  </div>
              </div>

              {/* Sonraki Program */}
              {nextProgram && (
                  <div className="bg-[#f2f2f2] text-[#e20e0e] p-2 md:p-3 mt-auto border-2 border-black shrink-0">
                      <div className="text-[10px] font-medium mb-1 uppercase opacity-80">Sonraki Program:</div>
                      <div className="text-sm md:text-base font-black uppercase leading-tight line-clamp-2">{nextProgram.title}</div>
                  </div>
              )}
          </div>

          {/* Bottom Kumanda Box */}
          <div className="absolute bottom-[25px] left-[25px] right-[25px] h-auto flex flex-col bg-[#7a1e84] border-4 border-black pointer-events-auto">
             {/* Color separator */}
             <div className="flex h-4 w-full relative z-0">
               <div className="flex-1 bg-gray-400 h-full"></div>
               <div className="flex-1 bg-yellow-400 h-full"></div>
               <div className="flex-1 bg-cyan-400 h-full"></div>
               <div className="flex-1 bg-[#00FF4F] h-full"></div>
               <div className="flex-1 bg-[#ec00ff] h-full"></div>
               <div className="flex-1 bg-red-500 h-full"></div>
               <div className="flex-1 bg-blue-600 h-full"></div>
               <div className="flex-1 bg-black h-full"></div>
             </div>
             
             {/* Controls */}
             <div className="flex items-center justify-between p-4 px-6 overflow-visible gap-4 relative z-50">
                <div className="text-[#dafe00] font-black text-xl md:text-2xl truncate shrink-0 max-w-[40%]">
                   {currentProgram?.title || 'SİNYAL BEKLENİYOR_'}
                </div>
                
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                   {/* Zap */}
                   {zappMode ? (
                       <button onClick={handleZappToggle} className="group relative h-10 px-4 flex items-center justify-center gap-2 bg-[#ff0000] border-[3px] border-black text-white font-black hover:scale-105 active:scale-95 transition-all shrink-0 animate-pulse min-w-[160px]">
                           <Zap size={20} className="fill-current" strokeWidth={0} />
                           ZAPP'I DURDUR {zappCountdown !== null ? `(${zappCountdown}s)` : ''}
                           <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                               ZAPP MODUNU KAPAT
                           </span>
                       </button>
                   ) : (
                       <button onClick={handleZappToggle} className="group relative w-10 h-10 flex items-center justify-center bg-[#edff00] border-[3px] border-black text-[#ff0000] hover:scale-105 active:scale-95 transition-transform shrink-0">
                           <Zap size={20} className="fill-current" strokeWidth={0} />
                           <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                               ZAPP (OTOMATİK GEÇİŞ)
                           </span>
                       </button>
                   )}

                   {/* Prev Channel */}
                   <button onClick={handlePrevChannel} className="group relative w-10 h-10 flex items-center justify-center bg-[#00ff00] border-[3px] border-black text-black hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <ChevronLeft size={24} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         ÖNCEKİ KANAL
                     </span>
                   </button>

                   {/* Next Channel */}
                   <button onClick={handleNextChannel} className="group relative w-10 h-10 flex items-center justify-center bg-[#00ff00] border-[3px] border-black text-black hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <ChevronRight size={24} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         SONRAKİ KANAL
                     </span>
                   </button>
                   
                   <div className="w-[2px] h-8 bg-black/30 mx-1 shrink-0"></div>
                   
                   {/* Vol Down */}
                   <button onClick={() => handleVolumeChange(Math.max(volume - 10, 0))} className="group relative w-10 h-10 flex items-center justify-center bg-[#ff6200] border-[3px] border-black text-black hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <Volume1 size={20} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         SESİ KIS
                     </span>
                   </button>

                   {/* Vol Up */}
                   <button onClick={() => handleVolumeChange(Math.min(volume + 10, 100))} className="group relative w-10 h-10 flex items-center justify-center bg-[#ff6200] border-[3px] border-black text-black hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <Volume2 size={20} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         SESİ AÇ
                     </span>
                   </button>

                   {/* Mute */}
                   <button onClick={() => handleVolumeChange(0)} className="group relative w-10 h-10 flex items-center justify-center bg-[#8e2121] border-[3px] border-black text-white hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <VolumeX size={20} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         SESSİZ
                     </span>
                   </button>

                   <div className="w-[2px] h-8 bg-black/30 mx-1 shrink-0"></div>

                   {/* Subtitle */}
                   <button 
                     onClick={handleSubtitleToggle}
                     className={`group relative w-10 h-10 flex items-center justify-center border-[3px] border-black hover:scale-105 active:scale-95 transition-transform shrink-0 ${subtitleLang === 'tr' ? 'bg-[#ff00ff] text-white' : 'bg-gray-400 text-black'}`}
                   >
                     <MessageSquare size={20} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         {subtitleLang === 'tr' ? 'ALTYAZIYI KAPAT' : 'ALTYAZIYI AÇ'}
                     </span>
                   </button>

                   {/* Random Channel */}
                   <button onClick={handleRandomChannel} className="group relative w-10 h-10 flex items-center justify-center bg-yellow-400 border-[3px] border-black text-black hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <Shuffle size={20} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         RASTGELE KANAL
                     </span>
                   </button>

                   {/* YouTube Link */}
                   <button onClick={() => { if (currentProgram) window.open(`https://youtube.com/watch?v=${currentProgram.videoId}`, '_blank'); }} className="group relative w-10 h-10 flex items-center justify-center bg-black border-[3px] border-black text-red-500 hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <Youtube size={20} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         YOUTUBE'DA AÇ
                     </span>
                   </button>

                   {/* Full Screen */}
                   <button onClick={handleFullscreen} className="group relative w-10 h-10 flex items-center justify-center bg-white border-[3px] border-black text-black hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <Maximize size={20} strokeWidth={3} />
                     <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         TAM EKRAN
                     </span>
                   </button>
                   
                   {/* Turn off TV */}
                   <button onClick={handleTurnOffTV} className="group relative w-10 h-10 flex items-center justify-center bg-red-600 border-[3px] border-black text-white hover:scale-105 active:scale-95 transition-transform shrink-0">
                     <Power size={20} strokeWidth={3} />
                     <span className="absolute bottom-full right-0 mb-3 hidden group-hover:block whitespace-nowrap bg-[#00ff00] text-black border-[3px] border-black px-2 py-1 text-[10px] md:text-xs font-black uppercase z-[100] pointer-events-none">
                         TV'Yİ KAPAT
                     </span>
                   </button>
                </div>
             </div>
          </div>
      </div>

      {/* TELETEXT TICKER */}
      {channel && currentProgram && (
        <div className="absolute bottom-0 left-0 w-full z-[100]">
            <TeletextTicker channelName={channel.name} programTitle={currentProgram.title} />
        </div>
      )}

      {/* Old Remote Control (Hidden by default, toggle with 'K') */}
      {isClient && showOldRemote && (
          <RemoteControl 
              remotePosition={remotePosition}
              draggableNodeRef={draggableNodeRef}
              showControls={true}
              volume={volume}
              setVolume={handleVolumeChange}
              subtitleLang={subtitleLang}
              onSubtitleToggle={handleSubtitleToggle}
              handleRemoteDragStop={handleRemoteDragStop}
              handleFullscreen={handleFullscreen}
              copyLink={copyLink}
              onPrevChannel={handlePrevChannel}
              onNextChannel={handleNextChannel}
              onOpenChannelList={() => setShowChannelListModal(true)}
              onGoHome={() => router.push('/')}
              onOpenSchedule={() => setShowScheduleModal(true)}
              channelColor={channel.color_primary || '#00FF4F'}
              onSelectChannelNumber={(num: number) => {
                  let targetIndex = num === 0 ? 9 : num - 1;
                  if (targetIndex >= 0 && targetIndex < allChannels.length) {
                      triggerZap(allChannels[targetIndex].slug);
                  }
              }}
              onRandomChannel={handleRandomChannel}
              onTurnOffTV={handleTurnOffTV}
          />
      )}

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

      <ZappSettingsModal 
          isOpen={showZappModal} 
          onClose={() => setShowZappModal(false)} 
          onSelect={(mode) => {
              setZappMode(mode);
              setShowZappModal(false);
          }} 
      />

      <ScheduleModal 
          isOpen={showScheduleModal} 
          onClose={() => setShowScheduleModal(false)} 
          channelSlug={activeSlug} 
      />
    </div>
  );
}
