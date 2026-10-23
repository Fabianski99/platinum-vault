import { NextRequest, NextResponse } from "next/server";
import { getSteamId } from "@/lib/session";
import { getOwnedGames, getAchievementSnapshot } from "@/lib/steam";

export const runtime = "nodejs";

const BATCH_SIZE = 8;
const CONCURRENCY = 4;

export async function GET(request: NextRequest) {
  const steamId = await getSteamId();
  if (!steamId) {
    return NextResponse.json({ error: "Sesión de Steam no válida." }, { status: 401 });
  }

  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
    return NextResponse.json({ error: "Desplazamiento inválido." }, { status: 400 });
  }

  try {
    const library = await getOwnedGames(steamId);
    const games = library.slice(offset, offset + BATCH_SIZE);
    const results = [];

    // Limita las peticiones simultáneas para no saturar Steam.
    for (let index = 0; index < games.length; index += CONCURRENCY) {
      const group = games.slice(index, index + CONCURRENCY);
      const snapshots = await Promise.all(
        group.map((game) => getAchievementSnapshot(steamId, game.id))
      );
      results.push(...snapshots);
    }

    const nextOffset = offset + games.length;
    return NextResponse.json({
      results,
      total: library.length,
      nextOffset: nextOffset < library.length ? nextOffset : null,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar Steam. Intenta nuevamente." },
      { status: 502 }
    );
  }
}
