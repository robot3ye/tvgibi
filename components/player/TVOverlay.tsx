import React from 'react';
import { Channel } from '../../data/mockData';

interface TVOverlayProps {
    showUI: boolean;
    channel: Channel;
    allChannels: Channel[];
}

export default function TVOverlay({ showUI, channel, allChannels }: TVOverlayProps) {
    const channelIndex = allChannels.findIndex(c => c.id === channel.id);
    const channelNumber = String(channelIndex + 1).padStart(2, '0');

    return (
        <>
            {/* 25px Dynamic Border around the whole screen */}
            <div 
                className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0'}`}
                style={{ border: `25px solid ${channel.color_primary || '#00FF4F'}` }}
            ></div>

            {/* Top Navigation - Right Corner Badge */}
            <div className={`absolute top-8 right-8 z-50 transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex flex-col items-end pointer-events-none mt-[25px] mr-[25px]">
                    {/* Channel Number (e.g. [01]) */}
                    <div 
                        className="text-6xl md:text-8xl font-bold tracking-widest leading-none mb-2"
                        style={{ color: channel.color_primary || '#00FF4F' }}
                    >
                        [{channelNumber}]
                    </div>
                    {/* Channel Logo/Name Box */}
                    <div className="w-full flex justify-end">
                        <div className="bg-black py-2 flex justify-center w-full max-w-full">
                            {channel.logo_corner ? (
                                <img src={channel.logo_corner} alt={channel.name} className="h-8 md:h-12 object-contain" />
                            ) : (
                                <span className="text-white font-bold text-xl md:text-3xl uppercase tracking-widest">{channel.name}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
