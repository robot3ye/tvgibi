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
    const timeMode = 'NOW'; // Fixed to NOW since toggle buttons were removed
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

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
        <div ref={containerRef} className="min-h-screen bg-[#ff6610] font-mono flex flex-col">
            <div className="w-full flex flex-col md:flex-row min-h-screen">
                
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
