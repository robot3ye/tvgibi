import React from 'react';
import { Channel, Program } from '../../data/mockData';

interface ProgramInfoCardProps {
    showControls: boolean;
    currentProgram: Program | null;
    nextProgram: Program | null;
    channel: Channel;
    progress: number;
}

export default function ProgramInfoCard({ 
    showControls, 
    currentProgram, 
    nextProgram, 
    channel, 
    progress 
}: ProgramInfoCardProps) {
    if (!currentProgram) return null;

    return (
        <div className={`absolute top-8 left-8 z-40 max-w-[30%] min-w-[350px] transition-opacity duration-500 mt-[25px] ml-[25px] hover:opacity-100 ${showControls ? 'opacity-30' : 'opacity-0'}`}>
            <div 
                className="p-6 text-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                style={{ backgroundColor: channel.color_primary || '#00FF4F' }}
            >
                <h1 className="text-xl font-bold uppercase leading-tight mb-4">
                    {currentProgram.title}
                </h1>
                
                <div className="mb-4">
                    <span className="text-sm font-bold opacity-80">Youtube Creator:</span>
                    <br />
                    <span className="font-bold">{currentProgram.creator || channel.name}</span>
                </div>

                <p className="text-sm font-medium mb-6 line-clamp-4">
                    {currentProgram.description}
                </p>

                {/* Progress Bar Row */}
                <div className="flex items-center gap-4 mb-6 font-bold">
                    <span>{currentProgram.startTime}</span>
                    <div className="flex-1 h-3 bg-black relative">
                        <div 
                            className="absolute top-0 left-0 h-full transition-all duration-1000 ease-linear"
                            style={{ 
                                width: `${progress}%`,
                                backgroundColor: 'rgba(255,255,255,0.8)' // A lighter fill over black track
                            }}
                        />
                    </div>
                    <span>{currentProgram.endTime}</span>
                </div>

                {/* Next Program */}
                {nextProgram && (
                    <div className="border-t-2 border-black pt-4">
                        <span className="text-sm font-bold opacity-80">Sonraki Program:</span>
                        <br />
                        <span className="font-bold uppercase">{nextProgram.title}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
