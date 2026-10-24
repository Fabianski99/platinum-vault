import Link from "next/link";
import { getSteamId } from "@/lib/session";
import { getOwnedGames } from "@/lib/steam";
import { demoGames } from "@/lib/games";
import { PlatinumPlanner } from "@/components/platinum-planner";

export default async function PlannerPage() {
  const steamId = await getSteamId();
  if (!steamId) {
    return <PlatinumPlanner games={demoGames} steamId="demo" isSteam={false}/>;
  }
  try {
    const library = await getOwnedGames(steamId);
    return <PlatinumPlanner games={library} steamId={steamId} isSteam={true}/>;
  } catch {
    return <main className="plan-page plan-load-error"><h1>No pudimos cargar tu biblioteca de Steam</h1>
      <p>Tu lista local sigue guardada. Revisa la conexión e inténtalo nuevamente.</p>
      <Link href="/">Volver al inicio</Link>
    </main>;
  }
}
