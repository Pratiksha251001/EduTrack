import React from "react";
import { CrudPage } from "../components/CrudPage";
import { UserAccount } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { localDb } from "../lib/supabase";

export const Users: React.FC = () => (
  <CrudPage<UserAccount>
    title="Users"
    table="users"
    searchKeys={["full_name", "email", "role", "status"]}
    fields={[
      { key: "full_name", label: "Full Name", required: true },
      { key: "email", label: "Email Address", type: "email", required: true },
      {
        key: "role",
        label: "Role",
        type: "select",
        required: true,
        options: [
          { value: "admin", label: "Admin" },
          { value: "hod", label: "HOD" },
          { value: "teacher", label: "Teacher" },
          { value: "class_coordinator", label: "Class Coordinator" },
          { value: "student", label: "Student" },
        ],
      },
      {
        key: "department_id",
        label: "Department",
        type: "select",
        options: [
          { value: "", label: "Unassigned" },
          ...localDb.departments.map((d) => ({ value: d.id, label: d.name })),
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "active",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ]}
    columns={[
      {
        header: "Name",
        render: (u) => (
          <div>
            <span className="font-semibold text-foreground text-sm">{u.full_name}</span>
            {u.student_id && (
              <span className="block text-[11px] font-mono text-muted-foreground">
                Roll No: {localDb.students.find((s) => s.id === u.student_id)?.roll_number || "—"}
              </span>
            )}
            {u.teacher_id && (
              <span className="block text-[11px] font-mono text-muted-foreground">
                EMP: {localDb.teachers.find((t) => t.id === u.teacher_id)?.employee_id || "—"}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Email",
        render: (u) => <span className="text-xs text-muted-foreground font-mono">{u.email}</span>,
      },
      {
        header: "Role",
        render: (u) => {
          const roleConfig: Record<string, { label: string; className: string }> = {
            admin: { label: "Admin", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
            hod: { label: "HOD", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
            class_coordinator: { label: "Coordinator", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
            teacher: { label: "Teacher", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
            student: { label: "Student", className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
          };
          const cfg = roleConfig[u.role] || { label: u.role, className: "" };
          return <Badge variant="outline" className={`text-xs font-semibold ${cfg.className}`}>{cfg.label}</Badge>;
        },
      },
      {
        header: "Department",
        render: (u) => {
          if (!u.department_id) return <span className="text-xs text-muted-foreground">—</span>;
          const dept = localDb.departments.find((d) => d.id === u.department_id);
          return (
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
              {dept?.code || "—"}
            </span>
          );
        },
      },
      {
        header: "Status",
        render: (u) => (
          <Badge variant={u.status === "active" ? "success" : "secondary"}>
            {u.status}
          </Badge>
        ),
      },
    ]}
  />
);
