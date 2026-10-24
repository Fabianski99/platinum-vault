"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, GalleryHorizontal, Heart, Search, Trophy, BookOpen, Clock3, Medal, Layers3 } from "lucide-react";
import { completionDate, hours, type Game } from "@/lib/games";
import { GameArtwork } from "@/components/game-artwork";

type View = "sala" | "cronologia" | "sagas";
type Sort = "newest" | "oldest" | "name" | "hours";
type Props = { games: Game[]; onOpen: (game: Game) => void; ownerKey: string };

const franchises: { name: string; matcher: RegExp }[] = [
  { name: "Assassin’s Creed", matcher: /assassin.s creed/i },
  { name: "Batman: Arkham", matcher: /batman.*arkham|arkham (asylum|city|origins|knight)/i },
  { name: "Dark Souls", matcher: /dark souls/i },
  { name: "God of War", matcher: /god of war/i },
  { name: "Far Cry", matcher: /far cry/i },
  { name: "Resident Evil", matcher: /resident evil/i },
  { name: "Tomb Raider", matcher: /tomb raider/i },
  { name: "Metro", matcher: /^metro[: ]/i },
  { name: "Watch Dogs", matcher: /watch.?dogs/i },
  { name: "Spider-Man", matcher: /spider.man/i },
  { name: "Horizon", matcher: /^horizon /i },
  { name: "Uncharted", matcher: /uncharted/i },
  { name: "Portal", matcher: /^portal( |$)/i },
  { name: "The Witcher", matcher: /witcher/i },
  { name: "Borderlands", matcher: /borderlands/i },
  { name: "Yakuza", matcher: /yakuza|like a dragon/i },
];
function franchiseFor(name: string) {
  return franchises.find((franchise) => franchise.matcher.test(name))?.name ?? "Otras obras";
}

export function MuseumExperience({ games, onOpen, ownerKey }: Props) {
  const preferencesKey = "platinum-vault:museo:vistas:" + ownerKey;
  const initialPrefs = () => { try { return typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem(preferencesKey) || "{}") as { view?: View; sort?: Sort; query?: string; onlyFavorites?: boolean; yearFilter?: string }; } catch { return {}; } };
  const [view, setView] = useState<View>(() => initialPrefs().view ?? "sala");
  const [sort, setSort] = useState<Sort>(() => initialPrefs().sort ?? "newest");
  const [query, setQuery] = useState(() => initialPrefs().query ?? "");
  const [onlyFavorites, setOnlyFavorites] = useState(() => initialPrefs().onlyFavorites ?? false);
  const [yearFilter, setYearFilter] = useState(() => initialPrefs().yearFilter ?? "todos");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [spotlight, setSpotlight] = useState(0);
  const storageKey = "platinum-vault:museo:favoritos:" + ownerKey;

  useEffect(() => {
    try { localStorage.setItem(preferencesKey, JSON.stringify({ view, sort, query, onlyFavorites, yearFilter })); } catch {}
  }, [preferencesKey, view, sort, query, onlyFavorites, yearFilter]);

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]") as unknown;
      // Restaurar la selección local tras la hidratación del navegador.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(value)) setFavorites(value.filter((item):item is number => typeof item === "number"));
    } catch { /* La galería también funciona sin almacenamiento local. */ }
  }, [storageKey]);

  const toggleFavorite = (id: number) => {
    const next = favorites.includes(id) ? favorites.filter((item)=>item!==id) : [...favorites,id];
    setFavorites(next);
    try { localStorage.setItem(storageKey,JSON.stringify(next)); } catch {}
  };

  const ordered = useMemo(() => games
    .filter((game) => game.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")))
    .filter((game) => !onlyFavorites || favorites.includes(game.id))
    .filter((game) => yearFilter === "todos" || (game.completedAt ? String(new Date(game.completedAt*1000).getUTCFullYear()) : "Sin fecha") === yearFilter)
    .sort((a,b)=>{
      if (sort==="name") return a.name.localeCompare(b.name,"es");
      if (sort==="hours") return b.playtime-a.playtime;
      if (sort==="oldest") return (a.completedAt??Number.MAX_SAFE_INTEGER)-(b.completedAt??Number.MAX_SAFE_INTEGER);
      return (b.completedAt??0)-(a.completedAt??0);
    }),[games,query,onlyFavorites,favorites,sort,yearFilter]);

  const yearOptions = useMemo(() => [...new Set(games.map((game) =>
    game.completedAt ? String(new Date(game.completedAt*1000).getUTCFullYear()) : "Sin fecha",
  ))].sort((a,b) => a === "Sin fecha" ? 1 : b === "Sin fecha" ? -1 : Number(b)-Number(a)), [games]);
  const topHours = [...games].sort((a,b)=>b.playtime-a.playtime)[0];
  const topAchievements = [...games].sort((a,b)=>(b.total ?? 0)-(a.total ?? 0))[0];
  const latestCompleted = [...games].filter((game)=>Boolean(game.completedAt))
    .sort((a,b)=>(b.completedAt ?? 0)-(a.completedAt ?? 0))[0];

  const sagaGroups = useMemo(() => {
    const groups = new Map<string,Game[]>();
    for (const game of ordered) {
      const name = franchiseFor(game.name);
      if (!groups.has(name)) groups.set(name,[]);
      groups.get(name)!.push(game);
    }
    const singles: Game[] = [];
    for (const [name,items] of groups) if (name !== "Otras obras" && items.length === 1) {
      singles.push(...items); groups.delete(name);
    }
    groups.set("Otras obras",[...(groups.get("Otras obras")??[]),...singles]);
    return [...groups.entries()].filter(([,items])=>items.length).sort((a,b) =>
      a[0] === "Otras obras" ? 1 : b[0] === "Otras obras" ? -1 : a[0].localeCompare(b[0],"es"));
  },[ordered]);
  const jumpToCollection = (mode: View, nextSort?: Sort) => {
    setView(mode);
    if (nextSort) setSort(nextSort);
    window.requestAnimationFrame(()=>document.getElementById("coleccion-museo")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const highlightPool = games.filter((game)=>favorites.includes(game.id));
  const highlights = highlightPool.length ? highlightPool : [...games].sort((a,b)=>(b.completedAt??0)-(a.completedAt??0));
  const featured = highlights.length ? highlights[spotlight % highlights.length] : null;
  const previous = () => setSpotlight((current)=>(current+highlights.length-1)%highlights.length);
  const next = () => setSpotlight((current)=>(current+1)%highlights.length);
  const timeline = useMemo(()=>{
    const groups = new Map<string, Game[]>();
    for (const game of ordered) {
      const year = game.completedAt
        ? new Date(game.completedAt*1000).getUTCFullYear().toString()
        : "Sin fecha";
      if (!groups.has(year)) groups.set(year,[]);
      groups.get(year)!.push(game);
    }
    return [...groups.entries()].sort(([a],[b])=>
      a==="Sin fecha" ? 1 : b==="Sin fecha" ? -1 : Number(b)-Number(a));
  },[ordered]);

  return <section className="museum-reimagined">
    <div className="museum-intro-new">
      <span className="eyebrow">COLECCIÓN PERMANENTE / EL ARCHIVO</span>
      <h1>EL MUSEO<br/><em>DE LO IMPOSIBLE.</em></h1>
      <p>Una sala para cada conquista. Explora los juegos que terminaste al 100 %, elige tus piezas favoritas y recorre tu historia como completista.</p>
      <div className="museum-total-new"><strong>{games.length.toString().padStart(2,"0")}</strong><span>OBRAS COMPLETADAS AL 100 %</span></div>
      <span className="museum-intro-mark">PV</span>
    </div>

    {featured && <div className="museum-spotlight">
      <AnimatePresence mode="wait">
        <motion.div key={featured.id} className="spotlight-background" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.35}}>
          <GameArtwork id={featured.id} name={featured.name} iconHash={featured.iconHash} variant="landscape"/>
        </motion.div>
      </AnimatePresence>
      <div className="spotlight-overlay"/>
      <div className="spotlight-info">
        <span className="eyebrow">✳ &nbsp; {highlightPool.length?"DE TUS FAVORITAS":"LA PIEZA DESTACADA"}</span>
        <h2>{featured.name}</h2>
        <div className="spotlight-stats">
          <span><Trophy size={15}/> {featured.total} logros</span>
          <span>{hours(featured.playtime)} h de juego</span>
        </div>
        <p>{featured.completedAt?"Último logro registrado · "+completionDate(featured.completedAt):"Fecha de finalización no registrada"}</p>
        <div className="spotlight-actions">
          <button onClick={()=>onOpen(featured)}>Explorar esta obra <ArrowUpRight size={16}/></button>
          <button className={"museum-heart "+(favorites.includes(featured.id)?"hearted":"")} onClick={()=>toggleFavorite(featured.id)} aria-label={favorites.includes(featured.id)?"Quitar de favoritas":"Añadir a favoritas"}><Heart size={19} fill={favorites.includes(featured.id)?"currentColor":"none"}/></button>
        </div>
      </div>
      {highlights.length>1&&<div className="spotlight-arrows"><button onClick={previous} aria-label="Pieza anterior"><ArrowLeft size={20}/></button><span>{String((spotlight%highlights.length)+1).padStart(2,"0")} / {String(highlights.length).padStart(2,"0")}</span><button onClick={next} aria-label="Pieza siguiente"><ArrowRight size={20}/></button></div>}
    </div>}

    {games.length > 0 && <section className="museum-special-rooms">
      <div className="museum-rooms-title"><span className="eyebrow">EXPOSICIONES / SELECCIÓN CURADA</span><h2>Más allá del 100 %</h2><p>Distintas maneras de contar la historia de tu colección.</p></div>
      <div className="museum-room-grid">
        <button onClick={()=>jumpToCollection("cronologia")}>
          <CalendarDays size={23}/><span>SALA 01</span><strong>Por año</strong><small>Recorre tus conquistas en orden cronológico.</small><ArrowUpRight size={19}/>
        </button>
        <button onClick={()=>jumpToCollection("sagas")}>
          <Layers3 size={23}/><span>SALA 02</span><strong>Universos y sagas</strong><small>Encuentra franquicias con varias entregas completadas.</small><ArrowUpRight size={19}/>
        </button>
        <button onClick={()=>jumpToCollection("sala","hours")}>
          <Clock3 size={23}/><span>SALA 03</span><strong>Las más largas</strong><small>Las obras en las que más horas has invertido.</small><ArrowUpRight size={19}/>
        </button>
      </div>
      <div className="museum-honors">
        {topHours && <button onClick={()=>onOpen(topHours)}><Medal size={18}/><div><small>MAYOR TIEMPO REGISTRADO</small><strong>{topHours.name}</strong><span>{hours(topHours.playtime)} horas jugadas</span></div><ArrowUpRight size={18}/></button>}
        {topAchievements && <button onClick={()=>onOpen(topAchievements)}><Trophy size={18}/><div><small>MÁS LOGROS EN UN JUEGO</small><strong>{topAchievements.name}</strong><span>{topAchievements.total} logros</span></div><ArrowUpRight size={18}/></button>}
        {latestCompleted && <button onClick={()=>onOpen(latestCompleted)}><BookOpen size={18}/><div><small>ÚLTIMO LOGRO FINAL REGISTRADO</small><strong>{latestCompleted.name}</strong><span>{completionDate(latestCompleted.completedAt)}</span></div><ArrowUpRight size={18}/></button>}
      </div>
    </section>}

    <div className="museum-collection-header" id="coleccion-museo">
      <div><span className="eyebrow">01 / RECORRER LA COLECCIÓN</span><h2>Las obras de tu historia</h2></div>
      <div className="museum-view-switch"><button className={view==="sala"?"current":""} onClick={()=>setView("sala")}><GalleryHorizontal size={17}/> Galería</button><button className={view==="cronologia"?"current":""} onClick={()=>setView("cronologia")}><CalendarDays size={17}/> Cronología</button><button className={view==="sagas"?"current":""} onClick={()=>setView("sagas")}><Layers3 size={17}/> Sagas</button></div>
    </div>

    <div className="museum-controls">
      <label className="museum-search"><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar en el museo…"/></label>
      <label className="museum-only-favorite"><input type="checkbox" checked={onlyFavorites} onChange={(e)=>setOnlyFavorites(e.target.checked)}/><Heart size={16}/> Solo favoritas</label>
      <label className="museum-year-select">Año <select aria-label="Filtrar por año" value={yearFilter} onChange={(e)=>setYearFilter(e.target.value)}><option value="todos">Todos los años</option>{yearOptions.map((year)=><option key={year} value={year}>{year}</option>)}</select></label>
      <label className="museum-sort">Ordenar por <select aria-label="Ordenar colección" value={sort} onChange={(e)=>setSort(e.target.value as Sort)}><option value="newest">Última finalización</option><option value="oldest">Primera finalización</option><option value="name">Nombre</option><option value="hours">Más horas</option></select></label>
    </div>
    <div className="museum-works-number">{ordered.length} OBRAS EN EXPOSICIÓN <span>{view==="sala"?"SALA DE EXPOSICIONES":view==="cronologia"?"LÍNEA DEL TIEMPO":"SAGAS Y UNIVERSOS"}</span></div>

    {games.length===0 ? <div className="museum-empty-new"><Trophy size={48}/><h3>El museo espera su primera conquista.</h3><p>Los juegos verificados al 100 % aparecerán aquí a medida que Steam complete la sincronización.</p></div>
    : ordered.length===0 ? <div className="museum-empty-new"><Search size={32}/><h3>No hay piezas que coincidan.</h3><p>Prueba otra búsqueda o desactiva «Solo favoritas».</p></div>
    : view==="sala" ? <div className="museum-gallery-new">
      {ordered.map((game,i)=><motion.article layout key={game.id} className="museum-artwork-item" initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.035,.35)}}>
        <div className="museum-artwork-frame">
          <button className="museum-artwork-open" onClick={()=>onOpen(game)} aria-label={"Abrir ficha de "+game.name}><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/><span className="museum-onhover">EXPLORAR OBRA <ArrowUpRight size={17}/></span></button>
          <button className={"museum-artwork-favorite "+(favorites.includes(game.id)?"hearted":"")} onClick={()=>toggleFavorite(game.id)} aria-label={favorites.includes(game.id)?"Quitar de favoritas":"Marcar favorita"}><Heart size={16} fill={favorites.includes(game.id)?"currentColor":"none"}/></button>
        </div>
        <div className="museum-artwork-index">PIEZA Nº {String(i+1).padStart(3,"0")} <span><Trophy size={12}/> 100 %</span></div>{game.familyShared && <span className="museum-family-label">JUGADO CON STEAM FAMILIES</span>}
        <h3>{game.name}</h3>
        <div className="museum-artwork-facts"><span>{game.total} logros</span><span>{hours(game.playtime)} horas</span></div>
        <div className="museum-artwork-date">{game.completedAt?"Último logro · "+completionDate(game.completedAt):"Fecha no disponible"}</div>
      </motion.article>)}
    </div>
    : view==="sagas" ? <div className="museum-saga-groups">{sagaGroups.map(([name,items])=>
      <section className="museum-saga-group" key={name}>
        <div className="museum-saga-heading"><div><span className="eyebrow">UNIVERSO DEL MUSEO</span><h3>{name}</h3></div><span>{items.length} {items.length===1?"obra":"obras"} al 100 %</span></div>
        <div className="museum-saga-items">{items.map((game)=><button key={game.id} onClick={()=>onOpen(game)} className="museum-saga-item">
          <GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/><span>{game.name}</span><small>{game.total} logros</small>
        </button>)}</div>
      </section>)}</div>
    : <div className="museum-timeline">{timeline.map(([year,items])=><div key={year} className="museum-year">
      <div className="museum-year-heading"><strong>{year}</strong><span>{items.length} {items.length===1?"obra":"obras"}</span></div>
      <div className="museum-year-entries">{items.map((game)=><article className="museum-year-piece" key={game.id}>
        <button onClick={()=>onOpen(game)} className="museum-year-image"><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/></button>
        <div><span className="eyebrow">{game.completedAt?completionDate(game.completedAt):"FECHA NO DISPONIBLE"}</span><h3>{game.name}</h3><p>{game.total} logros · {hours(game.playtime)} horas</p><button onClick={()=>onOpen(game)}>Ver ficha completa <ArrowUpRight size={15}/></button></div>
        <button onClick={()=>toggleFavorite(game.id)} className={"museum-heart "+(favorites.includes(game.id)?"hearted":"")} aria-label={favorites.includes(game.id)?"Quitar de favoritas":"Marcar favorita"}><Heart size={17} fill={favorites.includes(game.id)?"currentColor":"none"}/></button>
      </article>)}</div>
    </div>)}</div>}
    <div className="museum-end-new"><span>✳</span><p>LA COLECCIÓN NUNCA ESTÁ TERMINADA.</p><small>Las favoritas se guardan en este navegador; la persistencia en tu cuenta llegará en otra etapa.</small></div>
  </section>;
}
