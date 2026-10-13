import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Loader2, ArrowRight, Mail, Users } from "lucide-react";
import { PasswordInput } from "../components/PasswordInput";
import { EduTrackLogo } from "../components/EduTrackLogo";

export const ClassTeacherLogin: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await loginWithCredentials("teacher", email.trim(), password);
    setLoading(false);
    if (result.ok) {
      try {
        localStorage.setItem("edutrack_last_active_path", "/teacher/dashboard");
      } catch {}
      navigate("/teacher/dashboard", { replace: true });
    } else {
      setError(result.message ?? "Login failed");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f4fbf7] dark:bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Educational Illustration Background - High Contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
      >
        <img
          src="/edutrack-bg.svg"
          alt=""
          className="w-full h-full object-cover object-center opacity-85 dark:opacity-45"
        />
        {/* Subtle light mode contrast scrim */}
        <div className="absolute inset-0 bg-slate-900/[0.03] dark:bg-black/50" />
      </div>

      {/* Luminous emerald line at top of page like AccessHub */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 right-0 z-20 h-0 overflow-visible"
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500/60 dark:via-emerald-400/75 to-transparent shadow-[0_2px_12px_rgba(16,185,129,0.4)]" />
      </div>

      <Card className="relative z-10 overflow-hidden w-full max-w-md border border-slate-300/85 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 sm:p-8 shadow-2xl shadow-slate-900/[0.12] dark:shadow-none ring-1 ring-slate-900/[0.08] dark:ring-white/[0.08] rounded-2xl sm:rounded-3xl">
        <div className="mb-6 text-center relative z-10">
          <div className="mx-auto mb-3.5 flex items-center justify-center">
            <EduTrackLogo variant="icon" size="lg" className="w-16 h-16 sm:w-18 sm:h-18" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight">Class Teacher Login</h1>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">Sign in to record attendance and send parent alerts.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs font-semibold text-destructive" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                type="email"
                className="pl-10 rounded-xl h-10"
                placeholder="teacher@edutrack.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Password</label>
            <PasswordInput
              required
              className="rounded-xl h-10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-1/3 rounded-xl h-10 text-xs font-semibold border-border hover:bg-muted cursor-pointer"
              onClick={() => navigate("/")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Go to Class Teacher Portal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
