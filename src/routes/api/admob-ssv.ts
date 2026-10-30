import { createFileRoute } from "@tanstack/react-router";
import { createPublicKey, randomUUID, verify } from "node:crypto";
import { getSql } from "@/lib/db";
import { REWARDED_AD_CHIPS } from "@/lib/ad-rewards.functions";

type AdMobKey = { keyId: number; pem: string };
let keyCache: { expiresAt: number; keys: AdMobKey[] } | undefined;

async function getAdMobKeys(): Promise<AdMobKey[]> {
  if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.keys;
  const response = await fetch("https://www.gstatic.com/admob/reward/verifier-keys.json", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron consultar las claves de verificación de AdMob");
  const body = await response.json() as { keys?: AdMobKey[] };
  const keys = Array.isArray(body.keys) ? body.keys.filter((key) => Number.isInteger(key.keyId) && key.pem?.includes("BEGIN PUBLIC KEY")) : [];
  if (keys.length === 0) throw new Error("AdMob no devolvió claves de verificación válidas");
  keyCache = { expiresAt: Date.now() + 20 * 60 * 60 * 1000, keys };
  return keys;
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

async function handleCallback(request: Request): Promise<Response> {
  const rawQuery = new URL(request.url).search.slice(1);
  const signatureAt = rawQuery.indexOf("&signature=");
  const signatureParam = new URLSearchParams(rawQuery).get("signature");
  const keyIdText = new URLSearchParams(rawQuery).get("key_id");
  if (signatureAt < 0 || !signatureParam || !keyIdText) return new Response("Invalid callback", { status: 400 });

  const params = new URLSearchParams(rawQuery);
  const keyId = Number(keyIdText);
  const key = (await getAdMobKeys()).find((candidate) => candidate.keyId === keyId);
  if (!key) return new Response("Unknown key", { status: 400 });
  const signedText = rawQuery.slice(0, signatureAt);
  const isValid = verify(
    "sha256",
    Buffer.from(signedText, "utf8"),
    { key: createPublicKey(key.pem), dsaEncoding: "der" },
    decodeBase64Url(signatureParam),
  );
  if (!isValid) return new Response("Invalid signature", { status: 400 });

  const expectedUnit = process.env.ADMOB_REWARDED_UNIT_ID;
  const userId = params.get("user_id") ?? "";
  const ticket = params.get("custom_data") ?? "";
  const transactionId = params.get("transaction_id") ?? "";
  const amount = Number(params.get("reward_amount"));
  const timestamp = Number(params.get("timestamp"));
  if (!expectedUnit || params.get("ad_unit") !== expectedUnit || params.get("reward_item") !== "game_chips"
    || amount !== REWARDED_AD_CHIPS || !userId || !ticket || !transactionId
    || !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 30 * 60 * 1000) {
    return new Response("Reward does not match configuration", { status: 400 });
  }

  const sql = await getSql();
  const credited = await sql<{ user_id: string; balance: number }>`
    with ticket as (
      update ad_reward_tickets set used_at = now()
      where id = ${ticket} and user_id = ${userId} and used_at is null
        and created_at > now() - interval '30 minutes'
      returning user_id
    ), event as (
      insert into ad_reward_events (id, user_id, provider, provider_transaction, amount)
      select ${randomUUID()}, ticket.user_id, 'admob', ${transactionId}, ${REWARDED_AD_CHIPS} from ticket
      on conflict (provider_transaction) do nothing
      returning user_id
    ), previous as (
      select balance from ledger where user_id = (select user_id from event)
      order by seq desc limit 1 for update
    ), reward as (
      insert into ledger (id, user_id, kind, amount, balance, ref)
      select ${randomUUID()}, event.user_id, 'anuncio_recompensado', ${REWARDED_AD_CHIPS}, previous.balance + ${REWARDED_AD_CHIPS}, ${`admob:${transactionId}`}
      from event cross join previous
      on conflict (id) do nothing
      returning user_id, balance
    )
    select user_id, balance from reward
  `;
  // A duplicate callback is expected to be retried by the provider; acknowledge
  // it without issuing another reward.
  if (credited.length === 0) return new Response("OK", { status: 200 });
  return new Response("OK", { status: 200 });
}

export const Route = createFileRoute("/api/admob-ssv")({
  server: { handlers: { GET: ({ request }) => handleCallback(request) } },
});
