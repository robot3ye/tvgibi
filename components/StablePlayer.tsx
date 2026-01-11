'use client';

import React from 'react';

interface StablePlayerProps {
  url: string;
  initialStart: number;
}

const StablePlayer: React.FC<StablePlayerProps> = ({ url, initialStart }) => {
  // Extract video ID from URL
  const videoId = url.split('v=')[1]?.split('&')[0];

  if (!videoId) return null;

  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden pointer-events-none">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&start=${initialStart}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full object-contain" // object-contain to fit video without crop
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
};

// Custom comparison function for React.memo
// Only re-render if URL changes. We deliberately ignore initialStart changes after mount
// to prevent iframe reloading when parent re-renders.
export default React.memo(StablePlayer, (prev, next) => {
  return prev.url === next.url;
});
