import React, { useMemo, useState, useRef } from "react";
import {
  Briefcase,
  Calendar,
  Camera,
  Check,
  Clock,
  Edit3,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Hash,
  KeyRound,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
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
import { TeacherImportModal } from "../components/TeacherImportModal";
import { TeacherProfileModal } from "../components/TeacherProfileModal";
import { TeacherPasswordModal } from "../components/TeacherPasswordModal";

interface HODStaffProps {
  mode: "teachers" | "coordinators";
}

const COMMON_DESIGNATIONS = [
  "Professor & Head of Department",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Senior Lecturer",
  "Lecturer",
  "Visiting Faculty",
  "Lab Instructor",
  "Research Fellow",
];

const COMMON_QUALIFICATIONS = [
  "Ph.D in Computer Science & Engineering",
  "Ph.D in Electronics & Communication",
  "Ph.D in Information Technology",
  "Ph.D in Mathematics / Science",
  "M.Tech / M.E in Computer Science",
  "M.Tech in Cyber Security & Networks",
  "M.Tech in AI & Machine Learning",
  "M.Tech in VLSI & Embedded Systems",
  "M.Sc in Computer Science / IT",
  "MCA (Master of Computer Applications)",
  "B.Tech / B.E in Engineering",
];

export const HODStaff: React.FC<HODStaffProps> = ({ mode }) => {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  const teachers = localDb.teachers;
  const departments = localDb.departments;
  const assignments = localDb.class_coordinator_assignments;

  const linkedTeacher = teachers.find(
    (teacher) => teacher.id === user?.teacher_id,
  );
  const departmentId = user?.department_id || linkedTeacher?.department_id || "dept-1";
  const department = departments.find((item) => item.id === departmentId);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [profileModalTeacher, setProfileModalTeacher] = useState<Teacher | null>(null);
  const [passwordModalTeacher, setPasswordModalTeacher] = useState<Teacher | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    employee_id: "",
    full_name: "",
    designation: "Assistant Professor",
    department_id: departmentId,
    qualification: "",
    date_of_birth: "",
    experience_years: "",
    email: "",
    mobile: "",
    photo_url: "",
    password: "",
    role: "lecturer" as Teacher["role"],
  });

  const departmentTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.department_id === departmentId),
    [teachers, departmentId, version],
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
      (teacher.email || "").toLowerCase().includes(query) ||
      (teacher.designation || "").toLowerCase().includes(query) ||
      (teacher.qualification || "").toLowerCase().includes(query)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      employee_id: "",
      full_name: "",
      designation: "Assistant Professor",
      department_id: departmentId,
      qualification: "",
      date_of_birth: "",
      experience_years: "",
      email: "",
      mobile: "",
      photo_url: "",
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
      designation: teacher.designation || "Assistant Professor",
      department_id: teacher.department_id || departmentId,
      qualification: teacher.qualification || "",
      date_of_birth: teacher.date_of_birth || "",
      experience_years: teacher.experience_years ? String(teacher.experience_years) : "",
      email: teacher.email || "",
      mobile: teacher.mobile || "",
      photo_url: teacher.photo_url || "",
      password: "",
      role: teacher.role,
    });
    setFormOpen(true);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photo_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
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
      designation: form.designation.trim() || "Assistant Professor",
      department_id: departmentId,
      qualification: form.qualification.trim() || null,
      date_of_birth: form.date_of_birth.trim() || null,
      experience_years: form.experience_years.trim() || null,
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null, // Optional phone
      photo_url: form.photo_url.trim() || null,
      role: form.role,
      is_class_coordinator: isCoordinator,
      status: "active" as const,
    };

    const userRole = isCoordinator ? "class_coordinator" : "teacher";
    const defaultPwd = isCoordinator ? "CC@123" : "Teacher@123";
    const effectivePwd =
      form.password.trim() || form.employee_id.trim() || defaultPwd;

    if (editing) {
      await localDb.update("teachers", editing.id, data);
      const account = localDb.users.find(
        (u: any) => u.teacher_id === editing.id,
      );
      if (account) {
        await localDb.update("users", account.id, {
          full_name: data.full_name,
          email: data.email || account.email,
          role: userRole,
          department_id: departmentId,
          employee_id: data.employee_id,
        });
      } else if (data.email || data.employee_id) {
        const accountId = `teacher-user-${editing.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: data.full_name,
            email:
              data.email ||
              `${data.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@edutrack.edu`,
            role: userRole,
            department_id: departmentId,
            teacher_id: editing.id,
            employee_id: data.employee_id,
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
      setAlertSuccess(`Updated profile for ${data.full_name}.`);
    } else {
      const inserted = await localDb.insert("teachers", [data]);
      const teacher = inserted[0];
      if (teacher) {
        const accountId = `teacher-user-${teacher.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: teacher.full_name,
            email:
              teacher.email ||
              `${teacher.employee_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@edutrack.edu`,
            role: userRole,
            department_id: departmentId,
            teacher_id: teacher.id,
            employee_id: teacher.employee_id,
            status: "active",
          },
        ]);
        await localDb.update("teachers", teacher.id, { user_id: accountId });

        saveCredential(
          [accountId, teacher.id, teacher.email, teacher.employee_id],
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
      setAlertSuccess(`Added teacher ${data.full_name} successfully.`);
    }

    setFormOpen(false);
    setVersion((v) => v + 1);
  };

  const remove = async (teacher: Teacher) => {
    if (!confirm(`Delete ${teacher.full_name}? This action cannot be undone.`)) return;
    await localDb.delete("teachers", teacher.id);
    setVersion((v) => v + 1);
  };

  const handleImportSuccess = (count: number) => {
    setAlertSuccess(`Successfully imported ${count} teachers from spreadsheet!`);
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-6">
      {/* Modals */}
      <TeacherImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        department={department}
        onImportComplete={handleImportSuccess}
      />

      <TeacherProfileModal
        teacher={profileModalTeacher}
        department={department}
        open={!!profileModalTeacher}
        onOpenChange={(open) => {
          if (!open) setProfileModalTeacher(null);
        }}
        onEdit={(t) => {
          setProfileModalTeacher(null);
          openEdit(t);
        }}
        onUpdated={() => setVersion((v) => v + 1)}
      />

      <TeacherPasswordModal
        teacher={passwordModalTeacher}
        open={!!passwordModalTeacher}
        onOpenChange={(open) => {
          if (!open) setPasswordModalTeacher(null);
        }}
        onSuccess={(msg) => {
          setAlertSuccess(msg);
          setVersion((v) => v + 1);
        }}
      />

      {/* Success Notification Banner */}
      {alertSuccess && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{alertSuccess}</span>
          </div>
          <button
            onClick={() => setAlertSuccess(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Add and Import Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
              ? "lecturers, professors, and faculty roster"
              : "coordinator assignments"}{" "}
            for {department?.name || "your department"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            Import (Excel / CSV)
          </Button>

          <Button onClick={openAdd} className="shadow-xs">
            <Plus className="mr-2 h-4 w-4" /> Add{" "}
            {mode === "teachers" ? "Teacher" : "Coordinator"}
          </Button>
        </div>
      </div>

      {/* Add / Edit Form Card */}
      {formOpen && (
        <Card className="border-primary/30 bg-primary/[0.02] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold">
                {editing
                  ? "Edit Teacher Profile"
                  : `Add ${mode === "teachers" ? "Teacher" : "Class Coordinator"}`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Please provide faculty designations, qualification credentials, reference ID, and optional phone.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Teacher Full Name *
              </label>
              <Input
                placeholder="e.g. Dr. Arthur Pendelton"
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
              />
            </div>

            {/* 2. College Employee ID Reference No */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                College Employee ID Ref No *
              </label>
              <Input
                placeholder="e.g. EMP-CSE-101"
                className="font-mono"
                value={form.employee_id}
                onChange={(event) =>
                  setForm({ ...form, employee_id: event.target.value })
                }
              />
            </div>

            {/* 3. Academic Designation */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Academic Designation
              </label>
              <div className="space-y-1.5">
                <Input
                  placeholder="e.g. Associate Professor"
                  value={form.designation}
                  onChange={(event) =>
                    setForm({ ...form, designation: event.target.value })
                  }
                />
                <div className="flex flex-wrap gap-1">
                  {COMMON_DESIGNATIONS.slice(1, 6).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setForm({ ...form, designation: item })}
                      className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Qualification */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Highest Qualification
              </label>
              <Input
                placeholder="e.g. Ph.D in Computer Science"
                value={form.qualification}
                onChange={(event) =>
                  setForm({ ...form, qualification: event.target.value })
                }
              />
            </div>

            {/* 5. Date of Birth */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Date of Birth
              </label>
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={(event) =>
                  setForm({ ...form, date_of_birth: event.target.value })
                }
              />
            </div>

            {/* 6. Year of Experience */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Year of Experience
              </label>
              <Input
                placeholder="e.g. 8 Years or 8"
                value={form.experience_years}
                onChange={(event) =>
                  setForm({ ...form, experience_years: event.target.value })
                }
              />
            </div>

            {/* 7. Phone / Mobile (Option to set manually) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Phone / Mobile</span>
                <span className="text-[11px] font-normal text-muted-foreground">(Optional / manual set)</span>
              </label>
              <Input
                placeholder="e.g. +91 98765 43210"
                value={form.mobile}
                onChange={(event) =>
                  setForm({ ...form, mobile: event.target.value })
                }
              />
            </div>

            {/* 8. Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="e.g. teacher@edutrack.edu"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </div>

            {/* 9. Role Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                System Role
              </label>
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
            </div>

            {/* 10. Photo URL or File Upload */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Profile Photo (Optional / Manual Set)</span>
                {form.photo_url && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photo_url: "" }))}
                    className="text-[11px] text-destructive hover:underline"
                  >
                    Clear Photo
                  </button>
                )}
              </label>
              <div className="flex items-center gap-3">
                {form.photo_url ? (
                  <div className="h-10 w-10 rounded-lg border border-border overflow-hidden shrink-0">
                    <img
                      src={form.photo_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                )}
                <Input
                  placeholder="Paste photo image URL, or click upload button"
                  value={form.photo_url}
                  onChange={(e) =>
                    setForm({ ...form, photo_url: e.target.value })
                  }
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoFileInputRef.current?.click()}
                  className="shrink-0 text-xs"
                >
                  <Camera className="h-3.5 w-3.5 mr-1" />
                  Browse
                </Button>
                <input
                  ref={photoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoFileChange}
                />
              </div>
            </div>

            {/* 11. Password */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-foreground">
                Login Password
              </label>
              <Input
                type="password"
                placeholder={
                  editing
                    ? "Leave blank to keep current"
                    : form.role === "class_coordinator"
                    ? "Default: CC@123 or Emp ID"
                    : "Default: Teacher@123 or Emp ID"
                }
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Staff sign in using Employee ID or Email.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              <Check className="mr-2 h-4 w-4" /> Save Teacher
            </Button>
          </div>
        </Card>
      )}

      {/* Teacher List Card */}
      <Card className="p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={`Search by name, Employee ID, designation, or qualification...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing <strong className="text-foreground">{visibleTeachers.length}</strong> faculty members</span>
          </div>
        </div>

        <div className="grid gap-3.5 md:grid-cols-2">
          {visibleTeachers.length === 0 ? (
            <div className="py-14 text-center md:col-span-2 space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No {mode} found matching query
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add staff manually or use the Excel / CSV import to load multiple faculty teachers at once.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setImportModalOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" />
                  Import Excel / CSV
                </Button>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Teacher Manually
                </Button>
              </div>
            </div>
          ) : (
            visibleTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-4 bg-card hover:border-primary/40 transition-all gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Photo or Initials Avatar */}
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-xl border border-border bg-primary/10 text-primary flex items-center justify-center overflow-hidden font-bold font-display shadow-xs">
                      {teacher.photo_url ? (
                        <img
                          src={teacher.photo_url}
                          alt={teacher.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary/70" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-foreground">
                        {teacher.full_name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium bg-primary/5 text-primary border-primary/20"
                      >
                        {teacher.designation || "Assistant Professor"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span className="font-mono font-semibold text-foreground bg-muted px-1.5 py-0.2 rounded text-[11px]">
                        ID: {teacher.employee_id}
                      </span>

                      {teacher.qualification && (
                        <span className="truncate text-[11px]">
                          • {teacher.qualification}
                        </span>
                      )}

                      {teacher.experience_years && (
                        <span className="text-[11px]">
                          • {String(teacher.experience_years).includes("Year")
                              ? teacher.experience_years
                              : `${teacher.experience_years} Yrs`}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      {teacher.mobile ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-primary" />
                          {teacher.mobile}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/80">
                          Phone: Not set
                        </span>
                      )}

                      {teacher.date_of_birth && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          DOB: {teacher.date_of_birth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end sm:justify-start gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPasswordModalTeacher(teacher)}
                    className="h-8 text-xs font-medium text-foreground hover:text-primary px-2"
                    title="Set or reset portal login password"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1 text-primary" />
                    Password
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProfileModalTeacher(teacher)}
                    className="h-8 text-xs font-medium text-foreground hover:text-primary px-2.5"
                    title="View faculty dossier"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                    Dossier
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(teacher)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Edit profile"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(teacher)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    title="Delete teacher"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
