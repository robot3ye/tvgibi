'use client';

import React from 'react';
import { Channel } from '../../data/mockData';
import Link from 'next/link';

interface HomeSidebarProps {
    channels: Channel[];
}

export default function HomeSidebar({ channels }: HomeSidebarProps) {
    return (
        <div className="h-full flex flex-col font-mono text-[#364153]">
            <div className="bg-[#FF00FF] p-4 border-b-4 border-black">
                <h2 className="text-3xl font-bold lowercase tracking-tighter text-white">kanal-list:</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 text-lg">
                {channels.map((channel, index) => {
                    const number = String(index + 1).padStart(2, '0');
                    return (
                        <Link 
                            key={channel.id} 
                            href={`/channel/${channel.id}`}
                            className="block hover:text-black hover:bg-[#FF00FF] px-2 py-1 -mx-2 transition-colors cursor-pointer font-bold"
                        >
                            [{number}] {channel.name}
                        </Link>
                    );
                })}
            </div>
            <div className="p-4 border-t-4 border-black bg-[#00FF00] absolute bottom-0 w-full left-0">
                <button className="w-full bg-[#E0E0E0] text-black border-2 border-black py-2 rounded-full font-bold text-sm hover:bg-white transition-colors">
                    tvgibi.tv nedir?
                </button>
            </div>
        </div>
    );
}
