'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Send, Loader2, Save, Trash2, Video } from 'lucide-react';
import { Channel } from '../../../data/mockData';
import { getChannels } from '../../../lib/api';

// Note: In a real app we'd fetch this from DB, using mock for now
import { addProgram } from '../../../lib/api';

export default function EmmyRoom() {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [draft, setDraft] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input || isLoading) return;
        
        setIsLoading(true);
        const currentInput = input;
        setInput('');
        
        // Add the user's message immediately for responsive UI
        const initialMessages = [...messages, { id: Date.now().toString(), role: 'user', content: currentInput } as any];
        setMessages(initialMessages);
        
        await processChatLoop(initialMessages, 0);
    };

    const processChatLoop = async (currentMessages: any[], roundtripCount: number = 0) => {
        // Güvenlik: Maksimum 5 tur dönebilir (Sonsuz döngüyü kırar)
        if (roundtripCount >= 5) {
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/emmy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: currentMessages }),
            });
            
            if (!res.ok) throw new Error('API failed');
            
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            
            let assistantMessageId = Date.now().toString() + "-ai";
            let assistantContent = "";
            let assistantParts: any[] = [];
            let hasAddedAssistantMsg = false;
            let currentStreamEnded = false;
            
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');
                    for (const line of lines) {
                        if (line.includes('[DONE]')) {
                            currentStreamEnded = true;
                            continue;
                        }
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                
                                if (data.type === 'text-delta') {
                                    const deltaText = data.textDelta || data.delta || '';
                                    assistantContent += deltaText;
                                    
                                    const lastPart = assistantParts[assistantParts.length - 1];
                                    if (lastPart && lastPart.type === 'text') {
                                        lastPart.text += deltaText;
                                    } else {
                                        assistantParts.push({ type: 'text', text: deltaText });
                                    }
                                } else if (data.type === 'tool-call') {
                                    // Sometimes older format
                                    assistantParts.push({ 
                                        type: `tool-call`,
                                        toolCallId: data.toolCallId,
                                        toolName: data.toolName, 
                                        state: 'input-available',
                                        input: data.args 
                                    });
                                    if (data.toolName === 'create_schedule_draft') {
                                        setDraft(data.args);
                                    }
                                } else if (data.type === 'tool-input-available') {
                                    assistantParts.push({ 
                                        type: `tool-call`,
                                        toolCallId: data.toolCallId,
                                        toolName: data.toolName, 
                                        state: 'input-available',
                                        input: data.input 
                                    });
                                    if (data.toolName === 'create_schedule_draft') {
                                        setDraft(data.input);
                                    }
                                } else if (data.type === 'tool-output-available') {
                                    const part = assistantParts.find(p => p.toolCallId === data.toolCallId);
                                    if (part) {
                                        part.state = 'output-available';
                                        part.output = data.output;
                                        part.providerExecuted = true;
                                    } else {
                                        assistantParts.push({
                                            type: `tool-${data.toolName}`,
                                            toolCallId: data.toolCallId,
                                            toolName: data.toolName,
                                            state: 'output-available',
                                            output: data.output,
                                            providerExecuted: true
                                        });
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing chunk:', line, e);
                            }
                        }
                    }
                    
                    // Update state with accumulated text
                    if (!hasAddedAssistantMsg) {
                        setMessages((prev: any) => {
                            // Sadece aynı ID'ye sahip bir mesaj yoksa ekle (duplicate'i önlemek için)
                            if (prev.some((m: any) => m.id === assistantMessageId)) {
                                return prev.map((m: any) => m.id === assistantMessageId ? {
                                    ...m,
                                    content: assistantContent,
                                    parts: [...assistantParts]
                                } : m);
                            }
                            return [...prev, { 
                                id: assistantMessageId, 
                                role: 'assistant', 
                                content: assistantContent,
                                parts: [...assistantParts]
                            } as any];
                        });
                        hasAddedAssistantMsg = true;
                    } else {
                        setMessages((prev: any) => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            if (last.role === 'assistant' && last.id === assistantMessageId) {
                                last.content = assistantContent;
                                last.parts = [...assistantParts];
                            }
                            return updated;
                        });
                    }
                }
            }

            // Wait a tiny bit to ensure state updates
            await new Promise(resolve => setTimeout(resolve, 100));

            // After stream finishes, check if we need to do another roundtrip
            const hasToolResults = assistantParts.some(p => p.state === 'output-available' && p.providerExecuted === true);

            // PREVENT INFINITE LOOP: Only do another roundtrip if there are NEW tool results that haven't been processed yet
            const previousAssistantMessage = currentMessages[currentMessages.length - 1];
            let isDuplicateRoundtrip = false;
            
            if (previousAssistantMessage && previousAssistantMessage.role === 'assistant') {
                const prevToolCalls = previousAssistantMessage.parts?.filter((p: any) => p.state === 'output-available') || [];
                const currToolCalls = assistantParts.filter(p => p.state === 'output-available');
                
                // If the exact same number of tool calls are present and they have the same IDs, it's a duplicate loop
                if (prevToolCalls.length > 0 && prevToolCalls.length === currToolCalls.length) {
                    isDuplicateRoundtrip = prevToolCalls.every((pt: any) => 
                        currToolCalls.some(ct => ct.toolCallId === pt.toolCallId)
                    );
                }
            }

            if (hasToolResults && currentStreamEnded && !isDuplicateRoundtrip) {
                // Format parts for the next API call so Vercel SDK can parse them
                const formattedPartsForNextCall = assistantParts.map(part => {
                    if (part.state === 'output-available') {
                        return {
                            type: 'tool-result',
                            toolCallId: part.toolCallId,
                            toolName: part.toolName,
                            result: part.output
                        };
                    }
                    if (part.state === 'input-available') {
                        return {
                            type: 'tool-call',
                            toolCallId: part.toolCallId,
                            toolName: part.toolName,
                            args: part.input
                        };
                    }
                    return part;
                });

                const nextMessages = [...currentMessages];
                
                // Add or update the assistant message with FORMATTED parts
                const existingIdx = nextMessages.findIndex(m => m.id === assistantMessageId);
                if (existingIdx >= 0) {
                    nextMessages[existingIdx] = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        parts: formattedPartsForNextCall
                    };
                } else {
                    nextMessages.push({
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        parts: formattedPartsForNextCall
                    });
                }
                
                await processChatLoop(nextMessages, roundtripCount + 1); // Recursive call for the next step
            } else {
                setIsLoading(false); // We are truly done
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setMessages((prev: any) => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Hata oluştu patron. Bağlantıyı kontrol et.' }]);
            setIsLoading(false);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch channels
    useEffect(() => {
        const fetchChannels = async () => {
            const data = await getChannels();
            setChannels(data);
            if (data.length > 0) setSelectedChannelId(data[0].id);
        };
        fetchChannels();
    }, []);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}s ${m}dk ${s}sn` : `${m}dk ${s}sn`;
    };

    const handleSaveDraft = async () => {
        if (!draft || !selectedChannelId) return;
        setSaving(true);
        try {
            // Get the last program to know where to append
            const { getLastProgram } = await import('../../../lib/api');
            const lastProgram = await getLastProgram(selectedChannelId);
            
            let currentStartTime = lastProgram && lastProgram.end_time 
                ? new Date(lastProgram.end_time) 
                : new Date();

            // Append each video sequentially
            for (const video of draft.videos) {
                const durationMs = video.duration * 1000;
                const endTime = new Date(currentStartTime.getTime() + durationMs);

                await addProgram({
                    channel_id: selectedChannelId,
                    title: video.title,
                    description: draft.title, // Use draft title as description/context
                    video_id: video.videoId,
                    duration: video.duration,
                    start_time: currentStartTime.toISOString(),
                    end_time: endTime.toISOString(),
                    thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
                    creator: video.creator || 'Emmy AI',
                });

                currentStartTime = endTime;
            }
            
            alert(`${draft.videos.length} video ${channels.find(c => c.id === selectedChannelId)?.name} kanalına başarıyla eklendi!`);
            
            // Clear draft after save
            setDraft(null);
        } catch (error) {
            console.error('Save failed', error);
            alert('Kaydetme başarısız!');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black font-mono text-white flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT SIDE: Chat Interface */}
            <div className="w-full md:w-1/2 flex flex-col border-r-8 border-[#00FFFF] h-screen bg-[#111]">
                
                {/* Header */}
                <div className="bg-[#00FFFF] p-4 border-b-8 border-black flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-black uppercase tracking-tighter">
                        Emmy'nin Odası_
                    </h1>
                    <div className="flex space-x-2">
                        <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black">
                    {messages.length === 0 && (
                        <div className="text-gray-500 text-center mt-10 p-6 border-4 border-dashed border-gray-800">
                            <p className="text-xl font-bold mb-2">SİSTEM ÇEVRİMİÇİ</p>
                            <p>Emmy hazır. Hangi kanal için yayın akışı oluşturmak istersin?</p>
                            <p className="text-sm mt-4 text-gray-600">Örnek: "Music Box kanalı için 4 saatlik 80'ler rock listesi hazırla."</p>
                        </div>
                    )}
                    
                    {messages.map((m: any) => (
                        <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div 
                                className={`max-w-[85%] p-4 border-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] ${
                                    m.role === 'user' 
                                    ? 'bg-[#FF00FF] border-black text-black' 
                                    : 'bg-[#111] border-[#00FF00] text-[#00FF00]'
                                }`}
                            >
                                <span className="text-xs font-bold opacity-70 uppercase block mb-1">
                                    {m.role === 'user' ? 'Patron' : 'Emmy'}_
                                </span>
                                
                                {/* AI SDK v6+ uses parts array. Fallback to m.content if parts are empty */}
                                {m.parts && m.parts.length > 0 ? (
                                    m.parts.map((part: any, i: number) => {
                                        if (part.type === 'text') {
                                            return <div key={i} className="whitespace-pre-wrap">{part.text}</div>;
                                        }
                                        
                                        const toolName = part.toolName || (part.type && part.type.startsWith('tool-') ? part.type.replace('tool-', '') : '');
                                        
                                        if (part.type === 'tool-call' || (part.type && part.type.startsWith('tool-')) || part.state === 'input-available' || part.state === 'output-available') {
                                            if (toolName === 'searchYouTube') {
                                                if (part.state === 'input-available' || part.type === 'tool-call') {
                                                    return <div key={i} className="mt-3 p-2 bg-black/50 border border-current text-xs font-bold font-sans text-yellow-400 animate-pulse">
                                                        Aranıyor: "{part.input?.query || part.args?.query || 'YouTube'}"...
                                                    </div>;
                                                } else if (part.state === 'output-available' || part.type === 'tool-result') {
                                                    return <div key={i} className="mt-1 text-xs text-green-400 font-bold">
                                                        ✓ Sonuçlar bulundu ve inceleniyor...
                                                    </div>;
                                                }
                                            }
                                            if (toolName === 'create_schedule_draft') {
                                                if (part.state === 'input-available' || part.state === 'output-available' || part.type === 'tool-call' || part.type === 'tool-result') {
                                                    return <div key={i} className="mt-3 p-2 bg-black/50 border border-current text-xs font-bold font-sans text-blue-400">
                                                        Taslak Akış Panoya Gönderildi! 👉
                                                    </div>;
                                                }
                                            }
                                        }
                                        return null;
                                    })
                                ) : (
                                    <div className="whitespace-pre-wrap">{m.content}</div>
                                )}
                                
                                {/* Fallback for AI SDK v3/v4 tool invocations */}
                                {m.toolInvocations?.map((tool: any) => (
                                    <div key={tool.toolCallId} className="mt-3 p-2 bg-black/50 border border-current text-xs font-bold font-sans">
                                        {tool.toolName === 'searchYouTube' && (
                                            <span className="text-yellow-400">Aranıyor: "{tool.args.query}"...</span>
                                        )}
                                        {tool.toolName === 'create_schedule_draft' && (
                                            <span className="text-blue-400">Taslak Akış Panoya Gönderildi! 👉</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex items-start">
                            <div className="bg-[#111] border-4 border-[#00FF00] text-[#00FF00] p-4 flex items-center gap-3">
                                <Loader2 className="animate-spin" size={20} />
                                <span className="font-bold animate-pulse">EMMY DÜŞÜNÜYOR...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-6 bg-[#111] border-t-4 border-gray-800">
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Emmy'ye talimat ver..."
                            className="flex-1 bg-black border-4 border-[#00FFFF] text-white p-4 font-bold focus:outline-none focus:border-white transition-colors"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input}
                            className="bg-[#00FFFF] text-black px-6 py-4 font-bold border-4 border-black hover:bg-white disabled:opacity-50 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
                        >
                            <Send size={24} />
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDE: Draft Board */}
            <div className="w-full md:w-1/2 flex flex-col h-screen bg-[#111] relative">
                
                {/* Header */}
                <div className="bg-[#FF00FF] p-4 border-b-8 border-black flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-black uppercase tracking-tighter">
                        Çalışma Masası_
                    </h2>
                    
                    <select 
                        value={selectedChannelId}
                        onChange={(e) => setSelectedChannelId(e.target.value)}
                        className="bg-black text-white font-bold p-2 border-4 border-black outline-none shadow-[2px_2px_0px_0px_#FFF]"
                    >
                        {channels.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Draft Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!draft ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-4">
                            <Video size={64} />
                            <p className="text-xl font-bold uppercase text-center">Taslak Akış Bekleniyor...</p>
                            <p className="text-sm text-center max-w-xs">Emmy'ye bir liste hazırlat. Sonuçlar burada onayına sunulacak.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-black p-6 border-4 border-[#00FF00] shadow-[8px_8px_0px_0px_rgba(0,255,0,0.5)]">
                                <h3 className="text-2xl font-bold text-[#00FF00] uppercase mb-2">
                                    {draft.title}
                                </h3>
                                <p className="text-gray-400 font-bold">
                                    Toplam {draft.videos.length} Video | ~{formatDuration(draft.videos.reduce((acc: number, v: any) => acc + v.duration, 0))}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {draft.videos.map((v: any, index: number) => (
                                    <div key={index} className="bg-[#222] p-4 border-l-8 border-[#FF00FF] flex justify-between items-center">
                                        <div className="flex-1 mr-4">
                                            <p className="text-white font-bold line-clamp-1">{v.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">{v.creator} • {v.videoId}</p>
                                        </div>
                                        <div className="text-[#00FFFF] font-bold bg-black px-3 py-1 border border-gray-700">
                                            {formatDuration(v.duration)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Draft Actions */}
                <div className="p-6 bg-black border-t-4 border-[#FF00FF] flex justify-end gap-4">
                    <button 
                        onClick={() => setDraft(null)}
                        disabled={!draft}
                        className="px-6 py-4 bg-gray-800 text-white font-bold border-4 border-black hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={20} /> Çöpe At
                    </button>
                    <button 
                        onClick={handleSaveDraft}
                        disabled={!draft || saving}
                        className="px-8 py-4 bg-[#00FF00] text-black font-bold border-4 border-black hover:bg-white disabled:opacity-50 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        ONAYLA VE YAYINA AL
                    </button>
                </div>
            </div>
        </div>
    );
}