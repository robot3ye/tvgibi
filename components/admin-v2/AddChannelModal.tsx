import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { addChannel, updateChannel, uploadChannelLogo } from '../../lib/api';
import { Channel } from '../../data/mockData';

interface AddChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Channel | null;
}

export default function AddChannelModal({ isOpen, onClose, onSuccess, initialData }: AddChannelModalProps) {
    const [name, setName] = useState('');
    const [logoCorner, setLogoCorner] = useState('');
    const [logoMain, setLogoMain] = useState('');
    const [logoCornerFile, setLogoCornerFile] = useState<File | null>(null);
    const [logoMainFile, setLogoMainFile] = useState<File | null>(null);
    const [colorPrimary, setColorPrimary] = useState('#00FF00');
    const [colorSecondary, setColorSecondary] = useState('#FF6600');
    const [motto, setMotto] = useState('');
    const [ageRange, setAgeRange] = useState('');
    const [editors, setEditors] = useState<string[]>([]);
    const [newEditor, setNewEditor] = useState('');
    
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setLogoCorner(initialData.logo_corner || '');
            setLogoMain(initialData.logo_main || '');
            setColorPrimary(initialData.color_primary || '#00FF00');
            setColorSecondary(initialData.color_secondary || '#FF6600');
            setMotto(initialData.motto || '');
            setAgeRange(initialData.age_range || '');
            setEditors(initialData.editors || []);
        } else {
            // Reset for Add mode
            setName('');
            setLogoCorner('');
            setLogoMain('');
            setColorPrimary('#00FF00');
            setColorSecondary('#FF6600');
            setMotto('');
            setAgeRange('');
            setEditors([]);
        }
        setLogoCornerFile(null);
        setLogoMainFile(null);
        setError('');
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleAddEditor = () => {
        if (newEditor.trim() && !editors.includes(newEditor.trim())) {
            setEditors([...editors, newEditor.trim()]);
            setNewEditor('');
        }
    };

    const handleRemoveEditor = (editorToRemove: string) => {
        setEditors(editors.filter(e => e !== editorToRemove));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'corner' | 'main') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'corner') setLogoCornerFile(e.target.files[0]);
            else setLogoMainFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Kanal adı zorunludur.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            let finalLogoCorner = logoCorner;
            let finalLogoMain = logoMain;

            // Upload files if selected
            if (logoCornerFile) {
                const path = `corner-${Date.now()}-${logoCornerFile.name}`;
                finalLogoCorner = await uploadChannelLogo(logoCornerFile, path);
            }

            if (logoMainFile) {
                const path = `main-${Date.now()}-${logoMainFile.name}`;
                finalLogoMain = await uploadChannelLogo(logoMainFile, path);
            }

            const payload = {
                name,
                logo_corner: finalLogoCorner || name.substring(0, 2).toUpperCase(),
                logo_main: finalLogoMain,
                color_primary: colorPrimary,
                color_secondary: colorSecondary,
                motto,
                age_range: ageRange,
                editors
            };

            if (initialData) {
                await updateChannel(initialData.id, payload);
            } else {
                await addChannel(payload);
            }
            
            // Reset form
            setName('');
            setLogoCorner('');
            setLogoMain('');
            setLogoCornerFile(null);
            setLogoMainFile(null);
            setColorPrimary('#00FF00');
            setColorSecondary('#FF6600');
            setMotto('');
            setAgeRange('');
            setEditors([]);
            
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Kanal eklenirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    // Preset brutalist colors for easy picking
    const presetColors = [
        '#00FF00', '#FF00FF', '#00FFFF', '#FFFF00', 
        '#FF3300', '#0000FF', '#FF0000', '#111111', '#FFFFFF'
    ];

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-mono overflow-y-auto">
            <div className="bg-[#111] border-4 border-black w-full max-w-2xl shadow-[12px_12px_0px_0px_rgba(0,255,0,1)] my-8">
                
                {/* Header */}
                <div className="bg-[#00FF00] p-4 border-b-4 border-black flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-black uppercase tracking-wider">
                        {initialData ? 'KANALI DÜZENLE_' : 'YENİ KANAL EKLE_'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-black hover:bg-black hover:text-[#00FF00] p-1 border-2 border-transparent hover:border-black transition-colors"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 text-white">
                    
                    {error && (
                        <div className="bg-red-500 text-white p-3 border-2 border-red-700 font-bold">
                            HATA: {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#00FF00] mb-2 uppercase text-sm font-bold">Kanal Adı *</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white text-black p-3 border-2 border-black outline-none focus:border-[#00FF00] focus:ring-2 focus:ring-[#00FF00]"
                                    placeholder="Örn: MusicBox"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[#00FF00] mb-2 uppercase text-sm font-bold">Motto</label>
                                <input 
                                    type="text" 
                                    value={motto}
                                    onChange={(e) => setMotto(e.target.value)}
                                    className="w-full bg-white text-black p-3 border-2 border-black outline-none focus:border-[#00FF00] focus:ring-2 focus:ring-[#00FF00]"
                                    placeholder="Sürekli Müzik, Kesintisiz Eğlence"
                                />
                            </div>

                            <div>
                                <label className="block text-[#00FF00] mb-2 uppercase text-sm font-bold">Yaş Aralığı</label>
                                <input 
                                    type="text" 
                                    value={ageRange}
                                    onChange={(e) => setAgeRange(e.target.value)}
                                    className="w-full bg-white text-black p-3 border-2 border-black outline-none focus:border-[#00FF00] focus:ring-2 focus:ring-[#00FF00]"
                                    placeholder="7+, 13+, Genel İzleyici vs."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[#00FF00] mb-2 uppercase text-sm font-bold">Editörler</label>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        value={newEditor}
                                        onChange={(e) => setNewEditor(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEditor())}
                                        className="flex-grow bg-white text-black p-2 border-2 border-black outline-none"
                                        placeholder="Editör adı yaz..."
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddEditor}
                                        className="bg-[#00FF00] text-black px-4 border-2 border-black hover:bg-black hover:text-[#00FF00] hover:border-[#00FF00] font-bold"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editors.map(editor => (
                                        <div key={editor} className="bg-gray-800 text-white px-3 py-1 border border-gray-600 flex items-center gap-2 text-sm">
                                            {editor}
                                            <button type="button" onClick={() => handleRemoveEditor(editor)} className="text-red-500 hover:text-red-400">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#00FF00] mb-2 uppercase text-sm font-bold">Köşe Logosu (Yayın Ekranı)</label>
                                <div className="flex gap-2 mb-2">
                                    <label className="flex-grow cursor-pointer bg-white text-black p-3 border-2 border-black hover:bg-gray-200 flex items-center justify-center gap-2">
                                        <Upload size={20} />
                                        <span className="truncate">{logoCornerFile ? logoCornerFile.name : 'Dosya Seç'}</span>
                                        <input type="file" onChange={(e) => handleFileChange(e, 'corner')} accept="image/*" className="hidden" />
                                    </label>
                                </div>
                                <input 
                                    type="url" 
                                    value={logoCorner}
                                    onChange={(e) => setLogoCorner(e.target.value)}
                                    className="w-full bg-black text-white p-2 border border-gray-600 text-xs"
                                    placeholder="veya URL gir..."
                                />
                            </div>

                            <div>
                                <label className="block text-[#00FF00] mb-2 uppercase text-sm font-bold">Ana Logo (Detay Sayfası)</label>
                                <div className="flex gap-2 mb-2">
                                    <label className="flex-grow cursor-pointer bg-white text-black p-3 border-2 border-black hover:bg-gray-200 flex items-center justify-center gap-2">
                                        <Upload size={20} />
                                        <span className="truncate">{logoMainFile ? logoMainFile.name : 'Dosya Seç'}</span>
                                        <input type="file" onChange={(e) => handleFileChange(e, 'main')} accept="image/*" className="hidden" />
                                    </label>
                                </div>
                                <input 
                                    type="url" 
                                    value={logoMain}
                                    onChange={(e) => setLogoMain(e.target.value)}
                                    className="w-full bg-black text-white p-2 border border-gray-600 text-xs"
                                    placeholder="veya URL gir..."
                                />
                            </div>

                            {/* Color Pickers */}
                            <div className="p-4 border-2 border-[#00FF00] bg-black">
                                <h3 className="text-[#00FF00] mb-4 uppercase text-sm font-bold">Tema Renkleri</h3>
                                
                                <div className="space-y-4">
                                    {/* Primary Color */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs text-gray-400 uppercase">Birinci Renk</label>
                                            <span className="text-xs">{colorPrimary}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="color" 
                                                value={colorPrimary}
                                                onChange={(e) => setColorPrimary(e.target.value)}
                                                className="w-12 h-12 p-0 border-2 border-white cursor-pointer bg-transparent"
                                            />
                                            <div className="flex gap-1 flex-wrap">
                                                {presetColors.map(c => (
                                                    <button 
                                                        key={`p-${c}`} type="button" 
                                                        onClick={() => setColorPrimary(c)}
                                                        className={`w-6 h-6 border ${colorPrimary === c ? 'border-white scale-110' : 'border-gray-600'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Secondary Color */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-xs text-gray-400 uppercase">İkinci Renk</label>
                                            <span className="text-xs">{colorSecondary}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="color" 
                                                value={colorSecondary}
                                                onChange={(e) => setColorSecondary(e.target.value)}
                                                className="w-12 h-12 p-0 border-2 border-white cursor-pointer bg-transparent"
                                            />
                                            <div className="flex gap-1 flex-wrap">
                                                {presetColors.map(c => (
                                                    <button 
                                                        key={`s-${c}`} type="button" 
                                                        onClick={() => setColorSecondary(c)}
                                                        className={`w-6 h-6 border ${colorSecondary === c ? 'border-white scale-110' : 'border-gray-600'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-800">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-black font-bold uppercase transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="px-6 py-3 bg-[#00FF00] border-2 border-black text-black hover:bg-black hover:text-[#00FF00] hover:border-[#00FF00] font-bold uppercase transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Kanalı Oluştur')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}