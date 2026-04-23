import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Volume2, VolumeX, Maximize, Copy, List, ChevronLeft, ChevronRight, GripHorizontal, Subtitles, Plus, Minus } from 'lucide-react';
import gsap from 'gsap';

interface RemoteButtonProps {
    label: React.ReactNode;
    colorClass: string;
    colSpan?: number;
    onClick: () => void;
    centered?: boolean;
}

const RemoteButton = ({ label, colorClass, colSpan = 1, onClick, centered = false }: RemoteButtonProps) => {
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleMouseEnter = () => {
        gsap.to(btnRef.current, { scale: 0.95, duration: 0.2, ease: 'power2.out' });
    };

    const handleMouseLeave = () => {
        gsap.to(btnRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
    };

    return (
        <button
            ref={btnRef}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`group ${colorClass} p-3 font-mono font-bold border-4 border-black flex flex-col ${centered ? 'items-center justify-center' : 'items-start justify-end'} leading-tight hover:brightness-110 active:translate-x-1 active:translate-y-1 transition-colors`}
            style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
        >
            {label}
        </button>
    );
};

interface RemoteControlProps {
    remotePosition: { x: number, y: number } | undefined;
    draggableNodeRef: React.RefObject<HTMLDivElement | null>;
    showControls: boolean;
    volume: number;
    setVolume: React.Dispatch<React.SetStateAction<number>>;
    subtitleLang: string | null;
    onSubtitleToggle: () => void;
    handleRemoteDragStop: (e: any, data: { x: number, y: number }) => void;
    handleFullscreen: () => void;
    copyLink: () => void;
    onPrevChannel: () => void;
    onNextChannel: () => void;
    onOpenChannelList: () => void;
    onGoHome: () => void;
    onOpenSchedule: () => void;
    channelColor: string;
    onSelectChannelNumber: (num: number) => void;
    onRandomChannel: () => void;
    onTurnOffTV: () => void;
}

export default function RemoteControl({
    remotePosition,
    draggableNodeRef,
    showControls,
    volume,
    setVolume,
    subtitleLang,
    onSubtitleToggle,
    handleRemoteDragStop,
    handleFullscreen,
    copyLink,
    onPrevChannel,
    onNextChannel,
    onOpenChannelList,
    onGoHome,
    onOpenSchedule,
    channelColor,
    onSelectChannelNumber,
    onRandomChannel,
    onTurnOffTV
}: RemoteControlProps) {
    const [scale, setScale] = useState(1);
    const [isNumericPad, setIsNumericPad] = useState(false);

    // Load saved scale from local storage
    useEffect(() => {
        const savedScale = localStorage.getItem('remoteScale');
        if (savedScale) {
            setScale(parseFloat(savedScale));
        } else {
            setScale(0.8);
        }
    }, []);

    const handleScaleChange = (newScale: number) => {
        const boundedScale = Math.min(Math.max(newScale, 0.5), 2);
        setScale(boundedScale);
        localStorage.setItem('remoteScale', boundedScale.toString());
    };

    const colorBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (colorBarRef.current) {
            const children = colorBarRef.current.children;
            gsap.fromTo(children, 
                { height: 0 }, 
                { height: '100%', duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.5 }
            );
        }
    }, []);

    if (remotePosition === undefined) return null;

    return (
        <Draggable 
            handle=".handle" 
            nodeRef={draggableNodeRef}
            defaultPosition={remotePosition}
            onStop={handleRemoteDragStop}
            bounds="parent"
            scale={scale}
        >
            <div 
                ref={draggableNodeRef} 
                className={`absolute z-[9999] transition-opacity duration-500 ${showControls ? 'opacity-90 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                style={{ 
                    width: '340px',
                    height: '570px'
                }}
            >
                {/* Remote Container: 340px wide, ~570px high */}
                <div 
                    className="w-full h-full bg-white/40 backdrop-blur-md border-[6px] border-black flex flex-col"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                >

                    
                    {/* TOP BAR: Drag Handle */}
                    <div 
                        className="handle h-14 w-full border-b-[6px] border-black flex items-center justify-between px-2 cursor-grab active:cursor-grabbing shrink-0"
                        style={{ backgroundColor: channelColor }}
                    >
                        <div className="flex gap-1 items-center z-50 bg-white border-2 border-black p-1">
                            <button 
                                onPointerDown={(e) => e.stopPropagation()} 
                                onClick={() => handleScaleChange(scale - 0.1)} 
                                className="hover:bg-gray-200 transition-colors"
                            >
                                <Minus size={14} color="black" />
                            </button>
                            <span className="text-[10px] font-mono text-black font-bold">{Math.round(scale * 100)}%</span>
                            <button 
                                onPointerDown={(e) => e.stopPropagation()} 
                                onClick={() => handleScaleChange(scale + 0.1)} 
                                className="hover:bg-gray-200 transition-colors"
                            >
                                <Plus size={14} color="black" />
                            </button>
                        </div>
                        <div className="flex-grow flex justify-center">
                            <GripHorizontal size={28} color="black" />
                        </div>
                        <div className="w-[60px]"></div> {/* Spacer */}
                    </div>

                    {/* MAIN BUTTONS AREA */}
                    <div className="flex-grow p-3 flex flex-col gap-3">
                        {!isNumericPad ? (
                            <div className="grid grid-cols-3 grid-rows-5 gap-3 h-full">
                                {/* Row 1 */}
                                <RemoteButton 
                                    label={<><span className="text-3xl">Kanal +</span></>} 
                                    colorClass="bg-[#1e3a8a] text-white" colSpan={2} 
                                    onClick={onNextChannel} 
                                />
                                <RemoteButton 
                                    label={<><span className="text-xl">Ses +</span></>} 
                                    colorClass="bg-[#f97316] text-white" 
                                    onClick={() => setVolume(v => Math.min(v + 10, 100))} 
                                />
                                
                                {/* Row 2 */}
                                <RemoteButton 
                                    label={<><span className="text-3xl">Kanal -</span></>} 
                                    colorClass="bg-[#1e3a8a] text-white" colSpan={2} 
                                    onClick={onPrevChannel} 
                                />
                                <RemoteButton 
                                    label={<><span className="text-xl">Ses -</span></>} 
                                    colorClass="bg-[#f97316] text-white" 
                                    onClick={() => setVolume(v => Math.max(v - 10, 0))} 
                                />
                                
                                {/* Row 3 */}
                                <RemoteButton 
                                    label={<>Yayın<br/>Akışı_</>} 
                                    colorClass="bg-[#f2eaa5] text-[#000000] text-base" 
                                    onClick={onOpenSchedule} 
                                />
                                <RemoteButton 
                                    label={<>Kanal_<br/>Listesi</>} 
                                    colorClass="bg-[#5ff0ff] text-[#000000] text-base" 
                                    onClick={onOpenChannelList} 
                                />
                                <RemoteButton 
                                    label="Sessiz_" 
                                    colorClass="bg-[#ffae00] text-[#000000] text-base" 
                                    onClick={() => setVolume(v => v === 0 ? 50 : 0)} 
                                />
                                
                                {/* Row 4 */}
                                <RemoteButton 
                                    label={<i className="fa-solid fa-closed-captioning text-4xl"></i>} 
                                    colorClass="bg-[#00fe01] text-[#000000]" 
                                    onClick={onSubtitleToggle}
                                    centered 
                                />
                                <RemoteButton 
                                    label={<i className="fa-solid fa-shuffle text-4xl"></i>} 
                                    colorClass="bg-[#fcfc03] text-[#000000]" 
                                    onClick={onRandomChannel}
                                    centered 
                                />
                                <RemoteButton 
                                    label={<i className="fa-brands fa-youtube text-4xl"></i>} 
                                    colorClass="bg-[#000000] text-[#fd0000]" 
                                    onClick={copyLink}
                                    centered 
                                />

                                {/* Row 5 */}
                                <RemoteButton 
                                    label={<i className="fa-solid fa-house text-4xl"></i>} 
                                    colorClass="bg-[#000000] text-[#00ff00]" 
                                    onClick={onGoHome}
                                    centered 
                                />
                                <RemoteButton 
                                    label={<i className="fa-solid fa-skull text-4xl"></i>} 
                                    colorClass="bg-[#fd0000] text-[#000000]" 
                                    onClick={onTurnOffTV}
                                    centered 
                                />
                                <RemoteButton 
                                    label={<i className="fa-solid fa-expand text-4xl"></i>} 
                                    colorClass="bg-[#ffffff] text-[#000000]" 
                                    onClick={handleFullscreen}
                                    centered 
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 grid-rows-4 gap-3 h-full">
                                <RemoteButton label={<span className="text-4xl text-white group-hover:text-[#00ff00] transition-colors">1</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(1)} />
                                <RemoteButton label={<span className="text-4xl text-white">2</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(2)} />
                                <RemoteButton label={<span className="text-4xl text-white">3</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(3)} />
                                
                                <RemoteButton label={<span className="text-4xl text-white">4</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(4)} />
                                <RemoteButton label={<span className="text-4xl text-white">5</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(5)} />
                                <RemoteButton label={<span className="text-4xl text-white">6</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(6)} />
                                
                                <RemoteButton label={<span className="text-4xl text-white">7</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(7)} />
                                <RemoteButton label={<span className="text-4xl text-white">8</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(8)} />
                                <RemoteButton label={<span className="text-4xl text-white">9</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(9)} />
                                
                                <RemoteButton label={<span className="text-xl text-black">Menu</span>} colorClass="bg-yellow-400" centered onClick={() => setIsNumericPad(false)} />
                                <RemoteButton label={<span className="text-4xl text-white">0</span>} colorClass="bg-black" centered onClick={() => onSelectChannelNumber(0)} />
                                <RemoteButton label={<span className="text-xl text-black">Mute</span>} colorClass="bg-orange-500" centered onClick={() => setVolume(v => v === 0 ? 50 : 0)} />
                            </div>
                        )}
                    </div>

                    {/* 8 COLOR TEST PATTERN BAR */}
                    <div ref={colorBarRef} className="h-[40px] w-full flex shrink-0 border-y-[6px] border-black items-end overflow-hidden mt-auto">
                        <div className="flex-1 bg-gray-400 h-full"></div>
                        <div className="flex-1 bg-yellow-400 h-full"></div>
                        <div className="flex-1 bg-cyan-400 h-full"></div>
                        <div className="flex-1 bg-green-500 h-full"></div>
                        <div className="flex-1 bg-fuchsia-500 h-full"></div>
                        <div className="flex-1 bg-red-500 h-full"></div>
                        <div className="flex-1 bg-blue-600 h-full"></div>
                        <div className="flex-1 bg-black h-full"></div>
                    </div>
                </div>
            </div>
        </Draggable>
    );
}
