import { NextResponse } from "next/server";

export const runtime = "nodejs";
type StoreApp = {
  success?: boolean;
  data?: {
    header_image?: string;
    capsule_image?: string;
    capsule_imagev5?: string;
  };
};

export async function GET(_request: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  if (!/^\d{1,10}$/.test(appId) || Number(appId) > 4294967295) {
    return NextResponse.json({ error: "AppID inválido." }, { status: 400 });
  }

  try {
    const url = new URL("https://store.steampowered.com/api/appdetails/");
    url.searchParams.set("appids", appId);
    url.searchParams.set("l", "spanish");
    const response = await fetch(url, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(9000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return NextResponse.json({ url: null }, { status: 200 });

    const payload = await response.json() as Record<string, StoreApp>;
    const data = payload[appId]?.data;
    const choices = [data?.capsule_image, data?.header_image, data?.capsule_imagev5];
    const urlCandidate = choices.find((value) => {
      if (!value) return false;
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" &&
          (parsed.hostname.endsWith(".steamstatic.com") ||
           parsed.hostname === "shared.fastly.steamstatic.com" ||
           parsed.hostname === "steamcdn-a.akamaihd.net");
      } catch { return false; }
    });
    return NextResponse.json({ url: urlCandidate ?? null, kind: "wide" }, {
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=21600" },
    });
  } catch {
    return NextResponse.json({ url: null }, { status: 200 });
  }
}
