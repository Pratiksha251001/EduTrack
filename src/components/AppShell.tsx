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
  Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { college } from "../lib/college";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { EduTrackLogo } from "./EduTrackLogo";
import { NotificationBell } from "./NotificationBell";
import {
  getNotificationsForUser,
  getStoredNotifications,
  isNotificationRead,
} from "../lib/notificationService";
import { AppNotification } from "../lib/types";
import { DemoStudyBanner } from "./DemoStudyBanner";

export const AppShell: React.FC = () => {
  const { user, role, isDemo, openLogoutConfirm } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications(),
  );

  React.useEffect(() => {
    const handleUpdate = () => setNotifications(getStoredNotifications());
    window.addEventListener("edutrack_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(
        "edutrack_notifications_updated",
        handleUpdate,
      );
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const userKey = user?.id || user?.email || role || "anon";
  const userNotifications = React.useMemo(() => {
    if (!role) return [];
    return getNotificationsForUser(user, role, notifications);
  }, [user, role, notifications]);

  const unreadNotifCount = React.useMemo(() => {
    return userNotifications.filter((n) => !isNotificationRead(n, userKey))
      .length;
  }, [userNotifications, userKey]);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
    { label: "My Profile", path: "/profile", icon: UserCog },
    ...(role === "hod"
      ? [
          { label: "Teachers", path: "/hod/teachers", icon: Users },
          { label: "Coordinators", path: "/hod/coordinators", icon: UserCog },
          { label: "Classes", path: "/hod/classes", icon: Building2 },
          { label: "Students", path: "/hod/students", icon: GraduationCap },
        ]
      : []),
    ...(role === "class_coordinator"
      ? [
          { label: "Students", path: "/cc/students", icon: GraduationCap },
          { label: "Class Subjects", path: "/subjects", icon: BookOpen },
        ]
      : []),
    ...(role !== "admin" && role !== "student"
      ? [
          {
            label:
              role === "hod" ? "Mark Attendance (Lecture)" : "Mark Attendance",
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
    ...(role
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
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-[hsl(var(--sidebar-border))] px-5">
          <EduTrackLogo size="md" variant="horizontal" colorMode="onDark" />
          <button
            className="lg:hidden text-[hsl(var(--sidebar-foreground))] hover:opacity-80"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className="mx-4 my-3 block shrink-0 rounded-xl bg-[hsl(var(--sidebar-accent))] p-3 border border-[hsl(var(--sidebar-border))] hover:opacity-90 transition-opacity"
          title="View My Profile & Credentials"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold">
                  {user?.full_name || "User"}
                </p>
                {isDemo && (
                  <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 uppercase">
                    Demo
                  </span>
                )}
              </div>
              <p className="truncate text-[10px] opacity-70">{user?.email}</p>
            </div>
            <Badge
              variant="default"
              className="bg-[hsl(var(--sidebar-primary))]/20 text-[hsl(var(--sidebar-primary))] border-[hsl(var(--sidebar-primary))]/30 text-[10px] uppercase font-bold tracking-wider ml-2 shrink-0"
            >
              {role?.replace("_", " ")}
            </Badge>
          </div>
        </Link>
        <nav className="flex-1 min-h-0 space-y-1.5 px-4 py-1 overflow-y-auto overscroll-contain custom-sidebar-scroll">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-semibold shadow-xs"
                    : "text-[hsl(var(--sidebar-foreground))] opacity-85 hover:opacity-100 hover:bg-[hsl(var(--sidebar-accent))]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-opacity ${
                    active
                      ? "opacity-100 text-[hsl(var(--sidebar-primary-foreground))]"
                      : "opacity-75"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
                {Boolean(item.badge) && (
                  <span
                    className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-2xs ${
                      active
                        ? "bg-white text-primary"
                        : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-[hsl(var(--sidebar-border))] p-4 space-y-2">
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
            id="sidebar-logout-btn"
            variant="destructive"
            size="sm"
            onClick={() => {
              setMobileOpen(false);
              openLogoutConfirm();
            }}
            className="w-full justify-start bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 font-medium transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden lg:ml-72">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
            <EduTrackLogo size="sm" variant="horizontal" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Badge
              variant="outline"
              className="capitalize text-xs font-semibold"
            >
              {role?.replace("_", " ")}
            </Badge>
            <Button
              id="mobile-header-logout-btn"
              variant="ghost"
              size="sm"
              onClick={openLogoutConfirm}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 h-8 w-8 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Desktop Header Topbar */}
        <header className="hidden lg:flex h-16 items-center justify-between border-b border-border/80 bg-card/60 px-8 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tracking-wide">
                {college.shortName}
              </span>
              <span>•</span>
              <span className="capitalize font-medium text-primary">
                {role?.replace("_", " ")} Portal
              </span>
              {user?.department_id && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-56">
                    {user.department_id}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground hover:bg-muted/80 transition-colors"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-bold">
                {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
              <span className="text-xs font-medium text-foreground max-w-32 truncate">
                {user?.full_name || "Profile"}
              </span>
            </Link>
          </div>
        </header>

        {/* Demo / Study Mode Banner */}
        <DemoStudyBanner />

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
