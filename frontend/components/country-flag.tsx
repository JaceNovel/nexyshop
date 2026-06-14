"use client";

function normalizedCountryCode(code: string) {
  const normalized = (code ?? "").trim().toUpperCase();
  if (normalized.length !== 2) return null;
  const first = normalized.charCodeAt(0) - 65;
  const second = normalized.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return null;
  return normalized;
}

export function CountryFlag({ code, label }: { code?: string | null; label?: string | null }) {
  const countryCode = code ? normalizedCountryCode(code) : null;
  if (!countryCode) return null;

  return (
    <span aria-label={label ?? code ?? "Pays"} title={label ?? code ?? undefined} className="inline-flex items-center">
      <img
        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
        alt=""
        className="h-5 w-7 rounded-[2px] object-cover shadow-sm"
        loading="lazy"
      />
    </span>
  );
}
