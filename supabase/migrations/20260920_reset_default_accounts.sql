-- Reset demo/institutional seed data and create one canonical account per portal role.
-- Run only when the institution intends to remove the current non-admin roster.

create extension if not exists pgcrypto;

-- Preserve the existing admin account; remove the rest of the current roster.
delete from public.attendance;
delete from public.sms_logs;
delete from public.teacher_subjects;
delete from public.class_coordinator_assignments;
delete from public.academic_classes;
delete from public.subjects;
delete from public.students;
delete from public.teachers;
delete from public.notices;
delete from public.departments;

delete from public.user_roles where role <> 'admin';

alter table public.teachers add column if not exists designation text;
alter table public.teachers add column if not exists qualification text;
alter table public.students add column if not exists year integer;
alter table public.students add column if not exists class_name text;

-- Remove old demo Auth accounts so their emails cannot shadow the canonical accounts.
delete from auth.users
where lower(email) in (
  'hod.cse@edutrack.edu',
  'cc@edutrack.edu',
  'e.watson@edutrack.edu',
  's.jenkins@edutrack.edu',
  'teacher@edutrack.edu',
  'alex.h@student.edutrack.edu',
  'hod@gmail.com',
  'cc@gmail.com',
  'teacher@gmail.com',
  'student@gmail.com'
);

-- Fixed IDs make this seed repeatable and keep all foreign keys stable.
insert into public.departments (id, name, code, institution_name, status)
values (
  '10000000-0000-4000-8000-000000000001',
  'Computer Science & Engineering',
  'CSE',
  'EduTrack',
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  status = excluded.status;

-- These Auth users are intentionally provisioned here so all five portal logins work.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
)
values
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hod@gmail.com', crypt('hod@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Default HOD"}', now(), now(), '', ''),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cc@gmail.com', crypt('cc@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Default Class Coordinator"}', now(), now(), '', ''),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@gmail.com', crypt('teacher@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Default Teacher"}', now(), now(), '', ''),
  ('10000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@gmail.com', crypt('student@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Default Student"}', now(), now(), '', '')
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (id, full_name, must_change_password)
values
  ('10000000-0000-4000-8000-000000000010', 'Dr. Default HOD', true),
  ('10000000-0000-4000-8000-000000000011', 'Default Class Coordinator', true),
  ('10000000-0000-4000-8000-000000000012', 'Default Teacher', true),
  ('10000000-0000-4000-8000-000000000013', 'Default Student', true)
on conflict (id) do update set
  full_name = excluded.full_name,
  must_change_password = excluded.must_change_password;

insert into public.user_roles (user_id, role, department_id)
values
  ('10000000-0000-4000-8000-000000000010', 'hod', '10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000011', 'class_coordinator', '10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000012', 'teacher', '10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000013', 'student', '10000000-0000-4000-8000-000000000001')
on conflict (user_id, role) do update set department_id = excluded.department_id;

insert into public.teachers (
  id, employee_id, full_name, email, department_id, user_id,
  is_class_coordinator, role, status, designation, qualification
)
values
  ('10000000-0000-4000-8000-000000000020', 'DEFAULT-HOD', 'Dr. Default HOD', 'hod@gmail.com', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', false, 'hod', 'active', 'Head of Department', 'M.Tech'),
  ('10000000-0000-4000-8000-000000000021', 'DEFAULT-CC', 'Default Class Coordinator', 'cc@gmail.com', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000011', true, 'class_coordinator', 'active', 'Class Coordinator', 'M.Tech'),
  ('10000000-0000-4000-8000-000000000022', 'DEFAULT-TEACHER', 'Default Teacher', 'teacher@gmail.com', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000012', false, 'lecturer', 'active', 'Assistant Professor', 'M.Tech')
on conflict (id) do update set
  email = excluded.email,
  user_id = excluded.user_id,
  role = excluded.role,
  is_class_coordinator = excluded.is_class_coordinator,
  status = excluded.status;

update public.departments
set hod_id = '10000000-0000-4000-8000-000000000020'
where id = '10000000-0000-4000-8000-000000000001';

insert into public.students (
  id, roll_number, reg_number, full_name, department_id, year, semester,
  class_name, parent_name, parent_mobile, email, user_id, status
)
values (
  '10000000-0000-4000-8000-000000000030', 'DEFAULT-001', 'DEFAULT-001',
  'Default Student', '10000000-0000-4000-8000-000000000001', 1, 1,
  'FE CSE-A', 'Default Parent', '9999999999', 'student@gmail.com',
  '10000000-0000-4000-8000-000000000013', 'active'
)
on conflict (id) do update set
  email = excluded.email,
  user_id = excluded.user_id,
  status = excluded.status;
