'use client';

import React from 'react';

interface StablePlayerProps {
  url: string;
  initialStart: number;
  volume: number;
}

const StablePlayer: React.FC<StablePlayerProps> = ({ url, initialStart, volume }) => {
  // Extract video ID from URL
  const videoId = url.split('v=')[1]?.split('&')[0];
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
          // Send postMessage to YouTube iframe API to change volume
          iframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                  event: 'command',
                  func: 'setVolume',
                  args: [volume]
              }),
              '*'
          );
      }
  }, [volume]);

  if (!videoId) return null;

  // Ensure initialStart is an integer to avoid YouTube player errors
  const startSeconds = Math.floor(initialStart);

  return (
        <div className="absolute inset-0 w-full h-full bg-black overflow-hidden pointer-events-none">
            {/* The iframe wrapper needs pointer-events: none so that the video can't be paused by clicking,
                BUT the JS API needs to be able to receive postMessages. 
                pointer-events: none on the wrapper is fine, postMessage goes to contentWindow. */}
            <iframe
                ref={iframeRef}
        width="100%"
        height="100%"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=0&controls=0&start=${startSeconds}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1`}
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
// We must re-render if url changes. We also need to consider volume, 
// but wait, the useEffect inside StablePlayer handles volume changes without full re-render.
// However, React.memo by default skips render if props haven't changed.
// If we only check `prev.url === next.url`, the component won't even run the useEffect when `volume` changes!
export default React.memo(StablePlayer, (prev, next) => {
  return prev.url === next.url && prev.volume === next.volume;
});
