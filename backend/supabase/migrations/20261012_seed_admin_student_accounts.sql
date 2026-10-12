-- Seed the bootstrap Admin and Student accounts for a fresh deployment.
-- Safe to run more than once; existing Auth users are reused by email.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

do $$
declare
  admin_id uuid;
  student_id uuid;
  department_id uuid;
  student_record_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = 'admin@edutrack.com'
  limit 1;

  if admin_id is null then
    admin_id := '10000000-0000-0000-0000-000000000040';
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    )
    values (
      admin_id,
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
    );
  else
    update auth.users
    set encrypted_password = crypt('Admin@1234', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = '{"full_name":"System Administrator"}',
        updated_at = now()
    where id = admin_id;
  end if;

  select id into student_id
  from auth.users
  where lower(email) = 'student@gmail.com'
  limit 1;

  if student_id is null then
    student_id := '10000000-0000-0000-0000-000000000013';
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    )
    values (
      student_id,
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
    );
  else
    update auth.users
    set encrypted_password = crypt('student@123', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = '{"full_name":"Default Student"}',
        updated_at = now()
    where id = student_id;
  end if;

  insert into public.profiles (id, full_name, must_change_password)
  values (admin_id, 'System Administrator', false)
  on conflict (id) do update set
    full_name = excluded.full_name,
    must_change_password = excluded.must_change_password;

  insert into public.profiles (id, full_name, must_change_password)
  values (student_id, 'Default Student', true)
  on conflict (id) do update set
    full_name = excluded.full_name,
    must_change_password = excluded.must_change_password;

  if not exists (
    select 1 from public.user_roles where role = 'admin'
  ) then
    insert into public.user_roles (user_id, role, department_id)
    values (admin_id, 'admin', null);
  end if;

  select id into department_id
  from public.departments
  order by created_at
  limit 1;

  insert into public.user_roles (user_id, role, department_id)
  values (student_id, 'student', department_id)
  on conflict (user_id, role) do update set
    department_id = excluded.department_id;

  select id into student_record_id
  from public.students
  where lower(email) = 'student@gmail.com'
     or roll_number = 'DEFAULT-001'
  limit 1;

  if student_record_id is null then
    insert into public.students (
      id, roll_number, reg_number, full_name, department_id, year, semester,
      class_name, parent_name, parent_mobile, email, user_id, status
    )
    values (
      '10000000-0000-0000-0000-000000000030',
      'DEFAULT-001',
      'DEFAULT-001',
      'Default Student',
      department_id,
      1,
      1,
      'FE CSE-A',
      'Default Parent',
      '9999999999',
      'student@gmail.com',
      student_id,
      'active'
    );
  else
    update public.students
    set full_name = 'Default Student',
        email = 'student@gmail.com',
        user_id = student_id,
        status = 'active'
    where id = student_record_id;
  end if;
end
$$;
