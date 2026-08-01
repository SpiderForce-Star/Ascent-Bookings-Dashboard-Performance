import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
        secondary: "border-transparent bg-[var(--color-bg-subtle)] text-[var(--color-fg-muted)]",
        success: "border-transparent bg-[var(--color-success-soft)] text-[var(--color-success)]",
        danger: "border-transparent bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
        warn: "border-transparent bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
        outline: "border-[var(--color-border)] text-[var(--color-fg-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
