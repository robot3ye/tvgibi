import React from 'react';
import { Channel } from '../../data/mockData';
import { Upload } from 'lucide-react';

interface ChannelCardProps {
    channel: Channel;
    index: number;
    onEdit: () => void;
    onEditSchedule: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
}

export default function ChannelCard({ channel, index, onEdit, onEditSchedule, onToggleStatus, onDelete }: ChannelCardProps) {
    const bgPrimary = channel.color_primary || '#00FF00';
    const bgSecondary = channel.color_secondary || '#FF6600';
    
    // Formatting editors array to string
    const editorsString = channel.editors && channel.editors.length > 0 
        ? channel.editors.join(', ') 
        : 'Atanmamış';

    return (
        <div 
            className="border-4 border-black relative mb-8"
            style={{ 
                backgroundColor: bgPrimary,
                boxShadow: `12px 12px 0px 0px ${bgSecondary}`
            }}
        >
            <div className="p-6 flex flex-col md:flex-row gap-6 text-black font-mono">
                
                {/* Left Content */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                        <span className="text-4xl font-bold">[{index}]</span>
                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-wider">{channel.name}</h2>
                        </div>
                    </div>
                    
                    <div className="space-y-2 mt-4 max-w-xl">
                        <p className="italic font-medium">
                            _{channel.motto || 'Motto belirlenmedi...'}
                        </p>
                        <p className="font-bold">_{channel.age_range || 'Genel İzleyici'} yaş</p>
                        <p className="font-bold">_Editör: {editorsString}</p>
                    </div>

                    <div className="mt-6">
                        <p className="font-bold mb-2">_Tema renkleri:</p>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 border-4 border-black" style={{ backgroundColor: bgPrimary }} />
                                <span className="font-bold uppercase text-sm">{bgPrimary}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 border-4 border-black" style={{ backgroundColor: bgSecondary }} />
                                <span className="font-bold uppercase text-sm">{bgSecondary}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content - Images */}
                <div className="w-full md:w-80 flex flex-col gap-4">
                    {/* Main Logo 16:9 */}
                    <div className="space-y-1">
                        <div className="w-full aspect-video border-4 border-black bg-transparent flex items-center justify-center overflow-hidden relative group">
                            {channel.logo_main ? (
                                <img src={channel.logo_main} alt={`${channel.name} main logo`} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black">{channel.logo || channel.name.substring(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="bg-black text-[#00FF00] text-xs py-1 px-2 flex justify-between items-center cursor-pointer hover:bg-gray-900" onClick={onEdit}>
                            <span>Ana logoyu değiştir 16:9</span>
                            <span>&lt;BROWSE..&gt;</span>
                        </div>
                    </div>

                    {/* Corner Logo 16:4.5 */}
                    <div className="space-y-1">
                        <div className="w-full aspect-[16/4.5] border-4 border-black bg-transparent flex items-center justify-center overflow-hidden relative">
                            {channel.logo_corner ? (
                                <img src={channel.logo_corner} alt={`${channel.name} corner logo`} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-2xl font-black">{channel.logo || channel.name.substring(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="bg-black text-[#00FF00] text-xs py-1 px-2 flex justify-between items-center cursor-pointer hover:bg-gray-900" onClick={onEdit}>
                            <span>Köşe logosunu değiştir 16:4.5</span>
                            <span>&lt;BROWSE..&gt;</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="border-t-4 border-black bg-white flex flex-wrap items-center justify-between p-2 gap-2">
                <div className="flex gap-2">
                    <button 
                        onClick={onEdit}
                        className="bg-black text-[#00FF00] px-4 py-2 font-bold uppercase text-sm border-2 border-transparent hover:border-[#00FF00]"
                    >
                        Bilgileri Düzenle
                    </button>
                    <button 
                        onClick={onEditSchedule}
                        className="bg-[#00FF00] text-black border-2 border-black px-4 py-2 font-bold uppercase text-sm hover:bg-black hover:text-[#00FF00]"
                    >
                        YAYIN AKIŞINI DÜZENLE
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    {/* Status Toggle */}
                    <button 
                        onClick={onToggleStatus}
                        className="flex items-center gap-2 font-bold uppercase cursor-pointer"
                    >
                        <div className={`w-12 h-6 rounded-full border-2 border-black p-0.5 flex ${channel.is_online ? 'bg-[#00FF00] justify-end' : 'bg-gray-300 justify-start'}`}>
                            <div className="w-4 h-4 bg-black rounded-full" />
                        </div>
                        <span className={channel.is_online ? 'text-black' : 'text-gray-500'}>
                            {channel.is_online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </button>

                    <button 
                        onClick={onDelete}
                        className="bg-black text-white px-4 py-2 font-bold uppercase text-sm border-2 border-red-600 hover:bg-red-600"
                    >
                        KANALI SİL
                    </button>
                </div>
            </div>
        </div>
    );
}