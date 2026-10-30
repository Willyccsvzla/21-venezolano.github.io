#!/usr/bin/env node
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
try {
  const migrations = (await readdir(new URL("../migrations/", import.meta.url)))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of migrations) {
    await db.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  }

  await db.query("insert into players (user_id, nick, avatar) values ($1, $2, $3)", ["smoke-user", "Jugador", "🤠"]);
  await db.query("insert into ledger (id, user_id, kind, amount, balance, ref) values ($1, $2, $3, $4, $5, $6)", ["seed-chip", "smoke-user", "bono_inicial", 500, 500, "test"]);
  await db.query("insert into premium_wallets (user_id, balance) values ($1, $2)", ["smoke-user", 500]);

  const bought = await db.query(`
    with current as (
      select coalesce((select level from player_inventory where user_id = $1 and item_id = $2 for update), 0)::int as level
    ), charge as (
      update premium_wallets set balance = premium_wallets.balance -
        case when current.level = 0 then $3 else $3 * current.level end,
        updated_at = now()
      from current where premium_wallets.user_id = $1
        and premium_wallets.balance >= case when current.level = 0 then $3 else $3 * current.level end
        and current.level < $4
      returning premium_wallets.balance, current.level as old_level
    ), owned as (
      insert into player_inventory (user_id, item_id, level, equipped)
      select $1, $2, charge.old_level + 1, false from charge
      on conflict (user_id, item_id) do update set level = player_inventory.level + 1
      returning level
    ), ledger as (
      insert into premium_ledger (id, user_id, kind, amount, balance, ref)
      select $5, $1, 'market_purchase', -case when charge.old_level = 0 then $3 else $3 * charge.old_level end,
        charge.balance, $6 from charge cross join owned returning balance
    ) select ledger.balance, owned.level from ledger cross join owned
  `, ["smoke-user", "back-silver", 100, 3, "purchase-id", "market:request-id"]);
  assert.deepEqual(bought.rows[0], { balance: 400, level: 1 });

  await db.query("insert into ad_reward_tickets (id, user_id) values ($1, $2)", ["ticket-id", "smoke-user"]);
  const rewarded = await db.query(`
    with ticket as (
      update ad_reward_tickets set used_at = now()
      where id = $1 and user_id = $2 and used_at is null and created_at > now() - interval '30 minutes'
      returning user_id
    ), event as (
      insert into ad_reward_events (id, user_id, provider, provider_transaction, amount)
      select $3, ticket.user_id, 'admob', $4, 100 from ticket
      on conflict (provider_transaction) do nothing returning user_id
    ), previous as (
      select balance from ledger where user_id = (select user_id from event) order by seq desc limit 1 for update
    ), reward as (
      insert into ledger (id, user_id, kind, amount, balance, ref)
      select $5, event.user_id, 'anuncio_recompensado', 100, previous.balance + 100, $6
      from event cross join previous returning user_id, balance
    ) select user_id, balance from reward
  `, ["ticket-id", "smoke-user", "event-id", "admob-transaction", "reward-ledger-id", "admob:admob-transaction"]);
  assert.equal(rewarded.rows[0]?.balance, 600);

  const replay = await db.query(`
    insert into ad_reward_events (id, user_id, provider, provider_transaction, amount)
    values ($1, $2, 'admob', $3, 100) on conflict (provider_transaction) do nothing returning id
  `, ["replay-id", "smoke-user", "admob-transaction"]);
  assert.equal(replay.rows.length, 0, "duplicate ad transaction must not issue another reward");
  console.log(JSON.stringify({ ok: true, migrations, marketBalance: bought.rows[0].balance, rewardedGameBalance: rewarded.rows[0].balance, replayRejected: true }, null, 2));
} finally {
  await db.close();
}
