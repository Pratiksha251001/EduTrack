import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Teacher } from "../lib/types";
import { ACADEMIC_YEARS, CURRENT_ACADEMIC_YEAR, college } from "../lib/college";
import { localDb } from "../lib/supabase";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { TeacherImportModal } from "../components/TeacherImportModal";

export const Teachers: React.FC = () => {
  const [departments, setDepartments] = useState(localDb.departments);
  const [notice, setNotice] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

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
        "Are you sure you want to remove ALL default data across departments, faculty, and students? Your institutional database will be reset to 0 records so you can build your own hierarchy.",
      )
    ) {
      localDb.clearAllDefaultData();
      setNotice(
        "All default data removed. You can now add your own faculty teachers, HODs, and coordinators.",
      );
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}
      <CrudPage<Teacher>
        title="Teachers & Faculty"
        table="teachers"
        searchKeys={["full_name", "employee_id", "email", "mobile", "role"]}
        sortItems={(a, b) =>
          ({ hod: 0, class_coordinator: 1, lecturer: 2 })[a.role] -
          { hod: 0, class_coordinator: 1, lecturer: 2 }[b.role]
        }
        extraHeaderActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="text-xs h-9 gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              Import Teachers (Excel / CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDefaultData}
              title="Remove default sample data to start fresh"
              className="text-xs h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Default Data
            </Button>
          </div>
        }
        emptyStateAction={{
          label: "Restore sample teachers",
          onClick: () => localDb.restoreDemoData(),
        }}
        fields={[
          {
            key: "employee_id",
            label: "College Employee ID Ref No",
            required: true,
          },
          { key: "full_name", label: "Full Name", required: true },
          { key: "email", label: "Email Address", type: "email", required: true },
          {
            key: "mobile",
            label: "Mobile Number (Optional)",
          },
          {
            key: "role",
            label: "Role",
            type: "select",
            required: true,
            defaultValue: "lecturer",
            options: [
              {
                value: "hod",
                label: "HOD",
              },
              {
                value: "class_coordinator",
                label: "Class Coordinator",
              },
              { value: "lecturer", label: "Lecturer" },
            ],
          },
          {
            key: "assigned_semester",
            label: "Assigned Semester",
            type: "select",
            visibleWhen: (data) => data.role === "lecturer",
            options: [
              { value: "", label: "Not Assigned" },
              { value: "1", label: "Semester 1" },
              { value: "2", label: "Semester 2" },
              { value: "3", label: "Semester 3" },
              { value: "4", label: "Semester 4" },
              { value: "5", label: "Semester 5" },
              { value: "6", label: "Semester 6" },
              { value: "7", label: "Semester 7" },
              { value: "8", label: "Semester 8" },
            ],
          },
          {
            key: "assigned_year",
            label: "Engineering Year",
            type: "select",
            visibleWhen: (data) => data.role === "lecturer",
            options: college.engineeringYears.map((year) => ({
              value: String(year),
              label: `${["FY", "SY", "TY", "BE"][year - 1]} · Year ${year}`,
            })),
          },
          {
            key: "academic_year",
            label: "Academic Session",
            type: "select",
            visibleWhen: (data) =>
              data.role === "hod" || data.role === "class_coordinator",
            defaultValue: CURRENT_ACADEMIC_YEAR,
            options: ACADEMIC_YEARS.map((year) => ({
              value: year,
              label: year,
            })),
          },
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
            key: "password",
            label: "Login Password",
            type: "password",
            helperText:
              "Selecting a role fills its default: Hod@123 for HOD, Cc@123 for coordinator, or Teacher@123 for faculty.",
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
        ]}
        columns={[
          {
            header: "College Emp ID",
            render: (t) => (
              <span className="font-mono text-xs font-bold">
                {t.employee_id}
              </span>
            ),
          },
          {
            header: "Faculty Name",
            render: (t) => <span className="font-semibold block">{t.full_name}</span>,
          },
          {
            header: "Role",
            render: (t) => (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  t.role === "hod"
                    ? "bg-primary/10 text-primary border-primary/25 font-semibold"
                    : t.role === "class_coordinator"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                      : "bg-muted/60 text-muted-foreground border-border/60"
                }`}
              >
                {t.role === "class_coordinator"
                  ? `Class Coordinator${t.assigned_semester ? ` (Sem ${t.assigned_semester})` : ""}`
                  : t.role === "hod"
                    ? "HOD & Lecturer"
                    : "Lecturer"}
              </span>
            ),
          },
          {
            header: "Department",
            render: (t) =>
              departments.find((d) => d.id === t.department_id)?.name || "—",
          },
          { header: "Email", render: (t) => t.email || "—" },
          { header: "Mobile", render: (t) => t.mobile || "—" },
          {
            header: "Account Status",
            render: (t) => (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                  t.user_id
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-muted/40 text-muted-foreground border-border/60"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${t.user_id ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                />
                {t.user_id ? "Active & Linked" : "Not Registered"}
              </span>
            ),
          },
          {
            header: "Status",
            render: (t) => (
              <span
                className={`text-xs font-medium ${
                  t.status === "active"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              >
                {t.status === "active" ? "Active" : "Inactive"}
              </span>
            ),
          },
        ]}
      />

      <TeacherImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={(count) => {
          setNotice(
            `${count} faculty member${count === 1 ? "" : "s"} imported successfully.`,
          );
          setTimeout(() => setNotice(null), 4000);
        }}
      />
    </div>
  );
};
