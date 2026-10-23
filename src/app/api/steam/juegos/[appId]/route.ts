import { NextRequest, NextResponse } from "next/server";
import { getSteamId } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";
import type { AchievementDetail, GameAchievementData } from "@/lib/achievement";

export const runtime = "nodejs";

type PlayerEntry = {
  apiname: string;
  achieved: number;
  unlocktime?: number;
  name?: string;
  description?: string;
};
type SchemaEntry = {
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
  icongray?: string;
  hidden?: number;
};
type GlobalEntry = { name: string; percent: number };

async function getSteamJson<T>(path: string, params: Record<string, string>, privateRequest = false): Promise<T | null> {
  const url = new URL("https://api.steampowered.com/" + path);
  url.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(url, {
      ...(privateRequest ? { cache: "no-store" as const } : { next: { revalidate: 1800 } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ appId: string }> }) {
  const steamId = await getSteamId();
  if (!steamId) return NextResponse.json({ error: "Conecta Steam para consultar tus logros." }, { status: 401 });
  const { appId: rawAppId } = await context.params;
  if (!/^\d{1,10}$/.test(rawAppId)) return NextResponse.json({ error: "Juego no válido." }, { status: 400 });
  const appId = Number(rawAppId);
  if (!Number.isSafeInteger(appId) || appId < 1 || appId > 4294967295) {
    return NextResponse.json({ error: "Juego no válido." }, { status: 400 });
  }

  try {
    // Solo se consultan datos del dueño de la sesión, no de SteamIDs arbitrarios.
    const games = await getOwnedGames(steamId);
    if (!games.some((game) => game.id === appId)) {
      return NextResponse.json({ error: "No se encontró el juego en tu biblioteca visible." }, { status: 404 });
    }

    const key = process.env.STEAM_API_KEY;
    if (!key) return NextResponse.json({ error: "La API de Steam no está configurada." }, { status: 503 });

    const [playerData, schemaData, globalData] = await Promise.all([
      getSteamJson<{
        playerstats?: { success?: boolean; achievements?: PlayerEntry[] };
      }>("ISteamUserStats/GetPlayerAchievements/v1/", {
        key, steamid: steamId, appid: String(appId), l: "spanish",
      }, true),
      getSteamJson<{
        game?: { availableGameStats?: { achievements?: SchemaEntry[] } };
      }>("ISteamUserStats/GetSchemaForGame/v2/", {
        key, appid: String(appId), l: "spanish",
      }),
      getSteamJson<{
        achievementpercentages?: { achievements?: GlobalEntry[] };
      }>("ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/", {
        gameid: String(appId),
      }),
    ]);

    const entries = playerData?.playerstats?.achievements;
    if (!playerData?.playerstats?.success || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({
        achievements: [], available: false, unlocked: 0, total: 0, completedAt: null,
        note: "Steam no proporciona una lista de logros accesible para este juego.",
      } satisfies GameAchievementData, { headers: { "Cache-Control": "private, no-store" } });
    }

    const schema = new Map((schemaData?.game?.availableGameStats?.achievements ?? []).map((entry) => [entry.name, entry]));
    const global = new Map((globalData?.achievementpercentages?.achievements ?? []).map((entry) => [entry.name, Number(entry.percent)]));
    const achievements: AchievementDetail[] = entries.map((entry) => {
      const info = schema.get(entry.apiname);
      const unlocked = entry.achieved === 1;
      const percent = global.get(entry.apiname);
      return {
        apiName: entry.apiname,
        name: info?.displayName || entry.name || entry.apiname,
        description: info?.description || entry.description || "",
        unlocked,
        unlockTime: unlocked && entry.unlocktime ? entry.unlocktime : null,
        icon: info?.icon || null,
        lockedIcon: info?.icongray || null,
        globalPercent: Number.isFinite(percent) ? percent! : null,
        hidden: info?.hidden === 1,
      };
    });

    const won = achievements.filter((item) => item.unlocked);
    const latest = won.length === achievements.length
      ? Math.max(...won.map((item) => item.unlockTime || 0))
      : 0;
    return NextResponse.json({
      achievements,
      available: true,
      unlocked: won.length,
      total: achievements.length,
      completedAt: latest > 0 ? latest : null,
    } satisfies GameAchievementData, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Error al consultar Steam. Intenta nuevamente." }, { status: 502 });
  }
}
