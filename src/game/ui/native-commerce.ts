export type PlayPurchase = { productId: string; purchaseToken: string };
export type RewardedAdRequest = {
  adUnitId: string;
  userId: string;
  customData: string;
  rewardItem: string;
  rewardAmount: number;
};

declare global {
  interface Window {
    PlayBillingBridge?: {
      purchase(productId: string, obfuscatedAccountId: string): Promise<PlayPurchase>;
      restore?(): Promise<PlayPurchase[]>;
    };
    AdMobRewardedBridge?: {
      show(request: RewardedAdRequest): Promise<boolean>;
    };
  }
}

export function hasPlayBillingBridge(): boolean {
  return typeof window !== "undefined" && Boolean(window.PlayBillingBridge?.purchase);
}

export function hasRewardedAdBridge(): boolean {
  return typeof window !== "undefined" && Boolean(window.AdMobRewardedBridge?.show);
}

export async function startPlayPurchase(productId: string, userId: string): Promise<PlayPurchase> {
  const bridge = typeof window !== "undefined" ? window.PlayBillingBridge : undefined;
  if (!bridge) throw new Error("La compra de Play Store estará disponible al integrar la aplicación Android.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  const obfuscatedAccountId = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const purchase = await bridge.purchase(productId, obfuscatedAccountId);
  if (purchase.productId !== productId || !purchase.purchaseToken) throw new Error("La tienda devolvió un recibo de compra inválido.");
  return purchase;
}

export async function startRewardedAd(request: RewardedAdRequest): Promise<boolean> {
  const bridge = typeof window !== "undefined" ? window.AdMobRewardedBridge : undefined;
  if (!bridge) throw new Error("Los anuncios recompensados estarán disponibles al integrar la aplicación Android.");
  return bridge.show(request);
}
