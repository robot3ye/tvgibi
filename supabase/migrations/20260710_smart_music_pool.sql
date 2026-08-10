-- Müzik kanalları ve akıllı rotasyon (Smart Pool) için gerekli veritabanı altyapısı
-- Bu tablo, videoları kategorize ederek büyük bir "Havuz" (Pool) oluşturmamızı sağlar.

-- 1. Video Havuzu Tablosu
CREATE TABLE IF NOT EXISTS public.content_pool (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    creator TEXT,
    duration INTEGER NOT NULL, -- saniye cinsinden
    category TEXT NOT NULL, -- Örn: '90s_pop', 'rock', 'synthwave', 'slow', 'arabesk'
    energy_level INTEGER DEFAULT 5, -- 1-10 arası (Gece/Gündüz akışını ayarlamak için)
    play_count INTEGER DEFAULT 0, -- Şarkının kaç kere çalındığını tutar (optimizasyon için)
    last_played_at TIMESTAMP WITH TIME ZONE, -- En son ne zaman çalındı (tekrarı önlemek için)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Kanal - Kategori Eşleştirme Tablosu
-- Hangi kanalın, havuzdaki hangi kategorilerden besleneceğini belirler.
CREATE TABLE IF NOT EXISTS public.channel_pool_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- '90s_pop'
    weight INTEGER DEFAULT 1, -- Olasılık ağırlığı (Örn: 90s Pop ağırlığı 3, Rock ağırlığı 1 ise Pop daha sık çalar)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, category)
);

-- RLS (Row Level Security) Politikaları
ALTER TABLE public.content_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_pool_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on content_pool" 
    ON public.content_pool FOR SELECT USING (true);
    
CREATE POLICY "Enable all access for authenticated users on content_pool" 
    ON public.content_pool FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users on channel_pool_config" 
    ON public.channel_pool_config FOR SELECT USING (true);
    
CREATE POLICY "Enable all access for authenticated users on channel_pool_config" 
    ON public.channel_pool_config FOR ALL USING (auth.role() = 'authenticated');

-- İndeksler (Performans için)
CREATE INDEX IF NOT EXISTS idx_content_pool_category ON public.content_pool(category);
CREATE INDEX IF NOT EXISTS idx_content_pool_last_played ON public.content_pool(last_played_at);
