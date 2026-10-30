import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { BONO_INICIAL, TOPE_BOTS } from "@/game/packs";

export type LedgerKind = "entrada_mesa" | "salida_mesa";

export type PlayerProfile = {
  nick: string;
  avatar: string;
  frame: string;
  cardBack: string;
  testMode: boolean;
  balance: number;
  premiumBalance: number;
  adsRemoved: boolean;
};

const KINDS: LedgerKind[] = ["entrada_mesa", "salida_mesa"];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function balanceOf(userId: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ balance: number }>`
    select balance from ledger where user_id = ${userId} order by seq desc limit 1
  `;
  return num(rows[0]?.balance);
}

async function credit(userId: string, kind: string, amount: number, ref: string | null): Promise<number> {
  const sql = await getSql();
  const id = crypto.randomUUID();
  const rows = await sql<{ balance: number }>`
    with prev as (
      select coalesce((
        select balance from ledger where user_id = ${userId} order by seq desc limit 1
      ), 0) as balance
    ),
    ins as (
      insert into ledger (id, user_id, kind, amount, balance, ref)
      select ${id}, ${userId}, ${kind}, ${amount}, prev.balance + ${amount}, ${ref}
      from prev
      where prev.balance + ${amount} >= 0
      returning balance
    )
    select balance from ins
  `;
  if (!rows[0]) throw new Error("Saldo insuficiente");
  return num(rows[0].balance);
}

export const getPlayer = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PlayerProfile | null> => {
    const sql = await getSql();
    const rows = await sql<{ nick: string; avatar: string; profile_frame: string; card_back: string; test_mode: boolean }>`
      select nick, avatar, profile_frame, card_back, test_mode from players where user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    const premium = await sql<{ balance: number }>`
      select balance from premium_wallets where user_id = ${context.userId}
    `;
    const rank = await sql<{ rank: number }>`
      with totals as (
        select user_id, max(nick) as nick, count(*) filter (where won)::int as wins, coalesce(sum(payout), 0)::int as chips_won, max(recorded_at) as last_at
        from game_results group by user_id
      ), ranked as (
        select user_id, row_number() over (order by wins desc, chips_won desc, last_at asc, nick asc)::int as rank from totals
      ) select rank from ranked where user_id = ${context.userId}
    `;
    const removeAds = await sql<{ found: boolean }>`
      select exists(select 1 from store_receipts where user_id = ${context.userId} and product_id = 'remove_ads') as found
    `;
    const cardBack = row.card_back === "all-black" && Number(rank[0]?.rank) !== 1 ? "classic" : row.card_back ?? "classic";
    if (cardBack !== row.card_back) await sql`update players set card_back = 'classic' where user_id = ${context.userId}`;
    return {
      nick: row.nick,
      avatar: row.avatar,
      frame: row.profile_frame ?? "none",
      cardBack,
      testMode: Boolean(row.test_mode),
      balance: await balanceOf(context.userId),
      premiumBalance: num(premium[0]?.balance),
      adsRemoved: Boolean(removeAds[0]?.found),
    };
  });

export const savePlayer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { nick: string; avatar: string; testMode: boolean }) => {
    const nick = String(input?.nick ?? "").trim().slice(0, 16);
    const avatar = String(input?.avatar ?? "").slice(0, 8);
    if (!nick) throw new Error("Escribe un apodo");
    if (!avatar) throw new Error("Elige un avatar");
    return { nick, avatar, testMode: Boolean(input?.testMode) };
  })
  .handler(async ({ context, data }): Promise<PlayerProfile> => {
    const sql = await getSql();
    const userId = context.userId;
    await sql`
      insert into players (user_id, nick, avatar, test_mode)
      values (${userId}, ${data.nick}, ${data.avatar}, ${data.testMode})
      on conflict (user_id) do update
        set nick = excluded.nick, avatar = excluded.avatar, test_mode = excluded.test_mode
    `;
    const id = crypto.randomUUID();
    await sql`
      insert into ledger (id, user_id, kind, amount, balance, ref)
      select ${id}, ${userId}, 'bono_inicial', ${BONO_INICIAL}, ${BONO_INICIAL}, 'alta'
      where not exists (select 1 from ledger where user_id = ${userId})
    `;
    const state = await sql<{ profile_frame: string; card_back: string; premium_balance: number; ads_removed: boolean }>`
      select p.profile_frame, p.card_back,
        coalesce((select w.balance from premium_wallets w where w.user_id = p.user_id), 0) as premium_balance,
        exists(select 1 from store_receipts r where r.user_id = p.user_id and r.product_id = 'remove_ads') as ads_removed
      from players p where p.user_id = ${userId}
    `;
    return {
      nick: data.nick,
      avatar: data.avatar,
      frame: state[0]?.profile_frame ?? "none",
      cardBack: state[0]?.card_back ?? "classic",
      testMode: data.testMode,
      balance: await balanceOf(userId),
      premiumBalance: num(state[0]?.premium_balance),
      adsRemoved: Boolean(state[0]?.ads_removed),
    };
  });

export const applyLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: LedgerKind; amount: number; ref?: string }) => {
    const kind = input?.kind;
    const amount = Math.trunc(Number(input?.amount));
    if (!KINDS.includes(kind)) throw new Error("Movimiento inválido");
    if (!Number.isFinite(amount) || amount === 0) throw new Error("Monto inválido");
    if (Math.abs(amount) > 200_000) throw new Error("Monto fuera de rango");
    if (kind === "entrada_mesa" && amount >= 0) throw new Error("La entrada se descuenta");
    if (kind === "salida_mesa" && amount <= 0) throw new Error("La salida devuelve créditos");
    return { kind, amount, ref: input.ref ? String(input.ref).slice(0, 80) : undefined };
  })
  .handler(async ({ context, data }): Promise<number> => {
    const sql = await getSql();
    const owns = await sql<{ user_id: string }>`
      select user_id from players where user_id = ${context.userId}
    `;
    if (!owns[0]) throw new Error("Primero elige tu apodo");
    if (data.kind === "entrada_mesa") {
      const stake = -data.amount;
      const next = await credit(context.userId, data.kind, data.amount, data.ref ?? null);
      await sql`
        insert into open_seats (user_id, staked, ceiling)
        values (${context.userId}, ${stake}, ${stake + TOPE_BOTS})
        on conflict (user_id) do update
          set staked = open_seats.staked + ${stake},
              ceiling = open_seats.ceiling + ${stake}
      `;
      return next;
    }
    const open = await sql<{ ceiling: number }>`
      select ceiling from open_seats where user_id = ${context.userId}
    `;
    if (!open[0]) throw new Error("No hay una mesa abierta");
    const pay = Math.min(data.amount, num(open[0].ceiling));
    const next = await credit(context.userId, data.kind, pay, data.ref ?? null);
    await sql`delete from open_seats where user_id = ${context.userId}`;
    return next;
  });

export const closeSeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<boolean> => {
    const sql = await getSql();
    await sql`delete from open_seats where user_id = ${context.userId}`;
    return true;
  });
