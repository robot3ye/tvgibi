import React from 'react';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors, 
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy, 
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Edit2, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { Program } from '../../data/mockData';

// --- Sortable Row Component ---
interface ProgramRowProps {
    program: Program;
    index: number;
    isOverlay?: boolean;
    onDelete: (id: string) => void;
    onEdit: (program: Program) => void;
    onToggleSelect: (id: string) => void;
    isSelected: boolean;
    isLive?: boolean;
}

function ProgramRow({ program, index, isOverlay, onDelete, onEdit, onToggleSelect, isSelected, isLive }: ProgramRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: program.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    // Determine Color Scheme based on time
    const hour = parseInt(program.startTime.split(':')[0]);
    let rowClass = '';
    let textClass = '';
    let badgeClass = '';

    if (isLive) {
        // Live Program: Green
        rowClass = 'bg-[#00FF00] border-black';
        textClass = 'text-black';
        badgeClass = 'bg-black text-[#00FF00]';
    } else if (hour >= 6 && hour < 12) {
        // Morning: Yellow
        rowClass = 'bg-[#FFFF00] border-black';
        textClass = 'text-black';
        badgeClass = 'bg-black text-[#FFFF00]';
    } else if (hour >= 12 && hour < 18) {
        // Afternoon: Orange
        rowClass = 'bg-[#FF9900] border-black';
        textClass = 'text-black';
        badgeClass = 'bg-black text-[#FF9900]';
    } else {
        // Night/Evening: Navy
        rowClass = 'bg-[#000080] border-white/20';
        textClass = 'text-white';
        badgeClass = 'bg-white text-[#000080]';
    }

    // Override if overlay
    if (isOverlay) {
        rowClass = 'bg-gray-800 border-white';
        textClass = 'text-white';
    }

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`
                flex items-center gap-4 p-2 mb-1 border-b-2 font-mono group select-none
                ${rowClass}
            `}
        >
            {/* Drag Handle & Select */}
            <div className="flex items-center gap-2 pl-2">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:opacity-70">
                    <GripVertical size={20} className={textClass} />
                </div>
                <button onClick={() => onToggleSelect(program.id)}>
                    {isSelected ? (
                        <CheckSquare size={20} className={textClass} />
                    ) : (
                        <Square size={20} className={textClass} />
                    )}
                </button>
            </div>

            {/* Index Badge */}
            <div className={`
                font-bold font-mono px-2 py-1 text-sm border-2 border-current rounded flex items-center gap-2
                ${badgeClass}
            `}>
                {isLive && <span className="animate-pulse">●</span>}
                {String(index + 1).padStart(3, '0')}
            </div>

            {/* Thumbnail */}
            <div className="w-24 h-14 bg-black border-2 border-black overflow-hidden flex-shrink-0 relative">
                <img src={program.thumbnail} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 bg-black text-white text-[10px] px-1 font-bold">
                    {program.duration ? `${Math.floor(program.duration / 60)}:${String(program.duration % 60).padStart(2, '0')}` : ''}
                </div>
            </div>

            {/* Time Info */}
            <div className={`flex flex-col text-xs font-bold ${textClass} w-24`}>
                <span>Start_{program.startTime}</span>
                <span className="opacity-70">End__{program.endTime}</span>
            </div>

            {/* Title */}
            <div className={`flex-grow min-w-0 font-bold text-sm truncate ${textClass}`}>
                {program.title}
                {isLive && <span className="ml-2 px-1 bg-black text-white text-[10px] inline-block">ON AIR</span>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => onEdit(program)} className={`p-1 hover:bg-white/20 rounded ${textClass}`}>
                    <Edit2 size={18} />
                </button>
                <button onClick={() => onDelete(program.id)} className={`p-1 hover:bg-red-500 hover:text-white rounded ${textClass}`}>
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}

// --- Main List Component ---
interface ProgramListProps {
    programs: Program[];
    selectedDate: string;
    onReorder: (items: Program[]) => void;
    onDelete: (id: string) => void;
    onEdit: (program: Program) => void;
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onBulkDelete: () => void;
    onRefresh: () => void;
    liveProgramId?: string;
}

export default function ProgramList({ 
    programs, selectedDate, onReorder, onDelete, onEdit, selectedIds, onToggleSelect, onBulkDelete, onRefresh, liveProgramId
}: ProgramListProps) {
    
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = programs.findIndex((p) => p.id === active.id);
            const newIndex = programs.findIndex((p) => p.id === over.id);
            const newItems = arrayMove(programs, oldIndex, newIndex);
            onReorder(newItems);
        }
    };

    const activeProgram = activeId ? programs.find(p => p.id === activeId) : null;

    // Helper to render Time Block Headers
    const renderTimeHeader = (hour: number) => {
        let title = '';
        let colorClass = '';
        
        if (hour === 0) { title = 'GECE KUŞAĞI (00:00 - 05:59)'; colorClass = 'bg-[#000080] text-white'; }
        else if (hour === 6) { title = 'SABAH KUŞAĞI (06:00 - 11:59)'; colorClass = 'bg-[#FFFF00] text-black'; }
        else if (hour === 12) { title = 'ÖĞLE KUŞAĞI (12:00 - 17:59)'; colorClass = 'bg-[#FF9900] text-black'; }
        else if (hour === 18) { title = 'AKŞAM KUŞAĞI (18:00 - 23:59)'; colorClass = 'bg-[#000080] text-white'; }
        
        if (!title) return null;

        return (
            <div className={`px-4 py-2 font-bold font-mono text-sm border-b-2 border-black sticky top-0 z-10 ${colorClass}`}>
                {title}
            </div>
        );
    };

    return (
        <div className="bg-black border-4 border-black font-mono">
            {/* List Header / Actions */}
            <div className="bg-[#FF6600] p-2 flex justify-between items-center border-b-4 border-black">
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={onBulkDelete}
                            className="bg-[#ff0000] text-white px-4 py-1 font-bold text-sm border-2 border-white hover:bg-red-700 transition-colors"
                        >
                            Seçilenleri Sil ({selectedIds.length})
                        </button>
                    )}
                </div>
                <button 
                    onClick={onRefresh}
                    className="bg-gray-700 text-white px-4 py-1 font-bold text-sm border-2 border-white flex items-center gap-2 hover:bg-gray-600"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Sortable List */}
            <div className="bg-gray-900 min-h-[400px]">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={programs.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        {programs.map((program, index) => {
                            // Logic to insert headers
                            // We check if this is the first item of a block
                            const hour = parseInt(program.startTime.split(':')[0]);
                            const prevHour = index > 0 ? parseInt(programs[index - 1].startTime.split(':')[0]) : -1;
                            
                            let header = null;
                            // Simplify: Just check boundaries
                            if (index === 0 || 
                                (prevHour < 6 && hour >= 6) || 
                                (prevHour < 12 && hour >= 12) || 
                                (prevHour < 18 && hour >= 18)) {
                                    
                                if (hour < 6) header = renderTimeHeader(0);
                                else if (hour < 12) header = renderTimeHeader(6);
                                else if (hour < 18) header = renderTimeHeader(12);
                                else header = renderTimeHeader(18);
                            }

                            return (
                                <React.Fragment key={program.id}>
                                    {header}
                                    <ProgramRow 
                                        program={program} 
                                        index={index}
                                        onDelete={onDelete}
                                        onEdit={onEdit}
                                        onToggleSelect={onToggleSelect}
                                        isSelected={selectedIds.includes(program.id)}
                                        isLive={program.id === liveProgramId}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </SortableContext>
                    
                    <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                        {activeProgram ? (
                             <div className="opacity-90">
                                <ProgramRow 
                                    program={activeProgram} 
                                    index={programs.findIndex(p => p.id === activeId)}
                                    onDelete={() => {}} 
                                    onEdit={() => {}} 
                                    onToggleSelect={() => {}}
                                    isSelected={false}
                                    isOverlay
                                />
                             </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
                
                {programs.length === 0 && (
                     <div className="p-12 text-center text-gray-500 font-mono">
                        BU TARİHTE YAYIN BULUNAMADI.
                    </div>
                )}
            </div>
        </div>
    );
}
