import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { playWin, type WinTier } from "./sound";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Capa de victoria a pantalla completa. Se monta una vez por mano ganada y se desmonta sola.
 * No intercepta toques (pointer-events: none) para no bloquear la mesa.
 */
export function WinFx({ tier, name, avatar, sound = true, onDone }: { tier: WinTier; name: string; avatar?: string; sound?: boolean; onDone?: () => void }) {
  const [gone, setGone] = useState(false);
  const calm = reduced();
  const pieces = useMemo(() => Array.from({ length: calm ? 0 : tier === "basic" ? 26 : 34 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 9) * 0.07,
    rot: (i * 53) % 360,
    dur: 1.4 + ((i * 7) % 6) / 10,
  })), [tier, calm]);
  useEffect(() => {
    if (sound) playWin(tier);
    const ms = calm ? 1600 : tier === "basic" ? 2300 : 2700;
    const t = setTimeout(() => { setGone(true); onDone?.(); }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (gone) return null;
  return (
    <div className={`winfx winfx-${tier}${calm ? " calm" : ""}`} role="status" aria-live="polite" aria-label={`${name} gana`}>
      {tier === "black" && <div className="winfx-dim" />}
      {tier === "gold" && <div className="winfx-sweep" />}
      {tier === "black" && <div className="winfx-rays" />}
      {pieces.map((p, i) => (
        <i key={i} className={tier === "gold" ? "winfx-coin" : tier === "black" ? "winfx-spark" : "winfx-confetti"}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--r" as string]: `${p.rot}deg` } as CSSProperties} />
      ))}
      <div className="winfx-plate">
        {avatar && <span className="winfx-av">{avatar}</span>}
        <b className="winfx-title">WIN!</b>
        <span className="winfx-name">{name}</span>
      </div>
    </div>
  );
}

/** Puntos bajo las cartas al voltear (solo comparación por puntos; nunca en victoria por retirada). */
export function ScoreTag({ score, bust, winner, diff }: { score: number; bust?: boolean; winner: boolean; diff?: number }) {
  return (
    <span className={`score-tag${winner ? " win" : ""}${bust ? " bust" : ""}`} data-testid="score-tag">
      <b>{score}</b> pts{winner ? " · 🏆" : bust ? " · se pasó" : diff !== undefined && diff > 0 ? ` · −${diff}` : ""}
    </span>
  );
}
