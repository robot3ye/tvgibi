import React from 'react';

interface ZappingNoiseProps {
    isZapping: boolean;
}

export default function ZappingNoise({ isZapping }: ZappingNoiseProps) {
    if (!isZapping) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-black pointer-events-none flex items-center justify-center">
            <img 
                src="/noise.gif" 
                alt="TV Noise" 
                className="w-full h-full object-cover mix-blend-screen"
            />
        </div>
    );
}
