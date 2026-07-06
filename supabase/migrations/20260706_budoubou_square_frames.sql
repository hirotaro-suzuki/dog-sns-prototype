-- Register square Budoubou frames for Honten and Karuizawa.
-- Apply after 20260706_square_frame_coordinates.sql.
-- Existing active frames for matched stores are stopped so the iPad flow uses the square frames first.

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

delete from public.store_frames
where frame_url in (
  '/store-frames/budoubou-honten-classic-camel.svg',
  '/store-frames/budoubou-honten-noir-gold.svg',
  '/store-frames/budoubou-karuizawa-ivory-wine.svg',
  '/store-frames/budoubou-karuizawa-charcoal-gold.svg',
  '/store-frames/budoubou-karuizawa-forest-gold.svg'
);

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
    '葡萄房 本店 クラシック' as frame_name,
    '/store-frames/budoubou-honten-classic-camel.svg' as frame_url,
    true as is_default,
    10 as sort_order,
    900 as date_x,
    90 as date_y,
    '#2a2118' as date_color
  from honten_stores
  union all
  select
    id,
    '葡萄房 本店 ノワール',
    '/store-frames/budoubou-honten-noir-gold.svg',
    false,
    20,
    900,
    90,
    '#f0d889'
  from honten_stores
  union all
  select
    id,
    '葡萄房 軽井沢 アイボリー',
    '/store-frames/budoubou-karuizawa-ivory-wine.svg',
    true,
    10,
    900,
    90,
    '#7d2d3f'
  from karuizawa_stores
  union all
  select
    id,
    '葡萄房 軽井沢 墨金',
    '/store-frames/budoubou-karuizawa-charcoal-gold.svg',
    false,
    20,
    900,
    90,
    '#f0d889'
  from karuizawa_stores
  union all
  select
    id,
    '葡萄房 軽井沢 フォレスト',
    '/store-frames/budoubou-karuizawa-forest-gold.svg',
    false,
    30,
    900,
    90,
    '#f0d889'
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
  is_default,
  true,
  sort_order,
  true,
  date_x,
  date_y,
  34,
  date_color
from frame_rows;

-- SQL Editor confirmation: these counts should show 2 frames for each matched Honten store
-- and 3 frames for each matched Karuizawa store. If no rows appear, store_code/store_name/display_name
-- does not match the selectors above and the store mapping must be adjusted.
with matched_stores as (
  select
    id,
    store_code,
    coalesce(display_name, store_name) as store_label,
    case
      when store_code in ('DEMO_TOKYO', 'TOKYO', 'HONTEN', 'BUDOU_BOOK_HONTEN', 'BUDOUBOU_HONTEN')
        or store_name ilike '%本店%'
        or display_name ilike '%本店%'
      then 'honten'
      when store_code in ('DEMO_KARUIZAWA', 'KARUIZAWA', 'BUDOU_BOOK_KARUIZAWA', 'BUDOUBOU_KARUIZAWA')
        or store_name ilike '%軽井沢%'
        or display_name ilike '%軽井沢%'
      then 'karuizawa'
    end as store_kind
  from public.stores
  where
    store_code in (
      'DEMO_TOKYO', 'TOKYO', 'HONTEN', 'BUDOU_BOOK_HONTEN', 'BUDOUBOU_HONTEN',
      'DEMO_KARUIZAWA', 'KARUIZAWA', 'BUDOU_BOOK_KARUIZAWA', 'BUDOUBOU_KARUIZAWA'
    )
    or store_name ilike '%本店%'
    or display_name ilike '%本店%'
    or store_name ilike '%軽井沢%'
    or display_name ilike '%軽井沢%'
)
select
  ms.store_kind,
  ms.store_code,
  ms.store_label,
  count(sf.id) as active_budoubou_square_frame_count,
  string_agg(sf.frame_name, ', ' order by sf.sort_order) as active_budoubou_square_frames
from matched_stores ms
left join public.store_frames sf
  on sf.store_id = ms.id
  and sf.is_active = true
  and sf.frame_url in (
    '/store-frames/budoubou-honten-classic-camel.svg',
    '/store-frames/budoubou-honten-noir-gold.svg',
    '/store-frames/budoubou-karuizawa-ivory-wine.svg',
    '/store-frames/budoubou-karuizawa-charcoal-gold.svg',
    '/store-frames/budoubou-karuizawa-forest-gold.svg'
  )
group by ms.store_kind, ms.store_code, ms.store_label
order by ms.store_kind, ms.store_code;
