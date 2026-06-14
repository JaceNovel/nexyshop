"use client";

import { useEffect, useMemo, useRef } from "react";

type YouTubePlayerProps = {
  videoId: string;
  title?: string;
  startSeconds?: number;
  seekToSeconds?: number | null;
  autoplay?: boolean;
  volume?: number;
  playbackQuality?: string;
  onProgress?: (progress: { currentTime: number; duration: number; percent: number }) => void;
  enableJsApi?: boolean;
  className?: string;
};

export function YouTubePlayer({
  videoId,
  title = "YouTube player",
  startSeconds = 0,
  seekToSeconds,
  autoplay = false,
  volume = 80,
  playbackQuality = "hd480",
  onProgress,
  enableJsApi = true,
  className = ""
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialAutoplay = useRef(autoplay);

  const src = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      playsinline: "1",
      controls: "0",
      modestbranding: "1",
      iv_load_policy: "3",
      fs: "0",
      rel: "0",
      start: String(Math.max(0, startSeconds))
    });

    if (enableJsApi) {
      params.set("enablejsapi", "1");
      if (origin) params.set("origin", origin);
    }
    if (initialAutoplay.current) params.set("autoplay", "1");

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [enableJsApi, startSeconds, videoId]);

  function postPlayerCommand(func: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube.com"
    );
  }

  useEffect(() => {
    postPlayerCommand(autoplay ? "playVideo" : "pauseVideo");
  }, [autoplay]);

  useEffect(() => {
    postPlayerCommand("setVolume", [Math.max(0, Math.min(100, Math.round(volume)))]);
  }, [volume]);

  useEffect(() => {
    postPlayerCommand("setPlaybackQuality", [playbackQuality]);
  }, [playbackQuality]);

  useEffect(() => {
    if (!onProgress) return;
    const handleProgress = onProgress;

    function handleMessage(event: MessageEvent) {
      if (typeof event.origin !== "string" || !event.origin.includes("youtube.com")) return;

      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) as { event?: string; info?: { currentTime?: number; duration?: number } } : null;
        const info = payload?.event === "infoDelivery" ? payload.info : null;
        const currentTime = Number(info?.currentTime);
        const duration = Number(info?.duration);

        if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
          handleProgress({
            currentTime,
            duration,
            percent: Math.max(0, Math.min(100, (currentTime / duration) * 100))
          });
        }
      } catch {
        // Ignore non-JSON messages from the iframe.
      }
    }

    const timer = window.setInterval(() => {
      postPlayerCommand("getCurrentTime");
      postPlayerCommand("getDuration");
    }, 1000);

    window.addEventListener("message", handleMessage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", handleMessage);
    };
  }, [onProgress]);

  useEffect(() => {
    if (seekToSeconds === undefined || seekToSeconds === null || !iframeRef.current?.contentWindow) return;

    postPlayerCommand("seekTo", [Math.max(0, seekToSeconds), true]);
    postPlayerCommand("playVideo");
  }, [seekToSeconds]);

  return (
    <iframe
      ref={iframeRef}
      className={`aspect-video w-full bg-black ${className}`}
      src={src}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}
