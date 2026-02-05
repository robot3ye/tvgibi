import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { YouTubeVideoDetails } from '../../lib/youtube';

interface VideoInputSectionProps {
    url: string;
    setUrl: (url: string) => void;
    onFetch: () => void;
    videoDetails: YouTubeVideoDetails | null;
    onAdd: () => void;
    onCancel: () => void;
    onAddFiller: () => void;
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
                <div className="bg-black text-white px-3 py-2 font-bold text-xl border-2 border-white transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    Video Ekle_
                </div>
                
                <div className="flex-grow w-full relative">
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onFetch()}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full p-3 border-4 border-black font-bold focus:outline-none focus:bg-white bg-white text-black placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    />
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                    <button 
                        onClick={onFetch}
                        disabled={loading || !url}
                        className="flex-1 lg:flex-none bg-black text-white px-6 py-3 font-bold border-2 border-black hover:bg-gray-800 disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                    >
                        {loading ? '...' : 'Videoyu Getir'}
                    </button>
                    
                    <button 
                        onClick={onAddFiller}
                        className="flex-1 lg:flex-none bg-[#FF6600] text-black px-6 py-3 font-bold border-2 border-black hover:bg-[#ff8533] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} className="border-2 border-black rounded-full" /> Dolgu Ekle
                    </button>
                </div>
            </div>

            {/* Video Details Preview (Black Panel) */}
            {videoDetails && (
                <div className="bg-black p-6 border-b-4 border-black animate-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Thumbnail */}
                        <div className="w-full md:w-1/3 aspect-video border-4 border-[#00FFFF] shadow-[8px_8px_0px_0px_rgba(0,255,255,0.3)]">
                            <img src={videoDetails.thumbnail} alt={videoDetails.title} className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 text-white space-y-4">
                            <div className="flex justify-between items-start border-b border-gray-800 pb-2">
                                <div className="text-[#00FFFF] font-bold text-sm">Süre: {formatDuration(videoDetails.duration)}</div>
                                <div className="text-[#FF6600] font-bold text-sm">Youtube ID: {videoDetails.videoId}</div>
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-bold leading-tight text-[#FFFF00]">
                                {videoDetails.title}
                            </h3>
                            
                            <p className="text-gray-400 text-sm line-clamp-3 font-sans">
                                {videoDetails.description}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons Bar (Cyan Strip at bottom of preview) */}
                    <div className="mt-6 pt-6 border-t border-gray-800 flex flex-wrap gap-4 justify-end">
                        <button className="bg-[#00FFFF] text-black px-8 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_#FFF] hover:bg-[#ccffff] transition-transform active:scale-95">
                            + Bilgileri Düzenle
                        </button>
                        <button 
                            onClick={onAdd}
                            disabled={adding}
                            className="bg-[#FF6600] text-black px-8 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_#FFF] hover:bg-[#ff8533] transition-transform active:scale-95 flex items-center"
                        >
                            {adding ? <Loader2 className="animate-spin mr-2" /> : '+ Yayına Ekle'}
                        </button>
                        <button 
                            onClick={onCancel}
                            className="bg-gray-700 text-white px-6 py-3 font-bold border-2 border-black shadow-[4px_4px_0px_0px_#FFF] hover:bg-gray-600 transition-transform active:scale-95"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
