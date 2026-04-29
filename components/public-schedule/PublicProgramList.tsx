import React from 'react';
import { Program } from '../../data/mockData';
import Link from 'next/link';

interface PublicProgramRowProps {
    program: Program;
    index: number;
    isLive?: boolean;
    channelSlug: string;
}

function PublicProgramRow({ program, index, isLive, channelSlug }: PublicProgramRowProps) {
    // Determine Color Scheme based on time
    const hour = parseInt(program.startTime.split(':')[0], 10);
    let rowClass = '';
    let textClass = '';
    let badgeClass = '';

    if (isLive) {
        // Live Program: Green
        rowClass = 'bg-[#00FF00] border-black';
        textClass = 'text-black';
        badgeClass = 'bg-black text-[#00FF00]';
    } else if (hour >= 6 && hour < 12) {
        // Morning: Yellow
        rowClass = 'bg-[#FFFF00] border-black';
        textClass = 'text-black';
        badgeClass = 'bg-black text-[#FFFF00]';
    } else if (hour >= 12 && hour < 18) {
        // Afternoon: Orange
        rowClass = 'bg-[#FF9900] border-black';
        textClass = 'text-black';
        badgeClass = 'bg-black text-[#FF9900]';
    } else {
        // Night/Evening: Navy
        rowClass = 'bg-[#000080] border-white/20';
        textClass = 'text-white';
        badgeClass = 'bg-white text-[#000080]';
    }

    return (
        <div 
            className={`
                flex items-center gap-4 p-2 mb-1 border-b-2 font-mono group select-none transition-transform hover:scale-[1.01]
                ${rowClass}
            `}
        >
            {/* Index Badge */}
            <div className={`
                ml-2 font-bold font-mono px-2 py-1 text-sm border-2 border-current rounded flex items-center gap-2 shrink-0
                ${badgeClass}
            `}>
                {isLive && <span className="animate-pulse">●</span>}
                {String(index + 1).padStart(3, '0')}
            </div>

            {/* Thumbnail - Links to the channel */}
            <Link href={`/channel/${channelSlug}`} className="group/thumb relative w-24 h-14 bg-black border-2 border-black overflow-hidden shrink-0 block cursor-pointer">
                <img src={program.thumbnail} alt="" className="w-full h-full object-cover opacity-90 group-hover/thumb:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 bg-black text-white text-[10px] px-1 font-bold z-10">
                    {program.duration ? `${Math.floor(program.duration / 60)}:${String(program.duration % 60).padStart(2, '0')}` : ''}
                </div>
                {/* Hover overlay for 'Yayına Bağlan' */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity z-20">
                    <span className="text-[#00FF00] text-[10px] font-bold text-center leading-tight">YAYINA<br/>BAĞLAN</span>
                </div>
            </Link>

            {/* Time Info */}
            <div className={`flex flex-col text-xs font-bold shrink-0 ${textClass} w-24`}>
                <span>Start_{program.startTime}</span>
                <span className="opacity-70">End__{program.endTime}</span>
            </div>

            {/* Title */}
            <div className={`flex-grow min-w-0 font-bold text-sm truncate ${textClass}`}>
                {program.title}
                {isLive && <span className="ml-2 px-1 bg-black text-white text-[10px] inline-block animate-pulse">ON AIR</span>}
            </div>
            
            {/* Direct Watch Button (optional visible on hover, but we put it on thumbnail already. Let's add a button on the right for mobile friendliness) */}
            <div className="pr-2 shrink-0">
                <Link 
                    href={`/channel/${channelSlug}`}
                    className={`px-3 py-1 text-xs font-bold uppercase border-2 transition-colors
                        ${isLive ? 'bg-black text-[#00FF00] border-black hover:bg-white hover:text-black' : 'bg-transparent border-current hover:bg-current hover:text-black opacity-0 group-hover:opacity-100'}
                    `}
                    style={!isLive ? { 
                        // Trick to invert color on hover without hardcoding rowClass text color
                        // We use group-hover for visibility and standard css for colors
                    } : {}}
                >
                    {isLive ? 'ŞU AN İZLE' : 'KANALA GİT'}
                </Link>
            </div>
        </div>
    );
}

// --- Main List Component ---
interface PublicProgramListProps {
    programs: Program[];
    liveProgramId?: string;
    channelSlug: string;
}

export default function PublicProgramList({ 
    programs, liveProgramId, channelSlug
}: PublicProgramListProps) {
    if (programs.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 font-mono">
                Seçili gün için yayın akışı bulunamadı.
            </div>
        );
    }

    return (
        <div className="flex flex-col pb-20">
            {programs.map((program, index) => (
                <PublicProgramRow 
                    key={program.id} 
                    program={program} 
                    index={index} 
                    isLive={program.id === liveProgramId}
                    channelSlug={channelSlug}
                />
            ))}
        </div>
    );
}
