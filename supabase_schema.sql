-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  mobile text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. User Roles Table (admin, hod, teacher, class_coordinator, student)
create table if not exists public.user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'hod', 'teacher', 'class_coordinator', 'student')),
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, role)
);

create table if not exists public.notices (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  message text not null,
  audience text not null check (audience in ('all', 'teachers', 'students', 'parents')),
  status text not null default 'draft' check (status in ('published', 'draft')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.academic_classes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  department_id uuid references public.departments(id) on delete cascade not null,
  semester integer not null check (semester between 1 and 8),
  coordinator_teacher_id uuid references public.teachers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(name, department_id)
);

-- 3. Departments Table
create table if not exists public.departments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text not null unique,
  institution_name text,
  hod_id uuid references public.teachers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Teachers Table
create table if not exists public.teachers (
  id uuid default uuid_generate_v4() primary key,
  employee_id text not null unique,
  full_name text not null,
  email text unique,
  mobile text,
  department_id uuid references public.departments(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  is_class_coordinator boolean default false,
  assigned_semester integer check (assigned_semester between 1 and 8),
  role text not null default 'lecturer' check (role in ('hod', 'class_coordinator', 'lecturer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Class Coordinator Assignments Table
create table if not exists public.class_coordinator_assignments (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  department_id uuid references public.departments(id) on delete cascade not null,
  semester integer not null check (semester between 1 and 8),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(teacher_id, department_id, semester)
);

-- 6. Subjects Table
create table if not exists public.subjects (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  name text not null,
  department_id uuid references public.departments(id) on delete cascade,
  semester integer not null check (semester between 1 and 8),
  credits integer default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Teacher-subject-class assignments. A teacher may teach many subjects.
create table if not exists public.teacher_subjects (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  class_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(teacher_id, subject_id, class_name)
);

-- 7. Students Table
create table if not exists public.students (
  id uuid default uuid_generate_v4() primary key,
  roll_number text not null unique,
  reg_number text,
  full_name text not null,
  department_id uuid references public.departments(id) on delete cascade,
  semester integer not null check (semester between 1 and 8),
  parent_name text,
  parent_mobile text not null,
  student_mobile text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  photo_url text,
  address text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint parent_student_mobile_different check (parent_mobile != student_mobile)
);

-- 8. Attendance Table
create table if not exists public.attendance (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent')),
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, subject_id, date)
);

-- 9. SMS Logs Table
create table if not exists public.sms_logs (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  student_name text not null,
  parent_mobile text,
  message text not null,
  status text not null check (status in ('sent', 'failed')),
  attendance_date date not null,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.notices enable row level security;
alter table public.academic_classes enable row level security;
alter table public.departments enable row level security;
alter table public.teachers enable row level security;
alter table public.class_coordinator_assignments enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.subjects enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.sms_logs enable row level security;

-- Policies
create policy "Public auth access" on public.departments for all using (true);
create policy "Public auth access" on public.teachers for all using (true);
create policy "Public auth access" on public.class_coordinator_assignments for all using (true);
create policy "Public auth access" on public.teacher_subjects for all using (true);
create policy "Public auth access" on public.subjects for all using (true);
create policy "Public auth access" on public.students for all using (true);
create policy "Public auth access" on public.attendance for all using (true);
create policy "Public auth access" on public.sms_logs for all using (true);

-- There is exactly one administrator for the institution.
create unique index if not exists one_admin_per_institution on public.user_roles (role) where role = 'admin';
create policy "Public auth access" on public.profiles for all using (true);
create policy "Public auth access" on public.user_roles for all using (true);
create policy "Public auth access" on public.notices for all using (true);
create policy "Public auth access" on public.academic_classes for all using (true);
