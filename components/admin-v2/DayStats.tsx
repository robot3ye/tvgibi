import React from 'react';
import { Play } from 'lucide-react';

interface DayStatsProps {
    selectedDate: string;
    totalDurationSeconds: number;
    currentProgram?: { title: string; thumbnail?: string };
}

export default function DayStats({ selectedDate, totalDurationSeconds, currentProgram }: DayStatsProps) {
    const dateObj = new Date(selectedDate);
    // Get Day Name in Turkish (e.g., CUMARTESİ)
    const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'long' }).toUpperCase();
    
    // Format Duration
    const h = Math.floor(totalDurationSeconds / 3600);
    const m = Math.floor((totalDurationSeconds % 3600) / 60);
    const s = totalDurationSeconds % 60;

    // Calculate missing time from 24h (86400 seconds)
    const missingSeconds = 86400 - totalDurationSeconds;
    const missingH = Math.floor(missingSeconds / 3600);
    const missingM = Math.floor((missingSeconds % 3600) / 60);
    const missingS = missingSeconds % 60;
    
    const isFull = missingSeconds <= 0;

    return (
        <div className="flex flex-col md:flex-row border-b-4 border-black font-mono">
            {/* Left: ON_AIR (Green) */}
            <div className="w-full md:w-1/3 bg-[#00FF00] p-6 border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col justify-between relative">
                <div className="font-bold text-xl mb-4">ON_AIR:</div>
                
                <div className="relative border-4 border-black bg-black aspect-video mb-4 overflow-hidden group">
                    {currentProgram ? (
                        <>
                            <img src={currentProgram.thumbnail} alt="Live" className="w-full h-full object-cover opacity-80" />
                            <div className="absolute bottom-4 right-4">
                                <button className="bg-black text-[#00FF00] border-2 border-[#00FF00] px-4 py-1 text-sm font-bold hover:bg-[#00FF00] hover:text-black transition-colors">
                                    YAYINA BAĞLAN
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            OFFLINE
                        </div>
                    )}
                </div>

                <div className="bg-black text-[#00FF00] p-2 text-xs mb-2 truncate border-2 border-[#00FF00]">
                    {currentProgram ? currentProgram.title : 'Yayın Yok'}
                </div>

                <div className="bg-[#ff0055] text-white p-1 text-xs font-bold border-2 border-black w-fit px-2">
                    {currentProgram ? 'YAYINDA' : 'BEKLEMEDE'}
                </div>
            </div>

            {/* Right: Stats (Orange) */}
            <div className="w-full md:w-2/3 bg-[#FF6600] p-8 flex flex-col justify-center relative">
                <h2 className="text-4xl text-white font-normal mb-2">Yayın Akışı_</h2>
                <h1 className="text-6xl md:text-8xl font-black text-[#99FFCC] tracking-tighter leading-none mb-4">
                    {dayName}
                </h1>
                <p className="text-white text-lg mb-2">gününe ait toplam yayın:</p>
                
                <div className="bg-black text-white p-2 inline-block text-2xl md:text-3xl font-bold border-4 border-white transform -rotate-1 origin-left w-fit mb-4">
                    {h}saat {m}dakika {s}saniye
                </div>

                {!isFull && (
                    <div className="bg-[#FFFF00] text-black text-xs font-bold px-2 py-1 border-2 border-black w-fit transform rotate-1">
                        Akış 24 saatten az: {missingH} saat {missingM} dakika {missingS} saniye eksik!!!!!!!
                    </div>
                )}
                
                {/* Decorative side bar */}
                <div className="absolute right-0 top-10 w-4 h-24 bg-[#0000FF] border-l-2 border-black"></div>
            </div>
        </div>
    );
}
