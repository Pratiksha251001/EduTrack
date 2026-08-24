import React from "react";
import { CrudPage } from "../components/CrudPage";
import { Department } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { localDb } from "../lib/supabase";

export const Departments: React.FC = () => {
  const teachers = localDb.teachers;

  return (
    <CrudPage<Department>
      title="Departments"
      description="Academic departments utilized across subjects, faculty, and student batches."
      table="departments"
      searchKeys={["name", "code", "status"]}
      fields={[
        { key: "name", label: "Department Name", required: true },
        { key: "code", label: "Department Code (e.g. CSE)", required: true },
        {
          key: "hod_id",
          label: "HOD",
          type: "select",
          options: [
            { value: "", label: "Unassigned" },
            ...teachers
              .filter((t) => t.role === "hod")
              .map((t) => ({ value: t.id, label: t.full_name })),
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
            teachers.find((t) => t.id === d.hod_id)?.full_name || "Unassigned",
        },
        {
          header: "Status",
          render: (d) => (
            <Badge variant={d.status === "active" ? "success" : "secondary"}>
              {d.status}
            </Badge>
          ),
        },
        {
          header: "Created Date",
          render: (d) =>
            d.created_at ? new Date(d.created_at).toLocaleDateString() : "—",
        },
      ]}
    />
  );
};
