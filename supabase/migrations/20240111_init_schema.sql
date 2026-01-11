
-- 1. Kanallar Tablosu
create table if not exists channels (
  id text primary key, -- örn: 'music-box'
  name text not null,
  description text,
  color text default '#000000',
  logo text
);

-- 2. Yayın Akışı (Programlar) Tablosu
create table if not exists programs (
  id uuid default gen_random_uuid() primary key,
  channel_id text references channels(id) not null,
  title text not null,
  description text,
  video_id text not null, -- YouTube Video ID
  duration integer not null, -- Saniye
  start_time timestamptz not null,
  end_time timestamptz not null,
  thumbnail text,
  created_at timestamptz default now()
);
