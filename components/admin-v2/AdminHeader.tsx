import React from 'react';
import { Menu } from 'lucide-react';

interface AdminHeaderProps {
    dateTabs: { date: string; label: string }[];
    selectedDate: string;
    onDateSelect: (date: string) => void;
    onMenuClick: () => void;
}

export default function AdminHeader({ dateTabs, selectedDate, onDateSelect, onMenuClick }: AdminHeaderProps) {
    return (
        <header className="bg-[#00FF00] p-2 flex items-center justify-between border-b-4 border-black">
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
                <h1 className="font-mono font-black text-2xl tracking-tighter text-black hidden md:block">
                    MusicBox
                </h1>
                <button 
                    onClick={onMenuClick}
                    className="p-1 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>
        </header>
    );
}
