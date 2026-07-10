'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getChannels, getProgramsForChannel } from '../../lib/api';
import { Channel, Program } from '../../data/mockData';
import PublicProgramList from '../public-schedule/PublicProgramList';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelSlug: string;
}

export default function ScheduleModal({ isOpen, onClose, channelSlug }: ScheduleModalProps) {
    const [channel, setChannel] = useState<Channel | null>(null);
    const [channelPrograms, setChannelPrograms] = useState<Program[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const listContainerRef = useRef<HTMLDivElement>(null);

    const getLocalDateString = (date: Date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        if (!isOpen) return;
        
        const loadChannelData = async () => {
            const data = await getChannels();
            const found = data.find(c => c.slug === channelSlug);
            setChannel(found || null);
            if (found) {
                try {
                    const programs = await getProgramsForChannel(found.id);
                    setChannelPrograms(programs);
                } catch (err) {
                    console.error(err);
                }
            }
        };
        
        loadChannelData();
        setSelectedDate(getLocalDateString()); 
    }, [isOpen, channelSlug]);

    const dateTabs = useMemo(() => {
        const tabs = [];
        const today = new Date();
        tabs.push({ date: getLocalDateString(today), label: 'BUGÜN' });
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        tabs.push({ date: getLocalDateString(tomorrow), label: 'YARIN' });
        
        return tabs;
    }, []);

    const isProgramLive = (prog: Program) => {
        const now = new Date();
        const todayStr = getLocalDateString(now);
        if (prog.date !== todayStr) return false;

        const [startH, startM, startS] = prog.startTime.split(':').map(Number);
        const [endH, endM, endS] = prog.endTime.split(':').map(Number);
        
        const startTime = startH * 3600 + startM * 60 + (startS || 0);
        const endTime = endH * 3600 + endM * 60 + (endS || 0);
        const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        return currentTime >= startTime && currentTime < endTime;
    };

    const displayedPrograms = useMemo(() => {
        if (!selectedDate) return [];
        const filtered = channelPrograms.filter(p => p.date === selectedDate);
        return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [channelPrograms, selectedDate]);

    const currentLiveProgram = useMemo(() => {
        return channelPrograms.find(p => isProgramLive(p));
    }, [channelPrograms]);

    // Scroll to live program when modal opens and data is ready
    useEffect(() => {
        if (isOpen && currentLiveProgram && listContainerRef.current) {
            // We use a small timeout to ensure the DOM has rendered the list
            setTimeout(() => {
                const liveElement = listContainerRef.current?.querySelector('[data-is-live="true"]');
                if (liveElement) {
                    liveElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [isOpen, currentLiveProgram, displayedPrograms]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm">
            <div 
                className="w-full max-w-5xl bg-black border-4 shadow-[12px_12px_0px_0px_currentColor] flex flex-col h-[85vh] relative"
                style={{ color: channel?.color_primary || '#00FF00', borderColor: channel?.color_primary || '#00FF00' }}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-6 text-white hover:text-current font-bold text-4xl z-50 transition-colors"
                >
                    X
                </button>
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto w-full h-full p-4 md:p-8" ref={listContainerRef}>
                    {!channel ? (
                        <div className="h-full flex items-center justify-center font-mono text-2xl font-bold">
                            Yayın Akışı Yükleniyor...
                        </div>
                    ) : (
                        <div className="font-mono text-white">
                            <div className="flex flex-col gap-6 mb-8">
                                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-current">
                                    {channel.name} YAYIN AKIŞI_
                                </h1>
                                
                                <div className="flex gap-4">
                                    {dateTabs.map(tab => (
                                        <button
                                            key={tab.date}
                                            onClick={() => setSelectedDate(tab.date)}
                                            className={`px-6 py-2 border-2 font-bold text-lg transition-colors ${
                                                selectedDate === tab.date 
                                                    ? 'bg-current text-black border-current' 
                                                    : 'bg-transparent text-white border-white hover:border-current hover:text-current'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#111] border-4 border-gray-800 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
                                <PublicProgramList 
                                    programs={displayedPrograms}
                                    liveProgramId={currentLiveProgram?.id}
                                    channelSlug={channel.slug}
                                    onProgramClick={onClose}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}