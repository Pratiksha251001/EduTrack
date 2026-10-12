import { createClient } from "@supabase/supabase-js";
import {
  mockDepartments,
  mockTeachers,
  mockSubjects,
  mockStudents,
  mockAttendance,
  mockSmsLogs,
  mockClassCoordinatorAssignments,
  mockTeacherSubjects,
  mockUsers,
  mockNotices,
  mockClasses,
} from "./mockData";
import { cleanSmsMessage } from "./college";

export function generateUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sanitizes Supabase URL by removing trailing slashes and /rest/v1 paths.
 */
export function cleanSupabaseUrl(url: string | undefined): string {
  if (!url) return "";
  let clean = url.trim();
  // Strip trailing /rest/v1 or /rest/v1/ (case-insensitive)
  clean = clean.replace(/\/rest\/v1\/?$/i, "");
  // Strip any trailing slashes
  clean = clean.replace(/\/+$/, "");
  return clean;
}

const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
export const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
export const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes("placeholder") &&
  supabaseKey !== "placeholder-key" &&
  supabaseKey !== "your-anon-key-here" &&
  supabaseKey !== "placeholder-anon-key",
);

// Fallback dummy credentials when Supabase credentials are not provided in the environment.
// This prevents `@supabase/supabase-js` from throwing "Uncaught Error: supabaseUrl is required." on startup.
const fallbackUrl = "https://placeholder-project.supabase.co";
const fallbackKey = "placeholder-anon-key";

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured ? supabaseKey : fallbackKey,
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
    },
  },
);

const TABLE_COLUMNS: Record<string, string[]> = {
  departments: [
    "id",
    "name",
    "code",
    "institution_name",
    "hod_id",
    "status",
    "created_at",
  ],
  teachers: [
    "id",
    "employee_id",
    "full_name",
    "designation",
    "qualification",
    "date_of_birth",
    "experience_years",
    "email",
    "mobile",
    "department_id",
    "user_id",
    "is_class_coordinator",
    "assigned_year",
    "assigned_semester",
    "role",
    "status",
    "created_at",
  ],
  students: [
    "id",
    "roll_number",
    "prn_number",
    "reg_number",
    "full_name",
    "department_id",
    "year",
    "semester",
    "class_id",
    "class_name",
    "section",
    "parent_name",
    "parent_mobile",
    "student_mobile",
    "email",
    "user_id",
    "photo_url",
    "address",
    "date_of_birth",
    "gender",
    "status",
    "created_at",
  ],
  academic_classes: [
    "id",
    "name",
    "department_id",
    "year",
    "semester",
    "coordinator_teacher_id",
    "status",
    "created_at",
  ],
  class_coordinator_assignments: [
    "id",
    "teacher_id",
    "department_id",
    "year",
    "semester",
    "class_id",
    "class_name",
    "assigned_by",
    "created_at",
  ],
  subjects: [
    "id",
    "code",
    "name",
    "department_id",
    "year",
    "semester",
    "credits",
    "created_at",
  ],
  teacher_subjects: [
    "id",
    "teacher_id",
    "subject_id",
    "class_name",
    "class_id",
    "year",
    "semester",
    "created_at",
  ],
  attendance: [
    "id",
    "student_id",
    "subject_id",
    "class_name",
    "class_id",
    "date",
    "status",
    "marked_by",
    "created_at",
  ],
  sms_logs: [
    "id",
    "student_id",
    "subject_id",
    "student_name",
    "parent_mobile",
    "message",
    "status",
    "attendance_date",
    "language",
    "sent_at",
  ],
  notices: ["id", "title", "message", "audience", "status", "created_at"],
};

export function sanitizePayloadForSupabase(table: string, rawItem: any): any {
  const allowed = TABLE_COLUMNS[table];
  const item: any = {};
  const keys = allowed || Object.keys(rawItem);

  for (const k of keys) {
    if (rawItem[k] === undefined) continue;
    let val = rawItem[k];

    // Convert empty string UUID foreign keys to null
    if (
      val === "" &&
      (k.endsWith("_id") ||
        k === "user_id" ||
        k === "assigned_by" ||
        k === "hod_id")
    ) {
      val = null;
    }

    // Convert empty date strings to null
    if (val === "" && (k === "date_of_birth" || k === "date")) {
      val = null;
    }

    // Parse integers
    if (
      k === "semester" ||
      k === "assigned_semester" ||
      k === "credits" ||
      k === "year" ||
      k === "assigned_year"
    ) {
      val =
        val === "" || val === null ? null : parseInt(String(val), 10) || null;
    }

    // Normalize boolean
    if (k === "is_class_coordinator") {
      val = Boolean(val);
    }

    item[k] = val;
  }

  // Ensure valid UUID
  if (!item.id || item.id.length < 20 || item.id.startsWith("id-")) {
    item.id = generateUuid();
  }

  return item;
}

class LocalDatabase {
  private readonly storageKey = "edutrack_local_db";
  departments = this.load("departments", mockDepartments);
  teachers = this.load("teachers", mockTeachers);
  subjects = this.load("subjects", mockSubjects);
  students = this.load("students", mockStudents);
  attendance = this.load("attendance", mockAttendance);
  sms_logs = this.load("sms_logs", mockSmsLogs);
  class_coordinator_assignments = this.load(
    "class_coordinator_assignments",
    mockClassCoordinatorAssignments,
  );
  teacher_subjects = this.load("teacher_subjects", mockTeacherSubjects);
  users = this.load("users", mockUsers);
  notices = this.load("notices", mockNotices);
  academic_classes = this.load("academic_classes", mockClasses);

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        const prefix = `${this.storageKey}_`;
        if (!event.key?.startsWith(prefix) || !event.newValue) return;

        const table = event.key.slice(prefix.length);
        if (!(this as any)[table]) return;

        try {
          const data = JSON.parse(event.newValue);
          if (!Array.isArray(data)) return;
          (this as any)[table] = data;
          window.dispatchEvent(
            new CustomEvent("edutrack_data_updated", {
              detail: { table, data },
            }),
          );
        } catch {
          return;
        }
      });
    }

    if (
      this.teachers.length === 0 &&
      localStorage.getItem(`${this.storageKey}_demo_cleared`) !== "true"
    ) {
      this.restoreDemoData();
    } else {
      if (
        this.teacher_subjects.length === 0 &&
        localStorage.getItem(`${this.storageKey}_demo_cleared`) !== "true"
      ) {
        this.teacher_subjects = [...mockTeacherSubjects];
        this.persist("teacher_subjects");
      }
      if (
        this.academic_classes.length === 0 &&
        localStorage.getItem(`${this.storageKey}_demo_cleared`) !== "true"
      ) {
        this.academic_classes = [...mockClasses];
        this.persist("academic_classes");
      }
    }

    // Ensure 2nd, 3rd, and 4th years have two divisions (A and B), excluding 1st year
    this.ensureStandardEngineeringDivisions();

    if (isSupabaseConfigured) {
      this.syncFromSupabase();
    }
  }

  /**
   * Ensures that for 2nd Year (SE), 3rd Year (TE), and 4th Year (BE),
   * two divisions (A and B) exist. First year (FE) is left as a single cohort.
   */
  public ensureStandardEngineeringDivisions(targetDeptId?: string) {
    const depts = targetDeptId
      ? this.departments.filter((d) => d.id === targetDeptId)
      : this.departments;

    let classesChanged = false;

    for (const dept of depts) {
      const deptCode = dept.code || "ENGG";
      const deptClasses = this.academic_classes.filter((c) => c.department_id === dept.id);

      const yearsConfig = [
        { year: 2, sem: 3, code: "SE" },
        { year: 3, sem: 5, code: "TE" },
        { year: 4, sem: 7, code: "BE" },
      ];

      for (const yc of yearsConfig) {
        const divAExists = deptClasses.some(
          (c) =>
            (c.year === yc.year || c.semester === yc.sem || c.semester === yc.sem + 1) &&
            (c.name.includes("-A") || c.name.endsWith(" A") || c.name.includes("Div A") || c.name.includes("Division A")),
        );
        const divBExists = deptClasses.some(
          (c) =>
            (c.year === yc.year || c.semester === yc.sem || c.semester === yc.sem + 1) &&
            (c.name.includes("-B") || c.name.endsWith(" B") || c.name.includes("Div B") || c.name.includes("Division B")),
        );

        if (!divAExists) {
          const newClassA: AcademicClass = {
            id: `class-${deptCode.toLowerCase()}-${yc.code.toLowerCase()}-a`,
            name: `${yc.code} ${deptCode}-A`,
            department_id: dept.id,
            year: yc.year,
            semester: yc.sem,
            coordinator_teacher_id: null,
            status: "active",
          };
          this.academic_classes.push(newClassA);
          classesChanged = true;
        }

        if (!divBExists) {
          const newClassB: AcademicClass = {
            id: `class-${deptCode.toLowerCase()}-${yc.code.toLowerCase()}-b`,
            name: `${yc.code} ${deptCode}-B`,
            department_id: dept.id,
            year: yc.year,
            semester: yc.sem,
            coordinator_teacher_id: null,
            status: "active",
          };
          this.academic_classes.push(newClassB);
          classesChanged = true;
        }
      }
    }

    // Also check if BE CSE-B has student st-be-2, if not add it
    const beClassB = this.academic_classes.find((c) => c.name === "BE CSE-B" || c.id === "class-cse-be-b");
    if (beClassB && !this.students.some((s) => s.id === "st-be-2" || s.roll_number === "21CS002")) {
      const studentBeB = {
        id: "st-be-2",
        roll_number: "21CS002",
        reg_number: "REG-2021-002",
        full_name: "Meera Nair",
        department_id: beClassB.department_id || "dept-1",
        year: 4,
        semester: 7,
        class_id: beClassB.id,
        class_name: beClassB.name,
        parent_name: "Gopal Nair",
        parent_mobile: "9876543242",
        student_mobile: "9876543243",
        email: "meera.n@student.college.edu",
        address: "Campus View Hostel D, Room 210",
        date_of_birth: "2003-05-18",
        gender: "female",
        status: "active" as const,
      };
      this.students.push(studentBeB);
      this.persist("students");
    }

    if (classesChanged) {
      this.persist("academic_classes");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("edutrack_data_updated", {
            detail: { table: "academic_classes", data: this.academic_classes },
          }),
        );
      }
    }
  }

  public async syncFromSupabase() {
    const syncTables = [
      "departments",
      "teachers",
      "subjects",
      "students",
      "academic_classes",
      "notices",
      "sms_logs",
    ];
    for (const table of syncTables) {
      try {
        const { data, error } = await supabase.from(table).select("*");
        if (!error && Array.isArray(data)) {
          (this as any)[table] = data;
          this.persist(table);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("edutrack_data_updated", {
                detail: { table, data },
              }),
            );
          }
        }
      } catch (err) {
        console.warn(`Supabase sync failed for ${table}:`, err);
      }
    }

    try {
      const [{ data: roles, error: rolesError }, { data: profiles, error: profilesError }] =
        await Promise.all([
          supabase.from("user_roles").select("user_id, role, department_id"),
          supabase.from("profiles").select("id, full_name, email"),
        ]);

      if (!rolesError && !profilesError && Array.isArray(roles) && Array.isArray(profiles)) {
        const existingUsers = new Map(
          this.users.map((user: any) => [user.id, user]),
        );
        const users = roles.map((roleRecord: any) => {
          const profile = profiles.find((item: any) => item.id === roleRecord.user_id);
          const existing = existingUsers.get(roleRecord.user_id) || {};
          const teacher = this.teachers.find(
            (item: any) => item.user_id === roleRecord.user_id,
          );
          const student = this.students.find(
            (item: any) => item.user_id === roleRecord.user_id,
          );
          return {
            ...existing,
            id: roleRecord.user_id,
            full_name:
              profile?.full_name ||
              teacher?.full_name ||
              student?.full_name ||
              "Portal User",
            email:
              profile?.email ||
              teacher?.email ||
              student?.email ||
              existing.email ||
              "",
            role: roleRecord.role,
            department_id:
              roleRecord.department_id ||
              teacher?.department_id ||
              student?.department_id ||
              null,
            teacher_id: teacher?.id || existing.teacher_id,
            student_id: student?.id || existing.student_id,
            status: existing.status || "active",
          };
        });

        this.users = users;
        this.persist("users");
        window.dispatchEvent(
          new CustomEvent("edutrack_data_updated", {
            detail: { table: "users", data: users },
          }),
        );
      }
    } catch (err) {
      console.warn("Supabase sync failed for users:", err);
    }
  }

  private load<T>(table: string, fallback: T[]): T[] {
    try {
      const saved = localStorage.getItem(`${this.storageKey}_${table}`);
      const isDemoCleared =
        localStorage.getItem(`${this.storageKey}_demo_cleared`) === "true";

      if (saved !== null) {
        const data = JSON.parse(saved);
        if (table === "sms_logs" && Array.isArray(data)) {
          let changed = false;
          const cleaned = data.map((log: any) => {
            if (log && log.message) {
              const clean = cleanSmsMessage(log.message);
              if (clean !== log.message) {
                changed = true;
                return { ...log, message: clean };
              }
            }
            return log;
          });
          if (changed) {
            try {
              localStorage.setItem(
                `${this.storageKey}_sms_logs`,
                JSON.stringify(cleaned),
              );
            } catch {}
          }
          return cleaned as T[];
        }
        return data as T[];
      }

      // If user cleared default data, do not seed mock records
      if (isDemoCleared) {
        return [] as T[];
      }

      return [...fallback];
    } catch {
      return [...fallback];
    }
  }

  public persist(table: string) {
    try {
      localStorage.setItem(
        `${this.storageKey}_${table}`,
        JSON.stringify((this as any)[table]),
      );
    } catch (e) {
      console.warn(`LocalDatabase: Failed to persist ${table}`, e);
    }
  }

  /**
   * Clears ALL default / mock data (departments, teachers, students, subjects, classes, attendance, logs)
   * so the entire institutional database starts with a clean slate (0 records).
   */
  public clearAllDefaultData() {
    this.departments = [];
    this.teachers = [];
    this.subjects = [];
    this.students = [];
    this.academic_classes = [];
    this.class_coordinator_assignments = [];
    this.teacher_subjects = [];
    this.attendance = [];
    this.sms_logs = [];
    this.notices = [];

    localStorage.setItem(`${this.storageKey}_demo_cleared`, "true");

    const tables = [
      "departments",
      "teachers",
      "subjects",
      "students",
      "academic_classes",
      "class_coordinator_assignments",
      "teacher_subjects",
      "attendance",
      "sms_logs",
      "notices",
    ];

    for (const t of tables) {
      this.persist(t);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("edutrack_data_updated", {
            detail: { table: t, data: [] },
          }),
        );
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("edutrack_sms_logs_updated", { detail: [] }),
      );
    }
  }

  /**
   * Clears default / mock student roster, attendance records, and SMS logs.
   */
  public clearDemoStudents() {
    this.students = [];
    this.attendance = [];
    this.sms_logs = [];
    localStorage.setItem(`${this.storageKey}_demo_cleared`, "true");
    this.persist("students");
    this.persist("attendance");
    this.persist("sms_logs");

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("edutrack_data_updated", {
          detail: { table: "students", data: [] },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("edutrack_sms_logs_updated", { detail: [] }),
      );
    }
  }

  /**
   * Restore demo data if desired for testing
   */
  public restoreDemoData() {
    localStorage.removeItem(`${this.storageKey}_demo_cleared`);
    this.departments = [...mockDepartments];
    this.teachers = [...mockTeachers];
    this.subjects = [...mockSubjects];
    this.students = [...mockStudents];
    this.attendance = [...mockAttendance];
    this.sms_logs = [...mockSmsLogs];
    this.class_coordinator_assignments = [...mockClassCoordinatorAssignments];
    this.teacher_subjects = [...mockTeacherSubjects];
    this.users = [...mockUsers];
    this.notices = [...mockNotices];
    this.academic_classes = [...mockClasses];

    const tables = [
      "departments",
      "teachers",
      "subjects",
      "students",
      "attendance",
      "sms_logs",
      "class_coordinator_assignments",
      "teacher_subjects",
      "users",
      "notices",
      "academic_classes",
    ];
    for (const t of tables) {
      this.persist(t);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("edutrack_data_updated", {
            detail: { table: t, data: (this as any)[t] },
          }),
        );
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("edutrack_sms_logs_updated", { detail: this.sms_logs }),
      );
    }
  }

  /**
   * Ensures mock records (departments, teachers, students, subjects, attendance) are present
   * when entering demo / study mode so all role dashboards and dummy profiles are fully populated.
   */
  public ensureDemoDataLoaded() {
    if (
      this.departments.length === 0 ||
      this.teachers.length === 0 ||
      this.students.length === 0 ||
      this.subjects.length === 0
    ) {
      this.restoreDemoData();
    }
  }

  getSmsLogs(): any[] {
    try {
      const saved = localStorage.getItem(`${this.storageKey}_sms_logs`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.sms_logs = parsed.map((log: any) => ({
            ...log,
            message: cleanSmsMessage(log.message || ""),
          }));
        }
      }
    } catch {
      // Use in-memory
    }
    // Return sorted newest first
    return [...this.sms_logs]
      .map((log) => ({
        ...log,
        message: cleanSmsMessage(log.message || ""),
      }))
      .sort((a, b) => {
        const timeA = new Date(
          a.sent_at || a.attendance_date || a.created_at || 0,
        ).getTime();
        const timeB = new Date(
          b.sent_at || b.attendance_date || b.created_at || 0,
        ).getTime();
        return timeB - timeA;
      });
  }

  async get(table: string) {
    if (table === "sms_logs") {
      return this.getSmsLogs();
    }
    return (this as any)[table] || [];
  }

  async insert(table: string, data: any) {
    const list = (this as any)[table] || [];
    const items = Array.isArray(data) ? data : [data];
    const inserted = items.map((it) => {
      const entry = {
        ...it,
        id:
          it.id && it.id.length > 20 && !it.id.startsWith("id-")
            ? it.id
            : generateUuid(),
        created_at: it.created_at || new Date().toISOString(),
        sent_at: it.sent_at || new Date().toISOString(),
      };
      if (table === "students" && entry.semester !== undefined) {
        entry.semester = parseInt(String(entry.semester), 10) || 1;
      }
      if (table === "sms_logs" && entry.message) {
        entry.message = cleanSmsMessage(entry.message);
      }
      return entry;
    });

    if (table === "sms_logs") {
      list.unshift(...inserted);
    } else {
      list.push(...inserted);
    }
    (this as any)[table] = list;
    this.persist(table);

    // Notify components via CustomEvent
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("edutrack_sms_logs_updated", { detail: inserted }),
      );
      window.dispatchEvent(
        new CustomEvent("edutrack_data_updated", {
          detail: { table, data: list },
        }),
      );
    }

    // Direct background sync to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const payload = inserted.map((item) =>
          sanitizePayloadForSupabase(table, item),
        );
        const { error } = await supabase.from(table).insert(payload);
        if (error) {
          console.error(`Supabase insert error on ${table}:`, error);
          if (table === "students") {
            throw new Error(
              `Student write failed; local rollback required: ${error.message}`,
            );
          }
        } else {
          console.log(
            `Supabase synced ${inserted.length} record(s) into ${table}`,
          );
        }
      } catch (err) {
        console.error(`Supabase insert exception on ${table}:`, err);
        if (table === "students") {
          throw err instanceof Error
            ? err
            : new Error("Student write failed; local rollback required.");
        }
      }
    }

    return inserted;
  }

  async update(table: string, id: string, data: any) {
    const list = (this as any)[table] || [];
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      if (table === "students" && list[idx].semester !== undefined) {
        list[idx].semester = parseInt(String(list[idx].semester), 10) || 1;
      }
      this.persist(table);

      if (isSupabaseConfigured) {
        try {
          const payload = sanitizePayloadForSupabase(table, { ...list[idx] });
          const { error } = await supabase
            .from(table)
            .update(payload)
            .eq("id", id);
          if (error) {
            console.error(`Supabase update error for ${table}:`, error);
          }
        } catch (err) {
          console.error(`Supabase update exception on ${table}:`, err);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("edutrack_data_updated", {
            detail: { table, data: list },
          }),
        );
      }

      return list[idx];
    }
    return null;
  }

  async delete(table: string, id: string) {
    const list = (this as any)[table] || [];
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      this.persist(table);

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from(table).delete().eq("id", id);
          if (error) {
            console.error(`Supabase delete error for ${table}:`, error);
          }
        } catch (err) {
          console.error(`Supabase delete exception on ${table}:`, err);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("edutrack_data_updated", {
            detail: { table, data: list },
          }),
        );
      }

      return true;
    }
    return false;
  }

  async upsertAttendance(records: any[]) {
    for (const rec of records) {
      const idx = this.attendance.findIndex(
        (a) =>
          a.student_id === rec.student_id &&
          a.subject_id === rec.subject_id &&
          a.date === rec.date,
      );
      if (idx !== -1) {
        this.attendance[idx] = { ...this.attendance[idx], ...rec };
      } else {
        this.attendance.push({
          ...rec,
          id: rec.id || generateUuid(),
        });
      }
    }
    this.persist("attendance");

    if (isSupabaseConfigured) {
      try {
        const payload = records.map((r) =>
          sanitizePayloadForSupabase("attendance", r),
        );
        const { error } = await supabase.from("attendance").upsert(payload);
        if (error) {
          console.error("Supabase upsert attendance error:", error);
        }
      } catch (err) {
        console.error("Supabase upsert attendance exception:", err);
      }
    }
  }
}

export const localDb = new LocalDatabase();
