
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for seeding

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('Starting database seeding...');

  // 1. Create Channel
  const channel = {
    id: 'music-box',
    name: 'MusicBox',
    description: 'Non-stop music videos',
    color: '#f59e0b',
    logo: 'MB'
  };

  const { error: channelError } = await supabase
    .from('channels')
    .upsert(channel, { onConflict: 'id' });

  if (channelError) {
    console.error('Error inserting channel:', channelError);
    return;
  }
  console.log(`Channel '${channel.name}' upserted.`);

  // 1.5. Cleanup existing programs for this channel
  console.log(`Cleaning up existing programs for channel '${channel.id}'...`);
  const { error: deleteError } = await supabase
    .from('programs')
    .delete()
    .eq('channel_id', channel.id);
  
  if (deleteError) {
      console.error('Error cleaning up programs:', deleteError);
      return;
  }
  console.log('Cleanup complete.');

  // 2. Read JSON Data
  const jsonPath = path.resolve(__dirname, '../data/channel-musicbox.json');
  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const videos = JSON.parse(fileContent);

  console.log(`Found ${videos.length} videos in JSON.`);

  // 3. Generate Programs for 3 Days
  const programs = [];
  
  // Start seeding from Yesterday 00:00 to cover today's early morning (00:00-06:00) and previous overlaps
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  startDate.setHours(0, 0, 0, 0);

  let currentTime = new Date(startDate);
  const daysToSchedule = 10; // Cover Yesterday + 9 days ahead
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysToSchedule);

  let videoIndex = 0;

  // Extract video ID helper
  const extractVideoId = (url: string): string => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : '';
  };

  while (currentTime < endDate) {
    const video = videos[videoIndex];
    const videoId = extractVideoId(video['Video url']);
    
    // Duration is in seconds
    const durationSeconds = video['Duration in seconds'];
    
    // Calculate End Time
    const programEndTime = new Date(currentTime.getTime() + durationSeconds * 1000);

    programs.push({
      channel_id: channel.id,
      title: video.Title,
      description: video.Description,
      video_id: videoId,
      duration: durationSeconds,
      start_time: currentTime.toISOString(),
      end_time: programEndTime.toISOString(),
      thumbnail: video['Thumbnail url'],
    });

    // Advance time and index
    currentTime = programEndTime;
    videoIndex = (videoIndex + 1) % videos.length;
  }

  console.log(`Generated ${programs.length} program entries.`);

  // 4. Insert Programs in Batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = programs.slice(i, i + BATCH_SIZE);
    const { error: programError } = await supabase
      .from('programs')
      .insert(batch);

    if (programError) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, programError);
    } else {
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} programs).`);
    }
  }

  console.log('Seeding completed successfully!');
}

seedDatabase().catch(console.error);
