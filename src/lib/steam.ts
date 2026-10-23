import "server-only";
import type { Game, Player } from "@/lib/games";

type OwnedGame = { appid: number; name?: string; playtime_forever?: number; rtime_last_played?: number };

async function steamFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("Falta configurar STEAM_API_KEY en .env.local.");
  const url = new URL("https://api.steampowered.com/" + path);
  url.search = new URLSearchParams({ ...params, key, format: "json" }).toString();
  const response = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Steam no respondió correctamente (" + response.status + ").");
  return response.json() as Promise<T>;
}

export async function getSteamProfile(steamId: string): Promise<Player> {
  const data = await steamFetch<{ response?: { players?: Array<{ personaname: string; avatarfull?: string }> } }>(
    "ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId }
  );
  const profile = data.response?.players?.[0];
  return { name: profile?.personaname ?? "Jugador de Steam", avatar: profile?.avatarfull, steamId };
}

export async function getOwnedGames(steamId: string): Promise<Game[]> {
  const data = await steamFetch<{ response?: { games?: OwnedGame[] } }>(
    "IPlayerService/GetOwnedGames/v1/",
    { steamid: steamId, include_appinfo: "true", include_played_free_games: "true" }
  );
  return (data.response?.games ?? [])
    .filter((game) => game.name && Number.isInteger(game.appid))
    .map((game) => ({
      id: game.appid,
      name: game.name!,
      playtime: (game.playtime_forever ?? 0) / 60,
      unlocked: null,
      total: null,
      lastPlayed: game.rtime_last_played ?? 0,
    }))
    .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || b.playtime - a.playtime);
}

export type AchievementSnapshot = {
  id: number;
  unlocked: number | null;
  total: number | null;
  completedAt?: number;
};

export async function getAchievementSnapshot(steamId: string, appId: number): Promise<AchievementSnapshot> {
  try {
    const data = await steamFetch<{
      playerstats?: { success?: boolean; achievements?: Array<{ achieved: number; unlocktime?: number }> };
    }>("ISteamUserStats/GetPlayerAchievements/v1/", {
      steamid: steamId, appid: String(appId), l: "spanish",
    });
    const achievements = data.playerstats?.achievements;
    if (!data.playerstats?.success || !achievements?.length) return { id: appId, unlocked: null, total: null };
    const won = achievements.filter((a) => a.achieved === 1);
    const completedAt = won.length === achievements.length
      ? Math.max(...won.map((a) => a.unlocktime ?? 0))
      : undefined;
    return { id: appId, unlocked: won.length, total: achievements.length, ...(completedAt ? { completedAt } : {}) };
  } catch {
    return { id: appId, unlocked: null, total: null };
  }
}
