
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Play, Clock, FileText, Plus, Trash2, RefreshCw, Edit2, X, Check, CheckSquare, Square, Sun, CloudSun, Sunset, Moon, Calendar, ChevronDown, ChevronRight, Signal } from 'lucide-react';
import { fetchVideoDetails, YouTubeVideoDetails } from '../../lib/youtube';
import { getChannels, getLastProgram, addProgram, getProgramsForChannel, deleteProgram, deletePrograms, updateProgram } from '../../lib/api';
import { Channel, Program } from '../../data/mockData';

export default function AdminPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<YouTubeVideoDetails | null>(null);
  const [error, setError] = useState('');
  
  // New States
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [channelPrograms, setChannelPrograms] = useState<Program[]>([]);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit & Bulk Delete States
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Date Filtering State
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Accordion State
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
      morning: false,
      afternoon: false,
      evening: false,
      night: false
  });

  // Load Channels on Mount
  useEffect(() => {
    const loadChannels = async () => {
        const data = await getChannels();
        setChannels(data);
        if (data.length > 0) {
            setSelectedChannelId(data[0].id);
        }
    };
    loadChannels();
  }, []);

  // Initialize selectedDate to today
  useEffect(() => {
      setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Load Channel Programs when Channel Changes
  useEffect(() => {
    if (selectedChannelId) {
        loadChannelPrograms(selectedChannelId);
    }
  }, [selectedChannelId]);

  const loadChannelPrograms = async (channelId: string) => {
      setRefreshing(true);
      setSelectedProgramIds([]); // Reset selection
      try {
          const programs = await getProgramsForChannel(channelId);
          setChannelPrograms(programs);
      } catch (err) {
          console.error(err);
      } finally {
          setRefreshing(false);
      }
  };

  // Generate next 7 days for tabs
  const dateTabs = useMemo(() => {
      const tabs = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          
          let label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
          if (i === 0) label = 'Bugün';
          if (i === 1) label = 'Yarın';

          tabs.push({ date: dateStr, label });
      }
      return tabs;
  }, []);

  // Filter and Group Programs
  const groupedPrograms = useMemo(() => {
      if (!selectedDate) return null;

      // Filter programs that OVERLAP with the selected day (00:00 - 23:59)
      // This is crucial because some programs might start on previous day and end today
      // or start today and end tomorrow.
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const filtered = channelPrograms.filter(p => {
          // Parse start and end times
          // Since our 'p' object from API has date string but also startTime/endTime HH:mm
          // We need to reconstruct full Date objects to compare correctly.
          // BUT wait, our API returns 'p.date' as the START DATE of the program.
          // And 'p.startTime' is HH:mm.
          
          // Case 1: Program starts on selectedDate
          if (p.date === selectedDate) return true;
          
          // Case 2: Program started before selectedDate but ends during or after selectedDate
          // (This requires us to know the end date, which we don't explicitly store in 'p' object in frontend cleanly yet)
          // However, let's look at how API returns data.
          // API returns full datetime ISO strings in raw data, but mapProgram converts them to HH:mm and Date string.
          // The 'p.date' is just YYYY-MM-DD of start time.
          
          // Let's rely on a simpler check for now: 
          // If we are strictly filtering by 'p.date === selectedDate', we miss programs that span across midnight
          // but logically belong to this "broadcast day".
          
          // Actually, our API 'getProgramsForChannel' fetches a wide range.
          // But here in client-side, 'p.date === selectedDate' is too strict for "Night" programs that might technically belong to previous date's broadcast schedule?
          // No, "Night" (00:00-06:00) of Jan 15 physically happens on Jan 15. So p.date SHOULD be Jan 15.
          
          // If you see programs in Index Grid but NOT in Admin Panel, it means:
          // Index Grid logic (getProgramsForDate) is finding them.
          // Admin Panel logic (filter p.date === selectedDate) is NOT finding them.
          
          // Why? 
          // Maybe because of Timezone issues? 
          // Or maybe the 'p.date' derived in mapProgram is different from 'selectedDate'.
          
          return p.date === selectedDate;
      });
      
      const groups = {
          night: [] as Program[],     // 00:00 - 05:59 (First)
          morning: [] as Program[],   // 06:00 - 11:59
          afternoon: [] as Program[], // 12:00 - 17:59
          evening: [] as Program[],   // 18:00 - 23:59
      };

      filtered.forEach(p => {
          const hour = parseInt(p.startTime.split(':')[0]);
          if (hour >= 0 && hour < 6) groups.night.push(p);
          else if (hour >= 6 && hour < 12) groups.morning.push(p);
          else if (hour >= 12 && hour < 18) groups.afternoon.push(p);
          else if (hour >= 18 && hour <= 23) groups.evening.push(p);
      });

      // Sort groups by start time
      groups.night.sort((a, b) => a.startTime.localeCompare(b.startTime));
      groups.morning.sort((a, b) => a.startTime.localeCompare(b.startTime));
      groups.afternoon.sort((a, b) => a.startTime.localeCompare(b.startTime));
      groups.evening.sort((a, b) => a.startTime.localeCompare(b.startTime));

      return groups;
  }, [channelPrograms, selectedDate]);

  // Determine current active group and auto-expand it
  useEffect(() => {
      if (!groupedPrograms) return;

      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      
      // Only auto-expand if we are viewing "Today"
      if (selectedDate === todayStr) {
          const newOpenState = {
              morning: false,
              afternoon: false,
              evening: false,
              night: false
          };

          if (currentHour >= 6 && currentHour < 12) newOpenState.morning = true;
          else if (currentHour >= 12 && currentHour < 18) newOpenState.afternoon = true;
          else if (currentHour >= 18 && currentHour <= 23) newOpenState.evening = true;
          else newOpenState.night = true;

          setOpenGroups(newOpenState);
      } else {
          // For other days, maybe expand all or just morning? Let's expand Morning by default
          setOpenGroups({
              morning: true,
              afternoon: false,
              evening: false,
              night: false
          });
      }
  }, [selectedDate, groupedPrograms]); // Re-run when date or programs change

  const toggleGroup = (group: keyof typeof openGroups) => {
      setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const isProgramLive = (prog: Program) => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (prog.date !== todayStr) return false;

      const [startH, startM] = prog.startTime.split(':').map(Number);
      const [endH, endM] = prog.endTime.split(':').map(Number);
      
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Handle midnight crossover if needed (simple check for now)
      return currentTime >= startTime && currentTime < endTime;
  };

  const handleFetch = async () => {
    if (!url) return;
    
    setLoading(true);
    setError('');
    setVideo(null);

    try {
      const details = await fetchVideoDetails(url);
      if (details) {
        setVideo(details);
      } else {
        setError('Video bulunamadı veya bir hata oluştu. Linki ve API limitinizi kontrol edin.');
      }
    } catch (err) {
      setError('Beklenmedik bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgram = async () => {
      if (!video || !selectedChannelId) return;
      setAdding(true);
      
      try {
          // 1. Get Last Program
          const lastProgram = await getLastProgram(selectedChannelId);
          
          let startTime = new Date();
          let shouldLoop = false;

          if (lastProgram) {
              const lastEndTime = new Date(lastProgram.end_time);
              // If last program ended in the past, start now. Otherwise append.
              if (lastEndTime > startTime) {
                  startTime = lastEndTime;
              } else {
                  // If the last program ended in the past, we treat this as a "gap" scenario or fresh start
                  // But wait, if there IS a last program but it's old, maybe we just start from NOW.
                  // The user specifically wants to handle the "New Channel" or "Empty Channel" case.
                  // So if lastProgram is null, OR if the gap is huge, we might consider the loop strategy.
                  // Let's stick to the prompt: "New channel" implies !lastProgram.
              }
          } else {
              // NO PROGRAMS EXIST (New Channel / Empty Channel)
              // 1. Set Start Time to TODAY 00:00
              startTime = new Date();
              startTime.setHours(0, 0, 0, 0);
              shouldLoop = true;
          }

          // 2. Calculate End Time & Prepare Loop
          // If looping, we need to add multiple programs until we catch up to NOW (and maybe a bit more)
          
          const programsToAdd = [];
          const now = new Date();
          // Add a buffer to ensure we cover at least until the end of current video playing
          const targetTime = new Date(now.getTime() + video.duration * 1000); 

          if (shouldLoop) {
              let currentLoopStart = new Date(startTime);
              
              while (currentLoopStart < targetTime) {
                  const loopEndTime = new Date(currentLoopStart.getTime() + video.duration * 1000);
                  
                  programsToAdd.push({
                      channel_id: selectedChannelId,
                      title: video.title,
                      description: video.description,
                      video_id: video.videoId,
                      duration: video.duration,
                      start_time: currentLoopStart.toISOString(),
                      end_time: loopEndTime.toISOString(),
                      thumbnail: video.thumbnail
                  });
                  
                  // Next iteration starts when this one ends
                  currentLoopStart = loopEndTime;
              }
          } else {
              // Normal single add
              const endTime = new Date(startTime.getTime() + video.duration * 1000);
              programsToAdd.push({
                  channel_id: selectedChannelId,
                  title: video.title,
                  description: video.description,
                  video_id: video.videoId,
                  duration: video.duration,
                  start_time: startTime.toISOString(),
                  end_time: endTime.toISOString(),
                  thumbnail: video.thumbnail
              });
          }

          // 3. Save to DB (Loop through programsToAdd)
          console.log(`Adding ${programsToAdd.length} programs to DB...`);
          
          for (const prog of programsToAdd) {
              await addProgram(prog);
          }

          // 4. Cleanup and Refresh
          setUrl('');
          setVideo(null);
          await loadChannelPrograms(selectedChannelId);
          
          // Switch date tab to the new program's date (or today if looped)
          const newProgramDate = new Date().toISOString().split('T')[0]; // Focus on today
          setSelectedDate(newProgramDate);
          
          alert(shouldLoop ? `${programsToAdd.length} adet video ile yayın akışı başlatıldı!` : 'Video başarıyla eklendi!');

      } catch (err) {
          console.error(err);
          setError('Video eklenirken bir hata oluştu.');
      } finally {
          setAdding(false);
      }
  };

  const handleDeleteProgram = async (programId: string) => {
      if (!confirm('Bu programı silmek istediğinize emin misiniz?')) return;
      
      try {
          await deleteProgram(programId);
          loadChannelPrograms(selectedChannelId);
      } catch (err) {
          console.error(err);
          alert('Silme işlemi başarısız oldu.');
      }
  };

  // --- Bulk Delete Logic ---
  const toggleSelectProgram = (programId: string) => {
      setSelectedProgramIds(prev => 
          prev.includes(programId) 
              ? prev.filter(id => id !== programId)
              : [...prev, programId]
      );
  };

  const handleBulkDelete = async () => {
      if (!confirm(`${selectedProgramIds.length} adet programı silmek istediğinize emin misiniz?`)) return;
      
      try {
          await deletePrograms(selectedProgramIds);
          loadChannelPrograms(selectedChannelId);
          setSelectedProgramIds([]);
      } catch (err) {
          console.error(err);
          alert('Toplu silme işlemi başarısız oldu.');
      }
  };

  // --- Edit Logic ---
  const openEditModal = (program: Program) => {
      setEditingProgram(program);
      setEditForm({
          title: program.title,
          description: program.description || ''
      });
  };

  const handleUpdateProgram = async () => {
      if (!editingProgram) return;
      setSaving(true);
      try {
          await updateProgram(editingProgram.id, {
              title: editForm.title,
              description: editForm.description
          });
          setEditingProgram(null);
          loadChannelPrograms(selectedChannelId);
      } catch (err) {
          console.error(err);
          alert('Güncelleme başarısız oldu.');
      } finally {
          setSaving(false);
      }
  };


  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
        return `${h}s ${m}dk ${s}sn`;
    }
    return `${m}dk ${s}sn`;
  };

  const renderProgramCard = (prog: Program, isLight = false) => {
    const isLive = isProgramLive(prog);
    
    return (
      <div key={prog.id} className={`p-4 flex items-center transition-colors group border-b 
          ${isLive 
              ? 'bg-green-500/10 border-green-500/20' 
              : isLight ? 'border-black/5 hover:bg-black/5' : 'border-white/5 hover:bg-white/5'
          }
      `}>
          <div className="mr-4 flex items-center">
              <button 
                  onClick={() => toggleSelectProgram(prog.id)}
                  className={`${isLive ? 'text-green-500' : isLight ? 'text-gray-400 hover:text-black' : 'text-gray-500 hover:text-white'} transition-colors`}
              >
                  {selectedProgramIds.includes(prog.id) ? (
                      <CheckSquare size={20} className="text-primary" />
                  ) : (
                      <Square size={20} />
                  )}
              </button>
          </div>

          <div className="w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-800 mr-4 relative shadow-sm">
              {prog.thumbnail && (
                  <img src={prog.thumbnail} alt="" className="w-full h-full object-cover" />
              )}
              {isLive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Signal size={16} className="text-green-400 animate-pulse" />
                  </div>
              )}
          </div>
          
          <div className="flex-grow min-w-0 mr-4">
              <h4 className={`font-bold truncate ${isLive ? 'text-green-400' : 'text-gray-100'}`}>
                  {prog.title}
                  {isLive && <span className="ml-2 text-[10px] uppercase bg-green-500 text-black px-1.5 py-0.5 rounded font-bold">CANLI</span>}
              </h4>
              <div className={`flex items-center text-xs mt-1 space-x-2 ${isLive ? 'text-green-300/70' : 'text-gray-400'}`}>
                  <span className="font-mono font-semibold">{prog.startTime} - {prog.endTime}</span>
              </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                  onClick={() => openEditModal(prog)}
                  className={`p-2 rounded-lg transition-colors ${isLight ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'}`}
                  title="Düzenle"
              >
                  <Edit2 size={18} />
              </button>
              <button 
                  onClick={() => handleDeleteProgram(prog.id)}
                  className={`p-2 rounded-lg transition-colors ${isLight ? 'text-gray-500 hover:text-red-600 hover:bg-red-100' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
                  title="Sil"
              >
                  <Trash2 size={18} />
              </button>
          </div>
      </div>
    );
  };

  const renderGroupHeader = (
      title: string, 
      icon: React.ReactNode, 
      groupKey: keyof typeof openGroups, 
      count: number,
      colors: { bg: string, text: string, border: string }
  ) => (
      <button 
          onClick={() => toggleGroup(groupKey)}
          className={`w-full px-4 py-3 flex items-center justify-between font-bold text-sm transition-colors ${colors.bg} ${colors.text}`}
      >
          <div className="flex items-center">
              {icon}
              <span className="ml-2">{title}</span>
              <span className="ml-2 opacity-60 text-xs">({count})</span>
          </div>
          {openGroups[groupKey] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Paneli</h1>
            <p className="text-gray-400">Yeni içerik eklemek için YouTube linkini yapıştırın.</p>
          </div>
          <div className="flex items-center space-x-4">
              <select 
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
              >
                  {channels.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#121212]">{c.name}</option>
                  ))}
              </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-lg leading-5 bg-white/5 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={loading || !url}
            className="flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Getiriliyor...
              </>
            ) : (
              'Bilgileri Getir'
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Preview Card */}
        {video && (
          <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="md:flex">
              {/* Thumbnail */}
              <div className="md:w-1/3 relative group">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover aspect-video md:aspect-auto"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white fill-white" />
                </div>
              </div>

              {/* Details */}
              <div className="p-6 md:w-2/3 space-y-4 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl font-bold text-white leading-tight">
                        {video.title}
                        </h2>
                        <span className="flex items-center text-xs font-mono bg-white/10 text-gray-300 px-2 py-1 rounded">
                            ID: {video.videoId}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1.5" />
                            {formatDuration(video.duration)}
                        </div>
                    </div>

                    <div className="relative mt-4">
                        <div className="flex items-center mb-2 text-sm font-medium text-gray-300">
                            <FileText className="w-4 h-4 mr-1.5" />
                            Açıklama
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                            {video.description}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleAddProgram}
                    disabled={adding}
                    className="w-full mt-4 flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-lg text-black bg-white hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {adding ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Ekleniyor...
                        </>
                    ) : (
                        <>
                            <Plus className="w-5 h-5 mr-2" />
                            Yayına Ekle
                        </>
                    )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        <div className="mt-12 pb-24">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <span className="w-1 h-6 bg-secondary rounded-full mr-3"></span>
                        Yayın Akışı
                    </h2>
                    {selectedProgramIds.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="flex items-center px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Seçilenleri Sil ({selectedProgramIds.length})
                        </button>
                    )}
                </div>
                <button 
                    onClick={() => loadChannelPrograms(selectedChannelId)}
                    className={`p-2 rounded-full hover:bg-white/5 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={20} className="text-gray-400" />
                </button>
            </div>

            {/* Date Tabs */}
            <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar">
                {dateTabs.map(tab => (
                    <button
                        key={tab.date}
                        onClick={() => setSelectedDate(tab.date)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                            selectedDate === tab.date 
                                ? 'bg-primary text-white' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <Calendar size={14} className="mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Grouped Lists */}
            {groupedPrograms ? (
                <div className="space-y-6">
                    {/* Night (First) */}
                    {groupedPrograms.night.length > 0 && (
                        <div className="rounded-xl overflow-hidden bg-purple-950/50 border border-purple-900/50">
                             {renderGroupHeader(
                                'GECE KUŞAĞI (00:00 - 05:59)', 
                                <Moon size={16} />, 
                                'night', 
                                groupedPrograms.night.length,
                                { bg: 'bg-purple-900/80', text: 'text-purple-100', border: '' }
                            )}
                            
                            {openGroups.night && (
                                <div className="divide-y divide-purple-900/30 animate-in slide-in-from-top-2 duration-200">
                                    {groupedPrograms.night.map(p => renderProgramCard(p, false))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Morning */}
                    {groupedPrograms.morning.length > 0 && (
                        <div className="rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                            {renderGroupHeader(
                                'SABAH KUŞAĞI (06:00 - 11:59)', 
                                <Sun size={16} />, 
                                'morning', 
                                groupedPrograms.morning.length,
                                { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-900 dark:text-amber-100', border: '' }
                            )}
                            
                            {openGroups.morning && (
                                <div className="divide-y divide-amber-200/50 dark:divide-amber-900/30 animate-in slide-in-from-top-2 duration-200">
                                    {groupedPrograms.morning.map(p => renderProgramCard(p, true))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Afternoon */}
                    {groupedPrograms.afternoon.length > 0 && (
                        <div className="rounded-xl overflow-hidden bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50">
                             {renderGroupHeader(
                                'ÖĞLE KUŞAĞI (12:00 - 17:59)', 
                                <CloudSun size={16} />, 
                                'afternoon', 
                                groupedPrograms.afternoon.length,
                                { bg: 'bg-sky-100 dark:bg-sky-900/50', text: 'text-sky-900 dark:text-sky-100', border: '' }
                            )}
                            
                            {openGroups.afternoon && (
                                <div className="divide-y divide-sky-200/50 dark:divide-sky-900/30 animate-in slide-in-from-top-2 duration-200">
                                    {groupedPrograms.afternoon.map(p => renderProgramCard(p, true))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Evening */}
                    {groupedPrograms.evening.length > 0 && (
                        <div className="rounded-xl overflow-hidden bg-indigo-950/50 border border-indigo-900/50">
                             {renderGroupHeader(
                                'AKŞAM KUŞAĞI (18:00 - 23:59)', 
                                <Sunset size={16} />, 
                                'evening', 
                                groupedPrograms.evening.length,
                                { bg: 'bg-indigo-900/80', text: 'text-indigo-100', border: '' }
                            )}

                            {openGroups.evening && (
                                <div className="divide-y divide-indigo-900/30 animate-in slide-in-from-top-2 duration-200">
                                    {groupedPrograms.evening.map(p => renderProgramCard(p, false))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty State */}
                    {Object.values(groupedPrograms).every(arr => arr.length === 0) && (
                         <div className="p-12 text-center text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                            Bu tarihte henüz program yok.
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500">
                    Yükleniyor...
                </div>
            )}
        </div>

        {/* Edit Modal */}
        {editingProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold">Program Düzenle</h3>
                        <button onClick={() => setEditingProgram(null)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Başlık</label>
                            <input 
                                type="text" 
                                value={editForm.title}
                                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Açıklama</label>
                            <textarea 
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary resize-none"
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                        <button 
                            onClick={() => setEditingProgram(null)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            onClick={handleUpdateProgram}
                            disabled={saving}
                            className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Kaydet
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
