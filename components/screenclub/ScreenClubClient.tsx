'use client';

import React, { useState, useEffect, useRef } from 'react';
import StablePlayer from '@/components/StablePlayer';
import { supabase } from '@/lib/supabase';
import { getCurrentProgram } from '@/lib/api';
import { Program } from '@/data/mockData';

export default function ScreenClubClient() {
  const [nickname, setNickname] = useState<string>('');
  const [hasJoined, setHasJoined] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TVG Video States
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [initialOffset, setInitialOffset] = useState(0);
  const lastProgramIdRef = useRef<string | null>(null);

  // TVG Kanalını Çekme Mantığı
  useEffect(() => {
    let isCancelled = false;
    // TVG kanalının id'sini hardcode verebiliriz veya slug ile bulabiliriz.
    // Şimdilik TVG'nin id'sini bilmediğimiz için önce kanalları çekip tvg'yi bulmamız en sağlamı.
    // Ya da direkt "tvg" slug'lı kanalı getChannels() ile bulabiliriz.
    const fetchTvgProgram = async () => {
      if (isCancelled) return;
      try {
        const { getChannels } = await import('@/lib/api');
        const channels = await getChannels();
        const tvgChannel = channels.find((c: any) => c.slug === 'tvg');
        
        if (tvgChannel) {
          const { current, offset } = await getCurrentProgram(tvgChannel.id);
          if (isCancelled) return;

          if (current) {
            if (lastProgramIdRef.current !== current.id) {
              lastProgramIdRef.current = current.id;
              setInitialOffset(offset);
              setCurrentProgram(current);
            }
          } else {
            lastProgramIdRef.current = null;
            setCurrentProgram(null);
          }
        }
      } catch (err) {
        console.error('Error fetching TVG program for Screen Club:', err);
      }
    };

    fetchTvgProgram();
    const pollInterval = setInterval(fetchTvgProgram, 10000); // Her 10 saniyede bir kontrol et

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, []);

  // Sadece nickname kontrolü için basit bir onMount
  useEffect(() => {
    const saved = localStorage.getItem('screen_club_nickname');
    if (saved) {
      setNickname(saved);
      setHasJoined(true);
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Supabase Realtime & Fetch Initial Messages
  useEffect(() => {
    if (!hasJoined) return;

    // Son 50 mesajı getir
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('screen_club_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setMessages(data.reverse());
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel('screen_club_messages_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'screen_club_messages' },
        (payload) => {
          setMessages((prev) => {
            // Optimistik olarak eklediğimiz mesajın Realtime'dan tekrar gelmesini engellemek için basit kontrol
            const isDuplicate = prev.some(m => m.nickname === payload.new.nickname && m.message === payload.new.message);
            if (isDuplicate) return prev;

            const newMessages = [...prev, payload.new];
            // Son 100 mesajı tutarak DOM'u koru
            if (newMessages.length > 100) {
              return newMessages.slice(newMessages.length - 100);
            }
            return newMessages;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasJoined]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    
    const cleanNick = nicknameInput.trim().substring(0, 15); // max 15 char
    localStorage.setItem('screen_club_nickname', cleanNick);
    setNickname(cleanNick);
    setHasJoined(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;

    const text = messageInput.trim();
    setMessageInput('');
    // setIsSending(true); // Optimistik UI için bekletmeye gerek yok

    // 1. Optimistik olarak UI'a ekle
    const tempId = Date.now().toString();
    const newMessage = {
      id: tempId,
      nickname,
      message: text,
      is_emmy: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => {
      const newMessages = [...prev, newMessage];
      if (newMessages.length > 100) return newMessages.slice(newMessages.length - 100);
      return newMessages;
    });

    try {
      // 2. Supabase'e kaydet (Realtime ile bize de gelecek ama biz id ile duplicate önleyebiliriz veya basitçe ignore edebiliriz)
      const { error } = await supabase.from('screen_club_messages').insert([
        {
          nickname,
          message: text,
          is_emmy: false
        }
      ]);

      if (error) {
        console.error('Supabase Insert Error:', error);
        // İstenirse hata durumunda mesaj UI'dan geri alınabilir
      }

      // 3. Eğer @emmy içeriyorsa AI'ı tetikle
      if (text.toLowerCase().includes('@emmy')) {
        // AI isteğini arka planda yapıyoruz (bekletmiyoruz)
        fetch('/api/emmy-club', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, nickname }),
        }).catch(err => console.error('Emmy api error:', err));
      }
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    }
  };

  return (
    <div className="w-full h-screen bg-[#131313] text-white flex flex-col md:flex-row overflow-hidden font-jetbrains">
      {/* LEFT: Video Area (70%) */}
      <div className="w-full md:w-[75%] h-[50vh] md:h-full relative border-b md:border-b-0 md:border-r border-[#00ff00]/30 bg-black">
        {/* Placeholder for Video. In the future, this will fetch the screen club's current program */}
        <div className="absolute top-4 left-4 z-10 text-[#00b7ff] bg-black/80 px-2 py-1 text-sm border border-[#00b7ff]/30">
          [ SCREEN CLUB - ON AIR ]
        </div>
        
        {currentProgram ? (
          <div className="w-full h-full relative pointer-events-none">
            <StablePlayer 
              url={`https://www.youtube.com/watch?v=${currentProgram.videoId}`}
              initialStart={initialOffset}
              volume={100} // Default ses açık
            />
            {/* Title Overlay */}
            <div className="absolute bottom-4 left-4 z-10 bg-black/80 px-4 py-2 border border-[#d3f800]/30">
              <p className="text-[#d3f800] text-sm font-bold">TVG SİNYALİ AKTARILIYOR_</p>
              <p className="text-white text-xs">{currentProgram.title}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#d3f800]/50 animate-pulse">
            <div className="text-center">
              <p className="text-2xl mb-2">SİNYAL BEKLENİYOR_</p>
              <p className="text-sm opacity-50">TVG yayın akışı yükleniyor...</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Chat Area (25%) */}
      <div className="w-full md:w-[25%] h-[50vh] md:h-full flex flex-col bg-[#131313]">
        <div className="p-4 border-b border-[#00ff00]/30 flex items-center justify-between shrink-0">
          <h2 className="text-[#00ff00] font-bold text-lg tracking-wider">&gt; CHAT</h2>
          {hasJoined && (
            <span className="text-xs text-[#d3f800]">@{nickname}</span>
          )}
        </div>

        {!hasJoined ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
            <div className="text-center space-y-2 mb-4">
              <p className="text-[#00b7ff] text-xl font-bold">GİRİŞ YAP_</p>
              <p className="text-xs text-gray-400">Screen Club'a katılmak için bir nick belirle.</p>
            </div>
            
            <form onSubmit={handleJoin} className="w-full space-y-4">
              <input 
                type="text" 
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={15}
                placeholder="NICKNAME_"
                className="w-full bg-black border border-[#00ff00] text-[#00ff00] p-3 focus:outline-none focus:ring-1 focus:ring-[#00ff00] uppercase placeholder-[#00ff00]/30"
              />
              <button 
                type="submit"
                className="w-full bg-[#00ff00] text-black font-bold p-3 hover:bg-[#d3f800] transition-colors"
              >
                BAĞLAN &gt;
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
              <div className="text-gray-400 italic text-xs mb-4 text-center">
                -- Bağlantı kuruldu. Kurallar: Yok. --
              </div>
              
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className="break-words">
                  <span className={`font-bold ${msg.is_emmy ? 'text-[#00b7ff]' : 'text-[#d3f800]'}`}>
                    @{msg.nickname}:
                  </span> 
                  <span className="text-gray-300 ml-2">{msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#00ff00]/30 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input 
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Mesaj yaz... (@emmy ile yapay zekaya seslen)"
                  className="flex-1 bg-black border border-[#00ff00]/50 text-white p-2 focus:outline-none focus:border-[#00ff00]"
                  disabled={isSending}
                />
                <button 
                  type="submit"
                  disabled={isSending || !messageInput.trim()}
                  className="bg-[#00ff00]/20 text-[#00ff00] border border-[#00ff00] px-4 hover:bg-[#00ff00] hover:text-black transition-colors disabled:opacity-50"
                >
                  &gt;
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
