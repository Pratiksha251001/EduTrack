import React, { useMemo, useState } from "react";
import { Building2, Check, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { AcademicClass } from "../lib/types";
import { college } from "../lib/college";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Badge } from "../components/ui/badge";

export const HODClasses: React.FC = () => {
  const { user } = useAuth();
  const teachers = localDb.teachers;
  const departments = localDb.departments;
  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId = user?.department_id || linkedTeacher?.department_id;
  const department = departments.find((item) => item.id === departmentId);
  const [classes, setClasses] = useState<AcademicClass[]>(
    localDb.academic_classes.filter(
      (item) => item.department_id === departmentId,
    ),
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicClass | null>(null);
  const [form, setForm] = useState({
    name: "",
    semester: "1",
    coordinator_teacher_id: "",
  });
  const coordinators = teachers.filter(
    (teacher) =>
      teacher.department_id === departmentId &&
      teacher.role === "class_coordinator" &&
      teacher.status === "active",
  );
  const filtered = useMemo(
    () =>
      classes.filter(
        (item) =>
          !search ||
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          String(item.semester).includes(search),
      ),
    [classes, search],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", semester: "1", coordinator_teacher_id: "" });
    setOpen(true);
  };
  const openEdit = (item: AcademicClass) => {
    setEditing(item);
    setForm({
      name: item.name,
      semester: String(item.semester),
      coordinator_teacher_id: item.coordinator_teacher_id || "",
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim() || !departmentId) {
      alert("Class name is required.");
      return;
    }
    const data = {
      name: form.name.trim(),
      department_id: departmentId,
      semester: Number(form.semester),
      coordinator_teacher_id: form.coordinator_teacher_id || null,
      status: "active" as const,
    };
    if (editing) await localDb.update("academic_classes", editing.id, data);
    else await localDb.insert("academic_classes", [data]);
    setClasses(
      localDb.academic_classes.filter(
        (item) => item.department_id === departmentId,
      ),
    );
    setOpen(false);
  };
  const remove = async (item: AcademicClass) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    await localDb.delete("academic_classes", item.id);
    setClasses(
      localDb.academic_classes.filter(
        (entry) => entry.department_id === departmentId,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            HOD Portal · {department?.code || "Department"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Department Classes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage classes for{" "}
            {department?.name || "your department"}.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </div>
      +{" "}
      {open && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {editing ? "Edit Class" : "Add Class"}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              placeholder="Class name (e.g. CSE-A)"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
            <Select
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
              options={college.semesters.map((semester) => ({
                value: String(semester),
                label: `Semester ${semester}`,
              }))}
            />
            <Select
              value={form.coordinator_teacher_id}
              onChange={(event) =>
                setForm({ ...form, coordinator_teacher_id: event.target.value })
              }
              options={[
                { value: "", label: "No coordinator" },
                ...coordinators.map((teacher) => ({
                  value: teacher.id,
                  label: teacher.full_name,
                })),
              ]}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save}>
              <Check className="mr-2 h-4 w-4" />{" "}
              {editing ? "Update Class" : "Create Class"}
            </Button>
          </div>
        </Card>
      )}
      +{" "}
      <Card className="p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search classes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              No classes found.
            </p>
          ) : (
            filtered.map((item) => {
              const coordinator = teachers.find(
                (teacher) => teacher.id === item.coordinator_teacher_id,
              );
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <p className="font-display font-bold">{item.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Semester {item.semester}
                    </p>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {coordinator?.full_name || "Coordinator unassigned"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
