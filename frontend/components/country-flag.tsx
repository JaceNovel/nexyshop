"use client";

function flagEmojiFromCountryCode(code: string) {
  const normalized = (code ?? "").trim().toUpperCase();
  if (normalized.length !== 2) return null;
  const A = 0x1f1e6;
  const first = normalized.charCodeAt(0) - 65;
  const second = normalized.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return null;
  return String.fromCodePoint(A + first, A + second);
}

export function CountryFlag({ code, label }: { code?: string | null; label?: string | null }) {
  const flag = code ? flagEmojiFromCountryCode(code) : null;
  if (!flag) return null;
  return (
    <span aria-label={label ?? code ?? "Pays"} title={label ?? code ?? undefined} className="inline-flex items-center">
      <span className="text-[14px] leading-none">{flag}</span>
    </span>
  );
}

