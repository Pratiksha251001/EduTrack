-- Bring legacy EduTrack schemas up to the columns required by current auth and attendance flows.
-- Nullable academic mapping fields intentionally avoid inventing production data.
begin;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.academic_classes
  add column if not exists year integer check (year between 1 and 4);

alter table public.teacher_subjects
  add column if not exists class_id uuid
  references public.academic_classes(id) on delete set null;

alter table public.students
  add column if not exists year integer check (year between 1 and 4);

commit;
