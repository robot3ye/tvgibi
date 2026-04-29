'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { getChannels, getProgramsForChannel } from '../../../lib/api';
import { Channel, Program } from '../../../data/mockData';
import { useRouter } from 'next/navigation';

import PublicHeader from '../../../components/public-schedule/PublicHeader';
import PublicProgramList from '../../../components/public-schedule/PublicProgramList';
import PublicChannelListModal from '../../../components/public-schedule/PublicChannelListModal';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicSchedulePage({ params }: PageProps) {
    const { slug } = use(params);
    const router = useRouter();
    
    const [channels, setChannels] = useState<Channel[]>([]);
    const [channel, setChannel] = useState<Channel | null>(null);
    const [channelPrograms, setChannelPrograms] = useState<Program[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isChannelListModalOpen, setIsChannelListModalOpen] = useState(false);

    // --- Effects ---

    const getLocalDateString = (date: Date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        const loadChannels = async () => {
            const data = await getChannels();
            setChannels(data);
            const found = data.find(c => c.slug === slug);
            setChannel(found || null);
            if (found) {
                loadChannelPrograms(found.id);
            }
        };
        loadChannels();
        setSelectedDate(getLocalDateString()); 
    }, [slug]);

    const loadChannelPrograms = async (channelId: string) => {
        try {
            const programs = await getProgramsForChannel(channelId);
            setChannelPrograms(programs);
        } catch (err) {
            console.error(err);
        }
    };

    // Date Tabs (BUGÜN and YARIN only)
    const dateTabs = useMemo(() => {
        const tabs = [];
        const today = new Date();
        
        // Today
        tabs.push({ 
            date: getLocalDateString(today), 
            label: 'BUGÜN' 
        });
        
        // Tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        tabs.push({ 
            date: getLocalDateString(tomorrow), 
            label: 'YARIN' 
        });
        
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

    if (!channel) {
        return (
            <div className="min-h-screen bg-black text-[#00FF00] font-mono flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Yayın Akışı Yükleniyor...</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black font-mono">
            {/* Header */}
            <PublicHeader 
                dateTabs={dateTabs}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                selectedChannelName={channel.name}
                channelColor={channel.color_primary}
                onMenuClick={() => setIsChannelListModalOpen(true)}
            />

            {/* Main Content */}
            <div className="max-w-6xl mx-auto p-4 md:p-8">
                
                {/* No total duration stat requested, just the day name if needed, but we put it in header. Let's just list the programs. */}
                
                <div className="bg-[#111] border-4 border-gray-800 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-center mb-6 border-b-4 border-gray-800 pb-4">
                        <h2 className="text-2xl font-bold text-[#00FF00] uppercase flex items-center gap-2">
                            Yayın Akışı_ 
                            <span className="text-white text-lg">
                                {dateTabs.find(t => t.date === selectedDate)?.label}
                            </span>
                        </h2>
                    </div>

                    <PublicProgramList 
                        programs={displayedPrograms}
                        liveProgramId={currentLiveProgram?.id}
                        channelSlug={channel.slug}
                    />
                </div>
            </div>

            {/* Modals */}
            <PublicChannelListModal 
                isOpen={isChannelListModalOpen}
                onClose={() => setIsChannelListModalOpen(false)}
                channels={channels}
                currentChannelId={channel.id}
            />
        </div>
    );
}
