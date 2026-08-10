import React from 'react';
import { Loader2, Plus, ListPlus } from 'lucide-react';
import { YouTubeVideoDetails } from '../../lib/youtube';

interface VideoInputSectionProps {
    url: string;
    setUrl: (url: string) => void;
    onFetch: () => void;
    videoDetails: YouTubeVideoDetails | null;
    onAdd: () => void;
    onCancel: () => void;
    onAddFiller: () => void;
    onBulkAddClick: () => void;
    onAutoMixerClick: () => void;
    loading: boolean;
    adding: boolean;
}

export default function VideoInputSection({
    url,
    setUrl,
    onFetch,
    videoDetails,
    onAdd,
    onCancel,
    onAddFiller,
    onBulkAddClick,
    onAutoMixerClick,
    loading,
    adding
}: VideoInputSectionProps) {
    
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}s ${m}dk ${s}sn` : `${m}dk ${s}sn`;
    };

    return (
        <div className="bg-[#000000] p-0 font-mono">
            {/* Input Bar (Cyan) */}
            <div className="bg-[#00FFFF] p-6 border-b-4 border-black flex flex-col lg:flex-row items-center gap-4">
                <div className="bg-black text-white px-3 py-2 font-bold text-xl border-2 border-white transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                    Video Ekle_
                </div>
                
                <div className="flex-grow relative min-w-0">
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onFetch()}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full p-3 border-4 border-black font-bold focus:outline-none focus:bg-white bg-white text-black placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    />
                </div>

                <div className="flex gap-2 flex-shrink-0 overflow-x-auto whitespace-nowrap">
                    <button 
                        onClick={onFetch}
                        disabled={loading || !url}
                        className="flex-1 lg:flex-none bg-[#0066FF] text-white px-8 py-3 font-bold border-4 border-black hover:bg-blue-600 disabled:opacity-50 transition-all text-lg"
                    >
                        {loading ? '...' : 'Getir'}
                    </button>
                    
                    <button 
                        onClick={onAddFiller}
                        className="flex-1 lg:flex-none bg-[#FF0000] text-white px-8 py-3 font-bold border-4 border-black hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-lg"
                    >
                        <Plus size={20} className="border-2 border-white rounded-full" /> Dolgu
                    </button>

                    <button 
                        onClick={onBulkAddClick}
                        className="flex-1 lg:flex-none bg-[#FF00FF] text-white px-8 py-3 font-bold border-4 border-black hover:bg-fuchsia-600 transition-all flex items-center justify-center gap-2 text-lg"
                    >
                        <ListPlus size={20} /> Toplu
                    </button>

                    <button 
                        onClick={onAutoMixerClick}
                        disabled={adding}
                        className="flex-1 lg:flex-none bg-[#00FF4F] text-black px-8 py-3 font-bold border-4 border-black hover:bg-green-400 transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50"
                    >
                        🤖 MİKSER
                    </button>
                </div>
            </div>

            {/* We remove the Video Details Preview from here since it will be in a modal now */}
        </div>
    );
}
