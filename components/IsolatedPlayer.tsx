'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface IsolatedPlayerProps {
  url: string;
  startTime: number;
}

const IsolatedPlayer: React.FC<IsolatedPlayerProps> = ({ url, startTime }) => {
  return (
    <div className="w-full h-full bg-black">
      <ReactPlayer
        key={url} // Remount only when video changes
        url={url}
        width="100%"
        height="100%"
        playing={true} 
        muted={true}
        controls={true}
        config={{
          youtube: {
            playerVars: {
              autoplay: 1,
              mute: 1,
              start: startTime,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              disablekb: 0,
              fs: 1
            }
          }
        }}
      />
    </div>
  );
};

// Memoize to prevent re-renders when parent state (like progress bar) changes
export default React.memo(IsolatedPlayer);
