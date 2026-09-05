import React, { useState } from "react";
import {
  Database,
  Check,
  Copy,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { isSupabaseConfigured, localDb } from "../lib/supabase";
import { SUPABASE_SCHEMA_SQL } from "../lib/schemaSql";

interface DatabaseSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({
  open,
  onOpenChange,
  onDataChanged,
}) => {
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClearAllDefaultData = () => {
    if (
      window.confirm(
        "Are you sure you want to remove ALL default data across departments, faculty teachers, HODs, CCs, students, subjects, classes, attendance, and logs? Everything will be reset to 0 records so you can start with a 100% clean institutional roster.",
      )
    ) {
      localDb.clearAllDefaultData();
      setStatusMessage("All default data removed! Departments, faculty, students, and subjects are now at 0 records.");
      onDataChanged?.();
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleClearDemoData = () => {
    if (
      window.confirm(
        "Are you sure you want to remove all default demo students, attendance, and logs? Your roster will be completely clean so only students you create will be stored.",
      )
    ) {
      localDb.clearDemoStudents();
      setStatusMessage("Demo students and sample data cleared! Roster is now clean.");
      onDataChanged?.();
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleRestoreDemoData = () => {
    if (
      window.confirm(
        "Restore sample demo students and records for demonstration?",
      )
    ) {
      localDb.restoreDemoData();
      setStatusMessage("Demo students restored.");
      onDataChanged?.();
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-bold">
                Database Connection & SQL Query
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Run this schema query in Supabase to create all required tables and
              store your student data permanently.
            </p>
          </div>
        </div>

        {/* Live Status Banner */}
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border text-sm ${
            isSupabaseConfigured
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isSupabaseConfigured
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-amber-500"
              }`}
            />
            <span className="font-semibold">
              {isSupabaseConfigured
                ? "Supabase Live Connected"
                : "Local Browser Storage Active (Offline-First)"}
            </span>
          </div>
          <span className="text-xs opacity-80">
            {isSupabaseConfigured
              ? "All created students sync to your Supabase PostgreSQL tables"
              : "Students persist in your browser; connect Supabase for cloud sync"}
          </span>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm flex items-center gap-2 animate-in fade-in">
            <Check className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Section 1: Clean Slate / Remove Default Data */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-destructive" />
                Default Demo Data Management
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wipe all mock data (departments, faculty, students, subjects) to 0 records so only your custom records exist.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreDemoData}
                title="Reload demo records if needed"
                className="text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Restore Demo
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAllDefaultData}
                className="text-xs font-semibold"
                title="Wipe all departments, teachers, and students to start from scratch"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear ALL Default Data
              </Button>
            </div>
          </div>
        </div>

        {/* Section 2: Instructions to Run SQL in Supabase */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            How to Connect Your Database (3 Quick Steps)
          </h3>

          <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/40 border border-border/50">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                1
              </span>
              <div>
                <strong className="text-foreground">Open Supabase SQL Editor:</strong> Go to{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-medium inline-flex items-center gap-1"
                >
                  supabase.com/dashboard <ExternalLink className="h-3 w-3" />
                </a>
                , select your project, and click <strong>SQL Editor</strong> in the left menu.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/40 border border-border/50">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                2
              </span>
              <div>
                <strong className="text-foreground">Run the Schema Query:</strong> Click <strong>+ New Query</strong>, paste the complete SQL script below, and click <strong>Run</strong>. This creates all tables: <code>students</code>, <code>attendance</code>, <code>departments</code>, <code>teachers</code>, <code>subjects</code>, and <code>sms_logs</code>.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-muted/40 border border-border/50">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                3
              </span>
              <div>
                <strong className="text-foreground">Connect API Keys:</strong> Go to <strong>Project Settings → API</strong> and configure your environment:
                <div className="mt-1.5 font-mono text-[11px] bg-background p-2 rounded border border-border text-foreground select-all">
                  VITE_SUPABASE_URL=https://your-project.supabase.co<br />
                  VITE_SUPABASE_ANON_KEY=your-anon-public-key
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: SQL Script View & Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Supabase SQL Schema (supabase_schema.sql)
            </span>
            <Button
              size="sm"
              onClick={handleCopySql}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copied SQL Query!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy SQL Query
                </>
              )}
            </Button>
          </div>

          <div className="relative rounded-lg border border-border bg-muted/70 p-3 font-mono text-xs overflow-hidden">
            <pre className="max-h-60 overflow-y-auto text-[11px] leading-relaxed text-muted-foreground select-all whitespace-pre">
              {SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-primary" />
            Whenever you click "+ Add Student", the record is stored permanently.
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
