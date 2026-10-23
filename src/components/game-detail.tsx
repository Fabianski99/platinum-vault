"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Award, CalendarDays, Check, ExternalLink, Filter, Gamepad2, LockKeyhole, Search, Trophy } from "lucide-react";
import type { Game } from "@/lib/games";
import { completionDate, hours, isCompleted, percentage } from "@/lib/games";
import type { AchievementDetail, GameAchievementData } from "@/lib/achievement";
import { GameArtwork } from "@/components/game-artwork";

type Props = { game: Game; connected: boolean };
type FilterType = "all" | "unlocked" | "locked" | "rare";
type OrderType = "default" | "rarity" | "latest" | "name";

function formatDate(timestamp: number | null) {
  return timestamp ? completionDate(timestamp) : "Sin fecha";
}

export function GameDetail({ game, connected }: Props) {
  const [data, setData] = useState<GameAchievementData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(connected);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [order, setOrder] = useState<OrderType>("default");

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/steam/juegos/" + game.id, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Steam no devolvió los logros del juego.");
        setData(body as GameAchievementData);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Error inesperado");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [game.id, connected]);

  const list = data?.achievements ?? [];
  const unlocked = data?.unlocked ?? game.unlocked;
  const total = data?.total ?? game.total;
  const pct = total && unlocked !== null ? Math.round(unlocked / total * 100) : percentage(game);
  const complete = data?.available ? data.unlocked === data.total && data.total > 0 : isCompleted(game);
  const rarest = list.filter((item) => item.globalPercent !== null).sort((a, b) => (a.globalPercent ?? 100) - (b.globalPercent ?? 100))[0];

  const shown = useMemo(() => {
    const text = search.trim().toLocaleLowerCase("es");
    return list
      .filter((item) => !text || (item.name + " " + item.description).toLocaleLowerCase("es").includes(text))
      .filter((item) => filter === "all"
        || (filter === "unlocked" && item.unlocked)
        || (filter === "locked" && !item.unlocked)
        || (filter === "rare" && item.globalPercent !== null && item.globalPercent <= 10))
      .sort((a, b) => {
        if (order === "name") return a.name.localeCompare(b.name, "es");
        if (order === "rarity") return (a.globalPercent ?? 101) - (b.globalPercent ?? 101);
        if (order === "latest") return (b.unlockTime ?? 0) - (a.unlockTime ?? 0);
        return 0;
      });
  }, [list, search, filter, order]);

  return <main className="game-detail-page">
    <header className="game-detail-nav">
      <Link href="/?seccion=biblioteca"><ArrowLeft size={17}/> Volver a la biblioteca</Link>
      <Link href="/" className="game-detail-brand"><Trophy size={18}/> PLATINUM<span>VAULT</span></Link>
      <a target="_blank" rel="noopener noreferrer" href={"https://store.steampowered.com/app/" + game.id}>
        Página de Steam <ExternalLink size={15}/>
      </a>
    </header>
    <section className="game-detail-hero">
      <div className="game-detail-landscape"><GameArtwork id={game.id} name={game.name} variant="landscape" loading="eager"/></div>
      <div className="game-detail-hero-overlay"/>
      <div className="game-detail-hero-info">
        <span className="eyebrow">ARCHIVO INDIVIDUAL / STEAM {game.id}</span>
        <h1>{game.name}</h1>
        <p>{complete ? "Una obra conquistada. Cada logro cuenta la historia del camino que recorriste." : "Una aventura con capítulos por descubrir. Aquí queda registrado tu camino hacia el 100 %."}</p>
        <div className="game-detail-hero-stats">
          <div><small>TIEMPO JUGADO</small><strong>{hours(game.playtime)} h</strong></div>
          <div><small>LOGROS OBTENIDOS</small><strong>{total === null ? "—" : unlocked + " / " + total}</strong></div>
          <div><small>PROGRESO</small><strong>{pct === null ? "—" : pct + "%"}</strong></div>
        </div>
        <div className="game-detail-progress"><div style={{ width: (pct ?? 0) + "%" }}/></div>
      </div>
    </section>

    <section className="game-detail-content">
      <div className="game-detail-overview">
        <div className="game-detail-art"><GameArtwork id={game.id} name={game.name}/></div>
        <div className="game-detail-overview-text">
          <span className="eyebrow">01 / EL REGISTRO</span>
          <h2>{complete ? "Pieza completada." : "Tu historia, logro a logro."}</h2>
          <p>{connected ? "El catálogo y los porcentajes proceden de Steam. Se muestran únicamente los datos que Steam permite consultar." : "Estás viendo un juego de ejemplo. Conecta tu cuenta de Steam para consultar logros reales."}</p>
          <div className="game-detail-metrics">
            <div><Award size={20}/><span><strong>{total === null ? "—" : total}</strong> logros en total</span></div>
            <div><Check size={20}/><span><strong>{unlocked === null ? "—" : unlocked}</strong> desbloqueados</span></div>
            <div><CalendarDays size={20}/><span>{complete ? "Último logro: " + formatDate(data?.completedAt ?? game.completedAt ?? null) : "Colección en progreso"}</span></div>
            {rarest && <div><Trophy size={20}/><span>Más raro: <strong>{rarest.name}</strong> ({rarest.globalPercent?.toFixed(1)} % global)</span></div>}
          </div>
        </div>
      </div>

      <div className="game-detail-heading">
        <div><span className="eyebrow">02 / EL CATÁLOGO DE LOGROS</span><h2>El recorrido completo</h2></div>
        <p>Insignias conseguidas, objetivos pendientes y su frecuencia entre los jugadores de Steam.</p>
      </div>

      {!connected ? <div className="game-detail-message">
        <Gamepad2 size={32}/><h3>Conecta tu Steam para consultar este juego</h3>
        <p>Los logros de la demostración no representan tu progreso real.</p>
        <a href="/api/auth/steam">Conectar Steam <ArrowUpRight size={16}/></a>
      </div> : loading ? <div className="game-detail-message"><div className="game-detail-loader"/><h3>Consultando los logros de Steam</h3><p>Obteniendo nombres, insignias y porcentajes globales…</p></div>
      : error ? <div className="game-detail-message"><LockKeyhole size={28}/><h3>No se pudo cargar la ficha de logros</h3><p>{error}</p><button onClick={()=>window.location.reload()}>Reintentar</button></div>
      : !data?.available ? <div className="game-detail-message"><Gamepad2 size={32}/><h3>Sin logros disponibles</h3><p>{data?.note ?? "Steam no ofrece un catálogo de logros consultable para esta aplicación."}</p></div>
      : <>
        <div className="achievement-toolbar">
          <label className="achievement-search"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar un logro o descripción…"/></label>
          <div className="achievement-filters" role="group" aria-label="Filtrar logros">
            {([["all","Todos"],["unlocked","Obtenidos"],["locked","Pendientes"],["rare","Raros ≤10 %"]] as const).map(([id,label])=>
              <button key={id} className={filter===id?"current":""} onClick={()=>setFilter(id)}>{label}</button>)}
          </div>
          <label className="achievement-sort"><Filter size={16}/><select aria-label="Ordenar logros" value={order} onChange={(e)=>setOrder(e.target.value as OrderType)}>
            <option value="default">Orden original</option><option value="rarity">Más raros</option><option value="latest">Más recientes</option><option value="name">Alfabético</option>
          </select></label>
        </div>
        <div className="achievement-list">
          {shown.map((achievement: AchievementDetail, i) => <motion.article className={"achievement " + (achievement.unlocked?"obtained":"locked")} key={achievement.apiName}
            initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.012,.32)}}>
            <span className="achievement-image">
              {achievement.unlocked && achievement.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={achievement.icon} alt=""/>
              ) : !achievement.unlocked && (achievement.lockedIcon || achievement.icon) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={achievement.lockedIcon || achievement.icon || ""} alt=""/>
              ) : <Trophy size={23}/>}
            </span>
            <div className="achievement-copy">
              <h3>{achievement.name}</h3>
              <p>{achievement.description || (achievement.hidden && !achievement.unlocked ? "Descripción oculta por Steam." : "Sin descripción disponible.")}</p>
              {achievement.unlockTime && <small>Desbloqueado el {formatDate(achievement.unlockTime)}</small>}
            </div>
            <div className="achievement-meta">
              <span className={achievement.unlocked?"achievement-state won":"achievement-state"}>{achievement.unlocked?<><Check size={14}/> OBTENIDO</>:<>PENDIENTE</>}</span>
              <small>{achievement.globalPercent === null ? "Rareza no disponible" : achievement.globalPercent.toFixed(1) + " % de jugadores"}</small>
            </div>
          </motion.article>)}
          {shown.length === 0 && <div className="achievement-empty">No hay logros que coincidan con esos filtros.</div>}
        </div>
      </>}
    </section>
    <footer className="game-detail-footer"><Link href="/?seccion=museo"><Trophy size={16}/> Visitar el museo</Link><span>PLATINUM VAULT · ARCHIVO PERSONAL</span></footer>
  </main>;
}
