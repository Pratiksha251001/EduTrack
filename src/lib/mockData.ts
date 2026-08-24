import {
  Department,
  Teacher,
  Subject,
  Student,
  AttendanceRecord,
  SmsLog,
  ClassCoordinatorAssignment,
  TeacherSubject,
  UserAccount,
  Notice,
  AcademicClass,
} from "./types";

export const mockUsers: UserAccount[] = [
  {
    id: "admin-1",
    full_name: "Dr. Arthur Pendelton",
    email: "admin@edutrack.edu",
    role: "admin",
    status: "active",
  },
  {
    id: "hod-user-id",
    full_name: "Dr. Robert Vance",
    email: "hod.cse@edutrack.edu",
    role: "hod",
    department_id: "dept-1",
    status: "active",
  },
  {
    id: "cc-user-id",
    full_name: "Prof. Emily Watson",
    email: "cc@edutrack.edu",
    role: "class_coordinator",
    department_id: "dept-1",
    status: "active",
  },
];

export const mockNotices: Notice[] = [];

export const mockClasses: AcademicClass[] = [
  {
    id: "class-cse-a",
    name: "CSE-A",
    department_id: "dept-1",
    semester: 5,
    coordinator_teacher_id: "t-2",
    status: "active",
  },
  {
    id: "class-cse-b",
    name: "CSE-B",
    department_id: "dept-1",
    semester: 5,
    coordinator_teacher_id: "t-4",
    status: "active",
  },
];

export const mockDepartments: Department[] = [
  {
    id: "dept-1",
    name: "Computer Science & Engineering",
    code: "CSE",
    hod_id: "t-1",
    institution_name: "St. Mary's Institute of Technology",
    status: "active",
  },
  {
    id: "dept-2",
    name: "Electronics & Communication",
    code: "ECE",
    hod_id: "t-3",
    institution_name: "St. Mary's Institute of Technology",
    status: "active",
  },
  {
    id: "dept-3",
    name: "Information Technology",
    code: "IT",
    institution_name: "St. Mary's Institute of Technology",
    status: "active",
  },
  {
    id: "dept-4",
    name: "Mechanical Engineering",
    code: "MECH",
    institution_name: "St. Mary's Institute of Technology",
    status: "inactive",
  },
];

export const mockTeachers: Teacher[] = [
  {
    id: "t-1",
    employee_id: "EMP-101",
    full_name: "Dr. Robert Vance (HOD)",
    email: "teacher@smit.edu",
    mobile: "+1 (555) 019-2834",
    department_id: "dept-1",
    user_id: "hod-user-id",
    role: "hod",
    status: "active",
  },
  {
    id: "t-2",
    employee_id: "EMP-102",
    full_name: "Prof. Sarah Jenkins",
    email: "s.jenkins@smit.edu",
    mobile: "+1 (555) 014-9921",
    department_id: "dept-1",
    user_id: null,
    is_class_coordinator: true,
    assigned_semester: 5,
    role: "class_coordinator",
    status: "active",
  },
  {
    id: "t-3",
    employee_id: "EMP-103",
    full_name: "Dr. Alan Turing (HOD)",
    email: "a.turing@smit.edu",
    mobile: "+1 (555) 018-4422",
    department_id: "dept-2",
    user_id: null,
    role: "hod",
    status: "active",
  },
  {
    id: "t-4",
    employee_id: "EMP-104",
    full_name: "Prof. Emily Watson",
    email: "e.watson@smit.edu",
    mobile: "+1 (555) 020-1122",
    department_id: "dept-1",
    user_id: "cc-user-id",
    is_class_coordinator: true,
    assigned_semester: 6,
    role: "class_coordinator",
    status: "active",
  },
];

export const mockClassCoordinatorAssignments: ClassCoordinatorAssignment[] = [
  {
    id: "cca-1",
    teacher_id: "t-2",
    department_id: "dept-1",
    semester: 5,
    assigned_by: "hod-user-id",
  },
  {
    id: "cca-2",
    teacher_id: "t-4",
    department_id: "dept-1",
    semester: 6,
    assigned_by: "hod-user-id",
  },
];

export const mockSubjects: Subject[] = [
  {
    id: "sub-1",
    code: "CS501",
    name: "Design and Analysis of Algorithms",
    department_id: "dept-1",
    semester: 5,
    credits: 4,
  },
  {
    id: "sub-2",
    code: "CS502",
    name: "Database Management Systems",
    department_id: "dept-1",
    semester: 5,
    credits: 4,
  },
  {
    id: "sub-3",
    code: "CS503",
    name: "Computer Networks",
    department_id: "dept-1",
    semester: 5,
    credits: 3,
  },
  {
    id: "sub-4",
    code: "CS504",
    name: "Operating Systems",
    department_id: "dept-1",
    semester: 5,
    credits: 3,
  },
];

export const mockTeacherSubjects: TeacherSubject[] = [
  { id: "ts-1", teacher_id: "t-1", subject_id: "sub-1", class_name: "CSE-A" },
  { id: "ts-2", teacher_id: "t-1", subject_id: "sub-2", class_name: "CSE-A" },
  { id: "ts-3", teacher_id: "t-2", subject_id: "sub-3", class_name: "CSE-A" },
  { id: "ts-4", teacher_id: "t-2", subject_id: "sub-4", class_name: "CSE-B" },
];

export const mockStudents: Student[] = [
  {
    id: "st-1",
    roll_number: "21CS001",
    reg_number: "REG-2021-001",
    full_name: "Alexander Hayes",
    department_id: "dept-1",
    semester: 5,
    parent_name: "Marcus Hayes",
    parent_mobile: "+1 (555) 234-5678",
    student_mobile: "+1 (555) 234-5679",
    email: "alex.h@student.smit.edu",
    user_id: "student-user-id",
    address: "123 College Ave, Campus Town",
    date_of_birth: "2003-05-15",
    gender: "male",
    status: "active",
  },
  {
    id: "st-2",
    roll_number: "21CS002",
    reg_number: "REG-2021-002",
    full_name: "Sophia Montgomery",
    department_id: "dept-1",
    semester: 5,
    parent_name: "Elena Montgomery",
    parent_mobile: "+1 (555) 345-6789",
    student_mobile: "+1 (555) 345-6780",
    email: "sophia.m@student.smit.edu",
    address: "456 University Blvd",
    date_of_birth: "2003-08-22",
    gender: "female",
    status: "active",
  },
  {
    id: "st-3",
    roll_number: "21CS003",
    reg_number: "REG-2021-003",
    full_name: "Ethan Gallagher",
    department_id: "dept-1",
    semester: 5,
    parent_name: "David Gallagher",
    parent_mobile: "+1 (555) 456-7890",
    student_mobile: "+1 (555) 456-7891",
    email: "ethan.g@student.smit.edu",
    address: "789 Academic St",
    date_of_birth: "2003-02-10",
    gender: "male",
    status: "active",
  },
  {
    id: "st-4",
    roll_number: "21CS004",
    reg_number: "REG-2021-004",
    full_name: "Isabella Rodriguez",
    department_id: "dept-1",
    semester: 5,
    parent_name: "Carlos Rodriguez",
    parent_mobile: "+1 (555) 567-8901",
    student_mobile: "+1 (555) 567-8902",
    email: "isabella.r@student.smit.edu",
    address: "321 Scholar Lane",
    date_of_birth: "2003-11-30",
    gender: "female",
    status: "active",
  },
  {
    id: "st-5",
    roll_number: "21CS005",
    reg_number: "REG-2021-005",
    full_name: "Lucas Bennett",
    department_id: "dept-1",
    semester: 5,
    parent_name: "Arthur Bennett",
    parent_mobile: "+1 (555) 678-9012",
    student_mobile: "+1 (555) 678-9013",
    email: "lucas.b@student.smit.edu",
    address: "555 Education Dr",
    date_of_birth: "2003-07-04",
    gender: "male",
    status: "active",
  },
];

export const mockAttendance: AttendanceRecord[] = [];
export const mockSmsLogs: SmsLog[] = [];

const today = new Date();
for (let i = 14; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  if (d.getDay() === 0 || d.getDay() === 6) continue;
  const dateStr = d.toISOString().split("T")[0];

  mockSubjects.forEach((sub) => {
    mockStudents.forEach((st) => {
      const isAbsent =
        (st.id === "st-3" && i % 3 === 0) || (st.id === "st-5" && i % 2 === 0);
      const status = isAbsent ? "absent" : "present";

      mockAttendance.push({
        id: `att-${sub.id}-${st.id}-${dateStr}`,
        student_id: st.id,
        subject_id: sub.id,
        date: dateStr,
        status,
        marked_by: "user-demo",
      });

      if (isAbsent && st.parent_mobile) {
        mockSmsLogs.push({
          id: `sms-${sub.id}-${st.id}-${dateStr}`,
          student_id: st.id,
          subject_id: sub.id,
          student_name: st.full_name,
          parent_mobile: st.parent_mobile,
          message: `Dear Parent,\n\nYour child, ${st.full_name}, was absent today (${dateStr}) for the subject "${sub.name}" at St. Mary's Institute of Technology.\n\nPlease contact your child if required.\n\nThank you.`,
          status: "sent",
          attendance_date: dateStr,
          sent_at: `${dateStr}T10:30:00Z`,
        });
      }
    });
  });
}
