'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Channel, Program } from '../../data/mockData';
import { getChannels, getProgramsForDate } from '../../lib/api';
import ChannelDisplayCard from './ChannelDisplayCard';
import HomeSidebar from './HomeSidebar';
import FooterNav from '../admin-v2/FooterNav';
import Grainient from '../ui/Grainient';
import { ReactLenis } from 'lenis/react';

export default function HomeClient() {
    const containerRef = useRef<HTMLDivElement>(null);
    const footerObserverRef = useRef<HTMLDivElement>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const timeMode = 'NOW'; // Fixed to NOW since toggle buttons were removed
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [showFooter, setShowFooter] = useState(false);

    // GSAP Animations
    useGSAP(() => {
        // Channel Cards Entrance
        if (channels.length > 0) {
            gsap.fromTo('.channel-card-wrapper', 
                { y: 60, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'back.out(1.2)', delay: 0.2 }
            );
        }
    }, { scope: containerRef, dependencies: [channels.length] });

    const [isMounted, setIsMounted] = useState(false);

    // Initial fetch
    useEffect(() => {
        setIsMounted(true);
        const loadData = async () => {
            const fetchedChannels = await getChannels();
            // Sadece online olanları gösterelim
            setChannels(fetchedChannels.filter(c => c.is_online !== false));

            // Bugünü al
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const fetchedPrograms = await getProgramsForDate(dateStr);
            setPrograms(fetchedPrograms);
            setCurrentTime(now);
        };
        loadData();

        // Her dakika saati güncelle
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Footer Observer (Fade in on scroll to bottom)
    useEffect(() => {
        if (channels.length === 0) return; // Veriler yüklenene kadar footer'ı gösterme

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setShowFooter(true);
                } else {
                    setShowFooter(false);
                }
            },
            { threshold: 0.1 }
        );

        if (footerObserverRef.current) {
            observer.observe(footerObserverRef.current);
        }

        return () => observer.disconnect();
    }, [channels.length]);

    const getProgramForChannel = (channelId: string, mode: 'NOW' | 'NEXT') => {
        if (!currentTime) return null;
        
        const channelPrograms = programs.filter(p => p.channelId === channelId);
        
        // Find current program
        // A program is current if its startTime <= now and endTime > now
        // Time format is HH:mm. We need to compare carefully.
        const currentH = currentTime.getHours();
        const currentM = currentTime.getMinutes();
        const currentS = currentTime.getSeconds();
        const currentTotal = currentH * 3600 + currentM * 60 + currentS;

        let currentProgIndex = -1;

        for (let i = 0; i < channelPrograms.length; i++) {
            const p = channelPrograms[i];
            const [sh, sm, ss] = p.startTime.split(':').map(Number);
            const startTotal = sh * 3600 + sm * 60 + (ss || 0);
            
            const [eh, em, es] = p.endTime.split(':').map(Number);
            let endTotal = eh * 3600 + em * 60 + (es || 0);
            
            if (endTotal <= startTotal) {
                endTotal += 24 * 3600; // Handles crossing midnight
            }

            // Also if we are past midnight and checking a program that started before midnight
            let checkTotal = currentTotal;
            if (currentTotal < startTotal && currentTotal < 6 * 3600 && startTotal >= 18 * 3600) {
                // E.g. it is 01:00 (3600) and program started at 23:00 (82800)
                checkTotal += 24 * 3600;
            }

            if (checkTotal >= startTotal && checkTotal < endTotal) {
                currentProgIndex = i;
                break;
            }
        }

        if (mode === 'NOW') {
            return currentProgIndex !== -1 ? channelPrograms[currentProgIndex] : null;
        } else {
            // mode === 'NEXT'
            if (currentProgIndex !== -1 && currentProgIndex + 1 < channelPrograms.length) {
                return channelPrograms[currentProgIndex + 1];
            }
            // If no current program is found, maybe find the next upcoming one today
            if (currentProgIndex === -1) {
                const nextProg = channelPrograms.find(p => {
                    const [sh, sm, ss] = p.startTime.split(':').map(Number);
                    const startTotal = sh * 3600 + sm * 60 + (ss || 0);
                    // For finding next upcoming, if current is e.g. 23:00 and start is 01:00 (next day but same broadcast day)
                    // We should handle that. But simple startTotal > currentTotal is mostly fine.
                    let adjustedStart = startTotal;
                    if (startTotal < 6 * 3600 && currentTotal >= 18 * 3600) adjustedStart += 24 * 3600;
                    return adjustedStart > currentTotal;
                });
                return nextProg || null;
            }
            return null;
        }
    };

    const daysTr = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'];
    const timeString = currentTime 
        ? `${daysTr[currentTime.getDay()]} ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`
        : 'YÜKLENİYOR...';

    // Send time to iframe
    useEffect(() => {
        const iframe = document.getElementById('hero-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'UPDATE_TIME', payload: timeString }, '*');
        }
    }, [timeString]);

    if (!isMounted) {
        return <div className="min-h-screen bg-black"></div>;
    }

    return (
        <ReactLenis root>
            <div ref={containerRef} className="min-h-screen bg-[#00FF00] font-mono flex flex-col relative">
                {/* Background Grainient */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <Grainient 
                        color1="#00ff08" 
                        color2="#ff0000" 
                        color3="#0000ff" 
                        timeSpeed={0.1} 
                        colorBalance={0} 
                        warpStrength={3.55} 
                        warpFrequency={0} 
                        warpSpeed={0.6} 
                        warpAmplitude={50} 
                        blendAngle={-3} 
                        blendSoftness={0.3} 
                        rotationAmount={500} 
                        noiseScale={2} 
                        grainAmount={0.1} 
                        grainScale={2} 
                        grainAnimated={false} 
                        contrast={1.5} 
                        gamma={1} 
                        saturation={1.7} 
                        centerX={0.5} 
                        centerY={0.4} 
                        zoom={10} 
                        className="opacity-80"
                    />
                </div>

                <div className="w-full flex flex-col md:flex-row min-h-screen relative z-10">
                    
                    {/* Left Content */}
                    <div className="flex-1 flex flex-col pl-[50px] pr-8 pb-12">
                        <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
                            
                            {/* Hero Section */}
                            <div className="relative w-full mt-8 mb-2 border-4 border-black bg-black overflow-hidden" style={{ aspectRatio: '16/9' }}>
                                <iframe 
                                    id="hero-iframe"
                                    src="/hero/index.html" 
                                    className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
                                    title="tvgibi.tv hero"
                                    allow="autoplay; fullscreen"
                                />
                            </div>

                            {/* Channels Grid */}
                            <div className="channel-grid mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {channels.map(channel => {
                                    const prog = getProgramForChannel(channel.id, timeMode);
                                    const nextProg = getProgramForChannel(channel.id, 'NEXT');
                                    return (
                                        <div key={channel.id} className="channel-card-wrapper">
                                            <ChannelDisplayCard 
                                                channel={channel}
                                                program={prog}
                                                nextProgram={nextProg}
                                                currentTime={currentTime}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Navigation Footer */}
                            <div 
                                ref={footerObserverRef}
                                className={`mt-24 transition-all duration-700 ease-out transform ${
                                    showFooter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                                }`}
                            >
                                <FooterNav />
                                
                                {/* Final Footer Pill */}
                                <div className="flex justify-center mt-8 pb-8">
                                    <div className="bg-[#00FF00] text-black border-2 border-black px-6 py-1 rounded-full text-sm font-bold">
                                        ©2026 tvgibi
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="w-full md:w-80 flex-shrink-0 bg-[#131313] border-l-4 border-black border-b-4 md:border-b-0 sticky top-0 h-screen overflow-hidden" data-lenis-prevent>
                        <HomeSidebar channels={channels} />
                    </div>
                </div>
            </div>
        </ReactLenis>
    );
}
