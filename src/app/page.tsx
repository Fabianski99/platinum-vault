import { Vault } from "@/components/vault";
import { demoGames } from "@/lib/games";
import { getSteamId } from "@/lib/session";
import { getOwnedGames, getSteamProfile } from "@/lib/steam";

export default async function Home() {
  const steamId = await getSteamId();
  if (!steamId) return <Vault initialGames={demoGames} player={{name:"Visitante"}} isSteam={false} loadFailed={false}/>;
  try {
    const [games, player] = await Promise.all([getOwnedGames(steamId), getSteamProfile(steamId)]);
    return <Vault initialGames={games} player={player} isSteam={true} loadFailed={false}/>;
  } catch {
    return <Vault initialGames={demoGames} player={{name:"Visitante"}} isSteam={false} loadFailed={true}/>;
  }
}
