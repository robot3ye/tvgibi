import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchVideoDetails } from '../../lib/youtube';

interface BulkAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddBulk: (videos: any[]) => void;
    adding: boolean;
}

export default function BulkAddModal({ isOpen, onClose, onAddBulk, adding }: BulkAddModalProps) {
    const [links, setLinks] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzedVideos, setAnalyzedVideos] = useState<any[]>([]);
    const [totalDuration, setTotalDuration] = useState(0);

    if (!isOpen) return null;

    const handleAnalyze = async () => {
        setAnalyzing(true);
        const urlArray = links.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
        
        const videos = [];
        let totalSec = 0;

        for (const url of urlArray) {
            try {
                const details = await fetchVideoDetails(url);
                if (details) {
                    videos.push(details);
                    totalSec += details.duration;
                }
            } catch (err) {
                console.error("Error fetching detail for:", url, err);
            }
        }

        setAnalyzedVideos(videos);
        setTotalDuration(totalSec);
        setAnalyzing(false);
    };

    const handleSubmit = () => {
        if (analyzedVideos.length > 0) {
            onAddBulk(analyzedVideos);
        }
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h} saat ${m} dakika`;
    };

    const isExceeding24h = totalDuration > 24 * 3600;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm font-mono">
            <div className="bg-[#111] border-4 border-[#00FFFF] w-full max-w-2xl shadow-[12px_12px_0px_0px_rgba(0,255,255,1)] flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#00FFFF] p-4 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-xl font-bold text-black uppercase tracking-wider">
                        TOPLU VİDEO YÜKLE_
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-black hover:bg-black hover:text-[#00FFFF] p-1 border-2 border-transparent hover:border-black transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <p className="text-white mb-4 text-sm">
                        Youtube linklerini alt alta veya virgülle ayırarak yapıştırın:
                    </p>
                    <textarea 
                        className="w-full h-40 p-4 border-4 border-black bg-white text-black font-bold focus:outline-none focus:bg-[#f0f0f0] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] mb-4"
                        placeholder="https://youtube.com/watch?v=...&#10;https://youtube.com/watch?v=..."
                        value={links}
                        onChange={(e) => setLinks(e.target.value)}
                        disabled={analyzing || adding}
                    ></textarea>

                    {!analyzedVideos.length && (
                        <button 
                            onClick={handleAnalyze}
                            disabled={!links.trim() || analyzing}
                            className="w-full bg-[#FF00FF] text-black font-bold py-3 border-4 border-black hover:bg-[#ff4dff] transition-colors disabled:opacity-50 flex justify-center items-center"
                        >
                            {analyzing ? <Loader2 className="animate-spin mr-2" /> : null}
                            {analyzing ? 'LİNKLER KONTROL EDİLİYOR...' : 'LİNKLERİ ANALİZ ET'}
                        </button>
                    )}

                    {analyzedVideos.length > 0 && (
                        <div className="bg-black border-2 border-gray-700 p-4 mt-4">
                            <h3 className="text-[#00FF00] font-bold text-lg mb-2">Analiz Sonucu:</h3>
                            <ul className="text-white text-sm space-y-1 mb-4">
                                <li>Başarıyla Bulunan Video: <strong>{analyzedVideos.length} adet</strong></li>
                                <li>Toplam Süre: <strong>{formatDuration(totalDuration)}</strong></li>
                            </ul>

                            {isExceeding24h && (
                                <div className="bg-red-600 text-white p-3 border-2 border-black font-bold text-sm mb-4 animate-pulse">
                                    DİKKAT: Eklenen videoların toplam süresi 24 saati aşıyor! Gün sonunu geçen videolar kırpılabilir veya bir sonraki güne taşabilir.
                                </div>
                            )}

                            <button 
                                onClick={handleSubmit}
                                disabled={adding}
                                className="w-full bg-[#00FF00] text-black font-bold py-3 border-4 border-black hover:bg-white transition-colors flex justify-center items-center"
                            >
                                {adding ? <Loader2 className="animate-spin mr-2" /> : null}
                                {adding ? 'YÜKLENİYOR...' : 'ONAYLA VE LİSTEYE EKLE'}
                            </button>

                            <button 
                                onClick={() => setAnalyzedVideos([])}
                                disabled={adding}
                                className="w-full mt-2 bg-transparent text-gray-400 font-bold py-2 border-2 border-gray-700 hover:text-white hover:border-white transition-colors text-sm"
                            >
                                İPTAL ET VE YENİDEN YAZ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
