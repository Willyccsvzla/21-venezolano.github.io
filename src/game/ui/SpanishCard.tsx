/*
 * Baraja española clásica: naipes de Heraclio Fournier, 1878 (diseño de Ignacio Díaz Olano y Emilio Soubrier),
 * escaneos del Museo Fournier de Naipes (Bibat, Vitoria-Gasteiz) publicados en Wikimedia Commons como DOMINIO PÚBLICO.
 * Ver src/assets/cards/LICENSES.json y CREDITOS.md. Recortados, limpiados y convertidos a WebP.
 */
import type { CSSProperties } from "react";
import type { Card } from "../engine";
import { cardName } from "../engine";

const files = import.meta.glob('../assets/cards/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const backFiles = import.meta.glob('../assets/card-backs/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const deckFiles = import.meta.glob('../assets/decks/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const deckUrl = (k: string) => deckFiles[`../assets/decks/${k}.webp`];
const url = (k: string) => files[`../assets/cards/${k}.webp`];

export const CARD_RATIO = 440 / 695;

/** Skins de cara premium: mazos metálicos propios (oro / plata / all-black), mismos palos y valores. */
export function SpanishCard({ card, className, style, skin }: { card: Card; className?: string; style?: CSSProperties; skin?: string | null }) {
  if (skin && ["oro", "plata", "allblack"].includes(skin)) {
    return (
      <span className={`naipe skin skin-${skin} ${className ?? ''}`} style={style} data-card={card.id} role="img" aria-label={cardName(card)}>
        <img src={deckUrl(`${skin}-${card.rank}-${card.suit}`) ?? url(`${card.rank}-${card.suit}`)} alt="" draggable={false} decoding="async" />
      </span>
    );
  }
  return (
    <img className={`naipe ${className ?? ''}`} style={style} src={url(`${card.rank}-${card.suit}`)} alt={cardName(card)}
      data-card={card.id} draggable={false} decoding="async" />
  );
}

export function CardBack({ className, style, design = "classic" }: { className?: string; style?: CSSProperties; design?: string }) {
  const variant = ["silver", "gold", "all-black"].includes(design) ? `back-${design}` : "";
  const deckKey = ({ silver: 'plata', gold: 'oro', 'all-black': 'allblack' } as Record<string, string>)[design];
  const customBack = deckKey ? (deckUrl(`${deckKey}-dorso`) ?? backFiles[`../assets/card-backs/${design}.webp`]) : undefined;
  return <img className={`naipe ${variant} ${className ?? ''}`} style={style} src={customBack ?? url('back')} alt="" aria-hidden draggable={false} />;
}
