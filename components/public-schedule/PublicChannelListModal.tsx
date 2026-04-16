import React from 'react';
import { X } from 'lucide-react';
import { Channel } from '../../data/mockData';
import Link from 'next/link';

interface PublicChannelListModalProps {
    isOpen: boolean;
    onClose: () => void;
    channels: Channel[];
    currentChannelId?: string;
}

export default function PublicChannelListModal({ isOpen, onClose, channels, currentChannelId }: PublicChannelListModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm font-mono">
            <div className="bg-[#111] border-4 border-[#00FF00] w-full max-w-md shadow-[12px_12px_0px_0px_rgba(0,255,0,1)] flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="bg-[#00FF00] p-4 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-xl font-bold text-black uppercase tracking-wider">
                        KANALLAR_
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-black hover:bg-black hover:text-[#00FF00] p-1 border-2 border-transparent hover:border-black transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto p-4 space-y-2">
                    {channels.map((channel, index) => {
                        const isCurrent = channel.id === currentChannelId;
                        const number = String(index + 1).padStart(2, '0');
                        
                        return (
                            <Link 
                                key={channel.id}
                                href={`/schedule/${channel.slug}`}
                                onClick={onClose}
                                className={`block p-3 border-2 transition-colors ${
                                    isCurrent 
                                        ? 'bg-[#00FF00] border-[#00FF00] text-black font-bold' 
                                        : 'bg-black border-gray-700 text-white hover:border-[#00FF00] hover:text-[#00FF00]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="opacity-50">[{number}]</span>
                                    <span className="text-lg">{channel.name}</span>
                                    {isCurrent && <span className="ml-auto text-xs bg-black text-[#00FF00] px-2 py-1 rounded">ŞU AN BURADASIN</span>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
                
                {/* Footer Action */}
                <div className="p-4 border-t-4 border-black bg-black">
                    <Link 
                        href="/"
                        className="block w-full text-center py-3 bg-[#FF00FF] text-black font-bold border-2 border-black hover:bg-white transition-colors uppercase"
                    >
                        ANASAYFAYA DÖN
                    </Link>
                </div>

            </div>
        </div>
    );
}
