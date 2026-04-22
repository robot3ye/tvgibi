'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    getChannels, addProgram, getProgramsForChannel, 
    deleteProgram, deletePrograms, updateProgram, reorderPrograms 
} from '../../../lib/api';
import { fetchVideoDetails, YouTubeVideoDetails } from '../../../lib/youtube';
import { Channel, Program } from '../../../data/mockData';
import { Check, X } from 'lucide-react';

import AdminHeader from '../../../components/admin-v2/AdminHeader';
import DayStats from '../../../components/admin-v2/DayStats';
import VideoInputSection from '../../../components/admin-v2/VideoInputSection';
import ProgramList from '../../../components/admin-v2/ProgramList';
import FooterNav from '../../../components/admin-v2/FooterNav';
import EditModal from '../../../components/admin-v2/EditModal';
import ChannelListModal from '../../../components/admin-v2/ChannelListModal';
import BulkAddModal from '../../../components/admin-v2/BulkAddModal';
import VideoDetailsModal from '../../../components/admin-v2/VideoDetailsModal';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AdminScheduleContent() {
    // --- State ---
    const [channels, setChannels] = useState<Channel[]>([]);
    
    const searchParams = useSearchParams();
    const urlChannelId = searchParams.get('channel') || '';
    
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [channelPrograms, setChannelPrograms] = useState<Program[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    
    // Video Fetching & Adding
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [video, setVideo] = useState<YouTubeVideoDetails | null>(null);
    const [adding, setAdding] = useState(false);
    const [isVideoDetailsModalOpen, setIsVideoDetailsModalOpen] = useState(false);
    
    // Selection & Editing
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [saving, setSaving] = useState(false);
    
    // Channel Management
    const [isChannelListModalOpen, setIsChannelListModalOpen] = useState(false);
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Bulk Actions Bar State
    const [targetChannelId, setTargetChannelId] = useState<string>('');
    const [targetDate, setTargetDate] = useState<string>('');

    // --- Effects ---

    // 1. Load Channels
    const loadChannels = async () => {
        const data = await getChannels();
        setChannels(data);
        if (data.length > 0 && !urlChannelId && !selectedChannelId) {
            setSelectedChannelId(data[0].id);
        }
    };

    useEffect(() => {
        loadChannels();
        // Initialize with local date string instead of UTC
        setSelectedDate(getLocalDateString()); 
    }, []);

    // Sync state with URL parameter changes
    useEffect(() => {
        if (urlChannelId) {
            setSelectedChannelId(urlChannelId);
        }
    }, [urlChannelId]);

    // 2. Load Programs
    useEffect(() => {
        if (selectedChannelId) {
            loadChannelPrograms(selectedChannelId);
        }
    }, [selectedChannelId]);

    // 3. Toast Timer
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // --- Helpers ---
    
    // Get local date string (YYYY-MM-DD) based on current timezone
    const getLocalDateString = (date: Date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadChannelPrograms = async (channelId: string) => {
        setSelectedProgramIds([]);
        try {
            const programs = await getProgramsForChannel(channelId);
            setChannelPrograms(programs);
        } catch (err) {
            console.error(err);
        }
    };

    const dateTabs = useMemo(() => {
        const tabs = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = getLocalDateString(d); // Use local date string
            let label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
            if (i === 0) label = 'BUGÜN';
            if (i === 1) label = 'YARIN';
            tabs.push({ date: dateStr, label: label.toUpperCase() });
        }
        return tabs;
    }, []);

    const isProgramLive = (prog: Program) => {
        const now = new Date();
        const todayStr = getLocalDateString(now); // Use local date string
        
        if (prog.date !== todayStr) return false;

        const [startH, startM] = prog.startTime.split(':').map(Number);
        const [endH, endM] = prog.endTime.split(':').map(Number);
        
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;
        const currentTime = now.getHours() * 60 + now.getMinutes();

        return currentTime >= startTime && currentTime < endTime;
    };

    // Filtered Programs for List
    const displayedPrograms = useMemo(() => {
        if (!selectedDate) return [];
        const filtered = channelPrograms.filter(p => p.date === selectedDate);
        // Sort by startTime to ensure visual order reflects the time updates from Drag & Drop
        return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [channelPrograms, selectedDate]);

    const currentLiveProgram = useMemo(() => {
        return channelPrograms.find(p => isProgramLive(p));
    }, [channelPrograms]);

    const totalDurationSeconds = useMemo(() => {
        return displayedPrograms.reduce((acc, curr) => acc + curr.duration, 0);
    }, [displayedPrograms]);

    // --- Handlers ---

    const handleFetch = async () => {
        if (!url) return;
        setLoading(true);
        setVideo(null);
        try {
            const details = await fetchVideoDetails(url);
            if (details) {
                setVideo(details);
                setIsVideoDetailsModalOpen(true);
            } else {
                setToast({ message: 'Video bulunamadı.', type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: 'Hata oluştu.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddProgram = async (editedVideoDetails?: any) => {
        // Use editedVideoDetails if provided (from modal), otherwise fallback to state video
        const videoToAdd = editedVideoDetails || video;
        
        if (!videoToAdd || !selectedChannelId) return;
        setAdding(true);
        
        try {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const dayPrograms = channelPrograms.filter(p => p.date === selectedDate);
            dayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
            const lastProg = dayPrograms[dayPrograms.length - 1];

            let startTime = new Date(startOfDay);

            if (lastProg) {
                const [h, m] = lastProg.endTime.split(':').map(Number);
                startTime.setHours(h, m, 0, 0);
            }

            if (startTime > endOfDay) {
                setToast({ message: 'Gün zaten dolu!', type: 'error' });
                setAdding(false);
                return;
            }

            const durationMs = videoToAdd.duration * 1000;
            const endTime = new Date(startTime.getTime() + durationMs);

            if (endTime > endOfDay) {
                if (!confirm('Bu video gün sonunu (23:59) aşıyor. Yine de eklemek istiyor musunuz?')) {
                    setAdding(false);
                    return;
                }
            }

            await addProgram({
                channel_id: selectedChannelId,
                title: videoToAdd.title,
                description: videoToAdd.description,
                video_id: videoToAdd.videoId,
                duration: videoToAdd.duration,
                creator: videoToAdd.creator,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                thumbnail: videoToAdd.thumbnail
            });

            setUrl('');
            setVideo(null);
            await loadChannelPrograms(selectedChannelId);
            setToast({ message: 'Video eklendi!', type: 'success' });
            setIsVideoDetailsModalOpen(false);

        } catch (err) {
            console.error(err);
            setToast({ message: 'Ekleme hatası.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleAddBulk = async (videos: any[]) => {
        if (!selectedChannelId || videos.length === 0) return;
        setAdding(true);

        try {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const dayPrograms = channelPrograms.filter(p => p.date === selectedDate);
            dayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
            const lastProg = dayPrograms[dayPrograms.length - 1];

            let currentStartTime = new Date(startOfDay);
            if (lastProg) {
                const [h, m] = lastProg.endTime.split(':').map(Number);
                currentStartTime.setHours(h, m, 0, 0);
            }

            for (const v of videos) {
                const durationMs = v.duration * 1000;
                const endTime = new Date(currentStartTime.getTime() + durationMs);

                await addProgram({
                    channel_id: selectedChannelId,
                    title: v.title,
                    description: v.description,
                    video_id: v.videoId,
                    duration: v.duration,
                    creator: v.creator,
                    start_time: currentStartTime.toISOString(),
                    end_time: endTime.toISOString(),
                    thumbnail: v.thumbnail
                });

                currentStartTime = endTime;
            }

            await loadChannelPrograms(selectedChannelId);
            setToast({ message: `${videos.length} video toplu olarak eklendi!`, type: 'success' });
            setIsBulkAddModalOpen(false);
        } catch (err) {
            console.error(err);
            setToast({ message: 'Toplu ekleme hatası.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleAddFiller = async () => {
        if (!selectedChannelId || !selectedDate) return;
        const fillerVideoId = "ILzo07ipH40"; 
        
        try {
            setAdding(true);
            const dayPrograms = channelPrograms.filter(p => p.date === selectedDate);
            dayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
            const lastProg = dayPrograms[dayPrograms.length - 1];
            
            let startTime = new Date(selectedDate);
            if (lastProg) {
                const [h, m] = lastProg.endTime.split(':').map(Number);
                startTime.setHours(h, m, 0, 0);
                if (h >= 24) { 
                    setToast({ message: 'Gün zaten dolu!', type: 'error' });
                    setAdding(false);
                    return;
                }
            } else {
                startTime.setHours(0, 0, 0, 0);
            }
            
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);
            const remainingMs = endOfDay.getTime() - startTime.getTime();
            const remainingSeconds = Math.floor(remainingMs / 1000);
            
            if (remainingSeconds <= 0) {
                setToast({ message: 'Gün zaten dolu!', type: 'error' });
                setAdding(false);
                return;
            }
            
            const endTime = new Date(startTime.getTime() + remainingSeconds * 1000);
            
            await addProgram({
                channel_id: selectedChannelId,
                title: "Yayın Akışı Dolgu (Timer)",
                description: "Otomatik eklenen dolgu videosu.",
                video_id: fillerVideoId,
                duration: remainingSeconds,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                thumbnail: "https://img.youtube.com/vi/ILzo07ipH40/hqdefault.jpg"
            });
            
            await loadChannelPrograms(selectedChannelId);
            setToast({ message: 'Dolgu eklendi.', type: 'success' });
            
        } catch (err) {
            console.error(err);
            setToast({ message: 'Hata oluştu.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteProgram = async (id: string) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await deleteProgram(id);
            loadChannelPrograms(selectedChannelId);
            setToast({ message: 'Program silindi.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Hata.', type: 'error' });
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`${selectedProgramIds.length} programı silmek istiyor musunuz?`)) return;
        try {
            await deletePrograms(selectedProgramIds);
            loadChannelPrograms(selectedChannelId);
            setSelectedProgramIds([]);
            setToast({ message: 'Silindi.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Hata.', type: 'error' });
        }
    };

    const handleUpdateProgram = async (id: string, updates: { title: string, description: string }) => {
        setSaving(true);
        try {
            await updateProgram(id, updates);
            setEditingProgram(null);
            loadChannelPrograms(selectedChannelId);
            setToast({ message: 'Güncellendi.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Hata.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleCopySelected = async () => {
        if (!targetChannelId || !targetDate || selectedProgramIds.length === 0) {
            setToast({ message: 'Lütfen hedef kanal ve gün seçiniz.', type: 'error' });
            return;
        }
        setAdding(true);
        try {
            const programsToCopy = displayedPrograms.filter(p => selectedProgramIds.includes(p.id));
            programsToCopy.sort((a, b) => a.startTime.localeCompare(b.startTime));

            const targetDayPrograms = await getProgramsForChannel(targetChannelId);
            const filteredTargetDayPrograms = targetDayPrograms.filter(p => p.date === targetDate);
            filteredTargetDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
            const lastProg = filteredTargetDayPrograms[filteredTargetDayPrograms.length - 1];

            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            let currentStartTime = new Date(startOfDay);
            if (lastProg) {
                const [h, m] = lastProg.endTime.split(':').map(Number);
                currentStartTime.setHours(h, m, 0, 0);
            }

            for (const v of programsToCopy) {
                const durationMs = v.duration * 1000;
                const endTime = new Date(currentStartTime.getTime() + durationMs);

                await addProgram({
                    channel_id: targetChannelId,
                    title: v.title,
                    description: v.description || '',
                    video_id: v.videoId,
                    duration: v.duration,
                    creator: v.creator || '',
                    start_time: currentStartTime.toISOString(),
                    end_time: endTime.toISOString(),
                    thumbnail: v.thumbnail || ''
                });

                currentStartTime = endTime;
            }

            await loadChannelPrograms(selectedChannelId);
            setSelectedProgramIds([]);
            setToast({ message: `${programsToCopy.length} program kopyalandı!`, type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Kopyalama hatası.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleMoveSelected = async () => {
        if (!targetChannelId || !targetDate || selectedProgramIds.length === 0) {
            setToast({ message: 'Lütfen hedef kanal ve gün seçiniz.', type: 'error' });
            return;
        }
        setAdding(true);
        try {
            const programsToMove = displayedPrograms.filter(p => selectedProgramIds.includes(p.id));
            programsToMove.sort((a, b) => a.startTime.localeCompare(b.startTime));

            const targetDayPrograms = await getProgramsForChannel(targetChannelId);
            const filteredTargetDayPrograms = targetDayPrograms.filter(p => p.date === targetDate);
            filteredTargetDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
            const lastProg = filteredTargetDayPrograms[filteredTargetDayPrograms.length - 1];

            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            let currentStartTime = new Date(startOfDay);
            if (lastProg) {
                const [h, m] = lastProg.endTime.split(':').map(Number);
                currentStartTime.setHours(h, m, 0, 0);
            }

            for (const v of programsToMove) {
                const durationMs = v.duration * 1000;
                const endTime = new Date(currentStartTime.getTime() + durationMs);

                await addProgram({
                    channel_id: targetChannelId,
                    title: v.title,
                    description: v.description || '',
                    video_id: v.videoId,
                    duration: v.duration,
                    creator: v.creator || '',
                    start_time: currentStartTime.toISOString(),
                    end_time: endTime.toISOString(),
                    thumbnail: v.thumbnail || ''
                });

                currentStartTime = endTime;
            }

            await deletePrograms(selectedProgramIds);
            
            await loadChannelPrograms(selectedChannelId);
            setSelectedProgramIds([]);
            setToast({ message: `${programsToMove.length} program taşındı!`, type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Taşıma hatası.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleDownloadSchedule = () => {
        if (selectedProgramIds.length === 0) return;
        const selectedProgs = displayedPrograms.filter(p => selectedProgramIds.includes(p.id));
        selectedProgs.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        const content = selectedProgs.map(p => `${p.title} - https://youtube.com/watch?v=${p.videoId}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${channels.find(c => c.id === selectedChannelId)?.name}_akis_${selectedDate}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleReorder = (newItems: Program[]) => {
        // Optimistic update
        // We only updated the filtered list 'displayedPrograms' effectively, 
        // but we need to update 'channelPrograms' which holds ALL days.
        
        // Daisy Chain Logic (Scoped to Day)
        const now = new Date();
        const todayStr = getLocalDateString(now); // Use local date string
        const dayPrograms = newItems.filter(p => p.date === selectedDate);
        
        let anchorTime: Date | null = null;
        
        const updatedDayPrograms = dayPrograms.map((prog) => {
            const isLive = isProgramLive(prog);
            const [endH, endM] = prog.endTime.split(':').map(Number);
            const endTimeVal = endH * 60 + endM;
            const currentTimeVal = now.getHours() * 60 + now.getMinutes();
            const isPast = (selectedDate === todayStr && currentTimeVal >= endTimeVal);
            
            if (isPast || isLive) {
                const [h, m] = prog.endTime.split(':').map(Number);
                const d = new Date(prog.date);
                d.setHours(h, m, 0, 0);
                anchorTime = d;
                return prog;
            }
            
            if (!anchorTime) {
                 const d = new Date(prog.date);
                 d.setHours(0, 0, 0, 0);
                 anchorTime = d;
            }
            
            const durationMs = prog.duration * 1000;
            const newStartTime = new Date(anchorTime);
            const newEndTime = new Date(anchorTime.getTime() + durationMs);
            
            const format = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            
            const updatedProg = {
                ...prog,
                startTime: format(newStartTime),
                endTime: format(newEndTime),
            };
            
            anchorTime = newEndTime;
            return updatedProg;
        });

        // Trigger API
        const changedItems = updatedDayPrograms.filter(p => {
             const isLive = isProgramLive(p);
             const [endH, endM] = p.endTime.split(':').map(Number);
             const endTimeVal = endH * 60 + endM;
             const currentTimeVal = now.getHours() * 60 + now.getMinutes();
             const isPast = (selectedDate === todayStr && currentTimeVal >= endTimeVal);
             return !isLive && !isPast;
        });
        
        if (changedItems.length > 0) {
             const firstChanged = changedItems[0];
             const [h, m] = firstChanged.startTime.split(':').map(Number);
             const d = new Date(firstChanged.date);
             d.setHours(h, m, 0, 0);
             reorderPrograms(changedItems, d.toISOString());
        }

        // Merge back
        const updatedChannelPrograms = channelPrograms.map(p => {
            const updated = updatedDayPrograms.find(up => up.id === p.id);
            return updated || p;
        });
        
        setChannelPrograms(updatedChannelPrograms);
    };

    return (
        <div className="min-h-screen bg-[#111] font-mono pb-20">
            <div className="sticky top-0 z-40 bg-[#111]">
                {/* Header */}
                <AdminHeader 
                    dateTabs={dateTabs} 
                    selectedDate={selectedDate} 
                    onDateSelect={setSelectedDate} 
                    onMenuClick={() => setIsChannelListModalOpen(true)}
                    selectedChannelName={channels.find(c => c.id === selectedChannelId)?.name}
                />

                {/* Video Input */}
                <VideoInputSection 
                    url={url}
                    setUrl={setUrl}
                    onFetch={handleFetch}
                    videoDetails={video}
                    onAdd={handleAddProgram}
                    onCancel={() => { setVideo(null); setUrl(''); setIsVideoDetailsModalOpen(false); }}
                    onAddFiller={handleAddFiller}
                    onBulkAddClick={() => setIsBulkAddModalOpen(true)}
                    loading={loading}
                    adding={adding}
                />
            </div>

            {/* Day Stats (Hero) */}
            <DayStats 
                selectedDate={selectedDate} 
                totalDurationSeconds={totalDurationSeconds}
                currentProgram={currentLiveProgram}
            />

            {/* Main Content Area */}
            <div className="p-4 md:p-8">
                <ProgramList 
                    programs={displayedPrograms}
                    selectedDate={selectedDate}
                    onReorder={handleReorder}
                    onDelete={handleDeleteProgram}
                    onEdit={setEditingProgram}
                    selectedIds={selectedProgramIds}
            onToggleSelect={(id) => setSelectedProgramIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onBulkDelete={handleBulkDelete}
                    onRefresh={() => loadChannelPrograms(selectedChannelId)}
                    liveProgramId={currentLiveProgram?.id}
                />
            </div>

            {/* Footer Navigation */}
            <FooterNav />

            {/* Bulk Actions Bottom Bar */}
            <div 
                className={`fixed bottom-0 left-0 w-full h-[100px] bg-[#f97316] z-50 flex items-center justify-center gap-4 transition-transform duration-300 ${
                    selectedProgramIds.length > 0 ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
                <button 
                    onClick={() => setSelectedProgramIds(displayedPrograms.map(p => p.id))}
                    className="bg-[#0000cb] text-[#f2911d] px-6 py-3 font-bold hover:opacity-80 transition-opacity cursor-pointer"
                >
                    Tümünü Seç
                </button>

                <select 
                    value={targetChannelId}
                    onChange={(e) => setTargetChannelId(e.target.value)}
                    className="bg-[#2546ff] text-[#f2911d] px-6 py-3 font-bold outline-none cursor-pointer hover:opacity-80 transition-opacity appearance-none text-center"
                    style={{ textAlignLast: 'center' }}
                >
                    <option value="">Kanal Seç ▼</option>
                    {channels.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select 
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="bg-[#2546ff] text-[#f2911d] px-6 py-3 font-bold outline-none cursor-pointer hover:opacity-80 transition-opacity appearance-none text-center"
                    style={{ textAlignLast: 'center' }}
                >
                    <option value="">Gün Seç ▼</option>
                    {dateTabs.map(t => (
                        <option key={t.date} value={t.date}>{t.label}</option>
                    ))}
                </select>

                <button 
                    onClick={handleMoveSelected}
                    className="bg-[#2546ff] text-[#f2911d] px-6 py-3 font-bold hover:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer"
                >
                    Taşı ({selectedProgramIds.length})
                </button>

                <button 
                    onClick={handleCopySelected}
                    className="bg-[#2546ff] text-[#f2911d] px-6 py-3 font-bold hover:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer"
                >
                    Kopyala ({selectedProgramIds.length})
                </button>

                <button 
                    onClick={handleDownloadSchedule}
                    className="bg-[#ffce2e] text-[#000000] px-6 py-3 font-bold hover:opacity-80 transition-opacity cursor-pointer"
                >
                    Akışı indir
                </button>

                <button 
                    onClick={handleBulkDelete}
                    className="bg-[#ff6200] text-[#FFFFFF] px-6 py-3 font-bold hover:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer"
                >
                    Seçilenleri sil ({selectedProgramIds.length})
                </button>
                
                {/* Clear Selection */}
                <button 
                    onClick={() => setSelectedProgramIds([])}
                    className="absolute top-2 right-4 text-white hover:text-black transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Modals */}
            <EditModal 
                program={editingProgram} 
                onClose={() => setEditingProgram(null)} 
                onSave={handleUpdateProgram} 
                saving={saving} 
            />
            
            <ChannelListModal 
                isOpen={isChannelListModalOpen}
                onClose={() => setIsChannelListModalOpen(false)}
                channels={channels}
                currentChannelId={selectedChannelId}
            />

            <BulkAddModal 
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onAddBulk={handleAddBulk}
                adding={adding}
            />

            <VideoDetailsModal 
                isOpen={isVideoDetailsModalOpen}
                onClose={() => {
                    setIsVideoDetailsModalOpen(false);
                    setVideo(null);
                    setUrl('');
                }}
                video={video}
                onAdd={handleAddProgram}
                adding={adding}
            />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-bold flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-300 ${
                    toast.type === 'success' 
                        ? 'bg-[#00FF00] text-black' 
                        : 'bg-[#ff0000] text-white'
                }`}>
                    {toast.type === 'success' ? <Check size={24} /> : <X size={24} />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}

export default function AdminV2Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#111] text-[#00FF00] font-mono flex items-center justify-center text-2xl font-bold">YÜKLENİYOR...</div>}>
            <AdminScheduleContent />
        </Suspense>
    );
}