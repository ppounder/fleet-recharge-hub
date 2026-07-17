import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export interface LabeledSwitchProps
  extends Omit<React.ComponentProps<typeof Switch>, "children"> {
  trueLabel?: string;
  falseLabel?: string;
}

const LabeledSwitch = React.forwardRef<
  React.ElementRef<typeof Switch>,
  LabeledSwitchProps
>(({ className, trueLabel = "Yes", falseLabel = "No", checked, ...props }, ref) => (
  <div
    className={cn(
      "flex items-center gap-3 rounded-md border border-input bg-card px-3 h-10 w-fit",
      className
    )}
  >
    <span
      className={cn(
        "text-sm font-medium",
        !checked && "text-muted-foreground"
      )}
    >
      {falseLabel}
    </span>
    <Switch ref={ref} checked={checked} {...props} />
    <span
      className={cn(
        "text-sm font-medium",
        checked && "text-primary"
      )}
    >
      {trueLabel}
    </span>
  </div>
));
LabeledSwitch.displayName = "LabeledSwitch";

export { LabeledSwitch };
