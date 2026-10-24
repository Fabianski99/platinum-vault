import type { AchievementDetail } from "@/lib/achievement";

export const GUIDE_APP_ID = 447040;
export type RouteStage = "historia" | "secundarias" | "limpieza" | "dlc" | "online" | "revisar";
export type GuideRule = { title: string; aliases?: string[]; stage: RouteStage; tip?: string };

export const GUIDE_SOURCES = [
  { title: "Logros oficiales de Steam", url: "https://steamcommunity.com/stats/447040/achievements" },
  { title: "Guía de logros de Steam Community", url: "https://steamcommunity.com/sharedfiles/filedetails/?id=3641420571" },
  { title: "Clasificación y DLC en Exophase", url: "https://www.exophase.com/game/watch-dogs-2-steam/achievements/es/" },
  { title: "Ruta de TrueAchievements", url: "https://www.trueachievements.com/game/Watch-Dogs-2/walkthrough" },
] as const;

export const stageInfo: Record<RouteStage, { title: string; summary: string; nextStep: string }> = {
  historia: {
    title: "Historia principal",
    summary: "Completa las operaciones principales y aprovecha para conseguir logros sencillos durante la campaña.",
    nextStep: "Revisa las operaciones principales que sigan pendientes en la app DedSec.",
  },
  secundarias: {
    title: "Operaciones secundarias",
    summary: "Termina las operaciones opcionales y reúne las mejoras del eKart. Algunas misiones se desbloquean con el progreso de la campaña.",
    nextStep: "Abre el mapa y la app DedSec para comprobar qué operaciones ya están disponibles.",
  },
  limpieza: {
    title: "Exploración y limpieza",
    summary: "Recoge datos clave, participa en actividades y completa los objetivos sueltos del mundo abierto.",
    nextStep: "Da prioridad a los datos clave, ScoutX y objetivos que necesitan dinero o habilidades.",
  },
  dlc: {
    title: "Contenido adicional",
    summary: "Termina las operaciones de Human Conditions y No Compromise cuando tengas acceso a ellas.",
    nextStep: "Comprueba que tienes las expansiones y sus misiones desbloqueadas.",
  },
  online: {
    title: "Multijugador y Showd0wn",
    summary: "Logros dependientes de otros jugadores o del servicio online. Puedes dejarlos al final o adelantarlos si encuentras partidas.",
    nextStep: "Comprueba disponibilidad de los modos online antes de organizar sesiones.",
  },
  revisar: {
    title: "Por clasificar",
    summary: "Steam devolvió logros cuyo nombre no coincide con las entradas verificadas. No asignamos requisitos sin confirmarlos.",
    nextStep: "Consulta la fuente oficial y comprueba si la traducción del logro ha cambiado.",
  },
};

const rules: GuideRule[] = [
  // Historia: nomenclatura oficial en inglés y títulos publicados en español.
  { title: "Who Am I", aliases: ["Quién soy yo"], stage: "historia" },
  { title: "Knight Ridden", aliases: ["Caballero sin caballo"], stage: "historia" },
  { title: "Baby, I Got Your Money", aliases: ["Tengo tu dinero"], stage: "historia" },
  { title: "No Place Like Haum", aliases: ["Como en HAUM, en ningún sitio"], stage: "historia" },
  { title: "Picking Up the Pieces", aliases: ["Recogiendo los trozos"], stage: "historia" },
  { title: "Informer", aliases: ["Informador"], stage: "historia" },
  { title: "Sabotage", aliases: ["Sabotaje"], stage: "historia" },
  { title: "Old School Justice", aliases: ["Justicia clásica"], stage: "historia" },
  { title: "Hypnotize", aliases: ["Hipnosis"], stage: "historia" },
  { title: "Joined the Mile High Club", aliases: ["Miembro del club de altos vuelos"], stage: "historia" },
  { title: "You're On A Boat!", aliases: ["¡Vas en un barco!"], stage: "historia" },
  { title: "The Itsy Bitsy Spider", aliases: ["Maraña de arañas"], stage: "historia" },
  { title: "Make Every Voice Count", aliases: ["Todas las voces cuentan"], stage: "historia" },
  { title: "Hack the World", aliases: ["Hackea el mundo"], stage: "historia" },

  { title: "100% Legit", aliases: ["100 % legítimo"], stage: "secundarias", tip: "La operación $911 se habilita al progresar en la historia. Revisa DedSec." },
  { title: "Leaks and Leaks", aliases: ["Filtraciones imparables"], stage: "secundarias" },
  { title: "The Fox", aliases: ["Fox"], stage: "secundarias" },
  { title: "Pimp My eKart", aliases: ["eKart maqueado"], stage: "secundarias", tip: "Completa la cadena del eKart y consigue sus mejoras." },

  { title: "Researcher", aliases: ["Investigador"], stage: "limpieza", tip: "Recoge los 24 datos clave. El progreso de habilidades no sustituye esta colección." },
  { title: "One-Man Garage", aliases: ["Un garaje propio"], stage: "limpieza", tip: "Compra 25 vehículos en concesionarios; conviene reservar dinero." },
  { title: "Got The Shutterbug", aliases: ["Rey del obturador"], stage: "limpieza", tip: "Haz 25 fotografías de ubicaciones ScoutX." },
  { title: "Miniroadtrip!", aliases: ["¡Un miniviaje!"], stage: "limpieza" },
  { title: "A Ride to Remember", aliases: ["Un paseo para recordar"], stage: "limpieza" },
  { title: "DedSec-A-Roni", aliases: ["DedSec una vuelta"], stage: "limpieza" },
  { title: "Doggyland", aliases: ["Vida de perros"], stage: "limpieza" },
  { title: "Earn your Sea Legs", aliases: ["Quien no se embarca, no se marea"], stage: "limpieza" },
  { title: "Hold My Hair", aliases: ["Sujétame el pelo"], stage: "limpieza" },
  { title: "I Get Around", aliases: ["Carrerón"], stage: "limpieza" },
  { title: "In Style", aliases: ["Con estilo"], stage: "limpieza" },
  { title: "Ain't No Stopping", aliases: ["No pienso parar"], stage: "limpieza" },
  { title: "App'ing Around", aliases: ["Alumno aplicado"], stage: "limpieza" },
  { title: "Bad Boys", aliases: ["Chicos malos"], stage: "limpieza" },
  { title: "Feeding Frenzy", aliases: ["Alimenta el pánico"], stage: "limpieza" },
  { title: "Roboteer", aliases: ["Robotista"], stage: "limpieza" },
  { title: "Smooth Felon", aliases: ["Delincuente huidizo"], stage: "limpieza" },
  { title: "Jump Around", aliases: ["A saltos"], stage: "limpieza" },
  { title: "Let Me Ride", aliases: ["Déjame subir"], stage: "limpieza" },
  { title: "Only God Can Judge Me", aliases: ["Solo Dios puede juzgarme"], stage: "limpieza" },
  { title: "Photobombed!", aliases: ["¡Sorpresa!"], stage: "limpieza" },
  { title: "Put Your Damn Pants On", aliases: ["Ponte ya los pantalones"], stage: "limpieza" },
  { title: "Something To Ride", aliases: ["Vehículo pesado"], stage: "limpieza" },
  { title: "Third Time's the Charm", aliases: ["El triple de encanto"], stage: "limpieza" },
  { title: "Menace", aliases: ["Amenaza"], stage: "limpieza" },
  { title: "Knock You Out", aliases: ["Todos al suelo"], stage: "limpieza" },

  { title: "The Score of Your Life", aliases: ["La puntuación de tu vida"], stage: "dlc" },
  { title: "Not the Pizza Guy", aliases: ["No es el de la pizza"], stage: "dlc" },
  { title: "Nanotriumph", aliases: ["Nanotriunfo"], stage: "dlc" },
  { title: "That Escalated Quickly", aliases: ["Se nos ha ido de las manos"], stage: "dlc" },
  { title: "Prize Catch", aliases: ["Atrapapremios"], stage: "dlc" },

  { title: "Hold My Hand", aliases: ["Dame la mano"], stage: "online" },
  { title: "Troll'r", aliases: ["Troll"], stage: "online" },
  { title: "Natural Born Killer", aliases: ["Asesino nato"], stage: "online" },
  { title: "One of the Gang", aliases: ["Uno de los nuestros"], stage: "online" },
  { title: "Please Marcus, Don't Hurt Them", aliases: ["Anda, Marcus, no les hagas nada"], stage: "online" },
  { title: "It's the Final Showd0wn", stage: "online" },
];

export function normalizeAchievementName(name: string): string {
  return name.toLocaleLowerCase("es")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const byName = new Map<string, GuideRule>();
for (const rule of rules) for (const alias of [rule.title,...(rule.aliases ?? [])]) {
  const key = normalizeAchievementName(alias);
  if (byName.has(key)) throw new Error("Nombre de logro duplicado: " + alias);
  byName.set(key, rule);
}

export function classifyAchievement(achievement: AchievementDetail): { stage: RouteStage; rule: GuideRule | null } {
  const rule = byName.get(normalizeAchievementName(achievement.name)) ?? null;
  return { stage: rule?.stage ?? "revisar", rule };
}

export const WATCH_DOGS_2_INFO = {
  missable: "No hay logros perdibles documentados en las fuentes de la guía.",
  difficulty: "No se exige terminar el juego en una dificultad concreta.",
  newGamePlus: "No se necesita NG+; la ruta puede completarse en una partida.",
  online: "Hay seis logros vinculados a actividades online; su disponibilidad depende de servidores y jugadores.",
  dlc: "Cinco logros requieren operaciones de contenido adicional.",
};
