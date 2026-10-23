import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appOrigin, SESSION_COOKIE, signSteamSession } from "@/lib/session";

export const runtime = "nodejs";
const endpoint = "https://steamcommunity.com/openid/login";

function equal(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const origin = appOrigin();
  const fail = () => NextResponse.redirect(origin + "/?steam_error=login");
  const nonce = request.cookies.get("platinum_steam_state")?.value;
  const state = request.nextUrl.searchParams.get("state");
  if (!nonce || !state || !equal(nonce,state)) return fail();
  const claimed = request.nextUrl.searchParams.get("openid.claimed_id");
  const identity = request.nextUrl.searchParams.get("openid.identity");
  const match = claimed?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!match || identity !== claimed) return fail();
  if (request.nextUrl.searchParams.get("openid.op_endpoint") !== endpoint) return fail();
  if (request.nextUrl.searchParams.get("openid.ns") !== "http://specs.openid.net/auth/2.0") return fail();
  if (request.nextUrl.searchParams.get("openid.return_to") !== origin + "/api/auth/steam/callback?state=" + state) return fail();
  try {
    const body = new URLSearchParams();
    request.nextUrl.searchParams.forEach((value,key) => {
      if (key.startsWith("openid.")) body.set(key,value);
    });
    body.set("openid.mode","check_authentication");
    const checked = await fetch(endpoint, {
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:body.toString(),
      cache:"no-store",
      signal:AbortSignal.timeout(10000),
    });
    const responseText = await checked.text();
    if (!checked.ok || !/^is_valid:true$/m.test(responseText)) return fail();
    const response = NextResponse.redirect(origin + "/");
    response.cookies.set(SESSION_COOKIE,signSteamSession(match[1]),{
      httpOnly:true,sameSite:"lax",secure:new URL(origin).protocol==="https:",path:"/",maxAge:604800,
    });
    response.cookies.set("platinum_steam_state","",{httpOnly:true,path:"/api/auth/steam",maxAge:0});
    return response;
  } catch { return fail(); }
}
