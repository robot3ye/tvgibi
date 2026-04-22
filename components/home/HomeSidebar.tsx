'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Channel } from '../../data/mockData';
import Link from 'next/link';
import Grainient from '../ui/Grainient';

interface HomeSidebarProps {
    channels: Channel[];
}

export default function HomeSidebar({ channels }: HomeSidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (channels.length > 0) {
            const tl = gsap.timeline();
            
            tl.fromTo('.sidebar-header', 
                { x: 50, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.8 }
            )
            .fromTo('.sidebar-link', 
                { x: 30, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.2)' }, 
                "-=0.2"
            )
            .fromTo('.sidebar-footer', 
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 
                "-=0.2"
            );
        }
    }, { scope: sidebarRef, dependencies: [channels.length] });

    return (
        <div ref={sidebarRef} className="h-full flex flex-col font-mono text-[#364153] relative">
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
            <div className="sidebar-header bg-[#FF00FF] p-4 border-b-4 border-black relative z-10">
                <h2 className="text-3xl font-bold lowercase tracking-tighter text-white">kanal-list:</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 text-lg relative z-10">
                {channels.map((channel, index) => {
                    const number = String(index + 1).padStart(2, '0');
                    return (
                        <Link 
                            key={channel.id} 
                            href={`/channel/${channel.id}`}
                            className="sidebar-link block hover:text-black hover:bg-[#FF00FF] px-2 py-1 -mx-2 transition-colors cursor-pointer font-bold"
                        >
                            [{number}] {channel.name}
                        </Link>
                    );
                })}
            </div>
            <div className="sidebar-footer p-4 border-t-4 border-black bg-[#00FF00] absolute bottom-0 w-full left-0 z-10">
                <button className="w-full bg-[#E0E0E0] text-black border-2 border-black py-2 rounded-full font-bold text-sm hover:bg-white transition-colors">
                    tvgibi.tv nedir?
                </button>
            </div>
        </div>
    );
}
