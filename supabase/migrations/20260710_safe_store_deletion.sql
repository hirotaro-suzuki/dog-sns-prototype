-- Delete staff and frame rows atomically with an eligible store.
-- assets.store_id intentionally remains ON DELETE RESTRICT so a store with photos
-- can never be deleted, including when a photo is inserted concurrently.

alter table public.staff_members
  drop constraint if exists staff_members_store_id_fkey,
  add constraint staff_members_store_id_fkey
    foreign key (store_id) references public.stores(id) on delete cascade;

alter table public.store_frames
  drop constraint if exists store_frames_store_id_fkey,
  add constraint store_frames_store_id_fkey
    foreign key (store_id) references public.stores(id) on delete cascade;
