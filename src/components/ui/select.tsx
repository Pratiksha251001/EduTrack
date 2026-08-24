import React, { createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
  onValueChange?: (value: string) => void;
}

interface SelectContextValue {
  value?: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, children, options, onValueChange, value, onChange, ...props },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    if (options || !children) {
      return (
        <select
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
          value={value}
          onChange={onChange}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      );
    }

    return (
      <SelectContext.Provider
        value={{
          value: value as string | undefined,
          onValueChange: onValueChange || (() => undefined),
          open,
          setOpen,
        }}
      >
        <div className={cn("relative", className)}>{children}</div>
      </SelectContext.Provider>
    );
  },
);
Select.displayName = "Select";

export const SelectTrigger: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => {
  const context = useContext(SelectContext);
  return (
    <button
      type="button"
      {...props}
      onClick={() => context?.setOpen(!context.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm",
        className,
      )}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({
  placeholder,
}) => {
  const context = useContext(SelectContext);
  const label = context?.value;
  return <span>{label || placeholder || ""}</span>;
};

export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const context = useContext(SelectContext);
  if (!context?.open) return null;
  return (
    <div
      {...props}
      className={cn(
        "absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
> = ({ value, className, children, ...props }) => {
  const context = useContext(SelectContext);
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
        className,
      )}
      onClick={() => {
        context?.onValueChange(value);
        context?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
};
