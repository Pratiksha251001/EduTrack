-- Apply only after the four parent-email migrations, before enabling verification.
create table if not exists public.parent_email_request_limits (
 student_id uuid not null references public.students(id) on delete cascade,
 window_started_at timestamptz not null default now(),
 attempts integer not null default 0 check (attempts >= 0),
 primary key(student_id)
);
alter table public.parent_email_request_limits enable row level security;
revoke all on public.parent_email_request_limits from public,anon,authenticated;
create or replace function public.reserve_parent_email_verification_request(p_student_id uuid,p_actor_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
 if p_student_id is null or p_actor_id is null then return false; end if;
 -- Serialize requests per student even from different actors, avoiding race conditions.
 perform 1 from public.students where id=p_student_id for update;
 if not found then return false; end if;
 insert into public.parent_email_request_limits(student_id,window_started_at,attempts)
 values(p_student_id,now(),1)
 on conflict(student_id) do update set
 attempts=case when public.parent_email_request_limits.window_started_at <= now()-interval '10 minutes'
 then 1 else public.parent_email_request_limits.attempts+1 end,
 window_started_at=case when public.parent_email_request_limits.window_started_at <= now()-interval '10 minutes'
 then now() else public.parent_email_request_limits.window_started_at end
 returning attempts into v_attempts;
 return v_attempts <= 3;
end;$$;
revoke all on function public.reserve_parent_email_verification_request(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_parent_email_verification_request(uuid,text) to service_role;
