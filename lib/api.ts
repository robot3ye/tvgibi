
import { supabase } from './supabase';
import { Channel, Program } from '../data/mockData';

// Map DB Channel to Frontend Channel
const mapChannel = (dbChannel: any): Channel => {
  try {
      return {
          id: dbChannel.id,
          name: dbChannel.name || 'Bilinmeyen Kanal',
          slug: dbChannel.id, // Using ID as slug since we set 'music-box' as ID
          logo: dbChannel.logo_corner || dbChannel.logo || (dbChannel.name ? dbChannel.name.substring(0, 2).toUpperCase() : 'TV'), 
          color: dbChannel.color_primary || dbChannel.color || '#000000',
          logo_corner: dbChannel.logo_corner,
          logo_main: dbChannel.logo_main,
          color_primary: dbChannel.color_primary,
          color_secondary: dbChannel.color_secondary,
          motto: dbChannel.motto,
          age_range: dbChannel.age_range,
          editors: dbChannel.editors || [],
          is_online: dbChannel.is_online ?? true,
          sort_order: dbChannel.sort_order || 0,
      };
  } catch (err) {
      console.error('Error mapping channel:', dbChannel, err);
      // Return a safe fallback so the whole app doesn't crash
      return {
          id: dbChannel?.id || 'error-id',
          name: 'Hatalı Kanal',
          slug: 'error-slug',
          logo: 'ERR',
          color: '#ff0000'
      };
  }
};

// Map DB Program to Frontend Program
const mapProgram = (dbProgram: any): Program => {
    // Calculate startTime and endTime strings (HH:mm)
    const startDate = new Date(dbProgram.start_time);
    const endDate = new Date(dbProgram.end_time);
    
    // Format HH:mm
    const formatTime = (date: Date) => {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    // Format YYYY-MM-DD (Local Time)
    // We use 'en-CA' because it outputs YYYY-MM-DD format which is what we need for sorting/filtering strings
    const dateStr = startDate.toLocaleDateString('en-CA'); 

    return {
        id: dbProgram.id,
        channelId: dbProgram.channel_id,
        title: dbProgram.title,
        startTime: formatTime(startDate),
        endTime: formatTime(endDate),
        date: dateStr,
        description: dbProgram.description,
        thumbnail: dbProgram.thumbnail,
        isLive: false, // Calculated on frontend usually, or we can check here
        category: 'entertainment', // Default or add to DB
        videoId: dbProgram.video_id,
        duration: dbProgram.duration,
        creator: dbProgram.creator, // Add creator mapping
    };
};

export const getChannels = async (): Promise<Channel[]> => {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('sort_order', { ascending: true }) // Sort by the new sort_order column
    .order('name', { ascending: true }); // Fallback to name
  
  if (error) {
    console.error('Error fetching channels:', error.message, error.details, error.hint);
    return [];
  }

  if (!data) return [];

  return data.map(mapChannel);
};

export const updateChannel = async (channelId: string, updates: any) => {
    // We only update the 'id' (which acts as our slug) in the database
    // The DB does not have a 'slug' column, we use 'id' for the URL slug.
    if (updates.name && !updates.id) {
        updates.id = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    
    // Ensure we don't accidentally send a 'slug' field to the database
    const dbUpdates = { ...updates };
    delete dbUpdates.slug;

    const { data, error } = await supabase
        .from('channels')
        .update(dbUpdates)
        .eq('id', channelId)
        .select()
        .single();
        
    if (error) {
        console.error('Error updating channel:', error);
        throw error;
    }
    return mapChannel(data);
};

export const updateChannelsOrder = async (channelIds: string[]) => {
    const updates = channelIds.map((id, index) => ({
        id,
        sort_order: index + 1
    }));
    
    // We have to update one by one or use an RPC. For simplicity and small lists, Promise.all is fine.
    await Promise.all(updates.map(update => 
        supabase
            .from('channels')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
    ));
};

export const addChannel = async (channelData: any) => {
    // Generate slug from name if not provided
    if (!channelData.slug) {
        channelData.slug = channelData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    
    // Ensure we also save to legacy fields for safety, though mapped properly
    const dbPayload = {
        id: channelData.slug, // Use slug as ID to match existing logic
        name: channelData.name,
        logo: channelData.logo_corner, // Fallback
        color: channelData.color_primary, // Fallback
        logo_corner: channelData.logo_corner,
        logo_main: channelData.logo_main,
        color_primary: channelData.color_primary,
        color_secondary: channelData.color_secondary,
        motto: channelData.motto,
        age_range: channelData.age_range,
        editors: channelData.editors || [],
    };

    const { data, error } = await supabase
        .from('channels')
        .insert([dbPayload])
        .select()
        .single();
    
    if (error) {
        console.error('Error adding channel:', error);
        throw error;
    }
    
    return mapChannel(data);
};

export const uploadChannelLogo = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
        .from('channel-logos')
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('channel-logos')
        .getPublicUrl(path);
        
    return publicUrl;
};

export const deleteChannel = async (channelId: string) => {
    // 1. Önce bu kanala ait olan tüm programları sil (Foreign key constraint hatasını önlemek için)
    const { error: programsError } = await supabase
        .from('programs')
        .delete()
        .eq('channel_id', channelId);
        
    if (programsError) {
        console.error('Error deleting channel programs:', programsError);
        throw programsError;
    }

    // 2. Sonra kanalı sil
    const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);
    
    if (error) {
        console.error('Error deleting channel:', error);
        throw error;
    }
};

export const getProgramsForDate = async (date: string): Promise<Program[]> => {
    console.log('[API] Fetching programs for date:', date);
    
    // Start of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    // End of day
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('[API] Query range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

    const { data, error } = await supabase
        .from('programs')
        .select('*')
        // Logic: Program START time <= End of Day AND Program END time >= Start of Day
        // This finds all overlaps with the selected 00:00-23:59 day.
        .lte('start_time', endOfDay.toISOString()) 
        .gte('end_time', startOfDay.toISOString())
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching programs:', error);
        return [];
    }

    console.log(`[API] Found ${data.length} programs in raw DB query`);

    // Map and adjust for the view
    return data.map((dbProgram) => {
        const p = mapProgram(dbProgram);
        const pStart = new Date(dbProgram.start_time);
        const pEnd = new Date(dbProgram.end_time);

        // Clip to view window for display purposes
        if (pStart < startOfDay) {
            p.startTime = "00:00";
        }
        
        if (pEnd > endOfDay) {
            // Check if it really goes beyond 23:59
            // If it ends exactly at 00:00 next day (e.g. midnight), it's 24:00 or 00:00?
            // "24:00" is usually understood as end of day.
            p.endTime = "24:00";
        }
        
        // Force date to match selected date so it passes any strict filtering (if any)
        // and logic in grid relies on it.
        p.date = date; 
        
        return p;
    });
};

export const addProgram = async (program: any) => {
    const { data, error } = await supabase
        .from('programs')
        .insert(program)
        .select()
        .single();
    
    if (error) {
        console.error('Error adding program:', error);
        throw error;
    }
    return data;
};

export const deleteProgram = async (programId: string) => {
    const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId);
    
    if (error) {
        console.error('Error deleting program:', error);
        throw error;
    }
};

export const deletePrograms = async (programIds: string[]) => {
    const { error } = await supabase
        .from('programs')
        .delete()
        .in('id', programIds);
    
    if (error) {
        console.error('Error deleting programs:', error);
        throw error;
    }
};

export const updateProgram = async (programId: string, updates: any) => {
    const { data, error } = await supabase
        .from('programs')
        .update(updates)
        .eq('id', programId)
        .select()
        .single();
        
    if (error) {
        console.error('Error updating program:', error);
        throw error;
    }
    return data;
};

export const getLastProgram = async (channelId: string) => {
    const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('channel_id', channelId)
        .order('end_time', { ascending: false })
        .limit(1)
        .single();
        
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last program:', error);
    }
    
    return data;
};

export const getProgramsForChannel = async (channelId: string) => {
    // Fetch ALL programs for the channel, or at least a wider range to support Admin view of past days
    // Admin panel filtering is done client-side, so we need to fetch enough data.
    // Let's fetch past 7 days and future 7 days for now to be safe and cover "Today" properly even if it's late at night.
    
    const now = new Date();
    const startFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    
    const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('channel_id', channelId)
        .gte('end_time', startFilter)
        .order('start_time', { ascending: true });
        
    if (error) {
        console.error('Error fetching channel programs:', error);
        return [];
    }
    
    return data.map(mapProgram);
};

export const reorderPrograms = async (programs: Program[], startTimeIso?: string) => {
    if (programs.length === 0) return;

    let anchorDate: Date;

    if (startTimeIso) {
        anchorDate = new Date(startTimeIso);
    } else {
        // Fallback: Use the first program's current start time as the anchor
        const p = programs[0];
        const [h, m] = p.startTime.split(':').map(Number);
        const d = new Date(p.date); 
        d.setHours(h, m, 0, 0);
        anchorDate = d;
    }

    // Set 24h Boundary based on Anchor Date (00:00 - 23:59:59 of that day)
    const dayStart = new Date(anchorDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const updates = [];
    let currentStart = anchorDate;

    for (const prog of programs) {
        // Calculate new End Time
        const durationMs = prog.duration * 1000;
        let newEndTime = new Date(currentStart.getTime() + durationMs);

        // --- Overflow Check ---
        // If start time is already beyond day end, we stop scheduling this and subsequent items?
        // Or we clamp them?
        // Requirement: "Seçili gün için yaptığı tüm ekleme/çıkarma/sıralama değişiklikleri bir sonraki günü etkilemesin."
        
        // If a program goes beyond 23:59:59, we let it finish naturally in DB (so it plays),
        // BUT we must ensure the *Next Day's* programs are NOT pushed by this.
        // Since we are only reordering 'programs' list which is filtered by 'selectedDate' in frontend,
        // we are implicitly only touching today's items.
        
        // However, if we push a video so it ends at 00:15 tomorrow, 
        // does it conflict with tomorrow's 00:00 video?
        // Yes, in a continuous stream it would. 
        // But in "Broadcast Day" logic, tomorrow starts at 00:00 fresh.
        // So this overflow is acceptable as "Sarkma" (Overrun), 
        // OR we enforce a hard cut at 23:59:59.
        
        // For now, let's allow it to be written as is. 
        // The key is that we are NOT fetching/updating tomorrow's videos here.
        
        updates.push({
            id: prog.id,
            start_time: currentStart.toISOString(),
            end_time: newEndTime.toISOString()
        });

        // Advance anchor
        currentStart = newEndTime;
    }

    console.log(`[API] Reordering ${updates.length} programs starting from ${updates[0].start_time}`);

    // Sequential update to ensure safety, or parallel if confident.
    // Parallel is faster.
    await Promise.all(updates.map(update => 
        supabase
            .from('programs')
            .update({ 
                start_time: update.start_time, 
                end_time: update.end_time 
            })
            .eq('id', update.id)
    ));
};

export const getCurrentProgram = async (channelId: string) => {
    const now = new Date();
    const nowISO = now.toISOString();

    // 1. Get Current Program
    const { data: currentData, error: currentError } = await supabase
        .from('programs')
        .select('*')
        .eq('channel_id', channelId)
        .lte('start_time', nowISO)
        .gt('end_time', nowISO)
        .limit(1)
        .single();

    if (currentError && currentError.code !== 'PGRST116') {
        console.error('Error fetching current program:', currentError);
    }

    let current = null;
    let offset = 0;
    let next = null;

    if (currentData) {
        current = mapProgram(currentData);
        // Calculate offset in seconds
        const startTime = new Date(currentData.start_time).getTime();
        offset = Math.max(0, (now.getTime() - startTime) / 1000);

        // 2. Get Next Program
        const { data: nextData, error: nextError } = await supabase
            .from('programs')
            .select('*')
            .eq('channel_id', channelId)
            .gte('start_time', currentData.end_time) // Start after current ends
            .order('start_time', { ascending: true })
            .limit(1)
            .single();

        if (nextData) {
            next = mapProgram(nextData);
        }
    } else {
        // No current program? Maybe check if there is a FUTURE program coming up soon?
        const { data: nextData, error: nextError } = await supabase
            .from('programs')
            .select('*')
            .eq('channel_id', channelId)
            .gt('start_time', nowISO)
            .order('start_time', { ascending: true })
            .limit(1)
            .single();
            
        if (nextData) {
            next = mapProgram(nextData);
        }
    }

    return { current, next, offset };
};


