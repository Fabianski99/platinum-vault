"use client";

import { useState } from "react";
import { Gamepad2, ImageOff } from "lucide-react";

type Props = {
  id: number;
  name: string;
  variant?: "portrait" | "landscape";
  className?: string;
  loading?: "lazy" | "eager";
  iconHash?: string;
};

function sources(id: number, variant: "portrait" | "landscape", iconHash?: string) {
  const steam = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + id + "/";
  const legacy = "https://cdn.akamai.steamstatic.com/steam/apps/" + id + "/";
  const icon = iconHash && /^[a-f0-9]{40}$/i.test(iconHash)
    ? "https://media.steampowered.com/steamcommunity/public/images/apps/" + id + "/" + iconHash + ".jpg"
    : null;
  return variant === "portrait"
    ? [
        steam + "library_600x900.jpg",
        legacy + "library_600x900.jpg",
        steam + "capsule_616x353.jpg",
        legacy + "header.jpg",
        steam + "header.jpg",
        ...(icon ? [icon] : []),
      ]
    : [
        steam + "library_hero.jpg",
        legacy + "library_hero.jpg",
        steam + "header.jpg",
        legacy + "header.jpg",
        steam + "capsule_616x353.jpg",
        ...(icon ? [icon] : []),
      ];
}

export function GameArtwork({ id, name, variant = "portrait", className = "", loading = "lazy", iconHash }: Props) {
  const [failure, setFailure] = useState({ id, variant, index: 0 });
  const position = failure.id === id && failure.variant === variant ? failure.index : 0;
  const options = sources(id, variant, iconHash);
  const isIcon = Boolean(iconHash && options[position]?.includes("/steamcommunity/public/images/apps/"));
  return <div className={"game-artwork " + (variant === "landscape" ? "game-artwork-landscape " : "") + className}>
    {position < options.length ? (
      // Steam sirve las imágenes desde su propia CDN; el fallback se maneja en el navegador.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={options[position]}
        src={options[position]}
        alt={name}
        loading={loading}
        onError={() => setFailure({ id, variant, index: position + 1 })}
        className={isIcon ? "game-artwork-small-icon" : position >= 2 ? "game-artwork-wide" : undefined}
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
