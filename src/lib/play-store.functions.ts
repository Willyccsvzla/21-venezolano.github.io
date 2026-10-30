import { createHash, createSign, randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

const PRODUCTS: Record<string, { premiumCoins: number; removeAds: boolean }> = {
  premium_100: { premiumCoins: 100, removeAds: false },
  premium_500: { premiumCoins: 500, removeAds: false },
  premium_1200: { premiumCoins: 1200, removeAds: false },
  remove_ads: { premiumCoins: 0, removeAds: true },
};
let tokenCache: { accessToken: string; expiresAt: number } | undefined;

function encode(input: unknown): string {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

async function playAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;
  const email = process.env.PLAY_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("La validación de compras de Google Play no está configurada.");
  const now = Math.floor(Date.now() / 1000);
  const head = encode({ alg: "RS256", typ: "JWT" });
  const claims = encode({ iss: email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const unsigned = `${head}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("No se pudo autorizar la validación de Google Play.");
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google Play no devolvió un token válido.");
  tokenCache = { accessToken: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

async function playRequest(path: string, method: "GET" | "POST" = "GET"): Promise<Response> {
  const packageName = process.env.PLAY_PACKAGE_NAME;
  if (!packageName) throw new Error("Falta configurar el identificador Android de la aplicación.");
  const token = await playAccessToken();
  return fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
}

export const verifyPlayPurchase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { productId?: string; purchaseToken?: string }) => {
    const productId = String(input?.productId ?? "");
    const purchaseToken = String(input?.purchaseToken ?? "");
    if (!PRODUCTS[productId]) throw new Error("Producto de Play Store no reconocido");
    if (purchaseToken.length < 20 || purchaseToken.length > 4096) throw new Error("Recibo de compra inválido");
    return { productId, purchaseToken };
  })
  .handler(async ({ context, data }) => {
    const path = `purchases/products/${encodeURIComponent(data.productId)}/tokens/${encodeURIComponent(data.purchaseToken)}`;
    const checked = await playRequest(path);
    if (!checked.ok) throw new Error("Google Play no pudo verificar esta compra.");
    const purchase = await checked.json() as { productId?: string; purchaseState?: number; acknowledgementState?: number; consumptionState?: number; obfuscatedExternalAccountId?: string };
    if (purchase.productId !== data.productId || purchase.purchaseState !== 0) throw new Error("La compra no está completada en Google Play.");
    if (purchase.obfuscatedExternalAccountId) {
      const accountHash = createHash("sha256").update(context.userId).digest("hex");
      if (purchase.obfuscatedExternalAccountId !== accountHash) throw new Error("La compra está vinculada a otra cuenta del juego.");
    }

    const tokenHash = createHash("sha256").update(data.purchaseToken).digest("hex");
    const sql = await getSql();
    const prior = await sql<{ user_id: string }>`select user_id from store_receipts where purchase_token_hash = ${tokenHash}`;
    if (prior[0] && prior[0].user_id !== context.userId) throw new Error("Esta compra ya está vinculada a otra cuenta.");

    if (!prior[0]) {
      const product = PRODUCTS[data.productId];
      const receiptRows = await sql<{ receipt_user: string | null }>`
        with receipt as (
          insert into store_receipts (id, user_id, store, product_id, purchase_token_hash)
          values (${randomUUID()}, ${context.userId}, 'google_play', ${data.productId}, ${tokenHash})
          on conflict (purchase_token_hash) do nothing
          returning user_id
        ), wallet as (
          insert into premium_wallets (user_id, balance)
          select receipt.user_id, ${product.premiumCoins} from receipt where ${product.premiumCoins} > 0
          on conflict (user_id) do update set balance = premium_wallets.balance + excluded.balance, updated_at = now()
          returning user_id, balance
        ), ledger as (
          insert into premium_ledger (id, user_id, kind, amount, balance, ref)
          select ${randomUUID()}, wallet.user_id, 'play_purchase', ${product.premiumCoins}, wallet.balance, ${`play:${tokenHash}`}
          from wallet where ${product.premiumCoins} > 0
          returning balance
        )
        select (select user_id from receipt) as receipt_user
      `;
      if (!receiptRows[0]?.receipt_user) {
        const check = await sql<{ user_id: string }>`select user_id from store_receipts where purchase_token_hash = ${tokenHash}`;
        if (check[0]?.user_id !== context.userId) throw new Error("No se pudo registrar la compra.");
      }
    }

    const action = PRODUCTS[data.productId].premiumCoins > 0 && purchase.consumptionState !== 1
      ? `:consume`
      : purchase.acknowledgementState === 0 ? `:acknowledge` : "";
    if (action) {
      const result = await playRequest(`${path}${action}`, "POST");
      if (!result.ok) throw new Error("Compra verificada, pero Google Play aún no confirmó su procesamiento. Reintenta para completar.");
    }
    const state = await sql<{ premium_balance: number; ads_removed: boolean }>`
      select coalesce((select balance from premium_wallets where user_id = ${context.userId}), 0) as premium_balance,
        exists(select 1 from store_receipts where user_id = ${context.userId} and product_id = 'remove_ads') as ads_removed
    `;
    return { premiumBalance: Number(state[0]?.premium_balance ?? 0), adsRemoved: Boolean(state[0]?.ads_removed) };
  });
