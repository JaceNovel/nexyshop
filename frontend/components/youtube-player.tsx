"use client";

import { useEffect, useMemo, useRef } from "react";

type YouTubePlayerProps = {
  videoId: string;
  title?: string;
  startSeconds?: number;
  seekToSeconds?: number | null;
  autoplay?: boolean;
  enableJsApi?: boolean;
  className?: string;
};

export function YouTubePlayer({
  videoId,
  title = "YouTube player",
  startSeconds = 0,
  seekToSeconds,
  autoplay = false,
  enableJsApi = true,
  className = ""
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      playsinline: "1",
      rel: "0",
      start: String(Math.max(0, startSeconds))
    });

    if (enableJsApi) {
      params.set("enablejsapi", "1");
      if (origin) params.set("origin", origin);
    }
    if (autoplay) params.set("autoplay", "1");

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [autoplay, enableJsApi, startSeconds, videoId]);

  useEffect(() => {
    if (seekToSeconds === undefined || seekToSeconds === null || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "seekTo", args: [Math.max(0, seekToSeconds), true] }),
      "https://www.youtube.com"
    );
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "https://www.youtube.com"
    );
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
