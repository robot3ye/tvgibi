'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Channel } from '../../data/mockData';
import Link from 'next/link';

interface HomeSidebarProps {
    channels: Channel[];
}

const chars = '!<>-_\\\\/[]{}—=+*^?#________';

const ScrambleText = ({ text, delay = 0 }: { text: string, delay?: number }) => {
    const [displayText, setDisplayText] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let frame: number;
        let iteration = 0;
        
        const scramble = () => {
            const length = text.length;
            let result = '';
            for (let i = 0; i < length; i++) {
                if (i < iteration) {
                    result += text[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            setDisplayText(result);
            
            if (iteration < length) {
                iteration += 1 / 3; // speed of unscrambling
                frame = requestAnimationFrame(scramble);
            }
        };

        timeout = setTimeout(() => {
            frame = requestAnimationFrame(scramble);
        }, delay * 1000);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(frame);
        };
    }, [text, delay]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        let frame: number;
        let iteration = 0;
        
        const scramble = () => {
            const length = text.length;
            let result = '';
            for (let i = 0; i < length; i++) {
                if (i < iteration) {
                    result += text[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            if (textRef.current) {
                textRef.current.innerText = result;
            }
            
            if (iteration < length) {
                iteration += 1 / 2; // hover scramble speed
                frame = requestAnimationFrame(scramble);
            }
        };
        frame = requestAnimationFrame(scramble);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (textRef.current) {
            textRef.current.innerText = text;
        }
    };

    return (
        <span 
            ref={textRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`transition-colors duration-200 ${isHovered ? 'text-[#00ffff] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]' : 'text-[#d3f800]'}`}
        >
            {displayText}
        </span>
    );
};

export default function HomeSidebar({ channels }: HomeSidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (channels.length > 0) {
            const tl = gsap.timeline();
            
            tl.fromTo('.sidebar-footer', 
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 1 } 
            );
        }
    }, { scope: sidebarRef, dependencies: [channels.length] });

    return (
        <div ref={sidebarRef} className="h-full flex flex-col font-mono text-[#364153] relative">
            <div className="flex-1 overflow-y-auto p-8 space-y-4 pb-24 text-lg relative z-10 pt-12">
                {channels.map((channel, index) => {
                    const number = String(index + 1).padStart(2, '0');
                    const text = `[${number}] ${channel.name}`;
                    return (
                        <Link 
                            key={channel.id} 
                            href={`/@${channel.id}`}
                            className="sidebar-link block font-light cursor-pointer tracking-wider"
                        >
                            <ScrambleText text={text} delay={0.5 + (index * 0.1)} />
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
