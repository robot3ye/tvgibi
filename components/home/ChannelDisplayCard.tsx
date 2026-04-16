'use client';

import React from 'react';
import { Channel, Program } from '../../data/mockData';
import Link from 'next/link';

interface ChannelDisplayCardProps {
    channel: Channel;
    program: Program | null;
}

export default function ChannelDisplayCard({ channel, program }: ChannelDisplayCardProps) {
    const bgColor = channel.color_primary || '#ff9c2f';

    return (
        <Link href={`/channel/${channel.slug}`} className="block h-full group relative overflow-hidden">
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
                <div className="bg-black text-[#00FF00] font-mono text-center py-1.5 my-[15px] border-y-4 border-black text-sm md:text-base font-bold tracking-tight">
                    {program ? `Başlangıç_${program.startTime} -- Bitiş_${program.endTime}` : 'Yayın Yok'}
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
            <div className="absolute inset-0 bg-black flex items-center justify-center -translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-20">
                <span className="text-[#00FF00] font-mono text-5xl font-bold tracking-widest animate-pulse">İZLE_</span>
            </div>
        </Link>
    );
}
