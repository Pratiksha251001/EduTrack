-- EduTrack role-aware RLS hardening.
-- Validated in the isolated EduTrack-Integration-Test Supabase project.
begin;

alter table public.students add column if not exists class_name text;

alter table public.departments enable row level security;
alter table public.teachers enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.academic_classes enable row level security;
alter table public.class_coordinator_assignments enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.attendance enable row level security;
alter table public.notices enable row level security;

revoke all privileges on table public.academic_classes, public.attendance,
  public.class_coordinator_assignments, public.departments, public.notices,
  public.profiles, public.subjects, public.teacher_subjects, public.teachers,
  public.user_roles from anon;

create or replace function public.can_manage_attendance(
  requested_student uuid, requested_subject uuid
) returns boolean language sql stable security definer
set search_path = pg_catalog as $$
  select exists (
    select 1 from public.students s
    join public.subjects subject on subject.id = requested_subject
      and subject.department_id = s.department_id
    join public.teacher_subjects assignment on assignment.subject_id = subject.id
    join public.teachers teacher on teacher.id = assignment.teacher_id
      and teacher.department_id = s.department_id
    join public.academic_classes class on class.id = assignment.class_id
      and class.department_id = s.department_id
    where s.id = requested_student and teacher.user_id = auth.uid()
      and teacher.status = 'active' and s.status = 'active'
      and class.status = 'active' and class.year = s.year
      and class.semester = s.semester and subject.semester = s.semester
      and class.name = nullif(to_jsonb(s)->>'class_name', '')
      and exists (select 1 from public.user_roles r
        where r.user_id = auth.uid() and r.department_id = s.department_id
          and r.role in ('teacher','hod','class_coordinator'))
  );
$$;
revoke all on function public.can_manage_attendance(uuid,uuid) from public,anon;
grant execute on function public.can_manage_attendance(uuid,uuid) to authenticated;

-- Remove legacy and replacement policies idempotently.
do $$ declare p record; begin
  for p in select schemaname,tablename,policyname from pg_policies
    where schemaname='public' and tablename in
      ('academic_classes','attendance','class_coordinator_assignments','departments',
       'notices','profiles','subjects','teacher_subjects','teachers','user_roles')
  loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;

-- Direct client role writes are forbidden; privileged backend provisioning is used.
revoke insert,update,delete on public.user_roles from authenticated;
create policy user_roles_read_own on public.user_roles for select to authenticated
  using (user_id=auth.uid());
create policy user_roles_admin_read on public.user_roles for select to authenticated
  using (public.current_user_has_role(array['admin']));

revoke update on public.profiles from public,anon,authenticated;
do $$ declare cols text; begin
  select string_agg(format('%I',attname),', ') into cols from pg_attribute
   where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped;
  execute format('revoke update (%s) on public.profiles from public,anon,authenticated',cols);
end $$;
grant update(full_name,avatar_url,mobile) on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_admin_read on public.profiles for select to authenticated
  using(public.current_user_has_role(array['admin']));
create policy profiles_update_own on public.profiles for update to authenticated
  using(id=auth.uid()) with check(id=auth.uid());

create policy departments_authenticated_read on public.departments for select to authenticated using(true);
create policy departments_admin_manage on public.departments for all to authenticated
  using(public.current_user_has_role(array['admin']))
  with check(public.current_user_has_role(array['admin']));

create policy teachers_read_by_role on public.teachers for select to authenticated using(
  public.current_user_has_role(array['admin']) or user_id=auth.uid() or
  (public.current_user_has_role(array['hod','class_coordinator'])
   and department_id=public.current_user_department_id()));
create policy teachers_manage_by_role on public.teachers for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()));

create policy classes_authenticated_read on public.academic_classes for select to authenticated using(true);
create policy classes_manage_by_role on public.academic_classes for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()));

create policy coordinator_assignments_read on public.class_coordinator_assignments for select to authenticated using(true);
create policy coordinator_assignments_manage on public.class_coordinator_assignments for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()));

create policy subjects_authenticated_read on public.subjects for select to authenticated using(true);
create policy subjects_manage_by_role on public.subjects for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()));

create policy teacher_subjects_read_by_role on public.teacher_subjects for select to authenticated using(
  public.current_user_has_role(array['admin']) or exists(select 1 from public.teachers t
   where t.id=teacher_subjects.teacher_id and (t.user_id=auth.uid() or
    (public.current_user_has_role(array['hod','class_coordinator']) and t.department_id=public.current_user_department_id()))));
create policy teacher_subjects_insert_by_role on public.teacher_subjects for insert to authenticated with check(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(
    select 1 from public.teachers t join public.subjects s on s.id=teacher_subjects.subject_id
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id()
      and s.department_id=public.current_user_department_id()) and
   (teacher_subjects.class_id is null or exists(select 1 from public.academic_classes c
     where c.id=teacher_subjects.class_id and c.department_id=public.current_user_department_id()))));
create policy teacher_subjects_update_by_role on public.teacher_subjects for update to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(select 1 from public.teachers t
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id())))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(
    select 1 from public.teachers t join public.subjects s on s.id=teacher_subjects.subject_id
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id()
      and s.department_id=public.current_user_department_id()) and
   (teacher_subjects.class_id is null or exists(select 1 from public.academic_classes c
     where c.id=teacher_subjects.class_id and c.department_id=public.current_user_department_id()))));
create policy teacher_subjects_delete_by_role on public.teacher_subjects for delete to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(select 1 from public.teachers t
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id())));

create policy attendance_admin_manage on public.attendance for all to authenticated
 using(public.current_user_has_role(array['admin'])) with check(public.current_user_has_role(array['admin']));
create policy attendance_student_read on public.attendance for select to authenticated using(
  exists(select 1 from public.students s where s.id=attendance.student_id and s.user_id=auth.uid()));
create policy attendance_assigned_teacher_read on public.attendance for select to authenticated
  using(public.can_manage_attendance(student_id,subject_id));
create policy attendance_assigned_teacher_insert on public.attendance for insert to authenticated
  with check(public.can_manage_attendance(student_id,subject_id));
create policy attendance_assigned_teacher_update on public.attendance for update to authenticated
  using(public.can_manage_attendance(student_id,subject_id))
  with check(public.can_manage_attendance(student_id,subject_id));

create policy notices_published_read on public.notices for select to authenticated using(status='published');
create policy notices_admin_manage on public.notices for all to authenticated
 using(public.current_user_has_role(array['admin'])) with check(public.current_user_has_role(array['admin']));

commit;
