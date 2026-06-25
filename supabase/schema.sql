-- Supabase schema for dog-sns-prototype
-- Apply manually from the Supabase SQL editor after reviewing.
-- GitHub main is the source of truth for this schema.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('final-images', 'final-images', true, 10485760, array['image/jpeg']),
  ('store-assets', 'store-assets', true, 10485760, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_code text not null unique,
  store_name text not null,
  display_name text not null,
  login_code text not null unique,
  pin_hash text not null,
  logo_url text,
  frame_url text,
  theme_color text,
  print_template_type text not null default 'default',
  timezone text not null default 'Asia/Tokyo',
  sns_display_name text,
  instagram_account text,
  default_hashtags text,
  address text,
  phone text,
  business_hours_note text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_store_code_not_blank check (length(trim(store_code)) > 0),
  constraint stores_login_code_not_blank check (length(trim(login_code)) > 0),
  constraint stores_theme_color_format check (
    theme_color is null or theme_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create trigger stores_set_updated_at
before update on public.stores
for each row
execute function public.set_updated_at();

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  staff_code text not null,
  display_name text not null,
  role_label text,
  can_approve_sns boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_members_staff_code_not_blank check (length(trim(staff_code)) > 0),
  constraint staff_members_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint staff_members_store_staff_code_unique unique (store_id, staff_code)
);

create index if not exists staff_members_store_id_sort_order_idx
on public.staff_members (store_id, is_active, sort_order, display_name);

create trigger staff_members_set_updated_at
before update on public.staff_members
for each row
execute function public.set_updated_at();

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  display_name text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint admin_users_role_allowed check (role in ('owner', 'admin', 'viewer'))
);

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  manage_code text not null unique,
  store_id uuid not null references public.stores(id) on delete restrict,
  store_code text not null,
  store_display_name text not null,
  staff_id uuid references public.staff_members(id) on delete set null,
  staff_display_name text,
  captured_at timestamptz not null default now(),
  captured_date date not null,
  sequence_number integer not null,
  sns_consent boolean not null default true,
  mosaic_required boolean not null default false,
  final_processed_url text not null,
  final_storage_bucket text not null default 'final-images',
  final_storage_path text not null,
  frame_url_snapshot text,
  logo_url_snapshot text,
  theme_color_snapshot text,
  print_template_type_snapshot text,
  printed_at timestamptz,
  consent_confirmed_at timestamptz,
  status text not null default 'ready',
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_sequence_number_positive check (sequence_number > 0),
  constraint assets_final_processed_url_not_blank check (length(trim(final_processed_url)) > 0),
  constraint assets_final_storage_path_not_blank check (length(trim(final_storage_path)) > 0),
  constraint assets_status_allowed check (status in ('ready', 'archived')),
  constraint assets_store_date_sequence_unique unique (store_id, captured_date, sequence_number),
  constraint assets_theme_color_snapshot_format check (
    theme_color_snapshot is null or theme_color_snapshot ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create index if not exists assets_store_captured_date_idx
on public.assets (store_id, captured_date desc, sequence_number desc);

create index if not exists assets_status_created_at_idx
on public.assets (status, created_at desc);

create trigger assets_set_updated_at
before update on public.assets
for each row
execute function public.set_updated_at();

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

create trigger store_frames_set_updated_at
before update on public.store_frames
for each row
execute function public.set_updated_at();

alter table public.stores enable row level security;
alter table public.staff_members enable row level security;
alter table public.admin_users enable row level security;
alter table public.assets enable row level security;
alter table public.store_frames enable row level security;

-- The application reads and writes through server-side API routes using the service role key.
-- Browser clients still remain blocked by RLS unless narrow policies are added later.
grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.stores,
  public.staff_members,
  public.admin_users,
  public.assets,
  public.store_frames
  to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;

-- RLS policies are intentionally not opened here.
-- Add narrow policies when the store login/API flow and admin authentication flow are implemented.
