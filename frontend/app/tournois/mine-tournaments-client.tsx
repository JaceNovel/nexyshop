"use client";

import { useEffect, useMemo, useState } from "react";

type CreatedTournament = {
  id: number;
  title: string;
  game: string;
  mode: string;
  teamType: string;
  startsAt: string;
  region: string;
  platform: string;
  participants: string;
  rewardAmount: string;
  rewardUnit: string;
  funding: string;
  status: string;
  description: string;
  createdAt: string;
};

function readCreatedTournaments(): CreatedTournament[] {
  try {
    const raw = localStorage.getItem("astral_created_tournaments");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as CreatedTournament[];
  } catch {
    return [];
  }
}

export function MineTournaments() {
  const [items, setItems] = useState<CreatedTournament[]>([]);

  useEffect(() => {
    setItems(readCreatedTournaments());
    const onStorage = () => setItems(readCreatedTournaments());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sorted = useMemo(() => [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [items]);

  if (!sorted.length) {
    return (
      <div className="rounded-md border border-[#ececf3] bg-white p-6 text-center text-sm font-semibold text-[#6b7280]">
        Aucun tournoi créé sur cet appareil pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((tournament) => (
        <article key={tournament.id} className="rounded-md border border-[#ececf3] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,.045)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase text-[#6b7280]">MON TOURNOI</p>
              <h3 className="mt-1 text-sm font-black text-[#111827]">{tournament.title || "Sans titre"}</h3>
              <p className="mt-2 text-xs font-medium text-[#4b5563]">
                {tournament.game} • {tournament.mode} • {tournament.platform} • {tournament.region}
              </p>
            </div>
            <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-[10px] font-black text-[#7c19f4]">{tournament.funding === "astral" ? "FINANCÉ ASTRAL" : "AUTO-FINANCÉ"}</span>
          </div>
          <p className="mt-3 text-xs font-medium text-[#6b7280] line-clamp-2">{tournament.description}</p>
        </article>
      ))}
    </div>
  );
}

