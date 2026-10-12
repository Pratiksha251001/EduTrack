import React, { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Loader2,
  Mail,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRoleType } from "../lib/types";
import { localDb } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { EduTrackLogo } from "../components/EduTrackLogo";
import { PasswordInput } from "../components/PasswordInput";

const roleDetails: Record<
  Exclude<UserRoleType, "admin">,
  { title: string; description: string; icon: React.ElementType }
> = {
  hod: {
    title: "HOD Portal",
    description: "Sign in to manage your department and review compliance.",
    icon: Building2,
  },
  teacher: {
    title: "Teacher Portal",
    description: "Sign in to record attendance and send parent alerts.",
    icon: Users,
  },
  class_coordinator: {
    title: "Class Teacher Portal",
    description: "Sign in to manage your class and student records.",
    icon: UserCog,
  },
  student: {
    title: "Student Portal",
    description: "Sign in to view your attendance and academic updates.",
    icon: GraduationCap,
  },
};

export const RoleLogin: React.FC = () => {
  const { role: roleParam } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { loginWithCredentials } = useAuth();
  const role = roleParam as Exclude<UserRoleType, "admin">;
  const details = roleDetails[role];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!details) {
    return <Navigate to="/" replace />;
  }

  const Icon = details.icon;
  const identifierLabel =
    role === "student"
      ? "Student Roll Number or Email"
      : role === "hod"
        ? "HOD Email or Employee ID"
        : role === "class_coordinator"
          ? "Coordinator Email or Employee ID"
          : "Teacher Email or Employee ID";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await loginWithCredentials(
      role,
      email.trim(),
      password,
      departmentId || undefined,
    );

    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Authentication failed. Please check your credentials.");
      return;
    }

    const destination = role === "teacher" ? "/teacher/dashboard" : "/dashboard";
    try {
      localStorage.setItem("edutrack_last_active_path", destination);
    } catch {
      // Local storage may be unavailable in private browsing.
    }
    navigate(destination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background bg-grid-green-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center">
          <EduTrackLogo variant="full" size="md" showTagline />
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="font-display text-xl font-bold">{details.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{details.description}</p>
        </div>

        {error && (
          <p className="mb-4 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "hod" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Assigned Department <span className="font-normal">(optional)</span>
              </label>
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Auto-detect department</option>
                {localDb.departments
                  .filter((department) => department.status === "active")
                  .map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {identifierLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                className="pl-9"
                placeholder={role === "student" ? "Roll number or email" : "Enter your ID or email"}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Password</label>
            <PasswordInput
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Sign In
          </Button>
        </form>

        <div className="mt-6 border-t border-border/60 pt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            ← Back to Academic Portal Hub
          </Button>
        </div>
      </Card>
    </div>
  );
};
