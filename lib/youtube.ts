
export interface YouTubeVideoDetails {
  title: string;
  description: string;
  duration: number; // in seconds
  videoId: string;
  thumbnail: string;
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

export const fetchVideoDetails = async (url: string): Promise<YouTubeVideoDetails | null> => {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    console.error('Invalid YouTube URL');
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
      console.error('YouTube API Key is missing');
      return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      console.error('YouTube API Error:', response.statusText);
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
      duration: parseDuration(contentDetails.duration)
    };

  } catch (error) {
    console.error('Error fetching YouTube details:', error);
    return null;
  }
};
