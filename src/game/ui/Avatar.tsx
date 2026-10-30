import { useState, type CSSProperties } from "react";
import basicArt from "../assets/frames/basic.webp";
import silverArt from "../assets/frames/silver.webp";
import goldArt from "../assets/frames/gold.webp";
import blackArt from "../assets/frames/all-black.webp";

/** Arte de marco + caja del hueco (% de la imagen): x0, y0, x1, y1. */
const FRAMES: Record<string, { src: string; hole: [number, number, number, number]; sparks: number }> = {
  basic: { src: basicArt, hole: [19.3, 17.5, 80.7, 79.1], sparks: 3 },
  silver: { src: silverArt, hole: [23.1, 16.6, 76.6, 76.2], sparks: 5 },
  gold: { src: goldArt, hole: [23.8, 23.4, 76.0, 76.0], sparks: 7 },
  "all-black": { src: blackArt, hole: [23.7, 23.6, 76.2, 76.6], sparks: 8 },
};

/**
 * Avatar del jugador: foto de Google (si existe y carga) o el emoji, dentro de un marco premium que sobresale.
 * El arte del marco es propio (generado para el juego); brillo y partículas en CSS.
 */
export function Avatar({ emoji, photo, frame = "none", className = "" }: { emoji: string; photo?: string | null; frame?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const f = FRAMES[frame] ? frame : "none";
  const def = FRAMES[f];
  const style = def
    ? ({ "--k": 100 / (def.hole[2] - def.hole[0]), "--hx": def.hole[0], "--hy": def.hole[1], "--hh": def.hole[3] - def.hole[1], "--art": `url(${def.src})` } as CSSProperties)
    : undefined;
  return (
    <span className={`pav pf-${f} ${className}`} data-frame={f} style={style}>
      <span className="pav-in">
        {photo && !failed
          ? <img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
          : <span className="pav-emoji">{emoji}</span>}
      </span>
      {def && (
        <span className="pav-art" aria-hidden="true">
          <img src={def.src} alt="" draggable={false} />
          <span className="pav-sheen" />
          {Array.from({ length: def.sparks }, (_, i) => <i key={i} className="pav-spark" style={{ ["--i" as string]: i } as CSSProperties} />)}
        </span>
      )}
    </span>
  );
}
