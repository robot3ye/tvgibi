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
import ArchiveModal from '../../../components/admin-v2/ArchiveModal';

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
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Bulk Actions Bar State
    const [targetChannelId, setTargetChannelId] = useState<string>('');
    const [targetDate, setTargetDate] = useState<string>('');
    const [isMoving, setIsMoving] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

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

    // State for live program
    const [realLiveProgram, setRealLiveProgram] = useState<Program | null>(null);

    // Sync state with URL parameter changes
    useEffect(() => {
        if (urlChannelId) {
            setSelectedChannelId(urlChannelId);
        }
    }, [urlChannelId]);

    // Fetch the live program for the channel regardless of selected date
    const fetchLiveProgram = async (channelId: string) => {
        const todayStr = getLocalDateString();
        const programs = await getProgramsForChannel(channelId, todayStr);
        const live = programs.find(p => isProgramLive(p));
        setRealLiveProgram(live || null);
    };

    // 2. Load Programs
    useEffect(() => {
        if (selectedChannelId && selectedDate) {
            loadChannelPrograms(selectedChannelId, selectedDate);
        }
        if (selectedChannelId) {
            fetchLiveProgram(selectedChannelId);
            
            // Set up interval to periodically check/update live program
            const interval = setInterval(() => {
                fetchLiveProgram(selectedChannelId);
            }, 60000); // check every minute
            
            return () => clearInterval(interval);
        }
    }, [selectedChannelId, selectedDate]);

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

    const loadChannelPrograms = async (channelId: string, dateStr: string) => {
        setSelectedProgramIds([]);
        try {
            const programs = await getProgramsForChannel(channelId, dateStr);
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

        const [startH, startM, startS] = prog.startTime.split(':').map(Number);
        const [endH, endM, endS] = prog.endTime.split(':').map(Number);
        
        const startTime = startH * 3600 + startM * 60 + (startS || 0);
        const endTime = endH * 3600 + endM * 60 + (endS || 0);
        const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        return currentTime >= startTime && currentTime < endTime;
    };

    // Filtered Programs for List
    const displayedPrograms = useMemo(() => {
        if (!selectedDate) return [];
        const filtered = channelPrograms.filter(p => p.date === selectedDate);
        // Sort by startTime to ensure visual order reflects the time updates from Drag & Drop
        return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [channelPrograms, selectedDate]);

    // Use the realLiveProgram for the ON_AIR section instead of checking within the selected date's programs
    const currentLiveProgram = realLiveProgram;

    const totalDurationSeconds = useMemo(() => {
        return displayedPrograms.reduce((acc, curr) => acc + curr.duration, 0);
    }, [displayedPrograms]);

    const isPastDate = useMemo(() => {
        if (!selectedDate) return false;
        const today = getLocalDateString();
        return selectedDate < today;
    }, [selectedDate]);

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
                const [h, m, s] = lastProg.endTime.split(':').map(Number);
                startTime.setHours(h, m, s || 0, 0);
            }

            if (startTime > endOfDay) {
                setToast({ message: 'Gün zaten dolu!', type: 'error' });
                setAdding(false);
                return;
            }

            const durationMs = videoToAdd.duration * 1000;
            const endTime = new Date(startTime.getTime() + durationMs);

            if (endTime > endOfDay) {
                setToast({ message: 'Bu video gün sonunu (23:59) aşıyor! Lütfen daha kısa bir video ekleyin.', type: 'error' });
                setAdding(false);
                return;
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
            await loadChannelPrograms(selectedChannelId, selectedDate);
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
            // Re-fetch all channel programs to have latest state, including other days
            const allChannelPrograms = await getProgramsForChannel(selectedChannelId);
            
            let currentDayStr = selectedDate;
            let currentStartTime: Date | null = null;

            for (const v of videos) {
                if (!currentStartTime) {
                    const startOfDay = new Date(currentDayStr);
                    startOfDay.setHours(0, 0, 0, 0);
                    
                    const dayPrograms = allChannelPrograms.filter(p => p.date === currentDayStr);
                    dayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const lastProg = dayPrograms[dayPrograms.length - 1];

                    currentStartTime = new Date(startOfDay);
                    if (lastProg) {
                        const [h, m, s] = lastProg.endTime.split(':').map(Number);
                        currentStartTime.setHours(h, m, s || 0, 0);
                    }
                }

                const durationMs = v.duration * 1000;
                let endTime: Date = new Date((currentStartTime as Date).getTime() + durationMs);

                const endOfDay = new Date(currentDayStr);
                endOfDay.setHours(23, 59, 59, 999);

                if (endTime > endOfDay) {
                    // Video exceeds 23:59:59. Push to the next day!
                    const nextDay = new Date(currentDayStr);
                    nextDay.setDate(nextDay.getDate() + 1);
                    // Handle timezone offset to get correct YYYY-MM-DD
                    const offset = nextDay.getTimezoneOffset();
                    const localDate = new Date(nextDay.getTime() - (offset * 60 * 1000));
                    currentDayStr = localDate.toISOString().split('T')[0];

                    const nextStartOfDay = new Date(currentDayStr);
                    nextStartOfDay.setHours(0, 0, 0, 0);

                    const nextDayPrograms = allChannelPrograms.filter(p => p.date === currentDayStr);
                    nextDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const nextLastProg = nextDayPrograms[nextDayPrograms.length - 1];

                    currentStartTime = new Date(nextStartOfDay);
                    if (nextLastProg) {
                        const [h, m, s] = nextLastProg.endTime.split(':').map(Number);
                        currentStartTime.setHours(h, m, s || 0, 0);
                    }

                    // Recalculate endTime for the new day
                    endTime = new Date((currentStartTime as Date).getTime() + durationMs);
                }

                const addedProgram = await addProgram({
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

                if (addedProgram && addedProgram.length > 0) {
                    // Update our local array so the next iteration knows about it
                    allChannelPrograms.push({
                        ...addedProgram[0],
                        date: currentDayStr,
                        startTime: currentStartTime.toISOString().split('T')[1].split('.')[0], // roughly HH:mm:ss
                        endTime: endTime.toISOString().split('T')[1].split('.')[0],
                    } as any);
                }

                currentStartTime = endTime;
            }

            await loadChannelPrograms(selectedChannelId, selectedDate);
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
                const [h, m, s] = lastProg.endTime.split(':').map(Number);
                startTime.setHours(h, m, s || 0, 0);
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
            
            await loadChannelPrograms(selectedChannelId, selectedDate);
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
            const updatedPrograms = channelPrograms.filter(p => p.id !== id);
            setChannelPrograms(updatedPrograms);
            const remainingDisplayed = updatedPrograms.filter(p => p.date === selectedDate);
            handleReorder(remainingDisplayed);
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
            const updatedPrograms = channelPrograms.filter(p => !selectedProgramIds.includes(p.id));
            setChannelPrograms(updatedPrograms);
            const remainingDisplayed = updatedPrograms.filter(p => p.date === selectedDate);
            handleReorder(remainingDisplayed);
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
            loadChannelPrograms(selectedChannelId, selectedDate);
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
        setIsCopying(true);
        try {
            const programsToCopy = displayedPrograms.filter(p => selectedProgramIds.includes(p.id));
            programsToCopy.sort((a, b) => a.startTime.localeCompare(b.startTime));

            const targetDayPrograms = await getProgramsForChannel(targetChannelId, targetDate);
            let currentDayStr = targetDate;
            let currentStartTime: Date | null = null;

            for (const v of programsToCopy) {
                if (!currentStartTime) {
                    const startOfDay = new Date(currentDayStr);
                    startOfDay.setHours(0, 0, 0, 0);
                    
                    const filteredTargetDayPrograms = targetDayPrograms.filter(p => p.date === currentDayStr);
                    filteredTargetDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const lastProg = filteredTargetDayPrograms[filteredTargetDayPrograms.length - 1];

                    currentStartTime = new Date(startOfDay);
                    if (lastProg) {
                        const [h, m, s] = lastProg.endTime.split(':').map(Number);
                        currentStartTime.setHours(h, m, s || 0, 0);
                    }
                }

                const durationMs = v.duration * 1000;
                let endTime: Date = new Date((currentStartTime as Date).getTime() + durationMs);

                const endOfDay = new Date(currentDayStr);
                endOfDay.setHours(23, 59, 59, 999);

                if (endTime > endOfDay) {
                    const nextDay = new Date(currentDayStr);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const offset = nextDay.getTimezoneOffset();
                    const localDate = new Date(nextDay.getTime() - (offset * 60 * 1000));
                    currentDayStr = localDate.toISOString().split('T')[0];

                    const nextStartOfDay = new Date(currentDayStr);
                    nextStartOfDay.setHours(0, 0, 0, 0);

                    const nextDayPrograms = targetDayPrograms.filter(p => p.date === currentDayStr);
                    nextDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const nextLastProg = nextDayPrograms[nextDayPrograms.length - 1];

                    currentStartTime = new Date(nextStartOfDay);
                    if (nextLastProg) {
                        const [h, m, s] = nextLastProg.endTime.split(':').map(Number);
                        currentStartTime.setHours(h, m, s || 0, 0);
                    }

                    endTime = new Date((currentStartTime as Date).getTime() + durationMs);
                }

                const addedProgram = await addProgram({
                    channel_id: targetChannelId,
                    title: v.title,
                    description: v.description || '',
                    video_id: v.videoId,
                    duration: v.duration,
                    creator: v.creator || '',
                    start_time: (currentStartTime as Date).toISOString(),
                    end_time: endTime.toISOString(),
                    thumbnail: v.thumbnail || ''
                });

                if (addedProgram && addedProgram.length > 0) {
                    targetDayPrograms.push({
                        ...addedProgram[0],
                        date: currentDayStr,
                        startTime: (currentStartTime as Date).toISOString().split('T')[1].split('.')[0],
                        endTime: endTime.toISOString().split('T')[1].split('.')[0],
                    } as any);
                }

                currentStartTime = endTime;
            }

            await loadChannelPrograms(selectedChannelId, selectedDate);
            setSelectedProgramIds([]);
            setToast({ message: `${programsToCopy.length} program kopyalandı!`, type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Kopyalama hatası.', type: 'error' });
        } finally {
            setIsCopying(false);
        }
    };

    const handleMoveSelected = async () => {
        if (!targetChannelId || !targetDate || selectedProgramIds.length === 0) {
            setToast({ message: 'Lütfen hedef kanal ve gün seçiniz.', type: 'error' });
            return;
        }
        setIsMoving(true);
        try {
            const programsToMove = displayedPrograms.filter(p => selectedProgramIds.includes(p.id));
            programsToMove.sort((a, b) => a.startTime.localeCompare(b.startTime));

            const targetDayPrograms = await getProgramsForChannel(targetChannelId);
            let currentDayStr = targetDate;
            let currentStartTime: Date | null = null;

            for (const v of programsToMove) {
                if (!currentStartTime) {
                    const startOfDay = new Date(currentDayStr);
                    startOfDay.setHours(0, 0, 0, 0);
                    
                    const filteredTargetDayPrograms = targetDayPrograms.filter(p => p.date === currentDayStr);
                    filteredTargetDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const lastProg = filteredTargetDayPrograms[filteredTargetDayPrograms.length - 1];

                    currentStartTime = new Date(startOfDay);
                    if (lastProg) {
                        const [h, m, s] = lastProg.endTime.split(':').map(Number);
                        currentStartTime.setHours(h, m, s || 0, 0);
                    }
                }

                const durationMs = v.duration * 1000;
                let endTime: Date = new Date((currentStartTime as Date).getTime() + durationMs);

                const endOfDay = new Date(currentDayStr);
                endOfDay.setHours(23, 59, 59, 999);

                if (endTime > endOfDay) {
                    const nextDay = new Date(currentDayStr);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const offset = nextDay.getTimezoneOffset();
                    const localDate = new Date(nextDay.getTime() - (offset * 60 * 1000));
                    currentDayStr = localDate.toISOString().split('T')[0];

                    const nextStartOfDay = new Date(currentDayStr);
                    nextStartOfDay.setHours(0, 0, 0, 0);

                    const nextDayPrograms = targetDayPrograms.filter(p => p.date === currentDayStr);
                    nextDayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const nextLastProg = nextDayPrograms[nextDayPrograms.length - 1];

                    currentStartTime = new Date(nextStartOfDay);
                    if (nextLastProg) {
                        const [h, m, s] = nextLastProg.endTime.split(':').map(Number);
                        currentStartTime.setHours(h, m, s || 0, 0);
                    }

                    endTime = new Date((currentStartTime as Date).getTime() + durationMs);
                }

                const addedProgram = await addProgram({
                    channel_id: targetChannelId,
                    title: v.title,
                    description: v.description || '',
                    video_id: v.videoId,
                    duration: v.duration,
                    creator: v.creator || '',
                    start_time: (currentStartTime as Date).toISOString(),
                    end_time: endTime.toISOString(),
                    thumbnail: v.thumbnail || ''
                });

                if (addedProgram && addedProgram.length > 0) {
                    targetDayPrograms.push({
                        ...addedProgram[0],
                        date: currentDayStr,
                        startTime: (currentStartTime as Date).toISOString().split('T')[1].split('.')[0],
                        endTime: endTime.toISOString().split('T')[1].split('.')[0],
                    } as any);
                }

                currentStartTime = endTime;
            }

            await deletePrograms(selectedProgramIds);
            
            await loadChannelPrograms(selectedChannelId, selectedDate);
            setSelectedProgramIds([]);
            setToast({ message: `${programsToMove.length} program taşındı!`, type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Taşıma hatası.', type: 'error' });
        } finally {
            setIsMoving(false);
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

    const handleReorder = async (newItems: Program[]) => {
        // Optimistic update: anında state'i güncelleyerek UI gecikmesini (sekme/geri atma) engelliyoruz
        const now = new Date();
        const todayStr = getLocalDateString(now); // Use local date string
        const dayPrograms = newItems.filter(p => p.date === selectedDate);
        
        let anchorTime: Date | null = null;
        
        const updatedDayPrograms = dayPrograms.map((prog) => {
            const isLive = isProgramLive(prog);
            const [endH, endM, endS] = prog.endTime.split(':').map(Number);
            const endTimeVal = endH * 3600 + endM * 60 + (endS || 0);
            const currentTimeVal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const isPast = (selectedDate === todayStr && currentTimeVal >= endTimeVal);
            
            if (isPast || isLive) {
                const [h, m, s] = prog.endTime.split(':').map(Number);
                const d = new Date(prog.date);
                d.setHours(h, m, s || 0, 0);
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
            
            const format = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
            
            const updatedProg = {
                ...prog,
                startTime: format(newStartTime),
                endTime: format(newEndTime),
            };
            
            anchorTime = newEndTime;
            return updatedProg;
        });

        // Optimistic state merge
        const updatedChannelPrograms = channelPrograms.map(p => {
            const updated = updatedDayPrograms.find(up => up.id === p.id);
            return updated || p;
        });
        setChannelPrograms(updatedChannelPrograms);

        // Trigger API
        const changedItems = updatedDayPrograms.filter(p => {
             const isLive = isProgramLive(p);
             const [endH, endM, endS] = p.endTime.split(':').map(Number);
             const endTimeVal = endH * 3600 + endM * 60 + (endS || 0);
             const currentTimeVal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
             const isPast = (selectedDate === todayStr && currentTimeVal >= endTimeVal);
             return !isLive && !isPast;
        });
        
        if (changedItems.length > 0) {
             const firstChanged = changedItems[0];
             const [h, m, s] = firstChanged.startTime.split(':').map(Number);
             const d = new Date(firstChanged.date);
             d.setHours(h, m, s || 0, 0);
             await reorderPrograms(changedItems, d.toISOString());
        }

        // We fetch the fresh channel programs from the server to ensure consistency.
        await loadChannelPrograms(selectedChannelId, selectedDate);
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
                    onArchiveClick={() => setIsArchiveModalOpen(true)}
                    selectedChannelName={channels.find(c => c.id === selectedChannelId)?.name}
                />

                {/* Video Input */}
                {!isPastDate && (
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
                )}
            </div>

            {/* Day Stats (Hero) */}
            <DayStats 
                selectedDate={selectedDate} 
                totalDurationSeconds={totalDurationSeconds}
                currentProgram={currentLiveProgram || undefined}
                channelSlug={selectedChannelId}
            />

            {/* Main Content Area */}
            <div className="p-4 md:p-8">
                {isPastDate && (
                    <div className="bg-[#FFFF00] text-black font-bold p-3 mb-4 text-center border-4 border-black uppercase text-sm md:text-base">
                        ⚠️ Arşiv Görünümündesiniz. Ekleme, silme ve taşıma işlemleri yapılamaz. Yalnızca başka bir güne kopyalama yapabilirsiniz.
                    </div>
                )}
                <ProgramList 
                    programs={displayedPrograms}
                    selectedDate={selectedDate}
                    onReorder={handleReorder}
                    onDelete={handleDeleteProgram}
                    onEdit={setEditingProgram}
                    selectedIds={selectedProgramIds}
                    onToggleSelect={(id) => setSelectedProgramIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onBulkDelete={handleBulkDelete}
                    onRefresh={() => loadChannelPrograms(selectedChannelId, selectedDate)}
                    liveProgramId={currentLiveProgram?.id}
                    isArchive={isPastDate}
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

                {!isPastDate && (
                    <button 
                        onClick={handleMoveSelected}
                        disabled={isMoving || isCopying}
                        className={`bg-[#2546ff] text-[#f2911d] px-6 py-3 font-bold transition-opacity flex items-center gap-2 cursor-pointer ${isMoving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                    >
                        {isMoving ? 'Taşınıyor...' : `Taşı (${selectedProgramIds.length})`}
                    </button>
                )}

                <button 
                    onClick={handleCopySelected}
                    disabled={isMoving || isCopying}
                    className={`bg-[#2546ff] text-[#f2911d] px-6 py-3 font-bold transition-opacity flex items-center gap-2 cursor-pointer ${isCopying ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                >
                    {isCopying ? 'Kopyalanıyor...' : `Kopyala (${selectedProgramIds.length})`}
                </button>

                <button 
                    onClick={handleDownloadSchedule}
                    className="bg-[#ffce2e] text-[#000000] px-6 py-3 font-bold hover:opacity-80 transition-opacity cursor-pointer"
                >
                    Akışı indir
                </button>

                {!isPastDate && (
                    <button 
                        onClick={handleBulkDelete}
                        className="bg-[#ff6200] text-[#FFFFFF] px-6 py-3 font-bold hover:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer"
                    >
                        Seçilenleri sil ({selectedProgramIds.length})
                    </button>
                )}
                
                {/* Clear Selection */}
                <button 
                    onClick={() => setSelectedProgramIds([])}
                    className="absolute top-2 right-4 text-white hover:text-black transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Modals */}
            <ArchiveModal 
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                onSelectDate={(date) => {
                    setSelectedDate(date);
                    setIsArchiveModalOpen(false);
                }}
            />

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