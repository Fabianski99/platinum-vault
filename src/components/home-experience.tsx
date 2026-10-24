"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { addToPlanner, readPlanner, savePlanner, PLAN_EVENT } from "@/lib/planner";
import {
  ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight,
  CircleCheck, Crown, Flame, LibraryBig, ListTodo, Pencil, Plus,
  Search, SlidersHorizontal, Sparkles, Target, Trophy, X,
} from "lucide-react";
import { GameArtwork } from "@/components/game-artwork";
import { hours, isCompleted, percentage, type Game } from "@/lib/games";

type PickerKind = "showcase" | "wishlist";
type PriorityView = "cercanos" | "lista";
type Props = {
  games: Game[];
  steamId?: string;
  isSteam: boolean;
  loadFailed: boolean;
  openGame: (game: Game) => void;
  navigate: (destination: "biblioteca" | "museo") => void;
};

const MAX_ITEMS = 5;

function readIds(key: string): number[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number" && Number.isInteger(id)).slice(0, MAX_ITEMS)
      : null;
  } catch { return null; }
}
function writeIds(key: string, ids: number[]) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* El navegador puede bloquear el almacenamiento. */ }
}

function CollectionPicker({
  kind, games, selected, onSave, onClose,
}: {
  kind: PickerKind;
  games: Game[];
  selected: number[];
  onSave: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(selected);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => [...games]
    .filter((game) => game.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))
    .sort((a, b) => a.name.localeCompare(b.name, "es")), [games, search]);

  const choose = (id: number) => {
    if (draft.includes(id)) setDraft((current) => current.filter((x) => x !== id));
    else if (draft.length < MAX_ITEMS) setDraft((current) => [...current, id]);
  };
  const move = (id: number, direction: -1 | 1) => {
    setDraft((current) => {
      const next = [...current];
      const i = next.indexOf(id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= next.length) return current;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const byId = new Map(games.map((game) => [game.id, game]));

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return <motion.div className="pv-picker-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.div className="pv-picker" role="dialog" aria-modal="true" aria-labelledby="pv-picker-title" onMouseDown={(event) => event.stopPropagation()}
      initial={{ y: 28, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }}>
      <div className="pv-picker-top">
        <div><span className="pv-kicker"><SlidersHorizontal size={14}/> PERSONALIZAR TU EXPERIENCIA</span>
          <h2 id="pv-picker-title">{kind === "showcase" ? "Tu selección de leyendas" : "Tu lista de próximos platinos"}</h2>
          <p>{kind === "showcase" ? "Escoge y ordena hasta cinco juegos que ya completaste al 100 %." : "Marca hasta cinco juegos de tu biblioteca que quieres completar."}</p>
        </div>
        <button className="pv-icon-button" onClick={onClose} aria-label="Cerrar selector"><X size={20}/></button>
      </div>
      <div className="pv-picked-strip">
        {Array.from({ length: MAX_ITEMS }, (_, i) => {
          const game = byId.get(draft[i]);
          return <div className={"pv-picked-slot " + (game ? "filled" : "")} key={i}>
            <span className="pv-picked-num">{i + 1}</span>
            {game ? <>
              <span className="pv-picked-name" title={game.name}>{game.name}</span>
              <div className="pv-picked-actions">
                <button aria-label={"Mover "+game.name+" a la izquierda"} disabled={i===0} onClick={()=>move(game.id,-1)}><ChevronLeft size={14}/></button>
                <button aria-label={"Mover "+game.name+" a la derecha"} disabled={i===draft.length-1} onClick={()=>move(game.id,1)}><ChevronRight size={14}/></button>
                <button aria-label={"Quitar "+game.name} onClick={()=>choose(game.id)}><X size={14}/></button>
              </div>
            </> : <span className="pv-picked-placeholder">Espacio libre</span>}
          </div>;
        })}
      </div>
      <label className="pv-picker-search"><Search size={18}/><input autoFocus value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar juegos por nombre..." /></label>
      <div className="pv-picker-list">
        {filtered.slice(0, 60).map((game) => {
          const index = draft.indexOf(game.id);
          return <button key={game.id} className={"pv-picker-game "+(index !== -1 ? "chosen" : "")}
            aria-pressed={index !== -1} disabled={index===-1 && draft.length>=MAX_ITEMS} onClick={()=>choose(game.id)}>
            <div className="pv-picker-thumb"><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/></div>
            <div className="pv-picker-details"><strong>{game.name}</strong><span>{hours(game.playtime)} h jugadas · {percentage(game) === null ? "Logros por consultar" : percentage(game)+" % de logros"}</span></div>
            <span className="pv-picker-check">{index === -1 ? <Plus size={16}/> : <><Check size={16}/>{index+1}</>}</span>
          </button>;
        })}
        {filtered.length === 0 && <div className="pv-picker-empty">No encontramos juegos con ese nombre.</div>}
        {filtered.length > 60 && <div className="pv-picker-tip">Mostrando los primeros 60 resultados. Escribe el nombre de otro juego para encontrarlo.</div>}
      </div>
      <div className="pv-picker-bottom"><span>{draft.length} / {MAX_ITEMS} seleccionados</span>
        <div><button className="pv-ghost" onClick={onClose}>Cancelar</button><button className="pv-action" onClick={()=>onSave(draft)}>Guardar selección <Check size={16}/></button></div>
      </div>
    </motion.div>
  </motion.div>;
}

export function HomeExperience({games,steamId,isSteam,loadFailed,openGame,navigate}:Props) {
  const key = steamId ?? "demo";
  const showcaseKey = "platinum-vault:inicio:destacados:v1:" + key;
  const wishlistKey = "platinum-vault:inicio:por-platinar:v1:" + key;
  const viewKey = "platinum-vault:inicio:lista-vista:" + key;
  const completed = useMemo(() => games.filter(isCompleted), [games]);
  const unfinished = useMemo(() => games.filter((game) => !isCompleted(game)), [games]);
  const completedByDate = useMemo(() => [...completed].sort((a,b) => (b.completedAt??0)-(a.completedAt??0)), [completed]);
  const [showcaseSaved,setShowcaseSaved] = useState<number[] | null>(null);
  const [wishlist,setWishlist] = useState<number[]>([]);
  const [priorityView,setPriorityView] = useState<PriorityView>("cercanos");
  const [picker,setPicker] = useState<PickerKind | null>(null);

  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowcaseSaved(readIds(showcaseKey));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWishlist(readIds(wishlistKey) ?? []);
    let savedView: string | null = null;
    try { savedView=localStorage.getItem(viewKey); } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPriorityView(savedView==="lista"?"lista":"cercanos");
  },[showcaseKey,wishlistKey,viewKey]);

  const showcased = useMemo(()=>{
    const byId = new Map(completed.map((game)=>[game.id,game]));
    const ids = showcaseSaved ?? completedByDate.slice(0,MAX_ITEMS).map((game)=>game.id);
    return ids.map((id)=>byId.get(id)).filter((game): game is Game => Boolean(game));
  },[completed,completedByDate,showcaseSaved]);

  const nearCompletion = useMemo(()=>unfinished
    .filter((game)=>game.total!==null && game.total>0 && game.unlocked!==null && game.unlocked>0)
    .sort((a,b)=>(percentage(b)??0)-(percentage(a)??0) || a.name.localeCompare(b.name,"es"))
    .slice(0,MAX_ITEMS),[unfinished]);

  useEffect(()=>{
    const onPlannerUpdate=()=>setWishlist(readIds(wishlistKey)??[]);
    window.addEventListener(PLAN_EVENT,onPlannerUpdate);
    return ()=>window.removeEventListener(PLAN_EVENT,onPlannerUpdate);
  },[wishlistKey]);

  const wishlisted = useMemo(()=>{
    const byId = new Map(games.map((game)=>[game.id,game]));
    return wishlist.map((id)=>byId.get(id)).filter((game):game is Game=>Boolean(game)&&!isCompleted(game));
  },[wishlist,games]);
  const displayPriority = priorityView==="cercanos"?nearCompletion:wishlisted;
  const lead=showcased[0] ?? completedByDate[0] ?? [...games].sort((a,b)=>b.playtime-a.playtime)[0];
  const remainingAchievements = games.reduce((sum,game)=>sum+(game.total !== null && game.unlocked !== null ? game.total-game.unlocked:0),0);

  function savePicker(ids:number[]) {
    if(picker==="showcase") {setShowcaseSaved(ids);writeIds(showcaseKey,ids);}
    if(picker==="wishlist") {
      const previous=readPlanner(key,games);
      const next=ids.reduce((items,id)=>addToPlanner(items,id),previous);
      savePlanner(key,next);
      setWishlist(ids);
      // Esta selección ordenada de cinco juegos es independiente de la lista completa.
      writeIds(wishlistKey,ids);
    }
    setPicker(null);
  }
  function chooseView(view:PriorityView){
    setPriorityView(view);
    try {localStorage.setItem(viewKey,view);}catch{}
  }

  return <div className="pv-home">
    <section className="pv-hero">
      <div className="pv-hero-glow" aria-hidden="true"/>
      {lead && <div className="pv-hero-visual"><GameArtwork id={lead.id} name={lead.name} variant="landscape" iconHash={lead.iconHash} loading="eager"/></div>}
      <div className="pv-hero-gradient"/>
      <div className="pv-hero-inner">
        <div className="pv-hero-copy">
          <span className="pv-kicker"><span className="pv-kicker-dot"/> TU UNIVERSO DE LOGROS, A TU MANERA</span>
          <h1>TUS JUEGOS.<br/><span>TUS LOGROS.</span><br/>TU LEGADO<span className="pv-heading-period">.</span></h1>
          <p>De los primeros logros al 100 %. Una colección que crece contigo, un museo hecho a tu medida y una nueva conquista siempre a la vista.</p>
          <div className="pv-hero-links">
            <button className="pv-action" onClick={()=>navigate("museo")}>Explorar mi museo <ArrowUpRight size={18}/></button>
            <button className="pv-ghost" onClick={()=>navigate("biblioteca")}>Abrir biblioteca <ArrowRight size={18}/></button>
          </div>
        </div>
        {lead && <button className="pv-hero-current" onClick={()=>openGame(lead)}><span><Crown size={16}/> EN EL ARCHIVO</span><strong>{lead.name}</strong><small>Ver ficha del juego <ArrowUpRight size={13}/></small></button>}
      </div>
    </section>

    {!isSteam && <div className="pv-demo"><Sparkles size={16}/> {loadFailed?"Steam no pudo cargar la biblioteca. Se muestran datos de demostración.":"Estás explorando una colección de demostración. Conecta Steam para ver tus juegos."}</div>}

    <section className="pv-pulse" aria-label="Resumen de tu colección">
      <div><span>Juegos en la biblioteca</span><strong>{games.length}</strong><LibraryBig size={21}/></div>
      <div><span>Completados al 100 %</span><strong>{completed.length}</strong><Trophy size={22}/></div>
      <div><span>Horas invertidas</span><strong>{hours(games.reduce((sum,g)=>sum+g.playtime,0))}<small> h</small></strong><Flame size={21}/></div>
      <div><span>Logros por conseguir <em>verificados</em></span><strong>{remainingAchievements}</strong><Target size={21}/></div>
    </section>

    <section className="pv-home-section pv-showcase-section">
      <div className="pv-section-title">
        <div><span className="pv-kicker"><Crown size={16}/> CURADO POR TI</span><h2>Tu muro de <span>leyendas.</span></h2><p>Hasta cinco obras que quieras enseñar antes que ninguna otra. Tú decides cuáles y en qué orden aparecen.</p></div>
        <button className="pv-outline-action" onClick={()=>setPicker("showcase")}><Pencil size={16}/> Personalizar mis 5 juegos</button>
      </div>
      {showcased.length ? <div className="pv-legend-grid">
        {showcased.map((game,i)=><button key={game.id} className={"pv-legend-card "+(i===0?"pv-legend-lead":"")} onClick={()=>openGame(game)}>
          <GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/>
          <span className="pv-legend-shade"/>
          <span className="pv-legend-rank">{String(i+1).padStart(2,"0")} <Crown size={14}/></span>
          <span className="pv-legend-copy"><small><CircleCheck size={14}/> 100 % COMPLETADO</small><strong>{game.name}</strong><span>{game.total} logros <ArrowUpRight size={17}/></span></span>
        </button>)}
        {Array.from({length:Math.max(0,MAX_ITEMS-showcased.length)},(_,i)=><button className="pv-legend-empty" key={"empty-"+i} onClick={()=>setPicker("showcase")}><Plus size={22}/><span>Añadir una leyenda</span></button>)}
      </div>:<div className="pv-section-empty"><Trophy size={33}/><h3>Tu galería de leyendas está esperando.</h3><p>{completed.length ? "Elige hasta cinco títulos completados para crear la exposición." : "A medida que Steam encuentre juegos al 100 %, podrás destacar tus favoritos."}</p><button className="pv-action" onClick={()=>setPicker("showcase")} disabled={!completed.length}>Elegir mis juegos <Plus size={16}/></button></div>}
      <div className="pv-home-section-bottom"><span>{completed.length} juegos completados disponibles para tu selección</span><button onClick={()=>navigate("museo")}>Ver toda la colección <ArrowUpRight size={17}/></button></div>
    </section>

    <section className="pv-home-section pv-next-section">
      <div className="pv-section-title">
        <div><span className="pv-kicker"><Target size={16}/> TU SIGUIENTE OBJETIVO</span><h2>El próximo <span>100 %.</span></h2><p>Escoge tus propios desafíos o descubre cuáles tienes más cerca de completar.</p></div>
        <button className="pv-outline-action" onClick={()=>{chooseView("lista");setPicker("wishlist");}}><Pencil size={16}/> Editar mi lista</button>
      </div>
      <div className="pv-priority-tabs" role="group" aria-label="Seleccionar juegos para platinar">
        <button className={priorityView==="cercanos"?"active":""} onClick={()=>chooseView("cercanos")}><Flame size={16}/> Cerca del 100 %</button>
        <button className={priorityView==="lista"?"active":""} onClick={()=>chooseView("lista")}><ListTodo size={16}/> Mi lista de platinos <span>{wishlisted.length}</span></button>
      </div>
      {displayPriority.length ? <div className="pv-priority-grid">
        {displayPriority.map((game,index)=><button key={game.id} className="pv-priority-card" onClick={()=>openGame(game)}>
          <div className="pv-priority-cover"><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/><span className="pv-priority-order">{String(index+1).padStart(2,"0")}</span></div>
          <div className="pv-priority-info"><strong>{game.name}</strong>
            <div className="pv-priority-progress"><span style={{width:(percentage(game)??0)+"%"}}/></div>
            <div><small>{percentage(game)===null?"Progreso sin consultar":percentage(game)+" % completado"}</small><small>{game.total===null?"Logros pendientes de consultar":(game.total-(game.unlocked??0))+" logros restantes"}</small></div>
          </div><ArrowUpRight className="pv-priority-arrow" size={18}/>
        </button>)}
      </div>:<div className="pv-section-empty pv-priority-empty"><Target size={31}/><h3>{priorityView==="lista"?"Tu próxima aventura la decides tú.":"Todavía no hay progresos para ordenar."}</h3><p>{priorityView==="lista"?"Añade hasta cinco juegos de tu biblioteca, aunque aún no hayas conseguido sus primeros logros.":"Los juegos más cercanos aparecerán después de consultar los logros de Steam."}</p>
        {priorityView==="lista"&&<button className="pv-action" onClick={()=>setPicker("wishlist")}>Crear mi lista <Plus size={16}/></button>}
      </div>}
      <div className="pv-home-section-bottom"><span>{priorityView==="lista"?"Tus cinco prioridades se pueden ampliar en el planificador completo.":"Clasificado por porcentaje de logros conocido, no por dificultad."}</span><Link className="pv-planner-cta" href="/planificador">Abrir mi planificador <ArrowUpRight size={17}/></Link></div>
    </section>
    <section className="pv-finale"><div><span className="pv-kicker"><Sparkles size={16}/> LA COLECCIÓN CONTINÚA</span><h2>Hay historias que se terminan.<br/><span>Y otras que se recuerdan para siempre.</span></h2></div><button onClick={()=>navigate("museo")} className="pv-action">Entrar al museo <ArrowRight size={17}/></button></section>

    <AnimatePresence>{picker && <CollectionPicker key={picker} kind={picker} games={picker==="showcase"?completed:unfinished}
      selected={picker==="showcase" ? (showcaseSaved ?? showcased.map((game)=>game.id)) : wishlist.filter((id)=>unfinished.some((game)=>game.id===id))}
      onSave={savePicker} onClose={()=>setPicker(null)}/>}</AnimatePresence>
  </div>;
}
