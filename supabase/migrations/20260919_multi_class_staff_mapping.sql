-- Migration: 20260919_multi_class_staff_mapping.sql
-- Enables mapping a single Teacher or Class Coordinator to multiple combinations
-- of Year, Semester, Class, and Subject concurrently.

-- 1. Upgrade class_coordinator_assignments table
alter table public.class_coordinator_assignments
  add column if not exists year integer check (year between 1 and 4),
  add column if not exists class_id uuid references public.academic_classes(id) on delete set null,
  add column if not exists class_name text;

-- Drop obsolete single-semester unique constraint if exists
alter table public.class_coordinator_assignments
  drop constraint if exists class_coordinator_assignments_teacher_id_department_id_semester_key;

-- Add updated multi-class concurrent constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cca_teacher_dept_sem_class_unique'
  ) then
    alter table public.class_coordinator_assignments
      add constraint cca_teacher_dept_sem_class_unique
      unique nulls not distinct (teacher_id, department_id, semester, class_name);
  end if;
end $$;

-- 2. Upgrade teacher_subjects table
alter table public.teacher_subjects
  add column if not exists class_id uuid references public.academic_classes(id) on delete set null,
  add column if not exists class_name text,
  add column if not exists year integer check (year between 1 and 4),
  add column if not exists semester integer check (semester between 1 and 8);

-- Ensure academic_classes coordinator reference
alter table public.academic_classes
  add column if not exists coordinator_teacher_id uuid references public.teachers(id) on delete set null;
