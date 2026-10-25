import Link from "next/link";
import { notFound } from "next/navigation";
import { UniversalGuideExperience } from "@/components/universal-guide-experience";
import { getSteamId } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";
import { demoGames } from "@/lib/games";

export default async function GuidePage({params}:{params:Promise<{appId:string}>}){
  const {appId:raw}=await params;
  if(!/^\d{1,10}$/.test(raw))notFound();
  const appId=Number(raw);
  if(!Number.isSafeInteger(appId)||appId<1||appId>4294967295)notFound();
  const steamId=await getSteamId();

  if(!steamId){
    const example=demoGames.find(game=>game.id===appId);
    if(!example) return <main className="guide-page plan-load-error">
      <h1>Conecta Steam para generar tu guía</h1><p>La guía universal necesita un juego de tu biblioteca.</p>
      <a href="/api/auth/steam">Conectar Steam</a>
    </main>;
    return <UniversalGuideExperience appId={appId} name={example.name} iconHash={example.iconHash} steamId="demo" connected={false}/>;
  }

  try{
    const games=await getOwnedGames(steamId);
    const game=games.find(item=>item.id===appId);
    if(!game)notFound();
    return <UniversalGuideExperience appId={appId} name={game.name} iconHash={game.iconHash} steamId={steamId} connected/>;
  }catch(error){
    // No convertimos los 404 legítimos en errores temporales.
    if(error && typeof error==="object" && "digest" in error)throw error;
    return <main className="guide-page plan-load-error"><h1>No se pudo cargar tu biblioteca</h1>
      <p>Comprueba tu sesión y vuelve a intentarlo. Tus ajustes guardados siguen en el navegador.</p>
      <Link href="/planificador">Volver al planificador</Link>
    </main>;
  }
}
