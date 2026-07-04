-- Add lightweight store frame management and SNS post draft storage.
-- Apply this once to the existing Supabase project from the SQL editor.

create table if not exists public.store_frames (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  frame_name text not null,
  frame_url text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_frames_frame_name_not_blank check (length(trim(frame_name)) > 0),
  constraint store_frames_frame_url_not_blank check (length(trim(frame_url)) > 0),
  constraint store_frames_date_range_valid check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists store_frames_store_id_active_idx
on public.store_frames (store_id, is_active, is_default desc, sort_order, frame_name);

create unique index if not exists store_frames_one_default_per_store_idx
on public.store_frames (store_id)
where is_default = true and is_active = true;

drop trigger if exists store_frames_set_updated_at on public.store_frames;
create trigger store_frames_set_updated_at
before update on public.store_frames
for each row
execute function public.set_updated_at();

create table if not exists public.sns_post_drafts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  status text not null default 'draft',
  post_caption text,
  hashtags text,
  planned_post_date date,
  manus_note text,
  posted_url text,
  posted_at timestamptz,
  is_final_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sns_post_drafts_status_allowed check (status in ('draft', 'ready', 'posted', 'hold', 'archived')),
  constraint sns_post_drafts_asset_unique unique (asset_id)
);

create index if not exists sns_post_drafts_status_updated_at_idx
on public.sns_post_drafts (status, updated_at desc);

create index if not exists sns_post_drafts_store_status_idx
on public.sns_post_drafts (store_id, status, planned_post_date desc nulls last);

drop trigger if exists sns_post_drafts_set_updated_at on public.sns_post_drafts;
create trigger sns_post_drafts_set_updated_at
before update on public.sns_post_drafts
for each row
execute function public.set_updated_at();

alter table public.store_frames enable row level security;
alter table public.sns_post_drafts enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.stores,
  public.staff_members,
  public.admin_users,
  public.assets,
  public.store_frames,
  public.sns_post_drafts
  to service_role;

comment on table public.store_frames is 'Lightweight per-store photo frames. Keep active frames to 2 or 3 for low-spec iPads.';
comment on table public.sns_post_drafts is 'Headquarters-maintained SNS post material prepared from saved finished images for Manus handoff.';
