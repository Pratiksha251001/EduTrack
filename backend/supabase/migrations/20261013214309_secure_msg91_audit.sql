-- Stage 3: authoritative SMS audit, delivery states, and duplicate prevention.
alter table public.sms_logs add column if not exists provider text not null default 'msg91';
alter table public.sms_logs add column if not exists provider_request_id text;
alter table public.sms_logs add column if not exists delivery_status text not null default 'queued';
alter table public.sms_logs add column if not exists failure_code text;
alter table public.sms_logs add column if not exists failure_message text;
alter table public.sms_logs add column if not exists idempotency_key text;
alter table public.sms_logs add column if not exists correlation_id text;
alter table public.sms_logs add column if not exists updated_at timestamptz not null default now();
alter table public.sms_logs drop constraint if exists sms_logs_status_check;
alter table public.sms_logs add constraint sms_logs_status_check check (status in ('sent','queued','accepted','delivered','failed','simulated'));
create unique index if not exists sms_logs_idempotency_key_unique on public.sms_logs(idempotency_key) where idempotency_key is not null;
drop policy if exists "Public access sms_logs" on public.sms_logs;
create policy "Authenticated read sms_logs" on public.sms_logs for select to authenticated using (true);
revoke insert, update, delete on public.sms_logs from anon, authenticated;
grant select on public.sms_logs to authenticated;

create index if not exists sms_logs_correlation_id_idx on public.sms_logs(correlation_id) where correlation_id is not null;
