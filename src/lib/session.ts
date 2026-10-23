import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "platinum_steam_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;
type SessionPayload = { steamId: string; exp: number };

function secret() {
  const value = process.env.STEAM_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Configura STEAM_SESSION_SECRET con 32 caracteres o más.");
  return value;
}

export function signSteamSession(steamId: string): string {
  const payload: SessionPayload = { steamId, exp: Math.floor(Date.now() / 1000) + SEVEN_DAYS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return encoded + "." + mac;
}

export function verifySteamSession(raw?: string): string | null {
  if (!raw || !process.env.STEAM_SESSION_SECRET) return null;
  const [encoded, provided, extra] = raw.split(".");
  if (!encoded || !provided || extra) return null;
  try {
    const expected = createHmac("sha256", secret()).update(encoded).digest();
    const actual = Buffer.from(provided, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!/^\d{17}$/.test(payload.steamId) || payload.exp <= Date.now() / 1000) return null;
    return payload.steamId;
  } catch {
    return null;
  }
}

export async function getSteamId() {
  const store = await cookies();
  return verifySteamSession(store.get(SESSION_COOKIE)?.value);
}

export function appOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Origen de la aplicación inválido.");
  return url.origin;
}
