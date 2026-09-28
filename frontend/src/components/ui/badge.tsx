import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-emerald-700/60 bg-emerald-950/70 text-emerald-400 shadow-sm",
        warning:
          "border-amber-700/60 bg-amber-950/70 text-amber-300 shadow-sm",
        info:
          "border-sky-700/60 bg-sky-950/70 text-sky-300 shadow-sm",
        purple:
          "border-purple-700/60 bg-purple-950/70 text-purple-300 shadow-sm",
        cyan:
          "border-cyan-700/60 bg-cyan-950/70 text-cyan-300 shadow-sm",
        lime:
          "border-lime-700/60 bg-lime-950/70 text-lime-300 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
