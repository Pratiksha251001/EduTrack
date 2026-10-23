-- Review and test before applying. Disabled-by-default backend endpoint.
create table if not exists public.parent_notification_attempts (
 student_id uuid not null references public.students(id) on delete cascade,
 kind text not null check(kind in ('daily_attendance','low_attendance')),
 notice_date date not null,
 recipient_email text not null,
 status text not null check(status in ('claimed','provider_accepted','provider_rejected','unknown')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 primary key(student_id,kind,notice_date)
);
alter table public.parent_notification_attempts enable row level security;
revoke all on public.parent_notification_attempts from anon,authenticated;
create or replace function public.claim_parent_notification(p_student_id uuid,p_kind text,p_date date,p_recipient text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_email text;v_verified timestamptz;
begin
 if p_kind not in ('daily_attendance','low_attendance') or p_date is null then return false;end if;
 select parent_email,parent_email_verified_at into v_email,v_verified from public.students where id=p_student_id for update;
 if v_verified is null or lower(btrim(v_email))<>lower(btrim(p_recipient)) then return false;end if;
 insert into public.parent_notification_attempts(student_id,kind,notice_date,recipient_email,status)
 values(p_student_id,p_kind,p_date,p_recipient,'claimed') on conflict do nothing;
 return found;
end;$$;
create or replace function public.complete_parent_notification(p_student_id uuid,p_kind text,p_date date,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('provider_accepted','provider_rejected','unknown') then return false;end if;
 update public.parent_notification_attempts set status=p_status,completed_at=now()
 where student_id=p_student_id and kind=p_kind and notice_date=p_date and status='claimed';
 return found;
end;$$;
revoke all on function public.claim_parent_notification(uuid,text,date,text) from public,anon,authenticated;
revoke all on function public.complete_parent_notification(uuid,text,date,text) from public,anon,authenticated;
grant execute on function public.claim_parent_notification(uuid,text,date,text) to service_role;
grant execute on function public.complete_parent_notification(uuid,text,date,text) to service_role;
