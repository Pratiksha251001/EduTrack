import React, { useMemo, useState } from "react";
import { GraduationCap, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

export const HODStudents: React.FC = () => {
  const { user } = useAuth();
  const teachers = localDb.teachers;
  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId = user?.department_id || linkedTeacher?.department_id;
  const department = localDb.departments.find(
    (item) => item.id === departmentId,
  );
  const [students, setStudents] = useState(() =>
    localDb.students.filter((item) => item.department_id === departmentId),
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    roll_number: "",
    full_name: "",
    semester: "1",
    parent_name: "",
    parent_mobile: "",
    email: "",
  });
  const filtered = useMemo(
    () =>
      students.filter((student) => {
        const query = search.toLowerCase();
        return (
          !query ||
          student.full_name.toLowerCase().includes(query) ||
          student.roll_number.toLowerCase().includes(query)
        );
      }),
    [students, search],
  );
  const refresh = () =>
    setStudents(
      localDb.students.filter((item) => item.department_id === departmentId),
    );
  const save = async () => {
    if (
      !form.roll_number.trim() ||
      !form.full_name.trim() ||
      !form.parent_mobile.trim() ||
      !departmentId
    ) {
      alert(
        "Roll number, full name, parent mobile, and department are required.",
      );
      return;
    }
    if (
      localDb.students.some(
        (student) => student.roll_number === form.roll_number.trim(),
      )
    ) {
      alert("This roll number already exists.");
      return;
    }
    await localDb.insert("students", [
      {
        roll_number: form.roll_number.trim(),
        full_name: form.full_name.trim(),
        semester: Number(form.semester),
        parent_name: form.parent_name.trim() || null,
        parent_mobile: form.parent_mobile.trim(),
        email: form.email.trim() || null,
        department_id: departmentId,
        status: "active",
      },
    ]);
    setForm({
      roll_number: "",
      full_name: "",
      semester: "1",
      parent_name: "",
      parent_mobile: "",
      email: "",
    });
    setOpen(false);
    refresh();
  };
  const remove = async (student: (typeof students)[number]) => {
    if (!confirm(`Delete ${student.full_name}?`)) return;
    await localDb.delete("students", student.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            HOD Portal · {department?.code || "Department"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Department Students
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and add students belonging only to{" "}
            {department?.name || "your department"}.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>
      +{" "}
      {open && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Add Student</h2>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Roll Number *"
              value={form.roll_number}
              onChange={(event) =>
                setForm({ ...form, roll_number: event.target.value })
              }
            />
            <Input
              placeholder="Full Name *"
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
            />
            <Select
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
              options={[1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({
                value: String(value),
                label: `Semester ${value}`,
              }))}
            />
            <Input
              placeholder="Parent / Guardian Name"
              value={form.parent_name}
              onChange={(event) =>
                setForm({ ...form, parent_name: event.target.value })
              }
            />
            <Input
              placeholder="Parent Mobile *"
              value={form.parent_mobile}
              onChange={(event) =>
                setForm({ ...form, parent_mobile: event.target.value })
              }
            />
            <Input
              type="email"
              placeholder="Student Email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save}>Save Student</Button>
          </div>
        </Card>
      )}
      +{" "}
      <Card className="p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search students..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground md:col-span-2">
              No students found.
            </p>
          ) : (
            filtered.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{student.full_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {student.roll_number} · Semester {student.semester}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(student)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
