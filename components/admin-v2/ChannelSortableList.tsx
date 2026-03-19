'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Channel } from '../../data/mockData';

interface SortableItemProps {
    channel: Channel;
    index: number;
}

function SortableItem({ channel, index }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: channel.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-black/10 p-1">
            <span className="opacity-50">::</span>
            <span className="font-bold">[{String(index + 1).padStart(2, '0')}]</span>
            <span className="truncate">{channel.name}</span>
        </div>
    );
}

interface ChannelSortableListProps {
    channels: Channel[];
    onReorder: (newOrder: Channel[]) => void;
    onSave: () => void;
    saving: boolean;
}

export default function ChannelSortableList({ channels, onReorder, onSave, saving }: ChannelSortableListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = channels.findIndex((item) => item.id === active.id);
            const newIndex = channels.findIndex((item) => item.id === over.id);
            onReorder(arrayMove(channels, oldIndex, newIndex));
        }
    };

    return (
        <div className="bg-[#00FF00] h-full border-l-4 border-black flex flex-col font-mono">
            <div className="p-6 pb-2">
                <h2 className="text-3xl font-black text-[#FF00FF] lowercase tracking-tighter">kanal-list:</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-1 text-black">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={channels.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {channels.map((channel, index) => (
                            <SortableItem key={channel.id} channel={channel} index={index} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="p-6 border-t-4 border-black mt-auto">
                <button 
                    onClick={onSave}
                    disabled={saving}
                    className="w-full bg-[#FF00FF] text-black border-4 border-black px-4 py-3 font-bold uppercase hover:bg-black hover:text-[#FF00FF] hover:border-[#FF00FF] transition-colors disabled:opacity-50"
                >
                    {saving ? 'Kaydediliyor...' : 'Sıralamayı Kaydet'}
                </button>
            </div>
        </div>
    );
}