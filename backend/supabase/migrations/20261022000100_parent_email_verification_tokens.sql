-- Parent email verification token storage, no dispatch or endpoints enabled.
-- Apply only as part of a reviewed complete parent verification rollout.
create table if not exists public.parent_email_verification_tokens (
    student_id uuid primary key references public.students(id) on delete cascade,
    parent_email text not null,
    token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    attempts integer not null default 0 check (attempts between 0 and 10)
);
alter table public.parent_email_verification_tokens enable row level security;
revoke all on public.parent_email_verification_tokens from anon, authenticated;
-- No client-facing RLS policies. Only the trusted service role may operate here.
-- No email is sent and no token is issued by this migration.
