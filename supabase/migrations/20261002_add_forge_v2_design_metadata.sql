-- Teknovashop Forge V2 design metadata
-- Applied to Supabase on 2026-10-02.
alter table public.designs
  add column if not exists engine_version text not null default 'mesh-v1',
  add column if not exists schema_version integer not null default 1,
  add column if not exists operations jsonb not null default '[]'::jsonb;

alter table public.designs
  drop constraint if exists designs_schema_version_positive;

alter table public.designs
  add constraint designs_schema_version_positive
  check (schema_version >= 1);

alter table public.designs
  drop constraint if exists designs_operations_array;

alter table public.designs
  add constraint designs_operations_array
  check (jsonb_typeof(operations) = 'array');

create index if not exists designs_engine_version_idx
  on public.designs(engine_version);
