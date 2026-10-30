import { useEffect, useState, type FormEvent } from 'react';
import { UserButton } from '@/lib/auth/gates';
import type { Profile, Room } from '../services/backend';
import type { LeaderboardEntry } from '@/lib/leaderboard.functions';
import type { ProgressionState } from '@/lib/progression.functions';
import { useViewport } from './useViewport';
import { inviteUrl } from './invite';
import { hasPlayBillingBridge, hasRewardedAdBridge } from './native-commerce';
import { CardBack } from './SpanishCard';

type LobbySection = 'salas' | 'recargar' | 'perfil' | 'mercado' | 'invitar' | 'ranking';
type RoomCategory = 'public' | 'professional' | 'vip' | 'private';
const ROOM_CATEGORIES: { id: RoomCategory; label: string }[] = [
  { id: 'public', label: 'Públicas' },
  { id: 'professional', label: 'Profesionales' },
  { id: 'vip', label: 'VIP' },
  { id: 'private', label: 'Privadas' },
];

const AVATARS = ['🤠', '😎', '🧑🏽', '👩🏻', '🦁', '🦜'];
const SECTIONS: { id: LobbySection; label: string; icon: string }[] = [
  { id: 'salas', label: 'Salas', icon: '🎴' },
  { id: 'recargar', label: 'Recargar', icon: '🎬' },
  { id: 'perfil', label: 'Perfil', icon: '👤' },
  { id: 'mercado', label: 'Mercado', icon: '🛍️' },
  { id: 'invitar', label: 'Invitar amigos', icon: '👥' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
];

export function Lobby({ profile, balance, rooms, onJoin, onCreate, onFindCode, onSaveProfile, onLoadLeaderboard, onLoadMarket, onBuyCosmetic, onEquipCosmetic, onGrantDevPremium, onBuyStoreProduct, onWatchRewardedAd, notice }: {
  profile: Profile; balance: number; rooms: Room[];
  onJoin: (r: Room) => void; onCreate: (name: string, casa: number, bots: number) => Promise<Room>; onFindCode: (code: string) => Promise<Room | null>;
  onSaveProfile: (nick: string, avatar: string) => Promise<void>; notice?: string;
  onLoadLeaderboard: () => Promise<LeaderboardEntry[]>;
  onLoadMarket: () => Promise<ProgressionState>;
  onBuyCosmetic: (itemId: string) => Promise<void>;
  onEquipCosmetic: (itemId: string) => Promise<void>;
  onGrantDevPremium: () => Promise<number>;
  onBuyStoreProduct: (productId: string) => Promise<{ premiumBalance: number; adsRemoved: boolean }>;
  onWatchRewardedAd: () => Promise<boolean | void>;
}) {
  const { w, h } = useViewport();
  const wide = w >= 760;
  const rowH = wide ? 74 : 70;
  const perPage = Math.max(1, Math.floor((h - (wide ? 320 : 350)) / rowH) * (wide ? 2 : 1));
  const [section, setSection] = useState<LobbySection>('salas');
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('public');
  const [page, setPage] = useState(0);
  const [created, setCreated] = useState<Room | null>(null);
  const [ranking, setRanking] = useState<LeaderboardEntry[] | null>(null);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [rankingError, setRankingError] = useState('');
  const [market, setMarket] = useState<ProgressionState | null>(null);
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [marketStatus, setMarketStatus] = useState('');
  const [marketAction, setMarketAction] = useState('');
  const [devGrantBalance, setDevGrantBalance] = useState<number | null>(null);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [rewardedAvailable, setRewardedAvailable] = useState(false);
  const list = Array.isArray(rooms) ? rooms : [];
  const devToolsAvailable = import.meta.env.DEV && profile.id === 'dev-user';
  const allRooms = created?.private ? [...list, created] : list;
  const filteredRooms = allRooms.filter((room) => room.category === roomCategory);
  const pages = Math.max(1, Math.ceil(filteredRooms.length / perPage));
  const pg = Math.min(page, pages - 1);
  const visible = filteredRooms.slice(pg * perPage, pg * perPage + perPage);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false);
  const [cName, setCName] = useState('Mesa de ' + profile.nick);
  const [cCasa, setCCasa] = useState(1);
  const [cBots, setCBots] = useState(3);
  const [editNick, setEditNick] = useState(profile.nick);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [inviteStatus, setInviteStatus] = useState('');
  const [inviteRoomId, setInviteRoomId] = useState('');
  const inviteRoom = created?.private
    ? created
    : list.find((room) => room.id === inviteRoomId) ?? list[0] ?? null;
  const roomInviteLink = typeof window === 'undefined'
    ? ''
    : inviteRoom
      ? inviteUrl(inviteRoom.private ? inviteRoom.code ?? null : null, inviteRoom.id)
      : new URL('/', window.location.origin).toString();

  useEffect(() => {
    if (section !== 'ranking') return;
    let active = true;
    setRankingBusy(true);
    setRankingError('');
    void onLoadLeaderboard().then((entries) => {
      if (active) setRanking(entries);
    }).catch((error: unknown) => {
      if (active) setRankingError(error instanceof Error ? error.message : 'No se pudo cargar el ranking');
    }).finally(() => {
      if (active) setRankingBusy(false);
    });
    return () => { active = false; };
  }, [onLoadLeaderboard, section]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBillingAvailable(hasPlayBillingBridge());
      setRewardedAvailable(hasRewardedAdBridge());
    }
  }, []);

  useEffect(() => {
    if (section !== 'mercado') return;
    let active = true;
    setMarketBusy(true);
    setMarketError('');
    void onLoadMarket().then((state) => { if (active) setMarket(state); })
      .catch((error: unknown) => { if (active) setMarketError(error instanceof Error ? error.message : 'No se pudo abrir el mercado'); })
      .finally(() => { if (active) setMarketBusy(false); });
    return () => { active = false; };
  }, [onLoadMarket, section]);

  async function buyMarketItem(itemId: string) {
    setMarketAction(itemId); setMarketError(''); setMarketStatus('');
    try { await onBuyCosmetic(itemId); setMarket(await onLoadMarket()); setMarketStatus('Objeto agregado a tu colección.'); }
    catch (error) { setMarketError(error instanceof Error ? error.message : 'No se pudo comprar el objeto'); }
    finally { setMarketAction(''); }
  }

  async function equipMarketItem(itemId: string) {
    setMarketAction(itemId); setMarketError(''); setMarketStatus('');
    try { await onEquipCosmetic(itemId); setMarket(await onLoadMarket()); setMarketStatus('Cosmético equipado.'); }
    catch (error) { setMarketError(error instanceof Error ? error.message : 'No se pudo equipar el objeto'); }
    finally { setMarketAction(''); }
  }

  async function buyStoreProduct(productId: string) {
    setMarketAction(productId); setMarketError(''); setMarketStatus('');
    try {
      await onBuyStoreProduct(productId);
      setMarket(await onLoadMarket());
      setMarketStatus(productId === 'remove_ads' ? 'Compra verificada: anuncios desactivados.' : 'Compra verificada. Moneda premium acreditada.');
    } catch (error) { setMarketError(error instanceof Error ? error.message : 'No se pudo completar la compra'); }
    finally { setMarketAction(''); }
  }

  async function watchAd() {
    setMarketAction('rewarded-ad'); setMarketError(''); setMarketStatus('');
    try {
      const completed = await onWatchRewardedAd();
      if (completed === false) { setMarketStatus('Anuncio cancelado. No se añadieron fichas.'); return; }
      setMarketStatus('Anuncio completado. Esperando la confirmación segura del servidor…');
      window.setTimeout(() => { void onLoadMarket().then(setMarket).catch(() => undefined); }, 3000);
    } catch (error) { setMarketError(error instanceof Error ? error.message : 'No se pudo mostrar el anuncio'); }
    finally { setMarketAction(''); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError('');
    setSavingProfile(true);
    try {
      await onSaveProfile(editNick, editAvatar);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'No se pudo guardar tu perfil');
    } finally {
      setSavingProfile(false);
    }
  }

  async function shareInvite() {
    setInviteStatus('');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: '21 Venezolano',
          text: inviteRoom ? `Juguemos en ${inviteRoom.name}` : 'Juguemos 21 Venezolano',
          url: roomInviteLink,
        });
        setInviteStatus('Invitación compartida.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomInviteLink);
        setInviteStatus('Enlace de invitación copiado.');
      } else {
        setInviteStatus('Este navegador no permite compartir desde aquí.');
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setInviteStatus('No se pudo compartir. Inténtalo de nuevo.');
      }
    }
  }

  return (
    <div className="screen lobby">
      <header className="bar">
        <div className="auth-chip"><UserButton /></div>
        <div className="me"><span className={`av-sm frame-${profile.frame}`}>{profile.avatar}</span> {profile.nick}</div>
        <button className="bal btnlike" onClick={() => setSection('recargar')} data-testid="balance" aria-label={`Recargar fichas. Saldo ${balance}`}>
          🪙 {balance} <small>+</small>
        </button>
      </header>

      <nav className="lobby-nav" aria-label="Accesos principales">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={section === item.id ? 'lobby-nav-item active' : 'lobby-nav-item'}
            aria-pressed={section === item.id}
            onClick={() => { setSection(item.id); setProfileError(''); }}
          >
            <span className="lobby-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="lobby-content">
        {section === 'salas' && (
          <>
            <h2 className="title">Salas</h2>
            {notice && <p className="err">{notice}</p>}
            <div className="room-categories" role="tablist" aria-label="Categoría de mesas">
              {ROOM_CATEGORIES.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={roomCategory === item.id}
                  className={roomCategory === item.id ? 'room-category active' : 'room-category'}
                  onClick={() => { setRoomCategory(item.id); setPage(0); }}>
                  {item.label}
                </button>
              ))}
            </div>
            {filteredRooms.length === 0 ? (
              <div className="feature-card room-empty">
                <p>{roomCategory === 'private' ? 'Crea una sala privada o entra con un código.' : 'No hay mesas disponibles en esta categoría todavía.'}</p>
              </div>
            ) : (
            <div className={wide ? 'rooms two' : 'rooms'} style={{ gridTemplateRows: `repeat(${Math.max(1, Math.ceil(visible.length / (wide ? 2 : 1)))}, ${rowH - 8}px)` }}>
              {visible.map((r) => (
                <div className="room" key={r.id} data-testid={`room-${r.id}`}>
                  <div className="rinfo">
                    <div className="rname">{r.private ? '🔒 ' : ''}{r.name}</div>
                    <div className="rmeta">Casa <b>{r.casa}</b> · Entrada <b>{r.entrada}</b> · 👥 {r.occupied} en la mesa</div>
                    <div className="rbots">{(r.bots ?? []).map((b, i) => <span key={b.name + i} title={b.name}>{b.avatar}</span>)}</div>
                  </div>
                  <button className="btn gold" disabled={balance < r.entrada} onClick={() => onJoin(r)}>{balance < r.entrada ? 'Sin saldo' : 'Unirse'}</button>
                </div>
              ))}
            </div>
            )}
            <div className="pager">
              <button className="btn ghost sm" disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Página anterior">‹</button>
              <span>{pg + 1}/{pages}</span>
              <button className="btn ghost sm" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Página siguiente">›</button>
            </div>
            <div className="lobby-actions">
              <button className="btn gold" data-testid="crear" onClick={() => { setCreating(true); setCreated(null); }}>＋ Crear sala privada</button>
              <form className="codeform" onSubmit={(e) => { e.preventDefault(); void onFindCode(code).then((r) => { if (r) onJoin(r); else setErr('Código no encontrado'); }); }}>
                <input aria-label="Código de sala" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} placeholder="CÓDIGO" maxLength={5} />
                <button className="btn ghost">Entrar</button>
              </form>
              {err && <div className="err" role="status">{err}</div>}
            </div>
            <p className="foot">Misma mesa para todos. Si falta alguien, el puesto lo ocupa un bot.</p>
          </>
        )}

        {section === 'recargar' && (
          <section className="feature-panel" aria-labelledby="recharge-title">
            <h2 id="recharge-title">Recargar fichas</h2>
            <p className="note">Tu saldo actual es <b>{balance} fichas de juego</b>.</p>
            <div className="feature-card">
              <span className="feature-icon" aria-hidden="true">🎬</span>
              <h3>Anuncios recompensados</h3>
              <p>Completa el anuncio y el servidor acreditará 100 fichas al confirmar el evento seguro del proveedor.</p>
              <button className="btn gold" type="button" disabled={!rewardedAvailable || Boolean(marketAction) || profile.adsRemoved} onClick={() => { void watchAd(); }}>
                {profile.adsRemoved ? 'Anuncios desactivados' : marketAction === 'rewarded-ad' ? 'Abriendo anuncio…' : 'Ver anuncio por 100 fichas'}
              </button>
              {!rewardedAvailable && !profile.adsRemoved && <p className="note">Requiere el SDK de anuncios de la aplicación Android.</p>}
              {profile.adsRemoved && <p className="note">Gracias por apoyar el juego. Tus anuncios están desactivados.</p>}
            </div>
            {!profile.adsRemoved && <div className="feature-card">
              <span className="feature-icon" aria-hidden="true">🚫</span>
              <h3>Quitar anuncios</h3>
              <p>Compra única. Google Play confirma la compra y queda asociada a tu cuenta.</p>
              <button className="btn ghost" type="button" disabled={!billingAvailable || marketAction === 'remove_ads'} onClick={() => { void buyStoreProduct('remove_ads'); }}>
                {marketAction === 'remove_ads' ? 'Verificando compra…' : 'Quitar anuncios · precio de Play Store'}
              </button>
              {!billingAvailable && <p className="note">Disponible al integrar la facturación de la aplicación Android.</p>}
            </div>}
            {marketError && <p className="err" role="alert">{marketError}</p>}
            {marketStatus && <p className="note" role="status">{marketStatus}</p>}
          </section>
        )}

        {section === 'perfil' && (
          <section className="feature-panel" aria-labelledby="profile-title">
            <h2 id="profile-title">Tu perfil</h2>
            <form className="profile-form panel" onSubmit={saveProfile}>
              <div className={`profile-avatar profile-frame-${profile.frame}`} aria-hidden="true">{editAvatar}</div>
              <label className="lbl" htmlFor="profile-nick">Apodo</label>
              <input id="profile-nick" value={editNick} maxLength={16} onChange={(e) => setEditNick(e.target.value)} required />
              <fieldset className="avatar-picker">
                <legend className="lbl">Avatar</legend>
                <div className="avatars">
                  {AVATARS.map((avatar) => (
                    <button key={avatar} type="button" className={avatar === editAvatar ? 'av on' : 'av'} aria-label={`Usar avatar ${avatar}`} aria-pressed={avatar === editAvatar} onClick={() => setEditAvatar(avatar)}>{avatar}</button>
                  ))}
                </div>
              </fieldset>
              <p className="note">Los marcos de perfil estarán disponibles desde el mercado.</p>
              {profileError && <p className="err" role="alert">{profileError}</p>}
              <button className="btn gold big" type="submit" disabled={savingProfile || !editNick.trim()}>{savingProfile ? 'Guardando…' : 'Guardar perfil'}</button>
            </form>
          </section>
        )}

        {section === 'mercado' && (
          <section className="feature-panel" aria-labelledby="market-title">
            <h2 id="market-title">Mercado</h2>
            <p className="note">Moneda premium: <b>💎 {market?.premiumBalance ?? 0}</b> · separada de tus fichas de juego.</p>
            {devToolsAvailable && <div className="feature-card dev-tools" aria-label="Herramientas de desarrollo">
              <h3>Herramientas de desarrollo</h3>
              <p>Solo en esta vista local: agrega moneda de prueba para desbloquear reversos, mejoras y el efecto WIN. No es una compra real.</p>
              <button className="btn ghost" type="button" disabled={Boolean(marketAction)} onClick={() => {
                setMarketAction('dev-premium'); setMarketError('');
                void onGrantDevPremium().then((balance) => onLoadMarket().then((state) => { setMarket(state); setDevGrantBalance(balance); }))
                  .catch((error: unknown) => setMarketError(error instanceof Error ? error.message : 'No se pudieron agregar monedas de prueba'))
                  .finally(() => setMarketAction(''));
              }}>{marketAction === 'dev-premium' ? 'Agregando…' : 'Agregar 1.000 monedas premium de prueba'}</button>
              {devGrantBalance !== null && <p className="note" role="status">Saldo premium de prueba: 💎 {devGrantBalance}</p>}
            </div>}
            {marketBusy && <p className="note" role="status">Cargando colección…</p>}
            {marketError && <p className="err" role="alert">{marketError}</p>}
            {marketStatus && <p className="note" role="status">{marketStatus}</p>}
            {!billingAvailable && <div className="feature-card">
              <h3>Monedas premium</h3>
              <p>Los paquetes se cobran en Google Play. Las monedas solo sirven para objetos cosméticos y no se pueden retirar ni canjear.</p>
              <p className="note">La facturación se habilita al integrar la aplicación Android.</p>
            </div>}
            <div className="market-grid">
              {market?.items.map((item) => {
                const isEquipped = item.id.startsWith('frame-')
                  ? market.currentFrame === item.id.slice('frame-'.length)
                  : item.kind === 'effect'
                    ? market.currentEffect === item.id.slice('effect-'.length)
                    : item.id.startsWith('back-') && market.currentBack === item.id.slice('back-'.length);
                const isBlack = item.id === 'back-all-black';
                const nextCost = item.level === 0 ? item.price : item.price * item.level;
                return <article className={isBlack ? 'feature-card all-black' : 'feature-card'} key={item.id}>
                  {item.kind === 'back'
                    ? <CardBack className="market-back-preview" design={isBlack ? 'all-black' : item.id.includes('silver') ? 'silver' : 'gold'} />
                    : <span className={`feature-icon${item.kind === 'effect' ? ' win-effect-preview' : ''}`} aria-hidden="true">{item.kind === 'effect' ? 'WIN!' : item.id.includes('silver') ? '🥈' : '🥇'}</span>}
                  <h3>{item.name}</h3>
                  <p>{isBlack ? (market.rank === 1 ? 'Recompensa exclusiva del primer puesto.' : 'Solo para quien ocupe el primer puesto del ranking.') : item.kind === 'back' ? `Nivel ${item.level}/${item.maxLevel} · mejora el reverso de tus cartas.` : item.kind === 'effect' ? 'Aparece junto al jugador que gana cada mano.' : 'Marco cosmético para tu perfil.'}</p>
                  {!isBlack && item.canBuy && <button className="btn gold" type="button" disabled={Boolean(marketAction) || market.premiumBalance < nextCost} onClick={() => { void buyMarketItem(item.id); }}>
                    {marketAction === item.id ? 'Procesando…' : item.level ? `Mejorar · 💎 ${nextCost}` : `Comprar · 💎 ${nextCost}`}
                  </button>}
                  {item.level > 0 && <button className="btn ghost" type="button" disabled={Boolean(marketAction) || isEquipped || (isBlack && market.rank !== 1)} onClick={() => { void equipMarketItem(item.id); }}>
                    {isEquipped ? 'Equipado' : isBlack && market.rank !== 1 ? 'Reservado para el primer puesto' : 'Equipar'}
                  </button>}
                  {!isBlack && item.level === 0 && market.premiumBalance < nextCost && <p className="note">Te faltan monedas premium. Recárgalas en Google Play.</p>}
                </article>;
              })}
            </div>
            {billingAvailable && <div className="feature-card">
              <h3>Comprar moneda premium</h3>
              <div className="market-packs">
                {[['premium_100', '100'], ['premium_500', '500'], ['premium_1200', '1200']].map(([id, amount]) => <button key={id} className="btn ghost" type="button" disabled={Boolean(marketAction)} onClick={() => { void buyStoreProduct(id); }}>
                  {marketAction === id ? 'Verificando…' : `💎 ${amount} · precio de Play Store`}
                </button>)}
              </div>
            </div>}
          </section>
        )}

        {section === 'invitar' && (
          <section className="feature-panel" aria-labelledby="invite-title">
            <h2 id="invite-title">Invitar amigos</h2>
            <div className="feature-card">
              <span className="feature-icon" aria-hidden="true">👥</span>
              <p>Comparte un enlace para que tus amigos entren directamente a una mesa.</p>
              {created?.private ? (
                <p className="note">Sala privada: <b>{created.name}</b> · Código <b>{created.code}</b></p>
              ) : list.length > 0 ? (
                <label className="lbl" htmlFor="invite-room">Mesa</label>
              ) : null}
              {!created?.private && list.length > 0 && (
                <select id="invite-room" value={inviteRoom?.id ?? ''} onChange={(event) => setInviteRoomId(event.target.value)}>
                  {list.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              )}
              {inviteRoom && <input className="invite-link" readOnly value={roomInviteLink} aria-label="Enlace de invitación a la mesa" />}
              <div className="lobby-actions">
                <button className="btn gold big" type="button" onClick={() => { void shareInvite(); }}>Compartir invitación</button>
                <button className="btn ghost" type="button" disabled={!inviteRoom} onClick={() => {
                  if (!navigator.clipboard?.writeText) { setInviteStatus('Este navegador no permite copiar el enlace.'); return; }
                  void navigator.clipboard.writeText(roomInviteLink).then(
                    () => setInviteStatus('Enlace de invitación copiado.'),
                    () => setInviteStatus('No se pudo copiar el enlace. Inténtalo de nuevo.'),
                  );
                }}>Copiar enlace</button>
              </div>
              {inviteStatus && <p className="note" role="status">{inviteStatus}</p>}
            </div>
          </section>
        )}

        {section === 'ranking' && (
          <section className="feature-panel" aria-labelledby="ranking-title">
            <h2 id="ranking-title">Ranking</h2>
            {rankingBusy && <p className="note" role="status">Cargando resultados…</p>}
            {rankingError && <p className="err" role="alert">{rankingError}</p>}
            {!rankingBusy && !rankingError && ranking?.length === 0 && <div className="feature-card"><span className="feature-icon" aria-hidden="true">🏆</span><p>El ranking aparecerá cuando se completen manos en mesas con jugadores.</p></div>}
            {!!ranking?.length && <ol className="leaderboard">
              {ranking.map((entry) => <li key={`${entry.rank}-${entry.nick}`} className={entry.rank === 1 ? 'leaderboard-row first' : 'leaderboard-row'}>
                <b className="leaderboard-rank">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</b>
                <span className="leaderboard-name">{entry.nick}{entry.isYou ? ' (tú)' : ''}</span>
                <span className="leaderboard-stats">{entry.wins} victorias · {entry.games} manos</span>
              </li>)}
            </ol>}
            {ranking?.some((entry) => entry.rank === 1 && entry.isYou) && <p className="note">All Black está disponible mientras conserves el primer puesto.</p>}
          </section>
        )}
      </main>

      {creating && (
        <div className="modal" onClick={() => setCreating(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {!created ? (
              <>
                <h2>Sala privada</h2>
                <label className="lbl">Nombre</label>
                <input value={cName} onChange={(e) => setCName(e.target.value)} maxLength={22} />
                <label className="lbl">Casa</label>
                <div className="seg">{[1, 2, 5, 10].map((c) => <button key={c} className={c === cCasa ? 'on' : ''} onClick={() => setCCasa(c)}>{c}</button>)}</div>
                <label className="lbl">Bots</label>
                <div className="seg">{[1, 2, 3, 4, 5].map((c) => <button key={c} className={c === cBots ? 'on' : ''} onClick={() => setCBots(c)}>{c}</button>)}</div>
                <p className="note">Entrada: {cCasa * 30} créditos</p>
                <button className="btn gold big" onClick={() => { void onCreate(cName, cCasa, cBots).then((r) => setCreated(r)); }}>Crear</button>
              </>
            ) : (
              <>
                <h2>¡Sala creada!</h2>
                <p className="note">Código de invitación</p>
                <div className="bigcode" data-testid="code">{created.code}</div>
                <input className="invite-link" readOnly value={inviteUrl(created.code ?? null, created.id)} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de invitación" />
                <button className="btn ghost" onClick={() => { const link = inviteUrl(created.code ?? null, created.id); void navigator.clipboard?.writeText(link); }}>Copiar enlace</button>
                <p className="note">Tu amigo abre ese enlace, entra con su correo y se sienta en esta mesa. Puedes seguir con bots hasta que llegue.</p>
                <button className="btn gold big" onClick={() => { setCreating(false); onJoin(created); }}>Entrar a la sala</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
