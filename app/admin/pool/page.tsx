'use client';

import React, { useState, useEffect } from 'react';
import { getPoolItems, addToPool, addMultipleToPool, importPoolJSON, deleteFromPool, updatePoolItem, PoolItem } from '../../../lib/api';
import { fetchVideoDetails, fetchPlaylistVideos, YouTubeVideoDetails } from '../../../lib/youtube';
import { Search, Loader2, Zap, Trash2, Plus, Edit2, X, Save, Download, Upload } from 'lucide-react';

interface DraftItem extends YouTubeVideoDetails {
    category: string;
    energyLevel: number;
    era: string;
    vocalType: string;
    analyzed: boolean;
    status: 'pending' | 'analyzing' | 'done' | 'error';
}

export default function PoolAdminPage() {
    const [urls, setUrls] = useState('');
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [poolItems, setPoolItems] = useState<PoolItem[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Sorting State
    type SortField = 'created_at' | 'title' | 'creator' | 'category' | 'era' | 'vocal_type' | 'energy_level';
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Edit State
    const [editingItem, setEditingItem] = useState<PoolItem | null>(null);
    const [editForm, setEditForm] = useState<{ category: string; era: string; vocalType: string; energyLevel: number }>({
        category: '', era: '', vocalType: '', energyLevel: 5
    });

    useEffect(() => {
        loadPool();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    const loadPool = async () => {
        const items = await getPoolItems();
        setPoolItems(items);
    };

    const sortedPoolItems = [...poolItems].sort((a, b) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        
        if (sortField === 'energy_level') {
            const numA = Number(valA);
            const numB = Number(valB);
            return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        
        return sortDirection === 'asc' 
            ? strA.localeCompare(strB) 
            : strB.localeCompare(strA);
    });

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(poolItems, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `tvgibi_muzik_havuzu_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!Array.isArray(json)) throw new Error("Invalid format");
                
                const itemsToInsert = json.map(item => ({
                    video_id: item.video_id,
                    title: item.title,
                    creator: item.creator || 'Unknown',
                    duration: item.duration,
                    category: item.category,
                    energy_level: item.energy_level || 5,
                    era: item.era || null,
                    vocal_type: item.vocal_type || null
                }));

                await importPoolJSON(itemsToInsert);
                setToast({ message: `${itemsToInsert.length} içerik başarıyla içe aktarıldı!`, type: 'success' });
                loadPool();
            } catch (err) {
                console.error("Import error:", err);
                setToast({ message: 'JSON dosyası okunamadı veya hatalı.', type: 'error' });
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleFetchAndAnalyze = async () => {
        if (!urls.trim()) return;
        
        setLoading(true);
        setDrafts([]);
        
        const lines = urls.split('\n').map(l => l.trim()).filter(Boolean);
        let fetchedVideos: YouTubeVideoDetails[] = [];

        try {
            for (const line of lines) {
                if (line.includes('list=')) {
                    // It's a playlist
                    const plVideos = await fetchPlaylistVideos(line);
                    fetchedVideos = [...fetchedVideos, ...plVideos];
                } else {
                    // Single video
                    const details = await fetchVideoDetails(line);
                    if (details) fetchedVideos.push(details);
                }
            }

            if (fetchedVideos.length === 0) {
                setToast({ message: 'Video bulunamadı.', type: 'error' });
                setLoading(false);
                return;
            }

            // Initialize drafts
            const initialDrafts: DraftItem[] = fetchedVideos.map(v => ({
                ...v,
                category: '',
                energyLevel: 5,
                era: '',
                vocalType: '',
                analyzed: false,
                status: 'pending'
            }));
            
            setDrafts(initialDrafts);
            setLoading(false);
            setUrls('');

            // Start AI Analysis queue
            setAnalyzing(true);
            for (let i = 0; i < initialDrafts.length; i++) {
                setDrafts(prev => prev.map((d, idx) => i === idx ? { ...d, status: 'analyzing' } : d));
                
                try {
                    const aiRes = await fetch('/api/pool-analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: initialDrafts[i].title, creator: initialDrafts[i].creator })
                    });

                    if (aiRes.ok) {
                        const data = await aiRes.json();
                        setDrafts(prev => prev.map((d, idx) => i === idx ? { 
                            ...d, 
                            category: data.category || '',
                            energyLevel: data.energy_level || 5,
                            era: data.era || '',
                            vocalType: data.vocal_type || '',
                            analyzed: true,
                            status: 'done'
                        } : d));
                    } else {
                        setDrafts(prev => prev.map((d, idx) => i === idx ? { ...d, status: 'error' } : d));
                    }
                } catch (err) {
                    setDrafts(prev => prev.map((d, idx) => i === idx ? { ...d, status: 'error' } : d));
                }
                
                // Small delay to prevent rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            setAnalyzing(false);
            setToast({ message: 'Tüm analizler tamamlandı!', type: 'success' });

        } catch (err) {
            console.error(err);
            setToast({ message: 'Sistem hatası.', type: 'error' });
            setLoading(false);
            setAnalyzing(false);
        }
    };

    const handleAddAllToPool = async () => {
        const readyDrafts = drafts.filter(d => d.analyzed && d.category);
        if (readyDrafts.length === 0) return;
        
        try {
            const itemsToInsert = readyDrafts.map(d => ({
                video_id: d.videoId,
                title: d.title,
                creator: d.creator || 'Unknown',
                duration: d.duration,
                category: d.category,
                energy_level: d.energyLevel,
                era: d.era || null,
                vocal_type: d.vocalType || null
            }));

            await addMultipleToPool(itemsToInsert);
            setToast({ message: `${readyDrafts.length} içerik havuza eklendi!`, type: 'success' });
            setDrafts([]);
            loadPool();
        } catch (err) {
            console.error('Error adding multiple to pool:', err);
            setToast({ message: 'Eklenirken hata oluştu.', type: 'error' });
        }
    };

    const handleDraftChange = (index: number, field: keyof DraftItem, value: string | number | boolean) => {
        setDrafts(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    };

    const removeDraft = (index: number) => {
        setDrafts(prev => prev.filter((_, i) => i !== index));
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu içeriği havuzdan silmek istediğine emin misin?')) return;
        try {
            await deleteFromPool(id);
            setToast({ message: 'Havuzdan silindi.', type: 'success' });
            loadPool();
        } catch (err) {
            console.error('Error deleting from pool:', err);
            setToast({ message: 'Silinemedi.', type: 'error' });
        }
    };

    const handleEditClick = (item: PoolItem) => {
        setEditingItem(item);
        setEditForm({
            category: item.category || '',
            era: item.era || '',
            vocalType: item.vocal_type || '',
            energyLevel: item.energy_level || 5
        });
    };

    const handleUpdateItem = async () => {
        if (!editingItem) return;
        
        try {
            await updatePoolItem(editingItem.id, {
                category: editForm.category,
                era: editForm.era || null,
                vocal_type: editForm.vocalType || null,
                energy_level: editForm.energyLevel
            });
            
            setToast({ message: 'İçerik güncellendi!', type: 'success' });
            setEditingItem(null);
            loadPool();
        } catch (err) {
            console.error('Error updating pool item:', err);
            setToast({ message: 'Güncellenirken hata oluştu.', type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-black text-[#E0E0E0] font-mono selection:bg-[#00FF4F] selection:text-black pb-24">
            <header className="bg-[#00FF00] p-4 flex items-center justify-between border-b-4 border-black">
                <div className="flex space-x-2 overflow-x-auto no-scrollbar">
                    <h1 className="font-mono font-black text-2xl tracking-tighter text-black">
                        MÜZİK HAVUZU (SMART POOL)
                    </h1>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 mt-8">
                
                {/* AI Import Section */}
                <div className="bg-[#111] border-4 border-[#00FF4F] p-6 mb-12 relative shadow-[8px_8px_0px_0px_#00FF4F]">
                    <div className="absolute -top-4 left-4 bg-black border-4 border-[#00FF4F] px-4 py-1 text-[#00FF4F] font-bold tracking-widest uppercase">
                        AI_YÜKLEME_MODÜLÜ
                    </div>
                    
                    <div className="flex flex-col gap-4 mt-4">
                        <textarea
                            placeholder="YouTube URL yapıştır... (Alt alta birden fazla link veya bir Playlist linki ekleyebilirsin)"
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            rows={4}
                            className="w-full bg-black border-2 border-white p-3 text-white focus:outline-none focus:border-[#00FF4F] font-mono text-sm"
                        />
                        <button
                            onClick={handleFetchAndAnalyze}
                            disabled={loading || analyzing}
                            className="bg-[#00FF4F] text-black border-2 border-[#00FF4F] py-4 font-bold hover:bg-black hover:text-[#00FF4F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Search />}
                            {analyzing ? 'YAPAY ZEKA ANALİZ EDİYOR...' : 'GETİR & ANALİZ ET'}
                        </button>
                    </div>

                    {drafts.length > 0 && (
                        <div className="mt-8 border-t-2 border-dashed border-gray-700 pt-6">
                            <h3 className="text-xl font-bold text-white mb-4">TASLAKLAR ({drafts.length})</h3>
                            <div className="flex flex-col gap-6">
                                {drafts.map((draft, index) => (
                                    <div key={index} className={`flex flex-col md:flex-row gap-6 p-4 border-2 ${draft.status === 'error' ? 'border-red-500' : 'border-gray-700'} relative`}>
                                        <button 
                                            onClick={() => removeDraft(index)}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10"
                                        >
                                            <X size={16} />
                                        </button>
                                        
                                        <div className="w-full md:w-1/4">
                                            <div className="aspect-video bg-black border-2 border-white relative">
                                                <img src={draft.thumbnail} alt="thumb" className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute bottom-2 right-2 bg-black border border-white text-xs px-2 py-1 text-[#00FF4F]">
                                                    {Math.floor(draft.duration / 60)}:{(draft.duration % 60).toString().padStart(2, '0')}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col gap-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-white line-clamp-1">{draft.title}</h4>
                                                <p className="text-gray-400 text-xs">{draft.creator}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="block text-[10px] text-[#00FF4F] mb-1">KATEGORİ</label>
                                                    <input 
                                                        type="text" 
                                                        value={draft.category}
                                                        onChange={(e) => handleDraftChange(index, 'category', e.target.value)}
                                                        className="w-full bg-black border border-gray-600 p-1.5 text-white font-bold text-sm"
                                                        disabled={draft.status === 'analyzing'}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-[#00FF4F] mb-1">DÖNEM (ERA)</label>
                                                    <input 
                                                        type="text" 
                                                        value={draft.era}
                                                        onChange={(e) => handleDraftChange(index, 'era', e.target.value)}
                                                        className="w-full bg-black border border-gray-600 p-1.5 text-white font-bold text-sm"
                                                        disabled={draft.status === 'analyzing'}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-[#00FF4F] mb-1">VOKAL</label>
                                                    <input 
                                                        type="text" 
                                                        value={draft.vocalType}
                                                        onChange={(e) => handleDraftChange(index, 'vocalType', e.target.value)}
                                                        className="w-full bg-black border border-gray-600 p-1.5 text-white font-bold text-sm"
                                                        disabled={draft.status === 'analyzing'}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-[#00FF4F] mb-1">ENERJİ</label>
                                                    <input 
                                                        type="number" 
                                                        min="1" max="10"
                                                        value={draft.energyLevel}
                                                        onChange={(e) => handleDraftChange(index, 'energyLevel', Number(e.target.value))}
                                                        className="w-full bg-black border border-gray-600 p-1.5 text-white font-bold text-sm"
                                                        disabled={draft.status === 'analyzing'}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-auto flex justify-between items-center">
                                                {draft.status === 'analyzing' && <span className="text-yellow-500 text-xs flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Analiz ediliyor...</span>}
                                                {draft.status === 'done' && <span className="text-[#00FF4F] text-xs">✓ Analiz tamam</span>}
                                                {draft.status === 'error' && <span className="text-red-500 text-xs">✗ Hata</span>}
                                                {draft.status === 'pending' && <span className="text-gray-500 text-xs">Bekliyor...</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleAddAllToPool}
                                disabled={analyzing || drafts.some(d => d.status === 'analyzing')}
                                className="mt-8 w-full bg-white text-black border-4 border-white py-4 font-black text-xl hover:bg-[#00FF4F] hover:border-[#00FF4F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Plus size={24} />
                                TÜMÜNÜ HAVUZA EKLE ({drafts.filter(d => d.analyzed).length})
                            </button>
                        </div>
                    )}
                </div>

                {/* Pool List Header */}
                <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white">HAVUZDAKİ İÇERİKLER ({poolItems.length})</h2>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Sorting UI */}
                        <div className="flex items-center gap-2 bg-[#111] p-1 border border-gray-700">
                            <label className="text-[10px] text-[#00FF4F] ml-1 font-bold">SIRALA:</label>
                            <select 
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value as SortField)}
                                className="bg-black border border-white text-white text-xs p-1 focus:outline-none focus:border-[#00FF4F] cursor-pointer"
                            >
                                <option value="created_at">Eklenme Tarihi</option>
                                <option value="title">Şarkı Adı</option>
                                <option value="creator">Sanatçı</option>
                                <option value="category">Kategori</option>
                                <option value="era">Dönem</option>
                                <option value="vocal_type">Vokal</option>
                                <option value="energy_level">Enerji</option>
                            </select>
                            <button 
                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="bg-black border border-white text-white px-3 py-1 text-xs hover:bg-[#00FF4F] hover:text-black hover:border-[#00FF4F] transition-colors font-bold min-w-[50px]"
                            >
                                {sortDirection === 'asc' ? 'A-Z ↓' : 'Z-A ↑'}
                            </button>
                        </div>

                        {/* Import / Export UI */}
                        <div className="flex gap-2">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImportJSON} 
                                className="hidden" 
                                id="import-json"
                            />
                            <label 
                                htmlFor="import-json"
                                className="cursor-pointer flex items-center gap-2 bg-black border-2 border-white px-3 py-1.5 text-xs font-bold hover:bg-white hover:text-black transition-colors"
                            >
                                <Upload size={14} /> İÇE AKTAR
                            </label>
                            <button 
                                onClick={handleExportJSON}
                                className="flex items-center gap-2 bg-black border-2 border-white px-3 py-1.5 text-xs font-bold hover:bg-[#00FF4F] hover:border-[#00FF4F] transition-colors"
                            >
                                <Download size={14} /> DIŞA AKTAR
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedPoolItems.map((item) => (
                        <div key={item.id} className="bg-[#111] border-2 border-gray-800 p-4 hover:border-[#00FF4F] transition-colors group relative">
                            <div className="flex gap-4">
                                <img src={`https://img.youtube.com/vi/${item.video_id}/default.jpg`} alt="thumbnail" className="w-24 h-18 object-cover border border-gray-600 grayscale group-hover:grayscale-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate text-white">{item.title}</h4>
                                    <p className="text-xs text-gray-500 truncate">{item.creator}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="bg-[#00FF4F] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {item.category}
                                        </span>
                                        {item.era && (
                                            <span className="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {item.era}
                                            </span>
                                        )}
                                        {item.vocal_type && (
                                            <span className="bg-[#FF6600] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {item.vocal_type}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-[10px] text-[#00FF4F] border border-[#00FF4F] px-2 py-0.5 rounded-full">
                                            <Zap size={10} /> {item.energy_level}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEditClick(item)}
                                    className="text-gray-400 hover:text-white bg-black/80 p-1.5 rounded"
                                    title="Düzenle"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="text-gray-400 hover:text-red-500 bg-black/80 p-1.5 rounded"
                                    title="Sil"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {toast && (
                <div className={`fixed bottom-12 right-8 px-6 py-3 font-bold border-2 shadow-[4px_4px_0px_0px_#000] z-50 ${
                    toast.type === 'success' ? 'bg-[#00FF4F] text-black border-black' : 'bg-red-500 text-white border-black'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] border-4 border-white p-6 max-w-xl w-full relative shadow-[12px_12px_0px_0px_#fff]">
                        <button 
                            onClick={() => setEditingItem(null)}
                            className="absolute top-4 right-4 text-white hover:text-[#FF6600]"
                        >
                            <X size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-bold text-white mb-2">İÇERİĞİ DÜZENLE</h2>
                        <p className="text-gray-400 text-sm mb-6 truncate">{editingItem.title}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs text-white mb-1">KATEGORİ</label>
                                <input 
                                    type="text" 
                                    value={editForm.category}
                                    onChange={(e) => setEditForm(prev => ({...prev, category: e.target.value}))}
                                    className="w-full bg-black border-2 border-gray-600 focus:border-white p-3 text-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white mb-1">DÖNEM (ERA)</label>
                                <input 
                                    type="text" 
                                    value={editForm.era}
                                    onChange={(e) => setEditForm(prev => ({...prev, era: e.target.value}))}
                                    className="w-full bg-black border-2 border-gray-600 focus:border-white p-3 text-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white mb-1">VOKAL</label>
                                <input 
                                    type="text" 
                                    value={editForm.vocalType}
                                    onChange={(e) => setEditForm(prev => ({...prev, vocalType: e.target.value}))}
                                    className="w-full bg-black border-2 border-gray-600 focus:border-white p-3 text-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white mb-1">ENERJİ (1-10)</label>
                                <input 
                                    type="number" 
                                    min="1" max="10"
                                    value={editForm.energyLevel}
                                    onChange={(e) => setEditForm(prev => ({...prev, energyLevel: Number(e.target.value)}))}
                                    className="w-full bg-black border-2 border-gray-600 focus:border-white p-3 text-white font-bold"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleUpdateItem}
                            className="w-full mt-8 bg-white text-black font-bold py-4 hover:bg-[#00FF4F] transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            KAYDET
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
