import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standardised help / hint text shown under a form field.
 * Always: text-xs, muted-foreground, normal weight, normal leading.
 */
export const FieldHint = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs font-normal leading-normal text-muted-foreground", className)}
    {...props}
  />
));
FieldHint.displayName = "FieldHint";
