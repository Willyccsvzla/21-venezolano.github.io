import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { DEV_USER_ID } from "@/lib/auth/verify.server";
import { gateIdentityEnabled } from "@/lib/auth/gate-identity.server";

const CATALOG = [
  { id: "back-silver", name: "Reverso Plata", kind: "back", price: 100, maxLevel: 3 },
  { id: "back-gold", name: "Reverso Oro", kind: "back", price: 250, maxLevel: 3 },
  { id: "frame-silver", name: "Marco Plata", kind: "frame", price: 150, maxLevel: 1 },
  { id: "frame-gold", name: "Marco Oro", kind: "frame", price: 350, maxLevel: 1 },
  { id: "effect-win", name: "Efecto WIN", kind: "effect", price: 300, maxLevel: 1 },
] as const;

export const grantDevTestCredits = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { requestId?: string }) => {
    const requestId = String(input?.requestId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("Solicitud de monedas de prueba inválida");
    return { requestId };
  })
  .handler(async ({ context, data }) => {
    if (context.userId !== DEV_USER_ID || gateIdentityEnabled() || process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.trim()) {
      throw new Error("Las monedas de prueba solo están disponibles para Dev User en el entorno local");
    }
    const sql = await getSql();
    const ref = `dev-test:${data.requestId}`;
    const previous = await sql<{ balance: number }>`select balance from premium_ledger where user_id = ${context.userId} and ref = ${ref}`;
    if (previous[0]) return Number(previous[0].balance);
    const priorWallet = await sql<{ balance: number }>`select balance from premium_wallets where user_id = ${context.userId}`;
    const balance = Number(priorWallet[0]?.balance ?? 0) + 1000;
    await sql`
      insert into premium_wallets (user_id, balance, updated_at)
      values (${context.userId}, ${balance}, now())
      on conflict (user_id) do update set balance = ${balance}, updated_at = now()
    `;
    await sql`
      insert into premium_ledger (id, user_id, kind, amount, balance, ref)
      values (${crypto.randomUUID()}, ${context.userId}, 'dev_test_grant', 1000, ${balance}, ${ref})
    `;
    return balance;
  });

export type MarketItem = {
  id: string;
  name: string;
  kind: "back" | "frame" | "effect";
  price: number;
  maxLevel: number;
  level: number;
  canBuy: boolean;
};
export type ProgressionState = {
  premiumBalance: number;
  currentFrame: string;
  currentBack: string;
  currentEffect: string | null;
  rank: number | null;
  items: MarketItem[];
};

async function rankFor(userId: string): Promise<number | null> {
  const sql = await getSql();
  const rows = await sql<{ rank: number | null }>`
    with totals as (
      select user_id, max(nick) as nick, count(*) filter (where won)::int as wins, coalesce(sum(payout), 0)::int as chips_won, max(recorded_at) as last_at
      from game_results group by user_id
    ), ranked as (
      select user_id, row_number() over (order by wins desc, chips_won desc, last_at asc, nick asc)::int as rank from totals
    ) select rank from ranked where user_id = ${userId}
  `;
  return rows[0]?.rank == null ? null : Number(rows[0].rank);
}

export const getProgression = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProgressionState> => {
    const sql = await getSql();
    const rows = await sql<{ item_id: string; level: number }>`
      select item_id, level from player_inventory where user_id = ${context.userId}
    `;
    const wallet = await sql<{ balance: number }>`select balance from premium_wallets where user_id = ${context.userId}`;
    const frame = await sql<{ profile_frame: string; card_back: string }>`select profile_frame, card_back from players where user_id = ${context.userId}`;
    const equipped = await sql<{ item_id: string }>`select item_id from player_inventory where user_id = ${context.userId} and equipped = true and item_id like 'effect-%' limit 1`;
    const owned = new Map(rows.map((row) => [row.item_id, Number(row.level)]));
    const rank = await rankFor(context.userId);
    return {
      premiumBalance: Number(wallet[0]?.balance ?? 0),
      currentFrame: frame[0]?.profile_frame ?? "none",
      currentBack: frame[0]?.card_back === "all-black" && rank !== 1 ? "classic" : frame[0]?.card_back ?? "classic",
      currentEffect: equipped[0]?.item_id.slice("effect-".length) ?? null,
      rank,
      items: [
        ...CATALOG.map((item) => ({ ...item, level: owned.get(item.id) ?? 0, canBuy: (owned.get(item.id) ?? 0) < item.maxLevel })),
        { id: "back-all-black", name: "All Black", kind: "back" as const, price: 0, maxLevel: 1, level: rank === 1 ? 1 : 0, canBuy: false },
      ],
    };
  });

export const purchaseCosmetic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { itemId?: string; requestId?: string }) => {
    const itemId = String(input?.itemId ?? "");
    const requestId = String(input?.requestId ?? "");
    if (!CATALOG.some((item) => item.id === itemId)) throw new Error("Objeto no disponible en el mercado");
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("Solicitud de compra inválida");
    return { itemId, requestId };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const item = CATALOG.find((product) => product.id === data.itemId)!;
    const prior = await sql<{ balance: number }>`
      select balance from premium_ledger where user_id = ${context.userId} and ref = ${`market:${data.requestId}`}
    `;
    if (prior[0]) return { balance: Number(prior[0].balance), repeated: true };
    const rows = await sql<{ balance: number; level: number }>`
      with current as (
        select coalesce((select level from player_inventory where user_id = ${context.userId} and item_id = ${item.id} for update), 0)::int as level
      ), charge as (
        update premium_wallets set balance = premium_wallets.balance -
          case when current.level = 0 then ${item.price} else ${item.price} * current.level end,
          updated_at = now()
        from current
        where premium_wallets.user_id = ${context.userId}
          and premium_wallets.balance >= case when current.level = 0 then ${item.price} else ${item.price} * current.level end
          and current.level < ${item.maxLevel}
        returning premium_wallets.balance, current.level as old_level
      ), owned as (
        insert into player_inventory (user_id, item_id, level, equipped)
        select ${context.userId}, ${item.id}, charge.old_level + 1, false from charge
        on conflict (user_id, item_id) do update set level = player_inventory.level + 1
        returning level
      ), ledger as (
        insert into premium_ledger (id, user_id, kind, amount, balance, ref)
        select ${crypto.randomUUID()}, ${context.userId}, 'market_purchase', -case when charge.old_level = 0 then ${item.price} else ${item.price} * charge.old_level end,
          charge.balance, ${`market:${data.requestId}`} from charge cross join owned
        returning balance
      ) select ledger.balance, owned.level from ledger cross join owned
    `;
    if (!rows[0]) throw new Error("Saldo premium insuficiente o nivel máximo alcanzado");
    return { balance: Number(rows[0].balance), level: Number(rows[0].level), repeated: false };
  });

export const equipCosmetic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { itemId?: string }) => {
    const itemId = String(input?.itemId ?? "none");
    if (!new Set(["none", "frame-silver", "frame-gold", "back-silver", "back-gold", "back-all-black", "effect-win"]).has(itemId)) {
      throw new Error("Objeto no disponible");
    }
    return { itemId };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const item = data.itemId;
    if (item.startsWith("effect-")) {
      const ownedEffect = await sql<{ level: number }>`select level from player_inventory where user_id = ${context.userId} and item_id = ${item}`;
      if (!ownedEffect[0]) throw new Error("Primero desbloquea este efecto en el mercado");
      await sql`update player_inventory set equipped = (item_id = ${item}) where user_id = ${context.userId} and item_id like 'effect-%'`;
      return { frame: "none", effect: item.slice("effect-".length) };
    }
    const owned = item === "none" || item === "back-all-black"
      ? []
      : await sql<{ level: number }>`select level from player_inventory where user_id = ${context.userId} and item_id = ${item}`;
    if (item !== "none" && item !== "back-all-black" && !owned[0]) throw new Error("Primero compra este objeto");
    if (item === "back-all-black" && await rankFor(context.userId) !== 1) throw new Error("All Black está reservado para el primer puesto del ranking");
    if (item.startsWith("frame-")) {
      const frame = item.slice("frame-".length);
      await sql`update players set profile_frame = ${frame} where user_id = ${context.userId}`;
      return { frame };
    }
    if (item === "none") {
      await sql`update players set profile_frame = 'none' where user_id = ${context.userId}`;
      return { frame: "none" };
    }
    const cardBack = item === "back-all-black" ? "all-black" : item.slice("back-".length);
    await sql`update players set card_back = ${cardBack} where user_id = ${context.userId}`;
    return { frame: "none", cardBack };
  });
