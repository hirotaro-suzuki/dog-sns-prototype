-- Move store frame date coordinate constraints to the square frame canvas.
-- Apply manually from the Supabase SQL editor before registering square frames.

alter table public.store_frames
  alter column date_x set default 900,
  alter column date_y set default 90;

alter table public.store_frames
  drop constraint if exists store_frames_date_x_range,
  drop constraint if exists store_frames_date_y_range;

alter table public.store_frames
  add constraint store_frames_date_x_range check (date_x between 0 and 1080) not valid,
  add constraint store_frames_date_y_range check (date_y between 0 and 1080) not valid;

alter table public.store_frames validate constraint store_frames_date_x_range;
alter table public.store_frames validate constraint store_frames_date_y_range;
