import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideExperience } from "@/components/guide-experience";
import { GUIDE_APP_ID } from "@/lib/watch-dogs-guide";
import { getSteamId } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";

export default async function GuidePage({params}:{params:Promise<{appId:string}>}) {
  const {appId} = await params;
  if(appId!==String(GUIDE_APP_ID))notFound();
  const steamId=await getSteamId();
  if(!steamId) return <GuideExperience connected={false} steamId="demo" gameTitle="Watch Dogs 2"/>;
  try {
    const games=await getOwnedGames(steamId);
    const game=games.find((item)=>item.id===GUIDE_APP_ID);
    if(!game)return <main className="guide-page plan-load-error"><h1>Este juego no aparece en tu biblioteca de Steam</h1><p>La primera guía está preparada para Watch Dogs 2. Para personalizarla necesitamos una partida con logros accesibles.</p><Link href="/planificador">Volver al planificador</Link></main>;
    return <GuideExperience connected steamId={steamId} gameTitle={game.name} iconHash={game.iconHash}/>;
  } catch {
    return <main className="guide-page plan-load-error"><h1>No pudimos consultar tu biblioteca</h1><p>Intenta entrar nuevamente con tu cuenta de Steam.</p><Link href="/planificador">Volver al planificador</Link></main>;
  }
}
