import { Department, Teacher, Subject, Student, AttendanceRecord, SmsLog } from './types';

export const mockDepartments: Department[] = [
  { id: 'dept-1', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept-2', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'dept-3', name: 'Information Technology', code: 'IT' },
  { id: 'dept-4', name: 'Mechanical Engineering', code: 'MECH' }
];

export const mockTeachers: Teacher[] = [
  { id: 't-1', employee_id: 'EMP-101', full_name: 'Dr. Robert Vance', email: 'teacher@smit.edu', mobile: '+1 (555) 019-2834', department_id: 'dept-1', user_id: 'teacher-user-id' },
  { id: 't-2', employee_id: 'EMP-102', full_name: 'Prof. Sarah Jenkins', email: 's.jenkins@smit.edu', mobile: '+1 (555) 014-9921', department_id: 'dept-1', user_id: null },
  { id: 't-3', employee_id: 'EMP-103', full_name: 'Dr. Alan Turing', email: 'a.turing@smit.edu', mobile: '+1 (555) 018-4422', department_id: 'dept-2', user_id: null }
];

export const mockSubjects: Subject[] = [
  { id: 'sub-1', code: 'CS501', name: 'Design and Analysis of Algorithms', department_id: 'dept-1', semester: 5, credits: 4, teacher_id: 't-1' },
  { id: 'sub-2', code: 'CS502', name: 'Database Management Systems', department_id: 'dept-1', semester: 5, credits: 4, teacher_id: 't-1' },
  { id: 'sub-3', code: 'CS503', name: 'Computer Networks', department_id: 'dept-1', semester: 5, credits: 3, teacher_id: 't-2' },
  { id: 'sub-4', code: 'CS504', name: 'Operating Systems', department_id: 'dept-1', semester: 5, credits: 3, teacher_id: 't-2' }
];

export const mockStudents: Student[] = [
  { id: 'st-1', roll_number: '21CS001', reg_number: 'REG-2021-001', full_name: 'Alexander Hayes', department_id: 'dept-1', semester: 5, parent_name: 'Marcus Hayes', parent_mobile: '+1 (555) 234-5678', student_mobile: '+1 (555) 234-5679', email: 'alex.h@student.smit.edu', status: 'active' },
  { id: 'st-2', roll_number: '21CS002', reg_number: 'REG-2021-002', full_name: 'Sophia Montgomery', department_id: 'dept-1', semester: 5, parent_name: 'Elena Montgomery', parent_mobile: '+1 (555) 345-6789', student_mobile: '+1 (555) 345-6780', email: 'sophia.m@student.smit.edu', status: 'active' },
  { id: 'st-3', roll_number: '21CS003', reg_number: 'REG-2021-003', full_name: 'Ethan Gallagher', department_id: 'dept-1', semester: 5, parent_name: 'David Gallagher', parent_mobile: '+1 (555) 456-7890', student_mobile: '+1 (555) 456-7891', email: 'ethan.g@student.smit.edu', status: 'active' },
  { id: 'st-4', roll_number: '21CS004', reg_number: 'REG-2021-004', full_name: 'Isabella Rodriguez', department_id: 'dept-1', semester: 5, parent_name: 'Carlos Rodriguez', parent_mobile: '+1 (555) 567-8901', student_mobile: '+1 (555) 567-8902', email: 'isabella.r@student.smit.edu', status: 'active' },
  { id: 'st-5', roll_number: '21CS005', reg_number: 'REG-2021-005', full_name: 'Lucas Bennett', department_id: 'dept-1', semester: 5, parent_name: 'Arthur Bennett', parent_mobile: '+1 (555) 678-9012', student_mobile: '+1 (555) 678-9013', email: 'lucas.b@student.smit.edu', status: 'active' }
];

export const mockAttendance: AttendanceRecord[] = [];
export const mockSmsLogs: SmsLog[] = [];

const today = new Date();
for (let i = 14; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  if (d.getDay() === 0 || d.getDay() === 6) continue;
  const dateStr = d.toISOString().split('T')[0];

  mockSubjects.forEach(sub => {
    mockStudents.forEach(st => {
      const isAbsent = (st.id === 'st-3' && i % 3 === 0) || (st.id === 'st-5' && i % 2 === 0);
      const status = isAbsent ? 'absent' : 'present';
      
      mockAttendance.push({
        id: `att-${sub.id}-${st.id}-${dateStr}`,
        student_id: st.id,
        subject_id: sub.id,
        date: dateStr,
        status,
        marked_by: 'user-demo'
      });

      if (isAbsent && st.parent_mobile) {
        mockSmsLogs.push({
          id: `sms-${sub.id}-${st.id}-${dateStr}`,
          student_id: st.id,
          subject_id: sub.id,
          student_name: st.full_name,
          parent_mobile: st.parent_mobile,
          message: `Dear Parent,\n\nYour child, ${st.full_name}, was absent today (${dateStr}) for the subject "${sub.name}" at St. Mary's Institute of Technology.\n\nPlease contact your child if required.\n\nThank you.`,
          status: 'sent',
          attendance_date: dateStr,
          sent_at: `${dateStr}T10:30:00Z`
        });
      }
    });
  });
}
