-- Forge V2 cloud drafts
-- Additive only: does not alter purchased/generated designs.

create table if not exists public.design_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Diseño sin nombre',
  product_slug text not null,
  engine_version text not null default 'mesh-v2',
  schema_version integer not null default 2,
  product_version text not null default '1.0.0-beta.1',
  params jsonb not null default '{}'::jsonb,
  operations jsonb not null default '[]'::jsonb,
  text_ops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_drafts_schema_version_check check (schema_version >= 2),
  constraint design_drafts_params_object check (jsonb_typeof(params) = 'object'),
  constraint design_drafts_operations_array check (jsonb_typeof(operations) = 'array'),
  constraint design_drafts_text_ops_array check (jsonb_typeof(text_ops) = 'array'),
  constraint design_drafts_name_length check (char_length(name) between 1 and 100)
);

create index if not exists design_drafts_user_updated_idx
  on public.design_drafts(user_id, updated_at desc);

alter table public.design_drafts enable row level security;

drop policy if exists "Users can read own design drafts" on public.design_drafts;
create policy "Users can read own design drafts"
  on public.design_drafts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own design drafts" on public.design_drafts;
create policy "Users can create own design drafts"
  on public.design_drafts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own design drafts" on public.design_drafts;
create policy "Users can update own design drafts"
  on public.design_drafts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own design drafts" on public.design_drafts;
create policy "Users can delete own design drafts"
  on public.design_drafts for delete
  to authenticated
  using (auth.uid() = user_id);
