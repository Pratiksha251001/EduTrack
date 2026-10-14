import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Student } from "../lib/types";
import { localDb } from "../lib/supabase";
import { college } from "../lib/college";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { StudentImportModal } from "../components/StudentImportModal";
import { StudentDetailsModal } from "../components/StudentDetailsModal";

export const Students: React.FC = () => {
  const [departments, setDepartments] = useState(localDb.departments);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setDepartments([...localDb.departments]);
    };
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_data_updated", handleUpdate);
    };
  }, []);

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
        table="students"
        searchKeys={["full_name", "roll_number", "parent_mobile"]}
        extraHeaderActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="text-xs h-9 gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
              Import Students
            </Button>
          </div>
        }
        fields={[
          { key: "roll_number", label: "Roll Number", required: true },
          { key: "full_name", label: "Student Full Name", required: true },
          {
            key: "department_id",
            label: "Department",
            type: "select",
            required: true,
            options: [
              { value: "", label: "Unassigned" },
              ...departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` })),
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
          { key: "class_name", label: "Class / Division" },
          { key: "parent_name", label: "Parent / Guardian Name", required: true },
          {
            key: "parent_mobile",
            label: "Parent Mobile",
            required: true,
          },
          {
            key: "student_mobile",
            label: "Student Mobile",
          },
          { key: "email", label: "Student Email", type: "email", required: true },
        ]}
        columns={[
          {
            header: "Roll No",
            render: (s) => (
              <button
                type="button"
                onClick={() => setSelectedStudent(s)}
                className="font-mono text-xs font-bold text-primary hover:underline"
              >
                {s.roll_number}
              </button>
            ),
          },
          {
            header: "Student Name",
            render: (s) => <span className="font-semibold">{s.full_name}</span>,
          },
          {
            header: "Department",
            render: (s) => {
              const dept = departments.find((d) => d.id === s.department_id);
              return (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                  {dept?.code || "—"}
                </span>
              );
            },
          },
          {
            header: "Semester",
            render: (s) => (
              <Badge variant="outline">Semester {s.semester}</Badge>
            ),
          },
          {
            header: "Class / Division",
            render: (s) => s.class_name || s.section || "—",
          },
          {
            header: "Parent / Guardian",
            render: (s) => (
              <div>
                <div className="text-xs font-medium">
                  {s.parent_name || "—"}
                </div>
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
                  <div className="text-[11px] text-muted-foreground">
                    {s.email}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      <StudentImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        defaultSemester={1}
        onImportComplete={(count) => {
          setNotice(
            `${count} student${count === 1 ? "" : "s"} imported successfully.`,
          );
          setTimeout(() => setNotice(null), 4000);
        }}
      />
      <StudentDetailsModal
        student={selectedStudent}
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
        departmentName={
          selectedStudent
            ? departments.find((d) => d.id === selectedStudent.department_id)
                ?.name
            : undefined
        }
      />
    </div>
  );
};
