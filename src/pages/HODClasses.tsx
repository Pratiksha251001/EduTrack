import React, { useMemo, useState } from "react";
import { Building2, Check, Edit3, Plus, Search, Trash2, Layers, Filter } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { AcademicClass } from "../lib/types";
import { college, ENGINEERING_YEARS, getEngineeringYearFromSemester, getSemesterEngineeringLabel } from "../lib/college";
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
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicClass | null>(null);
  const [form, setForm] = useState({
    name: "",
    year: "1",
    semester: "1",
    coordinator_teacher_id: "",
  });

  const coordinators = teachers.filter(
    (teacher) =>
      teacher.department_id === departmentId &&
      teacher.role === "class_coordinator" &&
      teacher.status === "active",
  );

  const filtered = useMemo(() => {
    return classes.filter((item) => {
      const itemYear = item.year || getEngineeringYearFromSemester(item.semester);
      
      // Year / Parallel filter
      if (selectedYearFilter === "odd") {
        if (item.semester % 2 === 0) return false;
      } else if (selectedYearFilter === "even") {
        if (item.semester % 2 !== 0) return false;
      } else if (selectedYearFilter !== "all") {
        if (String(itemYear) !== selectedYearFilter) return false;
      }

      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        String(item.semester).includes(q) ||
        getSemesterEngineeringLabel(item.semester).toLowerCase().includes(q)
      );
    });
  }, [classes, search, selectedYearFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", year: "1", semester: "1", coordinator_teacher_id: "" });
    setOpen(true);
  };

  const openEdit = (item: AcademicClass) => {
    setEditing(item);
    const yr = item.year || getEngineeringYearFromSemester(item.semester);
    setForm({
      name: item.name,
      year: String(yr),
      semester: String(item.semester),
      coordinator_teacher_id: item.coordinator_teacher_id || "",
    });
    setOpen(true);
  };

  const handleYearChange = (yearVal: string) => {
    const yr = Number(yearVal) || 1;
    const semDefault = yr === 1 ? "1" : yr === 2 ? "3" : yr === 3 ? "5" : "7";
    setForm((prev) => ({
      ...prev,
      year: yearVal,
      semester: semDefault,
    }));
  };

  // Get semesters for chosen year in form
  const availableSemesters = useMemo(() => {
    const yr = Number(form.year) || 1;
    const yearConfig = ENGINEERING_YEARS.find((y) => y.year === yr);
    return yearConfig ? yearConfig.semesters : [1, 2];
  }, [form.year]);

  const save = async () => {
    if (!form.name.trim() || !departmentId) {
      alert("Class name is required.");
      return;
    }
    const semesterNum = Number(form.semester);
    const yearNum = Number(form.year) || getEngineeringYearFromSemester(semesterNum);

    const data = {
      name: form.name.trim(),
      department_id: departmentId,
      year: yearNum,
      semester: semesterNum,
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
            HOD Portal · {department?.code || "Engineering"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Engineering Classes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure 4-year cohorts (FE, SE, TE, BE), semester sections, and Class Coordinators.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </div>

      {open && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">
                {editing ? "Edit Engineering Class" : "Add Engineering Class"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Select the engineering academic year (FE–BE), corresponding semester, and designated coordinator.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Class / Section Name *
              </label>
              <Input
                placeholder="e.g. SE-CSE-A or FE-Comp-B"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Engineering Year (1–4)
              </label>
              <Select
                value={form.year}
                onChange={(event) => handleYearChange(event.target.value)}
                options={ENGINEERING_YEARS.map((y) => ({
                  value: String(y.year),
                  label: `${y.shortName} · ${y.name}`,
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Semester
              </label>
              <Select
                value={form.semester}
                onChange={(event) =>
                  setForm({ ...form, semester: event.target.value })
                }
                options={availableSemesters.map((sem) => ({
                  value: String(sem),
                  label: `Semester ${sem} (${getSemesterEngineeringLabel(sem)})`,
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Class Coordinator (CC)
              </label>
              <Select
                value={form.coordinator_teacher_id}
                onChange={(event) =>
                  setForm({ ...form, coordinator_teacher_id: event.target.value })
                }
                options={[
                  { value: "", label: "No coordinator assigned" },
                  ...coordinators.map((teacher) => {
                    const yrLabel = teacher.assigned_year
                      ? `${teacher.assigned_year === 1 ? "FE" : teacher.assigned_year === 2 ? "SE" : teacher.assigned_year === 3 ? "TE" : "BE"}`
                      : "";
                    const semLabel = teacher.assigned_semester ? `Sem ${teacher.assigned_semester}` : "";
                    const tag = yrLabel || semLabel ? ` [${[yrLabel, semLabel].filter(Boolean).join(" ")}]` : "";
                    return {
                      value: teacher.id,
                      label: `${teacher.full_name}${tag}`,
                    };
                  }),
                ]}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save}>
              <Check className="mr-2 h-4 w-4" />{" "}
              {editing ? "Update Class" : "Create Class"}
            </Button>
          </div>
        </Card>
      )}

      {/* Filter Tabs & Search */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search classes (e.g. SE, CSE-A, Sem 3)..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {/* 4-Year Engineering & Parallel Track Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Track:
            </span>
            <button
              onClick={() => setSelectedYearFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedYearFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Years (1–4)
            </button>
            <button
              onClick={() => setSelectedYearFilter("odd")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedYearFilter === "odd"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Parallel Odd (1, 3, 5, 7)
            </button>
            <button
              onClick={() => setSelectedYearFilter("even")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedYearFilter === "even"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Parallel Even (2, 4, 6, 8)
            </button>
            {ENGINEERING_YEARS.map((y) => (
              <button
                key={y.year}
                onClick={() => setSelectedYearFilter(String(y.year))}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedYearFilter === String(y.year)
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {y.shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              No classes found for the selected filter.
            </p>
          ) : (
            filtered.map((item) => {
              const coordinator = teachers.find(
                (teacher) => teacher.id === item.coordinator_teacher_id,
              );
              const yearNum = item.year || getEngineeringYearFromSemester(item.semester);
              const yearObj = ENGINEERING_YEARS.find((y) => y.year === yearNum);
              const isOdd = item.semester % 2 !== 0;

              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-xl border border-border p-4 bg-card hover:border-primary/40 transition-all shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {yearObj?.shortName || `Y${yearNum}`}
                      </div>
                      <div>
                        <p className="font-display font-bold text-base">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {yearObj?.name || `${yearNum}th Year`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Semester {item.semester} ({getSemesterEngineeringLabel(item.semester)})
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          isOdd ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                        }`}
                      >
                        {isOdd ? "Odd Track" : "Even Track"}
                      </Badge>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground block">
                        Class Coordinator:
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {coordinator ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {coordinator.full_name} ({coordinator.employee_id})
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground font-normal">
                            Not assigned
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      title="Edit class"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item)}
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete class"
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
