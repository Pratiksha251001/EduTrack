import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Teacher } from "../lib/types";
import { localDb, isSupabaseConfigured } from "../lib/supabase";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Database, Trash2 } from "lucide-react";
import { DatabaseSetupModal } from "../components/DatabaseSetupModal";

export const Teachers: React.FC = () => {
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
        "Are you sure you want to remove ALL default data across departments, faculty, and students? Your institutional database will be reset to 0 records so you can build your own hierarchy.",
      )
    ) {
      localDb.clearAllDefaultData();
      setNotice("All default data removed. You can now add your own faculty teachers, HODs, and coordinators.");
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

      <CrudPage<Teacher>
        title="Teachers & Faculty"
        description="Faculty staff directory including HODs, Class Coordinators (CC), and Lecturers. Accounts link automatically."
        table="teachers"
        searchKeys={["full_name", "employee_id", "email", "mobile", "role"]}
        sortItems={(a, b) =>
          ({ hod: 0, class_coordinator: 1, lecturer: 2 })[a.role] -
          { hod: 0, class_coordinator: 1, lecturer: 2 }[b.role]
        }
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
              title="Remove default sample data to start fresh"
              className="text-xs h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Default Data
            </Button>
          </div>
        }
        fields={[
          { key: "employee_id", label: "College Employee ID Ref No", required: true },
          { key: "full_name", label: "Full Name", required: true },
          { key: "designation", label: "Academic Designation (e.g. Associate Professor, Asst Professor)" },
          { key: "qualification", label: "Highest Qualification (e.g. Ph.D, M.Tech, M.Sc)" },
          { key: "date_of_birth", label: "Date of Birth (YYYY-MM-DD)", type: "text" },
          { key: "experience_years", label: "Year of Experience (e.g. 8 Years)" },
          { key: "email", label: "Email Address", type: "email" },
          { key: "mobile", label: "Mobile Number (Optional)" },
          {
            key: "role",
            label: "Role",
            type: "select",
            required: true,
            defaultValue: "lecturer",
            options: [
              { value: "hod", label: "HOD (Head of Department)" },
              { value: "class_coordinator", label: "Class Coordinator (CC)" },
              { value: "lecturer", label: "Lecturer / Faculty" },
            ],
          },
          {
            key: "assigned_semester",
            label: "Assigned Semester (for Class Coordinator: 1 to 8)",
            type: "select",
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
            label: "Login Password (optional, default will be assigned)",
            type: "password",
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
                  ? `Class Coordinator${t.assigned_semester ? ` (Sem ${t.assigned_semester})` : ""}`
                  : t.role === "hod"
                    ? "HOD"
                    : "Lecturer"}
              </Badge>
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
              <Badge variant={t.user_id ? "success" : "secondary"}>
                {t.user_id ? "Active & Linked" : "Not Registered"}
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
        ]}
      />

      <DatabaseSetupModal open={dbModalOpen} onOpenChange={setDbModalOpen} />
    </div>
  );
};
