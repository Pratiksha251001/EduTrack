export interface Department {
  id: string;
  name: string;
  code: string;
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
  created_at?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department_id?: string | null;
  semester: number;
  credits: number;
  teacher_id?: string | null;
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
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'present' | 'absent';
  marked_by?: string | null;
  created_at?: string;
}

export interface SmsLog {
  id: string;
  student_id?: string | null;
  subject_id?: string | null;
  student_name: string;
  parent_mobile?: string | null;
  message: string;
  status: 'sent' | 'failed';
  attendance_date: string;
  sent_at: string;
}

export interface UserRole {
  role: 'admin' | 'teacher';
}
