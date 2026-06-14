"use client";

import { useEffect, useMemo, useState } from "react";

export function UpcomingCountdown({ releaseDate }: { releaseDate?: string | null }) {
  const target = useMemo(() => parseReleaseDate(releaseDate)?.getTime() ?? null, [releaseDate]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = now === null ? { days: "--", hours: "--", minutes: "--" } : getCountdown(target, now);

  return (
    <>
      <CountdownCell value={countdown.days} label="Jours" />
      <CountdownCell value={countdown.hours} label="Heures" />
      <CountdownCell value={countdown.minutes} label="Min" />
    </>
  );
}

function CountdownCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-[#f6f7fb] px-1 py-1.5 text-center">
      <b className="block text-[13px] font-black leading-none">{value}</b>
      <span className="mt-1 block text-[8px] font-bold leading-none text-[#667085]">{label}</span>
    </div>
  );
}

function getCountdown(target: number | null, now: number) {
  if (!target) {
    return { days: "--", hours: "--", minutes: "--" };
  }

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0")
  };
}

function parseReleaseDate(value?: string | null) {
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month, day);

  return Number.isNaN(date.getTime()) ? null : date;
}
