"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown,
  CircleAlert, CircleCheck, ClipboardCheck, Download, ExternalLink, Flag, Gamepad2,
  ListFilter, LoaderCircle, Pencil, RefreshCcw, Save, Search, ShieldAlert,
  SlidersHorizontal, Sparkles, Target, Trophy, X,
} from "lucide-react";
import { GameArtwork } from "@/components/game-artwork";
import type { GameAchievementData, AchievementDetail } from "@/lib/achievement";
import {
  DEFAULT_STAGE_ORDER, FLAG_IDS, FLAG_LABELS, STAGE_DESCRIPTIONS,
  defaultGuidePreferences, guideForAchievement, normalizedPreferences,
  orderedStages, steamGuideLinks,
  type GuideFlag, type GuideFlagId, type GuideOverride, type GuidePreferences, type GuideStageId,
} from "@/lib/universal-guide";
import { GUIDE_APP_ID, GUIDE_SOURCES, WATCH_DOGS_2_INFO } from "@/lib/watch-dogs-guide";

type Props = {
  appId: number;
  name: string;
  iconHash?: string;
  steamId: string;
  connected: boolean;
};
const EMPTY_ACHIEVEMENTS:AchievementDetail[]=[];
const GUIDE_STORAGE="platinum-vault:guia-universal:v1:";
const STEAM_STAGE_ORDER:GuideStageId[]=[...DEFAULT_STAGE_ORDER];
const prepTasks:Record<GuideStageId,string[]> = {
  historia:["Revisar logros potencialmente perdibles antes de avanzar","Anotar el punto de la historia que tienes completado"],
  secundarias:["Comprobar qué misiones opcionales están disponibles"],
  limpieza:["Revisar coleccionables y ubicaciones pendientes"],
  dificultad:["Confirmar qué dificultades exige realmente el juego"],
  ngplus:["Comprobar si la siguiente partida conserva equipo y progreso"],
  dlc:["Verificar qué expansiones tienes y cuáles requieren logros"],
  online:["Comprobar disponibilidad de servidores y jugadores"],
  revisar:["Consultar las fuentes antes de asignar requisitos"],
};

function validSource(source:string):string|null{
  try{
    const url=new URL(source);
    return (url.protocol==="http:"||url.protocol==="https:") ? url.toString() : null;
  }catch{return null;}
}
function FlagEditor({value,onChange}:{value:GuideFlag;onChange:(next:GuideFlag)=>void}){
  return <select value={value} onChange={(e)=>onChange(e.target.value as GuideFlag)}>
    <option value="unknown">Sin verificar</option>
    <option value="yes">Sí</option>
    <option value="no">No</option>
  </select>;
}

export function UniversalGuideExperience({appId,name,iconHash,steamId,connected}:Props){
  const storageKey=GUIDE_STORAGE+steamId+":"+appId;
  const [prefs,setPrefs]=useState<GuidePreferences>(defaultGuidePreferences);
  const [hydrated,setHydrated]=useState(false);
  const [data,setData]=useState<GameAchievementData|null>(null);
  const [loading,setLoading]=useState(connected);
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  const [textSearch,setTextSearch]=useState("");
  const [editor,setEditor]=useState<string|null>(null);
  const [onlyUnknown,setOnlyUnknown]=useState(false);
  const isCurated=appId===GUIDE_APP_ID;

  useEffect(()=>{
    let stored:unknown=null;
    try{stored=JSON.parse(localStorage.getItem(storageKey)??"null");}catch{}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(normalizedPreferences(stored));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  },[storageKey]);

  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(storageKey,JSON.stringify(prefs));}catch{}
  },[storageKey,prefs,hydrated]);

  useEffect(()=>{
    if(!connected)return;
    const controller=new AbortController();
    async function fetchAchievements(){
      try{
        const response=await fetch("/api/steam/juegos/"+appId,{signal:controller.signal,cache:"no-store"});
        const payload=await response.json();
        if(!response.ok)throw new Error(payload.error||"No fue posible consultar los logros de Steam.");
        if(!controller.signal.aborted)setData(payload as GameAchievementData);
      }catch(e){
        if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Error desconocido de Steam.");
      }finally{
        if(!controller.signal.aborted)setLoading(false);
      }
    }
    void fetchAchievements();
    return ()=>controller.abort();
  },[appId,connected,revision]);

  const list=data?.achievements??EMPTY_ACHIEVEMENTS;
  const classified=useMemo(()=>list.map((item)=>guideForAchievement(appId,item,prefs)),[appId,list,prefs]);
  const missing=classified.filter((item)=>!item.detail.unlocked).length;
  const uncertain=classified.filter((item)=>!item.detail.unlocked&&item.evidence!=="curated"&&item.evidence!=="manual").length;
  const flagged=classified.filter((item)=>!item.detail.unlocked&&item.flags.missable==="yes").length;
  const stages=useMemo(()=>orderedStages(prefs),[prefs]);
  const shown=useMemo(()=>classified.filter((item)=>{
    if(!prefs.showUnlocked&&item.detail.unlocked)return false;
    if(onlyUnknown&&(item.evidence==="curated"||item.evidence==="manual"))return false;
    const searchable=item.detail.hidden&&!prefs.revealHidden&&!item.detail.unlocked
      ? "logro oculto" : item.detail.name+" "+item.detail.description+" "+item.notes;
    return searchable.toLocaleLowerCase("es").includes(textSearch.trim().toLocaleLowerCase("es"));
  }),[classified,prefs.showUnlocked,prefs.revealHidden,onlyUnknown,textSearch]);

  const update=(value:Partial<GuidePreferences>)=>setPrefs((current)=>({...current,...value}));
  const patchOverride=(apiName:string,patch:Partial<GuideOverride>)=>setPrefs(current=>{
    const original=current.overrides[apiName]??{};
    return {...current,overrides:{...current.overrides,[apiName]:{...original,...patch}}};
  });
  const patchFlag=(apiName:string,id:GuideFlagId,value:GuideFlag)=>setPrefs(current=>{
    const previous=current.overrides[apiName]??{};
    return {...current,overrides:{...current.overrides,[apiName]:{
      ...previous, flags:{...previous.flags,[id]:value},
    }}};
  });
  const moveStage=(stage:GuideStageId,direction:-1|1)=>{
    setPrefs(current=>{
      const values=[...current.stageOrder];const index=values.indexOf(stage);const next=index+direction;
      if(index<0||next<0||next>=values.length)return current;
      [values[index],values[next]]=[values[next],values[index]];
      return {...current,stageOrder:values};
    });
  };
  const toggleCheck=(key:string,checked:boolean)=>setPrefs(current=>({
    ...current,checks:{...current.checks,[key]:checked},
  }));
  const resetStageOrder=()=>update({stageOrder:[...STEAM_STAGE_ORDER]});
  const exportGuide=()=>{
    const payload=JSON.stringify({
      format:"platinum-vault-guide-settings",version:1,appId,name,exportedAt:new Date().toISOString(),
      preferences:prefs,
    },null,2);
    const url=URL.createObjectURL(new Blob([payload],{type:"application/json"}));
    const a=document.createElement("a");
    a.href=url;a.download="platinum-vault-guia-"+appId+".json";document.body.appendChild(a);a.click();
    a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const retry=()=>{setError("");setLoading(true);setRevision((value)=>value+1);};
  const editorEntry=classified.find((item)=>item.detail.apiName===editor)??null;

  return <main className="universal-guide">
    <div className="ug-back"><Link href="/planificador"><ArrowLeft size={16}/> Volver al planificador</Link><span>PLATINUM VAULT / GENERADOR DE RUTAS</span><Link href={"/juegos/"+appId+"?desde=planificador"}>Ficha del juego <ArrowRight size={15}/></Link></div>
    <section className="ug-hero">
      <div className="ug-cover"><GameArtwork id={appId} name={name} iconHash={iconHash}/></div>
      <div className="ug-hero-content">
        <span className="ug-kicker"><BookOpen size={17}/> GUÍA PERSONALIZADA · {isCurated?"BASE REVISADA":"BASE AUTOMÁTICA"}</span>
        <h1>{name}</h1>
        <p>Tu ruta al 100 % se construye con los logros de tu cuenta. Puedes cambiar la clasificación y el orden de cada objetivo según tu partida.</p>
        <div className="ug-highlights">
          <div><strong>{data?.available?data.total:"—"}</strong><span>Logros</span></div>
          <div><strong>{data?.available?data.unlocked:"—"}</strong><span>Obtenidos</span></div>
          <div><strong>{data?.available?missing:"—"}</strong><span>Pendientes</span></div>
          <div><strong>{data?.available?uncertain:"—"}</strong><span>Por verificar</span></div>
        </div>
      </div>
    </section>
    <div className="ug-body">
      <div className="ug-disclosure"><ShieldAlert size={21}/><div><strong>{isCurated?"Guía con clasificación específica":"Guía automática preliminar"}</strong>
        <p>{isCurated?"La clasificación inicial de fases procede de la guía revisada de Watch Dogs 2.":"Steam no informa qué logros son perdibles, requieren NG+, dificultades específicas o están ligados a DLC. Las coincidencias por palabras son sugerencias, no requisitos confirmados."} Todos los cambios que hagas se guardarán solo en este navegador.</p>
      </div></div>
      {!connected ? <div className="ug-message"><Gamepad2 size={32}/><h2>Conecta Steam para obtener tu ruta</h2><p>Necesitamos consultar qué logros has conseguido para construir una guía personalizada.</p><a href="/api/auth/steam">Conectar Steam <ArrowRight size={16}/></a></div>
        :loading ? <div className="ug-message"><LoaderCircle className="ug-spin" size={32}/><h2>Consultando logros de Steam</h2><p>Preparando las fases a partir de tu progreso…</p></div>
        :error ? <div className="ug-message"><CircleAlert size={32}/><h2>No se pudieron cargar los logros</h2><p>{error}</p><button onClick={retry}>Volver a consultar <RefreshCcw size={16}/></button></div>
        :!data?.available ? <div className="ug-message"><CircleAlert size={32}/><h2>Logros no disponibles</h2><p>{data?.note??"Esta aplicación no proporciona una lista de logros accesible."}</p></div>
        : <>
          <section className="ug-settings">
            <div className="ug-section-heading"><span className="ug-kicker"><SlidersHorizontal size={16}/> TU PARTIDA</span><h2>Adapta la ruta a cómo estás jugando</h2></div>
            <div className="ug-settings-grid">
              <label>Estado de la historia<select value={prefs.story} onChange={e=>update({story:e.target.value as GuidePreferences["story"]})}>
                <option value="nueva">Nueva partida</option><option value="en-curso">Historia en progreso</option><option value="terminada">Historia terminada</option>
              </select></label>
              <label>Multijugador<select value={prefs.online} onChange={e=>update({online:e.target.value as GuidePreferences["online"]})}>
                <option value="al-final">Prefiero dejarlo al final</option><option value="primero">Revisarlo primero</option>
              </select></label>
              <label>Contenido adicional<select value={prefs.dlc} onChange={e=>update({dlc:e.target.value as GuidePreferences["dlc"]})}>
                <option value="desconocido">No sé si tengo DLC</option><option value="si">Tengo DLC</option><option value="no">No tengo DLC</option>
              </select></label>
              <label>NG+ disponible<select value={prefs.newGamePlus} onChange={e=>update({newGamePlus:e.target.value as GuidePreferences["newGamePlus"]})}>
                <option value="desconocido">Sin comprobar</option><option value="si">Sí</option><option value="no">No</option>
              </select></label>
              <label>Plan de dificultad<select value={prefs.difficulty} onChange={e=>update({difficulty:e.target.value as GuidePreferences["difficulty"]})}>
                <option value="sin-decidir">Sin decidir</option><option value="normal">Dificultad normal</option><option value="maxima">Máxima dificultad</option>
              </select></label>
            </div>
            {isCurated&&<p className="ug-curated-tip"><Check size={15}/> En Watch Dogs 2 no se exige NG+ ni dificultad concreta. Los logros online y DLC se revisan por separado. {WATCH_DOGS_2_INFO.online}</p>}
            {prefs.dlc==="no"&&<p className="ug-note"><CircleAlert size={16}/> Si el juego tiene logros de DLC, siguen contando en el total de Steam aunque no dispongas del contenido.</p>}
            {prefs.newGamePlus==="no"&&<p className="ug-note"><CircleAlert size={16}/> No disponer de NG+ no confirma que el juego no lo requiera. Comprueba los logros marcados con ese requisito.</p>}
          </section>

          <section className="ug-roadmap">
            <div className="ug-roadmap-title"><div><span className="ug-kicker"><Flag size={15}/> TU RUTA</span><h2>Fases y objetivos</h2><p>{missing} logros pendientes, {flagged} marcados manualmente como perdibles.</p></div>
              <div className="ug-toolbar-actions"><button onClick={retry}><RefreshCcw size={15}/> Actualizar Steam</button><button onClick={exportGuide}><Download size={15}/> Exportar mis ajustes</button></div>
            </div>
            <div className="ug-progress"><span style={{width:(data.total?data.unlocked/data.total*100:0)+"%"}}/></div>
            <p className="ug-progress-label">{data.unlocked} / {data.total} logros verificados por Steam. Las casillas manuales no alteran esta cifra.</p>
            <div className="ug-toolbar">
              <label className="ug-search"><Search size={17}/><input value={textSearch} onChange={e=>setTextSearch(e.target.value)} placeholder="Buscar entre los logros..."/></label>
              <label><input type="checkbox" checked={prefs.showUnlocked} onChange={e=>update({showUnlocked:e.target.checked})}/> Ver obtenidos</label>
              <label><input type="checkbox" checked={prefs.revealHidden} onChange={e=>update({revealHidden:e.target.checked})}/> Revelar ocultos</label>
              <label><input type="checkbox" checked={onlyUnknown} onChange={e=>setOnlyUnknown(e.target.checked)}/> Solo sin verificar</label>
            </div>
            <div className="ug-roadmap-note"><Sparkles size={17}/> Puedes mover las fases usando las flechas y abrir cualquier logro para corregir su clasificación. Los objetivos con evidencia incompleta aparecen señalados.</div>
            <div className="ug-stages">
              {stages.map((id,index)=>{
                const all=classified.filter(item=>item.stage===id);
                if(!all.length)return null;
                const visible=shown.filter(item=>item.stage===id).sort((a,b)=>
                  (a.priority==="alta"?-1:0)-(b.priority==="alta"?-1:0));
                const won=all.filter(item=>item.detail.unlocked).length;
                return <section key={id} className="ug-stage">
                  <div className="ug-stage-head">
                    <div className="ug-stage-count">{String(index+1).padStart(2,"0")}</div>
                    <div className="ug-stage-title"><h3>{STAGE_DESCRIPTIONS[id].title}</h3><p>{STAGE_DESCRIPTIONS[id].summary}</p></div>
                    <span className="ug-stage-progress">{won}/{all.length} obtenidos</span>
                    <div className="ug-stage-reorder"><button disabled={index===0} onClick={()=>moveStage(id,-1)} title="Subir fase"><ArrowUp size={16}/></button><button disabled={index===stages.length-1} onClick={()=>moveStage(id,1)} title="Bajar fase"><ArrowDown size={16}/></button></div>
                  </div>
                  {id==="online"&&prefs.online==="al-final"&&<p className="ug-stage-hint">Prefieres los logros online al final. Puedes mover esta fase cuando quieras.</p>}
                  {id==="dlc"&&prefs.dlc==="no"&&<p className="ug-stage-hint">Contenido no disponible según tus preferencias. Comprueba si es obligatorio para llegar al 100 %.</p>}
                  {visible.map(({detail,stage,evidence,flags,priority,notes,source,tip})=><article className={"ug-achievement "+(detail.unlocked?"obtained":"")} key={detail.apiName}>
                    <div className="ug-achievement-icon">
                      {detail.unlocked?<CircleCheck size={19}/>:flags.missable==="yes"?<CircleAlert size={19}/>:<Trophy size={19}/>}
                    </div>
                    <div className="ug-achievement-copy"><h4>{detail.hidden&&!prefs.revealHidden&&!detail.unlocked?"Logro oculto":detail.name}</h4>
                      <p>{detail.hidden&&!prefs.revealHidden&&!detail.unlocked?"Descripción oculta para evitar revelaciones de la historia.":detail.description||"Sin descripción proporcionada por Steam."}</p>
                      {tip&&<small>{tip}</small>}
                      <div className="ug-tags">
                        <span className={"ug-evidence "+evidence}>{evidence==="curated"?"Base revisada":evidence==="manual"?"Revisado por ti":evidence==="suggested"?"Sugerencia sin verificar":"Sin clasificar"}</span>
                        {priority==="alta"&&<span>Prioridad alta</span>}
                        {flags.missable==="yes"&&<span className="warning">Perdible (manual)</span>}
                        {Object.entries(flags).filter(([key,value])=>key!=="missable"&&value==="yes").map(([key])=><span key={key}>{FLAG_LABELS[key as GuideFlagId]} (manual)</span>)}
                        {notes&&<span>Notas guardadas</span>}
                        {source&&<span>Fuente añadida</span>}
                      </div>
                    </div>
                    <div className="ug-achievement-actions">
                      <span>{detail.unlocked?"OBTENIDO":"PENDIENTE"}</span>
                      <button onClick={()=>setEditor(detail.apiName)} aria-label={"Editar "+detail.name}><Pencil size={15}/> Personalizar</button>
                    </div>
                  </article>)}
                  {!visible.length&&<p className="ug-none">No hay logros de esta fase que coincidan con los filtros.</p>}
                  <div className="ug-checks"><strong>Preparación de esta fase <span>(manual)</span></strong>
                    {prepTasks[id].map((task,i)=>{
                      const key=id+":"+i;
                      return <label key={key}><input type="checkbox" checked={Boolean(prefs.checks[key])} onChange={e=>toggleCheck(key,e.target.checked)}/>{task}</label>;
                    })}
                  </div>
                </section>;
              })}
            </div>
            {!shown.length&&<div className="ug-none">No hay logros que coincidan con tu selección.</div>}
            <div className="ug-route-controls"><button onClick={resetStageOrder}><ListFilter size={15}/> Restaurar orden inicial de fases</button></div>
          </section>
          <section className="ug-research">
            <div><span className="ug-kicker"><BookOpen size={15}/> INVESTIGACIÓN ASISTIDA</span><h2>Fuentes para verificar la guía</h2>
              <p>La página prepara búsquedas y fuentes para este juego automáticamente. Actualmente <strong>no realiza una investigación web ni genera texto con IA</strong>; las etiquetas sin comprobar seguirán siendo sugerencias hasta que añadas una referencia o las revises. No necesitas claves de IA para usar esta versión.</p>
            </div>
            <div className="ug-research-links">{steamGuideLinks(appId).map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} <ExternalLink size={15}/></a>)}
              {isCurated&&GUIDE_SOURCES.filter(source=>!source.url.includes("/stats/")).map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ExternalLink size={15}/></a>)}
            </div>
          </section>
        </>}
    </div>
    {editorEntry&&<div className="ug-modal-backdrop" onMouseDown={()=>setEditor(null)}>
      <div className="ug-editor" role="dialog" aria-modal="true" aria-label="Editar logro" onMouseDown={e=>e.stopPropagation()}>
        <div className="ug-editor-top"><div><span className="ug-kicker"><Pencil size={15}/> EDITOR DE REQUISITOS</span><h2>{editorEntry.detail.name}</h2><p>La clasificación manual es válida para tu guía. No cambia los datos oficiales de Steam.</p></div><button onClick={()=>setEditor(null)} aria-label="Cerrar"><X size={20}/></button></div>
        <div className="ug-editor-body">
          <label>Fase de la ruta<select value={editorEntry.stage} onChange={e=>patchOverride(editorEntry.detail.apiName,{stage:e.target.value as GuideStageId,confirmed:false})}>
            {DEFAULT_STAGE_ORDER.map(id=><option key={id} value={id}>{STAGE_DESCRIPTIONS[id].title}</option>)}
          </select></label>
          <label>Prioridad<select value={editorEntry.priority} onChange={e=>patchOverride(editorEntry.detail.apiName,{priority:e.target.value as "alta"|"normal"})}>
            <option value="normal">Normal</option><option value="alta">Alta: revisar antes de avanzar</option>
          </select></label>
          <div className="ug-edit-flags"><strong>Requisitos del logro</strong>
            {FLAG_IDS.map(id=><label key={id}>{FLAG_LABELS[id]} <FlagEditor value={editorEntry.flags[id]} onChange={value=>patchFlag(editorEntry.detail.apiName,id,value)}/></label>)}
          </div>
          <label>Notas para tu ruta<textarea rows={4} maxLength={1500} value={editorEntry.notes} onChange={e=>patchOverride(editorEntry.detail.apiName,{notes:e.target.value})} placeholder="Qué debes hacer, en qué misión, advertencias, orden..."/></label>
          <label>Enlace a la fuente (opcional)<input value={editorEntry.source} maxLength={800} onChange={e=>patchOverride(editorEntry.detail.apiName,{source:e.target.value})} placeholder="https://..."/></label>
          {editorEntry.source&&(!validSource(editorEntry.source)?<span className="ug-bad-url">Escribe una URL válida que empiece por https:// o http://.</span>:<a href={validSource(editorEntry.source)??"#"} target="_blank" rel="noopener noreferrer" className="ug-source-preview">Abrir fuente guardada <ExternalLink size={14}/></a>)}
          <p className="ug-editor-caution"><ShieldAlert size={16}/> «Revisado por ti» significa clasificación manual. Una referencia no demuestra automáticamente que el requisito sea correcto.</p>
        </div>
        <div className="ug-editor-bottom">
          <button className="ug-editor-reset" onClick={()=>setPrefs(p=>{
            const overrides={...p.overrides};delete overrides[editorEntry.detail.apiName];return {...p,overrides};
          })}><RefreshCcw size={15}/> Restaurar sugerencia</button>
          <button onClick={()=>{patchOverride(editorEntry.detail.apiName,{stage:editorEntry.stage,confirmed:true});setEditor(null);}} className="ug-editor-save"><Save size={15}/> Guardar y marcar revisado</button>
        </div>
      </div>
    </div>}
  </main>;
}
