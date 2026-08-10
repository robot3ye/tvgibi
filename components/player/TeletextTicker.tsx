'use client';

import React, { useEffect, useState, useRef } from 'react';

interface TeletextTickerProps {
    channelName: string;
    programTitle: string;
}

export default function TeletextTicker({ channelName, programTitle }: TeletextTickerProps) {
    const [news, setNews] = useState<string>('TELETEXT BAĞLANTISI ARANIYOR...');
    const lastProgramRef = useRef<string>('');

    useEffect(() => {
        let isMounted = true;

        const fetchNews = async () => {
            if (!channelName || !programTitle) return;
            
            // Only fetch if the program actually changed to save some sanity, 
            // but we fetch every time it mounts/changes.
            if (lastProgramRef.current === programTitle) return;
            
            try {
                setNews('SİNYAL ALINIYOR...');
                const res = await fetch('/api/teletext', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channelName, programTitle }),
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setNews(`*** FLAŞ: ${data.text} ***`);
                        lastProgramRef.current = programTitle;
                    }
                } else {
                    if (isMounted) setNews('*** YAYIN KESİNTİSİ... ***');
                }
            } catch (err) {
                if (isMounted) setNews('*** SİSTEM HATASI ***');
            }
        };

        fetchNews();

        // Also fetch a new absurd news every 3 minutes just to keep it fresh and burn credits :)
        const interval = setInterval(() => {
            lastProgramRef.current = ''; // Reset to force fetch
            fetchNews();
        }, 180000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [channelName, programTitle]);

    return (
        <div className="w-full bg-black border-t-4 border-[#00FF00] overflow-hidden flex items-center h-8 relative z-50 pointer-events-auto">
            <div className="bg-[#00FF00] text-black font-bold h-full px-3 flex items-center shrink-0 z-10 border-r-4 border-black">
                TELETEXT
            </div>
            <div className="flex-1 overflow-hidden whitespace-nowrap h-full flex items-center relative">
                <div className="inline-block animate-[marquee_20s_linear_infinite] text-[#00FF00] font-mono tracking-widest uppercase text-sm font-bold shadow-[0_0_10px_rgba(0,255,0,0.5)]">
                    {news}
                </div>
            </div>
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(100vw); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
