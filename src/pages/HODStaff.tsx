import React, { useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { saveCredential } from "../lib/authUtils";
import { Teacher } from "../lib/types";
import { college } from "../lib/college";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

interface HODStaffProps {
  mode: "teachers" | "coordinators";
}

export const HODStaff: React.FC<HODStaffProps> = ({ mode }) => {
  const { user } = useAuth();
  const teachers = localDb.teachers;
  const departments = localDb.departments;
  const assignments = localDb.class_coordinator_assignments;
  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId = user?.department_id || linkedTeacher?.department_id;
  const department = departments.find((item) => item.id === departmentId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    full_name: "",
    email: "",
    mobile: "",
    password: "",
    role: "lecturer" as Teacher["role"],
  });

  const departmentTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.department_id === departmentId),
    [teachers, departmentId],
  );
  const coordinatorIds = new Set(
    assignments
      .filter((assignment) => assignment.department_id === departmentId)
      .map((assignment) => assignment.teacher_id),
  );
  const visibleTeachers = departmentTeachers.filter((teacher) => {
    if (
      mode === "coordinators" &&
      teacher.role !== "class_coordinator" &&
      !coordinatorIds.has(teacher.id)
    )
      return false;
    const query = search.toLowerCase();
    return (
      !query ||
      teacher.full_name.toLowerCase().includes(query) ||
      teacher.employee_id.toLowerCase().includes(query) ||
      (teacher.email || "").toLowerCase().includes(query)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      employee_id: "",
      full_name: "",
      email: "",
      mobile: "",
      password: "",
      role: mode === "coordinators" ? "class_coordinator" : "lecturer",
    });
    setFormOpen(true);
  };
  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    setForm({
      employee_id: teacher.employee_id,
      full_name: teacher.full_name,
      email: teacher.email || "",
      mobile: teacher.mobile || "",
      password: "",
      role: teacher.role,
    });
    setFormOpen(true);
  };
  const save = async () => {
    if (!form.employee_id.trim() || !form.full_name.trim() || !departmentId) {
      alert("Employee ID, full name, and department are required.");
      return;
    }
    const isCoordinator = form.role === "class_coordinator";
    const data = {
      employee_id: form.employee_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null,
      role: form.role,
      department_id: departmentId,
      is_class_coordinator: isCoordinator,
      status: "active" as const,
    };

    const userRole = isCoordinator ? "class_coordinator" : "teacher";
    const defaultPwd = isCoordinator ? "CC@123" : "Teacher@123";
    const effectivePwd = form.password.trim() || form.employee_id.trim() || defaultPwd;

    if (editing) {
      await localDb.update("teachers", editing.id, data);
      const account = localDb.users.find((u: any) => u.teacher_id === editing.id);
      if (account) {
        await localDb.update("users", account.id, {
          full_name: data.full_name,
          email: data.email || account.email,
          role: userRole,
          department_id: departmentId,
        });
      } else if (data.email || data.employee_id) {
        const accountId = `teacher-user-${editing.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: data.full_name,
            email: data.email || `${data.employee_id.toLowerCase()}@edutrack.edu`,
            role: userRole,
            department_id: departmentId,
            teacher_id: editing.id,
            status: "active",
          },
        ]);
        await localDb.update("teachers", editing.id, { user_id: accountId });
      }

      if (form.password.trim() || !account) {
        saveCredential(
          [
            editing.id,
            account?.id,
            `teacher-user-${editing.id}`,
            data.email,
            data.employee_id,
          ],
          effectivePwd,
        );
      }
    } else {
      const inserted = await localDb.insert("teachers", [data]);
      const teacher = inserted[0];
      if (teacher) {
        const accountId = `teacher-user-${teacher.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: teacher.full_name,
            email: teacher.email || `${teacher.employee_id.toLowerCase()}@edutrack.edu`,
            role: userRole,
            department_id: departmentId,
            teacher_id: teacher.id,
            status: "active",
          },
        ]);
        await localDb.update("teachers", teacher.id, { user_id: accountId });

        saveCredential(
          [
            accountId,
            teacher.id,
            teacher.email,
            teacher.employee_id,
          ],
          effectivePwd,
        );

        if (isCoordinator) {
          await localDb.insert("class_coordinator_assignments", [
            {
              teacher_id: teacher.id,
              department_id: departmentId,
              semester: 1,
              assigned_by: user?.id,
            },
          ]);
        }
      }
    }
    setFormOpen(false);
    window.location.reload();
  };
  const remove = async (teacher: Teacher) => {
    if (!confirm(`Delete ${teacher.full_name}?`)) return;
    await localDb.delete("teachers", teacher.id);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            HOD Portal · {department?.code || "Department"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {mode === "teachers" ? "Department Teachers" : "Class Coordinators"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage{" "}
            {mode === "teachers"
              ? "lecturers and faculty"
              : "coordinator assignments"}{" "}
            for {department?.name || "your department"}.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add{" "}
          {mode === "teachers" ? "Teacher" : "Coordinator"}
        </Button>
      </div>
      {formOpen && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {editing
                ? "Edit Teacher"
                : `Add ${mode === "teachers" ? "Teacher" : "Class Coordinator"}`}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Employee ID *"
              value={form.employee_id}
              onChange={(event) =>
                setForm({ ...form, employee_id: event.target.value })
              }
            />
            <Input
              placeholder="Full Name *"
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <Input
              placeholder="Mobile"
              value={form.mobile}
              onChange={(event) =>
                setForm({ ...form, mobile: event.target.value })
              }
            />
            <Select
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value as Teacher["role"],
                })
              }
              options={[
                { value: "lecturer", label: "Lecturer / Faculty" },
                { value: "class_coordinator", label: "Class Coordinator" },
              ]}
            />
            <div className="space-y-1">
              <Input
                type="password"
                placeholder={
                  editing
                    ? "Update Login Password (leave blank to keep current)"
                    : form.role === "class_coordinator"
                    ? "Login Password (default: CC@123 or Emp ID)"
                    : "Login Password (default: Teacher@123 or Emp ID)"
                }
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Staff can log in using their Employee ID or Email.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save}>
              <Check className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>
        </Card>
      )}
      <Card className="p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${mode}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {visibleTeachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground md:col-span-2">
              No {mode} found in this department.
            </p>
          ) : (
            visibleTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {teacher.full_name}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {teacher.employee_id}
                    </p>
                    <Badge
                      variant={
                        teacher.role === "class_coordinator"
                          ? "outline"
                          : "secondary"
                      }
                      className="mt-1 text-[10px]"
                    >
                      {teacher.role === "class_coordinator"
                        ? "Class Coordinator"
                        : "Lecturer"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(teacher)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(teacher)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
