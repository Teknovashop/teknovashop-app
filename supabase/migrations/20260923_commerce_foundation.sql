-- Teknovashop Forge commerce foundation
-- One-off purchases are design-specific; subscriptions are account-wide.

create extension if not exists pgcrypto;

create table if not exists public.designs (
  id text primary key,
  user_id uuid null references auth.users(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  product_version text not null,
  product_stage text not null,
  parameters jsonb not null default '{}'::jsonb,
  stl_path text not null unique,
  manifest_path text not null unique,
  sha256 text not null check (length(sha256) = 64),
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists designs_user_id_idx on public.designs(user_id);
create index if not exists designs_product_slug_idx on public.designs(product_slug);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('design', 'subscription')),
  plan text not null check (plan in ('oneoff', 'maker', 'commercial')),
  design_id text null references public.designs(id) on delete cascade,
  model_slug text null,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_checkout_session_id text null,
  terms_version text not null,
  license_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlement_scope_ck check (
    (kind = 'design' and design_id is not null and plan = 'oneoff')
    or
    (kind = 'subscription' and design_id is null and plan in ('maker', 'commercial'))
  )
);

create unique index if not exists entitlements_oneoff_user_design_uq
  on public.entitlements(user_id, design_id)
  where kind = 'design';

create unique index if not exists entitlements_subscription_id_uq
  on public.entitlements(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists entitlements_user_active_idx
  on public.entitlements(user_id, active);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  mode text not null check (mode in ('payment', 'subscription')),
  plan text not null check (plan in ('oneoff', 'maker', 'commercial')),
  design_id text null references public.designs(id) on delete set null,
  product_slug text null,
  amount_total integer null,
  currency text null,
  payment_status text null,
  terms_version text not null,
  license_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id text not null references public.designs(id) on delete cascade,
  entitlement_id uuid null references public.entitlements(id) on delete set null,
  downloaded_at timestamptz not null default now()
);

create index if not exists download_events_user_design_idx
  on public.download_events(user_id, design_id, downloaded_at desc);

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.designs enable row level security;
alter table public.entitlements enable row level security;
alter table public.orders enable row level security;
alter table public.download_events enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "users read own designs" on public.designs;
create policy "users read own designs"
on public.designs for select
using (auth.uid() = user_id);

drop policy if exists "users read own entitlements" on public.entitlements;
create policy "users read own entitlements"
on public.entitlements for select
using (auth.uid() = user_id);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
on public.orders for select
using (auth.uid() = user_id);

drop policy if exists "users read own downloads" on public.download_events;
create policy "users read own downloads"
on public.download_events for select
using (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE policies are created intentionally.
-- Writes are performed only by trusted server routes using the service-role key.
