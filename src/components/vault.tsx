"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { GameArtwork } from "@/components/game-artwork";
import { MuseumExperience } from "@/components/museum-experience";
import { ArrowRight, ArrowUpRight, LibraryBig, LogIn, Search, Trophy, RefreshCw, Pause, Play, ChevronDown } from "lucide-react";
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
    // Recuperamos la pestaña de retorno al navegar desde una ficha.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (destination === "biblioteca" || destination === "museo") setSection(destination);
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
        || (filter === "sin-datos" && game.total === null));
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

  const open=(page:Section)=>{setSection(page);window.history.replaceState(null,"",page==="inicio"?"/":"/?seccion="+page);window.scrollTo({top:0,behavior:"smooth"});};
  return <div className="site">
    <header className="header">
      <button className="logo" onClick={()=>open("inicio")}><span className="logo-icon"><Trophy size={22}/></span><span>PLATINUM<b>VAULT</b><small>THE COMPLETIONIST ARCHIVE</small></span></button>
      <nav>{(["inicio","biblioteca","museo"] as Section[]).map((part,i)=><button className={section===part?"active":""} onClick={()=>open(part)} key={part}><sup>0{i+1}</sup>{part==="inicio"?"Inicio":part==="biblioteca"?"Biblioteca":"El museo"}</button>)}</nav>
      {isSteam?<a className="steam-button" href="/api/auth/logout">{player.name} · Salir</a>:<a className="steam-button" href="/api/auth/steam"><LogIn size={16}/> Conectar Steam</a>}
    </header>
    <AnimatePresence mode="wait"><motion.main key={section} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.35}}>
    {section==="inicio"&&<>
      <section className="hero">
        <div className="hero-photo"/><div className="hero-cover"/>
        <div className="hero-content"><span className="eyebrow">✳ &nbsp; EL ARCHIVO DE TUS GRANDES CONQUISTAS</span><h1>NO SOLO<br/>LOS JUEGAS.<br/><em>LOS CONQUISTAS.</em></h1><p>Cada historia terminada merece un lugar en la memoria. Reúne tu biblioteca, celebra tus juegos al 100 % y construye el legado de todo lo que has superado.</p><div className="hero-actions"><button className="primary" onClick={()=>open("museo")}>Entrar al museo <ArrowUpRight size={18}/></button><button className="secondary" onClick={()=>open("biblioteca")}>Explorar biblioteca <ArrowRight size={18}/></button></div><span className="hero-label">PLATINUM VAULT — EDICIÓN DE EXPLORACIÓN / 001</span></div>
      </section>
      <div className="demo-banner">✳ &nbsp; {isSteam?"CONECTADO CON STEAM — Los logros se analizan automáticamente y el museo se actualiza al detectar juegos completos.":loadFailed?"No se pudo cargar Steam. Se muestran datos de ejemplo.":"EDICIÓN DEMOSTRATIVA — Los juegos y estadísticas son ejemplos, no datos de tu cuenta."}</div>
      <section className="stats"><div><span>01 / EL CATÁLOGO</span><strong>{games.length.toString().padStart(2,"0")}</strong><small>JUEGOS EN EL ARCHIVO</small></div><div><span>02 / LA COLECCIÓN</span><strong>{completed.length.toString().padStart(2,"0")}</strong><small>OBRAS COMPLETADAS</small></div><div><span>03 / TIEMPO INVERTIDO</span><strong>{hours(games.reduce((total,g)=>total+g.playtime,0))}<i>h</i></strong><small>HORAS DE HISTORIA</small></div><div className="quote">«La verdadera recompensa<br/>es el camino recorrido.»<span>— EL ESPÍRITU COMPLETISTA</span></div></section>
      <section className="section"><div className="section-title"><div><span className="eyebrow">✳ &nbsp; SALA 01 / LAS PIEZAS DESTACADAS</span><h2>El salón de los inmortales</h2></div><p>Una colección que cuenta historias. Cada juego completado es una pieza que se añade a tu legado.</p></div>
      <div className="featured">{completed.slice(0,3).map((game,i)=><button className="feature" onClick={()=>openGame(game)} key={game.id}><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/><span className="feature-shade"/><span className="feature-number">N.º {String(i+1).padStart(2,"0")}</span><span className="feature-copy"><small>COLECCIÓN COMPLETADA</small><strong>{game.name}</strong><span>Explorar pieza <ArrowUpRight size={17}/></span></span></button>)}</div>
      <div className="section-bottom"><button onClick={()=>open("museo")}>EXPLORAR TODO EL MUSEO <ArrowUpRight size={18}/></button><span>{completed.length} PIEZAS EN EXPOSICIÓN</span></div></section>
      <div className="manifesto"><span className="manifesto-symbol"><Trophy size={95} strokeWidth={.7}/></span><div><span className="eyebrow">UNA FILOSOFÍA</span><h2>EL FINAL DE UN JUEGO<br/>ES EL PRINCIPIO <em>DE SU LEGADO.</em></h2><p>Tu biblioteca no es una lista. Es el mapa de tus aventuras, los desafíos que superaste y los que todavía te esperan.</p></div><button onClick={()=>open("biblioteca")} aria-label="Abrir biblioteca"><ArrowUpRight size={26}/></button></div>
      <section className="section"><div className="section-title"><div><span className="eyebrow">✳ &nbsp; SALA 02 / EN PROGRESO</span><h2>Todavía queda camino</h2></div><p>Retoma tus aventuras pendientes y descubre cuánto falta para llegar al final.</p></div><div className="game-grid">{unfinished.slice(0,5).map(game=><GameCard game={game} onOpen={openGame} key={game.id}/>)}</div><div className="section-bottom"><button onClick={()=>open("biblioteca")}>VER LA BIBLIOTECA COMPLETA <ArrowUpRight size={18}/></button></div></section>
    </>}
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
      <div className="toolbar"><label className="search"><Search size={19}/><input placeholder="Buscar entre tus juegos..." aria-label="Buscar juegos" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filters">{[["todos","Todos"],["completos","Completados"],["pendientes","En progreso"],["sin-datos","Sin datos"]].map(([id,label])=><button key={id} className={filter===id?"selected":""} onClick={()=>setFilter(id)}>{label}</button>)}</div><label className="sort-box"><span>Ordenar por</span><select aria-label="Ordenar juegos" value={sort} onChange={(event)=>setSort(event.target.value)}><option value="recent">Últimos jugados</option><option value="name">Orden alfabético</option><option value="hours">Más horas jugadas</option><option value="progress">Mayor progreso</option></select><ChevronDown size={15}/></label></div><div className="count-line">{shown.length} JUEGOS EN ESTA SELECCIÓN <span>VISTA / CATÁLOGO</span></div>{shown.length?<div className="game-grid library-grid">{shown.map(game=><GameCard game={game} onOpen={openGame} key={game.id}/>)}</div>:<div className="empty">No hay juegos para esta búsqueda.</div>}</div>}
    {section==="museo"&&<MuseumExperience games={completed} onOpen={openGame} ownerKey={player.steamId ?? "demo"}/>}

    </motion.main></AnimatePresence>
    <footer><span>PV<span className="gold">✳</span></span><p>UNA VIDA DE JUEGOS. UN ARCHIVO PARA RECORDARLOS.</p><small>PLATINUM VAULT © 2026</small></footer>

  </div>;
}
function GameCard({game,onOpen}:{game:Game;onOpen:(game:Game)=>void}){return <button className="game-card" onClick={()=>onOpen(game)}><div className="card-cover"><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/>{isCompleted(game)&&<span className="complete-chip"><Trophy size={13}/> 100 %</span>}<span className="open-icon"><ArrowUpRight size={19}/></span></div><div className="card-heading"><strong>{game.name}</strong><span>{percentage(game)===null?"—":percentage(game)+"%"}</span></div><div className={"progress "+(game.total===null && game.status===undefined?"progress-checking":"")}><i style={{width:(percentage(game)??0)+"%"}}/></div><div className="card-bottom"><span>{hours(game.playtime)} h jugadas</span><span>{game.total===null?(game.status==="unavailable"?"No disponibles":game.status==="error"?"Error de consulta" :"Consultando…"):game.unlocked+"/"+game.total+" logros"}</span></div></button>}
