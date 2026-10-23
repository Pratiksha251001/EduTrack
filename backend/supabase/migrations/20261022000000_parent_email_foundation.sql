-- Parent email foundation; verification and dispatch are NOT enabled by this migration.
-- Apply only after reviewing the complete parent-email feature rollout.
alter table public.students add column if not exists parent_email text;
alter table public.students add column if not exists parent_email_verified_at timestamptz;
-- Existing parent addresses remain unverified. No automatic email is sent.
notify pgrst, 'reload schema';
