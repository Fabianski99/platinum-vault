import "server-only";
import type { Game, Player } from "@/lib/games";

type OwnedGame = { appid: number; name?: string; playtime_forever?: number; rtime_last_played?: number; img_icon_url?: string; family_shared?: boolean | number };

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
    { steamid: steamId, include_appinfo: "true", include_played_free_games: "true", include_family_licenses: "true" }
  );
  const unique = new Map<number, OwnedGame>();
  for (const game of data.response?.games ?? []) {
    if (!game.name || !Number.isInteger(game.appid)) continue;
    const existing = unique.get(game.appid);
    if (!existing || (existing.family_shared && !game.family_shared)) unique.set(game.appid, game);
  }
  return [...unique.values()]
    .map((game) => ({
      id: game.appid,
      name: game.name!,
      iconHash: game.img_icon_url,
      familyShared: game.family_shared === true || game.family_shared === 1,
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
  status: "ready" | "unavailable" | "error";
};

export async function getAchievementSnapshot(steamId: string, appId: number): Promise<AchievementSnapshot> {
  try {
    const data = await steamFetch<{
      playerstats?: { success?: boolean; achievements?: Array<{ achieved: number; unlocktime?: number }> };
    }>("ISteamUserStats/GetPlayerAchievements/v1/", {
      steamid: steamId,
      appid: String(appId),
      l: "spanish",
    });

    const achievements = data.playerstats?.achievements;
    // Steam también incluye aplicaciones sin logros o sin datos públicos.
    if (!data.playerstats?.success || !achievements?.length) {
      return { id: appId, unlocked: null, total: null, status: "unavailable" };
    }

    const won = achievements.filter((achievement) => achievement.achieved === 1);
    const completedAt = won.length === achievements.length
      ? Math.max(...won.map((achievement) => achievement.unlocktime ?? 0))
      : 0;

    return {
      id: appId,
      unlocked: won.length,
      total: achievements.length,
      status: "ready",
      ...(completedAt > 0 ? { completedAt } : {}),
    };
  } catch (error) {
    // Una respuesta 400 suele indicar que esta aplicación no proporciona logros.
    // Otras fallas de red/API se marcan para permitir reintentos.
    const message = error instanceof Error ? error.message : "";
    const unavailable = message.includes("(400)") || message.includes("(404)");
    return {
      id: appId,
      unlocked: null,
      total: null,
      status: unavailable ? "unavailable" : "error",
    };
  }
}
