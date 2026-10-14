import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ShieldAlert,
  ClipboardCheck,
  Info,
  Search,
  CheckCheck,
  Trash2,
  Clock,
  ExternalLink,
  CheckCircle2,
  X,
  Filter,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppNotification } from "../lib/types";
import {
  getNotificationsForUser,
  getStoredNotifications,
  isNotificationRead,
  markNotificationAsRead,
  deleteNotification,
} from "../lib/notificationService";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

export const Notifications: React.FC = () => {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications()
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "attendance" | "security">("all");

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

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !isNotificationRead(n, userKey)).length;
  }, [userNotifications, userKey]);

  const attendanceCount = useMemo(() => {
    return userNotifications.filter((n) => n.type === "attendance_submitted").length;
  }, [userNotifications]);

  const securityCount = useMemo(() => {
    return userNotifications.filter((n) => n.type === "security_login_failed").length;
  }, [userNotifications]);

  const filtered = useMemo(() => {
    return userNotifications.filter((item) => {
      const read = isNotificationRead(item, userKey);
      if (filter === "unread" && read) return false;
      if (filter === "attendance" && item.type !== "attendance_submitted") return false;
      if (filter === "security" && item.type !== "security_login_failed") return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [userNotifications, filter, search, userKey]);

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
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/[0.03] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Notifications
                </h1>
                {unreadCount > 0 ? (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/25 text-xs font-bold px-2 py-0.5">
                    {unreadCount} unread
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-xs font-medium gap-1 px-2 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> All caught up
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Activity alerts, attendance logs, and institutional security updates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="surface-panel p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications by title or keywords..."
              className="pl-8 pr-8 text-xs h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All ({userNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === "unread"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
            {attendanceCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter("attendance")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "attendance"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Attendance ({attendanceCount})
              </button>
            )}
            {securityCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter("security")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === "security"
                    ? "bg-amber-600 text-white shadow-xs font-semibold"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Security ({securityCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
              <Bell className="h-6 w-6 opacity-60" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {search || filter !== "all" ? "No matching notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {search || filter !== "all"
                ? "Try adjusting your search query or switching filters to see all updates."
                : "You're completely up to date. New updates and alerts will appear here."}
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
                className={`p-4 transition-all cursor-pointer border group relative overflow-hidden ${
                  !read
                    ? "bg-card border-l-[3.5px] border-l-primary border-primary/25 shadow-xs hover:border-primary/40"
                    : "bg-card/60 border-border/60 hover:bg-muted/30 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Category Icon */}
                  <div
                    className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center mt-0.5 transition-transform group-hover:scale-105 shadow-2xs ${
                      isSecurity
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : isAttendance
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    {isSecurity ? (
                      <ShieldAlert className="h-4.5 w-4.5" />
                    ) : isAttendance ? (
                      <ClipboardCheck className="h-4.5 w-4.5" />
                    ) : (
                      <Info className="h-4.5 w-4.5" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-xs font-bold text-foreground truncate ${!read ? "text-primary" : ""}`}>
                          {item.title}
                        </p>
                        {!read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0 ${
                            isSecurity
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                              : isAttendance
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isSecurity ? "Security" : isAttendance ? "Attendance" : "Update"}
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          className="opacity-40 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-all ml-1"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatTimestamp(item.created_at)}</span>
                      </span>

                      <span>•</span>

                      <span className="text-[10px] text-muted-foreground">
                        {read ? "Read" : "Click to mark as read"}
                      </span>

                      {item.action_url && (
                        <>
                          <span>•</span>
                          <Link
                            to={item.action_url}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline flex items-center gap-0.5 font-semibold text-xs"
                          >
                            <span>Open details</span>
                            <ExternalLink className="h-3 w-3 ml-0.5" />
                          </Link>
                        </>
                      )}
                    </div>
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
