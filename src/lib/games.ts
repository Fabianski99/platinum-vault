export type Game = {
  id: number;
  name: string;
  playtime: number;
  unlocked: number | null;
  total: number | null;
  status?: "ready" | "unavailable" | "error";
  completedAt?: number;
  lastPlayed?: number;
  genre?: string;
  accent?: string;
};
export type Player = { name: string; avatar?: string; steamId?: string };

export const poster = (id: number) =>
  "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + id + "/library_600x900.jpg";
export const backdrop = (id: number) =>
  "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + id + "/header.jpg";

export const demoGames: Game[] = [
  { id: 570940, name: "Dark Souls: Remastered", genre: "Soulslike", playtime: 138.5, unlocked: 41, total: 41, completedAt: 1728345600, accent: "#b7986b" },
  { id: 1593500, name: "God of War", genre: "Acción · Aventura", playtime: 74.2, unlocked: 37, total: 37, completedAt: 1741478400, accent: "#91a4a7" },
  { id: 1659420, name: "UNCHARTED: Colección Legado de los Ladrones", genre: "Aventura", playtime: 93.1, unlocked: 101, total: 101, completedAt: 1753574400, accent: "#b49c78" },
  { id: 108710, name: "Alan Wake", genre: "Suspenso", playtime: 21.8, unlocked: 67, total: 67, completedAt: 1734134400, accent: "#778c9d" },
  { id: 208650, name: "Batman: Arkham Knight", genre: "Acción", playtime: 99.4, unlocked: 97, total: 113, accent: "#9aa4af" },
  { id: 1151640, name: "Horizon Zero Dawn", genre: "Mundo abierto", playtime: 82.6, unlocked: 56, total: 79, accent: "#af9e78" },
  { id: 1259420, name: "Days Gone", genre: "Acción", playtime: 62.3, unlocked: 39, total: 61, accent: "#aeb4ac" },
  { id: 447040, name: "Watch_Dogs 2", genre: "Mundo abierto", playtime: 45.9, unlocked: 20, total: 55, accent: "#b9ac7f" },
  { id: 814380, name: "Sekiro: Shadows Die Twice", genre: "Soulslike", playtime: 34.7, unlocked: 12, total: 34, accent: "#b49079" },
  { id: 1245620, name: "Elden Ring", genre: "Soulslike", playtime: 122.3, unlocked: 31, total: 42, accent: "#a9a47c" },
  { id: 367520, name: "Hollow Knight", genre: "Metroidvania", playtime: 13.1, unlocked: 8, total: 63, accent: "#a0a8d1" },
  { id: 870780, name: "Control Ultimate Edition", genre: "Acción", playtime: 57.6, unlocked: 42, total: 67, accent: "#bd7773" },
];

export const percentage = (game: Game): number | null =>
  game.total && game.unlocked !== null ? Math.round((game.unlocked / game.total) * 100) : null;

export const isCompleted = (game: Game) =>
  game.total !== null && game.total > 0 && game.unlocked === game.total;

export const hours = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n);

export const completionDate = (timestamp?: number) =>
  timestamp
    ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(timestamp * 1000))
    : "Fecha no disponible";
