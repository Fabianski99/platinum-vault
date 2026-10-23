"use client";

import { useEffect, useState } from "react";
import { Gamepad2, ImageOff } from "lucide-react";

type Props = {
  id: number;
  name: string;
  variant?: "portrait" | "landscape";
  className?: string;
  loading?: "lazy" | "eager";
};

function sources(id: number, variant: "portrait" | "landscape") {
  const steam = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + id + "/";
  const legacy = "https://cdn.akamai.steamstatic.com/steam/apps/" + id + "/";
  return variant === "portrait"
    ? [
        steam + "library_600x900.jpg",
        legacy + "library_600x900.jpg",
        steam + "capsule_616x353.jpg",
        legacy + "header.jpg",
        steam + "header.jpg",
      ]
    : [
        steam + "library_hero.jpg",
        legacy + "library_hero.jpg",
        steam + "header.jpg",
        legacy + "header.jpg",
        steam + "capsule_616x353.jpg",
      ];
}

export function GameArtwork({ id, name, variant = "portrait", className = "", loading = "lazy" }: Props) {
  const [position, setPosition] = useState(0);
  const options = sources(id, variant);

  useEffect(() => setPosition(0), [id, variant]);
  return <div className={"game-artwork " + (variant === "landscape" ? "game-artwork-landscape " : "") + className}>
    {position < options.length ? (
      // Steam sirve las imágenes desde su propia CDN; el fallback se maneja en el navegador.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={options[position]}
        src={options[position]}
        alt={name}
        loading={loading}
        onError={() => setPosition((current) => current + 1)}
        className={position >= 2 ? "game-artwork-wide" : undefined}
      />
    ) : <div className="game-artwork-fallback">
      <div className="game-artwork-glow"/>
      <span className="game-artwork-emblem"><Gamepad2 size={30} strokeWidth={1.1}/></span>
      <strong>{name}</strong>
      <small><ImageOff size={12}/> Arte oficial no disponible</small>
      <span className="game-artwork-id">STEAM / {id}</span>
    </div>}
  </div>;
}
