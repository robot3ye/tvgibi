import React, { useState } from 'react';
import { Loader2, X, Check } from 'lucide-react';
import { Program } from '../../data/mockData';

interface EditModalProps {
    program: Program | null;
    onClose: () => void;
    onSave: (id: string, updates: { title: string; description: string }) => void;
    saving: boolean;
}

export default function EditModal({ program, onClose, onSave, saving }: EditModalProps) {
    const [form, setForm] = useState({
        title: program?.title || '',
        description: program?.description || ''
    });

    if (!program) return null;

    const handleSave = () => {
        onSave(program.id, form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="bg-[#FFFF00] border-4 border-black w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b-4 border-black bg-black text-[#FFFF00]">
                    <h3 className="text-lg font-bold">PROGRAM DÜZENLE_</h3>
                    <button onClick={onClose} className="text-[#FFFF00] hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-black mb-1 bg-white w-fit px-2 border-2 border-black transform -rotate-1">
                            BAŞLIK
                        </label>
                        <input 
                            type="text" 
                            value={form.title}
                            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-white border-4 border-black p-3 text-black font-bold focus:outline-none focus:bg-cyan-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-black mb-1 bg-white w-fit px-2 border-2 border-black transform -rotate-1">
                            AÇIKLAMA
                        </label>
                        <textarea 
                            value={form.description}
                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            className="w-full bg-white border-4 border-black p-3 text-black font-bold focus:outline-none focus:bg-cyan-50 resize-none"
                        />
                    </div>
                </div>
                
                <div className="p-4 border-t-4 border-black flex justify-end gap-3 bg-[#FF9900]">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 font-bold text-white bg-black border-2 border-black hover:bg-gray-800 transition-colors"
                    >
                        İPTAL
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="flex items-center px-6 py-2 font-bold text-black bg-[#00FF00] border-2 border-black hover:bg-[#33ff33] transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                        {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />} 
                        KAYDET
                    </button>
                </div>
            </div>
        </div>
    );
}
