'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getChannels, updateChannel, updateChannelsOrder, deleteChannel } from '../../lib/api';
import { Channel } from '../../data/mockData';
import { Check, X } from 'lucide-react';

import ChannelCard from '../../components/admin-v2/ChannelCard';
import ChannelSortableList from '../../components/admin-v2/ChannelSortableList';
import AddChannelModal from '../../components/admin-v2/AddChannelModal';
import FooterNav from '../../components/admin-v2/FooterNav';

export default function ChannelsAdminPage() {
    const router = useRouter();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
    const [savingOrder, setSavingOrder] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Editing State (Can reuse AddChannelModal logic later, for now we just toggle status/delete)
    // To fully implement "Bilgileri Düzenle", we'd pass the channel to a modal. 
    // We'll use AddChannelModal in "edit mode" in the future.

    const loadChannelsData = async () => {
        const data = await getChannels();
        setChannels(data);
    };

    useEffect(() => {
        loadChannelsData();
    }, []);

    // Toast Timer
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleToggleStatus = async (channel: Channel) => {
        try {
            const newStatus = !(channel.is_online ?? true);
            await updateChannel(channel.id, { is_online: newStatus });
            
            // Update local state optimistically
            setChannels(prev => prev.map(c => 
                c.id === channel.id ? { ...c, is_online: newStatus } : c
            ));
            
            setToast({ message: `${channel.name} ${newStatus ? 'Online' : 'Offline'} yapıldı.`, type: 'success' });
        } catch (error) {
            setToast({ message: 'Durum güncellenirken hata oluştu.', type: 'error' });
        }
    };

    const handleDelete = async (channelId: string, channelName: string) => {
        if (confirm(`${channelName} kanalını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
            try {
                await deleteChannel(channelId); // Needs to be implemented in api.ts
                setChannels(prev => prev.filter(c => c.id !== channelId));
                setToast({ message: 'Kanal silindi.', type: 'success' });
            } catch (error) {
                setToast({ message: 'Silme işlemi başarısız.', type: 'error' });
            }
        }
    };

    const handleSaveOrder = async () => {
        setSavingOrder(true);
        try {
            const channelIds = channels.map(c => c.id);
            await updateChannelsOrder(channelIds);
            setToast({ message: 'Sıralama kaydedildi.', type: 'success' });
        } catch (error) {
            setToast({ message: 'Sıralama kaydedilemedi.', type: 'error' });
        } finally {
            setSavingOrder(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#ff6610] font-mono flex flex-col">
            {/* Main Container - Full Width */}
            <div className="w-full flex flex-col md:flex-row min-h-screen">
                
                {/* Left Column (Header + Cards) */}
                <div className="flex-1 flex flex-col bg-[#ff6610] pl-[50px] pr-8">
                    
                    {/* Centered Content Wrapper */}
                    <div className="w-full max-w-5xl mx-auto flex flex-col h-full">

                        {/* Header Block */}
                        <div className="bg-black text-white p-8 flex justify-between items-start mt-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="space-y-4">
                                <h1 className="text-5xl font-bold tracking-tight">tvgibi.tv</h1>
                                <p className="text-xl">Kanal Yönetim Ekranı</p>
                                <p className="text-xl">
                                    Bir TeleVizyon <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">simülasyonu..</span>
                                </p>
                                <div className="pt-4">
                                    <button 
                                        onClick={() => {
                                            setEditingChannel(null);
                                            setIsAddModalOpen(true);
                                        }}
                                        className="border-2 border-[#00FF00] text-[#00FF00] px-6 py-2 font-bold uppercase hover:bg-[#00FF00] hover:text-black transition-colors"
                                    >
                                        YENİ KANAL EKLE
                                    </button>
                                </div>
                            </div>
                            
                            {/* Header Image (Test Screen) */}
                            <div className="hidden md:block w-64 h-48 bg-gray-800 border-4 border-white">
                                <img src="/test-screen.png" alt="Test Screen" className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Channel Cards Area */}
                        <div className="py-12 flex-1 space-y-12">
                            {channels.map((channel, index) => (
                                <ChannelCard 
                                    key={channel.id}
                                    channel={channel}
                                    index={index + 1}
                                    onEdit={() => {
                                        setEditingChannel(channel);
                                        setIsAddModalOpen(true);
                                    }}
                                    onEditSchedule={() => router.push(`/admin/schedule?channel=${channel.id}`)}
                                    onToggleStatus={() => handleToggleStatus(channel)}
                                    onDelete={() => handleDelete(channel.id, channel.name)}
                                />
                            ))}
                        </div>

                        {/* Footer Area inside left column to match layout */}
                        <FooterNav />
                    </div>
                </div>

                {/* Right Sidebar (Sortable List) */}
                <div className="w-full md:w-80 flex-shrink-0 bg-[#00FF00] border-l-4 border-black border-b-4 md:border-b-0 sticky top-0 h-screen overflow-hidden">
                    <ChannelSortableList 
                        channels={channels}
                        onReorder={setChannels} // Optimistic update
                        onSave={handleSaveOrder}
                        saving={savingOrder}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddChannelModal 
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingChannel(null);
                }}
                onSuccess={() => {
                    loadChannelsData();
                    setToast({ message: editingChannel ? 'Kanal güncellendi!' : 'Kanal başarıyla eklendi!', type: 'success' });
                }}
                initialData={editingChannel}
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