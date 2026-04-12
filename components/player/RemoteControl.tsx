import React from 'react';
import Draggable from 'react-draggable';
import { Volume2, VolumeX, Maximize, Copy, List, ChevronLeft, ChevronRight, GripHorizontal, Subtitles } from 'lucide-react';

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
    onGoHome: () => void;
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
    onGoHome
}: RemoteControlProps) {
    if (remotePosition === undefined) return null;

    return (
        <Draggable 
            handle=".handle" 
            nodeRef={draggableNodeRef}
            position={remotePosition}
            onStop={handleRemoteDragStop}
            bounds="parent" // Keeps it inside the screen
        >
            <div ref={draggableNodeRef} className={`absolute bottom-16 right-16 z-50 bg-black border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-4 flex flex-col gap-4 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Drag Handle */}
                <div className="handle cursor-grab active:cursor-grabbing w-full flex justify-center pb-2 border-b-2 border-gray-800 text-gray-500 hover:text-white">
                    <GripHorizontal size={24} />
                </div>

                <div className="flex gap-4">
                    {/* Volume Controls */}
                    <div className="flex flex-col items-center justify-between bg-gray-900 rounded-full p-2 border-2 border-gray-700">
                        <button onClick={() => setVolume(v => Math.min(v + 10, 100))} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                            <Volume2 size={20} />
                        </button>
                        <div className="text-xs font-bold text-white my-2">{volume}%</div>
                        <button onClick={() => setVolume(v => Math.max(v - 10, 0))} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                            <VolumeX size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Channel Navigation */}
                        <div className="flex items-center justify-between bg-gray-900 rounded-full p-2 border-2 border-gray-700">
                            <button 
                                onClick={onPrevChannel}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <span className="font-bold text-white px-2">CH</span>
                            <button 
                                onClick={onNextChannel}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 justify-center">
                            <button 
                                onClick={onSubtitleToggle}
                                className={`p-3 border-2 border-black font-bold transition-colors shadow-[2px_2px_0px_0px_#FFF] ${
                                    subtitleLang === 'tr' 
                                        ? 'bg-white text-black' 
                                        : 'bg-gray-800 text-white hover:bg-gray-700'
                                }`}
                                title="Türkçe Altyazı (Aç/Kapat)"
                            >
                                <Subtitles size={20} />
                            </button>
                            <button 
                                onClick={onGoHome}
                                className="p-3 bg-blue-600 hover:bg-blue-500 border-2 border-black text-white font-bold transition-colors shadow-[2px_2px_0px_0px_#FFF]"
                                title="Kanal Listesi (Anasayfa)"
                            >
                                <List size={20} />
                            </button>
                            <button 
                                onClick={copyLink}
                                className="p-3 bg-pink-600 hover:bg-pink-500 border-2 border-black text-white font-bold transition-colors shadow-[2px_2px_0px_0px_#FFF]"
                                title="Youtube Linkini Kopyala"
                            >
                                <Copy size={20} />
                            </button>
                            <button 
                                onClick={handleFullscreen}
                                className="p-3 bg-green-600 hover:bg-green-500 border-2 border-black text-white font-bold transition-colors shadow-[2px_2px_0px_0px_#FFF]"
                                title="Tam Ekran"
                            >
                                <Maximize size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Draggable>
    );
}
