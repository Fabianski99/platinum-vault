import Link from "next/link";
import { notFound } from "next/navigation";
import { demoGames } from "@/lib/games";
import { getSteamId } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";
import { GameDetail } from "@/components/game-detail";

export default async function GamePage({ params, searchParams }: { params: Promise<{ appId: string }>; searchParams: Promise<{ desde?: string }> }) {
  const { appId: raw } = await params;
  const { desde } = await searchParams;
  const returnSection = desde === "museo" || desde === "inicio" ? desde : "biblioteca";
  if (!/^\d{1,10}$/.test(raw)) notFound();
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1 || id > 4294967295) notFound();

  const steamId = await getSteamId();
  if (!steamId) {
    const example = demoGames.find((game) => game.id === id);
    if (!example) notFound();
    return <GameDetail game={example} connected={false} returnSection={returnSection}/>;
  }

  let games;
  try {
    games = await getOwnedGames(steamId);
  } catch {
    return <main className="detail-error-page">
      <h1>No se pudo cargar la biblioteca de Steam</h1>
      <p>Comprueba que tu perfil esté disponible y vuelve a intentarlo.</p>
      <Link href="/?seccion=biblioteca">Volver a la biblioteca</Link>
    </main>;
  }
  const game = games.find((entry) => entry.id === id);
  if (!game) notFound();
  return <GameDetail game={game} connected={true} returnSection={returnSection}/>;
}
