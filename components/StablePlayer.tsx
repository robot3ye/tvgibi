'use client';

import React from 'react';

interface StablePlayerProps {
  url: string;
  initialStart: number;
  volume: number;
  subtitleLang?: string | null; // Optional prop for subtitle language, e.g. 'tr', 'en', or null for off
}

const StablePlayer: React.FC<StablePlayerProps> = ({ url, initialStart, volume, subtitleLang }) => {
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

  // Handle dynamic subtitle toggling without reloading the iframe
  React.useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
          if (subtitleLang) {
              // YouTube iframe API needs the module loaded first, then the track set.
              // However, sometimes it needs a slight delay between loading the module and setting the track
              iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({
                      event: 'command',
                      func: 'loadModule',
                      args: ['captions']
                  }),
                  '*'
              );
              
              // Give it 100ms to load the module before setting the track
              setTimeout(() => {
                  if (iframeRef.current && iframeRef.current.contentWindow) {
                      iframeRef.current.contentWindow.postMessage(
                          JSON.stringify({
                              event: 'command',
                              func: 'setOption',
                              args: ['captions', 'track', { languageCode: subtitleLang }]
                          }),
                          '*'
                      );
                      // Force the captions to be visible by simulating a toggle command
                      iframeRef.current.contentWindow.postMessage(
                          JSON.stringify({
                              event: 'command',
                              func: 'setOption',
                              args: ['captions', 'tracklist', [{ languageCode: subtitleLang }]]
                          }),
                          '*'
                      );
                  }
              }, 100);
          } else {
              // Turn off captions by setting track language to empty or unloading module
              iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({
                      event: 'command',
                      func: 'setOption',
                      args: ['captions', 'track', {}] // Empty track object often hides it
                  }),
                  '*'
              );
              iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({
                      event: 'command',
                      func: 'unloadModule',
                      args: ['captions']
                  }),
                  '*'
              );
          }
      }
  }, [subtitleLang]);

  const handleIframeLoad = () => {
      // YouTube iFrame takes a moment to initialize its internal API after the iframe fires 'load'
      // We send the volume and subtitle commands periodically for the first few seconds to ensure it catches it.
      let attempts = 0;
      const interval = setInterval(() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
              // Set volume
              iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }),
                  '*'
              );

              // Set subtitle state dynamically via API if supported
              // Sometimes `loadModule('captions')` or `setOption` is needed
              // The query params below handles the initial state better
          }
          attempts++;
          if (attempts > 8) clearInterval(interval); // Try for 4 seconds
      }, 500);
  };

  if (!videoId) return null;

  // Ensure initialStart is an integer to avoid YouTube player errors
  const startSeconds = Math.floor(initialStart);

  // Build the source URL with subtitle parameters
  // cc_load_policy=1 turns captions ON by default
  // hl=tr sets the interface language (and often subtitle preference)
  // cc_lang_pref=tr forces a specific subtitle language if available
  let srcUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=0&controls=0&start=${startSeconds}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=0&disablekb=1`;
  
  if (subtitleLang) {
      srcUrl += `&cc_load_policy=1&hl=${subtitleLang}&cc_lang_pref=${subtitleLang}`;
  } else {
      srcUrl += `&cc_load_policy=0`; // Turn off captions explicitly if null
  }

  return (
        <div className="absolute inset-0 w-full h-full bg-black overflow-hidden pointer-events-auto">
            {/* The iframe wrapper allows pointer events so user can interact with the video */}
            <iframe
                ref={iframeRef}
        width="100%"
        height="100%"
        src={srcUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={handleIframeLoad}
        className="w-full h-full object-contain" // object-contain to fit video without crop
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
};

  // Custom comparison function for React.memo
// We must re-render if url changes. We also need to consider volume, 
// but wait, the useEffect inside StablePlayer handles volume changes without full re-render.
// Same for subtitleLang, we handle it dynamically via postMessage so we don't need a full re-render.
export default React.memo(StablePlayer, (prev, next) => {
  // If only the subtitle language changes, we re-render the component to update the iframe src.
  // This ensures YouTube consistently loads the subtitle settings correctly.
  return prev.url === next.url && prev.volume === next.volume && prev.subtitleLang === next.subtitleLang;
});
