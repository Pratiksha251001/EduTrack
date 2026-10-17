-- Parent contact is required because attendance alerts are sent to guardians.
alter table public.students
  add column if not exists prn_number text;

alter table public.students
  alter column parent_mobile set not null;
