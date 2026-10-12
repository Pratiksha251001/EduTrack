-- Seed the bootstrap Admin and Student accounts for a fresh deployment.
-- Safe to run more than once; existing accounts are updated by email.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
values
  (
    '10000000-0000-4000-8000-000000000040',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@edutrack.com',
    crypt('Admin@1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"System Administrator"}',
    now(),
    now(),
    '',
    ''
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student@gmail.com',
    crypt('student@123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Default Student"}',
    now(),
    now(),
    '',
    ''
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (id, full_name, must_change_password)
values
  (
    '10000000-0000-4000-8000-000000000040',
    'System Administrator',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    'Default Student',
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  must_change_password = excluded.must_change_password;

insert into public.user_roles (user_id, role, department_id)
select
  '10000000-0000-4000-8000-000000000040',
  'admin',
  null
where not exists (
  select 1
  from public.user_roles
  where role = 'admin'
);

insert into public.user_roles (user_id, role, department_id)
values (
  '10000000-0000-4000-8000-000000000013',
  'student',
  '10000000-0000-4000-8000-000000000001'
)
on conflict (user_id, role) do update set
  department_id = excluded.department_id;

insert into public.students (
  id,
  roll_number,
  reg_number,
  full_name,
  department_id,
  year,
  semester,
  class_name,
  parent_name,
  parent_mobile,
  email,
  user_id,
  status
)
values (
  '10000000-0000-4000-8000-000000000030',
  'DEFAULT-001',
  'DEFAULT-001',
  'Default Student',
  '10000000-0000-4000-8000-000000000001',
  1,
  1,
  'FE CSE-A',
  'Default Parent',
  '9999999999',
  'student@gmail.com',
  '10000000-0000-4000-8000-000000000013',
  'active'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  user_id = excluded.user_id,
  status = excluded.status;
