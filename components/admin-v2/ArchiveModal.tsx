import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDate: (date: string) => void;
}

export default function ArchiveModal({ isOpen, onClose, onSelectDate }: ArchiveModalProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);

    if (!isOpen) return null;

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    
    // Adjust to make Monday the first day of the week (0 = Monday, 6 = Sunday)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
        days.push(null); // empty slots
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (newDate <= today) {
            setSelectedDateObj(newDate);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDateObj) {
            // Format to YYYY-MM-DD local time
            const year = selectedDateObj.getFullYear();
            const month = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDateObj.getDate()).padStart(2, '0');
            onSelectDate(`${year}-${month}-${day}`);
        }
    };

    const monthNames = [
        "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", 
        "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111] border-4 border-black w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col animate-in fade-in zoom-in-95 duration-200 font-mono">
                {/* Header */}
                <div className="bg-[#FFFF00] p-4 flex justify-between items-center border-b-4 border-black">
                    <h2 className="text-xl font-black text-black uppercase tracking-tighter">ARŞİV</h2>
                    <button onClick={onClose} className="text-black hover:text-red-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    <div>
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-4 text-[#00FF00]">
                            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-[#00FF00] hover:text-black transition-colors border-2 border-transparent hover:border-black">
                                <ChevronLeft size={24} />
                            </button>
                            <div className="font-bold text-lg">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </div>
                            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-[#00FF00] hover:text-black transition-colors border-2 border-transparent hover:border-black">
                                <ChevronRight size={24} />
                            </button>
                        </div>

                        {/* Weekdays */}
                        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold text-gray-500">
                            <div>PT</div><div>SA</div><div>ÇA</div><div>PE</div><div>CU</div><div>CT</div><div>PZ</div>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {days.map((day, idx) => {
                                if (day === null) {
                                    return <div key={`empty-${idx}`} className="p-2"></div>;
                                }

                                const dateOfThisCell = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                const isFuture = dateOfThisCell > today;
                                const isSelected = selectedDateObj?.getTime() === dateOfThisCell.getTime();
                                const isToday = dateOfThisCell.getTime() === today.getTime();

                                return (
                                    <button
                                        key={`day-${day}`}
                                        type="button"
                                        disabled={isFuture}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            p-2 text-sm font-bold border-2 transition-colors
                                            ${isFuture ? 'text-gray-700 border-transparent cursor-not-allowed' : 'hover:border-[#00FF00]'}
                                            ${isSelected ? 'bg-[#00FF00] text-black border-[#00FF00]' : 'text-white border-transparent'}
                                            ${isToday && !isSelected ? 'text-[#FFFF00] border-b-[#FFFF00]' : ''}
                                        `}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={!selectedDateObj}
                        className={`w-full font-black py-4 uppercase border-2 transition-colors active:scale-95
                            ${selectedDateObj 
                                ? 'bg-[#00FF00] text-black border-black hover:bg-[#FFFF00]' 
                                : 'bg-gray-800 text-gray-500 border-gray-900 cursor-not-allowed'
                            }
                        `}
                    >
                        Arşivi Getir
                    </button>
                </form>
            </div>
        </div>
    );
}
