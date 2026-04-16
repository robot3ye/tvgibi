'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Channel, Program } from '../../data/mockData';
import { getChannels, getProgramsForDate } from '../../lib/api';
import ChannelDisplayCard from './ChannelDisplayCard';
import HomeSidebar from './HomeSidebar';
import FooterNav from '../admin-v2/FooterNav';

export default function HomeClient() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [timeMode, setTimeMode] = useState<'NOW' | 'NEXT'>('NOW');
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    // GSAP Animations
    useGSAP(() => {
        // Timeline for the header entrance
        const tl = gsap.timeline();

        // Title & Dots stagger in (Header Box animation removed)
        tl.fromTo('.header-title, .header-dot', 
            { x: -30, opacity: 0 },
            { x: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: 'power2.out' }
        )
        // Description lines stagger up
        .fromTo('.header-desc-line', 
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.15, duration: 0.6, ease: 'back.out(1.5)' }, 
            "-=0.3"
        )
        // Test screen image scales in
        .fromTo('.header-image', 
            { scale: 0.5, rotation: 15, opacity: 0 },
            { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, 
            "-=0.8"
        );

        // Channel Cards Entrance
        if (channels.length > 0) {
            gsap.fromTo('.channel-card-wrapper', 
                { y: 60, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'back.out(1.2)', delay: 0.5 }
            );
        }

        // Continuous subtle TV glitch effect on the main title
        const glitchTl = gsap.timeline({ repeat: -1, repeatDelay: 3 });
        glitchTl.to('.header-title', { x: 3, skewX: -10, duration: 0.05 })
                .to('.header-title', { x: -3, skewX: 10, duration: 0.05 })
                .to('.header-title', { x: 0, skewX: 0, duration: 0.05 })
                .to('.header-title', { opacity: 0.8, duration: 0.05 })
                .to('.header-title', { opacity: 1, duration: 0.05 });

    }, { scope: containerRef, dependencies: [channels.length] });

    // Initial fetch
    useEffect(() => {
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

    // Helper: Find NOW program for a channel
    const getProgramForChannel = (channelId: string, mode: 'NOW' | 'NEXT') => {
        if (!currentTime) return null;
        
        const channelPrograms = programs.filter(p => p.channelId === channelId);
        
        // Find current program
        // A program is current if its startTime <= now and endTime > now
        // Time format is HH:mm. We need to compare carefully.
        const currentH = currentTime.getHours();
        const currentM = currentTime.getMinutes();
        const currentTotal = currentH * 60 + currentM;

        let currentProgIndex = -1;

        for (let i = 0; i < channelPrograms.length; i++) {
            const p = channelPrograms[i];
            const [sh, sm] = p.startTime.split(':').map(Number);
            const startTotal = sh * 60 + sm;
            
            const [eh, em] = p.endTime.split(':').map(Number);
            let endTotal = eh * 60 + em;
            
            if (endTotal <= startTotal) {
                endTotal += 24 * 60; // Handles crossing midnight
            }

            // Also if we are past midnight and checking a program that started before midnight
            let checkTotal = currentTotal;
            if (currentTotal < startTotal && currentTotal < 6 * 60 && startTotal >= 18 * 60) {
                // E.g. it is 01:00 (60) and program started at 23:00 (1380)
                checkTotal += 24 * 60;
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
                    const [sh, sm] = p.startTime.split(':').map(Number);
                    const startTotal = sh * 60 + sm;
                    // For finding next upcoming, if current is e.g. 23:00 and start is 01:00 (next day but same broadcast day)
                    // We should handle that. But simple startTotal > currentTotal is mostly fine.
                    let adjustedStart = startTotal;
                    if (startTotal < 6 * 60 && currentTotal >= 18 * 60) adjustedStart += 24 * 60;
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

    return (
        <div ref={containerRef} className="min-h-screen bg-[#ff6610] font-mono flex flex-col">
            <div className="w-full flex flex-col md:flex-row min-h-screen">
                
                {/* Left Content */}
                <div className="flex-1 flex flex-col pl-[50px] pr-8 pb-12">
                    <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
                        
                        {/* Header Block */}
                        <div className="header-box flex items-stretch justify-between mt-8 bg-black border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex-1 mr-8">
                                <div className="text-white inline-flex items-center mb-6">
                                    <h1 className="header-title text-4xl md:text-5xl font-bold tracking-tighter lowercase">
                                        tvgibi.tv
                                    </h1>
                                    <div className="flex space-x-1 ml-3">
                                        <div className="header-dot w-2 h-2 rounded-full bg-[#00FFFF]"></div>
                                        <div className="header-dot w-2 h-2 rounded-full bg-[#FF00FF]"></div>
                                        <div className="header-dot w-2 h-2 rounded-full bg-[#00FF00]"></div>
                                    </div>
                                </div>
                                <p className="text-white text-lg font-bold leading-relaxed mb-6">
                                    <span className="header-desc-line block">Herkesin <span className="text-[#00FFFF]">aynı anda</span> izleyebildiği,</span>
                                    <span className="header-desc-line block"><span className="text-[#FF0000]">youtube</span>'dan beslenen kanalları,</span>
                                    <span className="header-desc-line block"><span className="text-[#00FFFF]">insan seçkisi</span> yayın akışıyla,</span>
                                    <span className="header-desc-line block"><span className="text-[#00FF00]">7/24</span> yayında.. Tamamen bedava!</span>
                                </p>
                                <p className="header-desc-line text-white text-lg font-bold">
                                    Bir TeleVizyon <span className="text-gray-400 opacity-50">simülasyonu..</span>
                                </p>
                            </div>
                            
                            {/* Test Screen Image */}
                            <div className="header-image hidden md:block w-72 h-auto flex-shrink-0 relative overflow-hidden group">
                                {/* Adding a subtle hover effect to the image container */}
                                <div className="w-full h-full bg-black relative z-10 transition-transform duration-500 group-hover:scale-105">
                                    <img src="/test-screen.png" alt="Test Screen" className="w-full h-full object-cover" />
                                </div>
                                {/* CRT Scanline Overlay */}
                                <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1))] bg-[length:100%_4px] opacity-50"></div>
                            </div>
                        </div>

                        {/* Controls & Time Banner */}
                        <div className="control-panel mt-8 flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-8">
                            {/* Toggle Buttons */}
                            <div className="flex flex-col space-y-2">
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => setTimeMode('NOW')}
                                        className={`px-8 py-2 font-bold uppercase border-4 border-black transition-colors ${
                                            timeMode === 'NOW' ? 'bg-[#00FF00] text-black' : 'bg-[#00FF00] text-black hover:bg-white'
                                        }`}
                                    >
                                        ŞU_AN
                                    </button>
                                    <button 
                                        onClick={() => setTimeMode('NEXT')}
                                        className={`px-8 py-2 font-bold uppercase border-4 border-black transition-colors ${
                                            timeMode === 'NEXT' ? 'bg-[#FF00FF] text-black' : 'bg-[#FF00FF] text-black hover:bg-white'
                                        }`}
                                    >
                                        AZ_SONRA
                                    </button>
                                </div>
                                <div className="bg-[#0066FF] text-white border-4 border-black px-4 py-1 font-bold uppercase text-center">
                                    {timeMode === 'NOW' ? 'ŞU_AN BUNLAR YAYINDA:' : 'AZ_SONRA BUNLAR YAYINDA:'}
                                </div>
                            </div>

                            {/* Time Banner */}
                            <div className="flex-1 bg-[#feff01] border-4 border-black flex items-center justify-center py-4">
                                <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-widest text-black">
                                    {timeString}
                                </h2>
                            </div>
                        </div>

                        {/* Channels Grid */}
                        <div className="channel-grid mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {channels.map(channel => {
                                const prog = getProgramForChannel(channel.id, timeMode);
                                return (
                                    <div key={channel.id} className="channel-card-wrapper">
                                        <ChannelDisplayCard 
                                            channel={channel}
                                            program={prog}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Navigation Footer */}
                        <div className="mt-24">
                            <FooterNav />
                        </div>
                        
                        {/* Final Footer Pill */}
                        <div className="flex justify-center mt-8 pb-8">
                            <div className="bg-[#00FF00] text-black border-2 border-black px-6 py-1 rounded-full text-sm font-bold">
                                ©2026 tvgibi
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-full md:w-80 flex-shrink-0 bg-[#00FF00] border-l-4 border-black border-b-4 md:border-b-0 sticky top-0 h-screen overflow-hidden">
                    <HomeSidebar channels={channels} />
                </div>
            </div>
        </div>
    );
}
