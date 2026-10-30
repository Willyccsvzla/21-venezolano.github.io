import { useState } from "react";

/**
 * Avatar del jugador: foto de Google (si existe y carga) o el emoji elegido, dentro de un marco cosmético.
 * Marcos: none | basic | silver | gold | all-black. Arte propio en CSS/SVG.
 */
export function Avatar({ emoji, photo, frame = "none", className = "" }: { emoji: string; photo?: string | null; frame?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const f = ["basic", "silver", "gold", "all-black"].includes(frame) ? frame : "none";
  return (
    <span className={`pav pf-${f} ${className}`} data-frame={f}>
      <span className="pav-in">
        {photo && !failed
          ? <img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
          : <span className="pav-emoji">{emoji}</span>}
      </span>
      {f !== "none" && (
        <>
          <span className="pav-ring" aria-hidden="true" />
          <svg className="pav-gems" viewBox="0 0 60 14" aria-hidden="true">
            <path className="g1" d="M10 7 L15 2 L20 7 L15 12Z" />
            <path className="g0" d="M23 7 L30 0 L37 7 L30 14Z" />
            <path className="g1" d="M40 7 L45 2 L50 7 L45 12Z" />
          </svg>
          {f !== "basic" && <><i className="pav-spark s1" aria-hidden="true" /><i className="pav-spark s2" aria-hidden="true" /></>}
        </>
      )}
    </span>
  );
}
