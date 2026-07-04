-- Add admin review fields for /admin photo tab.
-- Apply manually from the Supabase SQL editor after reviewing.

alter table public.assets
  add column if not exists short_caption text,
  add column if not exists review_status text not null default 'new';

alter table public.assets
  drop constraint if exists assets_short_caption_length,
  add constraint assets_short_caption_length check (
    short_caption is null or char_length(short_caption) <= 40
  );

alter table public.assets
  drop constraint if exists assets_review_status_allowed,
  add constraint assets_review_status_allowed check (
    review_status in ('new', 'candidate', 'hold', 'rejected')
  );

create index if not exists assets_review_status_captured_date_idx
on public.assets (review_status, captured_date desc, store_id);
