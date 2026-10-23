import { NextRequest, NextResponse } from "next/server";
import { getSteamId } from "@/lib/session";
import { getOwnedGames, getAchievementSnapshot } from "@/lib/steam";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const steamId = await getSteamId();
  if (!steamId) return NextResponse.json({error:"No autorizado"},{status:401});
  const raw = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  if (!Number.isSafeInteger(raw) || raw < 0 || raw > 100000) return NextResponse.json({error:"Desplazamiento inválido"},{status:400});
  try {
    const library = await getOwnedGames(steamId);
    const page = library.slice(raw,raw+8);
    const results = [];
    for (const game of page) {
      results.push(await getAchievementSnapshot(steamId,game.id));
    }
    return NextResponse.json({results,nextOffset:raw+8<library.length?raw+8:null},{headers:{"Cache-Control":"private, no-store"}});
  } catch {
    return NextResponse.json({error:"No se pudieron consultar los logros"},{status:502});
  }
}
