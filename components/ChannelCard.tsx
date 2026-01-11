import React from 'react';
import Link from 'next/link';
import { Channel } from '../data/mockData';
import { Play } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  return (
    <Link href={`/channel/${channel.slug}`}>
      <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 relative group cursor-pointer transition-transform duration-300 hover:scale-105">
        <div 
          className="absolute inset-0 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: channel.color }}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors rounded-xl" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 font-bold text-xl md:text-2xl shadow-lg">
            {channel.logo}
          </div>
          <span className="font-semibold text-sm md:text-base text-center drop-shadow-md truncate w-full">
            {channel.name}
          </span>
        </div>
        
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="bg-white text-black rounded-full p-1.5 shadow-lg">
              <Play size={12} fill="currentColor" />
           </div>
        </div>
      </div>
    </Link>
  );
};

export default ChannelCard;
