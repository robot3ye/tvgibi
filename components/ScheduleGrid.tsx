'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Channel, Program, timeSlots } from '../data/mockData';
import { Calendar } from 'lucide-react';

interface ScheduleGridProps {
  channels: Channel[];
  programs: Program[];
  onProgramClick: (program: Program) => void;
}

const START_HOUR = 0; // 00:00
const PIXELS_PER_MINUTE = 4; // Slightly narrower for better overview

const getMinutesFromTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getPositionStyle = (startTime: string, endTime: string) => {
  const startMinutes = getMinutesFromTime(startTime);
  const endMinutes = getMinutesFromTime(endTime);
  const baseMinutes = START_HOUR * 60;

  const left = (startMinutes - baseMinutes) * PIXELS_PER_MINUTE;
  const width = (endMinutes - startMinutes) * PIXELS_PER_MINUTE;

  return { left, width };
};

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const getDayName = (date: Date, index: number) => {
  if (index === 0) return 'Bugün';
  if (index === 1) return 'Yarın';
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }).format(date);
};

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ channels, programs: initialPrograms, onProgramClick }) => {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [days, setDays] = useState<{ date: string; label: string; dayNumber: number }[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);
  const [programs, setPrograms] = useState<Program[]>(initialPrograms || []);
  
  // Update programs when initialPrograms prop changes (e.g. if parent fetches)
  // But we want to fetch internally based on date.
  // So we should merge or prefer internal fetch.
  
  useEffect(() => {
      if (initialPrograms && initialPrograms.length > 0) {
          setPrograms(initialPrograms);
      }
  }, [initialPrograms]);

  useEffect(() => {
    if (!selectedDate) return;
    
    console.log('[Grid] Fetching programs for selectedDate:', selectedDate);

    // Fetch programs for the selected date
    // We need to import getProgramsForDate here, but it's an async call.
    // Let's dynamically import or pass a fetcher prop? 
    // The user said "ScheduleGrid... useEffect içinde Supabase'den...".
    // So let's use the api function directly.
    
    const fetchPrograms = async () => {
        const { getProgramsForDate } = await import('../lib/api');
        const fetched = await getProgramsForDate(selectedDate);
        console.log('[Grid] Fetched programs count:', fetched.length);
        setPrograms(fetched);
    };
    
    fetchPrograms();
  }, [selectedDate]);
  
  useEffect(() => {
    // Generate next 7 days for tabs on client side
    const nextDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        date: formatDate(d),
        label: getDayName(d, i),
        dayNumber: d.getDate()
      };
    });
    
    // Ensure we set selectedDate if it's empty, to trigger the fetch
    if (!selectedDate) {
        const todayStr = formatDate(new Date());
        console.log('[Grid] Initializing selectedDate to:', todayStr);
        setSelectedDate(todayStr);
    }
    
    setDays(nextDays);
    setMounted(true);

    // Update current time every minute
    const updateTime = () => {
        const now = new Date();
        const minutes = (now.getHours() * 60) + now.getMinutes();
        // Adjust for < 06:00 being next day relative to start time
        let adjusted = minutes;
        if (now.getHours() < START_HOUR) adjusted += 24 * 60;
        setCurrentTimeMinutes(adjusted);
        console.log('[Grid] Current Time Minutes:', adjusted);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const filteredPrograms = React.useMemo(() => {
    // We already fetch programs filtered by date in the useEffect below.
    // So `programs` state already contains the relevant programs.
    // However, the `date` property in `Program` object might be string YYYY-MM-DD.
    // We need to make sure we display them.
    // Since we fetch "overlaps", a program starting yesterday at 23:00 and ending today at 01:00 is relevant.
    // But the `Program` interface has a `date` field which we map from `start_time`.
    // If we filter strictly by `p.date === selectedDate`, we might lose programs that started yesterday but are still playing.
    // Or programs that start after midnight (which technically have tomorrow's date string).
    
    // The Grid expects programs to be rendered relative to 06:00.
    // Let's just return all `programs` since we are manually fetching for this date range.
    return programs;
  }, [programs]);

  // Auto-scroll to current time on load
  useEffect(() => {
    if (mounted && scrollContainerRef.current && selectedDate === formatDate(new Date())) {
      const now = new Date();
      const currentMinutes = (now.getHours() * 60) + now.getMinutes();
      const startMinutes = START_HOUR * 60;
      
      let scrollMinutes = currentMinutes - startMinutes;
      if (scrollMinutes < 0) scrollMinutes += 24 * 60; // Handle after midnight
      
      const scrollLeft = Math.max(0, (scrollMinutes * PIXELS_PER_MINUTE) - 200); // 200px offset to see context
      scrollContainerRef.current.scrollLeft = scrollLeft;
    } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
    }
  }, [selectedDate, mounted]);

  if (!mounted) {
    return (
        <div className="flex items-center justify-center h-64 bg-[#121212] border-t border-white/10 text-gray-500">
            Yayın akışı yükleniyor...
        </div>
    );
  }

  return (
    <div className="flex flex-col bg-background border-t border-white/10 select-none">
      
      {/* Date Tabs */}
      <div className="flex items-center overflow-x-auto border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-2 space-x-2 scrollbar-hide">
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => setSelectedDate(day.date)}
            className={`
              flex flex-col items-center justify-center min-w-[80px] py-2 px-3 rounded-lg transition-all duration-200
              ${selectedDate === day.date 
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'}
            `}
          >
            <span className="text-xs font-medium opacity-80">{day.label}</span>
            <span className="text-lg font-bold">{day.dayNumber}</span>
          </button>
        ))}
      </div>

      {/* Main Grid Container */}
      <div 
        ref={scrollContainerRef}
        className="relative overflow-x-auto overflow-y-auto max-h-[600px] bg-[#121212] scrollbar-hide" // Added scrollbar-hide here
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="min-w-max relative">
          
          {/* Sticky Header (Times) */}
          <div className="sticky top-0 z-30 flex bg-[#121212] border-b border-white/10 h-12 shadow-sm">
             {/* Corner (Intersection of Sticky Header & Column) */}
             <div 
                className="sticky left-0 z-40 w-[140px] flex-shrink-0 bg-[#121212] border-r border-white/10 flex items-center justify-center text-gray-500 text-sm font-medium shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]"
             >
                <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>Kanal</span>
                </div>
             </div>

             {/* Time Slots */}
             <div className="flex relative h-full">
                {timeSlots.map((time) => (
                   <div 
                      key={time} 
                      className="flex-shrink-0 flex items-center pl-2 text-xs font-medium text-gray-500 border-l border-white/5"
                      style={{ width: `${30 * PIXELS_PER_MINUTE}px` }}
                   >
                      {time}
                   </div>
                ))}
             </div>
          </div>

          {/* Channels Rows */}
          <div className="relative">
             {channels.map((channel, index) => {
                const channelPrograms = filteredPrograms.filter(p => p.channelId === channel.id);
                
                return (
                   <div key={channel.id} className="flex h-20 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      
                      {/* Sticky Channel Column */}
                      <div 
                        className="sticky left-0 z-20 w-[140px] flex-shrink-0 bg-[#121212] border-r border-white/10 flex items-center px-4 space-x-3 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]"
                      >
                         <div 
                            className="w-8 h-8 rounded flex items-center justify-center font-bold text-white text-xs shadow-sm"
                            style={{ backgroundColor: channel.color }}
                         >
                            {channel.logo}
                         </div>
                         <span className="text-sm font-medium text-gray-300 truncate">{channel.name}</span>
                      </div>

                      {/* Programs Timeline Area */}
                      <div className="relative flex-grow h-full">
                         {/* Vertical Grid Lines */}
                         {timeSlots.map((_, i) => (
                            <div 
                               key={i} 
                               className="absolute top-0 bottom-0 border-l border-white/5 pointer-events-none"
                               style={{ left: `${i * 30 * PIXELS_PER_MINUTE}px` }}
                            />
                         ))}

                         {/* Current Time Indicator Line */}
                         {selectedDate === formatDate(new Date()) && (
                            <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                style={{ 
                                    left: `${(currentTimeMinutes - (START_HOUR * 60)) * PIXELS_PER_MINUTE}px` 
                                }}
                            >
                                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-500 rounded-full" />
                            </div>
                         )}

                         {/* Programs */}
                         {channelPrograms.map((program) => {
                            const { left, width } = getPositionStyle(program.startTime, program.endTime);
                            
                            // Check if program is currently playing (only if viewing today)
                            const isNow = selectedDate === formatDate(new Date()) && 
                                          currentTimeMinutes >= getMinutesFromTime(program.startTime) && 
                                          currentTimeMinutes < getMinutesFromTime(program.endTime);

                            return (
                               <div
                                  key={program.id}
                                  onClick={() => onProgramClick(program)}
                                  className={`absolute top-1 bottom-1 rounded cursor-pointer border hover:z-10 hover:shadow-lg hover:shadow-black/50 hover:brightness-110 transition-all duration-200 group/program ${
                                    isNow 
                                        ? 'border-[#00ff00] bg-[#00ff00]/10 ring-1 ring-[#00ff00] z-10' 
                                        : 'border-white/5'
                                  }`}
                                  style={{ 
                                     left: `${left}px`, 
                                     width: `${Math.max(width - 2, 0)}px`, // -2px for gap
                                     backgroundColor: isNow ? '#003300' : (program.isLive ? '#ef4444' : '#27272a')
                                  }}
                               >
                                  <div className="h-full p-2 flex flex-col justify-center">
                                      <div className="flex items-center justify-between mb-0.5">
                                          <span className={`text-[10px] font-medium truncate ${isNow ? 'text-[#00ff00]' : 'text-gray-400'}`}>
                                              {program.startTime} - {program.endTime}
                                          </span>
                                          {(program.isLive || isNow) && (
                                              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isNow ? 'bg-[#00ff00]' : 'bg-white'}`} />
                                          )}
                                      </div>
                                      <h4 className={`text-xs md:text-sm font-semibold truncate leading-tight group-hover/program:whitespace-normal group-hover/program:bg-[#27272a] group-hover/program:absolute group-hover/program:z-20 group-hover/program:w-max group-hover/program:max-w-[200px] group-hover/program:p-2 group-hover/program:rounded group-hover/program:shadow-xl ${isNow ? 'text-white' : 'text-gray-200'}`}>
                                          {program.title}
                                      </h4>
                                      {width > 80 && (
                                         <span className="text-[10px] text-gray-500 truncate mt-0.5">
                                            {program.category}
                                         </span>
                                      )}
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>
                );
             })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
