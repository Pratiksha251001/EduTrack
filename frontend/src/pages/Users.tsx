import React from "react";
import { CrudPage } from "../components/CrudPage";
import { UserAccount } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { localDb } from "../lib/supabase";

export const Users: React.FC = () => (
  <CrudPage<UserAccount>
    title="Users"
    description="Manage institution accounts and activate or deactivate access where appropriate."
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
        render: (u) => <span className="font-semibold">{u.full_name}</span>,
      },
      { header: "Email", render: (u) => u.email },
      {
        header: "Role",
        render: (u) => <Badge variant="outline">{u.role}</Badge>,
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
