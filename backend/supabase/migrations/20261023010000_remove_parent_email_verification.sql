-- Authorized college staff approval replaces parent inbox verification.
alter table public.students add column if not exists parent_email_approved_at timestamptz;
alter table public.students add column if not exists parent_email_approved_by uuid references auth.users(id) on delete set null;

create or replace function public.set_parent_email_staff_approval() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; domain_name text;
begin
 if new.parent_email is null or btrim(new.parent_email)='' then new.parent_email:=null;new.parent_email_approved_at:=null;new.parent_email_approved_by:=null;return new;end if;
 new.parent_email:=lower(btrim(new.parent_email));
 if new.parent_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid parent email';end if;
 domain_name:=split_part(new.parent_email,'@',2);
 if domain_name=any(array['10minutemail.com','guerrillamail.com','mailinator.com','tempmail.com','temp-mail.org','yopmail.com','sharklasers.com','trashmail.com']) then raise exception 'Disposable parent email domains are not allowed';end if;
 if tg_op='INSERT' or new.parent_email is distinct from old.parent_email then
  select role into actor_role from public.user_roles where user_id=actor order by case role when 'admin' then 1 when 'hod' then 2 when 'class_coordinator' then 3 else 9 end limit 1;
  if actor_role in ('admin','hod','class_coordinator') then new.parent_email_approved_at:=now();new.parent_email_approved_by:=actor;else new.parent_email_approved_at:=null;new.parent_email_approved_by:=null;end if;
 end if;return new;
end;$$;
drop trigger if exists set_parent_email_staff_approval on public.students;
create trigger set_parent_email_staff_approval before insert or update of parent_email on public.students for each row execute function public.set_parent_email_staff_approval();

update public.students set parent_email_approved_at=coalesce(parent_email_approved_at,now()),parent_email_approved_by=coalesce(parent_email_approved_by,(select user_id from public.user_roles where role='admin' limit 1)) where parent_email is not null;

create or replace function public.claim_parent_notification(p_student_id uuid,p_kind text,p_date date,p_recipient text) returns boolean language plpgsql security definer set search_path='' as $$
declare stored_email text;approved_at timestamptz;begin
 if p_kind not in ('daily_attendance','low_attendance') or p_date is null then return false;end if;
 select parent_email,parent_email_approved_at into stored_email,approved_at from public.students where id=p_student_id for update;
 if approved_at is null or stored_email is null or lower(btrim(stored_email))<>lower(btrim(p_recipient)) then return false;end if;
 insert into public.parent_notification_attempts(student_id,kind,notice_date,recipient_email,status) values(p_student_id,p_kind,p_date,p_recipient,'claimed') on conflict do nothing;return found;end;$$;
revoke all on function public.claim_parent_notification(uuid,text,date,text) from public,anon,authenticated;
grant execute on function public.claim_parent_notification(uuid,text,date,text) to service_role;

drop trigger if exists invalidate_changed_parent_email on public.students;
drop function if exists public.invalidate_changed_parent_email();
drop function if exists public.confirm_parent_email_verification(uuid,text);
drop function if exists public.reserve_parent_email_verification_request(uuid,text);
drop table if exists public.parent_email_verification_tokens;
drop table if exists public.parent_email_request_limits;
alter table public.students drop column if exists parent_email_verified_at;
notify pgrst,'reload schema';
