import React from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { BookOpen } from "lucide-react";

export const ClassTeacherDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-7 p-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card to-card p-6 shadow-sm">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/20">TEACHER PORTAL</Badge>
              <span className="text-xs text-muted-foreground">Teacher workspace</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Teacher Dashboard
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Welcome, {user?.full_name || "teacher"}. Here you can manage your classes, subjects, and attendance.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-left sm:min-w-44">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</p>
            <p className="mt-1 font-display text-xl font-bold text-primary">Teacher</p>
          </div>
        </div>
      </div>
      {/* Add additional teacher-specific sections here */}
    </div>
  );
};
