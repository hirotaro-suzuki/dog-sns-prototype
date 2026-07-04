-- Add printable date placement settings to each store frame.
-- This was applied manually first in production from the Supabase SQL editor.

alter table public.store_frames
  add column if not exists date_enabled boolean not null default true,
  add column if not exists date_x integer not null default 1030,
  add column if not exists date_y integer not null default 82,
  add column if not exists date_font_size integer not null default 38,
  add column if not exists date_color text not null default '#ffffff';

do $$
begin
  alter table public.store_frames
    add constraint store_frames_date_x_range check (date_x between 0 and 1270) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.store_frames
    add constraint store_frames_date_y_range check (date_y between 0 and 890) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.store_frames
    add constraint store_frames_date_font_size_range check (date_font_size between 12 and 96) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.store_frames
    add constraint store_frames_date_color_format check (date_color ~ '^#[0-9A-Fa-f]{6}$') not valid;
exception when duplicate_object then null;
end $$;

alter table public.store_frames validate constraint store_frames_date_x_range;
alter table public.store_frames validate constraint store_frames_date_y_range;
alter table public.store_frames validate constraint store_frames_date_font_size_range;
alter table public.store_frames validate constraint store_frames_date_color_format;

update public.store_frames
set
  date_enabled = true,
  date_x = case
    when frame_name like '%ピンク%' then 1035
    when frame_name like '%ゴールド%' then 635
    else 1030
  end,
  date_y = case
    when frame_name like '%ゴールド%' then 818
    else 82
  end,
  date_font_size = case
    when frame_name like '%ゴールド%' then 32
    else 38
  end,
  date_color = case
    when frame_name like '%ゴールド%' then '#fff4d2'
    else '#ffffff'
  end
where frame_url like '%/test-assets/frame-%';
