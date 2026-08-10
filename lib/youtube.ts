
export interface YouTubeVideoDetails {
  title: string;
  description: string;
  duration: number; // in seconds
  videoId: string;
  thumbnail: string;
  creator?: string;
}

// Helper to parse ISO 8601 duration (PT1H2M10S) to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
  if (!match) return 0;

  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);

  return hours * 3600 + minutes * 60 + seconds;
};

// Helper to extract video ID from URL
const extractVideoId = (url: string): string | null => {
    // Regex covers:
    // - youtube.com/watch?v=ID
    // - youtube.com/embed/ID
    // - youtube.com/v/ID
    // - youtu.be/ID
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
};

// Helper to extract playlist ID from URL
export const extractPlaylistId = (url: string): string | null => {
    const regExp = /[?&]list=([^#\&\?]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

export const fetchVideoDetails = async (url: string): Promise<YouTubeVideoDetails | null> => {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    console.error('Invalid YouTube URL');
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  console.log('Using API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING');
  
  if (!apiKey) {
      console.error('YouTube API Key is missing');
      return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error Details:', errorData);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.error('Video not found');
      return null;
    }

    const item = data.items[0];
    const snippet = item.snippet;
    const contentDetails = item.contentDetails;

    return {
      videoId: videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      duration: parseDuration(contentDetails.duration),
      creator: snippet.channelTitle
    };

  } catch (error) {
    console.error('Error fetching YouTube details:', error);
    return null;
  }
};

export const fetchPlaylistVideos = async (url: string, maxResults: number = 50): Promise<YouTubeVideoDetails[]> => {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) return [];

    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) return [];

    try {
        // Step 1: Get playlist items
        const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${playlistId}&key=${apiKey}`
        );

        if (!playlistResponse.ok) return [];

        const playlistData = await playlistResponse.json();
        if (!playlistData.items || playlistData.items.length === 0) return [];

        // Extract video IDs
        const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');

        // Step 2: Fetch full details (for durations)
        const videosResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
        );

        if (!videosResponse.ok) return [];

        const videosData = await videosResponse.json();
        
        return videosData.items.map((item: any) => {
            const snippet = item.snippet;
            const contentDetails = item.contentDetails;
            return {
                videoId: item.id,
                title: snippet.title,
                description: snippet.description,
                thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
                duration: parseDuration(contentDetails.duration),
                creator: snippet.channelTitle
            };
        });

    } catch (error) {
        console.error('Error fetching playlist:', error);
        return [];
    }
};

export const searchYouTubeVideos = async (query: string, maxResults: number = 10): Promise<YouTubeVideoDetails[]> => {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('YouTube API Key is missing');
        return [];
    }

    try {
        // Step 1: Search for videos
        const searchResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`
        );

        if (!searchResponse.ok) {
            console.error('YouTube Search API Error:', await searchResponse.json());
            return [];
        }

        const searchData = await searchResponse.json();
        if (!searchData.items || searchData.items.length === 0) return [];

        // Extract video IDs
        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

        // Step 2: Fetch full details (for durations)
        const videosResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
        );

        if (!videosResponse.ok) {
            console.error('YouTube Videos API Error:', await videosResponse.json());
            return [];
        }

        const videosData = await videosResponse.json();
        
        return videosData.items.map((item: any) => {
            const snippet = item.snippet;
            const contentDetails = item.contentDetails;
            return {
                videoId: item.id,
                title: snippet.title,
                description: snippet.description,
                thumbnail: snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
                duration: parseDuration(contentDetails.duration),
                creator: snippet.channelTitle
            };
        });

    } catch (error) {
        console.error('Error searching YouTube:', error);
        return [];
    }
};
