import { NextResponse } from "next/server";
import { appOrigin, SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const response = NextResponse.redirect(appOrigin());
  response.cookies.set(SESSION_COOKIE,"",{path:"/",httpOnly:true,maxAge:0});
  return response;
}
