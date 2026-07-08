-- Staff no longer log in individually; role_label/can_approve_sns were round-tripped
-- through store-login and the admin staff UI but never actually read anywhere
-- downstream (SNS consent is always saved as true regardless of this flag).
-- Drop both columns now that the admin UI and API no longer write/read them.
-- Apply manually from the Supabase SQL editor.

alter table public.staff_members drop column if exists role_label;
alter table public.staff_members drop column if exists can_approve_sns;
