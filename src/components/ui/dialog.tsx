import React, { createContext, useContext, useEffect } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContextValue {
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        if (child.type === DialogTrigger) return child;
        return open ? child : null;
      })}
    </DialogContext.Provider>
  );
};

interface DialogPartProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogContent: React.FC<DialogPartProps> = ({
  className = "",
  children,
  ...props
}) => {
  const { onOpenChange } = useContext(DialogContext) || {};
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        {...props}
        className={`relative z-[101] w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl transition-all ${className}`}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute right-3.5 top-3.5 z-50 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground focus:outline-none transition-all cursor-pointer"
          aria-label="Close dialog"
          title="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<DialogPartProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div {...props} className={`mb-4 flex flex-col space-y-1.5 ${className}`}>
    {children}
  </div>
);

export const DialogTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className = "", children, ...props }) => (
  <h2 {...props} className={`font-display text-lg font-semibold ${className}`}>
    {children}
  </h2>
);

export const DialogFooter: React.FC<DialogPartProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div
    {...props}
    className={`mt-6 flex items-center justify-end gap-2 ${className}`}
  >
    {children}
  </div>
);

export const DialogTrigger: React.FC<{
  asChild?: boolean;
  children: React.ReactElement;
}> = ({ asChild, children }) => {
  const { onOpenChange } = useContext(DialogContext) || {};
  if (!asChild)
    return <button onClick={() => onOpenChange?.(true)}>{children}</button>;
  return React.cloneElement(children, { onClick: () => onOpenChange?.(true) });
};
