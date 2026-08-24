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

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

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

  private load<T>(table: string, fallback: T[]): T[] {
    try {
      const saved = localStorage.getItem(`${this.storageKey}_${table}`);
      return saved ? JSON.parse(saved) : [...fallback];
    } catch {
      return [...fallback];
    }
  }

  private persist(table: string) {
    localStorage.setItem(
      `${this.storageKey}_${table}`,
      JSON.stringify((this as any)[table]),
    );
  }

  async get(table: string) {
    return (this as any)[table] || [];
  }

  async insert(table: string, data: any) {
    const list = (this as any)[table];
    const items = Array.isArray(data) ? data : [data];
    const inserted = items.map((it) => ({
      ...it,
      id:
        it.id || `id-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    }));
    list.push(...inserted);
    this.persist(table);
    return inserted;
  }

  async update(table: string, id: string, data: any) {
    const list = (this as any)[table];
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      this.persist(table);
      return list[idx];
    }
    return null;
  }

  async delete(table: string, id: string) {
    const list = (this as any)[table];
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      this.persist(table);
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
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        });
      }
    }
    this.persist("attendance");
  }
}

export const localDb = new LocalDatabase();
