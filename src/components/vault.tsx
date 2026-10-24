"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { GameArtwork } from "@/components/game-artwork";
import { MuseumExperience } from "@/components/museum-experience";
import { HomeExperience } from "@/components/home-experience";
import { ArrowUpRight, House, LibraryBig, GalleryVerticalEnd, LogIn, LogOut, Search, Trophy, RefreshCw, Pause, Play, ChevronDown, CircleUserRound } from "lucide-react";
import { percentage, isCompleted, hours, type Game, type Player } from "@/lib/games";

type Section = "inicio" | "biblioteca" | "museo";

export function Vault({ initialGames, player, isSteam, loadFailed }: { initialGames: Game[]; player: Player; isSteam: boolean; loadFailed: boolean }) {
  const router = useRouter();
  const prefsKey = "platinum-vault:biblioteca:preferencias:" + (player.steamId ?? "demo");
  const savedPrefs = () => {
    try {
      return typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem(prefsKey) || "{}") as {
        query?: string; filter?: string; sort?: string;
      };
    } catch { return {}; }
  };
  const [section,setSection]=useState<Section>("inicio");
  useEffect(() => {
    const destination = new URLSearchParams(window.location.search).get("seccion");
    // Recuperar la sección al volver desde una ficha o reabrir la página.
    const saved = (()=>{ try { return localStorage.getItem("platinum-vault:ultima-seccion"); } catch { return null; } })();
    const target = destination ?? saved;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target === "biblioteca" || target === "museo") setSection(target);
  }, []);
  const [games,setGames]=useState(initialGames);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "paused" | "complete" | "error">("idle");
  const [scanned, setScanned] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [query,setQuery]=useState(() => savedPrefs().query ?? "");
  const [filter,setFilter]=useState(() => savedPrefs().filter ?? "todos");
  const [sort,setSort]=useState(() => savedPrefs().sort ?? "recent");
  useEffect(() => {
    try { localStorage.setItem(prefsKey, JSON.stringify({query,filter,sort})); } catch {}
  }, [prefsKey,query,filter,sort]);
  const openGame = (game: Game) => {
    try { sessionStorage.setItem("platinum-vault:return:" + section, String(window.scrollY)); } catch {}
    router.push("/juegos/" + game.id + "?desde=" + section);
  };
  useEffect(() => {
    if (section === "inicio") return;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("platinum-vault:return:" + section);
      sessionStorage.removeItem("platinum-vault:return:" + section);
    } catch {}
    if (stored === null) return;
    const position = Number(stored);
    if (!Number.isFinite(position)) return;
    const timeout = window.setTimeout(() => window.scrollTo({ top: position, behavior: "instant" }), 350);
    return () => window.clearTimeout(timeout);
  }, [section]);
  const completed=games.filter(isCompleted);
  const unfinished=games.filter(g=>!isCompleted(g));
  const shown = useMemo(() => {
    const filtered = games.filter((game) => game.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")))
      .filter((game) => filter === "todos"
        || (filter === "completos" && isCompleted(game))
        || (filter === "pendientes" && game.total !== null && !isCompleted(game))
        || (filter === "sin-datos" && game.total === null)
        || (filter === "familia" && game.familyShared === true));
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      if (sort === "hours") return b.playtime - a.playtime || a.name.localeCompare(b.name, "es");
      if (sort === "progress") return (percentage(b) ?? -1) - (percentage(a) ?? -1) || a.name.localeCompare(b.name, "es");
      return (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || b.playtime - a.playtime;
    });
  }, [games, query, filter, sort]);

  // Conservamos resultados por SteamID en el navegador mientras configuramos Supabase.
  // Al volver a entrar en menos de 12 horas, evitamos repetir cientos de consultas.
  useEffect(() => {
    if (!isSteam || !player.steamId) return;
    const cacheKey = "platinum-vault:logros:v2:" + player.steamId;
    const libraryIds = initialGames.map((game) => game.id).join(",");
    const controller = new AbortController();
    let active = true;
    type Snapshot = Pick<Game, "id" | "unlocked" | "total" | "completedAt" | "status">;
    type Stored = {
      savedAt: number;
      libraryIds: string;
      nextOffset: number;
      snapshots: Record<string, Snapshot>;
    };

    async function scanAchievements() {
      let cursor = 0;
      let snapshots: Record<string, Snapshot> = {};
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw) as Stored;
          if (cached?.savedAt && Date.now() - cached.savedAt < 12 * 60 * 60 * 1000 && cached.snapshots) {
            snapshots = cached.snapshots;
            setGames((current) => current.map((game) => ({ ...game, ...(snapshots[String(game.id)] ?? {}) })));
            if (cached.libraryIds === libraryIds) {
              cursor = Math.min(cached.nextOffset ?? 0, initialGames.length);
            }
          }
        }
      } catch {
        // El modo privado puede impedir el acceso a almacenamiento local.
      }

      if (!active) return;
      setScanned(cursor);
      if (isPaused) { setSyncState("paused"); return; }
      if (cursor >= initialGames.length) { setSyncState("complete"); return; }
      setSyncState("loading");
      setSyncMessage("");

      try {
        while (cursor < initialGames.length && active) {
          const response = await fetch("/api/steam/achievements?offset=" + cursor, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Steam no pudo completar la consulta.");
          const data = await response.json() as {
            results: Snapshot[];
            nextOffset: number | null;
          };
          if (!Array.isArray(data.results)) throw new Error("Respuesta de Steam inválida.");
          if (data.results.length > 0 && data.results.every((game) => game.status === "error")) {
            throw new Error("Steam no está respondiendo a las consultas de logros. Prueba de nuevo más tarde.");
          }

          for (const snapshot of data.results) {
            if (initialGames.some((game) => game.id === snapshot.id)) {
              snapshots[String(snapshot.id)] = snapshot;
            }
          }
          if (!active) return;
          setGames((current) => current.map((game) => ({
            ...game, ...(snapshots[String(game.id)] ?? {}),
          })));

          const nextCursor = data.nextOffset ?? initialGames.length;
          if (nextCursor <= cursor) throw new Error("No se pudo avanzar en la consulta.");
          cursor = nextCursor;
          setScanned(cursor);

          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              savedAt: Date.now(), libraryIds, nextOffset: cursor, snapshots,
            } satisfies Stored));
          } catch {
            // Continuamos incluso si no podemos guardar la caché.
          }

          // Pequeña pausa entre lotes para respetar el servicio de Steam.
          if (cursor < initialGames.length) {
            await new Promise<void>((resolve) => setTimeout(resolve, 450));
          }
        }
        if (active) {
          const errors = Object.values(snapshots).filter((snapshot) => snapshot.status === "error").length;
          setSyncState("complete");
          setSyncMessage(errors > 0
            ? errors + " consultas no respondieron. Usa «Volver a consultar» para reintentarlas."
            : "Biblioteca analizada. El museo muestra los juegos con todos sus logros verificados.");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setSyncState("error");
          setSyncMessage(error instanceof Error ? error.message : "No se pudieron consultar los logros.");
        }
      }
    }
    void scanAchievements();
    return () => { active = false; controller.abort(); };
  }, [initialGames, isSteam, player.steamId, isPaused, refreshIndex]);

  const refreshAchievements = () => {
    if (player.steamId) {
      try { localStorage.removeItem("platinum-vault:logros:v2:" + player.steamId); } catch {}
    }
    setGames(initialGames);
    setScanned(0);
    setIsPaused(false);
    setRefreshIndex((current) => current + 1);
  };

  const open=(page:Section)=>{setSection(page);try { localStorage.setItem("platinum-vault:ultima-seccion",page); } catch {} window.history.replaceState(null,"",page==="inicio"?"/":"/?seccion="+page);window.scrollTo({top:0,behavior:"smooth"});};
  return <div className="site">
    <header className="header pv-topbar">
      <button className="pv-brand" onClick={()=>open("inicio")} aria-label="Platinum Vault, ir al inicio">
        <span className="pv-brand-icon"><Trophy size={26} strokeWidth={2}/></span>
        <span className="pv-brand-name">PLATINUM<span>VAULT</span><small>TU ARCHIVO DE CONQUISTAS</small></span>
      </button>
      <nav className="pv-main-nav" aria-label="Navegación principal">
        <button className={"pv-nav-tab "+(section==="inicio"?"active":"")} onClick={()=>open("inicio")} aria-current={section==="inicio"?"page":undefined}><House size={18}/> Inicio</button>
        <button className={"pv-nav-tab "+(section==="biblioteca"?"active":"")} onClick={()=>open("biblioteca")} aria-current={section==="biblioteca"?"page":undefined}><LibraryBig size={18}/> Biblioteca</button>
        <button className={"pv-nav-tab "+(section==="museo"?"active":"")} onClick={()=>open("museo")} aria-current={section==="museo"?"page":undefined}><GalleryVerticalEnd size={18}/> Mi museo</button>
      </nav>
      <div className="pv-top-actions">
        {isSteam?<><span className="pv-account-name"><CircleUserRound size={18}/><span>{player.name}</span></span><a className="pv-logout" href="/api/auth/logout" title="Cerrar sesión en Platinum Vault" aria-label="Cerrar sesión"><LogOut size={19}/></a></>:
          <a className="pv-login" href="/api/auth/steam"><LogIn size={17}/> Conectar Steam</a>}
      </div>
    </header>
    <AnimatePresence mode="wait"><motion.main key={section} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.35}}>
    {section==="inicio"&&<HomeExperience games={games} steamId={player.steamId} isSteam={isSteam} openGame={openGame} navigate={(destination)=>open(destination)}/>}
        {section==="biblioteca"&&<div className="inner-page"><div className="page-hero"><span className="eyebrow">ÍNDICE / 02 — BIBLIOTECA</span><h1>CADA MUNDO.<br/><em>UNA HISTORIA.</em></h1><p>Todo lo que has explorado, en un solo lugar. Busca, filtra y descubre qué aventuras esperan su última conquista.</p><LibraryBig className="page-watermark" size={190} strokeWidth={.4}/></div>{isSteam&&<div className="sync-actions">
        <div className="sync-copy">
          <span className={"sync-indicator " + syncState}><RefreshCw size={18}/></span>
          <div>
            <strong>{syncState === "loading" ? "Analizando los logros de Steam"
              : syncState === "complete" ? "Biblioteca analizada"
              : syncState === "paused" ? "Consulta en pausa"
              : syncState === "error" ? "No se pudo completar la consulta"
              : "Preparando la biblioteca"}</strong>
            <span>{syncMessage || (scanned + " de " + games.length + " juegos revisados · " + completed.length + " completos detectados")}</span>
            <div className="sync-progress" role="progressbar" aria-label="Consulta de logros" aria-valuenow={scanned} aria-valuemin={0} aria-valuemax={games.length}>
              <span style={{width: (games.length ? Math.min(100, scanned / games.length * 100) : 100) + "%"}}/>
            </div>
          </div>
        </div>
        <div className="sync-buttons">
          {(syncState === "loading" || syncState === "paused")&&<button className="sync-secondary" onClick={() => setIsPaused(!isPaused)}>{isPaused?<Play size={15}/>:<Pause size={15}/>} {isPaused?"Continuar":"Pausar"}</button>}
          {(syncState === "complete" || syncState === "error")&&<button onClick={refreshAchievements}><RefreshCw size={15}/> Volver a consultar</button>}
        </div>
      </div>}
      <div className="toolbar"><label className="search"><Search size={19}/><input placeholder="Buscar entre tus juegos..." aria-label="Buscar juegos" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filters">{[["todos","Todos"],["completos","Completados"],["pendientes","En progreso"],["familia","Compartidos"],["sin-datos","Sin datos"]].map(([id,label])=><button key={id} className={filter===id?"selected":""} onClick={()=>setFilter(id)}>{label}</button>)}</div><label className="sort-box"><span>Ordenar por</span><select aria-label="Ordenar juegos" value={sort} onChange={(event)=>setSort(event.target.value)}><option value="recent">Últimos jugados</option><option value="name">Orden alfabético</option><option value="hours">Más horas jugadas</option><option value="progress">Mayor progreso</option></select><ChevronDown size={15}/></label></div><div className="count-line">{shown.length} JUEGOS EN ESTA SELECCIÓN <span>VISTA / CATÁLOGO</span></div>{shown.length?<div className="game-grid library-grid">{shown.map(game=><GameCard game={game} onOpen={openGame} key={game.id}/>)}</div>:<div className="empty">No hay juegos para esta búsqueda.</div>}</div>}
    {section==="museo"&&<MuseumExperience games={completed} onOpen={openGame} ownerKey={player.steamId ?? "demo"}/>}

    </motion.main></AnimatePresence>
    <footer><span>PV<span className="gold">✳</span></span><p>UNA VIDA DE JUEGOS. UN ARCHIVO PARA RECORDARLOS.</p><small>PLATINUM VAULT © 2026</small></footer>

  </div>;
}
function GameCard({game,onOpen}:{game:Game;onOpen:(game:Game)=>void}){return <button className="game-card" onClick={()=>onOpen(game)}><div className="card-cover"><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/>{game.familyShared && <span className="family-shared-chip">Préstamo familiar</span>}{isCompleted(game)&&<span className="complete-chip"><Trophy size={13}/> 100 %</span>}<span className="open-icon"><ArrowUpRight size={19}/></span></div><div className="card-heading"><strong>{game.name}</strong><span>{percentage(game)===null?"—":percentage(game)+"%"}</span></div><div className={"progress "+(game.total===null && game.status===undefined?"progress-checking":"")}><i style={{width:(percentage(game)??0)+"%"}}/></div><div className="card-bottom"><span>{hours(game.playtime)} h jugadas</span><span>{game.total===null?(game.status==="unavailable"?"No disponibles":game.status==="error"?"Error de consulta" :"Consultando…"):game.unlocked+"/"+game.total+" logros"}</span></div></button>}
