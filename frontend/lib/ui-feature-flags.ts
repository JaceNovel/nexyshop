/**
 * Frontend-only visibility switches.
 *
 * The underlying components, routes and business integrations remain in place so
 * these experiences can be restored without rebuilding their implementation.
 */
export const UI_FEATURES = {
  esports: false,
  automaticChallengeNotification: false
} as const;

export const HIDDEN_ESPORT_PATHS = [
  "/tournois",
  "/duel",
  "/live",
  "/replays",
  "/highlights",
  "/classement",
  "/pubg/historique",
  "/pubg/match",
  "/pubg/classement"
] as const;

export function isEsportPath(pathname: string) {
  return HIDDEN_ESPORT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
