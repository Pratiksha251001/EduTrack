-- Secure student account provisioning support.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create unique index if not exists students_email_unique
  on public.students (lower(email)) where email is not null;

-- Remove prototype-wide anonymous policies from sensitive account tables.
drop policy if exists "Public access profiles" on public.profiles;
drop policy if exists "Public access user_roles" on public.user_roles;
drop policy if exists "Public access students" on public.students;

-- Authenticated accounts can resolve and maintain their own identity.
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can read their own roles" on public.user_roles;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can read their own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Authenticated users can read student records" on public.students;
drop policy if exists "Admins can manage student records" on public.students;

drop policy if exists "Students can read their own record" on public.students;

create policy "Students can read their own record"
  on public.students for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage student records"
  on public.students for all to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  ))
  with check (exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  ));
