import React from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface LogoutConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean;
}

export const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading,
}) => {
  const auth = useAuth();
  const { user, role } = auth;

  const isOpen = open !== undefined ? open : auth.isLogoutConfirmOpen;
  const handleOpenChange =
    onOpenChange ||
    ((openVal: boolean) => {
      if (!openVal) auth.closeLogoutConfirm();
    });
  const handleConfirm = onConfirm || auth.confirmLogout;
  const isLoading = loading !== undefined ? loading : auth.isLoggingOut;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const roleLabel = role
    ? role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "User";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        id="logout-confirm-modal"
        className="max-w-sm border-border bg-card p-6 shadow-xl rounded-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="items-center text-center pb-1">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-xs">
            <LogOut className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-lg font-bold text-foreground">
            Log Out?
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Are you sure you want to log out of your account?
          </p>
        </DialogHeader>

        {user && (
          <div className="rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 my-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user.full_name || user.email || "Active User"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user.email || user.id}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 shrink-0 capitalize">
              {roleLabel}
            </Badge>
          </div>
        )}

        <DialogFooter className="flex flex-row gap-2.5 mt-4 sm:justify-end">
          <Button
            id="cancel-logout-btn"
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="flex-1 font-medium text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            id="confirm-logout-btn"
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 font-semibold text-xs h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-xs"
            autoFocus
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Log Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
