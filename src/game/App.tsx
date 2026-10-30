import { useCallback, useEffect, useState } from "react";
import { createDeck } from "./engine";
import { SpanishCard } from "./ui/SpanishCard";
import type { Profile, Room } from "./services/backend";
import { Entrada } from "./ui/Entrada";
import { Lobby } from "./ui/Lobby";
import { MesaLive } from "./ui/MesaLive";
import { getPlayer, savePlayer, type PlayerProfile } from "@/lib/player.functions";
import { createTable, joinTable, leaveLive, listTables, whereAmI } from "@/lib/table.functions";
import { getLeaderboard } from "@/lib/leaderboard.functions";
import { createRewardedAdTicket } from "@/lib/ad-rewards.functions";
import { verifyPlayPurchase } from "@/lib/play-store.functions";
import { equipCosmetic, getProgression, grantDevTestCredits, purchaseCosmetic } from "@/lib/progression.functions";
import { startPlayPurchase, startRewardedAd } from "./ui/native-commerce";
import { unlockAudio, playShuffle } from "./ui/sound";
import { readInvite, rememberInvite } from "./ui/invite";
import { useCurrentUser } from "@/lib/auth/use-current-user";

type Screen = "entrada" | "lobby" | "mesa";

function profileOf(userId: string, p: PlayerProfile): Profile {
  return { id: userId, nick: p.nick, avatar: p.avatar, frame: p.frame, cardBack: p.cardBack, adsRemoved: p.adsRemoved, testMode: p.testMode, createdAt: 0 };
}

export default function App() {
  const user = useCurrentUser();
  const userId = user?.id ?? "";
  const [player, setPlayer] = useState<PlayerProfile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");
  const [screen, setScreen] = useState<Screen>("lobby");
  const [balance, setBalance] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const loadLeaderboard = useCallback(() => getLeaderboard(), []);
  const loadMarket = useCallback(() => getProgression(), []);
  const refreshPlayer = useCallback(async () => {
    const current = await getPlayer();
    if (!current) return;
    setPlayer(current);
    setBalance(current.balance);
  }, []);
  const buyStoreProduct = useCallback(async (productId: string) => {
    const purchase = await startPlayPurchase(productId, userId);
    const result = await verifyPlayPurchase({ data: purchase });
    await refreshPlayer();
    return result;
  }, [refreshPlayer, userId]);
  const watchRewardedAd = useCallback(async () => {
    const ticket = await createRewardedAdTicket();
    const completed = await startRewardedAd({ adUnitId: ticket.adUnitId, userId: ticket.userId, customData: ticket.ticket, rewardItem: ticket.rewardItem, rewardAmount: ticket.rewardAmount });
    if (!completed) return false;
    // SSV is asynchronous; refresh after the callback has had time to arrive.
    window.setTimeout(() => { void refreshPlayer(); }, 2500);
    return true;
  }, [refreshPlayer]);

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    setPlayer(undefined);
    (async () => {
      try {
        const p = await getPlayer();
        if (cancel) return;
        if (!p) { setPlayer(null); return; }
        setBalance(p.balance);
        setPlayer(p);
        rememberInvite();
        const mine = await whereAmI();
        const listed = await listTables();
        if (cancel) return;
        if (Array.isArray(listed)) setRooms(listed);
        const { mesa, sala } = readInvite();
        if ((mesa && mesa.length >= 4) || sala) {
          const here = mine && ((mesa && mine.code === mesa) || (sala && mine.tableId === sala));
          if (!here) {
            try {
              unlockAudio();
              playShuffle();
              if (mine) await leaveLive();
              const s = await joinTable({ data: mesa ? { code: mesa } : { id: sala } });
              if (cancel) return;
              setBalance(s.balance);
              setScreen("mesa");
              return;
            } catch (e) {
              try { sessionStorage.removeItem("v21.invite"); } catch { /* sin storage */ }
              if (!cancel) setNotice(e instanceof Error ? e.message : "No se encontró esa mesa");
            }
          }
        }
        setScreen(mine ? "mesa" : "lobby");
      } catch (e) {
        if (!cancel) setLoadError(e instanceof Error ? e.message : "No se pudo abrir tu mesa");
      }
    })();
    return () => { cancel = true; };
  }, [userId, reload]);

  useEffect(() => {
    if (screen !== "lobby" || !userId) return;
    const id = setInterval(() => {
      void listTables().then((rows) => { if (Array.isArray(rows)) setRooms(rows); }).catch(() => undefined);
    }, 4000);
    return () => clearInterval(id);
  }, [screen, userId]);

  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("baraja") && player) {
    return (
      <div className="screen baraja">
        {createDeck().map((c) => <SpanishCard key={c.id} card={c} className="gal" />)}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="screen entrada">
        <p className="err">{loadError}</p>
        <button className="btn gold" onClick={() => { setLoadError(""); setPlayer(undefined); setReload((n) => n + 1); }}>Reintentar</button>
      </div>
    );
  }
  if (player === undefined || !user) {
    return (
      <div className="screen entrada">
        <p className="tag">Abriendo la mesa…</p>
      </div>
    );
  }
  if (!player) {
    return (
      <Entrada onEnter={async (n, a) => {
        const saved = await savePlayer({ data: { nick: n, avatar: a, testMode: false } });
        setPlayer(saved);
        setBalance(saved.balance);
        setRooms(await listTables());
        setScreen("lobby");
      }} />
    );
  }

  const profile = profileOf(userId, player);

  async function enter(r: Room) {
    unlockAudio();
    playShuffle();
    try {
      const s = await joinTable({ data: r.code && !r.id ? { code: r.code } : { id: r.id } });
      setBalance(s.balance);
      setScreen("mesa");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo entrar a la mesa");
    }
  }

  if (screen === "mesa") {
    return (
      <MesaLive profile={profile} onBalance={setBalance}
        onLeave={(bal) => { setBalance(bal); setScreen("lobby"); void listTables().then(setRooms); }} />
    );
  }
  return (
    <Lobby profile={profile} balance={balance} rooms={rooms} notice={notice}
      onLoadLeaderboard={loadLeaderboard} onLoadMarket={loadMarket}
      onBuyCosmetic={async (itemId) => { await purchaseCosmetic({ data: { itemId, requestId: crypto.randomUUID() } }); }}
      onEquipCosmetic={async (itemId) => { await equipCosmetic({ data: { itemId } }); await refreshPlayer(); }}
      onGrantDevPremium={async () => {
        const premiumBalance = await grantDevTestCredits({ data: { requestId: crypto.randomUUID() } });
        await refreshPlayer();
        return premiumBalance;
      }}
      onBuyStoreProduct={buyStoreProduct} onWatchRewardedAd={watchRewardedAd}
      onJoin={(r) => { void enter(r); }}
      onCreate={async (n, c, b) => {
        const s = await createTable({ data: { name: n, casa: c, bots: b } });
        setBalance(s.balance);
        return { id: s.tableId, name: s.name, casa: s.casa, entrada: s.entrada, seats: 4, bots: [], private: true, category: "private", code: s.code ?? "", occupied: s.humans };
      }}
      onFindCode={async (code) => ({ id: "", name: "Mesa", casa: 1, entrada: 0, seats: 2, bots: [], private: true, category: "private", code: code.trim().toUpperCase(), occupied: 0 })}
      onSaveProfile={async (nick, avatar) => {
        const saved = await savePlayer({ data: { nick, avatar, testMode: player.testMode } });
        setPlayer(saved);
        setBalance(saved.balance);
      }} />
  );
}
