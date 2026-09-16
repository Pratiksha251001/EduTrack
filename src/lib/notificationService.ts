import { AppNotification, UserRoleType } from "./types";
import { generateUuid, localDb } from "./supabase";

const NOTIFICATIONS_STORAGE_KEY = "edutrack_local_notifications_v1";

const initialSampleNotifications: AppNotification[] = [
  {
    id: "notif-sample-1",
    type: "security_login_failed",
    title: "Security Alert: Failed Login Attempt",
    message: 'Unsuccessful login attempt detected for HOD account with identifier "hod.cse@college.edu". Reason: Incorrect password entered.',
    severity: "warning",
    target_roles: ["admin"],
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    read: false,
    read_by: [],
    metadata: {
      attempted_role: "hod",
      identifier: "hod.cse@college.edu",
      reason: "Incorrect password entered.",
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "notif-sample-2",
    type: "attendance_submitted",
    title: "Daily Attendance Submitted: Data Structures (Sem 3)",
    message: "Prof. Rajesh Sharma submitted daily lecture attendance for Data Structures (CS-301) on today's session. 48 Present, 4 Absent. 4 parent SMS alerts dispatched.",
    severity: "success",
    target_roles: ["hod", "class_coordinator", "admin"],
    department_id: "dept-1",
    semester: 3,
    subject_id: "sub-1",
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    read: false,
    read_by: [],
    metadata: {
      teacher_name: "Prof. Rajesh Sharma",
      subject_name: "Data Structures",
      subject_code: "CS-301",
      semester: 3,
      total_students: 52,
      present_count: 48,
      absent_count: 4,
      sms_count: 4,
    },
  },
];

export function getStoredNotifications(): AppNotification[] {
  if (typeof window === "undefined") return initialSampleNotifications;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      // If demo data was not cleared, return sample alerts
      const demoCleared = localStorage.getItem("edutrack_local_db_demo_cleared");
      if (demoCleared === "true") {
        return [];
      }
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(initialSampleNotifications));
      return initialSampleNotifications;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("Failed to load notifications from localStorage", err);
    return [];
  }
}

export function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(
      new CustomEvent("edutrack_notifications_updated", { detail: notifications })
    );
  } catch (err) {
    console.error("Failed to save notifications to localStorage", err);
  }
}

/**
 * Triggered when an invalid login / incorrect credentials attempt occurs.
 * Admin receives this notification.
 */
export function recordFailedLoginNotification(params: {
  attemptedRole: string;
  identifier: string;
  reason: string;
}): AppNotification {
  const notifications = getStoredNotifications();
  const newNotif: AppNotification = {
    id: `notif-sec-${Date.now()}-${generateUuid().slice(0, 8)}`,
    type: "security_login_failed",
    title: "Security Alert: Failed Login Attempt",
    message: `Failed login attempt for ${params.attemptedRole.toUpperCase()} account with identifier "${params.identifier}". Reason: ${params.reason}`,
    severity: "warning",
    target_roles: ["admin"],
    created_at: new Date().toISOString(),
    read: false,
    read_by: [],
    metadata: {
      attempted_role: params.attemptedRole,
      identifier: params.identifier,
      reason: params.reason,
      timestamp: new Date().toISOString(),
    },
  };

  const updated = [newNotif, ...notifications];
  saveNotifications(updated);
  return newNotif;
}

/**
 * Triggered when daily attendance is submitted by any teacher.
 * HOD and CC receive this notification.
 */
export function recordAttendanceSubmittedNotification(params: {
  teacherName: string;
  teacherId?: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  departmentId?: string | null;
  semester: number;
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  smsCount: number;
}): AppNotification {
  const notifications = getStoredNotifications();
  const summary = params.absentCount > 0
    ? `${params.absentCount} absentee(s). ${params.smsCount} parent SMS alert(s) dispatched.`
    : "100% attendance achieved (0 absentees).";

  const newNotif: AppNotification = {
    id: `notif-att-${Date.now()}-${generateUuid().slice(0, 8)}`,
    type: "attendance_submitted",
    title: `Daily Attendance Submitted: ${params.subjectName} (Sem ${params.semester})`,
    message: `${params.teacherName} submitted daily attendance for ${params.subjectName} (${params.subjectCode || "Class"}) on ${params.date}. ${params.presentCount}/${params.totalStudents} Present. ${summary}`,
    severity: "success",
    target_roles: ["hod", "class_coordinator", "admin"],
    department_id: params.departmentId || null,
    semester: params.semester,
    subject_id: params.subjectId,
    teacher_id: params.teacherId || null,
    created_at: new Date().toISOString(),
    read: false,
    read_by: [],
    metadata: {
      teacher_name: params.teacherName,
      teacher_id: params.teacherId,
      subject_id: params.subjectId,
      subject_name: params.subjectName,
      subject_code: params.subjectCode,
      department_id: params.departmentId,
      semester: params.semester,
      date: params.date,
      total_students: params.totalStudents,
      present_count: params.presentCount,
      absent_count: params.absentCount,
      sms_count: params.smsCount,
      timestamp: new Date().toISOString(),
    },
  };

  const updated = [newNotif, ...notifications];
  saveNotifications(updated);
  return newNotif;
}

/**
 * Filters notifications according to the logged-in user's role and departmental/class assignments.
 * - Admin: Sees all notifications (all security alerts + all attendance submissions).
 * - HOD: Sees attendance submitted for all classes/teachers in their department.
 * - Class Coordinator: Sees attendance submitted for their specific class/semester in their department.
 * - Teacher: Sees notifications related to subjects they teach or general notices.
 * - Student: Sees general or student-targeted notices.
 */
export function getNotificationsForUser(
  user: any,
  role: UserRoleType,
  allNotifications?: AppNotification[]
): AppNotification[] {
  const notifs = allNotifications || getStoredNotifications();
  if (!user || !role) return [];

  // Find coordinator semester if applicable
  let coordinatorSemester: number | null = null;
  if (role === "class_coordinator") {
    const teacherRec = localDb.teachers.find(
      (t) =>
        t.id === user?.teacher_id ||
        (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.employee_id && t.employee_id === user.employee_id) ||
        (t.is_class_coordinator && t.department_id === user?.department_id)
    );
    coordinatorSemester = teacherRec?.assigned_semester || user?.assigned_semester || 5;
  }

  const userDept = user?.department_id || null;

  return notifs.filter((item) => {
    // 1. Admin sees everything
    if (role === "admin") {
      return true;
    }

    // 2. Security alerts are strictly for Admin
    if (item.type === "security_login_failed") {
      return role === "admin";
    }

    // 3. Attendance submissions
    if (item.type === "attendance_submitted") {
      if (role === "hod") {
        // HOD sees for all classes/teachers in their department
        return !item.department_id || !userDept || item.department_id === userDept;
      }

      if (role === "class_coordinator") {
        // CC sees for their specific class (semester + department)
        const matchDept = !item.department_id || !userDept || item.department_id === userDept;
        const matchSem = !item.semester || item.semester === coordinatorSemester;
        return matchDept && matchSem;
      }

      if (role === "teacher") {
        // Subject teacher sees if they are the teacher or teach that subject
        if (item.teacher_id && (item.teacher_id === user.id || item.teacher_id === user.teacher_id)) {
          return true;
        }
        const teachesSubject = localDb.teacher_subjects.some(
          (ts) => (ts.teacher_id === user.id || ts.teacher_id === user.teacher_id) && ts.subject_id === item.subject_id
        );
        return teachesSubject;
      }

      return false;
    }

    // 4. General notices / notifications
    if (item.target_roles && item.target_roles.includes(role)) {
      if (item.department_id && userDept && item.department_id !== userDept) {
        return false;
      }
      return true;
    }

    return false;
  });
}

/**
 * Checks if a notification is read by the current user.
 */
export function isNotificationRead(item: AppNotification, userKey: string): boolean {
  if (item.read) return true;
  if (item.read_by && item.read_by.includes(userKey)) return true;
  return false;
}

/**
 * Marks a specific notification as read.
 */
export function markNotificationAsRead(id: string, userKey: string): void {
  const notifs = getStoredNotifications();
  const updated = notifs.map((item) => {
    if (item.id === id) {
      const readBy = new Set(item.read_by || []);
      readBy.add(userKey);
      return {
        ...item,
        read: true,
        read_by: Array.from(readBy),
      };
    }
    return item;
  });
  saveNotifications(updated);
}

/**
 * Marks all notifications as read for a user.
 */
export function markAllNotificationsAsRead(userKey: string): void {
  const notifs = getStoredNotifications();
  const updated = notifs.map((item) => {
    const readBy = new Set(item.read_by || []);
    readBy.add(userKey);
    return {
      ...item,
      read: true,
      read_by: Array.from(readBy),
    };
  });
  saveNotifications(updated);
}

/**
 * Deletes a single notification.
 */
export function deleteNotification(id: string): void {
  const notifs = getStoredNotifications();
  const updated = notifs.filter((n) => n.id !== id);
  saveNotifications(updated);
}

/**
 * Clears all notifications.
 */
export function clearAllNotifications(): void {
  saveNotifications([]);
}
