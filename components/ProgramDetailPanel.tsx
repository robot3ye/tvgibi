
'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Link as LinkIcon, Check } from 'lucide-react';
import { Program, Channel } from '../data/mockData';

interface ProgramDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  program: Program | null;
  channel: Channel | null;
}

const ProgramDetailPanel: React.FC<ProgramDetailPanelProps> = ({ isOpen, onClose, program, channel }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset states when panel opens
  useEffect(() => {
    if (isOpen) {
      setIsDescriptionExpanded(false);
      setCopied(false);
    }
  }, [isOpen]); // Only depend on isOpen to reset when it opens

  if (!program) return null;

  const handleCopyLink = () => {
    if (program.videoId) {
      const url = `https://www.youtube.com/watch?v=${program.videoId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full md:w-[480px] bg-[#121212] z-50 shadow-2xl transform transition-transform duration-300 ease-out border-l border-white/10 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header / Cover Image */}
        <div className="relative h-64 md:h-72 flex-shrink-0">
          {program.thumbnail ? (
            <img 
              src={program.thumbnail} 
              alt={program.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <span className="text-4xl text-white/20 font-bold">{channel?.name}</span>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/30" />

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Channel Logo Badge */}
          {channel && (
            <div className="absolute top-6 left-6">
                 <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg"
                    style={{ backgroundColor: channel.color }}
                 >
                    {channel.logo}
                 </div>
            </div>
          )}

          {/* Title & Time Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-[#121212] to-transparent">
             <div className="text-sm font-medium text-white/70 mb-1 uppercase tracking-wider">
                {channel?.name || 'Channel'}
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                {program.title}
             </h2>
             <div className="flex items-center text-sm text-gray-300 font-medium">
                <span className="bg-white/10 px-2 py-0.5 rounded text-white text-xs mr-3">
                    {program.category?.toUpperCase() || 'TV'}
                </span>
                <span>{program.date}</span>
                <span className="mx-2">•</span>
                <span>{program.startTime} - {program.endTime}</span>
             </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            
            {/* Action Buttons */}
            <div className="flex space-x-3 mb-8">
                <button className="flex-1 bg-white text-black py-3 px-4 rounded-lg font-bold flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors">
                    <Play size={20} className="fill-current" />
                    <span>Şimdi İzle</span>
                </button>
                
                <button 
                    onClick={handleCopyLink}
                    className="flex-1 bg-white/10 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-white/20 transition-colors border border-white/5"
                >
                    {copied ? <Check size={20} className="text-green-500" /> : <LinkIcon size={20} />}
                    <span>{copied ? 'Kopyalandı' : 'YouTube Linki'}</span>
                </button>
            </div>

            {/* Description Section */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Özet</h3>
                <div className="relative">
                    <p className={`text-gray-300 leading-relaxed text-sm md:text-base ${!isDescriptionExpanded ? 'line-clamp-4' : ''}`}>
                        {program.description || 'Bu program için açıklama bulunmamaktadır.'}
                    </p>
                    {program.description && program.description.length > 200 && (
                        <button 
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            className="text-primary hover:text-primary/80 text-sm font-medium mt-2 underline underline-offset-4"
                        >
                            {isDescriptionExpanded ? 'Daha Az Göster' : 'Daha Fazla Göster'}
                        </button>
                    )}
                </div>
            </div>

            {/* Additional Info / Footer */}
            <div className="pt-6 border-t border-white/10">
                <p className="text-xs text-gray-500 text-center">
                   Bu içerik YouTube üzerinden sağlanmaktadır. <br/>
                   <a href="#" className="text-red-500 hover:underline">Kanalda sorun mu var?</a>
                </p>
            </div>

        </div>
      </div>
    </>
  );
};

export default ProgramDetailPanel;
