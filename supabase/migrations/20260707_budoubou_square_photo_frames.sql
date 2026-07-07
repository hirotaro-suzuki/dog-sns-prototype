-- Replace the Budoubou frame set with a real square-photo-window design.
-- The previous 5 frames (20260706_budoubou_square_frames.sql) shared one template with a
-- landscape-shaped photo window inside the square canvas. This migration deactivates them
-- (kept for history, not deleted) and registers one new square frame per store, using the
-- actual store logo composited into the frame image itself.
-- Apply after 20260706_budoubou_square_frames.sql / 20260706_square_frame_coordinates.sql.

with honten_stores as (
  select id
  from public.stores
  where
    store_code in ('DEMO_TOKYO', 'TOKYO', 'HONTEN', 'BUDOU_BOOK_HONTEN', 'BUDOUBOU_HONTEN')
    or store_name ilike '%本店%'
    or display_name ilike '%本店%'
), karuizawa_stores as (
  select id
  from public.stores
  where
    store_code in ('DEMO_KARUIZAWA', 'KARUIZAWA', 'BUDOU_BOOK_KARUIZAWA', 'BUDOUBOU_KARUIZAWA')
    or store_name ilike '%軽井沢%'
    or display_name ilike '%軽井沢%'
), target_stores as (
  select id from honten_stores
  union
  select id from karuizawa_stores
)
update public.store_frames
set
  is_active = false,
  is_default = false,
  updated_at = now()
where store_id in (select id from target_stores);

with honten_stores as (
  select id
  from public.stores
  where
    store_code in ('DEMO_TOKYO', 'TOKYO', 'HONTEN', 'BUDOU_BOOK_HONTEN', 'BUDOUBOU_HONTEN')
    or store_name ilike '%本店%'
    or display_name ilike '%本店%'
), karuizawa_stores as (
  select id
  from public.stores
  where
    store_code in ('DEMO_KARUIZAWA', 'KARUIZAWA', 'BUDOU_BOOK_KARUIZAWA', 'BUDOUBOU_KARUIZAWA')
    or store_name ilike '%軽井沢%'
    or display_name ilike '%軽井沢%'
), frame_rows as (
  select
    id as store_id,
    '葡萄房 本店 正方形' as frame_name,
    '/store-frames/budoubou-honten-square.svg' as frame_url,
    860 as date_x,
    70 as date_y,
    '#ffffff' as date_color
  from honten_stores
  union all
  select
    id,
    '葡萄房 軽井沢 正方形',
    '/store-frames/budoubou-karuizawa-square.svg',
    860,
    70,
    '#ffffff'
  from karuizawa_stores
)
insert into public.store_frames (
  store_id,
  frame_name,
  frame_url,
  is_default,
  is_active,
  sort_order,
  date_enabled,
  date_x,
  date_y,
  date_font_size,
  date_color
)
select
  store_id,
  frame_name,
  frame_url,
  true,
  true,
  10,
  true,
  date_x,
  date_y,
  34,
  date_color
from frame_rows;

-- SQL Editor confirmation: each matched store should show exactly 1 active frame
-- (the new square one). If no rows appear, adjust the store_code/store_name/display_name
-- selectors above to match the actual store data.
with honten_stores as (
  select id
  from public.stores
  where
    store_code in ('DEMO_TOKYO', 'TOKYO', 'HONTEN', 'BUDOU_BOOK_HONTEN', 'BUDOUBOU_HONTEN')
    or store_name ilike '%本店%'
    or display_name ilike '%本店%'
), karuizawa_stores as (
  select id
  from public.stores
  where
    store_code in ('DEMO_KARUIZAWA', 'KARUIZAWA', 'BUDOU_BOOK_KARUIZAWA', 'BUDOUBOU_KARUIZAWA')
    or store_name ilike '%軽井沢%'
    or display_name ilike '%軽井沢%'
), matched_stores as (
  select id, store_code, coalesce(display_name, store_name) as store_label, 'honten' as store_kind from honten_stores
  join public.stores using (id)
  union all
  select id, store_code, coalesce(display_name, store_name) as store_label, 'karuizawa' as store_kind from karuizawa_stores
  join public.stores using (id)
)
select
  ms.store_kind,
  ms.store_code,
  ms.store_label,
  count(sf.id) filter (where sf.is_active) as active_frame_count,
  string_agg(sf.frame_name, ', ' order by sf.sort_order) filter (where sf.is_active) as active_frame_names
from matched_stores ms
left join public.store_frames sf on sf.store_id = ms.id
group by ms.store_kind, ms.store_code, ms.store_label
order by ms.store_kind, ms.store_code;
