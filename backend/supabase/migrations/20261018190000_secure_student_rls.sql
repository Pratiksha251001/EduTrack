-- Secure role-aware access to student records.
-- This migration replaces the obsolete public-access policy with authenticated,
-- department-scoped policies for administrators, HODs, class coordinators, and students.

alter table public.students enable row level security;

grant select, insert, update, delete on table public.students to authenticated;

create or replace function public.current_user_has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.current_user_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id
  from public.user_roles
  where user_id = auth.uid()
    and role in ('admin', 'hod', 'class_coordinator')
  order by case role
    when 'admin' then 1
    when 'hod' then 2
    when 'class_coordinator' then 3
    else 4
  end
  limit 1;
$$;

revoke all on function public.current_user_has_role(text[]) from public;
revoke all on function public.current_user_department_id() from public;
grant execute on function public.current_user_has_role(text[]) to authenticated;
grant execute on function public.current_user_department_id() to authenticated;

drop policy if exists "Public access students" on public.students;
drop policy if exists "students_select_by_role" on public.students;
drop policy if exists "students_insert_by_role" on public.students;
drop policy if exists "students_update_by_role" on public.students;
drop policy if exists "students_delete_by_role" on public.students;

create policy "students_select_by_role"
on public.students
for select
to authenticated
using (
  public.current_user_has_role(array['admin'])
  or (
    public.current_user_has_role(array['hod', 'class_coordinator'])
    and department_id = public.current_user_department_id()
  )
  or user_id = auth.uid()
);

create policy "students_insert_by_role"
on public.students
for insert
to authenticated
with check (
  public.current_user_has_role(array['admin'])
  or (
    public.current_user_has_role(array['hod', 'class_coordinator'])
    and department_id = public.current_user_department_id()
  )
);

create policy "students_update_by_role"
on public.students
for update
to authenticated
using (
  public.current_user_has_role(array['admin'])
  or (
    public.current_user_has_role(array['hod', 'class_coordinator'])
    and department_id = public.current_user_department_id()
  )
)
with check (
  public.current_user_has_role(array['admin'])
  or (
    public.current_user_has_role(array['hod', 'class_coordinator'])
    and department_id = public.current_user_department_id()
  )
);

create policy "students_delete_by_role"
on public.students
for delete
to authenticated
using (
  public.current_user_has_role(array['admin'])
  or (
    public.current_user_has_role(array['hod', 'class_coordinator'])
    and department_id = public.current_user_department_id()
  )
);
