import React from "react";
import { LogOut, User, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}) => {
  const { user, role } = useAuth();

  const formattedRole = role
    ? role
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="logout-confirm-modal"
        className="z-[60] sm:max-w-md border-border bg-card p-6 shadow-2xl"
      >
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-xs">
            <LogOut className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Confirm Log Out
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
            Are you sure you want to end your session? Any unsaved changes will be lost, and you will need to log in again.
          </p>
        </DialogHeader>

        {/* Current user session snippet */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 my-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">
                {user?.full_name || "Active Session"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email || "No email listed"} ·{" "}
                <span className="font-medium text-foreground/80">
                  {formattedRole}
                </span>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4 sm:justify-end">
          <Button
            id="cancel-logout-btn"
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Stay Logged In
          </Button>
          <Button
            id="confirm-logout-btn"
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            {loading ? "Signing out..." : "Yes, Log Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
