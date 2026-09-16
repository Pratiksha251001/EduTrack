import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  ShieldAlert,
  ClipboardCheck,
  Info,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppNotification } from "../lib/types";
import {
  getNotificationsForUser,
  getStoredNotifications,
  isNotificationRead,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from "../lib/notificationService";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export const NotificationBell: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "security" | "attendance">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications()
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userKey = user?.id || user?.email || role || "anon";

  // Subscribe to notification updates
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

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Scoped notifications for this role
  const userNotifications = useMemo(() => {
    if (!role) return [];
    return getNotificationsForUser(user, role, notifications);
  }, [user, role, notifications]);

  // Filtered by selected tab
  const filteredNotifications = useMemo(() => {
    if (filter === "security") {
      return userNotifications.filter((n) => n.type === "security_login_failed");
    }
    if (filter === "attendance") {
      return userNotifications.filter((n) => n.type === "attendance_submitted");
    }
    return userNotifications;
  }, [userNotifications, filter]);

  // Unread count
  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !isNotificationRead(n, userKey)).length;
  }, [userNotifications, userKey]);

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(userKey);
    setNotifications(getStoredNotifications());
  };

  const handleItemClick = (item: AppNotification) => {
    markNotificationAsRead(item.id, userKey);
    setNotifications(getStoredNotifications());

    if (item.type === "attendance_submitted") {
      setIsOpen(false);
      navigate("/sms-logs");
    } else if (item.type === "security_login_failed") {
      setIsOpen(false);
      navigate("/users");
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="btn-header-notification-bell"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground transition-all hover:bg-muted/80 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] z-50 rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-xl animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 p-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold h-4">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Mark read</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 border-b border-border/40 bg-muted/20 px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              All ({userNotifications.length})
            </button>
            {role === "admin" && (
              <button
                type="button"
                onClick={() => setFilter("security")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === "security"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <ShieldAlert className="h-3 w-3" />
                Security (
                {
                  userNotifications.filter((n) => n.type === "security_login_failed").length
                }
                )
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilter("attendance")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === "attendance"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <ClipboardCheck className="h-3 w-3" />
              Attendance (
              {
                userNotifications.filter((n) => n.type === "attendance_submitted").length
              }
              )
            </button>
          </div>

          {/* List Body */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-2">
                  <Bell className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-xs font-medium text-foreground">No notifications</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {role === "admin"
                    ? "Security alerts and attendance notices will show here."
                    : "Daily attendance submissions from teachers will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.slice(0, 10).map((item) => {
                const read = isNotificationRead(item, userKey);
                const isSecurity = item.type === "security_login_failed";
                const isAttendance = item.type === "attendance_submitted";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex items-start gap-3 p-3 text-left transition-colors cursor-pointer hover:bg-muted/40 ${
                      !read ? "bg-primary/[0.04]" : ""
                    }`}
                  >
                    {/* Icon Indicator */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                        isSecurity
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : isAttendance
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {isSecurity ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : isAttendance ? (
                        <ClipboardCheck className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-xs font-semibold leading-tight line-clamp-1 ${
                            !read ? "text-foreground font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5 inline" /> {formatTimestamp(item.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      {/* Metadata Chips */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {isSecurity && item.metadata?.attempted_role && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px] px-1.5 py-0"
                          >
                            Role: {String(item.metadata.attempted_role).toUpperCase()}
                          </Badge>
                        )}
                        {isAttendance && item.metadata?.semester && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] px-1.5 py-0"
                          >
                            Sem {item.metadata.semester}
                          </Badge>
                        )}
                        {isAttendance && item.metadata?.absent_count !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.metadata.absent_count > 0
                              ? `${item.metadata.absent_count} absent (${item.metadata.sms_count || 0} SMS sent)`
                              : "100% Present"}
                          </span>
                        )}
                      </div>
                    </div>

                    {!read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/25 p-2.5 px-3">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>View All Notifications</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>

            {userNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearAllNotifications();
                  setNotifications([]);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                title="Clear all alerts"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
