import React from 'react';
import { Menu, Home } from 'lucide-react';
import Link from 'next/link';

interface PublicHeaderProps {
    dateTabs: { date: string; label: string }[];
    selectedDate: string;
    onDateSelect: (date: string) => void;
    onMenuClick: () => void;
    selectedChannelName?: string;
    channelColor?: string;
}

export default function PublicHeader({ dateTabs, selectedDate, onDateSelect, onMenuClick, selectedChannelName, channelColor = '#00FF00' }: PublicHeaderProps) {
    return (
        <header className="p-2 flex items-center justify-between border-b-4 border-black" style={{ backgroundColor: channelColor }}>
            <div className="flex space-x-2 overflow-x-auto no-scrollbar">
                {dateTabs.map((tab) => {
                    const isActive = selectedDate === tab.date;
                    return (
                        <button
                            key={tab.date}
                            onClick={() => onDateSelect(tab.date)}
                            className={`
                                px-4 py-1 rounded-full text-xs font-bold font-mono border-2 border-black transition-transform active:scale-95 whitespace-nowrap
                                ${isActive ? 'bg-black text-[#00FF00]' : 'bg-[#FFFF00] text-black hover:bg-white'}
                            `}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            
            <div className="flex items-center space-x-4 pl-4">
                <h1 className="font-mono font-black text-2xl tracking-tighter text-black hidden md:block uppercase">
                    Yayın Akışı_ {selectedChannelName}
                </h1>
                
                <Link href="/" className="p-1 bg-black text-white rounded hover:bg-gray-800 transition-colors" title="Anasayfaya Dön">
                    <Home size={24} />
                </Link>
                
                <button 
                    onClick={onMenuClick}
                    className="p-1 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                    title="Kanal Değiştir"
                >
                    <Menu size={24} />
                </button>
            </div>
        </header>
    );
}
