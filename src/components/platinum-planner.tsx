"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpenCheck, CheckCircle2, CirclePause,
  Plus, Search, Target, Trash2, X,
} from "lucide-react";
import { GameArtwork } from "@/components/game-artwork";
import { hours, isCompleted, percentage, type Game } from "@/lib/games";
import {
  addToPlanner, priorityOrder, readPlanner, savePlanner,
  type PlanPriority, type PlannedGame, type PlanStatus,
} from "@/lib/planner";

const states: Record<PlanStatus,string> = {
  "por-jugar": "Por empezar", "en-curso": "En progreso", pausado:"En pausa",
};
const priorities: Record<PlanPriority,string> = { alta:"Alta", media:"Media", baja:"Baja" };

type Props = { games: Game[]; steamId: string; isSteam: boolean };

export function PlatinumPlanner({games,steamId,isSteam}:Props) {
  const [entries,setEntries] = useState<PlannedGame[]>([]);
  const [ready,setReady] = useState(false);
  const [cached,setCached] = useState<Record<number,Pick<Game,"unlocked"|"total"|"completedAt">>>({});
  const [search,setSearch] = useState("");
  const [pick,setPick] = useState(false);
  const [pickSearch,setPickSearch] = useState("");
  const [statusFilter,setStatusFilter] = useState("todos");
  const [sort,setSort] = useState("prioridad");
  const visibleGames=useMemo(()=>games.map((game)=>({...game,...(cached[game.id]??{})})),[games,cached]);
  const gameMap = useMemo(()=>new Map(visibleGames.map((g)=>[g.id,g])),[visibleGames]);

  useEffect(()=>{
    try {
      const raw = localStorage.getItem("platinum-vault:logros:v2:"+steamId);
      if(raw){
        const stored=JSON.parse(raw) as {savedAt?:number;snapshots?:Record<string,Game>};
        if(stored.savedAt && Date.now()-stored.savedAt<12*60*60*1000 && stored.snapshots){
          const fresh:Record<number,Pick<Game,"unlocked"|"total"|"completedAt">>={};
          for(const game of games){
            const snap=stored.snapshots[String(game.id)];
            if(snap)fresh[game.id]={unlocked:snap.unlocked,total:snap.total,completedAt:snap.completedAt};
          }
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCached(fresh);
        }
      }
    }catch{}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(readPlanner(steamId,games));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  },[steamId,games]);

  const persist = (next:PlannedGame[])=>{setEntries(next);savePlanner(steamId,next);};
  const edit = (id:number,patch:Partial<PlannedGame>)=>persist(entries.map((item)=>item.appId===id?{...item,...patch}:item));
  const records = useMemo(()=>entries
    .map((entry)=>({entry,game:gameMap.get(entry.appId)}))
    .filter((item):item is {entry:PlannedGame;game:Game}=>Boolean(item.game))
    .filter(({game})=>game.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))
    .filter(({entry,game})=>statusFilter==="todos"||statusFilter===entry.status||(statusFilter==="completados"&&isCompleted(game)))
    .sort((a,b)=>{
      if (sort==="progreso")return (percentage(b.game)??-1)-(percentage(a.game)??-1);
      if (sort==="horas")return b.game.playtime-a.game.playtime;
      if (sort==="recientes")return b.entry.addedAt-a.entry.addedAt;
      return priorityOrder[a.entry.priority]-priorityOrder[b.entry.priority] ||
        ((percentage(b.game)??-1)-(percentage(a.game)??-1));
    }),[entries,gameMap,search,statusFilter,sort]);
  const candidates=useMemo(()=>visibleGames
    .filter((g)=>!isCompleted(g)&&!entries.some((entry)=>entry.appId===g.id))
    .filter((g)=>g.name.toLocaleLowerCase("es").includes(pickSearch.toLocaleLowerCase("es")))
    .sort((a,b)=>a.name.localeCompare(b.name,"es")).slice(0,60),[visibleGames,entries,pickSearch]);
  const completedCount=entries.filter((row)=>{const g=gameMap.get(row.appId);return g?isCompleted(g):false;}).length;

  return <main className="plan-page">
    <div className="plan-topline"><Link href="/?seccion=inicio"><ArrowLeft size={16}/> Volver al inicio</Link><span>PLATINUM VAULT / PLANIFICACIÓN PERSONAL</span></div>
    <section className="plan-hero">
      <span className="plan-kicker"><Target size={16}/> TU PRÓXIMA CONQUISTA COMIENZA AQUÍ</span>
      <h1>No es una lista.<br/><em>Es tu próximo desafío.</em></h1>
      <p>Organiza los juegos que quieres completar, asigna prioridades, registra tu estrategia y sigue tus logros reales de Steam.</p>
      <div className="plan-hero-actions"><button onClick={()=>setPick(true)} className="plan-primary"><Plus size={18}/> Añadir un juego</button><span className="plan-guide-link plan-guide-hint"><BookOpenCheck size={17}/> Guías para todos tus juegos</span></div>
      <div className="plan-metrics">
        <div><strong>{entries.length}</strong><span>En tu plan</span></div>
        <div><strong>{entries.filter((entry)=>entry.status==="en-curso").length}</strong><span>En progreso</span></div>
        <div><strong>{completedCount}</strong><span>Al 100 % en Steam</span></div>
      </div>
    </section>
    <section className="plan-body">
      <div className="plan-header"><div><span className="plan-kicker">EL MAPA DE TUS OBJETIVOS</span><h2>Tu hoja de ruta</h2></div><button onClick={()=>setPick(true)} className="plan-add"><Plus size={16}/> Agregar juegos</button></div>
      <div className="plan-controls">
        <label className="plan-search"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar en tu plan..."/></label>
        <select aria-label="Filtrar estado" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
          <option value="todos">Todos los estados</option><option value="en-curso">En progreso</option><option value="por-jugar">Por empezar</option><option value="pausado">En pausa</option><option value="completados">Completados en Steam</option>
        </select>
        <select aria-label="Ordenar el plan" value={sort} onChange={(e)=>setSort(e.target.value)}>
          <option value="prioridad">Prioridad y progreso</option><option value="progreso">Más cerca del 100 %</option><option value="horas">Más horas jugadas</option><option value="recientes">Últimos añadidos</option>
        </select>
      </div>
      {!ready?<div className="plan-empty">Preparando tu lista...</div>:!records.length?<div className="plan-empty">
        <Target size={38}/><h3>{entries.length?"No hay juegos con estos filtros.":"Todavía no tienes juegos en tu plan."}</h3>
        <p>Añade títulos de tu biblioteca para seguirlos sin limitarte a los cinco que aparecen en el inicio.</p>
        <button className="plan-primary" onClick={()=>{setSearch("");setStatusFilter("todos");setPick(true);}}><Plus size={16}/> Elegir juegos</button>
      </div>:<div className="plan-list">{records.map(({game,entry},i)=>{
        const pct=percentage(game);
        const finished=isCompleted(game);
        return <motion.article layout key={game.id} className={"plan-card "+(finished?"plan-card-finished":"")} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.035,.3)}}>
          <Link className="plan-card-poster" href={"/juegos/"+game.id+"?desde=planificador"}><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/></Link>
          <div className="plan-card-main"><div className="plan-card-title"><Link href={"/juegos/"+game.id+"?desde=planificador"}>{game.name} <ArrowUpRight size={15}/></Link>
            <span>{finished?<><CheckCircle2 size={14}/> Completado en Steam</>:pct===null?"Sin datos de logros":pct+" % conseguido"}</span></div>
            <div className="plan-progress"><span style={{width:(pct??0)+"%"}}/></div>
            <div className="plan-card-small"><span>{game.total===null?"Logros sin consultar":(game.total-(game.unlocked??0))+" logros pendientes"}</span><span>{hours(game.playtime)} horas jugadas</span></div>
            <div className="plan-card-edit">
              <label>Estado <select aria-label={"Estado de "+game.name} value={entry.status} onChange={(e)=>edit(game.id,{status:e.target.value as PlanStatus})}>{Object.entries(states).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <label>Prioridad <select aria-label={"Prioridad de "+game.name} value={entry.priority} onChange={(e)=>edit(game.id,{priority:e.target.value as PlanPriority})}>{Object.entries(priorities).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <label className="plan-notes">Mi objetivo / notas
              <textarea maxLength={500} value={entry.note} placeholder="Ej.: Terminar la historia, luego coleccionables; online al final..."
                onChange={(e)=>edit(game.id,{note:e.target.value})} rows={2}/>
            </label>
            <div className="plan-card-footer">
              <Link href={"/guias/"+game.id} className="plan-guide-button"><BookOpenCheck size={16}/> {game.id===447040?"Abrir guía revisada":"Generar guía personalizable"} <ArrowRight size={15}/></Link>
              <button className="plan-remove" title="Quitar del plan" onClick={()=>persist(entries.filter((row)=>row.appId!==game.id))}><Trash2 size={16}/> Quitar</button>
            </div>
          </div>
        </motion.article>;
      })}</div>}
      <p className="plan-disclaimer"><CirclePause size={16}/> La prioridad, el estado y tus notas son manuales. El porcentaje y los logros completados proceden de Steam. Los cambios se guardan en este navegador, no todavía en Supabase.</p>
    </section>
    <AnimatePresence>{pick&&<motion.div className="plan-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={()=>setPick(false)}>
      <motion.section className="plan-modal" role="dialog" aria-modal="true" aria-label="Añadir juegos al plan" onMouseDown={(e)=>e.stopPropagation()}
        initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} exit={{opacity:0,y:24}}>
        <div className="plan-modal-top"><div><span className="plan-kicker">NUEVO OBJETIVO</span><h2>¿Qué juego viene después?</h2><p>{isSteam?"Selecciona cualquier juego pendiente de tu biblioteca.":"Ejemplos de juegos mientras no hay sesión de Steam."}</p></div><button onClick={()=>setPick(false)} aria-label="Cerrar"><X size={20}/></button></div>
        <label className="plan-search"><Search size={18}/><input autoFocus placeholder="Escribe un juego..." value={pickSearch} onChange={(e)=>setPickSearch(e.target.value)}/></label>
        <div className="plan-pick-results">{candidates.map((game)=><button key={game.id} onClick={()=>{persist(addToPlanner(entries,game.id));setPick(false);setPickSearch("");}}>
          <div className="plan-mini-art"><GameArtwork id={game.id} name={game.name} iconHash={game.iconHash}/></div>
          <div><strong>{game.name}</strong><small>{percentage(game)===null?"Logros sin consultar":percentage(game)+" % de logros"} · {hours(game.playtime)} h</small></div>
          <Plus size={19}/>
        </button>)}{!candidates.length&&<p>Sin resultados. Busca por otro nombre.</p>}</div>
      </motion.section></motion.div>}</AnimatePresence>
    </main>;
}
