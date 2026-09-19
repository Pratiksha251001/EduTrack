import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { localDb } from "../lib/supabase";
import { saveCredential } from "../lib/authUtils";
import {
  cleanMobile,
  isValid10DigitMobile,
  getMobileValidationError,
  sanitizeMobileInput,
} from "../lib/validation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { DatePicker } from "./ui/date-picker";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";

export interface CrudField {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "password" | "select" | "date";
  required?: boolean;
  defaultValue?: string;
  options?: Array<{ value: string; label: string }>;
  helperText?: string;
}

export interface CrudColumn<T> {
  header: string;
  render: (item: T) => React.ReactNode;
}

interface CrudPageProps<T> {
  title: string;
  description: string;
  table: string;
  fields: CrudField[];
  columns: CrudColumn<T>[];
  searchKeys: string[];
  sortItems?: (a: T, b: T) => number;
  extraHeaderActions?: React.ReactNode;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
  };
}

export function CrudPage<T extends { id: string }>({
  title,
  description,
  table,
  fields,
  columns,
  searchKeys,
  sortItems,
  extraHeaderActions,
  emptyStateAction,
}: CrudPageProps<T>) {
  const [data, setData] = useState<T[]>(() => (localDb as any)[table] || []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.table === table) {
        setData([...((localDb as any)[table] || [])]);
      }
    };
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("edutrack_data_updated", handleUpdate);
  }, [table]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [credentialNotice, setCredentialNotice] = useState<{
    name: string;
    login: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const filtered = useMemo(() => {
    const source = sortItems ? [...data].sort(sortItems) : data;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter((item: any) =>
      searchKeys.some((k) =>
        String(item[k] || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [data, search, searchKeys, sortItems]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const openAdd = () => {
    setEditingItem(null);
    setCredentialNotice(null);
    setShowPassword(false);
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      initial[f.key] =
        f.defaultValue || (f.type === "select" && f.options?.[0]?.value) || "";
    });
    setFormData(initial);
    setModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    setShowPassword(false);
    const formInit: any = { ...(item as any) };
    if (table === "subjects") {
      const currentTs = localDb.teacher_subjects.find(
        (ts) => ts.subject_id === item.id,
      );
      formInit.teacher_id =
        currentTs?.teacher_id || (item as any).teacher_id || "";
    }
    setFormData(formInit);
    setModalOpen(true);
  };

  const isMobileField = (f: CrudField) => {
    const k = f.key.toLowerCase();
    const l = f.label.toLowerCase();
    return (
      k === "mobile" ||
      k === "phone" ||
      k === "parent_mobile" ||
      k === "student_mobile" ||
      k.endsWith("_mobile") ||
      k.endsWith("_phone") ||
      l.includes("mobile") ||
      l.includes("phone")
    );
  };

  const handleSave = async () => {
    setSaving(true);

    // Validate 10-digit mobile number fields strictly
    for (const f of fields) {
      if (isMobileField(f)) {
        const rawVal = formData[f.key];
        if (f.required || (rawVal && String(rawVal).trim().length > 0)) {
          const err = getMobileValidationError(rawVal, f.label, !!f.required);
          if (err) {
            alert(err);
            setSaving(false);
            return;
          }
        }
      }
    }

    // Flexible HOD & Faculty creation:
    // HODs, Coordinators, and Lecturers do not require hardcoded fields upfront.
    // If password/email/department are not provided, sensible defaults are automatically provisioned.

    const saveData =
      table === "teachers" && formData.role
        ? {
            ...formData,
            is_class_coordinator: formData.role === "class_coordinator",
          }
        : { ...formData };

    // Clean all mobile numbers to standard 10 digits before saving
    for (const f of fields) {
      if (isMobileField(f) && saveData[f.key]) {
        saveData[f.key] = cleanMobile(saveData[f.key]) || null;
      }
    }

    const rawPassword = formData.password?.trim();
    if ("password" in saveData) {
      delete saveData.password;
    }

    if (table === "users" && formData.role === "admin") {
      const existingAdmin = (localDb.users || []).find(
        (user: any) => user.role === "admin" && user.id !== editingItem?.id,
      );
      if (existingAdmin) {
        alert("Only one Admin is allowed for the institution.");
        setSaving(false);
        return;
      }
    }

    if (editingItem) {
      await localDb.update(table, editingItem.id, saveData);

      // 1. UPDATE TEACHER
      if (table === "teachers") {
        const userRole =
          saveData.role === "hod"
            ? "hod"
            : saveData.role === "class_coordinator"
              ? "class_coordinator"
              : "teacher";
        const defaultPwd =
          saveData.role === "hod"
            ? "Hod@123"
            : saveData.role === "class_coordinator"
              ? "Cc@123"
              : "Teacher@123";
        const effectivePwd = rawPassword || defaultPwd;

        let account = localDb.users.find(
          (user: any) => user.teacher_id === editingItem.id,
        );

        if (account) {
          await localDb.update("users", account.id, {
            full_name: saveData.full_name,
            email: saveData.email?.trim().toLowerCase() || account.email,
            role: userRole,
            department_id: saveData.department_id,
            status: saveData.status || "active",
          });
        } else if (saveData.email || saveData.employee_id) {
          const accountId = `teacher-user-${editingItem.id}`;
          await localDb.insert("users", [
            {
              id: accountId,
              full_name: saveData.full_name,
              email: saveData.email
                ? saveData.email.trim().toLowerCase()
                : `${saveData.employee_id.toLowerCase()}@edutrack.edu`,
              role: userRole,
              department_id: saveData.department_id,
              teacher_id: editingItem.id,
              status: saveData.status || "active",
            },
          ]);
          await localDb.update("teachers", editingItem.id, {
            user_id: accountId,
          });
        }

        saveCredential(
          [
            editingItem.id,
            account?.id,
            `teacher-user-${editingItem.id}`,
            saveData.email,
            saveData.employee_id,
            `hod_${editingItem.id}`,
          ],
          effectivePwd,
        );

        if (saveData.role === "hod" && saveData.department_id) {
          await localDb.update("departments", saveData.department_id, {
            hod_id: editingItem.id,
          });
        }
      }

      // 2. UPDATE STUDENT
      if (table === "students") {
        const effectivePwd = rawPassword || saveData.roll_number || "123";
        let account = localDb.users.find(
          (user: any) => user.student_id === editingItem.id,
        );

        if (account) {
          await localDb.update("users", account.id, {
            full_name: saveData.full_name,
            email: saveData.email?.trim().toLowerCase() || account.email,
            department_id: saveData.department_id,
            status: saveData.status || "active",
          });
        }

        saveCredential(
          [
            editingItem.id,
            account?.id,
            `student-user-${editingItem.id}`,
            saveData.roll_number,
            saveData.reg_number,
            saveData.email,
          ],
          effectivePwd,
        );
      }

      // 3. UPDATE SUBJECT (Sync Teacher Assignment)
      if (table === "subjects") {
        const assignedTeacherId = (saveData as any).teacher_id;
        const existingTs = localDb.teacher_subjects.filter(
          (ts) => ts.subject_id === editingItem.id,
        );
        for (const ts of existingTs) {
          await localDb.delete("teacher_subjects", ts.id);
        }
        if (assignedTeacherId) {
          await localDb.insert("teacher_subjects", [
            {
              id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              teacher_id: assignedTeacherId,
              subject_id: editingItem.id,
              class_name: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        window.dispatchEvent(new CustomEvent("edutrack_data_updated"));
      }
    } else {
      // INSERT NEW RECORD
      const inserted = await localDb.insert(table, saveData);

      // 1. INSERT TEACHER (HOD, Teacher, Class Coordinator)
      if (table === "teachers" && inserted[0]) {
        const teacher = inserted[0];
        const userRole =
          teacher.role === "hod"
            ? "hod"
            : teacher.role === "class_coordinator"
              ? "class_coordinator"
              : "teacher";
        const defaultPwd =
          teacher.role === "hod"
            ? "Hod@123"
            : teacher.role === "class_coordinator"
              ? "Cc@123"
              : "Teacher@123";
        const effectivePwd = rawPassword || defaultPwd;

        const accountId = `teacher-user-${teacher.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: teacher.full_name,
            email: teacher.email
              ? teacher.email.trim().toLowerCase()
              : `${teacher.employee_id?.toLowerCase()}@edutrack.edu`,
            role: userRole,
            department_id: teacher.department_id,
            teacher_id: teacher.id,
            status: "active",
          },
        ]);

        saveCredential(
          [
            accountId,
            teacher.id,
            teacher.email,
            teacher.employee_id,
            `hod_${teacher.id}`,
          ],
          effectivePwd,
        );

        setCredentialNotice({
          name: teacher.full_name,
          login: teacher.employee_id || teacher.email || "the assigned account",
          password: effectivePwd,
        });

        if (teacher.role === "hod" && teacher.department_id) {
          await localDb.update("departments", teacher.department_id, {
            hod_id: teacher.id,
          });
        }
        await localDb.update("teachers", teacher.id, { user_id: accountId });
      }

      // 2. INSERT STUDENT
      if (table === "students" && inserted[0]) {
        const student = inserted[0];
        const effectivePwd = rawPassword || student.roll_number || "123";
        const accountId = `student-user-${student.id}`;

        await localDb.insert("users", [
          {
            id: accountId,
            full_name: student.full_name,
            email: student.email
              ? student.email.trim().toLowerCase()
              : `${student.roll_number.toLowerCase()}@student.edutrack.edu`,
            role: "student",
            department_id: student.department_id,
            student_id: student.id,
            status: "active",
          },
        ]);

        saveCredential(
          [
            accountId,
            student.id,
            student.roll_number,
            student.reg_number,
            student.email,
          ],
          effectivePwd,
        );
      }

      // 3. INSERT SUBJECT (Sync Teacher Assignment)
      if (table === "subjects" && inserted[0]) {
        const sub = inserted[0];
        const assignedTeacherId = (saveData as any).teacher_id;
        if (assignedTeacherId) {
          await localDb.insert("teacher_subjects", [
            {
              id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              teacher_id: assignedTeacherId,
              subject_id: sub.id,
              class_name: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        window.dispatchEvent(new CustomEvent("edutrack_data_updated"));
      }
    }

    const updated = await localDb.get(table);
    setData([...updated]);
    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      await localDb.delete(table, id);
      if (table === "subjects") {
        const toDelete = localDb.teacher_subjects.filter(
          (ts) => ts.subject_id === id,
        );
        for (const ts of toDelete) {
          await localDb.delete("teacher_subjects", ts.id);
        }
        window.dispatchEvent(new CustomEvent("edutrack_data_updated"));
      }
      const updated = await localDb.get(table);
      setData([...updated]);
    }
  };

  return (
    <div className="space-y-6">
      {credentialNotice && table === "teachers" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Teacher account created</p>
                  <p className="text-xs text-muted-foreground">
                    Share these initial login credentials with{" "}
                    {credentialNotice.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCredentialNotice(null)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss credentials"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-card/70 p-2">
                  <span className="block text-muted-foreground">Login ID</span>
                  <span className="font-mono font-semibold">
                    {credentialNotice.login}
                  </span>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-2">
                  <span className="block text-muted-foreground">
                    Initial password
                  </span>
                  <span className="font-mono font-semibold">
                    {credentialNotice.password}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {extraHeaderActions}
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add {title.slice(0, -1)}
          </Button>
        </div>
      </div>

      {modalOpen && (
        <div className="surface-panel border-primary/30 bg-primary/[0.03] space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-display text-lg font-bold">
              {editingItem
                ? `Edit ${title.slice(0, -1)}`
                : `Add New ${title.slice(0, -1)}`}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const isMobile = isMobileField(f);
              const currentVal = formData[f.key] || "";
              const isInvalidMobile =
                isMobile && currentVal && !isValid10DigitMobile(currentVal);

              return (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>
                      {f.label}{" "}
                      {f.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </span>
                    {isMobile && currentVal && (
                      <span
                        className={`text-[10px] font-mono ${
                          currentVal.length === 10
                            ? "text-emerald-600 font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {currentVal.length}/10 digits
                      </span>
                    )}
                  </label>
                  {f.type === "select" ? (
                    <Select
                      value={formData[f.key] || ""}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          [f.key]: selectedValue,
                          ...(table === "teachers" && f.key === "role"
                            ? {
                                password:
                                  selectedValue === "hod"
                                    ? "Hod@123"
                                    : selectedValue === "class_coordinator"
                                      ? "Cc@123"
                                      : "Teacher@123",
                              }
                            : {}),
                        }));
                      }}
                      options={f.options}
                    />
                  ) : f.type === "date" ? (
                    <DatePicker
                      value={formData[f.key] || ""}
                      onChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          [f.key]: val,
                        }))
                      }
                    />
                  ) : isMobile ? (
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="9876543210 (10 digits)"
                      value={currentVal}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [f.key]: sanitizeMobileInput(e.target.value),
                        }))
                      }
                      className={`font-mono ${
                        isInvalidMobile
                          ? "border-destructive focus-visible:ring-destructive bg-destructive/5"
                          : ""
                      }`}
                    />
                  ) : f.type === "password" ? (
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData[f.key] || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [f.key]: e.target.value,
                          }))
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Input
                      type={f.type || "text"}
                      value={formData[f.key] || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [f.key]: e.target.value,
                        }))
                      }
                    />
                  )}
                  {f.helperText ? (
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {f.helperText}
                    </p>
                  ) : isMobile ? (
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Must be strictly 10 digits (e.g. 9876543210).
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="surface-panel space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header}>{c.header}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-10 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-3">
                    <span>No records found.</span>
                    {emptyStateAction && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={emptyStateAction.onClick}
                      >
                        {emptyStateAction.label}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((c) => (
                    <TableCell key={c.header}>{c.render(item)}</TableCell>
                  ))}
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <span>{filtered.length} total records</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
