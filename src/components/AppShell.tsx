import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  FileChartColumnIncreasing,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  UserCog,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { college } from "../lib/college";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export const AppShell: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    ...(role === "student"
      ? [{ label: "My Profile", path: "/profile", icon: UserCog }]
      : []),
    ...(role === "hod"
      ? [
          { label: "Teachers", path: "/hod/teachers", icon: Users },
          { label: "Coordinators", path: "/hod/coordinators", icon: UserCog },
          { label: "Classes", path: "/hod/classes", icon: Building2 },
          { label: "Students", path: "/hod/students", icon: GraduationCap },
        ]
      : []),
    ...(role !== "admin" && role !== "student" && role !== "hod"
      ? [
          {
            label: "Mark Attendance",
            path: "/attendance",
            icon: ClipboardCheck,
          },
        ]
      : []),
    ...(role === "admin"
      ? [
          { label: "Departments", path: "/departments", icon: Building2 },
          { label: "Teachers", path: "/teachers", icon: Users },
          { label: "Subjects", path: "/subjects", icon: BookOpen },
          { label: "Students", path: "/students", icon: GraduationCap },
          { label: "Users", path: "/users", icon: Users },
          { label: "Notices", path: "/notices", icon: MessageSquare },
        ]
      : []),
    ...(role !== "student"
      ? [
          {
            label: "Reports & PDF",
            path: "/reports",
            icon: FileChartColumnIncreasing,
          },
        ]
      : []),
    ...(role !== "student"
      ? [{ label: "Parent SMS Logs", path: "/sms-logs", icon: MessageSquare }]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-display font-extrabold text-xl shadow-md">
              S
            </div>
            <div>
              <h1 className="font-display text-base font-bold leading-tight">
                {college.shortName}
              </h1>
              <p className="text-[11px] opacity-70 leading-none">
                Smart Attendance
              </p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-4 my-4 rounded-xl bg-[hsl(var(--sidebar-accent))] p-3 border border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {user?.full_name || "User"}
              </p>
              <p className="truncate text-[10px] opacity-70">{user?.email}</p>
            </div>
            <Badge
              variant="default"
              className="bg-[hsl(var(--sidebar-primary))]/20 text-[hsl(var(--sidebar-primary))] border-[hsl(var(--sidebar-primary))]/30 text-[10px] uppercase font-bold tracking-wider"
            >
              {role}
            </Badge>
          </div>
        </div>
        <nav className="flex-1 space-y-1.5 px-4 overflow-hidden">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-semibold shadow-sm" : "opacity-90 hover:bg-[hsl(var(--sidebar-accent))]"}`}
              >
                <Icon className="h-4 w-4 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 mr-2" />
            ) : (
              <Sun className="h-4 w-4 mr-2" />
            )}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden lg:ml-72">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display font-bold text-lg">
              {college.shortName}
            </span>
          </div>
          <Badge variant="outline">{role}</Badge>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
