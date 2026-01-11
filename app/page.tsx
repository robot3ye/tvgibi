'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { heroContent, Program, Channel } from '../data/mockData';
import { getChannels, getProgramsForDate } from '../lib/api';
import Hero from '../components/Hero';
import ScheduleGrid from '../components/ScheduleGrid';
import ChannelCard from '../components/ChannelCard';
import VideoModal from '../components/VideoModal';
import ProgramDetailPanel from '../components/ProgramDetailPanel';
import { Search, Bell, User, Menu } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      // First, get all channels
      const fetchedChannels = await getChannels();
      setChannels(fetchedChannels);
      
      // We don't need to fetch programs here because ScheduleGrid handles its own fetching
      // when the date changes (including the initial load).
      // However, we can fetch today's programs as initial data if we want.
      // But passing empty programs initially is fine since ScheduleGrid fetches on mount.
      
      // BUT WAIT, we are passing `programs` to ScheduleGrid as a prop.
      // And in ScheduleGrid, we use `initialPrograms` from props as initial state.
      // And we ALSO fetch inside ScheduleGrid when selectedDate changes.
      // This is double fetching or confusing source of truth.
      
      // Best practice: Let ScheduleGrid handle its data fetching based on the selected date.
      // We only need to pass channels.
    };
    fetchData();
  }, []);

  // Handle schedule grid item click
  const handleProgramClick = (program: Program) => {
    const channel = channels.find(c => c.id === program.channelId) || null;
    setSelectedProgram(program);
    setSelectedChannel(channel);
    setIsDetailPanelOpen(true);
  };

  const handleHeroPlay = (videoId: string, title: string) => {
    // Hero usually promotes a specific content, but let's check if it's tied to a channel
    // For now, keep Hero playing in Modal as it might be a trailer, not live stream
    setCurrentVideoId(videoId);
    setCurrentVideoTitle(title);
    setIsVideoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Video Modal */}
      <VideoModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoId={currentVideoId}
        title={currentVideoTitle}
      />

      {/* Program Detail Panel (Slide-Over) */}
      <ProgramDetailPanel
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        program={selectedProgram}
        channel={selectedChannel}
      />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
                <Menu className="w-6 h-6 md:hidden cursor-pointer" />
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                TVGuide.
                </span>
            </div>
            <div className="hidden md:flex space-x-6 text-sm font-medium text-gray-300">
                <a href="#" className="hover:text-white transition-colors">Ana Sayfa</a>
                <a href="#" className="text-white font-bold">Yayın Akışı</a>
                <a href="#" className="hover:text-white transition-colors">Kanallar</a>
                <a href="#" className="hover:text-white transition-colors">Filmler</a>
            </div>
        </div>
        
        <div className="flex items-center space-x-4 md:space-x-6 text-gray-300">
            <Search className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            <Bell className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold cursor-pointer">
                <User size={16} />
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero content={heroContent} onPlay={handleHeroPlay} />

      <div className="relative z-20 -mt-20 md:-mt-32 pb-20 space-y-12">
        
        {/* Popular Channels List */}
        <section className="px-4 md:px-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center space-x-2">
                <span className="w-1 h-6 bg-secondary rounded-full"></span>
                <span>Popüler Kanallar</span>
            </h2>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {channels.map((channel) => (
                    <div key={channel.id} className="snap-start">
                        <ChannelCard channel={channel} />
                    </div>
                ))}
            </div>
        </section>

        {/* Schedule Grid */}
        <section className="px-4 md:px-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center space-x-2">
                <span className="w-1 h-6 bg-primary rounded-full"></span>
                <span>Yayın Akışı</span>
            </h2>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                <ScheduleGrid 
                    channels={channels} 
                    programs={programs} 
                    onProgramClick={handleProgramClick}
                />
            </div>
        </section>
      </div>
      
      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black/50 text-center text-gray-500 text-sm">
        <p>&copy; 2024 TVGuide Platform. Tüm hakları saklıdır.</p>
        <div className="flex justify-center space-x-4 mt-4">
            <a href="#" className="hover:text-white">Gizlilik</a>
            <a href="#" className="hover:text-white">Kullanım Şartları</a>
            <a href="#" className="hover:text-white">İletişim</a>
        </div>
      </footer>
    </div>
  );
}
