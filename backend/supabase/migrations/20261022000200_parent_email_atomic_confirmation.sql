-- Apply after the two parent-email foundation migrations, before enabling verification.
-- Atomically consume a matching token and mark only the matching current parent address verified.
create or replace function public.confirm_parent_email_verification(
  p_student_id uuid, p_token_hash text
) returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_student public.students%rowtype;
  v_token public.parent_email_verification_tokens%rowtype;
begin
  if p_student_id is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;
  select * into v_student from public.students
  where id = p_student_id for update;
  if not found or v_student.parent_email is null then
    return false;
  end if;
  select * into v_token from public.parent_email_verification_tokens
  where student_id = p_student_id for update;
  if not found then return false; end if;
  if v_token.expires_at <= now() or v_token.attempts >= 10 then
    delete from public.parent_email_verification_tokens where student_id = p_student_id;
    return false;
  end if;
  if v_token.token_hash <> p_token_hash or
     lower(btrim(v_token.parent_email)) <> lower(btrim(v_student.parent_email)) then
    update public.parent_email_verification_tokens
    set attempts = attempts + 1 where student_id = p_student_id;
    return false;
  end if;
  update public.students set parent_email_verified_at = now()
  where id = p_student_id and lower(btrim(parent_email)) = lower(btrim(v_token.parent_email));
  if not found then return false; end if;
  delete from public.parent_email_verification_tokens where student_id = p_student_id;
  return true;
end;
$$;
revoke all on function public.confirm_parent_email_verification(uuid,text) from public, anon, authenticated;
grant execute on function public.confirm_parent_email_verification(uuid,text) to service_role;

-- Invalidate verified state and outstanding tokens when the parent address changes.
create or replace function public.invalidate_changed_parent_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_email_verified_at is distinct from old.parent_email_verified_at
     and coalesce(auth.role(), '') <> 'service_role'
     and not (new.parent_email is distinct from old.parent_email
              and new.parent_email_verified_at is null) then
    raise exception 'Parent email verification status is server-managed';
  end if;
  if new.parent_email is distinct from old.parent_email then
    new.parent_email_verified_at := null;
    delete from public.parent_email_verification_tokens where student_id = old.id;
  end if;
  return new;
end;
$$;
drop trigger if exists invalidate_changed_parent_email on public.students;
create trigger invalidate_changed_parent_email before update of parent_email, parent_email_verified_at on public.students
for each row execute function public.invalidate_changed_parent_email();
revoke all on function public.invalidate_changed_parent_email() from public, anon, authenticated;
