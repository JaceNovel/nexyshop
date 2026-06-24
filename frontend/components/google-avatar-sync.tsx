"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";
import { syncGoogleAvatar } from "@/lib/api";

const SYNC_KEY = "astral_google_avatar_synced_v1";

function hasGoogleAccount(user: unknown): boolean {
  const accounts = (user as { externalAccounts?: Array<{ provider?: string | null }> } | null)?.externalAccounts ?? [];
  return accounts.some((account) => String(account.provider ?? "").toLowerCase().includes("google"));
}

function usableAvatar(url?: string | null): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("data:image/");
}

export function GoogleAvatarSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const isGoogleAccount = useMemo(() => hasGoogleAccount(user), [user]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !isGoogleAccount || !usableAvatar(user.imageUrl)) return;

    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
    const name = user.fullName ?? user.username ?? email?.split("@")[0] ?? null;

    localStorage.setItem("nexy_google_avatar", user.imageUrl);
    if (name) localStorage.setItem("nexy_google_name", name);
    window.dispatchEvent(new Event("astral-profile-updated"));

    const token = localStorage.getItem("nexy_sanctum_token");
    if (!token || token === "clerk") return;

    const signature = `${user.id}:${email ?? ""}:${user.imageUrl}`;
    if (localStorage.getItem(SYNC_KEY) === signature) return;

    syncGoogleAvatar(token, {
      avatar_url: user.imageUrl,
      name,
      email,
      clerk_id: user.id,
      source: "google"
    })
      .then((payload) => {
        const avatar = payload.user.avatar_url ?? payload.user.google_avatar_url ?? user.imageUrl;
        localStorage.setItem(SYNC_KEY, signature);
        localStorage.setItem("nexy_google_avatar", avatar);
        window.dispatchEvent(new Event("astral-profile-updated"));
      })
      .catch(() => undefined);
  }, [isLoaded, isSignedIn, isGoogleAccount, user]);

  return null;
}
