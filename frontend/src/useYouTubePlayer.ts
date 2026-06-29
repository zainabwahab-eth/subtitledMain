import { useEffect, useRef, useState } from "react";

// Minimal shape of the YT Player API we actually use -- avoids pulling in
// a full @types/youtube dependency for just a few methods.
interface YTPlayer {
  getCurrentTime: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
    window.onYouTubeIframeAPIReady = () => resolve();
  });

  return apiLoadPromise;
}

/**
 * Mounts a YouTube player into the given container element and polls
 * its current playback time every 250ms so subtitles can stay in sync.
 */
export function useYouTubePlayer(containerId: string, videoId: string | null) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!videoId) return;

    let intervalId: ReturnType<typeof setInterval>;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled) return;

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0 },
      });

      intervalId = setInterval(() => {
        if (playerRef.current) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 250);
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, containerId]);

  return { currentTime };
}
