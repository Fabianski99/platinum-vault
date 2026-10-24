import type { Game } from "@/lib/games";

export type PlanStatus = "por-jugar" | "en-curso" | "pausado";
export type PlanPriority = "alta" | "media" | "baja";
export type PlannedGame = {
  appId: number;
  status: PlanStatus;
  priority: PlanPriority;
  note: string;
  addedAt: number;
};
export const PLAN_EVENT = "platinum-vault:planner-updated";
export const plannerKey = (steamId: string) => "platinum-vault:planificador:v1:" + steamId;
export const showcaseKey = (steamId: string) => "platinum-vault:inicio:por-platinar:v1:" + steamId;

function validStatus(x: unknown): x is PlanStatus {
  return x === "por-jugar" || x === "en-curso" || x === "pausado";
}
function validPriority(x: unknown): x is PlanPriority {
  return x === "alta" || x === "media" || x === "baja";
}
export function readPlanner(steamId: string, library: Game[]): PlannedGame[] {
  if (typeof window === "undefined") return [];
  const known = new Set(library.map((g) => g.id));
  let list: PlannedGame[] = [];
  let hasStoredPlan = false;
  try {
    hasStoredPlan = localStorage.getItem(plannerKey(steamId)) !== null;
    const raw: unknown = JSON.parse(localStorage.getItem(plannerKey(steamId)) || "null");
    if (Array.isArray(raw)) list = raw.flatMap((item: unknown): PlannedGame[] => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<PlannedGame>;
      if (typeof row.appId !== "number" || !known.has(row.appId)) return [];
      return [{
        appId: row.appId,
        status: validStatus(row.status) ? row.status : "por-jugar",
        priority: validPriority(row.priority) ? row.priority : "media",
        note: typeof row.note === "string" ? row.note.slice(0, 500) : "",
        addedAt: typeof row.addedAt === "number" ? row.addedAt : Date.now(),
      }];
    });
  } catch {}
  // Migrar la selección anterior del inicio sin perder sus cinco destacados.
  try {
    const legacy: unknown = hasStoredPlan ? [] : JSON.parse(localStorage.getItem(showcaseKey(steamId)) || "[]");
    if (Array.isArray(legacy)) {
      for (const id of legacy) {
        if (typeof id === "number" && known.has(id) && !list.some((item) => item.appId === id)) {
          list.push({ appId:id, priority:"media", status:"por-jugar", note:"", addedAt:Date.now() });
        }
      }
    }
  } catch {}
  return [...new Map(list.map((item) => [item.appId,item])).values()];
}
export function savePlanner(steamId: string, items: PlannedGame[]) {
  try {
    localStorage.setItem(plannerKey(steamId), JSON.stringify(items));
    // Los cinco títulos prioritarios continúan visibles en la portada anterior.
    const nextFeatured = [...items].filter((item)=>item.status!=="pausado")
      .sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority] || a.addedAt-b.addedAt)
      .slice(0,5).map((item)=>item.appId);
    localStorage.setItem(showcaseKey(steamId), JSON.stringify(nextFeatured));
    window.dispatchEvent(new CustomEvent(PLAN_EVENT));
  } catch {}
}
export const priorityOrder = { alta:0, media:1, baja:2 };
export function addToPlanner(items: PlannedGame[], appId: number): PlannedGame[] {
  if (items.some((item) => item.appId === appId)) return items;
  return [...items,{ appId, status:"por-jugar", priority:"media", note:"", addedAt:Date.now() }];
}
