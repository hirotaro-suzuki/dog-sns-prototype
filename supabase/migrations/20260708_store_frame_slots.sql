-- Simplify store_frames to a hard 3-slot model: existence = active, position = order/default.
-- Deletes legacy inactive frame rows kept "for history" (no longer needed -- frames are baked
-- into final photos) and removes the is_active column plus its index/constraint dependencies.
-- Apply manually from the Supabase SQL editor.

delete from public.store_frames where is_active = false;

drop index if exists public.store_frames_one_default_per_store_idx;
drop index if exists public.store_frames_store_id_active_idx;

alter table public.store_frames drop column if exists is_active;

create index if not exists store_frames_store_id_sort_idx
on public.store_frames (store_id, is_default desc, sort_order, frame_name);

create unique index if not exists store_frames_one_default_per_store_idx
on public.store_frames (store_id)
where is_default = true;
