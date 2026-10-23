import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.STEAM_SESSION_SECRET || process.env.STEAM_SESSION_SECRET.length < 32 || !process.env.STEAM_API_KEY) {
    return new NextResponse("Antes de conectar Steam configura STEAM_API_KEY y STEAM_SESSION_SECRET en .env.local.", { status: 503 });
  }
  const origin = appOrigin();
  const nonce = randomBytes(24).toString("hex");
  const returnTo = origin + "/api/auth/steam/callback?state=" + nonce;
  const target = new URL("https://steamcommunity.com/openid/login");
  target.search = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": origin + "/",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  }).toString();
  const response = NextResponse.redirect(target);
  response.cookies.set("platinum_steam_state", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(origin).protocol === "https:",
    path: "/api/auth/steam",
    maxAge: 600,
  });
  return response;
}
