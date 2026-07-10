import React from 'react';
import { X, Zap } from 'lucide-react';

interface ZappSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (mode: '10' | '30' | '60' | 'random') => void;
}

export default function ZappSettingsModal({ isOpen, onClose, onSelect }: ZappSettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
            <div className="bg-[#111] border-4 border-[#edff00] w-full max-w-sm shadow-[8px_8px_0px_0px_#edff00] flex flex-col animate-in fade-in zoom-in-95 duration-200 font-mono">
                {/* Header */}
                <div className="bg-[#edff00] p-4 flex justify-between items-center border-b-4 border-black">
                    <div className="flex items-center gap-2 text-black">
                        <Zap size={24} className="fill-current" strokeWidth={0} />
                        <h2 className="text-xl font-black uppercase tracking-tighter">ZAPP MODU</h2>
                    </div>
                    <button onClick={onClose} className="text-black hover:text-red-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-white text-sm opacity-80 mb-2">Otomatik kanal değiştirme süresini seçin:</p>
                    
                    <button 
                        onClick={() => onSelect('10')}
                        className="w-full bg-[#00FF00] text-black font-black py-4 uppercase border-2 border-black hover:bg-white transition-colors active:scale-95 text-lg"
                    >
                        10 Saniye
                    </button>
                    
                    <button 
                        onClick={() => onSelect('30')}
                        className="w-full bg-[#00FF00] text-black font-black py-4 uppercase border-2 border-black hover:bg-white transition-colors active:scale-95 text-lg"
                    >
                        30 Saniye
                    </button>
                    
                    <button 
                        onClick={() => onSelect('60')}
                        className="w-full bg-[#00FF00] text-black font-black py-4 uppercase border-2 border-black hover:bg-white transition-colors active:scale-95 text-lg"
                    >
                        1 Dakika
                    </button>

                    <div className="my-2 border-t-2 border-dashed border-gray-700"></div>
                    
                    <button 
                        onClick={() => onSelect('random')}
                        className="w-full bg-[#ff00ff] text-white font-black py-4 uppercase border-2 border-black hover:bg-white hover:text-black transition-colors active:scale-95 text-lg"
                    >
                        Kafana Göre (10s - 30s)
                    </button>
                </div>
            </div>
        </div>
    );
}