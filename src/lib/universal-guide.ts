import type { AchievementDetail } from "@/lib/achievement";
import { classifyAchievement, GUIDE_APP_ID } from "@/lib/watch-dogs-guide";

export type GuideStageId =
  | "historia" | "secundarias" | "limpieza" | "dificultad"
  | "ngplus" | "dlc" | "online" | "revisar";
export type GuideFlag = "unknown" | "yes" | "no";
export type GuideFlagId = "missable" | "difficulty" | "newGamePlus" | "multiplayer" | "downloadableContent";
export type GuideEvidence = "curated" | "suggested" | "manual" | "unknown";
export type GuidePreferences = {
  version: 1;
  story: "nueva" | "en-curso" | "terminada";
  online: "al-final" | "primero";
  dlc: "si" | "no" | "desconocido";
  newGamePlus: "si" | "no" | "desconocido";
  difficulty: "sin-decidir" | "normal" | "maxima";
  stageOrder: GuideStageId[];
  orderCustomized: boolean;
  showUnlocked: boolean;
  revealHidden: boolean;
  overrides: Record<string, GuideOverride>;
  checks: Record<string, boolean>;
};
export type GuideOverride = {
  stage?: GuideStageId;
  confirmed?: boolean;
  flags?: Partial<Record<GuideFlagId, GuideFlag>>;
  notes?: string;
  source?: string;
  priority?: "alta" | "normal";
};

export type ClassifiedAchievement = {
  detail: AchievementDetail;
  stage: GuideStageId;
  evidence: GuideEvidence;
  tip?: string;
  flags: Record<GuideFlagId, GuideFlag>;
  notes: string;
  source: string;
  priority: "alta" | "normal";
};

export const STAGE_DESCRIPTIONS: Record<GuideStageId, { title: string; summary: string }> = {
  historia: { title: "Historia principal", summary: "Objetivos vinculados a la campaña. Comprueba sus condiciones antes de avanzar." },
  secundarias: { title: "Misiones secundarias", summary: "Misiones opcionales y actividades desbloqueadas por el progreso." },
  limpieza: { title: "Exploración y limpieza", summary: "Coleccionables, actividades y objetivos que puedes organizar por zonas." },
  dificultad: { title: "Dificultad y desafíos", summary: "Objetivos vinculados a retos o dificultades. Verifica la condición exacta." },
  ngplus: { title: "Nueva partida y NG+", summary: "Objetivos que podrían depender de otra vuelta. Verifica si realmente hace falta." },
  dlc: { title: "Contenido adicional", summary: "Objetivos posiblemente vinculados a expansiones o modos adicionales." },
  online: { title: "Multijugador", summary: "Objetivos con posibles dependencias de servicios o de otros jugadores." },
  revisar: { title: "Pendientes de clasificar", summary: "Steam no contiene información suficiente para asignar estos logros con seguridad." },
};
export const DEFAULT_STAGE_ORDER: GuideStageId[] = [
  "historia", "secundarias", "limpieza", "dificultad", "ngplus", "dlc", "online", "revisar",
];
export const FLAG_LABELS: Record<GuideFlagId,string> = {
  missable:"Perdible", difficulty:"Dificultad", newGamePlus:"NG+",
  multiplayer:"Multijugador", downloadableContent:"DLC",
};
export const FLAG_IDS: GuideFlagId[] = ["missable","difficulty","newGamePlus","multiplayer","downloadableContent"];

export function defaultGuidePreferences(): GuidePreferences {
  return {
    version: 1, story:"en-curso", online:"al-final", dlc:"desconocido", newGamePlus:"desconocido",
    difficulty:"sin-decidir", stageOrder:[...DEFAULT_STAGE_ORDER], orderCustomized:false, showUnlocked:false,
    revealHidden:false, overrides:{}, checks:{},
  };
}

export function normalizedPreferences(raw: unknown): GuidePreferences {
  const defaults=defaultGuidePreferences();
  if(!raw || typeof raw!=="object")return defaults;
  const data=raw as Partial<GuidePreferences>;
  const stageSet=new Set(DEFAULT_STAGE_ORDER);
  const order=Array.isArray(data.stageOrder) ? data.stageOrder.filter(
    (entry):entry is GuideStageId=>typeof entry==="string" && stageSet.has(entry as GuideStageId),
  ) : [];
  const unique=[...new Set(order), ...DEFAULT_STAGE_ORDER.filter((entry)=>!order.includes(entry))];
  const overrides:Record<string,GuideOverride>={};
  if(data.overrides && typeof data.overrides==="object"){
    for(const [key,value] of Object.entries(data.overrides).slice(0,1000)){
      if(!value || typeof value!=="object" || key==="__proto__" || key==="constructor" || key==="prototype")continue;
      const item=value as GuideOverride;
      const flags: Partial<Record<GuideFlagId,GuideFlag>>={};
      for(const id of FLAG_IDS){
        const flag=item.flags?.[id];
        if(flag==="yes"||flag==="no"||flag==="unknown")flags[id]=flag;
      }
      overrides[key.slice(0,180)]={
        stage:item.stage && stageSet.has(item.stage)?item.stage:undefined,
        confirmed:item.confirmed===true,
        flags,
        notes:typeof item.notes==="string"?item.notes.slice(0,1500):"",
        source:typeof item.source==="string"?item.source.slice(0,800):"",
        priority:item.priority==="alta"?"alta":"normal",
      };
    }
  }
  return {
    ...defaults,
    story:["nueva","en-curso","terminada"].includes(data.story??"")?data.story!:defaults.story,
    online:data.online==="primero"?"primero":"al-final",
    dlc:data.dlc==="si"||data.dlc==="no"?data.dlc:"desconocido",
    newGamePlus:data.newGamePlus==="si"||data.newGamePlus==="no"?data.newGamePlus:"desconocido",
    difficulty:data.difficulty==="normal"||data.difficulty==="maxima"?data.difficulty:"sin-decidir",
    stageOrder:unique, orderCustomized:data.orderCustomized===true, showUnlocked:data.showUnlocked===true, revealHidden:data.revealHidden===true,
    overrides,
    checks:data.checks && typeof data.checks==="object" && !Array.isArray(data.checks)
      ? Object.fromEntries(Object.entries(data.checks).slice(0,1000).filter(([key,v])=>
        typeof v==="boolean" && key!=="__proto__" && key!=="constructor")) : {},
  };
}

function suggestionFor(entry: AchievementDetail): { stage:GuideStageId; tip?:string } {
  // Estas reglas sugieren una sala, NUNCA verifican requisitos.
  const text=(entry.name+" "+entry.description).toLocaleLowerCase("es");
  if(/\b(multiplayer|multijugador|co-?op|cooperativ[oa]|online|ranked match|partida clasificad[ao]|pvp)\b/i.test(text)){
    return {stage:"online",tip:"El texto menciona interacción online; confirma si el modo sigue disponible."};
  }
  if(/\b(new game plus|new game\+|ng\+|nueva partida\+|segunda vuelta)\b/i.test(text)){
    return {stage:"ngplus",tip:"Se menciona una nueva partida; revisa los requisitos exactos."};
  }
  if(/\b(dlc|expansion|expansión|season pass|contenido descargable)\b/i.test(text)){
    return {stage:"dlc",tip:"Se menciona contenido adicional; comprueba qué expansión requiere."};
  }
  if(/\b(hard mode|hard difficulty|hardcore|nightmare difficulty|ultra hard|máxima dificultad|modo dificil|modo difícil)\b/i.test(text)){
    return {stage:"dificultad",tip:"Se menciona dificultad; revisa si cuenta una partida existente."};
  }
  if(/\b(collect all|all collectibles|coleccionables|collectibles|collect all the|recoge todos|recopila todos)\b/i.test(text)){
    return {stage:"limpieza",tip:"Posible objetivo de colección; revisa si puede hacerse tras la historia."};
  }
  return {stage:"revisar"};
}

export function guideForAchievement(appId:number, entry:AchievementDetail, prefs:GuidePreferences):ClassifiedAchievement {
  const override=prefs.overrides[entry.apiName];
  let stage:GuideStageId="revisar", evidence:GuideEvidence="unknown", tip:string|undefined;
  if(appId===GUIDE_APP_ID){
    const result=classifyAchievement(entry);
    if(result.rule){stage=result.stage;evidence="curated";tip=result.rule.tip;}
  }
  if(evidence==="unknown"){
    const suggestion=suggestionFor(entry);
    stage=suggestion.stage;
    tip=suggestion.tip;
    if(stage!=="revisar")evidence="suggested";
  }
  if(override?.stage){
    stage=override.stage;
    evidence=override.confirmed?"manual":"suggested";
  }else if(override?.confirmed){
    evidence="manual";
  }
  const flags=Object.fromEntries(FLAG_IDS.map(id=>[id,override?.flags?.[id]??"unknown"])) as Record<GuideFlagId,GuideFlag>;
  return {
    detail:entry, stage,evidence,tip,flags,
    notes:override?.notes??"",source:override?.source??"",priority:override?.priority??"normal",
  };
}

export function orderedStages(prefs:GuidePreferences):GuideStageId[]{
  const stages=[...prefs.stageOrder];
  // La elección manual siempre tiene prioridad frente a las sugerencias automáticas.
  if(prefs.orderCustomized)return stages;
  const storyOrder=prefs.story==="terminada"
    ? [...stages.filter(id=>id!=="historia")] : stages;
  if(prefs.story==="terminada")storyOrder.splice(
    Math.min(2,storyOrder.length),0,"historia",
  );
  if(prefs.online==="primero")return ["online",...storyOrder.filter(id=>id!=="online")];
  return storyOrder;
}
export function steamGuideLinks(appId:number){
  return [
    {label:"Logros oficiales",url:"https://steamcommunity.com/stats/"+appId+"/achievements"},
    {label:"Guías de la comunidad",url:"https://steamcommunity.com/app/"+appId+"/guides/"},
    {label:"Tienda y DLC",url:"https://store.steampowered.com/app/"+appId+"/"},
  ];
}
