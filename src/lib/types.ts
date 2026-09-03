export type UserRoleType =
  | "admin"
  | "hod"
  | "teacher"
  | "class_coordinator"
  | "student";

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_id?: string | null;
  institution_name?: string | null;
  status: "active" | "inactive";
  created_at?: string;
}

export interface Teacher {
  id: string;
  employee_id: string;
  full_name: string;
  email?: string | null;
  mobile?: string | null;
  department_id?: string | null;
  user_id?: string | null;
  is_class_coordinator?: boolean;
  assigned_semester?: number | null;
  role: "hod" | "class_coordinator" | "lecturer";
  status: "active" | "inactive";
  designation?: string | null;
  qualification?: string | null;
  date_of_birth?: string | null;
  experience_years?: string | number | null;
  photo_url?: string | null;
  created_at?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department_id?: string | null;
  semester: number;
  credits: number;
  created_at?: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  department_id: string;
  semester: number;
  coordinator_teacher_id?: string | null;
  status: "active" | "inactive";
  created_at?: string;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_name?: string | null;
  created_at?: string;
}

export interface Student {
  id: string;
  roll_number: string;
  reg_number?: string | null;
  full_name: string;
  department_id?: string | null;
  semester: number;
  parent_name?: string | null;
  parent_mobile?: string | null;
  student_mobile?: string | null;
  email?: string | null;
  photo_url?: string | null;
  user_id?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | null;
  status: "active" | "inactive";
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: "present" | "absent";
  marked_by?: string | null;
  created_at?: string;
}

export type SmsLanguage = 'en' | 'mr' | 'hi' | 'trilingual' | 'bilingual_mr' | 'bilingual_hi';

export interface SmsLog {
  id: string;
  student_id?: string | null;
  subject_id?: string | null;
  student_name: string;
  parent_mobile?: string | null;
  message: string;
  status: "sent" | "failed";
  attendance_date: string;
  sent_at: string;
  language?: SmsLanguage | string;
}

export interface ClassCoordinatorAssignment {
  id: string;
  teacher_id: string;
  department_id: string;
  semester: number;
  assigned_by: string;
  created_at?: string;
}

export interface UserRole {
  role: UserRoleType;
}

export interface UserAccount {
  id: string;
  full_name: string;
  email: string;
  role: UserRoleType;
  department_id?: string | null;
  teacher_id?: string | null;
  student_id?: string | null;
  status: "active" | "inactive";
  created_at?: string;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  audience: "all" | "teachers" | "students" | "parents";
  status: "published" | "draft";
  created_at?: string;
}
