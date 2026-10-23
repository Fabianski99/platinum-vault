"use client";

import { useEffect, useState } from "react";
import { Gamepad2, ImageOff } from "lucide-react";

type Props = {
  id: number;
  name: string;
  variant?: "portrait" | "landscape";
  className?: string;
  loading?: "lazy" | "eager";
  iconHash?: string;
};
type Candidate = { url: string; shape: "portrait" | "wide" };

function sources(id: number, variant: "portrait" | "landscape"): Candidate[] {
  const hosts = [
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/",
    "https://cdn.akamai.steamstatic.com/steam/apps/",
  ];
  const files = variant === "portrait"
    ? ["library_600x900.jpg", "library_600x900_2x.jpg", "capsule_616x353.jpg", "header.jpg"]
    : ["library_hero.jpg", "library_hero_2x.jpg", "header.jpg", "capsule_616x353.jpg"];
  const seen = new Set<string>();
  return files.flatMap((file) => hosts.map((host) => ({
    url: host + id + "/" + file,
    shape: file.startsWith("library_600x900") ? "portrait" as const : "wide" as const,
  }))).filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

export function GameArtwork({
  id, name, variant = "portrait", className = "", loading = "lazy", iconHash,
}: Props) {
  const key = id + ":" + variant;
  const options = sources(id, variant);
  const [attempt, setAttempt] = useState({ key, index: 0 });
  const [remote, setRemote] = useState<{ key: string; url: string | null; kind: "wide" | "portrait"; loaded: boolean }>({
    key, url: null, kind: "wide", loaded: false,
  });
  const position = attempt.key === key ? attempt.index : 0;
  const external = remote.key === key ? remote : { key, url: null, kind: "wide" as const, loaded: false };
  const exhausted = position >= options.length;

  // Solo se pide metadato adicional cuando las rutas directas de Steam han fallado.
  useEffect(() => {
    if (!exhausted || external.loaded) return;
    const controller = new AbortController();
    fetch("/api/artwork/" + id, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{url?: string; kind?: "wide"|"portrait"}> : null)
      .then((value) => {
        if (!controller.signal.aborted) setRemote({
          key, url: value?.url ?? null, kind: value?.kind === "portrait" ? "portrait" : "wide", loaded: true,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setRemote({ key, url: null, kind: "wide", loaded: true });
      });
    return () => controller.abort();
    // El id y la variante identifican de manera estable las imágenes consultadas.
  }, [id, key, exhausted, external.loaded]);

  const candidate = !exhausted ? options[position]
    : position === options.length && external.url ? { url: external.url, shape: external.kind } : null;

  const iconUrl = iconHash && /^[a-f0-9]{40}$/i.test(iconHash)
    ? "https://media.steampowered.com/steamcommunity/public/images/apps/" + id + "/" + iconHash + ".jpg"
    : null;

  return <div className={"game-artwork " + (variant === "landscape" ? "game-artwork-landscape " : "") + className}>
    {candidate ? <div className={"game-artwork-render "+(candidate.shape === "wide" && variant === "portrait" ? "game-artwork-composed" : "")}>
      {candidate.shape === "wide" && variant === "portrait" && <div className="game-artwork-ambience" aria-hidden="true" style={{ backgroundImage: "url('" + candidate.url + "')" }}/>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={candidate.url}
        src={candidate.url}
        alt={name}
        loading={loading}
        className={candidate.shape === "wide" && variant === "portrait" ? "game-artwork-horizontal" : undefined}
        onError={() => setAttempt({ key, index: position + 1 })}
      />
      {candidate.shape === "wide" && variant === "portrait" && <div className="game-artwork-caption"><span>ARCHIVO DE STEAM</span><strong>{name}</strong></div>}
    </div> : !exhausted || !external.loaded ? <div className="game-artwork-skeleton" aria-label={"Buscando arte de " + name}/> : <div className="game-artwork-fallback">
      <span className="game-artwork-frame"/>
      <span className="game-artwork-emblem">
        {iconUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={iconUrl} alt="" className="game-artwork-fallback-icon" onError={(event) => { event.currentTarget.style.display = "none"; }}/>
        ) : <Gamepad2 size={30} strokeWidth={1.1}/>}
      </span>
      <strong>{name}</strong>
      <small><ImageOff size={12}/> Sin portada disponible</small>
      <span className="game-artwork-id">STEAM / {id}</span>
    </div>}
  </div>;
}
