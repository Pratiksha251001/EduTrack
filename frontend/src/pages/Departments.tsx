import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Department } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { localDb } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Trash2 } from "lucide-react";

export const Departments: React.FC = () => {
  const [teachers, setTeachers] = useState(localDb.teachers);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setTeachers([...localDb.teachers]);
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

      <CrudPage<Department>
        title="Departments"
        table="departments"
        searchKeys={["name", "code", "status"]}
        fields={[
          { key: "name", label: "Department Name", required: true },
          { key: "code", label: "Department Code (e.g. CSE)", required: true },
          {
            key: "hod_id",
            label: "HOD (Department Head & Senior Lecturer)",
            type: "select",
            helperText:
              "Assign a faculty member as Head of Department. HODs can also teach subjects & mark lecture attendance.",
            options: [
              { value: "", label: "Unassigned (Assign later or leave empty)" },
              ...teachers.map((t) => ({
                value: t.id,
                label: `${t.full_name} (${t.employee_id}${t.role === "hod" ? " - HOD" : " - " + t.role})`,
              })),
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
        ]}
        columns={[
          {
            header: "Department Name",
            render: (d) => <span className="font-semibold">{d.name}</span>,
          },
          {
            header: "Code",
            render: (d) => <span className="font-mono text-xs">{d.code}</span>,
          },
          {
            header: "HOD",
            render: (d) =>
              teachers.find((t) => t.id === d.hod_id)?.full_name ||
              "Unassigned",
          },
          {
            header: "Status",
            render: (d) => (
              <Badge variant={d.status === "active" ? "success" : "secondary"}>
                {d.status}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
};
