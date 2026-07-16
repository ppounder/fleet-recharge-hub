import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const schema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required" }),
    newPassword: z
      .string()
      .min(8, { message: "New password must be at least 8 characters" })
      .max(72, { message: "New password must be less than 72 characters" }),
    confirmPassword: z.string().min(1, { message: "Please confirm your new password" }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  });

type FormErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string | null | undefined;
}

const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordDialog({ open, onOpenChange, email }: Props) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(empty);
      setErrors({});
    }
  }, [open]);

  const update = <K extends keyof typeof form>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (!email) {
      toast({ title: "Cannot change password", description: "No email on file.", variant: "destructive" });
      return;
    }

    setSaving(true);
    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: result.data.currentPassword,
    });
    if (signInError) {
      setSaving(false);
      setErrors({ currentPassword: "Current password is incorrect" });
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: result.data.newPassword,
    });
    setSaving(false);
    if (updateError) {
      toast({ title: "Failed to update password", description: updateError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated" });
    onOpenChange(false);
  };

  const field = (
    id: "currentPassword" | "newPassword" | "confirmPassword",
    label: string,
    placeholder: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={id === "currentPassword" ? "current-password" : "new-password"}
        placeholder={placeholder}
        value={form[id]}
        onChange={(e) => update(id, e.target.value)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `${id}-error` : undefined}
        className={cn(errors[id] && "border-destructive focus-visible:ring-destructive")}
      />
      {errors[id] && (
        <p id={`${id}-error`} className="text-xs text-destructive">{errors[id]}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {field("currentPassword", "Current password *", "Enter current password")}
          {field("newPassword", "New password *", "Enter new password")}
          {field("confirmPassword", "Confirm new password *", "Confirm new password")}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Updating..." : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
