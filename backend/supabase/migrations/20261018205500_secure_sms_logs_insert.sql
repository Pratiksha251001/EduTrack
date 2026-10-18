-- Permit authorized authenticated EduTrack staff to record communication logs.
-- Depends on current_user_has_role(text[]) from 20261018190000_secure_student_rls.sql.

alter table public.sms_logs enable row level security;

grant select, insert on table public.sms_logs to authenticated;

drop policy if exists "sms_logs_insert_by_role" on public.sms_logs;

create policy "sms_logs_insert_by_role"
on public.sms_logs
for insert
to authenticated
with check (
  public.current_user_has_role(
    array['admin', 'hod', 'class_coordinator']
  )
);

notify pgrst, 'reload schema';
