-- Migration for the current asset-saving design.
-- Apply this once to an existing Supabase project that already used the older schema.
-- Review before running in the Supabase SQL editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('final-images', 'final-images', true, 10485760, array['image/jpeg']),
  ('store-assets', 'store-assets', true, 10485760, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.assets
  add column if not exists captured_at timestamptz not null default now(),
  add column if not exists final_storage_bucket text not null default 'final-images',
  add column if not exists final_storage_path text,
  add column if not exists saved_at timestamptz not null default now();

update public.assets
set final_storage_path = coalesce(
  final_storage_path,
  concat(store_code, '/', captured_date::text, '/', manage_code, '.jpg')
)
where final_storage_path is null;

alter table public.assets
  alter column final_storage_path set not null;

alter table public.assets
  drop constraint if exists assets_dog_name_not_blank,
  drop constraint if exists assets_final_storage_path_not_blank;

alter table public.assets
  add constraint assets_final_storage_path_not_blank
  check (length(trim(final_storage_path)) > 0);

alter table public.assets
  alter column dog_name drop not null;

-- Dog information is no longer part of the current save design.
-- Keep old nullable columns temporarily if they already exist, so old rows and older code do not break.
comment on column public.assets.dog_name is 'Deprecated. Dog information is now burned into the final image as free text.';
comment on column public.assets.dog_breed is 'Deprecated. Dog information is now burned into the final image as free text.';
comment on column public.assets.dog_age is 'Deprecated. Dog information is now burned into the final image as free text.';
