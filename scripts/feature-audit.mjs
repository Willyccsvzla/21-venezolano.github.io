#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFileSync(resolve(root, path), "utf8");
const sources = {
  app: read("src/game/App.tsx"),
  lobby: read("src/game/ui/Lobby.tsx"),
  liveTable: read("src/game/ui/MesaLive.tsx"),
  shop: read("src/game/ui/Tienda.tsx"),
  profile: read("src/lib/player.functions.ts"),
  progression: read("src/lib/progression.functions.ts"),
  billing: read("src/lib/play-store.functions.ts"),
  nativeBridge: read("src/game/ui/native-commerce.ts"),
  ads: read("src/lib/ad-rewards.functions.ts") + read("src/routes/api/admob-ssv.ts"),
  leaderboard: read("src/lib/leaderboard.functions.ts"),
  rooms: read("src/game/live/rooms.ts"),
  roomService: read("src/lib/table.functions.ts"),
  engine: read("src/game/engine/types.ts"),
  migrations: read("migrations/0002_players.sql") + read("migrations/0004_live_tables.sql") + read("migrations/0005_progression.sql"),
  invite: read("src/game/ui/invite.ts"),
};

const has = (text, pattern) => pattern.test(text);
const audit = [
  { feature: "Lobby con seis accesos principales", status: ["Salas", "Recargar", "Perfil", "Mercado", "Invitar amigos", "Ranking"].every((label) => sources.lobby.includes(`label: '${label}'`)) ? "present" : "partial", evidence: ["src/game/ui/Lobby.tsx"] },
  { feature: "Mesas públicas", status: has(sources.rooms, /PUBLIC_ROOMS/) ? "present" : "missing", evidence: ["src/game/live/rooms.ts"] },
  { feature: "Mesas profesionales y VIP", status: has(sources.rooms, /professional|vip/i) && has(sources.lobby, /Profesionales/) ? "present" : "missing", evidence: ["src/game/live/rooms.ts", "src/game/ui/Lobby.tsx"] },
  { feature: "Mesas privadas con código", status: has(sources.roomService, /code/) && has(sources.lobby, /CÓDIGO/) ? "present" : "partial", evidence: ["src/game/ui/Lobby.tsx", "src/lib/table.functions.ts"] },
  { feature: "Perfil con apodo y avatar", status: has(sources.profile, /nick/) && has(sources.profile, /avatar/) ? "present" : "missing", evidence: ["src/lib/player.functions.ts", "migrations/0002_players.sql"] },
  { feature: "Marco de perfil", status: has(sources.migrations, /profile_frame/) && has(sources.progression, /equipCosmetic/) ? "present" : "missing", evidence: ["migrations/0005_progression.sql", "src/lib/progression.functions.ts"] },
  { feature: "Fichas de juego separadas de monedas premium", status: has(sources.migrations, /premium_wallets/) && has(sources.billing, /premiumCoins/) ? "present" : "missing", evidence: ["migrations/0005_progression.sql", "src/lib/play-store.functions.ts"] },
  { feature: "Mercado de reversos Plata y Oro con mejoras", status: has(sources.progression, /back-silver/) && has(sources.progression, /back-gold/) && has(sources.lobby, /Mejorar/) ? "present" : "missing", evidence: ["src/lib/progression.functions.ts", "src/game/ui/Lobby.tsx"] },
  { feature: "All Black exclusivo para el primer puesto", status: has(sources.progression, /rankFor\(context\.userId\) !== 1/) && has(sources.leaderboard, /row_number/) ? "present" : "missing", evidence: ["src/lib/progression.functions.ts", "src/lib/leaderboard.functions.ts"] },
  { feature: "Invitación por enlace o código", status: has(sources.invite, /inviteUrl/) && has(sources.app, /readInvite|rememberInvite/) ? "present" : "partial", evidence: ["src/game/ui/invite.ts", "src/game/App.tsx"] },
  { feature: "Ranking", status: has(sources.leaderboard, /game_results/) && has(sources.roomService, /insert into game_results/) ? "present" : "missing", evidence: ["src/lib/leaderboard.functions.ts", "src/lib/table.functions.ts"] },
  { feature: "Anuncio recompensado para fichas", status: has(sources.ads, /verify\(/) && has(sources.ads, /anuncio_recompensado/) && has(sources.nativeBridge, /AdMobRewardedBridge/) ? "partial" : "missing", evidence: ["src/lib/ad-rewards.functions.ts", "src/routes/api/admob-ssv.ts", "docs/integraciones-android.md"] },
  { feature: "Compra única para quitar anuncios", status: has(sources.billing, /remove_ads/) && has(sources.billing, /purchaseState !== 0/) && has(sources.nativeBridge, /PlayBillingBridge/) ? "partial" : "missing", evidence: ["src/lib/play-store.functions.ts", "src/lib/player.functions.ts", "docs/integraciones-android.md"] },
  { feature: "SDK y contenedor Android para Play Store", status: "partial", evidence: ["docs/integraciones-android.md"] },
  { feature: "Pozo visible en mesa y representado en el motor", status: has(sources.engine, /pot:/) && has(sources.liveTable, /Pozo\s*<b>\{snap\.pot\}/) ? "present" : "partial", evidence: ["src/game/engine/types.ts", "src/game/ui/MesaLive.tsx"] },
];

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), audit }, null, 2));
