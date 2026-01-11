
import musicBoxData from './channel-musicbox.json';

export interface Channel {
  id: string;
  name: string;
  slug: string;
  logo: string;
  color: string;
}

export interface Program {
  id: string;
  channelId: string;
  title: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  date: string; // YYYY-MM-DD format
  description?: string;
  thumbnail?: string;
  isLive?: boolean;
  category?: 'movie' | 'news' | 'sports' | 'kids' | 'documentary' | 'entertainment';
  videoId: string; // YouTube Video ID
}

export interface HeroContent {
  title: string;
  description: string;
  image: string;
  channelName: string;
  tags: string[];
  videoId: string; // YouTube Video ID for Hero
}

export const channels: Channel[] = [
  { id: 'c1', name: 'TechVision', slug: 'tech-vision', logo: 'TV', color: '#8b5cf6' },
  { id: 'c2', name: 'GameZone', slug: 'game-zone', logo: 'GZ', color: '#ef4444' },
  { id: 'c3', name: 'NatureDoc', slug: 'nature-doc', logo: 'ND', color: '#10b981' },
  { id: 'c4', name: 'MusicBox', slug: 'music-box', logo: 'MB', color: '#f59e0b' },
  { id: 'c5', name: 'CodeLive', slug: 'code-live', logo: 'CL', color: '#3b82f6' },
  { id: 'c6', name: 'RetroCade', slug: 'retro-cade', logo: 'RC', color: '#ec4899' },
  { id: 'c7', name: 'Foodie', slug: 'foodie', logo: 'FD', color: '#f97316' },
];

export const heroContent: HeroContent = {
  title: "Cyberpunk 2077: Phantom Liberty",
  description: "Night City'nin karanlık sokaklarına geri dönün. V, yeni bir casusluk ve entrika ağının içine çekiliyor. Dogtown'ın tehlikeli bölgelerini keşfedin ve hayatta kalmak için yeni müttefikler edinin.",
  image: "https://images.unsplash.com/photo-1533972724312-6eaefaed6179?q=80&w=2669&auto=format&fit=crop",
  channelName: "GameZone",
  tags: ["Gaming", "Action", "RPG", "Live"],
  videoId: "P99qJGrPNLs" // Cyberpunk 2077 Phantom Liberty Trailer
};

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper to add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Random YouTube IDs for simulation
const randomVideoIds = [
    'dQw4w9WgXcQ', // Rick Roll
    'L_jWHffIx5E', // Smash Mouth
    '9bZkp7q19f0', // Gangnam Style
    'kJQP7kiw5Fk', // Despacito
    'JGwWNGJdvx8', // Ed Sheeran
    'OPf0YbXqDm0', // Uptown Funk
    '09R8_2nJtjg', // Maroon 5
    'fRh_vgS2dFE', // Justin Bieber
];

// Helper to extract video ID from URL
const extractVideoId = (url: string): string => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : '';
};

// Generate programs for the next 7 days
const generatePrograms = (): Program[] => {
  const allPrograms: Program[] = [];
  const today = new Date();
  
  // Initialize MusicBox state (Start from Today 06:00)
  let musicBoxCurrentTime = new Date(today);
  musicBoxCurrentTime.setHours(6, 0, 0, 0);
  let musicBoxVideoIndex = 0;

  // Program templates to randomize
  const programTemplates = [
    { title: 'Sabah Haberleri', duration: 60, category: 'news' },
    { title: 'Teknoloji Günlüğü', duration: 45, category: 'news' },
    { title: 'Yemek Vakti', duration: 30, category: 'entertainment' },
    { title: 'Belgesel Kuşağı', duration: 90, category: 'documentary' },
    { title: 'Öğle Arası Müzik', duration: 60, category: 'entertainment' },
    { title: 'Çizgi Film Saati', duration: 45, category: 'kids' },
    { title: 'Akşam Bülteni', duration: 60, category: 'news' },
    { title: 'Prime Time Sinema', duration: 120, category: 'movie' },
    { title: 'Gece Sohbeti', duration: 90, category: 'entertainment' },
    { title: 'Spor Özeti', duration: 45, category: 'sports' },
    { title: 'Yazılım Dünyası', duration: 60, category: 'documentary' },
    { title: 'Oyun İncelemeleri', duration: 45, category: 'entertainment' },
    { title: 'Doğa Gezginleri', duration: 60, category: 'documentary' },
    { title: 'Retro Müzik', duration: 30, category: 'entertainment' },
    { title: 'Bilim Kurgu Klasikleri', duration: 120, category: 'movie' },
    { title: 'Futbol Analiz', duration: 90, category: 'sports' },
  ] as const;

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(today, i);
    const dateStr = formatDate(currentDate);
    
    // Define the end of this broadcast day (next day 06:00)
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(30, 0, 0, 0); // Next day 06:00

    channels.forEach(channel => {
      // Special handling for TechVision (c1) to have fixed schedule with long videos
      if (channel.id === 'c1') {
        const fixedSchedule = [
            { startH: 6, startM: 0, durationM: 28, title: "Tavana Ofis Kurdum (Vlog)", videoId: "VzpY2800x5c", category: 'entertainment' },
            { startH: 6, startM: 28, durationM: 23, title: "CGI Analizi: İyi ve Kötü Efektler", videoId: "E797xpV6urA", category: 'documentary' },
            { startH: 6, startM: 51, durationM: 20, title: "Çılgın Xiaomi Ürünleri Testi", videoId: "iiOi4rD83kM", category: 'news' },
            { startH: 7, startM: 11, durationM: 55, title: "Chillhouse Mix , A Cold Sunrise Set By Jai Cuzco", videoId: "nrHw4h4hNEc", category: 'entertainment' },
            { startH: 8, startM: 6, durationM: 30, title: "HANDING THEM THE MIC… WHAT HAPPENS NEXT?! 🤯", videoId: "ANSw_SowLjM", category: 'entertainment' },
            { startH: 8, startM: 36, durationM: 50, title: "chill mix with Japanese grandpa at a stationery shop", videoId: "pJ8EyNFg9Dk", category: 'entertainment' },
            { startH: 9, startM: 26, durationM: 2, title: "Can you drive west to lengthen the sunset?", videoId: "U8F7UNK9jco", category: 'documentary' },
            { startH: 9, startM: 28, durationM: 2, title: "Could we survive eating only humans?", videoId: "PUtI3xoaHx0", category: 'documentary' },
            { startH: 9, startM: 30, durationM: 2, title: "What if the Moon were made entirely of electrons?", videoId: "DiWFXv9N0Vs", category: 'documentary' },
            { startH: 9, startM: 32, durationM: 1, title: "How fast could a vehicle go around a track?", videoId: "rgUfcFAPicY", category: 'sports' },
            { startH: 9, startM: 33, durationM: 3, title: "What if the moon turned into a black hole?", videoId: "UQgw50GQu1A", category: 'documentary' },
            { startH: 9, startM: 36, durationM: 3, title: "What if you funneled Niagara Falls through a straw?", videoId: "pfbzrrcQZjs", category: 'documentary' },
            { startH: 9, startM: 39, durationM: 5, title: "What if Earth grew 1cm every second?", videoId: "-1-ldW4kpLM", category: 'documentary' },
            { startH: 9, startM: 44, durationM: 3, title: "What if everyone jumped at once?", videoId: "p2M8Y0z9Rl0", category: 'documentary' },
            { startH: 9, startM: 47, durationM: 4, title: "What if NASCAR had no rules?", videoId: "JcXpCyPc2Xw", category: 'sports' },
            { startH: 9, startM: 51, durationM: 300, title: "5 Saatlik Odaklanma Maratonu", videoId: "27iu423Yjtc", category: 'documentary' }, 
            { startH: 14, startM: 51, durationM: 480, title: "8 Saatlik Derin Çalışma Müzikleri", videoId: "ZjP4PF_uX7A", category: 'entertainment' }, 
            { startH: 22, startM: 51, durationM: 600, title: "Gece Yayını: 10 Saatlik Lofi", videoId: "f1A7SdVTlok", category: 'entertainment' } 
        ];

        fixedSchedule.forEach(item => {
            const startTotalMinutes = item.startH * 60 + item.startM;
            const endTotalMinutes = startTotalMinutes + item.durationM;
            
            const startH = Math.floor(startTotalMinutes / 60) % 24;
            const startM = startTotalMinutes % 60;
            const endH = Math.floor(endTotalMinutes / 60) % 24;
            const endM = endTotalMinutes % 60;
            
            const startTime = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
            const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
            
            allPrograms.push({
                id: `${channel.id}-${dateStr}-${startTime}`,
                channelId: channel.id,
                title: item.title,
                startTime,
                endTime,
                date: dateStr,
                description: `TechVision özel yayını: ${item.title}`,
                isLive: false,
                category: item.category as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                videoId: item.videoId
            });
        });
        return;
      }

      // Special handling for MusicBox (c4) - Real Data from JSON
      if (channel.id === 'c4') {
          // Fill the schedule until we pass the end of this day's window
          while (musicBoxCurrentTime.getTime() < dayEnd.getTime()) {
              const video = musicBoxData[musicBoxVideoIndex];
              const videoId = extractVideoId(video['Video url']);
              
              const startH = musicBoxCurrentTime.getHours();
              const startM = musicBoxCurrentTime.getMinutes();
              const startTimeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

              // Add duration
              const durationSeconds = video['Duration in seconds'];
              const endTimeDate = new Date(musicBoxCurrentTime.getTime() + durationSeconds * 1000);
              
              const endH = endTimeDate.getHours();
              const endM = endTimeDate.getMinutes();
              const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

              // Determine the "date" for this program entry
              // The schedule grid filters by 'date' string (YYYY-MM-DD).
              // Even if the program spills into next day (e.g. 01:00 AM), it should be associated with the "broadcast day" if we want it to show up?
              // The ScheduleGrid filters by `p.date === selectedDate`.
              // And handles `hours < START_HOUR` as `adjustedHours += 24`.
              // So if the program starts at 01:00 AM on Jan 12, but we are viewing Jan 11 (Broadcast day Jan 11 06:00 - Jan 12 06:00),
              // We should probably mark it as Jan 11?
              // Let's stick to the current logic: The `date` field in `Program` matches the `selectedDate` (tab).
              // If a program starts at 01:00 AM (next calendar day), but falls within the 06:00-06:00 broadcast window of 'today', 
              // it should technically belong to 'today' for the Grid to render it correctly with the `adjustedHours` logic.
              
              // However, `musicBoxCurrentTime` is a real Date object incrementing correctly.
              // If `musicBoxCurrentTime` is Jan 12 01:00, `dateStr` (loop variable) is Jan 11.
              // We should use `dateStr` for the program to ensure it appears in the current tab's grid.
              
              allPrograms.push({
                  id: `${channel.id}-${dateStr}-${startTimeStr}-${videoId}`,
                  channelId: channel.id,
                  title: video.Title,
                  startTime: startTimeStr,
                  endTime: endTimeStr,
                  date: dateStr, // Force it to belong to the current broadcast day
                  description: video.Description,
                  thumbnail: video['Thumbnail url'],
                  isLive: false,
                  category: 'entertainment',
                  videoId: videoId
              });

              // Advance time and index
              musicBoxCurrentTime = endTimeDate;
              musicBoxVideoIndex = (musicBoxVideoIndex + 1) % musicBoxData.length;
          }
          return;
      }

      let currentHour = 6; // Start at 06:00
      let currentMinute = 0;

      while (currentHour < 30) { // Go until 06:00 next day
        const template = programTemplates[Math.floor(Math.random() * programTemplates.length)];
        
        let title: string = template.title;
        let category = template.category;
        
        if (channel.id === 'c2' && Math.random() > 0.5) { title = 'E-Spor Arenası'; category = 'sports'; }
        if (channel.id === 'c3' && Math.random() > 0.5) { title = 'Vahşi Yaşam'; category = 'documentary'; }
        
        const startH = currentHour % 24;
        const startM = currentMinute;
        const startTime = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

        let duration = template.duration;
        if (Math.random() > 0.7) duration += 15;
        
        let endTotalMinutes = (currentHour * 60) + currentMinute + duration;
        let endHour = Math.floor(endTotalMinutes / 60);
        let endMinute = endTotalMinutes % 60;
        
        const endH = endHour % 24;
        const endM = endMinute;
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
        
        const videoId = randomVideoIds[Math.floor(Math.random() * randomVideoIds.length)];

        allPrograms.push({
          id: `${channel.id}-${dateStr}-${startTime}`,
          channelId: channel.id,
          title: `${title}`,
          startTime,
          endTime,
          date: dateStr,
          description: `Bu programda ${title.toLowerCase()} hakkında en güncel bilgiler yer alıyor.`,
          isLive: false,
          category: category as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          videoId
        });

        currentHour = endHour;
        currentMinute = endMinute;
      }
    });
  }

  return allPrograms;
};

export const programs = generatePrograms();

// Generate 24h time slots starting from 00:00
export const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30; // Start at 00:00, 30 min increments
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});
