import React from "react";
import { CrudPage } from "../components/CrudPage";
import { Teacher } from "../lib/types";
import { localDb } from "../lib/supabase";
import { Badge } from "../components/ui/badge";

export const Teachers: React.FC = () => {
  const departments = localDb.departments;

  return (
    <CrudPage<Teacher>
      title="Teachers"
      description="Faculty staff directory. Accounts link automatically when signing up with corresponding emails."
      table="teachers"
      searchKeys={["full_name", "employee_id", "email", "mobile", "role"]}
      sortItems={(a, b) =>
        ({ hod: 0, class_coordinator: 1, lecturer: 2 })[a.role] -
        { hod: 0, class_coordinator: 1, lecturer: 2 }[b.role]
      }
      fields={[
        { key: "employee_id", label: "College Employee ID Ref No", required: true },
        { key: "full_name", label: "Full Name", required: true },
        { key: "designation", label: "Academic Designation (e.g. Associate Professor)" },
        { key: "qualification", label: "Highest Qualification (e.g. Ph.D, M.Tech)" },
        { key: "date_of_birth", label: "Date of Birth (YYYY-MM-DD)", type: "text" },
        { key: "experience_years", label: "Year of Experience (e.g. 8 Years)" },
        { key: "email", label: "Email Address", type: "email" },
        { key: "mobile", label: "Mobile Number (Optional)" },
        {
          key: "password",
          label: "Login Password (required for HOD)",
          type: "password",
        },
        {
          key: "role",
          label: "Role",
          type: "select",
          required: true,
          defaultValue: "lecturer",
          options: [
            { value: "hod", label: "HOD" },
            { value: "class_coordinator", label: "Class Coordinator" },
            { value: "lecturer", label: "Lecturer" },
          ],
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          defaultValue: "active",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
        {
          key: "department_id",
          label: "Department",
          type: "select",
          options: departments.map((d) => ({ value: d.id, label: d.name })),
        },
      ]}
      columns={[
        {
          header: "College Emp ID",
          render: (t) => (
            <span className="font-mono text-xs font-bold">{t.employee_id}</span>
          ),
        },
        {
          header: "Faculty Name",
          render: (t) => (
            <div>
              <span className="font-semibold block">{t.full_name}</span>
              {t.designation && (
                <span className="text-[11px] text-muted-foreground">{t.designation}</span>
              )}
            </div>
          ),
        },
        {
          header: "Qualification",
          render: (t) => t.qualification || "—",
        },
        {
          header: "Experience",
          render: (t) =>
            t.experience_years
              ? String(t.experience_years).includes("Year")
                ? t.experience_years
                : `${t.experience_years} Yrs`
              : "—",
        },
        { header: "Email", render: (t) => t.email || "—" },
        { header: "Mobile", render: (t) => t.mobile || "—" },
        {
          header: "Department",
          render: (t) =>
            departments.find((d) => d.id === t.department_id)?.name || "—",
        },
        {
          header: "Account Status",
          render: (t) => (
            <Badge variant={t.user_id ? "success" : "secondary"}>
              {t.user_id ? "Linked" : "Not Registered"}
            </Badge>
          ),
        },
        {
          header: "Status",
          render: (t) => (
            <Badge variant={t.status === "active" ? "success" : "secondary"}>
              {t.status}
            </Badge>
          ),
        },
        {
          header: "Role",
          render: (t) => (
            <Badge
              variant={
                t.role === "hod"
                  ? "default"
                  : t.role === "class_coordinator"
                    ? "outline"
                    : "secondary"
              }
            >
              {t.role === "class_coordinator"
                ? "Class Coordinator"
                : t.role === "hod"
                  ? "HOD"
                  : "Lecturer"}
            </Badge>
          ),
        },
      ]}
    />
  );
};
