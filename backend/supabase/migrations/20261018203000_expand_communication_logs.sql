-- Align communication logs with the supported email and SMS dispatch model.
alter table public.sms_logs
  add column if not exists recipient_email text,
  add column if not exists channel text,
  add column if not exists is_defaulter_alert boolean not null default false,
  add column if not exists attendance_rate numeric,
  add column if not exists email_subject text,
  add column if not exists language text default 'en',
  add column if not exists gateway text,
  add column if not exists gateway_response text,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

notify pgrst, 'reload schema';
