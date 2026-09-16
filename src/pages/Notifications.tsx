import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ShieldAlert,
  ClipboardCheck,
  Info,
  Search,
  Filter,
  CheckCheck,
  Trash2,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppNotification } from "../lib/types";
import {
  getNotificationsForUser,
  getStoredNotifications,
  isNotificationRead,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../lib/notificationService";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Select } from "../components/ui/select";

export const Notifications: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications()
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");

  const userKey = user?.id || user?.email || role || "anon";

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getStoredNotifications());
    };
    window.addEventListener("edutrack_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("edutrack_notifications_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const userNotifications = useMemo(() => {
    if (!role) return [];
    return getNotificationsForUser(user, role, notifications);
  }, [user, role, notifications]);

  const filtered = useMemo(() => {
    return userNotifications.filter((item) => {
      const read = isNotificationRead(item, userKey);
      if (statusFilter === "unread" && read) return false;
      if (statusFilter === "read" && !read) return false;

      if (typeFilter !== "all" && item.type !== typeFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMessage = item.message.toLowerCase().includes(q);
        const matchesTeacher = item.metadata?.teacher_name?.toLowerCase().includes(q);
        const matchesSubject = item.metadata?.subject_name?.toLowerCase().includes(q);
        const matchesUser = item.metadata?.identifier?.toLowerCase().includes(q);
        return matchesTitle || matchesMessage || matchesTeacher || matchesSubject || matchesUser;
      }
      return true;
    });
  }, [userNotifications, statusFilter, typeFilter, search, userKey]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !isNotificationRead(n, userKey)).length;
  }, [userNotifications, userKey]);

  const securityAlertCount = useMemo(() => {
    return userNotifications.filter((n) => n.type === "security_login_failed").length;
  }, [userNotifications]);

  const attendanceCount = useMemo(() => {
    return userNotifications.filter((n) => n.type === "attendance_submitted").length;
  }, [userNotifications]);

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(userKey);
    setNotifications(getStoredNotifications());
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all notification logs?")) {
      clearAllNotifications();
      setNotifications([]);
    }
  };

  const handleItemReadToggle = (item: AppNotification) => {
    markNotificationAsRead(item.id, userKey);
    setNotifications(getStoredNotifications());
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    setNotifications(getStoredNotifications());
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                {role === "admin"
                  ? "SYSTEM AUDIT & NOTIFICATION HUB"
                  : role === "hod"
                  ? "DEPARTMENT ACADEMIC NOTIFICATIONS"
                  : role === "class_coordinator"
                  ? "CLASS COORDINATOR ALERTS"
                  : "FACULTY NOTIFICATIONS"}
              </Badge>
              {unreadCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground text-xs">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Notifications & Activity Alerts
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {role === "admin" &&
                "Real-time notifications for invalid login attempts across all roles, teacher daily attendance submissions, and parent communication dispatches."}
              {role === "hod" &&
                "Live notifications for daily attendance submissions by department faculty members and automated parent SMS notifications."}
              {role === "class_coordinator" &&
                "Class-specific attendance logs submitted by subject teachers and parent communication tracking."}
              {role === "teacher" &&
                "Attendance confirmations and parent communication alerts for your assigned subjects and classes."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs h-9"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Mark all as read
              </Button>
            )}
            {userNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/40">
          <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <span className="text-xs text-muted-foreground">Total Notifications</span>
            <p className="text-xl font-bold mt-0.5">{userNotifications.length}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <span className="text-xs text-muted-foreground">Unread Alerts</span>
            <p className="text-xl font-bold text-primary mt-0.5">{unreadCount}</p>
          </div>
          {role === "admin" && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <span className="text-xs text-amber-700 dark:text-amber-400">Security Login Alerts</span>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {securityAlertCount}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <span className="text-xs text-emerald-700 dark:text-emerald-400">Attendance Submissions</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {attendanceCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-border/70">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts, teachers, subjects..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Type selector */}
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs h-9 min-w-36"
            >
              <option value="all">All Alert Types</option>
              {role === "admin" && (
                <option value="security_login_failed">Security (Failed Logins)</option>
              )}
              <option value="attendance_submitted">Daily Attendance</option>
              <option value="general">General Notices</option>
            </Select>

            {/* Read status selector */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs h-9 min-w-32"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <Bell className="h-6 w-6 opacity-60" />
            </div>
            <h3 className="font-semibold text-base">No notifications found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {search || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters or search keywords."
                : "All clear! When new alerts or attendance reports arrive, they will appear here."}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const read = isNotificationRead(item, userKey);
            const isSecurity = item.type === "security_login_failed";
            const isAttendance = item.type === "attendance_submitted";

            return (
              <Card
                key={item.id}
                onClick={() => handleItemReadToggle(item)}
                className={`p-4 transition-all duration-150 cursor-pointer border hover:border-primary/40 ${
                  !read
                    ? "bg-card shadow-xs border-primary/30 ring-1 ring-primary/10"
                    : "bg-muted/15 border-border/70 opacity-90"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3.5 justify-between">
                  <div className="flex items-start gap-3.5">
                    {/* Role / Type Icon */}
                    <div
                      className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-xs ${
                        isSecurity
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : isAttendance
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-primary/15 text-primary border border-primary/30"
                      }`}
                    >
                      {isSecurity ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : isAttendance ? (
                        <ClipboardCheck className="h-5 w-5" />
                      ) : (
                        <Info className="h-5 w-5" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {item.title}
                        </span>
                        {!read && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4">
                            New
                          </Badge>
                        )}
                        {isSecurity && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 text-[10px] px-2 py-0"
                          >
                            Security Alert
                          </Badge>
                        )}
                        {isAttendance && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 text-[10px] px-2 py-0"
                          >
                            Attendance Submitted
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.message}
                      </p>

                      {/* Detailed Metadata Pill Group */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatTimestamp(item.created_at)}
                        </span>

                        {item.metadata?.teacher_name && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              Faculty: <strong className="text-foreground">{item.metadata.teacher_name}</strong>
                            </span>
                          </>
                        )}

                        {item.metadata?.subject_name && (
                          <>
                            <span>•</span>
                            <span>
                              Subject: <strong className="text-foreground">{item.metadata.subject_name}</strong>
                            </span>
                          </>
                        )}

                        {item.metadata?.semester && (
                          <>
                            <span>•</span>
                            <span>
                              Class: <strong className="text-foreground">Semester {item.metadata.semester}</strong>
                            </span>
                          </>
                        )}

                        {item.metadata?.identifier && (
                          <>
                            <span>•</span>
                            <span>
                              Attempted ID: <strong className="text-foreground">{item.metadata.identifier}</strong>
                            </span>
                          </>
                        )}

                        {item.metadata?.reason && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 dark:text-amber-400">
                              Reason: {item.metadata.reason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 sm:self-start shrink-0 pt-2 sm:pt-0">
                    {isAttendance && (
                      <Link to="/sms-logs">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          SMS Logs
                        </Button>
                      </Link>
                    )}
                    {isSecurity && role === "admin" && (
                      <Link to="/users">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Manage Users
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      title="Delete alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
