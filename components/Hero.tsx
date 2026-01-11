import React from 'react';
import { HeroContent } from '../data/mockData';
import { Play, Info } from 'lucide-react';

interface HeroProps {
  content: HeroContent;
  onPlay: (videoId: string, title: string) => void;
}

const Hero: React.FC<HeroProps> = ({ content, onPlay }) => {
  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] flex items-end">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={content.image} 
          alt={content.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-20">
        <div className="max-w-2xl space-y-4 md:space-y-6">
            <div className="flex items-center space-x-2 text-primary font-bold tracking-wider text-sm md:text-base uppercase mb-2">
                <span className="bg-primary/20 px-2 py-1 rounded text-primary">{content.channelName}</span>
                {content.tags.map((tag, i) => (
                    <span key={i} className="text-gray-300 text-xs md:text-sm border border-white/20 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
            
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-none drop-shadow-lg">
            {content.title}
          </h1>
          
          <p className="text-base md:text-lg text-gray-200 line-clamp-3 md:line-clamp-none drop-shadow-md max-w-xl">
            {content.description}
          </p>
          
          <div className="flex flex-row space-x-4 pt-4">
            <button 
                onClick={() => onPlay(content.videoId, content.title)}
                className="flex items-center justify-center space-x-2 bg-white text-black hover:bg-gray-200 transition-colors px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg cursor-pointer"
            >
              <Play fill="currentColor" size={24} />
              <span>Şimdi İzle</span>
            </button>
            <button className="flex items-center justify-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg cursor-pointer">
              <Info size={24} />
              <span>Daha Fazla Bilgi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
