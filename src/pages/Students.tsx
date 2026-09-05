import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Student } from "../lib/types";
import { localDb, isSupabaseConfigured } from "../lib/supabase";
import { college } from "../lib/college";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Database, Trash2 } from "lucide-react";
import { DatabaseSetupModal } from "../components/DatabaseSetupModal";

export const Students: React.FC = () => {
  const [departments, setDepartments] = useState(localDb.departments);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setDepartments([...localDb.departments]);
    };
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_data_updated", handleUpdate);
    };
  }, []);

  const handleClearDefaultData = () => {
    if (
      window.confirm(
        "Remove all default demo students, attendance, and logs? Your roster will be clean with 0 students, and only newly created students will be stored.",
      )
    ) {
      localDb.clearDemoStudents();
      setNotice("Default demo data removed. You can now add your real students.");
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <CrudPage<Student>
        title="Students"
        description="Student roster and guardian contact registry for absentee SMS communication."
        table="students"
        searchKeys={["full_name", "roll_number", "reg_number", "parent_mobile"]}
        extraHeaderActions={
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                isSupabaseConfigured
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSupabaseConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{isSupabaseConfigured ? "Supabase Live" : "Local Database"}</span>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDbModalOpen(true)}
              className="text-xs h-9 gap-1.5"
            >
              <Database className="h-3.5 w-3.5 text-primary" />
              Database & SQL Query
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDefaultData}
              title="Remove default sample students to start fresh"
              className="text-xs h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Default Data
            </Button>
          </div>
        }
        fields={[
          { key: "roll_number", label: "Roll Number", required: true },
          { key: "reg_number", label: "University Reg Number" },
          { key: "full_name", label: "Student Full Name", required: true },
          {
            key: "department_id",
            label: "Department",
            type: "select",
            options: [
              { value: "", label: "Unassigned" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ],
          },
          {
            key: "semester",
            label: "Semester",
            type: "select",
            required: true,
            options: college.semesters.map((s) => ({
              value: String(s),
              label: `Semester ${s}`,
            })),
          },
          { key: "parent_name", label: "Parent / Guardian Name" },
          { key: "parent_mobile", label: "Parent Mobile (For SMS Alerts)" },
          { key: "student_mobile", label: "Student Mobile" },
          { key: "email", label: "Student Email", type: "email" },
          {
            key: "status",
            label: "Enrollment Status",
            type: "select",
            required: true,
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
        columns={[
          {
            header: "Roll No",
            render: (s) => (
              <span className="font-mono text-xs font-bold text-primary">
                {s.roll_number}
              </span>
            ),
          },
          {
            header: "Reg No",
            render: (s) => (
              <span className="font-mono text-xs text-muted-foreground">
                {s.reg_number || "—"}
              </span>
            ),
          },
          {
            header: "Student Name",
            render: (s) => <span className="font-semibold">{s.full_name}</span>,
          },
          {
            header: "Department",
            render: (s) =>
              departments.find((d) => d.id === s.department_id)?.name || "—",
          },
          {
            header: "Semester",
            render: (s) => (
              <Badge variant="outline">Semester {s.semester}</Badge>
            ),
          },
          {
            header: "Parent / Guardian",
            render: (s) => (
              <div>
                <div className="text-xs font-medium">{s.parent_name || "—"}</div>
                {s.parent_mobile && (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {s.parent_mobile}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: "Contact",
            render: (s) => (
              <div className="text-xs">
                {s.student_mobile && (
                  <div className="font-mono text-muted-foreground">
                    {s.student_mobile}
                  </div>
                )}
                {s.email && (
                  <div className="text-[11px] text-muted-foreground">{s.email}</div>
                )}
              </div>
            ),
          },
          {
            header: "Status",
            render: (s) => (
              <Badge variant={s.status === "active" ? "success" : "secondary"}>
                {s.status}
              </Badge>
            ),
          },
        ]}
      />

      <DatabaseSetupModal open={dbModalOpen} onOpenChange={setDbModalOpen} />
    </div>
  );
};
