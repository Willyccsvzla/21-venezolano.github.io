-- Progression and cosmetic economy. Premium credits are internal-only and have
-- no cash-out or redemption path.
alter table players add column if not exists profile_frame text not null default 'none';
alter table players add column if not exists card_back text not null default 'classic';
alter table live_tables add column if not exists category text not null default 'public';

create table if not exists premium_ledger (
  id text primary key,
  user_id text not null,
  seq bigserial,
  at timestamptz not null default now(),
  kind text not null,
  amount integer not null,
  balance integer not null,
  ref text,
  unique (user_id, ref)
);
create table if not exists premium_wallets (
  user_id text primary key,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists premium_ledger_user_seq_idx on premium_ledger (user_id, seq desc);

create table if not exists player_inventory (
  user_id text not null,
  item_id text not null,
  level integer not null default 1 check (level > 0),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists player_inventory_equipped_idx on player_inventory (user_id, equipped);

create table if not exists game_results (
  table_id text not null,
  hand_number integer not null,
  user_id text not null,
  nick text not null,
  won boolean not null,
  payout integer not null default 0,
  recorded_at timestamptz not null default now(),
  primary key (table_id, hand_number, user_id)
);
create index if not exists game_results_user_idx on game_results (user_id, recorded_at desc);

create table if not exists ad_reward_events (
  id text primary key,
  user_id text not null,
  provider text not null,
  provider_transaction text not null unique,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);
create table if not exists ad_reward_tickets (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists store_receipts (
  id text primary key,
  user_id text not null,
  store text not null,
  product_id text not null,
  purchase_token_hash text not null unique,
  verified_at timestamptz not null default now()
);
