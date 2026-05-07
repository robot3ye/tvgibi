'use client';

import React, { useState, useEffect } from 'react';
import { Channel, Program } from '../../data/mockData';
import Link from 'next/link';

interface ChannelDisplayCardProps {
    channel: Channel;
    program: Program | null;
    nextProgram?: Program | null;
    currentTime?: Date | null;
}

export default function ChannelDisplayCard({ channel, program, nextProgram, currentTime }: ChannelDisplayCardProps) {
    const bgColor = channel.color_primary || '#ff9c2f';
    const [isHovered, setIsHovered] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [typingIndex, setTypingIndex] = useState(0);

    // Calculate remaining time and flash warning
    let remainingText = '';
    let isEndingSoon = false;
    
    if (program && currentTime) {
        const [startH, startM, startS] = program.startTime.split(':').map(Number);
        const [endH, endM, endS] = program.endTime.split(':').map(Number);
        
        const startTotal = startH * 3600 + startM * 60 + (startS || 0);
        let endTotal = endH * 3600 + endM * 60 + (endS || 0);
        const currentTotal = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
        
        // Handle midnight crossing
        if (endTotal < currentTotal && endTotal < 6 * 3600) {
            endTotal += 24 * 3600;
        }

        const diffSeconds = endTotal - currentTotal;
        if (diffSeconds > 0) {
            const remainingMins = Math.floor(diffSeconds / 60);
            remainingText = `BU PROGRAMIN BİTMESİNE ${remainingMins} DK KALDI..`;
            if (diffSeconds < 60) {
                isEndingSoon = true;
            }
        } else {
            remainingText = 'PROGRAM BİTMEK ÜZERE..';
            isEndingSoon = true;
        }
    } else if (program) {
        // Fallback if currentTime is not available
        remainingText = 'SÜRE HESAPLANIYOR..';
    }

    // Next Program Text
    let nextText = '';
    if (nextProgram) {
        nextText = `BİR SONRAKİ PROGRAM_\n> ${nextProgram.title}\n> YOUTUBE CREATOR BY: ${nextProgram.creator || 'tvgibi.tv'}`;
    } else {
        nextText = `BİR SONRAKİ PROGRAM_\n> YAYIN AKIŞI BULUNAMADI`;
    }

    const terminalText = program 
        ? `[ BAĞLANTI KURULDU... ]\n\n${remainingText}\n\n[NEXT_PROGRAM_START]${nextText}[NEXT_PROGRAM_END]\n\n[ KANAL AKTİF... ]\n\nİZLEMEK İÇİN TIKLA...`
        : `> STATUS: OFFLINE\n> NO SIGNAL DETECTED\n\n[ BEKLEYİNİZ... ]`;

    // Typewriter effect logic
    useEffect(() => {
        if (!isHovered) {
            setDisplayedText('');
            setTypingIndex(0);
            return;
        }

        if (typingIndex < terminalText.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + terminalText.charAt(typingIndex));
                setTypingIndex(prev => prev + 1);
            }, 10); // Speed of typing
            return () => clearTimeout(timeout);
        }
    }, [isHovered, typingIndex, terminalText]);

    // Formatting start and end times for non-hover state (removing seconds)
    const formatTimeWithoutSeconds = (timeStr: string) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
        return timeStr;
    };

    return (
        <Link 
            href={`/channel/${channel.slug}`} 
            className="block h-full group relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div 
                className="border-4 border-black h-full flex flex-col"
                style={{ backgroundColor: bgColor }}
            >
                {/* Header / Logo Area */}
                <div className="bg-black border-b-4 border-black aspect-[16/4.5] flex items-center justify-center relative overflow-hidden"
                     style={{ borderColor: bgColor }}>
                    {channel.logo_corner ? (
                        <img 
                            src={channel.logo_corner} 
                            alt={channel.name} 
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <h2 className="text-white text-2xl font-bold uppercase tracking-widest px-4 text-center">
                            {channel.name}
                        </h2>
                    )}
                </div>

                {/* Timing Strip */}
                <div className={`bg-black font-mono text-center py-1.5 my-[15px] border-y-4 border-black text-sm md:text-base font-bold tracking-tight transition-colors ${isEndingSoon ? 'text-red-500 animate-pulse' : 'text-[#00FF00]'}`}>
                    {program ? `Başlangıç_${formatTimeWithoutSeconds(program.startTime)} -- Bitiş_${formatTimeWithoutSeconds(program.endTime)}` : 'Yayın Yok'}
                </div>

                {/* Thumbnail Area - Forced 16:9 with black bg */}
                <div className="bg-black aspect-video relative border-y-4 border-black flex items-center justify-center overflow-hidden">
                    {program?.thumbnail ? (
                        <img 
                            src={program.thumbnail} 
                            alt={program.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-white/50 font-mono text-sm">Sinyal Yok</div>
                    )}
                </div>

                {/* Program Details Area */}
                <div className="p-4 flex-1 flex flex-col">
                    {/* Title */}
                    <div className="flex-1 min-h-[80px]">
                        <h3 className="text-black font-bold text-sm md:text-base leading-tight line-clamp-4">
                            {program ? program.title : 'Şu an yayın akışı bulunmuyor.'}
                        </h3>
                    </div>

                    {/* Creator Area */}
                    <div className="mt-4 pt-4 border-t-2 border-black relative z-10">
                        <p className="text-black text-sm font-bold mb-1">Youtube Creator:</p>
                        <p className="text-black italic font-medium leading-tight">
                            {program?.creator ? program.creator : 'tvgibi.tv'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Hover Overlay: Slide down from top */}
            <div className="absolute inset-0 bg-[#131313] -translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-20 flex flex-col p-6">
                
                {/* Channel Logo (Top) */}
                <div className="h-[20%] flex items-start justify-start border-b-2 border-[#00b7ff]/30 pb-4 mb-4">
                    {channel.logo_corner ? (
                        <img 
                            src={channel.logo_corner} 
                            alt={channel.name} 
                            className="h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,183,255,0.5)]"
                            style={{ 
                                // Terminal-like cyan tint
                                filter: 'sepia(1) hue-rotate(180deg) saturate(3) brightness(1.2)'
                            }}
                        />
                    ) : (
                        <h2 className="text-[#00b7ff] text-2xl font-bold uppercase tracking-widest">
                            {channel.name}
                        </h2>
                    )}
                </div>

                {/* Terminal Typewriter Text */}
                <div className="flex-1 overflow-hidden relative mt-2">
                    <pre className="text-[#00FF00] font-mono text-[10px] md:text-xs lg:text-sm whitespace-pre-wrap leading-tight md:leading-relaxed drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]">
                        {displayedText.split('[NEXT_PROGRAM_START]').map((part, i) => {
                            if (i === 0) return part;
                            
                            const subParts = part.split('[NEXT_PROGRAM_END]');
                            const nextProgText = subParts[0];
                            const remaining = subParts[1] || '';
                            
                            return (
                                <React.Fragment key={i}>
                                    <span className="text-[#00b7ff] drop-shadow-[0_0_5px_rgba(0,183,255,0.8)]">{nextProgText}</span>
                                    {remaining}
                                </React.Fragment>
                            );
                        })}
                        <span className="animate-pulse">_</span>
                    </pre>
                </div>
                
                {/* Flashing prompt at bottom */}
                <div className="mt-auto pt-4 flex justify-between items-center border-t-2 border-[#00FF00]/30 text-[#00FF00] font-mono font-bold">
                    <span className="text-xs opacity-70">tvgibi.tv/channel/{channel.slug}</span>
                </div>
            </div>
        </Link>
    );
}
