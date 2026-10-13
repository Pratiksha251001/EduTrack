import React, { useMemo, useState, useEffect } from "react";
import {
  Building2,
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  Layers,
  Filter,
  Users,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { localDb } from "../lib/supabase";
import { AcademicClass } from "../lib/types";
import {
  college,
  ENGINEERING_YEARS,
  getEngineeringYearFromSemester,
  getSemesterEngineeringLabel,
} from "../lib/college";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";

export const HODClasses: React.FC = () => {
  const { user } = useAuth();
  const teachers = localDb.teachers;
  const departments = localDb.departments;
  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId = user?.department_id || linkedTeacher?.department_id;
  const department = departments.find((item) => item.id === departmentId);

  const [classes, setClasses] = useState<AcademicClass[]>(() =>
    localDb.academic_classes.filter(
      (item) => item.department_id === departmentId,
    ),
  );
  const [search, setSearch] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicClass | null>(null);
  const [divisionNotice, setDivisionNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    year: "2",
    division: "A",
    semester: "3",
    coordinator_teacher_id: "",
  });

  const refreshClasses = () => {
    setClasses(
      localDb.academic_classes.filter(
        (item) => item.department_id === departmentId,
      ),
    );
  };

  useEffect(() => {
    const handleUpdate = () => refreshClasses();
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () => window.removeEventListener("edutrack_data_updated", handleUpdate);
  }, [departmentId]);

  const coordinators = teachers.filter(
    (teacher) =>
      teacher.department_id === departmentId &&
      teacher.role === "class_coordinator" &&
      teacher.status === "active",
  );

  const filtered = useMemo(() => {
    return classes.filter((item) => {
      const itemYear = item.year || getEngineeringYearFromSemester(item.semester);

      // Year / Track filter
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
    const deptCode = department?.code || "CSE";
    setForm({
      name: `SY ${deptCode}-A`,
      year: "2",
      division: "A",
      semester: "3",
      coordinator_teacher_id: "",
    });
    setOpen(true);
  };

  const openEdit = (item: AcademicClass) => {
    setEditing(item);
    const yr = item.year || getEngineeringYearFromSemester(item.semester);
    let div = "A";
    if (item.name.includes("-B") || item.name.endsWith(" B")) div = "B";
    else if (item.name.includes("-C") || item.name.endsWith(" C")) div = "C";

    setForm({
      name: item.name,
      year: String(yr),
      division: div,
      semester: String(item.semester),
      coordinator_teacher_id: item.coordinator_teacher_id || "",
    });
    setOpen(true);
  };

  const handleYearChange = (yearVal: string) => {
    const yr = Number(yearVal) || 1;
    const semDefault = yr === 1 ? "1" : yr === 2 ? "3" : yr === 3 ? "5" : "7";
    const code = yr === 1 ? "FY" : yr === 2 ? "SY" : yr === 3 ? "TY" : "BE";
    const deptCode = department?.code || "CSE";
    const divPart = yr === 1 ? "" : `-${form.division}`;
    const autoName = `${code} ${deptCode}${divPart}`;

    setForm((prev) => ({
      ...prev,
      year: yearVal,
      semester: semDefault,
      name: autoName,
    }));
  };

  const handleDivisionChange = (divVal: string) => {
    const yr = Number(form.year) || 2;
    const code = yr === 1 ? "FY" : yr === 2 ? "SY" : yr === 3 ? "TY" : "BE";
    const deptCode = department?.code || "CSE";
    const divPart = yr === 1 ? "" : `-${divVal}`;
    const autoName = `${code} ${deptCode}${divPart}`;

    setForm((prev) => ({
      ...prev,
      division: divVal,
      name: autoName,
    }));
  };

  // Available semesters for chosen year
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

    refreshClasses();
    setOpen(false);
  };

  const remove = async (item: AcademicClass) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    await localDb.delete("academic_classes", item.id);
    refreshClasses();
  };

  const handleSetupStandardDivisions = () => {
    if (!departmentId) return;
    localDb.ensureStandardEngineeringDivisions(departmentId);
    refreshClasses();
    setDivisionNotice(
      "Standard Divisions (A & B) for 2nd Year (SY), 3rd Year (TY), and 4th Year (BE) verified and configured successfully!",
    );
    setTimeout(() => setDivisionNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
              HOD PORTAL · {department?.code || "ENGINEERING"}
            </Badge>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Engineering Classes & Divisions
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetupStandardDivisions}
            className="gap-1.5 border-border hover:border-primary/50 text-xs h-9"
            title="Automatically ensure Division A and Division B for 2nd, 3rd, and 4th years"
          >
            <Layers className="h-4 w-4 text-emerald-600" />
            <span>Setup Standard Divisions (A &amp; B)</span>
          </Button>

          <Button size="sm" onClick={openAdd} className="gap-1.5 text-xs h-9">
            <Plus className="h-4 w-4" /> Add Class
          </Button>
        </div>
      </div>

      {divisionNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>{divisionNotice}</span>
          </div>
          <button
            onClick={() => setDivisionNotice(null)}
            className="text-muted-foreground hover:text-foreground font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add / Edit Class Dialog */}
      {open && (
        <Card className="border-primary/30 bg-primary/[0.03] p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">
                {editing ? "Edit Engineering Class" : "Add Engineering Class & Division"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Set Year (1-4), Division (A or B for 2nd, 3rd, 4th), Semester, and Class Coordinator.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              ✕
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Engineering Year
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
                Division
              </label>
              <Select
                value={form.division}
                onChange={(event) => handleDivisionChange(event.target.value)}
                options={
                  form.year === "1"
                    ? [
                        { value: "A", label: "Single Division (A)" },
                        { value: "common", label: "Common Cohort" },
                      ]
                    : [
                        { value: "A", label: "Division A" },
                        { value: "B", label: "Division B" },
                      ]
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Class / Section Name *
              </label>
              <Input
                placeholder="e.g. SY CSE-A or BE CSE-B"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
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
                      ? `${teacher.assigned_year === 1 ? "FY" : teacher.assigned_year === 2 ? "SY" : teacher.assigned_year === 3 ? "TY" : "BE"}`
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

          <div className="mt-4 flex justify-end gap-2 border-t border-border/60 pt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              <Check className="mr-2 h-4 w-4" />{" "}
              {editing ? "Update Class" : "Create Class"}
            </Button>
          </div>
        </Card>
      )}

      {/* Filter Tabs & Search */}
      <div className="surface-panel p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-xs"
              placeholder="Search classes (e.g. SY-A, BE-B, CSE, Sem 7)..."
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
              Odd Track (1, 3, 5, 7)
            </button>
            <button
              onClick={() => setSelectedYearFilter("even")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedYearFilter === "even"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Even Track (2, 4, 6, 8)
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

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
          <span>
            Total Classes: <strong className="text-foreground">{filtered.length}</strong>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Structure: 1st Year (Single) · 2nd, 3rd, 4th Year (Div A &amp; B)
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABULAR VIEW FOR CLASSES */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader className="bg-muted/70 border-b border-border">
              <TableRow>
                <TableHead className="w-12 text-center font-bold">#</TableHead>
                <TableHead className="min-w-[150px] font-bold">Class / Section</TableHead>
                <TableHead className="min-w-[130px] font-bold">Engineering Year</TableHead>
                <TableHead className="min-w-[110px] text-center font-bold">Division</TableHead>
                <TableHead className="min-w-[160px] font-bold">Semester &amp; Track</TableHead>
                <TableHead className="min-w-[180px] font-bold">Class Coordinator (CC)</TableHead>
                <TableHead className="min-w-[100px] text-center font-bold">Enrolled Students</TableHead>
                <TableHead className="min-w-[100px] text-right font-bold pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-14 text-center text-muted-foreground"
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        No classes found for the selected filter
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click &quot;Setup Standard Divisions (A &amp; B)&quot; to automatically
                        create divisions for 2nd, 3rd, and 4th years, or add classes manually.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSetupStandardDivisions}
                          className="gap-1.5"
                        >
                          <Layers className="h-4 w-4 text-emerald-600" />
                          Setup Standard Divisions
                        </Button>
                        <Button size="sm" onClick={openAdd} className="gap-1.5">
                          <Plus className="h-4 w-4" />
                          Add Class Manually
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item, idx) => {
                  const coordinator = teachers.find(
                    (teacher) => teacher.id === item.coordinator_teacher_id,
                  );
                  const yearNum = item.year || getEngineeringYearFromSemester(item.semester);
                  const yearObj = ENGINEERING_YEARS.find((y) => y.year === yearNum);
                  const isOdd = item.semester % 2 !== 0;

                  // Detect division
                  let divLabel = "Single";
                  let divBadgeVariant: "default" | "secondary" | "outline" = "outline";
                  if (item.name.includes("-A") || item.name.endsWith(" A") || item.name.includes("Div A")) {
                    divLabel = "Div A";
                    divBadgeVariant = "default";
                  } else if (item.name.includes("-B") || item.name.endsWith(" B") || item.name.includes("Div B")) {
                    divLabel = "Div B";
                    divBadgeVariant = "secondary";
                  }

                  const enrolledStudentsCount = localDb.students.filter(
                    (st) =>
                      st.class_id === item.id ||
                      st.class_name === item.name ||
                      (st.semester === item.semester && st.class_name === item.name),
                  ).length;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`text-[10px] font-bold ${
                              yearNum === 1
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
                                : yearNum === 2
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25"
                                  : yearNum === 3
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25"
                            }`}
                          >
                            {yearObj?.shortName || `Y${yearNum}`}
                          </Badge>
                          <span className="text-muted-foreground text-[11px]">
                            {yearObj?.name || `${yearNum}th Year`}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={divBadgeVariant}
                          className={`text-[10px] font-bold px-2 py-0.5 ${
                            divLabel === "Div A"
                              ? "bg-primary/10 text-primary border-primary/25"
                              : divLabel === "Div B"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                : ""
                          }`}
                        >
                          {divLabel}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Sem {item.semester}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] ${
                              isOdd
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                            }`}
                          >
                            {isOdd ? "Odd Track" : "Even Track"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        {coordinator ? (
                          <div className="text-xs">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">
                              {coordinator.full_name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {coordinator.employee_id}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground text-xs">
                            Not assigned
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {enrolledStudentsCount}
                        </span>
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(item)}
                            title="Edit class"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(item)}
                            title="Delete class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
