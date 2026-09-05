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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
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

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "placeholder-key";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("placeholder") &&
    supabaseKey !== "placeholder-key" &&
    supabaseKey !== "your-anon-key-here",
);

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

  constructor() {
    if (isSupabaseConfigured) {
      this.syncFromSupabase();
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

      // If user cleared default data, do not seed mock students, attendance, or sms logs
      if (
        isDemoCleared &&
        (table === "students" || table === "attendance" || table === "sms_logs")
      ) {
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
   * Clears default / mock student roster, attendance records, and SMS logs
   * so the application starts with a pristine, clean slate.
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
   * Restore demo data if desired
   */
  public restoreDemoData() {
    localStorage.removeItem(`${this.storageKey}_demo_cleared`);
    this.students = [...mockStudents];
    this.attendance = [...mockAttendance];
    this.sms_logs = [...mockSmsLogs];
    this.persist("students");
    this.persist("attendance");
    this.persist("sms_logs");

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("edutrack_data_updated", {
          detail: { table: "students", data: this.students },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("edutrack_sms_logs_updated", { detail: this.sms_logs }),
      );
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
        id: it.id && it.id.length > 20 && !it.id.startsWith("id-") ? it.id : generateUuid(),
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
        new CustomEvent("edutrack_data_updated", { detail: { table, data: list } }),
      );
    }

    // Direct background sync to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const payload = inserted.map((item) => {
          const copy = { ...item };
          for (const key of Object.keys(copy)) {
            // Nullify empty string IDs to avoid Postgres UUID parse failure
            if (copy[key] === "" && (key.endsWith("_id") || key === "user_id")) {
              copy[key] = null;
            }
          }
          return copy;
        });
        const { error } = await supabase.from(table).insert(payload);
        if (error) {
          console.error(`Supabase insert error on ${table}:`, error);
        } else {
          console.log(`Supabase synced ${inserted.length} record(s) into ${table}`);
        }
      } catch (err) {
        console.error(`Supabase insert exception on ${table}:`, err);
      }
    }

    return inserted;
  }

  async update(table: string, id: string, data: any) {
    const list = (this as any)[table];
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      if (table === "students" && list[idx].semester !== undefined) {
        list[idx].semester = parseInt(String(list[idx].semester), 10) || 1;
      }
      this.persist(table);

      if (isSupabaseConfigured) {
        try {
          const copy = { ...data };
          for (const key of Object.keys(copy)) {
            if (copy[key] === "" && (key.endsWith("_id") || key === "user_id")) {
              copy[key] = null;
            }
          }
          if (table === "students" && copy.semester !== undefined) {
            copy.semester = parseInt(String(copy.semester), 10) || 1;
          }
          const { error } = await supabase.from(table).update(copy).eq("id", id);
          if (error) {
            console.error(`Supabase update error for ${table}:`, error);
          }
        } catch (err) {
          console.error(`Supabase update exception on ${table}:`, err);
        }
      }

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
        const { error } = await supabase.from("attendance").upsert(records);
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
