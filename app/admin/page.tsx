'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    getChannels, addProgram, getProgramsForChannel, 
    deleteProgram, deletePrograms, updateProgram, reorderPrograms 
} from '../../lib/api';
import { fetchVideoDetails, YouTubeVideoDetails } from '../../lib/youtube';
import { Channel, Program } from '../../data/mockData';
import { Check, X } from 'lucide-react';

import AdminHeader from '../../components/admin-v2/AdminHeader';
import DayStats from '../../components/admin-v2/DayStats';
import VideoInputSection from '../../components/admin-v2/VideoInputSection';
import ProgramList from '../../components/admin-v2/ProgramList';
import FooterNav from '../../components/admin-v2/FooterNav';
import EditModal from '../../components/admin-v2/EditModal';

export default function AdminV2Page() {
    // --- State ---
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [channelPrograms, setChannelPrograms] = useState<Program[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    
    // Video Fetching & Adding
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [video, setVideo] = useState<YouTubeVideoDetails | null>(null);
    const [adding, setAdding] = useState(false);
    
    // Selection & Editing
    const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [saving, setSaving] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // --- Effects ---

    // 1. Load Channels
    useEffect(() => {
        const loadChannels = async () => {
            const data = await getChannels();
            setChannels(data);
            if (data.length > 0) setSelectedChannelId(data[0].id);
        };
        loadChannels();
        setSelectedDate(new Date().toISOString().split('T')[0]); // Default to today
    }, []);

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
            const dateStr = d.toISOString().split('T')[0];
            let label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
            if (i === 0) label = 'BUGÜN';
            if (i === 1) label = 'YARIN';
            tabs.push({ date: dateStr, label: label.toUpperCase() });
        }
        return tabs;
    }, []);

    const isProgramLive = (prog: Program) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
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
            if (details) setVideo(details);
            else setToast({ message: 'Video bulunamadı.', type: 'error' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Hata oluştu.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddProgram = async () => {
        if (!video || !selectedChannelId) return;
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

            const durationMs = video.duration * 1000;
            const endTime = new Date(startTime.getTime() + durationMs);

            if (endTime > endOfDay) {
                if (!confirm('Bu video gün sonunu (23:59) aşıyor. Yine de eklemek istiyor musunuz?')) {
                    setAdding(false);
                    return;
                }
            }

            await addProgram({
                channel_id: selectedChannelId,
                title: video.title,
                description: video.description,
                video_id: video.videoId,
                duration: video.duration,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                thumbnail: video.thumbnail
            });

            setUrl('');
            setVideo(null);
            await loadChannelPrograms(selectedChannelId);
            setToast({ message: 'Video eklendi!', type: 'success' });

        } catch (err) {
            console.error(err);
            setToast({ message: 'Ekleme hatası.', type: 'error' });
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

    const handleReorder = (newItems: Program[]) => {
        // Optimistic update
        // We only updated the filtered list 'displayedPrograms' effectively, 
        // but we need to update 'channelPrograms' which holds ALL days.
        
        // Daisy Chain Logic (Scoped to Day)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
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
            {/* Header */}
            <AdminHeader 
                dateTabs={dateTabs} 
                selectedDate={selectedDate} 
                onDateSelect={setSelectedDate} 
                onMenuClick={() => alert('Menu - Coming Soon')}
            />

            {/* Day Stats (Hero) */}
            <DayStats 
                selectedDate={selectedDate} 
                totalDurationSeconds={totalDurationSeconds}
                currentProgram={currentLiveProgram}
            />

            {/* Video Input */}
            <VideoInputSection 
                url={url}
                setUrl={setUrl}
                onFetch={handleFetch}
                videoDetails={video}
                onAdd={handleAddProgram}
                onCancel={() => { setVideo(null); setUrl(''); }}
                onAddFiller={handleAddFiller}
                loading={loading}
                adding={adding}
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

            {/* Modals */}
            <EditModal 
                program={editingProgram} 
                onClose={() => setEditingProgram(null)} 
                onSave={handleUpdateProgram} 
                saving={saving} 
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