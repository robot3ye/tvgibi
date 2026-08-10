'use client';

import React, { useState, useEffect } from 'react';
import { getChannels, updateChannel, getPoolMetadata } from '../../../lib/api';
import { Channel } from '../../../data/mockData';
import { Settings2, Save, Loader2, Music2, SlidersHorizontal, Zap } from 'lucide-react';
import Link from 'next/link';

export default function MixerAdminPage() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [metadata, setMetadata] = useState<{ categories: string[], eras: string[], vocals: string[] }>({
        categories: [], eras: [], vocals: []
    });

    // Mixer Form State
    const [categories, setCategories] = useState<{name: string, weight: number}[]>([]);
    const [eras, setEras] = useState<{name: string, weight: number}[]>([]);
    const [vocals, setVocals] = useState<{name: string, weight: number}[]>([]);
    const [minEnergy, setMinEnergy] = useState<number>(1);
    const [maxEnergy, setMaxEnergy] = useState<number>(10);

    const loadData = async () => {
        setLoading(true);
        const [chans, meta] = await Promise.all([
            getChannels(),
            getPoolMetadata()
        ]);
        setChannels(chans);
        setMetadata(meta as { categories: string[], eras: string[], vocals: string[] });
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleSelectChannel = (channel: Channel) => {
        setSelectedChannel(channel);
        const config = channel.mixer_config || {};
        
        // Ensure arrays
        setCategories(config.categories || []);
        setEras(config.eras || []);
        setVocals(config.vocals || []);
        setMinEnergy(config.minEnergy || 1);
        setMaxEnergy(config.maxEnergy || 10);
    };

    const handleSave = async () => {
        if (!selectedChannel) return;
        setSaving(true);
        
        const newConfig = {
            categories,
            eras,
            vocals,
            minEnergy,
            maxEnergy
        };

        try {
            await updateChannel(selectedChannel.id, { mixer_config: newConfig });
            
            // Update local state
            setChannels(prev => prev.map(c => c.id === selectedChannel.id ? { ...c, mixer_config: newConfig } : c));
            setToast({ message: 'Kanal mikseri kaydedildi!', type: 'success' });
        } catch (err) {
            console.error('Save error:', err);
            setToast({ message: 'Kaydedilirken hata oluştu.', type: 'error' });
        }
        setSaving(false);
    };

    const toggleItem = (
        list: {name: string, weight: number}[], 
        setList: React.Dispatch<React.SetStateAction<{name: string, weight: number}[]>>, 
        name: string
    ) => {
        const exists = list.find(i => i.name === name);
        if (exists) {
            setList(list.filter(i => i.name !== name));
        } else {
            setList([...list, { name, weight: 50 }]);
        }
    };

    const updateWeight = (
        list: {name: string, weight: number}[], 
        setList: React.Dispatch<React.SetStateAction<{name: string, weight: number}[]>>, 
        name: string, 
        weight: number
    ) => {
        setList(list.map(i => i.name === name ? { ...i, weight } : i));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-[#00FF4F] font-mono">
                <Loader2 className="animate-spin w-12 h-12" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-[#E0E0E0] font-mono selection:bg-[#00FF4F] selection:text-black pb-24">
            <header className="bg-[#FF6600] p-4 flex items-center justify-between border-b-4 border-black">
                <div className="flex items-center gap-4">
                    <Link href="/admin/pool" className="text-black font-bold hover:text-white transition-colors border-2 border-black px-3 py-1">
                        ← HAVUZA DÖN
                    </Link>
                    <h1 className="text-2xl font-black text-black tracking-tighter flex items-center gap-2">
                        <SlidersHorizontal /> KANAL MİKSERİ (AŞAMA 2)
                    </h1>
                </div>
            </header>

            <div className="max-w-6xl mx-auto p-4 md:p-8">
                
                {/* Channel Selector */}
                <div className="mb-8">
                    <h2 className="text-[#00FF4F] text-sm font-bold mb-2">1. KANAL SEÇ</h2>
                    <div className="flex flex-wrap gap-2">
                        {channels.map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => handleSelectChannel(channel)}
                                className={`px-4 py-2 border-2 font-bold text-sm transition-all ${
                                    selectedChannel?.id === channel.id 
                                    ? 'bg-[#00FF4F] border-[#00FF4F] text-black' 
                                    : 'bg-black border-gray-600 text-gray-400 hover:border-white hover:text-white'
                                }`}
                            >
                                {channel.name}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedChannel ? (
                    <div className="bg-[#111] border-2 border-gray-700 p-6 md:p-8 shadow-[8px_8px_0px_0px_#00FF4F]">
                        <div className="flex items-center justify-between mb-8 border-b-2 border-gray-800 pb-4">
                            <h2 className="text-3xl font-black text-white flex items-center gap-3">
                                <span className="w-4 h-4 bg-[#00FF4F] inline-block animate-pulse"></span>
                                {selectedChannel.name} MİKSERİ
                            </h2>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-[#00FF4F] text-black border-2 border-[#00FF4F] px-6 py-2 font-bold hover:bg-black hover:text-[#00FF4F] transition-colors flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                KAYDET
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Categories */}
                            <div>
                                <h3 className="text-[#FF6600] font-bold text-lg mb-4 flex items-center gap-2">
                                    <Music2 size={20} /> KATEGORİ AĞIRLIKLARI
                                </h3>
                                <p className="text-gray-500 text-xs mb-4">Kanala dahil edilecek kategorileri seçin ve % ağırlıklarını belirleyin.</p>
                                
                                <div className="space-y-4">
                                    {metadata.categories.length === 0 && <span className="text-gray-600">Havuzda kategori bulunamadı.</span>}
                                    {metadata.categories.map(cat => {
                                        const isSelected = categories.find(c => c.name === cat);
                                        return (
                                            <div key={cat} className={`p-3 border ${isSelected ? 'border-[#00FF4F] bg-black' : 'border-gray-800 bg-[#0a0a0a]'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!isSelected}
                                                            onChange={() => toggleItem(categories, setCategories, cat)}
                                                            className="w-5 h-5 accent-[#00FF4F] bg-black border-2 border-gray-600"
                                                        />
                                                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>{cat}</span>
                                                    </label>
                                                    {isSelected && <span className="text-[#00FF4F] font-bold">{isSelected.weight}%</span>}
                                                </div>
                                                
                                                {isSelected && (
                                                    <input 
                                                        type="range" 
                                                        min="1" max="100" 
                                                        value={isSelected.weight}
                                                        onChange={(e) => updateWeight(categories, setCategories, cat, Number(e.target.value))}
                                                        className="w-full accent-[#00FF4F] h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-12">
                                {/* Eras */}
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-4">DÖNEM (ERA) FİLTRESİ</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {metadata.eras.map(era => {
                                            const isSelected = eras.find(e => e.name === era);
                                            return (
                                                <button
                                                    key={era}
                                                    onClick={() => toggleItem(eras, setEras, era)}
                                                    className={`px-3 py-1 text-xs font-bold border ${
                                                        isSelected ? 'bg-white text-black border-white' : 'bg-black text-gray-500 border-gray-700'
                                                    }`}
                                                >
                                                    {era} {isSelected && '✓'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Vocals */}
                                <div>
                                    <h3 className="text-[#FF6600] font-bold text-lg mb-4">VOKAL TERCİHİ</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {metadata.vocals.map(vocal => {
                                            const isSelected = vocals.find(v => v.name === vocal);
                                            return (
                                                <button
                                                    key={vocal}
                                                    onClick={() => toggleItem(vocals, setVocals, vocal)}
                                                    className={`px-3 py-1 text-xs font-bold border ${
                                                        isSelected ? 'bg-[#FF6600] text-black border-[#FF6600]' : 'bg-black text-gray-500 border-gray-700'
                                                    }`}
                                                >
                                                    {vocal} {isSelected && '✓'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Energy Levels */}
                                <div className="bg-black p-4 border border-gray-700">
                                    <h3 className="text-[#00FF4F] font-bold text-lg mb-4 flex items-center gap-2">
                                        <Zap size={20} /> ENERJİ SEVİYESİ (1-10)
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-400 block mb-1">MİNİMUM</label>
                                            <input 
                                                type="range" min="1" max="10" 
                                                value={minEnergy}
                                                onChange={(e) => setMinEnergy(Number(e.target.value))}
                                                className="w-full accent-[#00FF4F]"
                                            />
                                            <div className="text-white font-bold mt-1">{minEnergy}</div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-400 block mb-1">MAKSİMUM</label>
                                            <input 
                                                type="range" min="1" max="10" 
                                                value={maxEnergy}
                                                onChange={(e) => setMaxEnergy(Number(e.target.value))}
                                                className="w-full accent-red-500"
                                            />
                                            <div className="text-white font-bold mt-1">{maxEnergy}</div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-gray-700">
                        <Settings2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold">LÜTFEN YUKARIDAN BİR KANAL SEÇİN</p>
                    </div>
                )}
            </div>

            {toast && (
                <div className={`fixed bottom-12 right-8 px-6 py-3 font-bold border-2 shadow-[4px_4px_0px_0px_#000] z-50 ${
                    toast.type === 'success' ? 'bg-[#00FF4F] text-black border-black' : 'bg-red-500 text-white border-black'
                }`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}