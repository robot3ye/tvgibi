'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

// Dynamically import ReactPlayer with SSR disabled
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface VideoModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const VideoModal: React.FC<VideoModalProps> = ({ videoId, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-900/50 border-b border-white/5">
            <h3 className="text-white font-semibold truncate pr-8">
                {title || 'Oynatılıyor'}
            </h3>
            <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
            >
                <X size={24} />
            </button>
        </div>

          <div key={videoId} className="relative aspect-video w-full bg-black">
          <ReactPlayer
            url={`https://www.youtube.com/watch?v=${videoId}`}
            width="100%"
            height="100%"
            playing={true}
            muted={true}
            controls={true}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
