import React, { useState, useEffect } from "react";
import { CrudPage } from "../components/CrudPage";
import { Department } from "../lib/types";
import { Badge } from "../components/ui/badge";
import { localDb, isSupabaseConfigured } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Database, Trash2 } from "lucide-react";
import { DatabaseSetupModal } from "../components/DatabaseSetupModal";

export const Departments: React.FC = () => {
  const [teachers, setTeachers] = useState(localDb.teachers);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setTeachers([...localDb.teachers]);
    };
    window.addEventListener("edutrack_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_data_updated", handleUpdate);
    };
  }, []);

  const handleClearDefaultData = () => {
    if (
      window.confirm(
        "Are you sure you want to remove ALL default data across departments, faculty, and students? Your institutional database will be reset to 0 records so you can build your own hierarchy.",
      )
    ) {
      localDb.clearAllDefaultData();
      setNotice("All default data removed. You can now create your departments, faculty, and students.");
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <CrudPage<Department>
        title="Departments"
        description="Academic departments utilized across subjects, faculty, and student batches."
        table="departments"
        searchKeys={["name", "code", "status"]}
        extraHeaderActions={
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                isSupabaseConfigured
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSupabaseConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{isSupabaseConfigured ? "Supabase Live" : "Local Database"}</span>
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDbModalOpen(true)}
              className="text-xs h-9 gap-1.5"
            >
              <Database className="h-3.5 w-3.5 text-primary" />
              Database & SQL Query
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDefaultData}
              title="Remove default sample data to start fresh"
              className="text-xs h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Default Data
            </Button>
          </div>
        }
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

      <DatabaseSetupModal open={dbModalOpen} onOpenChange={setDbModalOpen} />
    </div>
  );
};
