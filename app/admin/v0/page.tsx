'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Loader2, Play, Clock, FileText, Plus, Trash2, RefreshCw, 
    Edit2, X, Check, CheckSquare, Square, Sun, CloudSun, Sunset, Moon, 
    Calendar, ChevronDown, ChevronRight, Signal, GripVertical 
} from 'lucide-react';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors, 
    DragOverlay, 
    defaultDropAnimationSideEffects, 
    DropAnimation,
    useDroppable,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy, 
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { fetchVideoDetails, YouTubeVideoDetails } from '../../../lib/youtube';
import { 
    getChannels, getLastProgram, addProgram, getProgramsForChannel, 
    deleteProgram, deletePrograms, updateProgram, reorderPrograms 
} from '../../../lib/api';
import { Channel, Program } from '../../../data/mockData';

// --- Components ---

// Sortable Item Component
interface SortableItemProps {
    program: Program;
    isLight: boolean;
    isLive: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onEdit: (p: Program) => void;
    onDelete: (id: string) => void;
}

function SortableProgramItem({ 
    program, isLight, isLive, isSelected, onToggleSelect, onEdit, onDelete 
}: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ 
        id: program.id,
        disabled: isLive // Disable dragging for live items
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as 'relative', // Fix type
    };

    return (
        <div ref={setNodeRef} style={style} className={`p-4 flex items-center transition-colors group border-b 
            ${isLive 
                ? 'bg-green-500/10 border-green-500/20' 
                : isLight ? 'border-black/5 hover:bg-black/5' : 'border-white/5 hover:bg-white/5'
            }
        `}>
            {/* Drag Handle */}
            {!isLive && (
                <div {...attributes} {...listeners} className="mr-3 cursor-grab active:cursor-grabbing text-gray-500 hover:text-white">
                    <GripVertical size={20} />
                </div>
            )}
            {isLive && <div className="w-8" />} {/* Spacer for alignment */}

            <div className="mr-4 flex items-center">
                <button 
                    onClick={() => onToggleSelect(program.id)}
                    className={`${isLive ? 'text-green-500' : isLight ? 'text-gray-400 hover:text-black' : 'text-gray-500 hover:text-white'} transition-colors`}
                >
                    {isSelected ? (
                        <CheckSquare size={20} className="text-primary" />
                    ) : (
                        <Square size={20} />
                    )}
                </button>
            </div>

            <div className="w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-800 mr-4 relative shadow-sm">
                {program.thumbnail && (
                    <img src={program.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                {isLive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Signal size={16} className="text-green-400 animate-pulse" />
                    </div>
                )}
            </div>
            
            <div className="flex-grow min-w-0 mr-4">
                <h4 className={`font-bold truncate ${isLive ? 'text-green-400' : 'text-gray-100'}`}>
                    {program.title}
                    {isLive && <span className="ml-2 text-[10px] uppercase bg-green-500 text-black px-1.5 py-0.5 rounded font-bold">CANLI</span>}
                </h4>
                <div className={`flex items-center text-xs mt-1 space-x-2 ${isLive ? 'text-green-300/70' : 'text-gray-400'}`}>
                    <span className="font-mono font-semibold">{program.startTime} - {program.endTime}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onEdit(program)}
                    className={`p-2 rounded-lg transition-colors ${isLight ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'}`}
                    title="Düzenle"
                >
                    <Edit2 size={18} />
                </button>
                <button 
                    onClick={() => onDelete(program.id)}
                    className={`p-2 rounded-lg transition-colors ${isLight ? 'text-gray-500 hover:text-red-600 hover:bg-red-100' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
                    title="Sil"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}

// Droppable Header Component
interface GroupHeaderProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    count: number;
    colors: { bg: string, text: string, border: string };
    onToggle: () => void;
}

function GroupHeader({ id, title, icon, isOpen, count, colors, onToggle }: GroupHeaderProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <button 
            ref={setNodeRef}
            onClick={onToggle}
            className={`w-full px-4 py-3 flex items-center justify-between font-bold text-sm transition-colors ${colors.bg} ${colors.text} ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
        >
            <div className="flex items-center">
                {icon}
                <span className="ml-2">{title}</span>
                <span className="ml-2 opacity-60 text-xs">({count})</span>
            </div>
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
    );
}


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

  // Drag & Drop State
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  // --- Grouping Logic (Memoized) ---
  const groupedPrograms = useMemo(() => {
      if (!selectedDate) return null;
      
      const filtered = channelPrograms.filter(p => p.date === selectedDate);
      
      const groups = {
          night: [] as Program[],     // 00:00 - 05:59
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

      // Sort within groups
      const sortByTime = (a: Program, b: Program) => a.startTime.localeCompare(b.startTime);
      groups.night.sort(sortByTime);
      groups.morning.sort(sortByTime);
      groups.afternoon.sort(sortByTime);
      groups.evening.sort(sortByTime);

      return groups;
  }, [channelPrograms, selectedDate]);

  // Sortable Items List (Flat list of FUTURE/SORTABLE items)
  // We need this for SortableContext.
  // We exclude Past and Live items from being sortable.
  const sortableItems = useMemo(() => {
      if (!selectedDate) return [];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      return channelPrograms.filter(p => {
          // Only items on selected date are visible
          if (p.date !== selectedDate) return false;
          
          // If viewing today, exclude past and live items
          if (selectedDate === todayStr) {
            if (isProgramLive(p)) return false; // Live items are not sortable (static)
            
            // Check if Past
            const [endH, endM] = p.endTime.split(':').map(Number);
            const endTime = endH * 60 + endM;
            const currentTime = now.getHours() * 60 + now.getMinutes();
            if (currentTime >= endTime) return false; // Past item
          }
          
          return true; // Future items or items on future dates
      });
  }, [channelPrograms, selectedDate]);
  
  const sortableItemIds = useMemo(() => sortableItems.map(p => p.id), [sortableItems]);

  // Determine current active group and auto-expand it
  useEffect(() => {
      if (!groupedPrograms) return;

      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      
      // Only auto-expand if we are viewing "Today" and haven't manually interacted yet?
      // Actually, just expand current time slot on load/date change
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

          // Merge with existing state so we don't close user-opened ones? 
          // For now, just setting it is cleaner.
          setOpenGroups(prev => ({ ...prev, ...newOpenState }));
      } else {
          setOpenGroups(prev => ({ ...prev, morning: true }));
      }
  }, [selectedDate]); // Removed groupedPrograms from dependency to avoid loop

  const toggleGroup = (group: keyof typeof openGroups) => {
      setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  function isProgramLive(prog: Program) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (prog.date !== todayStr) return false;

      const [startH, startM] = prog.startTime.split(':').map(Number);
      const [endH, endM] = prog.endTime.split(':').map(Number);
      
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;
      const currentTime = now.getHours() * 60 + now.getMinutes();

      return currentTime >= startTime && currentTime < endTime;
  }
  
  // --- Drag & Drop Handlers ---
  
  const handleDragStart = (event: DragStartEvent) => {
      setActiveId(event.active.id as string);
  };
  
  const handleDragOver = (event: DragOverEvent) => {
      const { over } = event;
      if (!over) return;
      
      // Auto-Expand Logic
      const overId = over.id as string;
      if (overId.startsWith('group-')) {
          const groupName = overId.replace('group-', '') as keyof typeof openGroups;
          if (!openGroups[groupName]) {
              setOpenGroups(prev => ({ ...prev, [groupName]: true }));
          }
      }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      
      if (!over || active.id === over.id) return;
      
      // Reorder Logic
      setChannelPrograms((items) => {
          const oldIndex = items.findIndex(p => p.id === active.id);
          const newIndex = items.findIndex(p => p.id === over.id);
          
          if (oldIndex === -1 || newIndex === -1) return items;
          
          const newItems = arrayMove(items, oldIndex, newIndex);
          
          // --- Daisy Chain Logic ---
          // Updated: Isolate logic to the Selected Day
          
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          
          // 1. Get programs for the selected date only
          const dayPrograms = newItems.filter(p => p.date === selectedDate);
          
          // 2. Identify the anchor (Start of day OR End of last fixed item)
          let anchorTime: Date | null = null;
          
          const updatedDayPrograms = dayPrograms.map((prog) => {
              // Helper to check past/live
              const isLive = isProgramLive(prog);
              const [endH, endM] = prog.endTime.split(':').map(Number);
              const endTimeVal = endH * 60 + endM;
              const currentTimeVal = now.getHours() * 60 + now.getMinutes();
              // Check if Past (Only relevant if selectedDate is Today)
              const isPast = (selectedDate === todayStr && currentTimeVal >= endTimeVal);
              
              if (isPast || isLive) {
                  // Fixed item. Update anchor.
                  const [h, m] = prog.endTime.split(':').map(Number);
                  const d = new Date(prog.date);
                  d.setHours(h, m, 0, 0);
                  anchorTime = d;
                  return prog;
              }
              
              // If no anchor yet (Start of day), set to 00:00
              if (!anchorTime) {
                   const d = new Date(prog.date);
                   d.setHours(0, 0, 0, 0);
                   anchorTime = d;
              }
              
              // Future item: Recalculate
              const durationMs = prog.duration * 1000;
              const newStartTime = new Date(anchorTime);
              const newEndTime = new Date(anchorTime.getTime() + durationMs);
              
              // Format HH:mm
              const format = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
              
              const updatedProg = {
                  ...prog,
                  startTime: format(newStartTime),
                  endTime: format(newEndTime),
                  // Keep date same to ensure it stays in the list
              };
              
              anchorTime = newEndTime;
              return updatedProg;
          });

          // 3. Merge back into main list
          const finalItems = newItems.map(p => {
              const updated = updatedDayPrograms.find(up => up.id === p.id);
              return updated || p;
          });
          
          // 4. Trigger API update for changed items
          const changedItems = updatedDayPrograms.filter(p => {
             // We only update Future items (not live/past)
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
          
          return finalItems;
      });
  };

  // --- Filler Video Logic ---
  const handleAddFiller = async () => {
      if (!selectedChannelId || !selectedDate) return;
      
      const fillerVideoId = "ILzo07ipH40"; // 10 Hour Timer
      // Note: We will calculate duration dynamically
      
      try {
          setAdding(true);
          
          // 1. Find the last program of the SELECTED day
          const dayPrograms = channelPrograms.filter(p => p.date === selectedDate);
          
          // Sort by time
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
              // Day is empty, start at 00:00
              startTime.setHours(0, 0, 0, 0);
          }
          
          // Calculate End of Day (23:59:59)
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);
          
          // Calculate remaining duration
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
              duration: remainingSeconds, // Trimmed Duration
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              thumbnail: "https://img.youtube.com/vi/ILzo07ipH40/hqdefault.jpg"
          });
          
          await loadChannelPrograms(selectedChannelId);
          setToast({ message: 'Dolgu videosu eklendi.', type: 'success' });
          
      } catch (err) {
          console.error(err);
          setToast({ message: 'Hata oluştu.', type: 'error' });
      } finally {
          setAdding(false);
      }
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
          // 1. Calculate Start Time based on SELECTED DATE
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);

          // Filter programs for the selected date from the existing state
          const dayPrograms = channelPrograms.filter(p => p.date === selectedDate);
          dayPrograms.sort((a, b) => a.startTime.localeCompare(b.startTime));

          const lastProg = dayPrograms[dayPrograms.length - 1];

          let startTime = new Date(startOfDay);
          let shouldLoop = false;

          if (lastProg) {
              const [h, m] = lastProg.endTime.split(':').map(Number);
              startTime.setHours(h, m, 0, 0);
              
              // If last program ends after 23:59 (e.g. 24:00 or 00:00 next day)
              // In our 24h view logic, we probably shouldn't be here, but let's handle it.
          } else {
              // Day is empty, start at 00:00
              startTime = new Date(startOfDay);
          }
          
          // Check if we are trying to add to a full day
          if (startTime > endOfDay) {
               setToast({ message: 'Gün zaten dolu!', type: 'error' });
               setAdding(false);
               return;
          }

          const programsToAdd = [];
          
          // Logic for looping is complex in 24h view. 
          // If we want to loop until 23:59? Or just add once?
          // Previous logic was looping based on "getLastProgram" which was confusing.
          // Let's assume standard behavior: Add 1 video.
          // If the user wants to loop, we might need a UI toggle. 
          // For now, let's keep it simple: Add 1 video unless it's very short?
          // The previous code had `shouldLoop` logic if `timeDiff > oneHour`.
          // But now we are strictly adding to the END of the schedule.
          // So `shouldLoop` logic is probably not relevant or should be explicit.
          // Let's removing auto-looping for now to be safe and predictable.
          
          const durationMs = video.duration * 1000;
          const endTime = new Date(startTime.getTime() + durationMs);
          
          // Overflow Warning
          if (endTime > endOfDay) {
              if (!confirm('Bu video gün sonunu (23:59) aşıyor. Yine de eklemek istiyor musunuz?')) {
                 setAdding(false);
                 return;
              }
          }

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

          for (const prog of programsToAdd) {
              await addProgram(prog);
          }

          setUrl('');
          setVideo(null);
          await loadChannelPrograms(selectedChannelId);
          // Don't reset selectedDate, keep user on same day
          // setSelectedDate(new Date().toISOString().split('T')[0]);
          
          setToast({
            message: 'Video başarıyla eklendi!',
            type: 'success'
          });

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
          setToast({ message: 'Program silindi.', type: 'success' });
      } catch (err) {
          console.error(err);
          setToast({ message: 'Silme işlemi başarısız oldu.', type: 'error' });
      }
  };

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
          setToast({ message: 'Seçilen programlar silindi.', type: 'success' });
      } catch (err) {
          console.error(err);
          setToast({ message: 'Toplu silme işlemi başarısız oldu.', type: 'error' });
      }
  };

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
          setToast({ message: 'Program güncellendi.', type: 'success' });
      } catch (err) {
          console.error(err);
          setToast({ message: 'Güncelleme başarısız oldu.', type: 'error' });
      } finally {
          setSaving(false);
      }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}s ${m}dk ${s}sn` : `${m}dk ${s}sn`;
  };
  
  // Helper to render items within a group
  const renderGroupContent = (programs: Program[], isLight: boolean) => {
      return programs.map(p => {
          // If the item is sortable (Future), render SortableItem
          // If not (Past/Live), render Static Item
          // We can just use SortableItem for all, and pass disabled={true} for Past/Live
          // But useSortable disabled logic handles it.
          // Wait, 'SortableProgramItem' uses 'useSortable' hook.
          // If we are NOT in SortableContext (because id is not in items), useSortable returns null/undefined?
          // No, it might crash or return defaults.
          
          // Check if this item is in our sortableItems list
          const isSortable = sortableItemIds.includes(p.id);
          const isLive = isProgramLive(p);
          
          if (isSortable) {
              return (
                  <SortableProgramItem
                      key={p.id}
                      program={p}
                      isLight={isLight}
                      isLive={isLive}
                      isSelected={selectedProgramIds.includes(p.id)}
                      onToggleSelect={toggleSelectProgram}
                      onEdit={openEditModal}
                      onDelete={handleDeleteProgram}
                  />
              );
          } else {
              // Static Item (Past/Live)
              return (
                  <div key={p.id} className={`p-4 flex items-center transition-colors group border-b opacity-70 grayscale-[0.5]
                      ${isLive 
                          ? 'bg-green-500/10 border-green-500/20 opacity-100 grayscale-0' 
                          : isLight ? 'border-black/5' : 'border-white/5'
                      }
                  `}>
                      {/* Spacer instead of Drag Handle */}
                      <div className="w-8 mr-3" />
                      
                      <div className="mr-4 flex items-center">
                        <button disabled className="text-gray-600 cursor-not-allowed">
                            <Square size={20} />
                        </button>
                      </div>

                      <div className="w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-800 mr-4 relative shadow-sm">
                          {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />}
                          {isLive && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Signal size={16} className="text-green-400 animate-pulse" />
                              </div>
                          )}
                      </div>
                      
                      <div className="flex-grow min-w-0 mr-4">
                          <h4 className={`font-bold truncate ${isLive ? 'text-green-400' : 'text-gray-100'}`}>
                              {p.title}
                              {isLive && <span className="ml-2 text-[10px] uppercase bg-green-500 text-black px-1.5 py-0.5 rounded font-bold">CANLI</span>}
                          </h4>
                          <div className={`flex items-center text-xs mt-1 space-x-2 ${isLive ? 'text-green-300/70' : 'text-gray-400'}`}>
                              <span className="font-mono font-semibold">{p.startTime} - {p.endTime}</span>
                          </div>
                      </div>
                      
                      {/* Actions (Disabled for Past?) or Allowed? Allowed for now */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDeleteProgram(p.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
                      </div>
                  </div>
              );
          }
      });
  };

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
            {loading ? <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />Getiriliyor...</> : 'Bilgileri Getir'}
          </button>
        </div>

        {error && <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>}

        {/* Preview Card */}
        {video && (
          <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="md:flex">
              <div className="md:w-1/3 relative group">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover aspect-video md:aspect-auto" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white fill-white" />
                </div>
              </div>
              <div className="p-6 md:w-2/3 space-y-4 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl font-bold text-white leading-tight">{video.title}</h2>
                        <span className="flex items-center text-xs font-mono bg-white/10 text-gray-300 px-2 py-1 rounded">ID: {video.videoId}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                        <div className="flex items-center"><Clock className="w-4 h-4 mr-1.5" />{formatDuration(video.duration)}</div>
                    </div>
                    <div className="relative mt-4">
                        <div className="flex items-center mb-2 text-sm font-medium text-gray-300"><FileText className="w-4 h-4 mr-1.5" />Açıklama</div>
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{video.description}</p>
                    </div>
                </div>
                <button
                    onClick={handleAddProgram}
                    disabled={adding}
                    className="w-full mt-4 flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-lg text-black bg-white hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {adding ? <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />Ekleniyor...</> : <><Plus className="w-5 h-5 mr-2" />Yayına Ekle</>}
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
                        <button onClick={handleBulkDelete} className="flex items-center px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
                            <Trash2 size={16} className="mr-2" />Seçilenleri Sil ({selectedProgramIds.length})
                        </button>
                    )}
                </div>
                <button onClick={() => loadChannelPrograms(selectedChannelId)} className={`p-2 rounded-full hover:bg-white/5 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
                    <RefreshCw size={20} className="text-gray-400" />
                </button>
                <button 
                    onClick={handleAddFiller}
                    disabled={adding}
                    className="ml-2 flex items-center px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors"
                    title="Günün geri kalanını doldur"
                >
                    <Clock size={16} className="mr-2" />
                    Dolgu Ekle
                </button>
            </div>

            {/* Date Tabs */}
            <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar">
                {dateTabs.map(tab => (
                    <button
                        key={tab.date}
                        onClick={() => setSelectedDate(tab.date)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                            selectedDate === tab.date ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <Calendar size={14} className="mr-2" />{tab.label}
                    </button>
                ))}
            </div>

            {/* Drag & Drop Context */}
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={sortableItemIds} 
                    strategy={verticalListSortingStrategy}
                >
                    {/* Grouped Lists */}
                    {groupedPrograms ? (
                        <div className="space-y-6">
                            {/* Night (First) */}
                            {groupedPrograms.night.length > 0 && (
                                <div className="rounded-xl overflow-hidden bg-purple-950/50 border border-purple-900/50">
                                    <GroupHeader 
                                        id="group-night"
                                        title="GECE KUŞAĞI (00:00 - 05:59)"
                                        icon={<Moon size={16} />}
                                        isOpen={openGroups.night}
                                        count={groupedPrograms.night.length}
                                        colors={{ bg: 'bg-purple-900/80', text: 'text-purple-100', border: '' }}
                                        onToggle={() => toggleGroup('night')}
                                    />
                                    {openGroups.night && (
                                        <div className="divide-y divide-purple-900/30 animate-in slide-in-from-top-2 duration-200">
                                            {renderGroupContent(groupedPrograms.night, false)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Morning */}
                            {groupedPrograms.morning.length > 0 && (
                                <div className="rounded-xl overflow-hidden bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                                    <GroupHeader 
                                        id="group-morning"
                                        title="SABAH KUŞAĞI (06:00 - 11:59)"
                                        icon={<Sun size={16} />}
                                        isOpen={openGroups.morning}
                                        count={groupedPrograms.morning.length}
                                        colors={{ bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-900 dark:text-amber-100', border: '' }}
                                        onToggle={() => toggleGroup('morning')}
                                    />
                                    {openGroups.morning && (
                                        <div className="divide-y divide-amber-200/50 dark:divide-amber-900/30 animate-in slide-in-from-top-2 duration-200">
                                            {renderGroupContent(groupedPrograms.morning, true)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Afternoon */}
                            {groupedPrograms.afternoon.length > 0 && (
                                <div className="rounded-xl overflow-hidden bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50">
                                    <GroupHeader 
                                        id="group-afternoon"
                                        title="ÖĞLE KUŞAĞI (12:00 - 17:59)"
                                        icon={<CloudSun size={16} />}
                                        isOpen={openGroups.afternoon}
                                        count={groupedPrograms.afternoon.length}
                                        colors={{ bg: 'bg-sky-100 dark:bg-sky-900/50', text: 'text-sky-900 dark:text-sky-100', border: '' }}
                                        onToggle={() => toggleGroup('afternoon')}
                                    />
                                    {openGroups.afternoon && (
                                        <div className="divide-y divide-sky-200/50 dark:divide-sky-900/30 animate-in slide-in-from-top-2 duration-200">
                                            {renderGroupContent(groupedPrograms.afternoon, true)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Evening */}
                            {groupedPrograms.evening.length > 0 && (
                                <div className="rounded-xl overflow-hidden bg-indigo-950/50 border border-indigo-900/50">
                                    <GroupHeader 
                                        id="group-evening"
                                        title="AKŞAM KUŞAĞI (18:00 - 23:59)"
                                        icon={<Sunset size={16} />}
                                        isOpen={openGroups.evening}
                                        count={groupedPrograms.evening.length}
                                        colors={{ bg: 'bg-indigo-900/80', text: 'text-indigo-100', border: '' }}
                                        onToggle={() => toggleGroup('evening')}
                                    />
                                    {openGroups.evening && (
                                        <div className="divide-y divide-indigo-900/30 animate-in slide-in-from-top-2 duration-200">
                                            {renderGroupContent(groupedPrograms.evening, false)}
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
                        <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                    )}
                </SortableContext>

                {/* Drag Overlay (Optional but good for UX) */}
                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeId ? (
                        <div className="p-4 bg-gray-800 rounded shadow-2xl border border-white/10 opacity-90 flex items-center">
                            <GripVertical size={20} className="mr-3 text-gray-400" />
                            <div className="w-16 h-10 rounded overflow-hidden bg-black mr-4">
                                {/* Thumbnail placeholder */}
                            </div>
                            <span className="font-bold text-white">Taşınıyor...</span>
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>
        </div>

        {/* Edit Modal */}
        {editingProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold">Program Düzenle</h3>
                        <button onClick={() => setEditingProgram(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
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
                        <button onClick={() => setEditingProgram(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">İptal</button>
                        <button onClick={handleUpdateProgram} disabled={saving} className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-200 transition-colors disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />} Kaydet
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Toast Notification */}
        {toast && (
            <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-300 ${
                toast.type === 'success' 
                    ? 'bg-green-500/20 border border-green-500/20 text-green-100' 
                    : 'bg-red-500/20 border border-red-500/20 text-red-100'
            }`}>
                {toast.type === 'success' ? <Check className="text-green-400" /> : <X className="text-red-400" />}
                <span className="font-medium">{toast.message}</span>
            </div>
        )}

      </div>
    </div>
  );
}
