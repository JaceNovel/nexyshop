"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Props = {
  initialTab?: string;
  basePath: string;
};

const tabs = ["TOUS", "À VENIR", "EN COURS", "INSCRIPTION OUVERTE", "TERMINÉS", "MES TOURNOIS"] as const;
type Tab = (typeof tabs)[number];

function normalizeTab(value?: string | null): Tab {
  const raw = (value ?? "").toUpperCase();
  const found = tabs.find((tab) => tab === raw);
  return found ?? "TOUS";
}

function statusForTab(tab: Tab): string | null {
  if (tab === "À VENIR") return "A venir";
  if (tab === "EN COURS") return "En cours";
  if (tab === "INSCRIPTION OUVERTE") return "Inscription ouverte";
  if (tab === "TERMINÉS") return "Terminés";
  return null;
}

export function TournoisTabs({ initialTab, basePath }: Props) {
  const [tab, setTab] = useState<Tab>(() => normalizeTab(initialTab));

  useEffect(() => {
    setTab(normalizeTab(initialTab));
  }, [initialTab]);

  const hrefFor = useMemo(() => {
    const current = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return (next: Tab) => {
      const params = new URLSearchParams(current);
      params.set("tab", next);
      const status = statusForTab(next);
      if (status) params.set("status", status);
      else params.delete("status");
      if (next === "MES TOURNOIS") params.set("mine", "1");
      else params.delete("mine");
      return `${basePath}?${params.toString()}`;
    };
  }, [basePath]);

  return (
    <nav className="mb-4 flex overflow-x-auto rounded-md border border-[#ececf3] bg-white px-3 text-xs font-black shadow-[0_8px_22px_rgba(16,24,40,.04)]">
      {tabs.map((label) => {
        const active = label === tab;
        return (
          <a
            key={label}
            href={hrefFor(label)}
            onClick={() => setTab(label)}
            className={`relative flex h-10 shrink-0 items-center px-4 ${active ? "text-[#7c19f4]" : "text-[#111827]"}`}
          >
            {label}
            {active ? <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#7c19f4]" /> : null}
          </a>
        );
      })}
    </nav>
  );
}

type CreatedTeam = { name: string; points?: number; createdAt?: string };

function readCreatedTeams(): CreatedTeam[] {
  try {
    const raw = localStorage.getItem("astral_created_teams");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as CreatedTeam[];
  } catch {
    return [];
  }
}

function trophyForRank(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank === 4 ? "🏅" : "🎖️";
}

export function BestTeamsLeaderboard() {
  const [teams, setTeams] = useState<CreatedTeam[]>([]);

  useEffect(() => {
    setTeams(readCreatedTeams());
    const onStorage = () => setTeams(readCreatedTeams());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const rows = useMemo(() => {
    const aggregated = new Map<string, number>();
    for (const team of teams) {
      if (!team?.name) continue;
      aggregated.set(team.name, (aggregated.get(team.name) ?? 0) + Number(team.points ?? 0));
    }
    return [...aggregated.entries()]
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [teams]);

  return (
    <div className="space-y-2">
      {rows.length ? rows.map((row, index) => {
        const rank = index + 1;
        const trend = "same";
        return (
          <div key={`${rank}-${row.name}`} className="grid grid-cols-[18px_20px_1fr_auto_16px] items-center gap-2 text-xs">
            <b>{rank}</b>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f5f3ff] text-[10px]">{trophyForRank(rank)}</span>
            <b className="line-clamp-1">{row.name}</b>
            <span className="font-black">{row.points} PTS</span>
            <span className="text-[#9ca3af]">-</span>
          </div>
        );
      }) : (
        <p className="rounded-md bg-[#fbfbff] p-3 text-xs font-semibold text-[#6b7280]">Aucune équipe classée pour le moment.</p>
      )}
      <div className="mt-2 rounded-md bg-[#fbfbff] p-2 text-[11px] font-semibold text-[#6b7280]">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#7c19f4]" />
          Les équipes apparaissent ici après création.
        </span>
      </div>
    </div>
  );
}
