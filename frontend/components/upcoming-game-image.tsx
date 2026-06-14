"use client";

import { useMemo, useState } from "react";
import { Gamepad2 } from "lucide-react";

export function UpcomingGameImage({ src, alt }: { src?: string | null; alt: string }) {
  const enhancedSrc = useMemo(() => enhanceSteamImage(src), [src]);
  const [currentSrc, setCurrentSrc] = useState(enhancedSrc);

  if (!currentSrc) {
    return <div className="grid h-full place-items-center text-white/45"><Gamepad2 className="h-10 w-10" /></div>;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      onError={() => {
        if (currentSrc !== src && src) {
          setCurrentSrc(src);
        }
      }}
    />
  );
}

function enhanceSteamImage(src?: string | null) {
  if (!src) return null;

  return src.replace(/capsule_231x87(\.[a-zA-Z0-9]+)(\?|$)/, "capsule_616x353$1$2");
}
