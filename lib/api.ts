
import { supabase } from './supabase';
import { Channel, Program } from '../data/mockData';

// Map DB Channel to Frontend Channel
const mapChannel = (dbChannel: any): Channel => ({
  id: dbChannel.id,
  name: dbChannel.name,
  slug: dbChannel.id, // Using ID as slug since we set 'music-box' as ID
  logo: dbChannel.logo || dbChannel.name.substring(0, 2).toUpperCase(),
  color: dbChannel.color || '#000000',
});

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
    };
};

export const getChannels = async (): Promise<Channel[]> => {
  const { data, error } = await supabase
    .from('channels')
    .select('*');
  
  if (error) {
    console.error('Error fetching channels:', error);
    return [];
  }

  return data.map(mapChannel);
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

export const getCurrentProgram = async (channelId: string): Promise<{ current: Program | null, next: Program | null, offset: number }> => {
    const now = new Date().toISOString();
    
    // Get current program
    const { data: currentData, error: currentError } = await supabase
        .from('programs')
        .select('*')
        .eq('channel_id', channelId)
        .lte('start_time', now)
        .gte('end_time', now)
        .single();
    
    if (currentError && currentError.code !== 'PGRST116') { // Ignore no rows found
        console.error('Error fetching current program:', currentError);
    }

    let current = null;
    let offset = 0;

    if (currentData) {
        current = mapProgram(currentData);
        const startTime = new Date(currentData.start_time).getTime();
        const nowTime = new Date().getTime();
        offset = Math.floor((nowTime - startTime) / 1000);
    }

    // Get next program
    let next = null;
    if (current) {
        const { data: nextData } = await supabase
            .from('programs')
            .select('*')
            .eq('channel_id', channelId)
            .gt('start_time', now)
            .order('start_time', { ascending: true })
            .limit(1)
            .single();
        
        if (nextData) {
            next = mapProgram(nextData);
        }
    }

    return { current, next, offset };
};
