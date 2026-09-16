import React, { useRef } from "react";
import { Calendar as CalendarIcon, X, Check } from "lucide-react";
import { Button } from "./button";

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTodayHelper?: boolean;
  id?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  className = "",
  disabled = false,
  showTodayHelper = true,
  id,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().split("T")[0];

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if ("showPicker" in HTMLInputElement.prototype && typeof inputRef.current.showPicker === "function") {
        try {
          inputRef.current.showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(todayStr);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  // Format readable display
  const formattedDisplay = React.useMemo(() => {
    if (!value) return null;
    try {
      const [y, m, d] = value.split("-").map(Number);
      if (!y || !m || !d) return null;
      const date = new Date(y, m - 1, d);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={handleOpenPicker}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer z-10"
          title="Open Calendar Picker"
          aria-label="Open Calendar"
        >
          <CalendarIcon className="h-4 w-4 text-primary" />
        </button>

        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value || ""}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={handleOpenPicker}
          className="h-10 w-full rounded-xl border border-input bg-card pl-10 pr-20 py-2 text-sm text-foreground shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear date"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {showTodayHelper && (
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded tracking-wide transition-colors ${
                value === todayStr
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              title="Set to today"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {formattedDisplay && (
        <p className="text-[11px] text-muted-foreground pl-1 font-medium">
          📅 {formattedDisplay} {value === todayStr && <span className="text-primary font-semibold">(Today)</span>}
        </p>
      )}
    </div>
  );
};
