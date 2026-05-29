"use client";

import { useCallback } from "react";
import { Copy, Share2 } from "lucide-react";

type Props = {
  username: string;
  className?: string;
  variant?: "button" | "icon";
};

export function ShareProfileButton({ username, className, variant = "button" }: Props) {
  const onShare = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astral4gamer.com";
    const url = `${base.replace(/\/$/, "")}/profile/${encodeURIComponent(username)}`;
    const text = `Regarde mon profil ASTRAL4GAMER 🔥 Viens voir mes stats et mes achievements ! ${url}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: `Profil ASTRAL4GAMER — ${username}`, text, url });
        return;
      }
    } catch {
      // fallback to clipboard
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("Lien copié !");
    } catch {
      // best-effort: older browsers
      window.prompt("Copie le lien :", text);
    }
  }, [username]);

  if (variant === "icon") {
    return (
      <button type="button" onClick={onShare} className={className} aria-label="Partager profil">
        <Share2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button type="button" onClick={onShare} className={className}>
      <Share2 className="h-4 w-4" /> PARTAGER PROFIL
    </button>
  );
}

export function CopyToClipboardButton({ value, className, label }: { value: string; className?: string; label?: string }) {
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      alert("Copié !");
    } catch {
      window.prompt(label ?? "Copier :", value);
    }
  }, [label, value]);

  return (
    <button type="button" onClick={onCopy} className={className} aria-label={label ?? "Copier"}>
      <Copy className="h-4 w-4" />
    </button>
  );
}
