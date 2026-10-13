import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none',
        {
          'border-primary/20 bg-primary/10 text-primary': variant === 'default',
          'border-border/60 bg-muted/60 text-muted-foreground': variant === 'secondary',
          'border-destructive/20 bg-destructive/10 text-destructive': variant === 'destructive',
          'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400': variant === 'success',
          'border-border text-foreground bg-transparent': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}
