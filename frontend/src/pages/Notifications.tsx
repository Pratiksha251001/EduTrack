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

export const Notifications: React.FC = () => {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredNotifications()
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

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
      if (filter === "unread" && read) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [userNotifications, filter, search, userKey]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !isNotificationRead(n, userKey)).length;
  }, [userNotifications, userKey]);

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(userKey);
    setNotifications(getStoredNotifications());
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all notifications?")) {
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
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Activity and institutional updates for your account
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs h-8"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1 text-primary" />
              Mark all read
            </Button>
          )}
          {userNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs h-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="pl-8 text-xs h-8"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({userNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === "unread"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 pt-1">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-sm font-semibold text-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {search || filter === "unread"
                ? "No notifications matching your filter."
                : "You're all caught up!"}
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
                className={`p-3.5 transition-colors cursor-pointer border flex items-start gap-3 justify-between ${
                  !read
                    ? "bg-card border-primary/30 shadow-xs"
                    : "bg-muted/20 border-border/60 opacity-80"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center mt-0.5 ${
                      isSecurity
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : isAttendance
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary"
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

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.title}
                      </p>
                      {!read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(item.created_at)}</span>
                      {item.action_url && (
                        <>
                          <span>•</span>
                          <Link
                            to={item.action_url}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline flex items-center gap-0.5 font-medium"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors shrink-0"
                  title="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
