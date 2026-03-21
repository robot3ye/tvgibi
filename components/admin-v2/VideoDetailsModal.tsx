import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { YouTubeVideoDetails } from '../../lib/youtube';

interface VideoDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    video: YouTubeVideoDetails | null;
    onAdd: (videoData: any) => void;
    adding: boolean;
}

export default function VideoDetailsModal({ isOpen, onClose, video, onAdd, adding }: VideoDetailsModalProps) {
    const [title, setTitle] = useState('');
    const [creator, setCreator] = useState('');
    const [description, setDescription] = useState('');

    // Reset fields when video changes
    useEffect(() => {
        if (video) {
            setTitle(video.title || '');
            setCreator(video.creator || '');
            setDescription(video.description || '');
        }
    }, [video]);

    if (!isOpen || !video) return null;

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}s ${m}dk ${s}sn` : `${m}dk ${s}sn`;
    };

    const handleSave = () => {
        // Pass the edited data back to the parent to add
        onAdd({
            ...video,
            title,
            creator,
            description
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm font-mono">
            <div className="bg-[#111] border-4 border-[#00FFFF] w-full max-w-4xl shadow-[12px_12px_0px_0px_rgba(0,255,255,1)] flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#00FFFF] p-4 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-xl font-bold text-black uppercase tracking-wider">
                        VİDEO DETAYLARI_
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-black hover:bg-black hover:text-[#00FFFF] p-1 border-2 border-transparent hover:border-black transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex flex-col md:flex-row gap-6">
                    {/* Thumbnail & Meta */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                        <div className="aspect-video border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,255,255,0.3)] bg-black">
                            <img src={video.thumbnail} alt={title} className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-black border-2 border-gray-800 p-4 space-y-2">
                            <div className="text-[#00FFFF] font-bold text-sm border-b border-gray-800 pb-2">
                                Süre: {formatDuration(video.duration)}
                            </div>
                            <div className="text-[#FF6600] font-bold text-sm">
                                Youtube ID: {video.videoId}
                            </div>
                        </div>
                    </div>
                    
                    {/* Editable Form */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div>
                            <label className="block text-[#00FFFF] font-bold mb-2 text-sm">Video İsmi (Title):</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-3 bg-black border-2 border-gray-700 text-white font-bold focus:outline-none focus:border-[#00FFFF]"
                            />
                        </div>

                        <div>
                            <label className="block text-[#00FFFF] font-bold mb-2 text-sm">Kanal Adı (Creator):</label>
                            <input 
                                type="text" 
                                value={creator}
                                onChange={(e) => setCreator(e.target.value)}
                                className="w-full p-3 bg-black border-2 border-gray-700 text-white font-bold focus:outline-none focus:border-[#00FFFF]"
                            />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="block text-[#00FFFF] font-bold mb-2 text-sm">Açıklama (Description):</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full flex-1 min-h-[100px] p-3 bg-black border-2 border-gray-700 text-white font-sans text-sm focus:outline-none focus:border-[#00FFFF] resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t-4 border-black bg-black flex justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-700 text-white font-bold border-2 border-black hover:bg-gray-600 transition-colors"
                    >
                        İptal
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={adding}
                        className="px-8 py-3 bg-[#FF6600] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_#FFF] hover:bg-[#ff8533] transition-transform active:scale-95 flex items-center"
                    >
                        {adding ? <Loader2 className="animate-spin mr-2" /> : null}
                        {adding ? 'EKLENİYOR...' : '+ YAYINA EKLE'}
                    </button>
                </div>

            </div>
        </div>
    );
}
