"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2, CircleAlert,
  CircleHelp, Clock3, ExternalLink, Flag, Gamepad2, ListChecks, LoaderCircle,
  LockKeyhole, MonitorPlay, RotateCcw, Search, ShieldAlert, SlidersHorizontal, Trophy,
} from "lucide-react";
import { classifyAchievement, GUIDE_APP_ID, GUIDE_SOURCES, stageInfo, WATCH_DOGS_2_INFO, type RouteStage } from "@/lib/watch-dogs-guide";
import type { AchievementDetail, GameAchievementData } from "@/lib/achievement";
import { GameArtwork } from "@/components/game-artwork";

type Props = { connected: boolean; steamId: string; gameTitle: string; iconHash?: string };
type Story = "en-curso" | "terminada";
type Multi = "al-final" | "adelantar";
type Classified = { achievement: AchievementDetail; stage: RouteStage; tip?: string; verified: boolean };
const stages: RouteStage[] = ["historia","secundarias","limpieza","dlc","online","revisar"];
const manualChecks: Record<Exclude<RouteStage,"revisar">,string[]> = {
  historia:["Revisar las operaciones disponibles en DedSec","Aprovechar objetivos sencillos al avanzar"],
  secundarias:["Comprobar operaciones desbloqueadas por la historia","Completar la cadena de mejoras del eKart"],
  limpieza:["Revisar las 24 ubicaciones de datos clave","Revisar ScoutX y logros de actividades","Reservar dinero para compras pendientes"],
  dlc:["Comprobar que las expansiones están disponibles","Completar las operaciones del contenido adicional"],
  online:["Comprobar que los servicios online funcionan","Coordinar sesiones cuando un objetivo requiera otros jugadores"],
};

function useSavedGuideSettings(key: string) {
  const [manual,setManual] = useState<Record<string,boolean>>({});
  const [story,setStory] = useState<Story>("en-curso");
  const [multi,setMulti] = useState<Multi>("al-final");
  const [hasDlc,setHasDlc] = useState(true);
  useEffect(()=>{
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "null") as {
        manual?:Record<string,boolean>;story?:Story;multi?:Multi;hasDlc?:boolean;
      } | null;
      if(stored){
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManual(stored.manual??{});
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStory(stored.story==="terminada"?"terminada":"en-curso");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMulti(stored.multi==="adelantar"?"adelantar":"al-final");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasDlc(stored.hasDlc!==false);
      }
    }catch{}
  },[key]);
  useEffect(()=>{
    try{localStorage.setItem(key,JSON.stringify({manual,story,multi,hasDlc}));}catch{}
  },[key,manual,story,multi,hasDlc]);
  return {manual,setManual,story,setStory,multi,setMulti,hasDlc,setHasDlc};
}

export function GuideExperience({connected,steamId,gameTitle,iconHash}:Props) {
  const [data,setData] = useState<GameAchievementData | null>(null);
  const [loading,setLoading] = useState(connected);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [showUnlocked,setShowUnlocked] = useState(false);
  const [query,setQuery] = useState("");
  const settings=useSavedGuideSettings("platinum-vault:guia:v1:"+steamId+":"+GUIDE_APP_ID);

  useEffect(()=>{
    if(!connected)return;
    const controller=new AbortController();
    const load=async()=>{
      try{
        // Steam sigue siendo la fuente del estado; las comprobaciones manuales no falsifican logros.
        const response=await fetch("/api/steam/juegos/"+GUIDE_APP_ID,{cache:"no-store",signal:controller.signal});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||"Steam no ha respondido.");
        if(!controller.signal.aborted)setData(result as GameAchievementData);
      }catch(err){
        if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Error inesperado.");
      }finally{if(!controller.signal.aborted)setLoading(false);}
    };
    void load();
    return()=>controller.abort();
  },[connected,retry]);

  const classified=useMemo<Classified[]>(()=>data?.achievements.map((achievement)=>{
    const result=classifyAchievement(achievement);
    return {achievement,stage:result.stage,tip:result.rule?.tip,verified:result.rule!==null};
  })??[],[data]);
  const completed=classified.filter(({achievement})=>achievement.unlocked).length;
  const remaining=classified.length-completed;
  const unclassified=classified.filter((row)=>!row.verified).length;
  const order=useMemo<RouteStage[]>(()=>{
    const initial:RouteStage[]=settings.story==="terminada"?["secundarias","limpieza","historia","dlc","online","revisar"]:[...stages];
    return settings.multi==="adelantar" ? ["online",...initial.filter((stage)=>stage!=="online")] : initial;
  },[settings.story,settings.multi]);

  return <main className="guide-page">
    <div className="guide-nav">
      <Link href="/planificador"><ArrowLeft size={17}/> Mi planificador</Link>
      <span>PLATINUM VAULT / PRIMER PROTOTIPO DE GUÍAS</span>
      <Link href={"/juegos/"+GUIDE_APP_ID+"?desde=planificador"}>Ficha del juego <ArrowRight size={16}/></Link>
    </div>
    <header className="guide-hero">
      <div className="guide-cover"><GameArtwork id={GUIDE_APP_ID} name={gameTitle} iconHash={iconHash}/></div>
      <div>
        <span className="guide-kicker"><BookOpenCheck size={17}/> GUÍA PERSONALIZADA · EDICIÓN PILOTO</span>
        <h1>Watch Dogs 2<br/><em>Tu ruta al 100 %.</em></h1>
        <p>Las fases se adaptan a los logros que realmente te faltan, no a una lista genérica. Los requisitos se contrastan con fuentes externas y los objetivos aún no identificados se señalan claramente.</p>
        <div className="guide-hero-stats"><div><strong>{data?.available?data.total:"—"}</strong><span>Logros en Steam</span></div><div><strong>{data?.available?completed:"—"}</strong><span>Obtenidos</span></div><div><strong>{data?.available?remaining:"—"}</strong><span>Restantes</span></div></div>
      </div>
    </header>
    <section className="guide-content">
      <div className="guide-validation"><div><Flag size={18}/><strong>Sin perdibles confirmados</strong><small>{WATCH_DOGS_2_INFO.missable}</small></div>
        <div><Gamepad2 size={18}/><strong>Sin dificultad obligatoria</strong><small>{WATCH_DOGS_2_INFO.difficulty}</small></div>
        <div><RotateCcw size={18}/><strong>No requiere NG+</strong><small>{WATCH_DOGS_2_INFO.newGamePlus}</small></div>
        <div><MonitorPlay size={18}/><strong>Online y DLC</strong><small>Hay objetivos vinculados a servicios y contenidos adicionales.</small></div>
      </div>
      {!connected?<div className="guide-message"><LockKeyhole size={34}/><h2>Conecta Steam para personalizar tu ruta</h2><p>La guía está preparada, pero necesitamos consultar tus logros para saber cuáles faltan.</p><a href="/api/auth/steam">Conectar mi cuenta <ArrowRight size={16}/></a></div>
      :loading?<div className="guide-message"><LoaderCircle className="guide-spin" size={34}/><h2>Consultando tu progreso en Steam</h2><p>Comprobando logros y organizando las fases...</p></div>
      :error?<div className="guide-message"><CircleAlert size={34}/><h2>No se pudo cargar tu progreso</h2><p>{error}</p><button onClick={()=>{setLoading(true);setError("");setRetry((n)=>n+1);}}>Reintentar consulta</button></div>
      :!data?.available?<div className="guide-message"><CircleHelp size={34}/><h2>No hay logros accesibles para esta partida</h2><p>Steam no ha devuelto logros de esta cuenta. No podemos calcular una ruta personalizada sin ellos.</p></div>
      :<>
        <div className="guide-settings"><div><span className="guide-kicker"><SlidersHorizontal size={15}/> PERSONALIZA EL ORDEN</span><h2>¿Cómo quieres jugar?</h2></div>
          <label>Historia principal
            <select value={settings.story} onChange={(event)=>settings.setStory(event.target.value as Story)}>
              <option value="en-curso">Historia en progreso / nueva partida</option><option value="terminada">Ya terminé la historia</option>
            </select>
          </label>
          <label>Logros online
            <select value={settings.multi} onChange={(event)=>settings.setMulti(event.target.value as Multi)}>
              <option value="al-final">Dejarlos para el final</option><option value="adelantar">Revisarlos primero</option>
            </select>
          </label>
          <label className="guide-dlc"><input type="checkbox" checked={settings.hasDlc} onChange={(event)=>settings.setHasDlc(event.target.checked)}/> Tengo los DLC necesarios</label>
        </div>
        <div className="guide-progress"><div><strong>{completed} de {data.total} logros</strong><span>{Math.round(completed/data.total*100)} % completado en Steam</span></div>
          <div><span style={{width:(completed/data.total*100)+"%"}}/></div>
          {unclassified>0&&<p><ShieldAlert size={16}/> {unclassified} logros no coinciden con las entradas revisadas. Quedan agrupados aparte, sin etiquetas inventadas.</p>}
        </div>
        <div className="guide-list-header"><div><span className="guide-kicker"><ListChecks size={16}/> RUTA PERSONALIZADA</span><h2>Lo que te queda por hacer</h2></div>
          <div><label className="guide-search"><Search size={17}/><input placeholder="Buscar logros..." value={query} onChange={(e)=>setQuery(e.target.value)}/></label>
            <label className="guide-show-won"><input type="checkbox" checked={showUnlocked} onChange={(e)=>setShowUnlocked(e.target.checked)}/> Ver ya obtenidos</label></div>
        </div>
        <div className="guide-stages">
          {order.map((stage,index)=>{
            const rows=classified.filter((entry)=>entry.stage===stage);
            const pending=rows.filter((entry)=>!entry.achievement.unlocked);
            const visible=rows.filter(({achievement})=>(showUnlocked||!achievement.unlocked)&&
              (!query|| (achievement.name+" "+achievement.description).toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))));
            if(!rows.length || (!visible.length && query))return null;
            const omitted=stage==="dlc"&&!settings.hasDlc;
            return <section className={"guide-stage "+(omitted?"guide-stage-omitted":"")} key={stage}>
              <div className="guide-stage-head"><span className="guide-stage-num">{String(index+1).padStart(2,"0")}</span>
                <div><h3>{stageInfo[stage].title}</h3><p>{stageInfo[stage].summary}</p></div>
                <span className="guide-stage-status">{rows.length-pending.length}/{rows.length} obtenidos</span>
              </div>
              {omitted&&<div className="guide-warning"><CircleAlert size={18}/> No has marcado los DLC como disponibles. Estos objetivos siguen siendo necesarios para el 100 % total; no se eliminan de tu cuenta.</div>}
              {!pending.length&&<div className="guide-stage-done"><CheckCircle2 size={17}/> Todos los logros de esta fase están obtenidos.</div>}
              {visible.length>0&&<div className="guide-achievements">{visible.map(({achievement,tip,verified})=><article key={achievement.apiName} className={"guide-achievement "+(achievement.unlocked?"guide-achievement-won":"")}>
                <span>{achievement.unlocked?<CheckCircle2 size={22}/>:<Trophy size={22}/>}</span>
                <div><strong>{achievement.name}</strong><p>{achievement.hidden&&!achievement.unlocked?"Objetivo oculto en Steam. Revisa su ficha si quieres revelar detalles.":achievement.description||"Descripción no disponible."}</p>
                  {tip&&<small className="guide-tip">Consejo: {tip}</small>}
                  <div className="guide-labels">
                    {verified?<><span>Sin requisito de dificultad</span>{stage==="online"&&<span>Multijugador</span>}{stage==="dlc"&&<span>Contenido adicional</span>}</>
                    :<span>Clasificación pendiente de confirmar</span>}
                  </div>
                </div><span className="guide-achievement-state">{achievement.unlocked?"Obtenido en Steam":"Pendiente"}</span>
              </article>)}</div>}
              {stage!=="revisar"&&pending.length>0&&<div className="guide-manual"><strong>Preparación manual de esta fase</strong>
                {(manualChecks[stage]??[]).map((task,i)=>{
                  const id=stage+":"+i;
                  return <label key={id}><input type="checkbox" checked={Boolean(settings.manual[id])}
                    onChange={(event)=>settings.setManual((old)=>({...old,[id]:event.target.checked}))}/>{task}</label>;
                })}
                <p><Clock3 size={14}/> {stageInfo[stage].nextStep}</p>
              </div>}
            </section>;
          })}
        </div>
        <div className="guide-sources"><h3>Fuentes y límites del prototipo</h3><p>La clasificación se ha revisado usando el listado oficial de Steam, guías comunitarias y registros de DLC. Esta versión no predice el tiempo restante ni verifica el estado de misiones o coleccionables dentro del guardado. La checklist manual no desbloquea logros en Steam.</p>
          <div>{GUIDE_SOURCES.map((source)=><a key={source.url} target="_blank" rel="noopener noreferrer" href={source.url}>{source.title} <ExternalLink size={14}/></a>)}</div>
        </div>
      </>}
    </section>
  </main>;
}
