import React, { useState, useMemo } from "react";
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { localDb } from "../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
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
  type?: "text" | "number" | "email" | "password" | "select";
  required?: boolean;
  defaultValue?: string;
  options?: Array<{ value: string; label: string }>;
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
}

export function CrudPage<T extends { id: string }>({
  title,
  description,
  table,
  fields,
  columns,
  searchKeys,
  sortItems,
}: CrudPageProps<T>) {
  const [data, setData] = useState<T[]>(() => (localDb as any)[table] || []);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

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
    setFormData({ ...(item as any) });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (
      table === "teachers" &&
      formData.role === "hod" &&
      !editingItem &&
      (!formData.email || !formData.password || !formData.department_id)
    ) {
      alert("HOD department, email, and login password are required.");
      setSaving(false);
      return;
    }
    const saveData =
      table === "teachers" && formData.role
        ? {
            ...formData,
            is_class_coordinator: formData.role === "class_coordinator",
          }
        : formData;
    const teacherPassword =
      table === "teachers" ? formData.password : undefined;
    if (table === "teachers" && "password" in saveData)
      delete saveData.password;
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
      if (table === "teachers" && saveData.role === "hod") {
        const account = localDb.users.find(
          (user: any) => user.teacher_id === editingItem.id,
        );
        if (teacherPassword) {
          if (account) {
            localStorage.setItem(
              `edutrack_password_${account.id}`,
              teacherPassword,
            );
            localStorage.setItem(
              `smit_password_${account.id}`,
              teacherPassword,
            );
          } else if (saveData.email) {
            const accountId = `teacher-user-${editingItem.id}`;
            await localDb.insert("users", [
              {
                id: accountId,
                full_name: saveData.full_name,
                email: saveData.email.trim().toLowerCase(),
                role: "hod",
                department_id: saveData.department_id,
                teacher_id: editingItem.id,
                status: "active",
              },
            ]);
            localStorage.setItem(`edutrack_password_${accountId}`, teacherPassword);
            localStorage.setItem(`smit_password_${accountId}`, teacherPassword);
            await localDb.update("teachers", editingItem.id, {
              user_id: accountId,
            });
          }
          localStorage.setItem(
            `edutrack_hod_password_${editingItem.id}`,
            teacherPassword,
          );
          localStorage.setItem(
            `smit_hod_password_${editingItem.id}`,
            teacherPassword,
          );
        }
        if (account) {
          await localDb.update("users", account.id, {
            full_name: saveData.full_name,
            email: saveData.email?.trim().toLowerCase(),
            department_id: saveData.department_id,
            status: saveData.status || "active",
          });
        }
      }
    } else {
      const inserted = await localDb.insert(table, saveData);
      if (table === "teachers" && saveData.role === "hod" && inserted[0]) {
        const teacher = inserted[0];
        const accountId = `teacher-user-${teacher.id}`;
        await localDb.insert("users", [
          {
            id: accountId,
            full_name: teacher.full_name,
            email: teacher.email?.trim().toLowerCase(),
            role: "hod",
            department_id: teacher.department_id,
            teacher_id: teacher.id,
            status: "active",
          },
        ]);
        localStorage.setItem(`edutrack_password_${accountId}`, teacherPassword);
        localStorage.setItem(`smit_password_${accountId}`, teacherPassword);
        localStorage.setItem(
          `edutrack_hod_password_${teacher.id}`,
          teacherPassword,
        );
        localStorage.setItem(
          `smit_hod_password_${teacher.id}`,
          teacherPassword,
        );
        if (teacher.department_id)
          await localDb.update("departments", teacher.department_id, {
            hod_id: teacher.id,
          });
        await localDb.update("teachers", teacher.id, { user_id: accountId });
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
      const updated = await localDb.get(table);
      setData([...updated]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add {title.slice(0, -1)}
        </Button>
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
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {f.label}{" "}
                  {f.required && <span className="text-destructive">*</span>}
                </label>
                {f.type === "select" ? (
                  <Select
                    value={formData[f.key] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    options={f.options}
                  />
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
              </div>
            ))}
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
                  No records found.
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
